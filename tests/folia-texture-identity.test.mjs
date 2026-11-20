import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTextureIdentityLedger,
  shareTextureIdentities,
} from '../plugins/folia-lyrics-skin/qml/styles/lumiere/texture-identity.mjs';
const texture = (id, text = '山河') => ({
  id,
  revision: 17,
  kind: 'canvas',
  width: 100,
  height: 50,
  pixelWidth: 200,
  pixelHeight: 100,
  resolution: 2,
  commands: [{ kind: 'text', text, style: { font: '600 32px sans-serif', fillStyle: '#fff' } }],
});
test('identical immutable images share storage without changing painter slots or instance indices', () => {
  const ledger = createTextureIdentityLedger();
  const leaves = [
    { id: 'batch', kind: 'batch', sources: ['a', 'b'], payload: 'unchanged-instance-indices' },
    { id: 'sprite', kind: 'sprite', texture: { source: 'b', frame: [0, 0, 4, 8] } },
  ];
  const original = { textures: [texture('a'), texture('b')], leaves, groups: [] };
  const shared = shareTextureIdentities(original, ledger);
  assert.equal(shared.textures.length, 1);
  assert.deepEqual(shared.leaves[0].sources, [shared.textures[0].id, shared.textures[0].id]);
  assert.equal(shared.leaves[0].payload, leaves[0].payload);
  assert.deepEqual(shared.leaves[1].texture.frame, leaves[1].texture.frame);
  assert.equal(original.textures[0].id, 'a');
  const next = shareTextureIdentities(
    { ...original, textures: [texture('a', '月光'), texture('b')] },
    ledger,
  );
  assert.equal(next.textures.length, 2);
  assert.equal(next.leaves[0].sources[1], shared.textures[0].id);
  assert.notEqual(next.leaves[0].sources[0], shared.textures[0].id);
});
test('every raster extent and paint state separates identities; expired metadata stays bounded', () => {
  const ledger = createTextureIdentityLedger(10000, 1),
    base = texture('base');
  ledger.begin();
  const original = ledger.intern(base);
  for (const key of ['width', 'height', 'pixelWidth', 'pixelHeight', 'resolution'])
    assert.notEqual(ledger.intern({ ...base, [key]: base[key] + 1 }).id, original.id);
  const color = structuredClone(base);
  color.commands[0].style.fillStyle = '#f00';
  assert.notEqual(ledger.intern(color).id, original.id);
  const frame = { textures: [], leaves: [] };
  shareTextureIdentities(frame, ledger);
  shareTextureIdentities(frame, ledger);
  assert.equal(ledger.bytes, 0);
  ledger.begin();
  assert.notEqual(ledger.intern(base).id, original.id);
  const bounded = createTextureIdentityLedger(10);
  bounded.begin();
  bounded.intern(base);
  bounded.finish();
  assert.equal(bounded.bytes, 0);
});
