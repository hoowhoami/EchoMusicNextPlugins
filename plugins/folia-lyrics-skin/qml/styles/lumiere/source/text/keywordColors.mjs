// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { splitLyricGraphemes } from '../../../../shared/text/graphemeTiming.mjs';
import { parseColorChannels } from '../../../cadenza/color.mjs';
import {
  buildWordColorRangesFromMatchers,
  prepareWordColorMatchers,
  resolveTokenColorMap,
} from '../../../cadenza/word-coloring.mjs';
import { hexOf, mixRgb, scaleRgb, WHITE } from '../color.mjs';
const KEYWORD_MIX = {
  glyph: 0.6,
  halo: 0.75,
  star: 0.55,
  burst: 0.7,
  echo: 0.3,
};
const KEYWORD_STAR_WHITE = 0.35;
const KEYWORD_HALO_GAIN = 1.25;
const prepareLumiereKeywords = (wordColors, enabled) =>
  prepareWordColorMatchers(wordColors, enabled);
const parseRgb = (color) => {
  const channels = parseColorChannels(color);
  return channels ? [channels.r / 255, channels.g / 255, channels.b / 255] : null;
};
const resolveGlyphKeywordColors = (text, matchers) => {
  const graphemes = splitLyricGraphemes(text);
  const colors = graphemes.map(() => null);
  if (matchers.length === 0 || graphemes.length === 0) return colors;
  const ranges = buildWordColorRangesFromMatchers(text, [...matchers]);
  if (ranges.length === 0) return colors;
  let offset = 0;
  const tokens = graphemes.map((grapheme, index) => {
    const token = {
      key: String(index),
      timed: grapheme.trim().length > 0,
      startOffset: offset,
      endOffset: offset + grapheme.length,
    };
    offset += grapheme.length;
    return token;
  });
  const parsed = /* @__PURE__ */ new Map();
  resolveTokenColorMap(tokens, ranges).forEach((hex, key) => {
    var _a;
    if (!parsed.has(hex)) parsed.set(hex, parseRgb(hex));
    colors[Number(key)] = (_a = parsed.get(hex)) != null ? _a : null;
  });
  return colors;
};
const keywordLight = (light, keyword, amount) => {
  const keywordPeak = Math.max(keyword[0], keyword[1], keyword[2]);
  const hue = keywordPeak > 1e-4 ? scaleRgb(keyword, 1 / keywordPeak) : WHITE;
  const mixed = mixRgb(light, hue, amount);
  const peak = Math.max(mixed[0], mixed[1], mixed[2]);
  const target = Math.max(light[0], light[1], light[2]);
  return peak > 1e-4 ? scaleRgb(mixed, target / peak) : light;
};
const keywordTints = (light, keyword) => ({
  glyph: keywordLight(light, keyword, KEYWORD_MIX.glyph),
  halo: hexOf(keywordLight(light, keyword, KEYWORD_MIX.halo)),
  star: hexOf(mixRgb(keywordLight(light, keyword, KEYWORD_MIX.star), WHITE, KEYWORD_STAR_WHITE)),
});
const keywordBurstColor = (burstColor, light, keyword) =>
  mixRgb(burstColor, keywordLight(light, keyword, KEYWORD_MIX.burst), 0.8);
const keywordEchoColor = (light, keyword) => keywordLight(light, keyword, KEYWORD_MIX.echo);
export {
  KEYWORD_HALO_GAIN,
  KEYWORD_MIX,
  KEYWORD_STAR_WHITE,
  keywordBurstColor,
  keywordEchoColor,
  keywordLight,
  keywordTints,
  prepareLumiereKeywords,
  resolveGlyphKeywordColors,
};
