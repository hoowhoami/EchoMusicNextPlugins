import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  nextQueueIndex,
  prevQueueIndex,
} from '../plugins/folia-lyrics-skin/qml/shared/queueNeighbors.mjs';

const source = readFileSync(
  new URL('../plugins/folia-lyrics-skin/qml/shared/PlayerCapsule.qml', import.meta.url),
  'utf8',
);
const start = source.indexOf('    function refreshNavigation(');
assert.notEqual(start, -1);
const open = source.indexOf('{', start);
let depth = 1,
  end = open + 1;
while (depth && end < source.length) {
  if (source[end] === '{') depth++;
  else if (source[end] === '}') depth--;
  end++;
}
assert.equal(depth, 0);
const refresh = new Function('scope', `with (scope) { ${source.slice(open + 1, end - 1)} }`);
const titleBinding = source.match(/\n\s+trackKey: (.+)/)?.[1];
assert.ok(titleBinding, 'Actual title widget must expose its production trackKey binding');
const titleKey = new Function('root', `return (${titleBinding});`);
function capsule(count = 2, index = 0, playMode = 0, personalFm = false) {
  const rows = Array.from({ length: count }, (_, i) => ({
    resourceId: `opaque-${i}`,
    title: `Song-${i}`,
    isCurrent: i === index,
  }));
  const scope = {
    initialized: true,
    page: { active: true, player: { hasTrack: true, queue: { row: (i) => rows[i] } } },
    queueProjection: { count },
    playbackSnapshot: { personalFm },
    playMode,
    adjacentTracks: {},
    _titleKey: '',
    QueueNeighbors: { nextQueueIndex, prevQueueIndex },
  };
  const titleProperty = source.match(/readonly property string titleKey: (.+)/)?.[1];
  if (titleProperty) {
    const evaluate = new Function('scope', `with (scope) { return (${titleProperty}); }`);
    Object.defineProperty(scope, 'titleKey', { get: () => evaluate(scope) });
  }
  const update = () => refresh(scope);
  update();
  return { scope, rows, update, key: () => titleKey(scope) };
}
test('an ordinary revision change does not restart the same stable song title', () => {
  const value = capsule(),
    key = value.key();
  value.scope.page.player.revision = 'revision:2';
  value.update();
  assert.equal(value.key(), key);
});
test('a real B identity changes the key while repeat-one of A does not', () => {
  const value = capsule(),
    key = value.key();
  value.scope.page.player.revision = 'revision:repeat-one';
  value.update();
  assert.equal(value.key(), key);
  value.rows[0].isCurrent = false;
  value.rows[1].isCurrent = true;
  value.scope.page.player.revision = 'revision:B';
  value.update();
  assert.notEqual(value.key(), key);
});
const cases = [
  {
    tag: 'all singleton replays itself',
    count: 1,
    index: 0,
    mode: 0,
    previous: 'Song-0',
    next: 'Song-0',
  },
  {
    tag: 'one first does not wrap previous',
    count: 3,
    index: 0,
    mode: 1,
    previous: '',
    next: 'Song-1',
  },
  { tag: 'one last does not wrap next', count: 3, index: 2, mode: 1, previous: 'Song-1', next: '' },
  {
    tag: 'off first does not wrap previous',
    count: 3,
    index: 0,
    mode: 3,
    previous: '',
    next: 'Song-1',
  },
  { tag: 'off last does not wrap next', count: 3, index: 2, mode: 3, previous: 'Song-1', next: '' },
  {
    tag: 'all first wraps previous',
    count: 3,
    index: 0,
    mode: 0,
    previous: 'Song-2',
    next: 'Song-1',
  },
  { tag: 'all last wraps next', count: 3, index: 2, mode: 0, previous: 'Song-1', next: 'Song-0' },
];
for (const row of cases)
  test(`manual neighbor boundary: ${row.tag}`, () => {
    const { scope } = capsule(row.count, row.index, row.mode);
    assert.equal(scope.adjacentTracks.previousTitle, row.previous);
    assert.equal(scope.adjacentTracks.nextTitle, row.next);
    assert.equal(scope.adjacentTracks.canPrevious, row.previous !== '');
    assert.equal(scope.adjacentTracks.canNext, row.next !== '');
  });
test('FM does not wrap previous and leaves a fetchable next title unknown', () => {
  const first = capsule(2, 0, 0, true).scope.adjacentTracks;
  assert.equal(first.canPrevious, false);
  assert.equal(first.previousTitle, '');
  const last = capsule(2, 1, 0, true).scope.adjacentTracks;
  assert.equal(last.canNext, true);
  assert.equal(last.nextTitle, '');
});

test('cleared native rows cannot feed undefined adjacent titles through a stale DelegateModel count', () => {
  for (const hasTrack of [false, true]) {
    const value = capsule(3, 1);
    value.scope.page.player.queue.row = () => ({});
    value.scope.page.player.hasTrack = hasTrack;
    // Native reset can precede DelegateModel.count and the player hasTrack notify.
    assert.equal(value.scope.queueProjection.count, 3);
    value.update();
    assert.deepEqual(value.scope.adjacentTracks, {
      previousTitle: '',
      nextTitle: '',
      canPrevious: false,
      canNext: false,
    });
  }
});
