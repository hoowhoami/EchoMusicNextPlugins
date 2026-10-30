// Folia a8da4437 VisualizerSubtitleOverlay, alternateText and playerBottomBarLayout (AGPL-3.0).
import { hasLetterOrNumber } from './text/unicode.mjs';

function tracksFor(line, mode) {
  if (!line || mode === 'none') return [];
  const roles = mode === 'both' ? ['romanization', 'translation'] : [mode];
  const tracks = [];
  for (const role of roles) {
    const direct = (line[role] || '').trim();
    const alternate = (line.alternateTexts || []).find(
      (entry) => entry.role === role && entry.text.trim()
    );
    const text = direct || (alternate ? alternate.text.trim() : '');
    if (hasLetterOrNumber(text) && !tracks.some((track) => track.text === text))
      tracks.push({ role, text });
  }
  return tracks;
}
export function resolveSubtitleContent(settings, activeLine, recentLine, nextLines) {
  if (settings.showText === false || settings.hideTranslationSubtitle === true)
    return { shouldRender: false, tracks: [], upcoming: [] };
  const mode =
    settings.subtitleContentMode ||
    (settings.showSubtitleTranslation === false ? 'none' : 'translation');
  let tracks = tracksFor(activeLine, mode);
  if (!tracks.length) tracks = tracksFor(recentLine, mode);
  return {
    shouldRender: true,
    tracks,
    upcoming:
      !tracks.length && activeLine
        ? (nextLines || []).filter((line) => hasLetterOrNumber(line.fullText))
        : [],
  };
}
export function subtitleGeometry(width, lyricScale, subtitleScale, bottomOffset, presence) {
  return {
    translation: subtitleSize(width, lyricScale, subtitleScale, false, 1),
    upcoming: subtitleSize(width, lyricScale, subtitleScale, true, 1),
    bottom: 32 + presence * (bottomOffset - 32 + 80),
  };
}
export function subtitleSize(width, lyricScale, subtitleScale, upcoming, factor, mode) {
  const values =
    mode === 'partita'
      ? upcoming
        ? [0.875, 1.8, 1]
        : [1.05, 2.2, 1.2]
      : mode === 'claddagh'
        ? upcoming
          ? [0.95, 1.8, 1.2]
          : [1.1, 2.2, 1.45]
        : upcoming
          ? [0.875, 2, 1]
          : [1.125, 2.6, 1.25];
  // Claddagh passes literal clamps; the other modes scale before overlay scaling.
  if (mode === 'claddagh') lyricScale = 1;
  // Folia serializes each CSS rem/vw component twice with toFixed(3).
  const scaled = (value) =>
    Number((Number((value * lyricScale).toFixed(3)) * subtitleScale * factor).toFixed(3));
  const minimum = scaled(values[0]) * 16;
  const preferred = (scaled(values[1]) * width) / 100;
  const maximum = scaled(values[2]) * 16;
  return Math.max(minimum, Math.min(maximum, preferred));
}
