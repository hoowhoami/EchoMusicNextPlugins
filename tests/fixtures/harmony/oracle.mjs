// Independent unmodified Folia source math, a8da4437 AGPL-3.0-only. QA only.
// ../folia-major/src/utils/lyrics/alternateText.ts
var resolveSingleTrackSubtitleMode = (mode) => (mode === 'both' ? 'translation' : mode);
var findAlternateText = (alternateTexts, role) =>
  alternateTexts?.find((entry) => entry.role === role && entry.text.trim())?.text.trim() ?? null;
var resolveTrackText = (source, role) => {
  const directText = role === 'translation' ? source.translation : source.romanization;
  return directText?.trim() || findAlternateText(source.alternateTexts, role);
};
var resolveLyricAlternateText = (source, mode) => {
  const singleTrackMode = resolveSingleTrackSubtitleMode(mode);
  if (!source || singleTrackMode === 'none') {
    return null;
  }
  return resolveTrackText(source, singleTrackMode);
};
var resolveSubtitleContentMode = (mode, legacyShowTranslation = true) =>
  mode ?? (legacyShowTranslation ? 'translation' : 'none');

// ../folia-major/src/components/visualizer/harmonyRuntime.ts
var getLineBackgroundVocals = (line) => {
  if (!line) {
    return [];
  }
  if (line.backgroundVocals?.length) {
    return line.backgroundVocals;
  }
  return line.backgroundVocal ? [line.backgroundVocal] : [];
};
var getLyricsBackgroundVocals = (lines) =>
  lines
    .flatMap((line) => getLineBackgroundVocals(line))
    .sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime);
var resolveHarmonyAlternateText = (vocal, subtitleContentMode, legacyShowTranslation = true) =>
  resolveLyricAlternateText(
    vocal,
    resolveSubtitleContentMode(subtitleContentMode, legacyShowTranslation),
  );
var resolveWordStatus = (word, currentTime) => {
  if (currentTime < word.startTime) return 'waiting';
  if (currentTime <= word.endTime) return 'active';
  return 'passed';
};
var buildHarmonyTokens = (vocal, currentTime) => {
  if (vocal.words.length === 0) {
    return [{ key: 'full', text: vocal.text, status: 'active' }];
  }
  const tokens = [];
  let cursor = 0;
  vocal.words.forEach((word, index) => {
    const matchIndex = vocal.text.indexOf(word.text, cursor);
    if (matchIndex < 0) {
      return;
    }
    if (matchIndex > cursor) {
      tokens.push({
        key: `static-${cursor}`,
        text: vocal.text.slice(cursor, matchIndex),
        status: 'static',
      });
    }
    tokens.push({
      key: `word-${index}-${word.startTime}`,
      text: word.text,
      status: resolveWordStatus(word, currentTime),
    });
    cursor = matchIndex + word.text.length;
  });
  if (cursor < vocal.text.length) {
    tokens.push({
      key: `static-${cursor}`,
      text: vocal.text.slice(cursor),
      status: 'static',
    });
  }
  return tokens.length > 0 ? tokens : [{ key: 'full', text: vocal.text, status: 'active' }];
};
var resolveHarmonySnapshotFromVocals = (vocals, currentTime) => {
  const lines = vocals
    .filter(
      (vocal) =>
        vocal.text.trim() && currentTime >= vocal.startTime && currentTime <= vocal.endTime,
    )
    .sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime)
    .map((vocal, index) => ({
      key: `${vocal.startTime}-${vocal.endTime}-${vocal.text}-${index}`,
      vocal,
      tokens: buildHarmonyTokens(vocal, currentTime),
    }));
  const signature = lines
    .map((entry) => `${entry.key}:${entry.tokens.map((token) => token.status).join(',')}`)
    .join('|');
  return { signature, lines };
};
var resolveHarmonySnapshot = (line, currentTime) =>
  resolveHarmonySnapshotFromVocals(getLineBackgroundVocals(line), currentTime);

// ../folia-major/src/utils/lyrics/graphemeTiming.ts
var graphemeSegmenter =
  typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(void 0, { granularity: 'grapheme' })
    : null;
var splitLyricGraphemes = (text) => {
  if (!text) {
    return [];
  }
  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
};
var buildEvenGraphemeTimings = (text, startTime, endTime, wordIndex) => {
  const graphemes = splitLyricGraphemes(text);
  if (graphemes.length === 0) {
    return [];
  }
  const duration = Math.max(endTime - startTime, 0);
  const unitDuration = duration / graphemes.length;
  return graphemes.map((char, index) => ({
    char,
    startTime: startTime + unitDuration * index,
    endTime: index === graphemes.length - 1 ? endTime : startTime + unitDuration * (index + 1),
    ...(typeof wordIndex === 'number' ? { wordIndex } : {}),
  }));
};
var buildWordGraphemeTimings = (word, wordIndex) => {
  if (!word.syllables?.length) {
    return buildEvenGraphemeTimings(word.text, word.startTime, word.endTime, wordIndex);
  }
  return word.syllables.flatMap((syllable) =>
    buildEvenGraphemeTimings(syllable.text, syllable.startTime, syllable.endTime, wordIndex),
  );
};
var findGraphemeSequence = (source, target, fromIndex) => {
  if (target.length === 0) {
    return fromIndex;
  }
  for (let index = fromIndex; index <= source.length - target.length; index += 1) {
    let matched = true;
    for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
      if (source[index + targetIndex] !== target[targetIndex]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return index;
    }
  }
  return -1;
};
var buildLineGraphemeTimeline = (line) => {
  const lineGraphemes = splitLyricGraphemes(line.fullText);
  if (lineGraphemes.length === 0) {
    return [];
  }
  if (line.words.length === 0) {
    return buildEvenGraphemeTimings(line.fullText, line.startTime, line.endTime);
  }
  const timeline = [];
  let cursor = 0;
  let lastResolvedTime = line.startTime;
  line.words.forEach((word, wordIndex) => {
    const wordGraphemes = splitLyricGraphemes(word.text);
    if (wordGraphemes.length === 0) {
      return;
    }
    const matchedStart = findGraphemeSequence(lineGraphemes, wordGraphemes, cursor);
    const start = matchedStart >= 0 ? matchedStart : cursor;
    const end = Math.min(start + wordGraphemes.length, lineGraphemes.length);
    for (let gapIndex = cursor; gapIndex < start; gapIndex += 1) {
      timeline[gapIndex] = {
        char: lineGraphemes[gapIndex],
        startTime: word.startTime,
        endTime: word.startTime,
      };
    }
    const wordTimings = buildWordGraphemeTimings(word, wordIndex);
    for (let localIndex = 0; localIndex < end - start; localIndex += 1) {
      const timing =
        wordTimings[localIndex] ??
        buildEvenGraphemeTimings(
          wordGraphemes[localIndex] ?? '',
          word.startTime,
          word.endTime,
          wordIndex,
        )[0];
      if (!timing) {
        continue;
      }
      timeline[start + localIndex] = {
        ...timing,
        char: lineGraphemes[start + localIndex],
      };
      lastResolvedTime = Math.max(lastResolvedTime, timing.endTime);
    }
    cursor = Math.max(cursor, end);
  });
  for (let index = 0; index < lineGraphemes.length; index += 1) {
    if (timeline[index]) {
      continue;
    }
    timeline[index] = {
      char: lineGraphemes[index],
      startTime: lastResolvedTime,
      endTime: lastResolvedTime,
    };
  }
  return timeline;
};

// ../folia-major/src/components/visualizer/wordColoring.ts
var CJK_REGEX = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/;
var isCJK = (text) => CJK_REGEX.test(text);
var normalizeWordColorToken = (text) => text.toLowerCase().replace(/[^\w]/g, '');
var resolveWordColorEntryText = (entry) => {
  if (!entry || typeof entry !== 'object' || !('word' in entry)) {
    return '';
  }
  const word = entry.word;
  return typeof word === 'string' ? word.trim() : '';
};
var resolveWordColorEntryColor = (entry) => {
  if (!entry || typeof entry !== 'object' || !('color' in entry)) {
    return '';
  }
  const color = entry.color;
  return typeof color === 'string' ? color : '';
};
var resolveWordColor = (
  wordText,
  wordColors,
  fallbackColor,
  { keywordColoringEnabled = true, cjkMatchMode = 'target-contains-token' } = {},
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

// <stdin>
var buildHarmonyTextParts = (vocal) => {
  const parts = [];
  let cursor = 0;
  vocal.words.forEach((word, index) => {
    const matchIndex = vocal.text.indexOf(word.text, cursor);
    if (matchIndex < 0) {
      return;
    }
    if (matchIndex > cursor) {
      parts.push({ key: `static-${cursor}`, text: vocal.text.slice(cursor, matchIndex) });
    }
    parts.push({ key: `word-${index}-${word.startTime}`, text: word.text, word });
    cursor = matchIndex + word.text.length;
  });
  if (cursor < vocal.text.length) {
    parts.push({ key: `static-${cursor}`, text: vocal.text.slice(cursor) });
  }
  return parts.length > 0 ? parts : [{ key: 'full', text: vocal.text }];
};
function fillWidth(vocal, graphemeTimings, graphemeOffsets, latest) {
  const fullWidth = graphemeOffsets[graphemeOffsets.length - 1] ?? 0;
  if (latest <= vocal.startTime) return 0;
  if (latest >= vocal.endTime) return fullWidth;
  const timingCount = Math.min(graphemeTimings.length, graphemeOffsets.length - 1);
  for (let index = 0; index < timingCount; index += 1) {
    const timing = graphemeTimings[index];
    const start = Math.max(vocal.startTime, timing.startTime);
    const end = Math.max(start, timing.endTime);
    const startWidth = graphemeOffsets[index] ?? 0;
    const endWidth = graphemeOffsets[index + 1] ?? startWidth;
    if (latest < start) return startWidth;
    if (latest <= end) {
      return (
        startWidth + (endWidth - startWidth) * ((latest - start) / Math.max(1e-3, end - start))
      );
    }
  }
  return fullWidth;
}
export {
  buildHarmonyTextParts,
  buildLineGraphemeTimeline,
  fillWidth,
  getLineBackgroundVocals,
  getLyricsBackgroundVocals,
  resolveHarmonyAlternateText,
  resolveHarmonySnapshot,
  resolveHarmonySnapshotFromVocals,
  resolveWordColor,
};
