// Source composition adaptation; Folia a8da4437 AGPL-3.0-only.
import {
  resolveMonetLargeScreenScale,
  resolveClampFontPx,
  configureViewport,
  resolveMonetLineStatus,
} from './model.mjs';
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const number = (v, f) => (Number.isFinite(v) ? v : f);
export function settings(v) {
  v = v || {};
  const subtitleWeight =
    v.subtitleFontInheritsLyrics === false ? v.subtitleFontWeight : v.fontWeight;
  return {
    showText: v.showText !== false,
    keywordColoringEnabled: v.monetKeywordColoringEnabled !== false,
    showDescription: v.monetShowDescription !== false,
    showAudioVisualization: v.monetShowAudioVisualization !== false,
    audioStyle: v.monetAudioStyle === 'line' ? 'line' : 'bar',
    fontScale: clamp(number(v.monetFontScale, 1.2), 0.7, 1.5) * number(v.lyricsFontScale, 1),
    portraitSource: v.monetPortraitSource === 'custom' ? 'custom' : 'cover',
    portraitOffsetX: clamp(number(v.monetPortraitOffsetX, 0), -150, 0),
    portraitStyle: v.monetPortraitStyle === 'rectangular' ? 'rectangular' : 'square',
    showPortraitDragHanger: v.monetShowPortraitDragHanger !== false,
    fontWeight:
      v.fontWeight === null || v.fontWeight === undefined
        ? 600
        : clamp(Math.round(number(v.fontWeight, 600) / 10) * 10, 100, 900),
    subtitleFontWeight:
      subtitleWeight === null || subtitleWeight === undefined
        ? 500
        : clamp(Math.round(number(subtitleWeight, 500) / 10) * 10, 100, 900),
    secondarySubtitleFontWeight:
      subtitleWeight === null || subtitleWeight === undefined
        ? 400
        : clamp(Math.round(number(subtitleWeight, 400) / 10) * 10, 100, 900),
    subtitleFontScale: number(v.subtitleFontScale, 1),
    subtitleContentMode:
      ['translation', 'romanization', 'both', 'none'].indexOf(v.subtitleContentMode) >= 0
        ? v.subtitleContentMode
        : v.showSubtitleTranslation === false
          ? 'none'
          : 'translation',
    animationIntensity: v.animationIntensity || 'normal',
  };
}
export function composition(width, height, v) {
  const t = settings(v);
  configureViewport(width);
  const scale = resolveMonetLargeScreenScale(width),
    font = resolveClampFontPx(1.34, 2.75, 2.28) * t.fontScale * scale,
    inactive = resolveClampFontPx(1.08, 2, 1.48) * t.fontScale * scale,
    translation = resolveClampFontPx(0.94, 1.28, 1.14) * t.fontScale * t.subtitleFontScale * scale;
  const rowWidth = Math.min(width, Math.round(1520 * scale)),
    portraitVisible = width >= 768,
    portraitColumn = portraitVisible ? clamp(width * 0.28, 220, Math.round(430 * scale)) : 0,
    portraitPaddingRight = width >= 1280 ? 48 : width >= 1024 ? 40 : width >= 640 ? 32 : 20,
    textPadding = width >= 1536 ? 80 : width >= 1024 ? 56 : width >= 640 ? 32 : 20,
    portraitPaddingLeft = 12,
    portraitInner = portraitVisible
      ? Math.min(
          Math.max(0, portraitColumn - portraitPaddingLeft - portraitPaddingRight),
          clamp(width * 0.26, 210, Math.round(380 * scale))
        )
      : 0;
  const contentWidth = Math.max(1, rowWidth - portraitColumn - 2 * textPadding),
    glow = Math.round(font * 1.2),
    railWidth = Math.min(Math.round(780 * scale), contentWidth + 2 * glow),
    railHeight = clamp(height * 0.52, 280, Math.round(Math.max(520 * scale, font * 1.18 * 7)));
  const bleed =
    t.portraitStyle === 'square'
      ? Math.max(0, 0.35135 * clamp(width * 0.26, 210, Math.round(380 * scale)) - 48)
      : 0;
  return {
    scale,
    rowWidth,
    rowX: (width - rowWidth) / 2,
    portraitVisible,
    portraitColumn,
    portraitPaddingRight,
    portraitInner,
    textPadding,
    contentWidth,
    glow,
    railWidth,
    railHeight,
    fontPx: font,
    inactiveFontPx: inactive,
    translationFontPx: translation,
    headerMaxWidth: Math.max(192, contentWidth - bleed - Math.abs(Math.min(0, t.portraitOffsetX))),
    titleFontPx: clamp(width * 0.033, 23.2, 44.8 * scale),
    artistFontPx: clamp(width * 0.018, 16, 28.8 * scale),
  };
}
export function metadataIndex(rows) {
  const positions = Object.create(null);
  for (let i = 0; i < rows.length; i++) positions[rows[i].sourceIndex] = i;
  return { rows, positions };
}
export function select(metadata, prepared, current, time, manual, catalog) {
  const rows =
    metadata && metadata.length
      ? metadata
      : prepared
          .map((p, index) =>
            p
              ? {
                  sourceIndex: index,
                  startTime: p.line.startTime,
                  endTime: p.line.endTime,
                  renderEndTime: p.line.renderHints
                    ? p.line.renderHints.renderEndTime
                    : p.line.endTime,
                }
              : null
          )
          .filter(Boolean);
  const index = catalog && catalog.rows === rows ? catalog : metadataIndex(rows);
  const found = index.positions[current];
  let active = found === undefined ? -1 : found,
    upcoming = -1,
    recent = -1;
  if (active < 0) {
    let low = 0,
      high = rows.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (rows[mid].startTime <= time) low = mid + 1;
      else high = mid;
    }
    upcoming = low < rows.length ? low : -1;
    for (let i = low - 1; i >= 0; i--)
      if ((rows[i].renderEndTime === undefined ? rows[i].endTime : rows[i].renderEndTime) < time) {
        recent = i;
        break;
      }
  }
  let anchor =
    manual === null || manual === undefined
      ? active >= 0
        ? active
        : upcoming >= 0
          ? upcoming
          : recent
      : clamp(Math.round(manual), 0, rows.length - 1);
  if (anchor < 0 || !rows.length)
    return { anchor: -1, required: [], entries: [], count: rows.length };
  const radius = manual === null || manual === undefined ? 2 : 4,
    required = [],
    entries = [];
  for (let p = Math.max(0, anchor - radius); p <= Math.min(rows.length - 1, anchor + radius); p++) {
    const m = rows[p],
      index = m.sourceIndex;
    required.push(index);
    const held = prepared[index];
    if (!held) continue;
    const status =
      manual !== null && manual !== undefined
        ? index === current
          ? 'active'
          : active >= 0 && p < active
            ? 'passed'
            : 'waiting'
        : resolveMonetLineStatus(held.line, index, current, time);
    entries.push({
      key: index + '-' + held.line.startTime + '-' + held.line.fullText,
      index,
      position: p,
      offset: p - anchor,
      status,
      line: held.line,
    });
  }
  return { anchor, required, entries, count: rows.length };
}
export function sourcePortrait(tuning, cover, custom) {
  const url = custom && custom.length ? String(custom[0].url || '') : '';
  return tuning.portraitSource === 'custom'
    ? url || String(cover || '')
    : String(cover || '') || url;
}

// Framer Motion easeInOut [0.42,0,0.58,1], independently per equally spaced keyframe.
export function easeInOut(value) {
  value = clamp(value, 0, 1);
  let low = 0,
    high = 1;
  for (let i = 0; i < 18; i++) {
    const t = (low + high) / 2,
      one = 1 - t,
      x = 3 * one * one * t * 0.42 + 3 * one * t * t * 0.58 + t * t * t;
    if (x < value) low = t;
    else high = t;
  }
  const t = (low + high) / 2;
  return 3 * (1 - t) * t * t + t * t * t;
}
export function keyframe(values, seconds, duration, delay) {
  if (seconds <= delay) return values[0];
  const p = (((seconds - delay) % duration) / duration) * (values.length - 1),
    index = Math.min(values.length - 2, Math.floor(p)),
    amount = easeInOut(p - index);
  return values[index] + (values[index + 1] - values[index]) * amount;
}
