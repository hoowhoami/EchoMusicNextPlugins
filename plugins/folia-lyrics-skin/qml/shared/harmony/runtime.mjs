// Folia a8da4437 (AGPL-3.0-only). See docs/folia/harmony-reference.md.
import { flatMap } from '../text/compat.mjs';
import { resolveLyricAlternateText, resolveSubtitleContentMode } from './alternate-text.mjs';
const getLineBackgroundVocals = (line) => {
  var _a;
  if (!line) {
    return [];
  }
  if ((_a = line.backgroundVocals) == null ? void 0 : _a.length) {
    return line.backgroundVocals;
  }
  return line.backgroundVocal ? [line.backgroundVocal] : [];
};
const getLyricsBackgroundVocals = (lines) =>
  flatMap(lines, (line) => getLineBackgroundVocals(line)).sort(
    (left, right) => left.startTime - right.startTime || left.endTime - right.endTime
  );
const resolveHarmonyAlternateText = (vocal, subtitleContentMode, legacyShowTranslation = true) =>
  resolveLyricAlternateText(
    vocal,
    resolveSubtitleContentMode(subtitleContentMode, legacyShowTranslation)
  );
const resolveWordStatus = (word, currentTime) => {
  if (currentTime < word.startTime) return 'waiting';
  if (currentTime <= word.endTime) return 'active';
  return 'passed';
};
const buildHarmonyTokens = (vocal, currentTime) => {
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
const resolveHarmonySnapshotFromVocals = (vocals, currentTime) => {
  const lines = vocals
    .filter(
      (vocal) => vocal.text.trim() && currentTime >= vocal.startTime && currentTime <= vocal.endTime
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
const resolveHarmonySnapshot = (line, currentTime) =>
  resolveHarmonySnapshotFromVocals(getLineBackgroundVocals(line), currentTime);
export {
  getLineBackgroundVocals,
  getLyricsBackgroundVocals,
  resolveHarmonyAlternateText,
  resolveHarmonySnapshot,
  resolveHarmonySnapshotFromVocals,
};
