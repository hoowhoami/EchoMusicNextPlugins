// Qt boundary for Folia a8da4437 Pendolo. Angles/time remain source units.
import { defaults } from './defaults.mjs';
const clamp = (v, f, min, max) => (Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : f);
export function resolveSettings(settings) {
  const s = settings || {},
    t = Object.assign({}, defaults);
  for (const [key, min, max] of [
    ['arcRadius', 0.25, 0.8],
    ['arcAngleDeg', 40, 160],
    ['wheelCenterX', -0.3, 0.5],
    ['wheelCenterY', 0.2, 0.8],
    ['tickSnappiness', 0.5, 2],
    ['activeScale', 1, 1.6],
  ])
    t[key] = clamp(s['pendolo' + key[0].toUpperCase() + key.slice(1)], t[key], min, max);
  for (const key of ['showCenterGradient', 'showCoverOnWatchFace', 'enableLineGlow'])
    if (typeof s['pendolo' + key[0].toUpperCase() + key.slice(1)] === 'boolean')
      t[key] = s['pendolo' + key[0].toUpperCase() + key.slice(1)];
  if (['none', 'subtle', 'full'].includes(s.pendoloShowGearDecor))
    t.showGearDecor = s.pendoloShowGearDecor;
  const subtitleWeight =
    s.subtitleFontInheritsLyrics === false ? s.subtitleFontWeight : s.fontWeight;
  return {
    tuning: t,
    fontWeight: clamp(s.fontWeight, 400, 100, 900),
    lyricsFontScale: clamp(s.lyricsFontScale, 1, 0.5, 3),
    subtitleFontScale: clamp(s.subtitleFontScale, 1, 0.5, 3),
    subtitleFontWeight: Number.isFinite(subtitleWeight)
      ? clamp(subtitleWeight, 500, 100, 900)
      : null,
    subtitleContentMode: s.subtitleContentMode || 'translation',
    hideTranslationSubtitle: s.hideTranslationSubtitle === true,
    animationIntensity: s.animationIntensity || 'normal',
  };
}
export function positionFor(metadata, sourceIndex) {
  let lo = 0,
    hi = metadata.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (metadata[mid].sourceIndex < sourceIndex) lo = mid + 1;
    else hi = mid;
  }
  return lo < metadata.length && metadata[lo].sourceIndex === sourceIndex ? lo : -1;
}
export function windowIndices(metadata, sourceIndex) {
  return windowAt(metadata, positionFor(metadata, sourceIndex));
}
export function windowAt(metadata, target) {
  const center = Math.max(0, Math.min(metadata.length - 1, Math.floor(target >= 0 ? target : 0)));
  return metadata
    .slice(Math.max(0, center - 10), Math.min(metadata.length, center + 11))
    .map((v) => v.sourceIndex);
}
export function scrollState() {
  return { accumulator: 0, direction: 0 };
}
export function scroll(state, delta, step) {
  const direction = Math.abs(delta) < 1 ? 0 : delta > 0 ? 1 : -1;
  if (direction && state.direction && direction !== state.direction) state.accumulator = 0;
  state.direction = direction || state.direction;
  state.accumulator += delta;
  const steps = Math.max(-5, Math.min(5, Math.trunc(state.accumulator / step)));
  if (steps) state.accumulator = 0;
  return steps || 0;
}
export function geometry(width, height, tuning) {
  const radius = Math.min(width, height) * tuning.arcRadius;
  return {
    centerX: width * tuning.wheelCenterX,
    centerY: height * tuning.wheelCenterY,
    baseRadius: radius,
    lyricRingRadius: radius + Math.min(width, height) * 0.06,
    availableTextWidth: Math.max(
      140,
      Math.min(width * 0.46, width - width * tuning.wheelCenterX - radius - 48)
    ),
    angleStep: (tuning.arcAngleDeg * Math.PI) / 180 / 8,
  };
}
export function fillWidth(timings, offsets, time, end) {
  const full = offsets[offsets.length - 1] || 0;
  if (!timings.length) return time >= end ? full : 0;
  if (time <= timings[0].startTime) return 0;
  for (let i = 0; i < timings.length; i++) {
    const timing = timings[i],
      a = offsets[i] || 0,
      b = offsets[i + 1] === undefined ? a : offsets[i + 1];
    if (time < timing.startTime) return a;
    if (time <= timing.endTime)
      return (
        a +
        ((b - a) * (time - timing.startTime)) / Math.max(0.001, timing.endTime - timing.startTime)
      );
  }
  return full;
}
export function sweepMask(fontPx, fill) {
  const soft = Math.min(Math.max(fontPx * 0.42, 8), 16);
  return { start: Math.max(fill - soft, 0), crest: fill, end: fill + soft };
}
export function nativeColors(runs) {
  return runs.map((run) => {
    const m = /rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/.exec(run.color);
    return m ? { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a: +m[4] } : run.color;
  });
}
export function paintRows(lines, lineHeight, blockHeight, viewportHeight) {
  const reach = Math.max(256, viewportHeight * 1.7);
  const first = Math.max(0, Math.floor((blockHeight / 2 - reach) / lineHeight));
  const last = Math.min(lines.length, Math.ceil((blockHeight / 2 + reach) / lineHeight));
  return lines
    .slice(first, last)
    .map((line, i) => Object.assign({}, line, { rowIndex: first + i }));
}

export function packPrepared(sourceIndex, position, prepared) {
  const input = prepared.line,
    line = {};
  for (const key of [
    'id',
    'fullText',
    'startTime',
    'endTime',
    'renderEndTime',
    'translation',
    'romanization',
    'isChorus',
  ])
    if (input[key] !== undefined) line[key] = input[key];
  return { sourceIndex, position, prepared: { line, timeline: prepared.timeline || [] } };
}
