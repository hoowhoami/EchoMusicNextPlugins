import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

async function configuration() {
  const output = await build({
    entryPoints: [new URL('../plugins/folia-lyrics-skin/src/config.ts', import.meta.url).pathname],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
  });
  return import(
    'data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64')
  );
}
test('all descriptor modes persist the pinned upstream defaults independently', async () => {
  const source = JSON.parse(
    await readFile(new URL('./fixtures/tuning/source-defaults.json', import.meta.url)),
  );
  const { defaults, validate } = await configuration();
  for (const group of ['tempera', 'lumiere', 'sonnet', 'nomand', 'monet', 'diorama'])
    for (const [name, value] of Object.entries(source[group])) {
      if (group === 'diorama' && name === 'geometryVisibility') {
        for (const [child, initial] of Object.entries(value)) {
          const key = 'dioramaGeometry' + child[0].toUpperCase() + child.slice(1);
          assert.deepEqual(defaults[key], initial, key);
        }
        continue;
      }
      const key = group + name[0].toUpperCase() + name.slice(1);
      assert.deepEqual(defaults[key], value, key);
    }
  assert.equal(validate(defaults), true);
  for (const patch of [
    { temperaCameraIntensity: 2.01 },
    { temperaGlyphMotion: -0.1 },
    { temperaWholeLineLyrics: 1 },
    { temperaPostProcessVignette: 2.01 },
    { temperaTextureResolution: 4.01 },
    { temperaColorMode: 'missing' },
    { lumiereWindowNeighbors: 1.5 },
    { lumiereFogOctaves: 2.5 },
    { lumiereUnlitOpacity: 0.049 },
    { lumiereRenderQuality: 'missing' },
    { lumiereTrails: 0 },
    { sonnetCameraIntensity: 2.01 },
    { sonnetShowOnlyText: 1 },
    { sonnetTextureResolution: 0.49 },
    { sonnetOuterFrameMode: 'missing' },
    { sonnetPostProcessLensDispersion: 1.01 },
    { nomandEffect: 'missing' },
    { nomandSize: 20.1 },
    { nomandColorSteps: 2.5 },
    { nomandLensDistortionBulge: -1.1 },
    { commonUseCoverColorBg: 1 },
    { commonOpacity: 1.1 },
    { monetBackgroundBlurPx: 60.1 },
    { monetBackgroundSaturation: -0.1 },
    { monetBackgroundOverlayOpacity: 1.01 },
    { monetBackgroundWashCustomColor: '#abc' },
    { monetBackgroundWashCustomColor: 'red' },
    { monetBackgroundWashColorMode: 'missing' },
    { monetBackgroundDriftEnabled: 1 },
    { dioramaCameraSpeed: 0.54 },
    { dioramaMotionAmount: 1.61 },
    { dioramaAudioReactivity: 1.51 },
    { dioramaGeometryMode: 'missing' },
    { dioramaGeometryEnabled: 1 },
    { dioramaParticleDensity: 1537 },
    { dioramaParticleDensity: 96.5 },
    { dioramaParticleScale: 0.64 },
    { dioramaBackgroundParticleCircumference: 3 },
    { dioramaBackgroundParticleRadial: 4.1 },
    { dioramaGlowIntensity: 0.09 },
    { dioramaSoulIntensity: 1.51 },
    { dioramaGradientEnabled: 1 },
    { temperaLayerImages: [{ id: 'file:///foreign.png' }] },
  ])
    assert.notEqual(validate({ ...defaults, ...patch }), true, JSON.stringify(patch));
});
