// Folia a8da4437 partitaLayout.ts (AGPL-3.0-only). Stable chunk configs precede native shaping.
import {
  buildDisplayWordsFromLayoutUnits,
  buildPostLyricLayoutUnits,
} from '../../shared/text/cjkSemanticLayout.mjs';
import { getWordSegmentationKey } from '../../shared/text/wordSegmentation.mjs';
import { splitLyricGraphemes } from '../../shared/text/graphemeTiming.mjs';
import { flatMap } from '../../shared/text/compat.mjs';
import { resolveWordColor } from '../classic/layout.mjs';
const DEFAULT_PARTITA_TUNING = {
  showGuideLines: true,
  useSemanticLayout: true,
  staggerMin: 20,
  staggerMax: 100,
};
function rememberBounded(cache, key, value, limit) {
  if (!cache.has(key) && cache.size >= limit) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, value);
  return value;
}
const EMPTY_PARTITA_LAYOUT = {
  columns: [],
  totalGraphemes: 0,
  lineConfig: {
    perspective: 1e3,
    justifyContent: 'justify-center',
    alignItems: 'items-center',
    columnGap: '1.6rem',
  },
};
const PARTITA_LAYOUT_CACHE_LIMIT = 48;
const PARTITA_WORD_LAYOUT_STYLE = { marginRight: '0.8rem' };
const PARTITA_PREHEAT_WINDOW = {
  minLead: 0.18,
  maxLead: 1.2,
};
const isCJK = (text) => /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(text);
const splitGraphemes = splitLyricGraphemes;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clampPartitaStagger = (value, fallback) =>
  Number.isFinite(value) ? clamp(value, 0, 180) : fallback;
const resolvePartitaTuning = (tuning) => {
  var _a, _b, _c, _d;
  const rawMin = clampPartitaStagger(
    (_a = tuning == null ? void 0 : tuning.staggerMin) != null
      ? _a
      : DEFAULT_PARTITA_TUNING.staggerMin,
    DEFAULT_PARTITA_TUNING.staggerMin
  );
  const rawMax = clampPartitaStagger(
    (_b = tuning == null ? void 0 : tuning.staggerMax) != null
      ? _b
      : DEFAULT_PARTITA_TUNING.staggerMax,
    DEFAULT_PARTITA_TUNING.staggerMax
  );
  return {
    showGuideLines:
      (_c = tuning == null ? void 0 : tuning.showGuideLines) != null
        ? _c
        : DEFAULT_PARTITA_TUNING.showGuideLines,
    useSemanticLayout:
      (_d = tuning == null ? void 0 : tuning.useSemanticLayout) != null
        ? _d
        : DEFAULT_PARTITA_TUNING.useSemanticLayout,
    staggerMin: Math.min(rawMin, rawMax),
    staggerMax: Math.max(rawMin, rawMax),
  };
};
const getActiveColor = (wordText, theme) => {
  return resolveWordColor(wordText, theme.wordColors, theme.accentColor);
};
const getTargetColumnCount = (totalGraphemes, wordCount) => {
  if (wordCount <= 2 || totalGraphemes <= 5) return 1;
  if (totalGraphemes <= 10) return 2;
  if (totalGraphemes <= 16) return 3;
  if (totalGraphemes <= 24) return 4;
  return 5;
};
const buildSequentialColumns = (line, theme, windowHeight, tuning) => {
  const intensity = theme.animationIntensity;
  const isChaotic = intensity === 'chaotic';
  const isCalm = intensity === 'calm';
  const totalGraphemes = Math.max(
    splitGraphemes(line.fullText.replace(/\s+/g, '')).length,
    line.words.length,
    1
  );
  const layoutUnits = buildPostLyricLayoutUnits(line, {
    semantic: tuning.useSemanticLayout,
    sticky: true,
  });
  const columns = [];
  let currentWords = [];
  const baseRowHeight = 100;
  const availableHeight = windowHeight * 0.65;
  const targetRowCount = Math.max(1, Math.floor(availableHeight / baseRowHeight));
  const actualRowCount = Math.min(layoutUnits.length, targetRowCount);
  let seed = line.startTime;
  const random = () => {
    const x = Math.sin(seed++) * 1e4;
    return x - Math.floor(x);
  };
  const chunks = [];
  let remainingUnits = layoutUnits.length;
  let remainingChunks = actualRowCount;
  let unitIndex = 0;
  for (let c = 0; c < actualRowCount; c++) {
    const isLastChunk = c === actualRowCount - 1;
    const avg = remainingUnits / remainingChunks;
    let chunkLength = 1;
    if (isLastChunk) {
      chunkLength = remainingUnits;
    } else {
      const max = Math.ceil(avg * 1.5);
      const min = 1;
      const randVal = random();
      chunkLength = Math.max(min, Math.min(max, Math.round(avg + (randVal - 0.5) * avg)));
    }
    chunkLength = Math.max(1, Math.min(chunkLength, remainingUnits - (remainingChunks - 1)));
    chunks.push(layoutUnits.slice(unitIndex, unitIndex + chunkLength));
    unitIndex += chunkLength;
    remainingUnits -= chunkLength;
    remainingChunks--;
  }
  chunks.forEach((chunkUnits, rowIndex) => {
    const chunkWords = flatMap(chunkUnits, (unit) => unit.words);
    const displayWords = buildDisplayWordsFromLayoutUnits(chunkUnits);
    if (chunkWords.length === 0) return;
    const mergedTextForConfig = chunkWords.map((w) => w.text.trim()).join('');
    const graphemeCount = splitGraphemes(mergedTextForConfig.replace(/\s+/g, '')).length;
    const rowBias = rowIndex - (actualRowCount - 1) / 2;
    const isStaggeredLeft = rowIndex % 2 === 0;
    const staggerMagnitude =
      tuning.staggerMin + random() * Math.max(tuning.staggerMax - tuning.staggerMin, 0);
    const staggerX = isStaggeredLeft ? -staggerMagnitude : staggerMagnitude;
    const staggerScale = isCalm ? 1 : 0.8 + random() * 0.9;
    currentWords.push({
      chunkUnits,
      chunkWords,
      displayWords,
      order: rowIndex,
      rowIndex,
      config: {
        id: `${rowIndex}-${chunkWords[0].startTime}`,
        x: staggerX,
        y: isCalm ? 0 : rowBias * 2.5,
        rotate: isChaotic ? (isStaggeredLeft ? -3 : 3) : 0,
        scale: (isChaotic ? 1 + Math.min(graphemeCount * 0.01, 0.05) : 1) * staggerScale,
        marginBottom: isChaotic ? '0.4rem' : '0.6rem',
        alignSelf: 'center',
        passedRotate: (rowIndex % 2 === 0 ? 1 : -1) * (isChaotic ? 6 : 3),
      },
    });
  });
  if (currentWords.length > 0) {
    columns.push({
      id: `column-${line.startTime}-0`,
      words: currentWords,
    });
  }
  return {
    columns,
    totalGraphemes,
    lineConfig: {
      perspective: theme.animationIntensity === 'chaotic' ? 720 : 1e3,
      alignItems: 'items-center',
      justifyContent: 'justify-center',
      columnGap: '2rem',
    },
  };
};
const buildPartitaLayoutCacheKey = (line, theme, windowHeight, tuning) => {
  var _a;
  const windowHeightBucket = Math.round(windowHeight / 24);
  return [
    'semantic-layout-v1',
    line.startTime,
    line.endTime,
    line.words.length,
    line.fullText,
    // The saved split feeds buildPostLyricLayoutUnits below, so it changes the columns. The
    // cache outlives a re-segmentation of the song playing (it is only bounded by its LRU),
    // so without this a line already on screen kept the layout built from the old split.
    getWordSegmentationKey(line),
    theme.animationIntensity,
    (_a = theme.fontWeight) != null ? _a : 'auto',
    windowHeightBucket,
    tuning.staggerMin,
    tuning.staggerMax,
    tuning.showGuideLines ? 1 : 0,
    tuning.useSemanticLayout ? 1 : 0,
  ].join('|');
};
const getOrBuildPartitaLayout = (cache, line, theme, windowHeight, tuning) => {
  const cacheKey = buildPartitaLayoutCacheKey(line, theme, windowHeight, tuning);
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const layout = buildSequentialColumns(line, theme, windowHeight, tuning);
  return rememberBounded(cache, cacheKey, layout, PARTITA_LAYOUT_CACHE_LIMIT);
};
export {
  EMPTY_PARTITA_LAYOUT,
  PARTITA_PREHEAT_WINDOW,
  PARTITA_WORD_LAYOUT_STYLE,
  buildPartitaLayoutCacheKey,
  getActiveColor,
  getOrBuildPartitaLayout,
  resolvePartitaTuning,
};

export function resolveSettings(settings) {
  const value = settings || {};
  const tuning = resolvePartitaTuning({
    showGuideLines: value.partitaShowGuideLines,
    useSemanticLayout: value.partitaUseSemanticLayout,
    staggerMin: value.partitaStaggerMin,
    staggerMax: value.partitaStaggerMax,
  });
  return Object.assign(tuning, {
    lyricsFontScale:
      Number.isFinite(value.lyricsFontScale) && value.lyricsFontScale > 0
        ? value.lyricsFontScale
        : 1,
    animationIntensity:
      ['calm', 'normal', 'chaotic'].indexOf(value.animationIntensity) >= 0
        ? value.animationIntensity
        : 'normal',
    fontWeight: Number.isFinite(value.fontWeight)
      ? Math.round(Math.max(100, Math.min(900, value.fontWeight)) / 10) * 10
      : null,
    // Configuration QVariantLists are Qt sequences, not Array.isArray arrays.
    wordColors: Array.isArray(value.wordColors)
      ? value.wordColors
      : JSON.parse(JSON.stringify(value.wordColors || [])),
  });
}
export function fontSize(width, total, scale) {
  const density = total > 40 ? 0.8 : 1;
  return Math.max(
    Number((2.5 * density * scale).toFixed(3)) * 16,
    Math.min(
      Number((4.5 * density * scale).toFixed(3)) * 16,
      (Number((5.5 * density * scale).toFixed(3)) * width) / 100
    )
  );
}
export function emptyFontSize(width, scale) {
  return Math.max(
    Number((1.2 * scale).toFixed(3)) * 16,
    Math.min(
      Number((1.9 * scale).toFixed(3)) * 16,
      (Number((2.8 * scale).toFixed(3)) * width) / 100
    )
  );
}
export function shouldPreheat(start, time) {
  const lead = start - time;
  return lead >= 0.18 && lead <= 1.2;
}
export function wordConfigs(words, config, intensity) {
  return words.map((word, index) => {
    const seed = words[0].startTime + index * 7.13;
    const random = (offset) => {
      const value = Math.sin(seed + offset) * 10000;
      return value - Math.floor(value);
    };
    const spread = intensity === 'chaotic' ? 15 : intensity === 'calm' ? 0 : 6;
    const rotate = intensity === 'chaotic' ? 8 : intensity === 'calm' ? 0 : 3;
    return {
      id: config.id + '-w' + index,
      x: (random(1) - 0.5) * spread * 2,
      y: (random(2) - 0.5) * spread * 2,
      rotate: (random(3) - 0.5) * rotate * 2,
      scale: config.scale,
      marginBottom: '0',
      alignSelf: 'auto',
      passedRotate: (random(8) - 0.5) * 20,
    };
  });
}
export function chunkGeometry(metrics, pixelSize) {
  let x = 8;
  const height = pixelSize * 1.22 + 6.4;
  const words = metrics.map((metric) => {
    const position = { x, y: (pixelSize * 1.22 - metric.height) / 2 + 3.2 };
    x += metric.width + 12.8;
    return position;
  });
  return { width: x + 8, height, words };
}
export function columnGeometry(rows, metrics, pixelSize) {
  const chunks = rows.map((row, index) => chunkGeometry(metrics[index] || [], pixelSize));
  const width = Math.max(60.8, ...chunks.map((chunk) => chunk.width + 24));
  let height = 0;
  for (let index = 0; index < chunks.length; index++) {
    const item = chunks[index];
    item.x = (width - item.width) / 2;
    item.y = height;
    height += item.height + (rows[index].config.marginBottom === '0.4rem' ? 6.4 : 9.6);
  }
  return { width, height, chunks };
}
export function guideGeometry(width, height, right) {
  return {
    vertical: { x: right ? width + 7 : -8, y: height - 16, width: 1, height: 32 },
    horizontal: { x: right ? -20 : -16, y: height + 7, width: width + 36, height: 1 },
  };
}
