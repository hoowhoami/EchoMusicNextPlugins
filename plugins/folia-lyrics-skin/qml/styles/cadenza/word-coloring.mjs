// Generated from Folia a8da4437 (AGPL-3.0-only).
import { flatMap } from './compat.mjs';
const CJK_REGEX = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/;
const isCJK = (text) => CJK_REGEX.test(text);
const normalizeWordColorToken = (text) => text.toLowerCase().replace(/[^\w]/g, '');
const resolveWordColorEntryText = (entry) => {
  if (!entry || typeof entry !== 'object' || !('word' in entry)) {
    return '';
  }
  const word = entry.word;
  return typeof word === 'string' ? word.trim() : '';
};
const resolveWordColorEntryColor = (entry) => {
  if (!entry || typeof entry !== 'object' || !('color' in entry)) {
    return '';
  }
  const color = entry.color;
  return typeof color === 'string' ? color : '';
};
const rangesOverlap = (a, b) => a.startOffset < b.endOffset && b.startOffset < a.endOffset;
const selectNonOverlappingRanges = (ranges) => {
  const selected = [];
  const prioritySorted = [...ranges].sort(
    (a, b) => b.priority - a.priority || a.startOffset - b.startOffset || a.endOffset - b.endOffset
  );
  prioritySorted.forEach((range) => {
    if (!selected.some((current) => rangesOverlap(current, range))) {
      selected.push(range);
    }
  });
  return selected.sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset);
};
const prepareWordColorMatchers = (wordColors, keywordColoringEnabled = true) => {
  if (!keywordColoringEnabled || !wordColors || wordColors.length === 0) {
    return [];
  }
  return flatMap(wordColors, (entry) => {
    const target = resolveWordColorEntryText(entry);
    if (!target) {
      return [];
    }
    const color = resolveWordColorEntryColor(entry);
    if (!color) {
      return [];
    }
    if (isCJK(target)) {
      return [
        {
          color,
          cjkPhrases: [target],
          englishWords: [],
          priority: target.length,
        },
      ];
    }
    const englishWords = target.split(/\s+/).map(normalizeWordColorToken).filter(Boolean);
    if (englishWords.length === 0) {
      return [];
    }
    return [
      {
        color,
        cjkPhrases: [],
        englishWords,
        priority: Math.max(...englishWords.map((word) => word.length)),
      },
    ];
  });
};
const buildWordColorRangesFromMatchers = (lineText, matchers) => {
  if (!lineText || matchers.length === 0) {
    return [];
  }
  const ranges = [];
  const englishColorByWord = /* @__PURE__ */ new Map();
  matchers.forEach((matcher) => {
    matcher.cjkPhrases.forEach((target) => {
      let cursor = 0;
      while (cursor < lineText.length) {
        const startOffset = lineText.indexOf(target, cursor);
        if (startOffset < 0) {
          break;
        }
        ranges.push({
          startOffset,
          endOffset: startOffset + target.length,
          color: matcher.color,
          priority: matcher.priority,
        });
        cursor = startOffset + Math.max(target.length, 1);
      }
    });
    matcher.englishWords.forEach((word) => {
      const current = englishColorByWord.get(word);
      if (!current || matcher.priority > current.priority) {
        englishColorByWord.set(word, { color: matcher.color, priority: matcher.priority });
      }
    });
  });
  if (englishColorByWord.size > 0) {
    const wordRegex = /\w+/g;
    let match;
    while ((match = wordRegex.exec(lineText)) !== null) {
      const wordColor = englishColorByWord.get(normalizeWordColorToken(match[0]));
      if (wordColor) {
        ranges.push({
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          color: wordColor.color,
          priority: wordColor.priority,
        });
      }
    }
  }
  return selectNonOverlappingRanges(ranges);
};
const buildWordColorRanges = (lineText, wordColors, keywordColoringEnabled = true) =>
  buildWordColorRangesFromMatchers(
    lineText,
    prepareWordColorMatchers(wordColors, keywordColoringEnabled)
  );
const resolveWordColor = (
  wordText,
  wordColors,
  fallbackColor,
  { keywordColoringEnabled = true, cjkMatchMode = 'target-contains-token' } = {}
) => {
  if (!keywordColoringEnabled || !wordColors || wordColors.length === 0) {
    return fallbackColor;
  }
  const cleanCurrent = wordText.trim();
  if (!cleanCurrent) {
    return fallbackColor;
  }
  const matched = wordColors.find((entry) => {
    const target = resolveWordColorEntryText(entry);
    if (!target) {
      return false;
    }
    if (isCJK(cleanCurrent)) {
      if (cjkMatchMode === 'exact') {
        return target === cleanCurrent;
      }
      if (cjkMatchMode === 'bidirectional-contains') {
        return target.includes(cleanCurrent) || cleanCurrent.includes(target);
      }
      return target.includes(cleanCurrent);
    }
    const targetWords = target.split(/\s+/).map(normalizeWordColorToken).filter(Boolean);
    const normalizedCurrent = normalizeWordColorToken(cleanCurrent);
    return Boolean(normalizedCurrent) && targetWords.includes(normalizedCurrent);
  });
  return resolveWordColorEntryColor(matched) || fallbackColor;
};
const resolveTokenColorMap = (tokens, ranges) => {
  const colors = /* @__PURE__ */ new Map();
  let rangeIndex = 0;
  tokens.forEach((token) => {
    if (!token.timed) {
      return;
    }
    while (rangeIndex < ranges.length && ranges[rangeIndex].endOffset <= token.startOffset) {
      rangeIndex += 1;
    }
    const range = ranges[rangeIndex];
    if (range && rangesOverlap(range, token)) {
      colors.set(token.key, range.color);
    }
  });
  return colors;
};
export {
  buildWordColorRanges,
  buildWordColorRangesFromMatchers,
  prepareWordColorMatchers,
  resolveTokenColorMap,
  resolveWordColor,
};
