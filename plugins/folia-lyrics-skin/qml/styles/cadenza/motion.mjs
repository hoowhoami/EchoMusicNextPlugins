// Folia a8da4437 VisualizerCadenza.tsx draw loop, factored without a second playback clock.
import {
  clamp,
  mix,
  getWordStatus,
  getWordProgress,
  getClassicPassedDrift,
  getClassicBodyMix,
  getClassicGlowEnvelope,
  getClassicCharGlow,
  isCJK,
  splitGraphemes,
} from './envelopes.mjs';
export function settings(value) {
  value = value || {};
  function read(key, fallback) {
    return typeof value[key] === 'number' && Number.isFinite(value[key]) ? value[key] : fallback;
  }
  return {
    fontScale: read('cadenzaFontScale', 1.12) * read('lyricsFontScale', 1),
    widthRatio: read('cadenzaWidthRatio', 0.72),
    motionAmount: read('cadenzaMotionAmount', 1),
    glowIntensity: read('cadenzaGlowIntensity', 1),
    beamIntensity: 0,
  };
}
export function drawOrder(placements, time, timing) {
  const order = [];
  for (const status of ['waiting', 'passed', 'active'])
    for (let i = 0; i < placements.length; i++)
      if (getWordStatus(time, timing, placements[i].word) === status) order.push(i);
  return order;
}
export function stepPlacement(previous, placement, index, timing, options) {
  const time = options.time,
    word = placement.word,
    instant = timing.wordRevealMode === 'instant';
  const status = getWordStatus(time, timing, word),
    progress = getWordProgress(time, timing.wordRevealMode, word);
  const motion = options.motionEnabled !== false;
  const amount = motion ? options.motionAmount : 0;
  const energy = clamp(options.energy || 0, 0, 1) * amount;
  const focusY = options.height * 0.42 + (motion ? Math.sin(time * 2.3) * (3 + energy * 8) : 0);
  const pulse =
    status === 'active' && !instant
      ? 1 + Math.sin(time * 10 + word.startTime * 5) * 0.04 * amount
      : 1;
  const drift = instant || !motion ? 0 : getClassicPassedDrift(time, word);
  const scale =
    status === 'waiting'
      ? instant
        ? placement.scale
        : Math.max(placement.scale * 0.5, 0.5)
      : status === 'active'
        ? instant
          ? placement.scale
          : placement.scale * 1.3 * pulse
        : placement.scale;
  const rotation =
    status === 'waiting'
      ? instant
        ? placement.rotate
        : placement.rotate + 20
      : status === 'passed'
        ? instant
          ? placement.rotate
          : placement.rotate + placement.passedRotate * drift
        : placement.rotate;
  const target = {
    x:
      options.width / 2 +
      placement.x +
      Math.sin(time * 1.2 + index * 0.6) * energy * 4 +
      (status === 'passed' ? placement.passedDriftX * drift : 0) +
      (status === 'waiting' ? placement.entryOffsetX : 0),
    y:
      focusY +
      placement.y +
      Math.cos(time * 1.5 + index * 0.4) * energy * 2.5 +
      (status === 'passed' ? placement.passedDriftY * drift : 0) +
      (status === 'waiting' ? placement.entryOffsetY : 0),
    rotation,
    scale,
    bodyAlpha:
      status === 'waiting'
        ? 0
        : status === 'active'
          ? 1
          : instant
            ? 0
            : options.animationIntensity === 'chaotic'
              ? 0.9
              : 0.82,
    blur: motion && status === 'waiting' && !instant ? 10 : 0,
    activeMix: getClassicBodyMix(time, timing, word),
    glowAlpha: getClassicGlowEnvelope(time, timing, word),
  };
  const initialActive = instant && time >= word.startTime;
  const state = previous || {
    x: options.width / 2 + placement.x + placement.entryOffsetX,
    y: focusY + placement.y + placement.entryOffsetY,
    rotation: initialActive ? rotation : rotation + 16,
    scale: initialActive ? scale : Math.max(placement.scale * 0.5, 0.5),
    bodyAlpha: initialActive ? target.bodyAlpha : 0,
    blur: initialActive ? target.blur : 10,
    activeMix: initialActive ? target.activeMix : 0,
    glowAlpha: initialActive ? target.glowAlpha : 0,
  };
  const dt = clamp(Number.isFinite(options.dt) ? options.dt : 1 / 60, 1 / 240, 0.05);
  const result = { status, progress };
  for (const key of [
    'x',
    'y',
    'rotation',
    'scale',
    'bodyAlpha',
    'blur',
    'activeMix',
    'glowAlpha',
  ]) {
    const rate =
      ['x', 'y', 'rotation', 'scale'].indexOf(key) >= 0 ? 11 : key === 'glowAlpha' ? 16 : 14;
    result[key] = motion ? mix(state[key], target[key], 1 - Math.exp(-rate * dt)) : target[key];
  }
  return result;
}
// CSS text-shadow blur40 is Gaussian sigma20, unlike CSS filter blur40.
export function halos(color, intensity) {
  const glow = clamp(intensity, 0, 1.6);
  if (glow <= 0.01) return [];
  return [
    { radius: 20, opacity: Math.min(0.98, glow), color },
    { radius: 20, opacity: Math.min(0.92, glow * 0.92), color },
    { radius: 20, opacity: Math.min(0.35, glow * 0.26), color },
  ];
}
export function clusterHalos(placement, graphemeIndex, timing, time, glowAlpha, intensity) {
  const glyphs = splitGraphemes(placement.text);
  const split = timing.wordRevealMode === 'normal' && !isCJK(placement.text) && glyphs.length > 1;
  const value = split
    ? getClassicCharGlow(
        time,
        placement.word,
        placement.fragmentStartInWord + graphemeIndex,
        Math.max(placement.wordGraphemeCount, glyphs.length),
        placement.wordGraphemeTimings
      )
    : getClassicGlowEnvelope(time, timing, placement.word);
  return halos(placement.color, value * clamp(glowAlpha, 0, 1) * Math.max(intensity, 0));
}
export function ripple(placement, state, chorus) {
  if (!state || state.status !== 'active' || placement.isInterlude || !chorus) return null;
  const w = placement.width * state.scale,
    h = placement.height * state.scale;
  return {
    x: state.x + placement.width / 2,
    y: state.y - h * 0.42,
    radius: Math.max(w, h * 1.08) * (0.55 + state.progress * 0.45),
    opacity: 0.45 * (1 - state.progress) * state.bodyAlpha,
    color: placement.color,
  };
}
