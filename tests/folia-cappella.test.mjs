import assert from 'node:assert/strict';
import test from 'node:test';
import * as Chat from '../plugins/folia-lyrics-skin/qml/styles/cappella/kernel.mjs';

const metadata = (count = 30) =>
  Array.from({ length: count }, (_, sourceIndex) => ({
    sourceIndex,
    startTime: sourceIndex * 4,
    endTime: sourceIndex * 4 + 3,
    renderEndTime: sourceIndex * 4 + 3,
    timingClass: 'normal',
    compactCodepointCount: sourceIndex % 3 === 0 ? 16 : 2,
    codepointCount: sourceIndex % 3 === 0 ? 16 : 2,
    isInterlude: sourceIndex === 7,
  }));
const pool = ['happy.png', 'love.png', 'vibe.png'].map((url) => ({ url }));
const tuning = { showEmoMessages: true };

test('source normal conversation oracle: sender carry, reset, interlude and random cap', () => {
  const messages = Chat.buildMessages(
    metadata(),
    '真实歌曲',
    Chat.intensity('normal'),
    tuning,
    pool,
  );
  assert.equal(messages[0].kind, 'title');
  const lyric = messages.filter((m) => m.id.startsWith('line-') || /^emo-\d/.test(m.id));
  assert.deepEqual(
    lyric.map((m) => (m.side === 'right' ? 8 : m.avatarIndex)),
    [0, 0, 0, 8, 8, 1, 8, 8, 8, 8, 2, 2, 3, 3, 8, 4, 4, 4, 8, 8, 5, 8, 8, 8, 8, 6, 8, 7, 7, 8],
  );
  assert.deepEqual(
    messages
      .filter((m) => m.id.startsWith('emo-reaction'))
      .map((m) => [m.lineIndex, m.emoImageUrl]),
    [
      [0, 'vibe.png'],
      [18, 'love.png'],
    ],
  );
  const interlude = messages.find((m) => m.id === 'emo-28-7');
  assert.equal(interlude.emoImageUrl, 'love.png');
  assert.equal(interlude.activationEndTime, 31);
});

test('actual agents only: case/trim stable, one agent falls back, missing ids remain missing', () => {
  const rows = metadata(5);
  rows[0].agentId = ' A ';
  rows[1].agentId = 'B';
  rows[2].agentId = 'a';
  rows[4].agentId = 'A';
  const messages = Chat.buildMessages(
    rows,
    '',
    Chat.intensity('calm'),
    { showEmoMessages: false },
    [],
  );
  assert.deepEqual(
    messages
      .slice(1)
      .filter((m) => m.line.agentId)
      .map((m) => [m.side, m.avatarIndex]),
    [
      ['right', 8],
      ['left', 0],
      ['left', 1],
      ['right', 8],
    ],
  );
  assert.equal(Object.hasOwn(rows[3], 'agentId'), false);
  assert.equal(
    Chat.buildMessages([{ ...rows[0] }], '', Chat.intensity('calm'), tuning, [])[1].side,
    'left',
  );
});

test('metadata source indices survive sparse source holes and short means compact codepoints', () => {
  const rows = metadata(3);
  rows[0].sourceIndex = 4;
  rows[1].sourceIndex = 9;
  rows[2].sourceIndex = 15;
  const messages = Chat.buildMessages(
    rows,
    '',
    Chat.intensity('normal'),
    { showEmoMessages: false },
    [],
  );
  assert.deepEqual(
    messages.slice(1).map((m) => m.lineIndex),
    [4, 9, 15],
  );
  assert.equal(messages[1].id, 'line-0-4');
  assert.equal(
    messages.some((m) => Object.hasOwn(m.line || {}, 'fullText')),
    false,
  );
});

test('eligibility index preserves source ordering with overlapping reaction activation', () => {
  const messages = [
    { kind: 'title' },
    { kind: 'emo', activationStartTime: 100 },
    { kind: 'lyric', line: { startTime: 4 } },
    { kind: 'emo', activationStartTime: 8 },
  ];
  const index = Chat.eligibilityIndex(messages);
  assert.deepEqual(
    Chat.visibleCandidates(messages, index, 5, 20).map((m) => messages.indexOf(m)),
    [0, 2],
  );
  assert.deepEqual(
    Chat.visibleCandidates(messages, index, 101, 2).map((m) => messages.indexOf(m)),
    [2, 3],
  );
  assert.equal(Chat.visibleCandidates(messages, index, -1, 20).length, 1);
});

test('source viewport keeps at least two context messages, then caps at twenty', () => {
  const list = Array.from({ length: 50 }, (_, id) => ({ id }));
  assert.equal(Chat.fitMessages(list, 100, () => 500).length, 2);
  assert.equal(Chat.fitMessages(list, 10000, () => 1).length, 20);
});

test('full native metrics merge ligature EGCs into safe clusters and preserve UTF16 ranges', () => {
  const metrics = {
    width: 40,
    baseline: 16,
    height: 24,
    graphemes: [
      { start: 0, length: 1, x: 0, advance: 7, clusterStart: 0 },
      { start: 1, length: 1, x: 7, advance: 5, clusterStart: 0 },
      { start: 2, length: 2, x: 12, advance: 18, clusterStart: 2 },
      { start: 4, length: 1, x: 30, advance: 10, clusterStart: 4 },
    ],
  };
  const clusters = Chat.clustersFromMetrics(metrics);
  assert.deepEqual(
    clusters.map((c) => [c.start, c.end, c.advance, c.first, c.last]),
    [
      [0, 2, 12, 0, 1],
      [2, 4, 18, 2, 2],
      [4, 5, 10, 3, 3],
    ],
  );
});

test('source reveal uses EGC timeline, 200ms lookahead, 40ms minimum, UI fades finish while paused', () => {
  const prepared = {
    line: { startTime: 0, endTime: 3 },
    timeline: [
      { startTime: 0, endTime: 0.01 },
      { startTime: 1, endTime: 1.3 },
      { startTime: 2, endTime: 2.2 },
    ],
  };
  const plan = Chat.revealPlan(prepared);
  [40, 300, 200].forEach((expected, index) =>
    assert.ok(Math.abs(plan.fadeMs[index] - expected) < 1e-9),
  );
  assert.equal(Chat.countAt(plan.targetTimes, 0.85), 2);
  assert.equal(plan.timestampReadyTime, 2.2);
  const clusters = [
    { first: 0, last: 0 },
    { first: 1, last: 2 },
  ];
  let state = Chat.updateReveals([], clusters, plan, 1.5, 10);
  assert.equal(state[1].born, 10);
  assert.equal(Chat.clusterOpacity(state[1], 10), 0);
  assert.equal(Chat.clusterOpacity(state[1], 11), 1);
  state = Chat.updateReveals(state, clusters, plan, 0.5, 11);
  assert.equal(state[1].visible, false);
});

test('source intensity, timestamps, crop and avatar exclusion retain exact values', () => {
  assert.deepEqual(Chat.intensity('normal').motion.avatarSpring, {
    stiffness: 340,
    damping: 28,
    mass: 0.72,
  });
  assert.equal(Chat.intensity('chaotic').motion.emoActiveSize, 178);
  assert.equal(Chat.intensity('calm').sequencing.randomEmoChance, 0);
  assert.equal(Chat.timestamp(125.9), '2:05');
  assert.equal(Chat.timestamp(NaN), '0:00');
  assert.deepEqual(Chat.avatarCrop(-1), { column: 2, row: 2 });
  const avatars = [{ url: 'a' }, { url: 'b' }, { url: 'c' }];
  const right = Chat.pickAvatar(avatars, 8, 'right', 'seed');
  for (let i = 0; i < 10; i++)
    assert.notEqual(Chat.pickAvatar(avatars, i, 'left', 'seed').url, right.url);
});

test('source colors mix straight channels and spring converges independently of playback', () => {
  assert.deepEqual(Chat.mix({ r: 0, g: 0, b: 0, a: 1 }, { r: 1, g: 1, b: 1, a: 1 }, 0.18, 0.94), {
    r: 46 / 255,
    g: 46 / 255,
    b: 46 / 255,
    a: 0.94,
  });
  let spring = { value: 1, velocity: 0, target: 1.12 };
  for (let i = 0; i < 240; i++)
    spring = Chat.stepSpring(spring, Chat.intensity('normal').motion.avatarSpring, 1 / 120);
  assert.ok(Math.abs(spring.value - 1.12) < 1e-5);
  const enter = Chat.rowPose(0.32, false, Chat.intensity('normal').motion);
  assert.deepEqual(enter, { opacity: 1, y: 0, scale: 1, finished: true });
});
