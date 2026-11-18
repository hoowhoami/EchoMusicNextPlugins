// Folia a8da4437 (AGPL-3.0-only). See docs/folia/harmony-reference.md.
var CJK_REGEX = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/;
var isCJK = function (text) {
  return CJK_REGEX.test(text);
};
var normalizeWordColorToken = function (text) {
  return text.toLowerCase().replace(/[^\w]/g, '');
};
var resolveWordColorEntryText = function (entry) {
  if (!entry || typeof entry !== 'object' || !('word' in entry)) {
    return '';
  }
  var word = entry.word;
  return typeof word === 'string' ? word.trim() : '';
};
var resolveWordColorEntryColor = function (entry) {
  if (!entry || typeof entry !== 'object' || !('color' in entry)) {
    return '';
  }
  var color = entry.color;
  return typeof color === 'string' ? color : '';
};
var resolveWordColor = function (wordText, wordColors, fallbackColor, _a) {
  var _b = _a === void 0 ? {} : _a,
    _c = _b.keywordColoringEnabled,
    keywordColoringEnabled = _c === void 0 ? true : _c,
    _d = _b.cjkMatchMode,
    cjkMatchMode = _d === void 0 ? 'target-contains-token' : _d;
  if (!keywordColoringEnabled || !wordColors || wordColors.length === 0) {
    return fallbackColor;
  }
  var cleanCurrent = wordText.trim();
  if (!cleanCurrent) {
    return fallbackColor;
  }
  var matched = wordColors.find(function (entry) {
    var target = resolveWordColorEntryText(entry);
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
    var targetWords = target.split(/\s+/).map(normalizeWordColorToken).filter(Boolean);
    var normalizedCurrent = normalizeWordColorToken(cleanCurrent);
    return Boolean(normalizedCurrent) && targetWords.includes(normalizedCurrent);
  });
  return resolveWordColorEntryColor(matched) || fallbackColor;
};
export { resolveWordColor };
