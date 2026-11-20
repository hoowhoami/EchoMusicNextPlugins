import assert from 'node:assert/strict';
import test from 'node:test';
import { textIdentity } from '../plugins/folia-lyrics-skin/qml/styles/tempera/text-identity.mjs';
test('Tempera retains only identical native shaping across pose, ink and source changes', () => {
  const value = {
    id: 'one',
    metrics: { lines: ['office 山河'], strokeWidth: 0, width: 400, baseline: 30 },
    style: { fontSize: 38, fontWeight: '600', letterSpacing: 0.25, fill: '#ff0000' },
    anchor: [0, 0],
  };
  const identity = textIdentity(value);
  assert.equal(
    textIdentity({
      ...value,
      id: 'two',
      anchor: [1, 1],
      metrics: { ...value.metrics, width: 500, baseline: 32 },
      style: { ...value.style, fill: '#00ff00', fontWeight: 600 },
    }),
    identity,
  );
  for (const change of [
    { metrics: { ...value.metrics, lines: ['off ice 山河'] } },
    { metrics: { ...value.metrics, strokeWidth: 1 } },
    { style: { ...value.style, fontSize: 38.01 } },
    { style: { ...value.style, fontWeight: 700 } },
    { style: { ...value.style, letterSpacing: 0 } },
  ])
    assert.notEqual(textIdentity({ ...value, ...change }), identity);
});
