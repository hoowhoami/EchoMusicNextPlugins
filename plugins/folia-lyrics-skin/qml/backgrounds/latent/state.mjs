// Folia a8da4437 LatentBackground frame loop; normalized public PCM bands at the boundary.
import * as Source from './helpers.mjs';
import { defaults } from './defaults.mjs';

// Named callable export also gives qmllint a stable type for the generated helper.
export function resolveColors(coverColors, theme, source) {
  return Source.resolveLatentShaderColors(coverColors, theme, source);
}

export function pixelBudget(width, height, devicePixelRatio) {
  if (!(width > 0 && height > 0)) return { width: 1, height: 1, pixelRatio: 1 };
  const w = Math.round(width);
  const h = Math.round(height);
  const ratio = Math.max(1, devicePixelRatio);
  const scale = Math.min(1, Math.sqrt((1280 * 720) / (w * h * ratio * ratio)));
  const physicalWidth = Math.max(1, Math.round(w * ratio * scale));
  return {
    width: physicalWidth,
    height: Math.max(1, Math.round(h * ratio * scale)),
    pixelRatio: physicalWidth / w,
  };
}
export function tuning(settings) {
  const result = {};
  for (const key of Object.keys(defaults)) {
    const value = settings['latent' + key[0].toUpperCase() + key.slice(1)];
    result[key] = value === undefined ? defaults[key] : value;
  }
  return result;
}
export function createState(paused) {
  return {
    playing: paused ? 0 : 1,
    power: 0,
    bass: 0,
    mid: 0,
    beatSpeed: 0,
    previousEnergy: 0,
    onset: 0,
    meshTime: 0,
    ditherTime: 0,
    pixelSize: defaults.ditheringSize,
    distortion: defaults.meshDistortion,
    swirl: defaults.meshSwirl,
    ditherOpacity: defaults.ditheringOpacity,
    ditherScale: 1.015,
    meshScale: 1.025,
    saturation: 1,
    brightness: 1,
  };
}
export function stepFrame(previous, bands, tuning, paused, elapsedMs, motionEnabled) {
  if (!motionEnabled) return previous;
  const state = Object.assign({}, previous);
  const ease = (current, target, amount) => current + (target - current) * amount;
  state.playing = ease(state.playing, paused ? 0 : 1, 1 - Math.exp(-elapsedMs / 300));
  const energy = paused
    ? 0
    : Source.resolveLatentBroadbandEnergy(
        bands.bass * 255,
        bands.lowMid * 255,
        bands.mid * 255,
        bands.vocal * 255,
        bands.treble * 255
      );
  state.power = ease(state.power, paused ? 0 : bands.audioPower, 0.12);
  state.bass = ease(state.bass, paused ? 0 : bands.bass, 0.16);
  state.mid = ease(state.mid, paused ? 0 : Math.max(bands.mid, bands.vocal), 0.13);
  state.onset = tuning.enhancedBeatResponse
    ? Source.resolveLatentOnsetPulse(energy, state.previousEnergy, state.onset)
    : 0;
  state.previousEnergy = energy;
  const target = Source.resolveLatentAudioSpeedTarget(
    energy,
    state.onset,
    tuning.enhancedBeatResponse
  );
  state.beatSpeed = ease(state.beatSpeed, target, target > state.beatSpeed ? 0.42 : 0.14);
  const speed = (base, audio) =>
    ease(
      Source.resolveLatentShaderSpeed(base, audio, state.beatSpeed, true),
      Source.resolveLatentShaderSpeed(base, audio, state.beatSpeed, false),
      state.playing
    );
  state.ditherTime += (elapsedMs / 1000) * speed(tuning.ditheringSpeed, tuning.ditheringAudioSpeed);
  state.meshTime += (elapsedMs / 1000) * speed(tuning.meshSpeed, tuning.meshAudioSpeed);
  state.pixelSize = Math.max(0.5, tuning.ditheringSize - state.bass * tuning.ditheringSize * 0.34);
  state.distortion = tuning.meshDistortion + state.power * 0.62;
  state.swirl = tuning.meshSwirl + state.mid * 0.38;
  state.ditherOpacity = Math.min(1, tuning.ditheringOpacity + state.bass * 0.25);
  state.ditherScale = 1.015 + state.bass * 0.025;
  state.meshScale = 1.025 + state.power * 0.018;
  state.saturation = 1.04 + state.mid * 0.34;
  state.brightness = 0.94 + state.power * 0.16;
  return state;
}
