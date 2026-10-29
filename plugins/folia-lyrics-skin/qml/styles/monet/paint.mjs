import { resolveMonetGlow, resolveMonetFillWidth } from './lyric-motion.mjs';
import {
  resolveMonetSweepEdgeSoftness,
  resolveMonetSweepEnd,
  resolveMonetWordStatus,
} from './model.mjs';
import { colorWithAlpha, mixColors, parseColorChannels } from '../cadenza/color.mjs';
export function rgba(value) {
  const channels = parseColorChannels(String(value));
  if (!channels) return null;
  const match = /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/.exec(String(value));
  return [channels.r / 255, channels.g / 255, channels.b / 255, match ? Number(match[1]) : 1];
}
export function wordFrame(
  fragment,
  status,
  baseColor,
  wordColor,
  time,
  lineEnd,
  fontPx,
  isChorus,
  staticPassed
) {
  const token = fragment.token;
  if (!token.timed) return { base: baseColor, fill: wordColor, end: 0, softness: 1, halos: [] };
  if (staticPassed) return { base: wordColor, fill: wordColor, end: 0, softness: 1, halos: [] };
  const active = status === 'active',
    wordStatus = active ? resolveMonetWordStatus(time, token.startTime, token.endTime) : status;
  const base = (active && wordStatus === 'passed') || status === 'passed' ? wordColor : baseColor;
  const progress =
    !active || time <= token.startTime
      ? 0
      : time >= token.endTime
        ? 1
        : (time - token.startTime) / Math.max(0.001, token.endTime - token.startTime);
  const fill = mixColors(baseColor, wordColor, Math.min(progress, 1));
  const width = active
    ? resolveMonetFillWidth(
        time,
        token.startTime,
        token.endTime,
        fragment.offsets,
        token.graphemeTimings
      )
    : 0;
  const softness = resolveMonetSweepEdgeSoftness(fontPx),
    full = fragment.offsets[fragment.offsets.length - 1] || 0,
    end = resolveMonetSweepEnd(width, full, softness);
  const glow =
    (status === 'active' || status === 'passed') && time > token.startTime
      ? resolveMonetGlow(time, token.startTime, token.endTime, lineEnd)
      : 0;
  const glowColor = mixColors(baseColor, wordColor, glow, glow * (isChorus ? 1 : 0.88));
  return {
    base,
    fill,
    end,
    softness,
    halos:
      glow > 0
        ? [
            {
              radius: Math.round(fontPx * (isChorus ? 0.45 : 0.28)) / 2,
              color: glowColor,
              opacity: 1,
            },
            {
              radius: Math.round(fontPx * (isChorus ? 0.9 : 0.65)) / 2,
              color: glowColor,
              opacity: 1,
            },
          ]
        : [],
  };
}
export function flattenRows(entry) {
  const result = [];
  for (const row of entry.rows) for (const fragment of row.fragments) result.push(fragment);
  return result;
}
