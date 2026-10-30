import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const base = new URL('../plugins/folia-lyrics-skin/qml/backgrounds/nomand/', import.meta.url);
async function kernel() {
  assert.ok(
    existsSync(new URL('kernel.mjs', base)),
    'All five original Nomand image shader profiles must exist',
  );
  return import(new URL('kernel.mjs', base));
}
test('Nomand source defaults and bounded pixel target preserve DPR and image selection', async () => {
  const k = await kernel();
  assert.equal(k.defaults.effect, 'dithering');
  assert.equal(k.defaults.ditheringType, '8x8');
  assert.equal(k.defaults.size, 3);
  assert.equal(k.defaults.colorSteps, 4);
  assert.equal(k.defaults.overlayOpacity, 0.35);
  assert.equal(k.resolveSourceUrl('cover', 'custom', { imageSource: 'cover-derived' }), 'cover');
  assert.equal(k.resolveSourceUrl('cover', 'custom', { imageSource: 'uploaded-global' }), 'custom');
  assert.equal(k.resolveSourceUrl(null, 'custom', k.defaults), 'custom');
  for (const [w, h, dpr] of [
    [320, 240, 0.5],
    [800, 450, 2],
    [3840, 2160, 2],
    [1279.3, 800.6, 1.5],
  ]) {
    const result = k.pixelBudget(w, h, dpr),
      ratio = Math.max(1, dpr),
      scale = Math.min(
        1,
        Math.sqrt((1920 * 1080) / (Math.round(w) * Math.round(h) * ratio * ratio)),
      );
    assert.equal(result.width, Math.round(Math.round(w) * ratio * scale));
    assert.equal(result.height, Math.round(Math.round(h) * ratio * scale));
    assert.equal(result.pixelRatio, result.width / Math.round(w));
  }
});
test('Five complete uniform profiles match the actual pinned Folia JSX and Paper React factories', async () => {
  const k = await kernel(),
    oracle = JSON.parse(
      readFileSync(new URL('fixtures/nomand/profiles.json', import.meta.url), 'utf8'),
    );
  for (const item of oracle) {
    const actual = k.profile(item.tuning, item.theme, item.daylight, 'fixture-cover');
    delete actual.uniforms.u_noiseTexture;
    assert.deepEqual(actual, item.expected, item.tuning.effect);
  }
});
test('Nomand shader source provenance retains all original effects, mipmaps and exact noise bytes', async () => {
  const k = await kernel(),
    source = JSON.parse(readFileSync(new URL('sources.json', base), 'utf8'));
  assert.equal(source.revision, 'a8da4437cf19723555bd75e4685ca20815fe5b82');
  assert.equal(source.paper, '0.0.80');
  for (const effect of [
    'fluted-glass',
    'paper-texture',
    'halftone-dots',
    'lens-distortion',
    'dithering',
  ]) {
    assert.ok(existsSync(new URL(effect + '.frag.qsb', base)));
    const p = k.profile(
      Object.assign({}, k.defaults, { effect }),
      {
        backgroundColor: '#181828',
        primaryColor: '#ffffff',
        secondaryColor: '#99aabb',
        accentColor: '#ff6699',
      },
      false,
      'fixture-cover',
    );
    assert.equal(p.uniforms.u_fit, 2);
    assert.equal(p.minPixelRatio, 1);
    assert.equal(p.maxPixelCount, 1920 * 1080);
    assert.equal(p.speed, 0);
    assert.equal(p.frame, 0);
    assert.equal(
      !!p.mipmaps,
      ['fluted-glass', 'paper-texture', 'lens-distortion'].includes(effect),
    );
  }
  const noise = readFileSync(new URL('paper-noise.png', base));
  assert.equal(noise.readUInt32BE(16), 128);
  assert.equal(noise.readUInt32BE(20), 128);
});
test('Hardware WebGL pixel oracle retains all five effects, translucent high-frequency input and odd/even target grids', () => {
  const oracle = JSON.parse(
    readFileSync(new URL('fixtures/nomand/webgl.json', import.meta.url), 'utf8'),
  );
  assert.match(oracle.renderer, /Metal/);
  assert.equal(oracle.results.length, 30);
  for (const [logicalWidth, logicalHeight, pixelRatio] of [
    [320, 240, 2],
    [320, 240, 1],
    [321, 241, 1],
  ]) {
    const records = oracle.results.filter(
      (item) =>
        item.logicalWidth === logicalWidth &&
        item.logicalHeight === logicalHeight &&
        item.pixelRatio === pixelRatio,
    );
    assert.equal(records.length, 10);
    assert.equal(new Set(records.map((item) => item.effect)).size, 5);
    for (const record of records) {
      assert.equal(record.width, logicalWidth * pixelRatio);
      assert.equal(record.height, logicalHeight * pixelRatio);
      assert.ok(['patches.png', 'mipmap.png'].includes(record.fixture));
      assert.ok(record.samples.length >= 42);
      for (const { x, y, rgb } of record.samples) {
        assert.ok(x >= 0 && x < record.width && y >= 0 && y < record.height);
        assert.equal(rgb.length, 3);
        assert.ok(
          rgb.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255),
        );
      }
    }
  }
});
