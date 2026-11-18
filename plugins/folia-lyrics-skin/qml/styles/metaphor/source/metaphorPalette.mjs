// Copyright (c) 2026 chthollyphile. Derived from Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935; AGPL-3.0-only.
// Source: src/components/visualizer/metaphor/metaphorPalette.ts
import { parseColorChannels } from './colorMix.mjs';
const FALLBACK = {
  paper: [0.06, 0.06, 0.07],
  ink: [0.95, 0.94, 0.9],
  accent: [0.9, 0.3, 0.2],
  tone: [0.5, 0.5, 0.52],
};
const read = (color, fallback) => {
  const channels = parseColorChannels(color);
  return channels ? [channels.r / 255, channels.g / 255, channels.b / 255] : fallback;
};
const luma = (color) => 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
const mix = (from, to, amount) => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const awayFromPaper = (color, paper, ink, min) => {
  let out = color;
  for (let amount = 0.2; distance(out, paper) < min && amount <= 0.7; amount += 0.1)
    out = mix(color, ink, amount);
  return out;
};
const resolveMetaphorKeywordColor = (color, palette) => {
  const channels = parseColorChannels(color);
  if (!channels) return palette.accent;
  return awayFromPaper(
    [channels.r / 255, channels.g / 255, channels.b / 255],
    palette.paper,
    palette.ink,
    0.25,
  );
};
const resolveMetaphorPalette = (theme, flip = false) => {
  let paper = read(theme.backgroundColor, FALLBACK.paper);
  let ink = read(theme.primaryColor, FALLBACK.ink);
  if (Math.abs(luma(ink) - luma(paper)) < 0.18)
    ink = luma(paper) > 0.5 ? [0.08, 0.08, 0.09] : [0.95, 0.94, 0.9];
  if (flip) [paper, ink] = [ink, paper];
  const tone = awayFromPaper(read(theme.secondaryColor, FALLBACK.tone), paper, ink, 0.22);
  let accent = awayFromPaper(read(theme.accentColor, FALLBACK.accent), paper, ink, 0.25);
  if (distance(accent, ink) < 0.25) accent = mix(paper, ink, 0.42);
  return { paper, ink, accent, tone };
};
export { resolveMetaphorKeywordColor, resolveMetaphorPalette };
