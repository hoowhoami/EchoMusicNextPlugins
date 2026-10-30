import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Fume from '../plugins/folia-lyrics-skin/qml/styles/fume/native-measure.mjs';
import * as Monet from '../plugins/folia-lyrics-skin/qml/styles/monet/native-measure.mjs';

for (const [name, bridge] of [
  ['Fume', Fume],
  ['Monet', Monet],
])
  test(`${name} retains independent exact fractional font widths`, () => {
    bridge.configure({ pieces: [], measurements: [], discovery: true });
    const context = bridge.getMeasureContext();
    for (const size of [0.125, 0.8969064634404105, 16.1, 16.4, 80.5]) {
      context.font = `700 ${size}px lyrics`;
      context.measureText('office العربية 星 👩🏽‍🚀');
    }
    const pending = bridge.pendingMeasurements();
    assert.equal(pending.length, 5);
    assert.deepEqual(
      pending.map((query) => query.size),
      [0.125, 0.8969064634404105, 16.1, 16.4, 80.5],
    );
  });
test('Monet inline paragraphs retain exact fractional typography in their cache identity', () => {
  Monet.configure({ pieces: [], measurements: [], discovery: true });
  Monet.inlineBox('700 16.1px lyrics', 'office 星', 300, 24);
  Monet.inlineBox('700 16.4px lyrics', 'office 星', 300, 24);
  assert.equal(Monet.pendingMeasurements().length, 2);
});
