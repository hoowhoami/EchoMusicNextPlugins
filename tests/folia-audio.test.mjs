import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAudioBands } from '../plugins/folia-lyrics-skin/qml/shared/audioBands.mjs';

const frame = (bins) => ({
  source: 'player',
  state: 'playing',
  minFrequency: 20,
  maxFrequency: 12000,
  bins,
});
test('Folia consumes the existing normalized player spectrum without another FFT profile', () => {
  const silence = resolveAudioBands(frame(Array(128).fill(0)));
  const full = resolveAudioBands(frame(Array(128).fill(1)));
  for (const value of Object.values(silence)) assert.equal(value, 0);
  for (const value of Object.values(full)) assert.equal(value, 1);
  const low = Array(128).fill(0);
  low[0] = low[1] = 1;
  const energy = resolveAudioBands(frame(low));
  assert.ok(energy.bass > 0);
  assert.equal(energy.treble, 0);
  assert.ok(energy.audioPower > 0);
});

test('pause, silence, unavailable and invalid spectrum frames never invent energy', () => {
  for (const value of [
    null,
    {},
    { ...frame(Array(128).fill(1)), state: 'paused' },
    { ...frame(Array(128).fill(1)), source: 'silence' },
    frame(Array(128).fill(NaN)),
    frame(Array(128).fill(Infinity)),
    frame([]),
  ])
    assert.deepEqual(resolveAudioBands(value), {
      bass: 0,
      lowMid: 0,
      mid: 0,
      vocal: 0,
      treble: 0,
      audioPower: 0,
    });
});
