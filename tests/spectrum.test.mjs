import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS, normalizeSettings } from '../plugins/spectrum-visualizer/src/config.ts';
import {
  paint,
  centered,
  mist,
  palette,
  blurFor,
} from '../plugins/spectrum-visualizer/src/drawing.js';
import { scene } from '../plugins/spectrum-visualizer/src/scene.js';

test('spectrum settings preserve original defaults and bound corrupt private values', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  const value = normalizeSettings({
    fps: 1000,
    fftSize: 17,
    mode: 'invalid',
    scale: 'bad',
    smoothing: 999,
    opacity: -20,
    centeredBarWidth: 20,
  });
  assert.equal(value.fps, 15);
  assert.equal(value.fftSize, 1024);
  assert.equal(value.mode, 'bars');
  assert.equal(value.scale, 'log');
  assert.equal(value.smoothing, 95);
  assert.equal(value.opacity, 18);
  assert.equal(value.centeredBarWidth, 8);
  assert.equal(value.showPlayerBar, false);
  assert.equal(value.showMiniPlayer, false);
  assert.equal(value.showLyricControls, true);
});
function canvas() {
  const calls = [];
  const context = new Proxy(
    {},
    {
      get(_, key) {
        if (key === 'createLinearGradient')
          return (...args) => {
            calls.push([key, ...args]);
            return {
              addColorStop(...stops) {
                calls.push(['stop', ...stops]);
              },
            };
          };
        return (...args) => {
          for (const value of args)
            if (typeof value === 'number') assert.ok(Number.isFinite(value), `${key}: ${value}`);
          calls.push([key, ...args]);
        };
      },
      set(_, key, value) {
        calls.push(['set', key, value]);
        return true;
      },
    },
  );
  return { context, calls };
}
const frame = {
  source: 'player',
  state: 'playing',
  bins: [0, 0.1, 0.5, 0.9, 0.2, 0.01],
  waveform: [0, 0.1, -0.1, 0.3, -0.3, 0],
  rms: 0.13,
};
test('all five render paths consume frames and preserve centered attack/decay and mask', () => {
  const colors = palette('aurora', []);
  for (const mode of ['bars', 'wave', 'hybrid', 'mist', 'centered']) {
    const { context, calls } = canvas();
    const settings = { ...DEFAULT_SETTINGS, mode };
    const display = { values: [] };
    if (mode === 'mist')
      for (let i = 0; i < 3; i++) {
        mist(context, 480, 82, frame, settings, 'lyric', colors, 1000, i);
        assert.ok(blurFor(settings, i) > 0);
      }
    else if (mode === 'centered') {
      centered(context, 480, 82, frame, settings, 'lyric', colors, display);
      const before = [...display.values];
      assert.ok(before.some((value) => value > 0));
      for (let i = 0; i < before.length; i++)
        assert.ok(Math.abs(before[i] - before[before.length - 1 - i]) < 1e-9);
      centered(context, 480, 82, { ...frame, bins: [] }, settings, 'lyric', colors, display);
      assert.ok(display.values.every((value, i) => value <= before[i]));
      assert.ok(
        calls.some(
          (call) =>
            call[0] === 'set' &&
            call[1] === 'globalCompositeOperation' &&
            call[2] === 'destination-in',
        ),
      );
    } else paint(context, 480, 82, frame, settings, 'lyric', colors, 1000, display);
    assert.ok(calls.some((call) => call[0] === 'fill' || call[0] === 'stroke'));
  }
});

test('GPU vector commands retain original geometry, gradients, glow and centered smoothing', () => {
  const colors = palette('aurora', []);
  const settings = { ...DEFAULT_SETTINGS, showBackdrop: true };
  const bars = scene(480, 82, frame, settings, 'lyric', colors, 1000, { values: [] });
  assert.equal(bars.length, 2);
  assert.deepEqual(
    bars[1].gradient.stops.map((stop) => stop.at),
    [0, 0.52, 1],
  );
  assert.equal((bars[1].path.match(/Z/g) || []).length, frame.bins.length);
  assert.equal(bars[1].shadowBlur, 8);
  const wave = scene(480, 82, frame, { ...settings, mode: 'wave' }, 'lyric', colors, 1000, {});
  assert.equal(wave[1].stroke, true);
  assert.equal(wave[1].lineWidth, 2);
  assert.equal(wave[1].shadowBlur, 16);
  assert.equal((wave[1].path.match(/L/g) || []).length, frame.waveform.length - 1);
  const display = { values: [] };
  const centeredSettings = { ...settings, mode: 'centered' };
  const center = scene(480, 82, frame, centeredSettings, 'lyric', colors, 1000, display);
  assert.equal(center.length, 2); // Edge mask belongs to the completed GPU group.
  const before = [...display.values];
  scene(480, 82, { ...frame, bins: [] }, centeredSettings, 'lyric', colors, 1000, display);
  assert.ok(display.values.every((value, index) => value <= before[index]));
  for (let pass = 0; pass < 3; ++pass) {
    const fog = scene(480, 82, frame, settings, 'lyric', colors, 1000, {}, pass);
    assert.equal(fog.length, 1);
    assert.equal(fog[0].gradient.stops[0].color, colors[pass]);
    assert.ok(fog[0].path.includes('Q'));
    assert.ok(!/NaN|Infinity|undefined/.test(fog[0].path));
  }
});
