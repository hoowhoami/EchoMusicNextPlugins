// Derived from Folia a8da4437 (AGPL-3.0-only). See pendolo-reference.md.
import { resolveLyricSubtitleTracks } from './alternate-text.mjs';
import {
  SECONDARY_TRACK_FONT_WEIGHT_FALLBACK,
  SECONDARY_TRACK_GAP_EM,
  SECONDARY_TRACK_OPACITY,
  SECONDARY_TRACK_SIZE_FACTOR,
} from './subtitle-style.mjs';
const FOCAL_SUBTITLE_PX = 16;
const IDLE_SUBTITLE_PX = 12;
const LEAD_TRACK_GAP_EM = 0.25;
const LEAD_TRACK_FONT_WEIGHT_FALLBACK = 500;
const SUBTITLE_LINE_HEIGHT_RATIO = 1.5;
import { propertyTest } from '../cadenza/unicode-properties.mjs';
const READABLE_TEXT_PATTERN = propertyTest(['L', 'N']);
const isPendoloReadableSubtitle = (text) => READABLE_TEXT_PATTERN.test(text);
const resolvePendoloSubtitleTracks = (line, { mode, hidden, focal, subtitleFontScale }) => {
  if (hidden) {
    return [];
  }
  const basePx = (focal ? FOCAL_SUBTITLE_PX : IDLE_SUBTITLE_PX) * subtitleFontScale;
  return resolveLyricSubtitleTracks(line, mode, isPendoloReadableSubtitle).map((track, index) => {
    const isSecondary = index > 0;
    const fontPx = Math.round(isSecondary ? basePx * SECONDARY_TRACK_SIZE_FACTOR : basePx);
    return {
      role: track.role,
      text: track.text,
      fontPx,
      lineHeightPx: fontPx * SUBTITLE_LINE_HEIGHT_RATIO,
      fontWeightFallback: isSecondary
        ? SECONDARY_TRACK_FONT_WEIGHT_FALLBACK
        : LEAD_TRACK_FONT_WEIGHT_FALLBACK,
      gapEm: isSecondary ? SECONDARY_TRACK_GAP_EM : LEAD_TRACK_GAP_EM,
      opacityFactor: isSecondary ? SECONDARY_TRACK_OPACITY : 1,
    };
  });
};
const buildPendoloSubtitleFontSpec = (track, fontWeight, fontFamily) =>
  `${fontWeight} ${track.fontPx}px ${fontFamily}`;
const sumPendoloSubtitleTrackHeights = (tracks, measureText) => {
  let total = 0;
  for (const track of tracks) {
    total += measureText(track) + track.gapEm * track.fontPx;
  }
  return total;
};
export {
  buildPendoloSubtitleFontSpec,
  isPendoloReadableSubtitle,
  resolvePendoloSubtitleTracks,
  sumPendoloSubtitleTrackHeights,
};
