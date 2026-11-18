// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaChars.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
import { buildLineGraphemeTimeline } from '../../../shared/text/graphemeTiming.mjs';
import { getLineRenderEndTime } from './_shared/utils/lyrics/renderHints.mjs';
import { segmentLyricWords } from '../../lumiere/word-segmentation.mjs';
import {
  createVisualizerRng,
  hashVisualizerSeed,
} from './_shared/components/visualizer/visualizerSeedHash.mjs';
const ICON_PREFIX = 'icon:';
const isIconChar = (ch) => ch.startsWith(ICON_PREFIX);
const EMOJI_ICON = {
  '\u2764': 'Heart',
  '\u2665': 'Heart',
  '\u{1F497}': 'Heart',
  '\u2B50': 'Star',
  '\u2605': 'Star',
  '\u2606': 'Star',
  '\u{1F319}': 'Moon',
  '\u2600': 'Sun',
  '\u{1F31E}': 'Sun',
  '\u{1F3B5}': 'Music',
  '\u266A': 'Music2',
  '\u{1F3B6}': 'Music',
  '\u{1F338}': 'Flower',
  '\u273F': 'Flower2',
  '\u{1F337}': 'Flower2',
  '\u2728': 'Sparkles',
  '\u2601': 'Cloud',
  '\u{1F327}': 'CloudRain',
  '\u2602': 'Umbrella',
  '\u2614': 'Umbrella',
  '\u{1F431}': 'Cat',
  '\u{1F60A}': 'Smile',
  '\u{1F642}': 'Smile',
  '\u2744': 'Snowflake',
  '\u{1F343}': 'Leaf',
  '\u{1F33F}': 'Leaf',
  '\u{1FAB6}': 'Feather',
};
const NEBBIA_DEFAULT_DOODLES = [
  'Heart',
  'Star',
  'Moon',
  'Music',
  'Flower',
  'Sparkles',
  'CloudRain',
  'Umbrella',
  'Smile',
  'Leaf',
];
const collectEmojiIcons = (lines) => {
  const out = /* @__PURE__ */ new Set();
  for (const line of lines)
    for (const ch of line.fullText.replace(/[️‍]/g, '')) if (EMOJI_ICON[ch]) out.add(EMOJI_ICON[ch]);
  return [...out];
};
const toChar = (grapheme) => {
  const bare = grapheme.replace(/[️‍]/g, '');
  return EMOJI_ICON[bare] ? ICON_PREFIX + EMOJI_ICON[bare] : bare;
};
const groupWords = (line, graphemes, chars) => {
  const starts = [];
  let offset = 0;
  for (const g of graphemes) {
    starts.push(offset);
    offset += g.length;
  }
  const indexAt = (unit) => {
    let k = 0;
    while (k + 1 < starts.length && starts[k + 1] <= unit) k += 1;
    return k;
  };
  const words = [];
  for (const seg of segmentLyricWords(line)) {
    if (!seg.segment.trim()) continue;
    const from = indexAt(seg.index),
      to = indexAt(seg.index + seg.segment.length - 1);
    let run = [];
    for (let k = from; k <= to; k += 1) {
      if (!chars[k].ch.trim()) continue;
      if (isIconChar(chars[k].ch)) {
        if (run.length) words.push(run);
        words.push([k]);
        run = [];
      } else run.push(k);
    }
    if (run.length) words.push(run);
  }
  return words;
};
const buildNebbiaLines = (lines, seed, doodle, doodles) => {
  const base = hashVisualizerSeed(String(seed));
  return lines.map((line, index) => {
    var _a, _b;
    const timeline = buildLineGraphemeTimeline(line);
    const chars = timeline.map((g) => ({
      ch: toChar(g.char),
      t: g.startTime,
      d: Math.max(0, g.endTime - g.startTime),
    }));
    const words = groupWords(
      line,
      timeline.map((g) => g.char),
      chars,
    );
    const end = Math.max(line.startTime, getLineRenderEndTime(line));
    const next =
      (_b = (_a = lines[index + 1]) == null ? void 0 : _a.startTime) != null ? _b : Infinity;
    const rng = createVisualizerRng((base + Math.imul(index + 1, 977) + 31) >>> 0);
    const last = chars[chars.length - 1];
    if (last && doodles.length && !chars.some((c) => isIconChar(c.ch)) && rng() < doodle) {
      const at = last.t + last.d;
      chars.push(
        { ch: ' ', t: at, d: 0 },
        { ch: ICON_PREFIX + doodles[Math.floor(rng() * doodles.length)], t: at + 0.08, d: 1.1 },
      );
      words.push([chars.length - 1]);
    }
    return { chars, words, t: line.startTime, end, next };
  });
};
export { ICON_PREFIX, NEBBIA_DEFAULT_DOODLES, buildNebbiaLines, collectEmojiIcons, isIconChar };
