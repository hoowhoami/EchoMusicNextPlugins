import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const base = new URL('../plugins/folia-lyrics-skin/qml/styles/classic/', import.meta.url);
async function load(name) {
  const url = new URL(name, base);
  assert.ok(existsSync(url), `The real Classic ${name} kernel must exist`);
  return import(url);
}
const settings = {
  animationIntensity: 'normal',
  lyricsFontScale: 1,
  classicEnableWordRotation: true,
  classicBreathingFloatMultiplier: 1,
  classicUseLegacyLayout: false,
  classicWordSpacing: 0.7,
};

test('Classic uses source viewport clamps and deterministic measured spacing', async () => {
  const layout = await load('layout.mjs');
  assert.equal(layout.classicFontSize(320, 1), 36);
  assert.equal(layout.classicFontSize(1000, 1), 60);
  assert.equal(layout.classicFontSize(1600, 1), 72);
  assert.equal(layout.classicRenderFontSize(1000, 1.0001), 60.01);
  const words = [{ text: 'one' }, { text: 'two' }];
  const line = { fullText: 'one two', startTime: 3.25 };
  const a = layout.buildWordConfigs(line, words, [105, 95], 1000, settings);
  const b = layout.buildWordConfigs(line, words, [105, 95], 1000, settings);
  assert.deepEqual(a, b);
  // Captured by evaluating the reference useMemo with the same measured widths.
  assert.deepEqual(
    a.wordConfigs.map((config) => [
      config.x,
      config.y,
      config.rotate,
      config.scale,
      config.marginRight,
      config.passedRotate,
    ]),
    [
      [
        -15.743291433391278, 6.202629363178858, -2.921654755681402, 1.2617580230111345, 33.3,
        18.901119932361325,
      ],
      [
        6.202629363178858, -11.686619022725608, 3.0879011505567178, 1.1084204786806369, 24.8,
        13.790258492715566,
      ],
    ],
  );
  assert.equal(a.lineConfig.justifyContent, 'justify-around');
  assert.equal(a.lineConfig.alignItems, 'items-start');
  const legacy = layout.buildWordConfigs(line, words, [105, 95], 1000, {
    ...settings,
    classicUseLegacyLayout: true,
  });
  assert.equal(legacy.wordConfigs[0].marginRight, 12.8);
  const noRotation = layout.buildWordConfigs(line, words, [105, 95], 1000, {
    ...settings,
    classicEnableWordRotation: false,
  });
  assert.equal(noRotation.wordConfigs[0].rotate, 0);
  assert.equal(noRotation.wordConfigs[0].passedRotate, 0);
  const dots = layout.buildWordConfigs(
    { fullText: '......', startTime: 3.25 },
    words,
    [105, 95],
    1000,
    settings,
  );
  assert.equal(dots.lineConfig.justifyContent, 'justify-center');
  assert.equal(dots.wordConfigs[0].scale, 1.5);
  assert.equal(dots.wordConfigs[0].marginRight, 48);
});

test('Classic keyword colors preserve the reference limited CJK gate and English normalization', async () => {
  const layout = await load('layout.mjs');
  const colors = [
    { word: '夜空 星', color: '#ff0000' },
    { word: 'Hello WORLD', color: '#00ff00' },
    { word: 'Hello', color: '#0000ff' },
  ];
  assert.equal(layout.resolveWordColor('夜', colors, '#ffffff'), '#ff0000');
  assert.equal(layout.resolveWordColor('星空', colors, '#ffffff'), '#ffffff');
  assert.equal(layout.resolveWordColor('Hello!', colors, '#ffffff'), '#00ff00');
  assert.equal(
    layout.resolveWordColor('é', [{ word: 'é', color: '#ff0000' }], '#ffffff'),
    '#ffffff',
  );
  assert.equal(
    layout.resolveWordColor('𠀀', [{ word: '𠀀', color: '#ff0000' }], '#ffffff'),
    '#ffffff',
  );
});

test('Classic flex-wrap uses native advances, all justification modes and 1.22 line boxes', async () => {
  const layout = await load('layout.mjs');
  const metrics = [
    { width: 90, height: 55, baseline: 42 },
    { width: 90, height: 55, baseline: 42 },
    { width: 90, height: 55, baseline: 42 },
  ];
  const configs = metrics.map(() => ({ marginRight: 10 }));
  const value = layout.layoutRows(
    metrics,
    configs,
    { justifyContent: 'justify-between', alignItems: 'items-center' },
    200,
    60,
  );
  assert.equal(value.rows.length, 2);
  assert.equal(value.height, 300);
  assert.equal(value.words[0].x, 0);
  assert.equal(value.words[1].x, 100);
  assert.equal(value.words[2].x, 0);
  assert.equal(value.words[1].row, 0);
  assert.equal(value.words[2].row, 1);
  assert.ok(Math.abs(value.words[2].y - value.words[0].y - 73.2) < 1e-9);
});

test('Classic keeps source lookahead, short/micro profiles and per-syllable glow delays', async () => {
  const motion = await load('motion.mjs');
  const normal = motion.renderProfile({ startTime: 1, endTime: 4, words: [] });
  const fast = motion.renderProfile({ startTime: 1, endTime: 1.15, words: [] });
  const micro = motion.renderProfile({ startTime: 1, endTime: 1.05, words: [] });
  assert.equal(normal.wordLookahead, 0.15);
  assert.equal(fast.wordLookahead, 0.08);
  assert.equal(micro.wordLookahead, 0.03);
  assert.equal(micro.lineTransitionMode, 'none');
  const word = { text: 'ab', startTime: 2, endTime: 3 };
  assert.equal(motion.wordState(word, 1.849, normal), 'waiting');
  assert.equal(motion.wordState(word, 1.85, normal), 'active');
  assert.equal(motion.wordState(word, 3.001, normal), 'passed');
  const early = motion.glyphGlow({ startTime: 2, endTime: 2.1 }, word, 2, 1.95, normal, 1);
  const late = motion.glyphGlow({ startTime: 2.8, endTime: 3 }, word, 2, 1.95, normal, 1);
  assert.ok(early.opacity > 0);
  assert.equal(late.opacity, 0);
  assert.equal(early.inner, 20);
  assert.equal(early.outer, 40);
});

test('Classic spring, pass drift, breathing and hidden-line exit preserve source timings', async () => {
  const motion = await load('motion.mjs');
  const profile = motion.renderProfile({ startTime: 0, endTime: 3, words: [] });
  const word = { text: 'A', startTime: 1, endTime: 2 };
  const config = { x: 12, y: -8, rotate: 3, passedRotate: 20, scale: 1.2 };
  const waiting = motion.wordPose(word, config, 0.5, profile, 0, settings);
  const active = motion.wordPose(word, config, 1.6, profile, 0, settings);
  const passed = motion.wordPose(word, config, 7.1, profile, 0, settings);
  assert.equal(waiting.opacity, 0);
  assert.equal(waiting.scale, 0.5);
  assert.ok(Math.abs(active.scale - 1.68) < 0.01);
  assert.equal(passed.rotation, 23);
  assert.equal(passed.opacity, 0.82);
  assert.equal(passed.scale, 1.2);
  assert.deepEqual(motion.breathingPose(0, settings), { y: 0, scale: 1 });
  assert.ok(Math.abs(motion.breathingPose(1.75, settings).y + 14) < 1e-9);
  assert.deepEqual(motion.breathingPose(2, { ...settings, classicBreathingFloatMultiplier: 0 }), {
    y: 0,
    scale: 1,
  });
  const exit = motion.linePose(profile, 0.2, true, true);
  assert.equal(exit.opacity, 0);
  assert.equal(exit.scale, 1);
  assert.equal(exit.blur, 0);
  // motion-dom's actual spring generator, k=200/d=20/m=1, captured from the reference install.
  for (const [elapsed, expected] of [
    [0.05, 0.7087809182545322],
    [0.1, 1.0801753365205604],
    [0.2, 1.6012460037198943],
    [0.35, 1.725868107177628],
    [0.5, 1.6853688585976745],
  ])
    assert.ok(Math.abs(motion.springValue(0.5, 1.68, elapsed) - expected) < 1e-12);
  // Default line scale has restSpeed=10 rather than the explicit word spring's granular .01.
  assert.equal(motion.linePose(profile, 0.14, false, false).scale, 1);
});

test('native clusters retain UTF-16 starts, ligature timing spans and whole-word transforms', async () => {
  const model = await load('model.mjs');
  const word = { text: 'a👩‍🚀fi', startTime: 1, endTime: 3 };
  const metric = {
    key: 'w',
    width: 44,
    height: 40,
    baseline: 30,
    graphemes: [
      { start: 0, length: 1, x: 0, advance: 10, clusterStart: 0 },
      { start: 1, length: 5, x: 10, advance: 20, clusterStart: 1 },
      { start: 6, length: 1, x: 30, advance: 9, clusterStart: 6 },
      { start: 7, length: 1, x: 39, advance: 5, clusterStart: 6 },
    ],
  };
  const clusters = model.buildClusters(word, metric);
  assert.deepEqual(
    clusters.map((cluster) => cluster.start),
    [0, 1, 6],
  );
  assert.equal(clusters[2].timing.startTime, 2);
  assert.equal(clusters[2].timing.endTime, 3);
  const pose = model.transformCluster(
    clusters[0],
    metric,
    { x: 100, y: 200 },
    { x: 10, y: -5, scale: 2, rotation: 90 },
  );
  assert.ok(Math.abs(pose.x - 107) < 1e-9);
  assert.ok(Math.abs(pose.y - 151) < 1e-9);
  assert.equal(pose.start, 0);
  assert.equal(pose.key, 'w');
});

test('Classic mixes body colors in Motion linear space and leaves halo color independent', async () => {
  const model = await load('model.mjs');
  const middle = model.mixColor({ r: 0, g: 0, b: 0, a: 1 }, { r: 1, g: 1, b: 1, a: 1 }, 0.5);
  assert.equal(middle.r, 180 / 255); // Motion rgba.transform rounds to 8-bit channels.
  const motion = await load('motion.mjs');
  const word = { text: 'A', startTime: 1, endTime: 2 };
  const profile = motion.renderProfile({ startTime: 0, endTime: 3, words: [word] });
  const glow = motion.glyphGlow({ startTime: 1, endTime: 2 }, word, 1, 2.1, profile, 0);
  assert.ok(glow.opacity > 0);
  assert.equal(glow.outer, 40);
  assert.equal(
    motion.wordPose(
      word,
      { x: 0, y: 0, rotate: 0, passedRotate: 0, scale: 1 },
      2.9,
      profile,
      0,
      settings,
    ).bodyMix,
    0,
  );
});

test('presentation motion can finish while the sole lyric clock is paused', async () => {
  const motion = await load('motion.mjs');
  assert.equal(typeof motion.wordUiPose, 'function');
  const word = { text: 'A', startTime: 1, endTime: 2 };
  const config = { x: 10, y: 5, rotate: 2, passedRotate: 20, scale: 1.2 };
  const profile = motion.renderProfile({ startTime: 0, endTime: 4, words: [word] });
  const origin = motion.wordPose(word, config, 1.9, profile, 0, settings);
  const transition = { state: 'passed', at: 20, origin };
  const early = motion.wordUiPose(word, config, 2.1, profile, 0, settings, true, transition, 20);
  const settled = motion.wordUiPose(word, config, 2.1, profile, 0, settings, true, transition, 25);
  assert.equal(early.rotation, origin.rotation);
  assert.equal(settled.rotation, 22);
  assert.equal(settled.scale, 1.2);
  assert.equal(settled.state, 'passed');
});

test('Classic seek re-entry continues from the actual previous visual pose', async () => {
  const motion = await load('motion.mjs');
  const word = { text: 'A', startTime: 1, endTime: 2 };
  const config = { x: 10, y: 5, rotate: 2, passedRotate: 20, scale: 1.2 };
  const profile = motion.renderProfile({ startTime: 0, endTime: 4, words: [word] });
  const origin = motion.wordPose(word, config, 8, profile, 0, settings);
  const saved = { ...origin };
  const transition = { state: 'active', at: 20, origin };
  const first = motion.wordUiPose(word, config, 1.5, profile, 0, settings, true, transition, 20);
  for (const field of ['opacity', 'scale', 'x', 'y', 'rotation', 'blur'])
    assert.equal(first[field], origin[field], `${field} must remain continuous on seek re-entry`);
  assert.deepEqual(origin, saved, 'Sampling must not mutate the transition origin');
  const settled = motion.wordUiPose(word, config, 1.5, profile, 0, settings, true, transition, 25);
  assert.equal(settled.scale, config.scale * 1.4);
  assert.equal(settled.rotation, config.rotate);
  assert.equal(settled.opacity, 1);
});

const interruptions = JSON.parse(
  readFileSync(new URL('fixtures/folia-classic-interruptions.json', import.meta.url), 'utf8'),
);
test('Classic inherited-velocity springs match the actual Motion generator', async () => {
  const motion = await load('motion.mjs');
  for (const item of interruptions.springs) {
    for (const sample of item.samples) {
      const actual = motion.springValue(
        item.from,
        item.to,
        sample.t,
        item.stiffness,
        item.damping,
        undefined,
        item.velocity,
      );
      assert.ok(
        Math.abs(actual - sample.value) < 1e-10,
        `spring ${JSON.stringify(item)} t=${sample.t}: ${actual} != ${sample.value}`,
      );
    }
  }
});

test('Classic repeated redirects preserve actual Motion frame velocities and easing', async () => {
  const motion = await load('motion.mjs');
  assert.equal(typeof motion.wordTransition, 'function');
  const word = { text: 'A', startTime: 1, endTime: 2 };
  const profile = motion.renderProfile({ startTime: 0, endTime: 4, words: [word] });
  const rename = (source) => ({ ...source, rotation: source.rotate, blur: 10, bodyMix: 0 });
  const config = interruptions.config;
  for (const stage of interruptions.stages) {
    const transition = motion.wordTransition(
      stage.state,
      20,
      rename(stage.origin),
      rename(stage.previous),
      20 - stage.frameDeltaMs / 1000,
    );
    for (const field of ['scale', 'x', 'y', 'rotation']) {
      const sourceField = field === 'rotation' ? 'rotate' : field;
      assert.ok(Math.abs(transition.velocity[field] - stage.inheritedVelocity[sourceField]) < 1e-8);
    }
    const lyricTime = stage.state === 'active' ? 1.4 : stage.state === 'passed' ? 2.5 : 0.5;
    for (const sample of stage.samples) {
      const actual = motion.wordUiPose(
        word,
        config,
        lyricTime,
        profile,
        0,
        settings,
        true,
        transition,
        20 + sample.t,
      );
      for (const field of ['opacity', 'scale', 'x', 'y', 'rotation']) {
        const sourceField = field === 'rotation' ? 'rotate' : field;
        assert.ok(
          Math.abs(actual[field] - sample.pose[sourceField]) < 1e-8,
          `${stage.state} ${field} at ${sample.t}: ${actual[field]} != ${sample.pose[sourceField]}`,
        );
      }
    }
  }
});
