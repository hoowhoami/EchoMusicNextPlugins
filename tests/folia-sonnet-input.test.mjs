import assert from 'node:assert/strict';
import test from 'node:test';
import { canonical } from '../plugins/folia-lyrics-skin/qml/styles/sonnet/glyph-input.mjs';
test('Qt sequence descriptors and JS arrays compare as the same complete glyph inputs', () => {
  const rows = [
    {
      key: 'r0',
      text: '山河 ffi',
      size: 69.06976744186046,
      spacing: 0,
      strokeWidth: 0,
      maxHaloRadius: 40,
      weight: 700,
    },
  ];
  const sequence = { 0: rows[0], length: 1, map: Array.prototype.map };
  assert.equal(Array.isArray(sequence), false);
  assert.deepEqual(canonical(sequence), canonical(rows));
  assert.equal(
    JSON.stringify(canonical(['sans', sequence, 'source-over'])),
    JSON.stringify(canonical(['sans', rows, 'source-over'])),
  );
  const changed = [{ ...rows[0], text: '山河 fi' }];
  assert.notDeepEqual(canonical(sequence), canonical(changed));
  assert.notDeepEqual(canonical(rows), canonical([{ ...rows[0], size: 69 }]));
  assert.deepEqual(canonical({ length: 1, key: 'r0' }), { key: 'r0', length: 1 });
  assert.equal(canonical(null), null);
});
