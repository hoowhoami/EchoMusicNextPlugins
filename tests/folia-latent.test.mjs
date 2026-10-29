import { foliaURL } from './folia-source.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import * as Helpers from '../plugins/folia-lyrics-skin/qml/backgrounds/latent/helpers.mjs';
import { defaults } from '../plugins/folia-lyrics-skin/qml/backgrounds/latent/defaults.mjs';
import {
  pixelBudget,
  createState,
  stepFrame,
} from '../plugins/folia-lyrics-skin/qml/backgrounds/latent/state.mjs';
import { extractRepresentativeColorsFromPixels } from '../plugins/folia-lyrics-skin/qml/backgrounds/latent/palette.mjs';

test('Latent source helpers preserve exact energy, pause, onset and palette semantics', async () => {
  const source = await readFile(
    foliaURL('src/components/visualizer/backgrounds/latent/LatentBackground.tsx'),
    'utf8',
  );
  const code = (
    await transform(
      source.slice(
        source.indexOf('const MAX_SHADER_PIXELS ='),
        source.indexOf('const LatentBackground:'),
      ),
      { loader: 'ts', format: 'esm', target: 'es2016' },
    )
  ).code;
  const oracle = await import(
    'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
  );
  for (const name of [
    'resolveLatentBroadbandEnergy',
    'resolveLatentOnsetPulse',
    'resolveLatentAudioSpeedTarget',
    'resolveLatentShaderSpeed',
  ])
    for (let i = 0; i < 30; ++i) {
      const args =
        name === 'resolveLatentBroadbandEnergy'
          ? [i * 9, 64, 120, 200, 32]
          : name === 'resolveLatentOnsetPulse'
            ? [i / 30, 0.25, 0.8]
            : name === 'resolveLatentAudioSpeedTarget'
              ? [i / 30, 0.7, i % 2 === 0]
              : [i / 30, 1.2, 0.6, i % 2 === 0];
      assert.equal(Helpers[name](...args), oracle[name](...args));
    }
  const theme = {
    backgroundColor: '#112233',
    primaryColor: '#eeeeee',
    secondaryColor: '#999999',
    accentColor: '#ff3399',
  };
  for (const palette of [
    [],
    ['#abcdef'],
    ['#123456', '#234567', '#345678', '#456789', '#56789a', '#6789ab'],
  ])
    for (const kind of ['cover-only', 'cover-theme'])
      assert.deepEqual(
        Helpers.resolveLatentShaderColors(palette, theme, kind),
        oracle.resolveLatentShaderColors(palette, theme, kind),
      );
});

test('shader pixel budget follows source DPR and never exceeds 1280x720 pixel area', () => {
  for (const [w, h, dpr] of [
    [800, 600, 1],
    [800, 600, 2],
    [3840, 2160, 2],
    [129, 720, 1.5],
  ]) {
    const r = pixelBudget(w, h, dpr);
    assert.ok(r.width * r.height <= 1280 * 720 + 2000);
    assert.equal(r.pixelRatio, r.width / Math.round(w));
  }
  assert.deepEqual(pixelBudget(0, 0, 2), { width: 1, height: 1, pixelRatio: 1 });
});

test('frame smoothing and independent shader speed integration retain source factors', () => {
  let state = createState(false);
  const bands = { bass: 0.8, lowMid: 0.3, mid: 0.5, vocal: 0.7, treble: 0.2, audioPower: 0.4 };
  state = stepFrame(state, bands, defaults, false, 16, true);
  assert.equal(state.power, 0.048);
  assert.equal(state.bass, 0.128);
  assert.equal(state.mid, 0.091);
  assert.equal(state.pixelSize, 2.5 - 0.128 * 2.5 * 0.34);
  assert.equal(state.distortion, 0.8 + 0.048 * 0.62);
  assert.equal(state.swirl, 0.1 + 0.091 * 0.38);
  assert.equal(state.ditherOpacity, 0.55 + 0.128 * 0.25);
  assert.equal(state.meshScale, 1.025 + 0.048 * 0.018);
  assert.ok(state.meshTime > 0 && state.ditherTime > 0);
  const frozen = stepFrame(state, bands, defaults, false, 16, false);
  assert.deepEqual(frozen, state);
  const paused = stepFrame(state, bands, defaults, true, 300, true);
  assert.ok(paused.playing < state.playing && paused.power < state.power);
});

test('real pixel median-cut retains population priority, alpha cutoff and six source colors', () => {
  const pixels = [];
  for (let i = 0; i < 30; ++i) pixels.push(255, 0, 0, 255);
  for (let i = 0; i < 10; ++i) pixels.push(0, 0, 255, 255);
  pixels.push(0, 255, 0, 127);
  assert.deepEqual(extractRepresentativeColorsFromPixels(pixels, 6), ['#ff0000', '#0000ff']);
  assert.deepEqual(extractRepresentativeColorsFromPixels([], 6), []);
});
