import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const qml = await readFile(
  new URL('../plugins/folia-lyrics-skin/qml/shared/DynamicPresentation.qml', import.meta.url),
  'utf8',
);
const start = qml.indexOf('function seekLine(seconds: real): void {');
assert.ok(start >= 0, 'exercise the actual presentation click handler');
let end = qml.indexOf('{', start),
  depth = 1;
const bodyStart = ++end;
for (; depth && end < qml.length; ++end) {
  if (qml[end] === '{') ++depth;
  if (qml[end] === '}') --depth;
}
const seekLine = new Function('root', 'handoff', 'qsTr', 'seconds', qml.slice(bodyStart, end - 1));

function invoke({ holding = false, crossed = false, handedOver = false, active = true } = {}) {
  const calls = [],
    rejected = [];
  const root = {
    live: true,
    holdingOutgoing: holding,
    page: {
      active,
      player: { revision: 'current-revision' },
      command(action, args) {
        calls.push({ action, args });
        return 'operation';
      },
    },
    commandRejected(...args) {
      rejected.push(args);
    },
    operationIssued(operation) {
      assert.equal(operation, 'operation');
    },
  };
  seekLine(root, { crossed, projection: { handedOver } }, (text) => text, 12.345);
  return { calls, rejected };
}

test('outgoing lyric clicks never seek a possibly adopted B before delayed handover notification', () => {
  for (const handedOver of [false, true]) {
    const result = invoke({ holding: true, crossed: false, handedOver });
    assert.deepEqual(result.calls, []);
    assert.equal(result.rejected.length, 1);
    assert.equal(result.rejected[0][0], 'seek');
  }
});

test('ordinary current-source and crossed incoming lyrics keep the existing revision-guarded seek', () => {
  for (const options of [{}, { holding: true, crossed: true, handedOver: true }]) {
    const result = invoke(options);
    assert.deepEqual(result.calls, [
      { action: 'seek', args: { value: 12345, revision: 'current-revision' } },
    ]);
    assert.deepEqual(result.rejected, []);
  }
  assert.deepEqual(invoke({ active: false }).calls, []);
});
