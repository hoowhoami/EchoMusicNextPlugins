// Folia a8da4437 sentenceLayout.ts (AGPL-3.0-only). Raw fragment segmentation is injected.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
const CJK_REGEX = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/;
const WESTERN_WORD_REGEX = /[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*/;
const hasCjkText = (text) => CJK_REGEX.test(text);
function findRegexMatch(regex, text, fromIndex = 0) {
  regex.lastIndex = fromIndex;
  const match = regex.exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}
function findStringMatch(str, text, fromIndex = 0) {
  const idx = text.indexOf(str, fromIndex);
  return idx === -1 ? null : { start: idx, end: idx + str.length };
}
const _SentenceLayout = class _SentenceLayout {
  constructor(text) {
    __publicField(this, 'text');
    __publicField(this, 'words', []);
    __publicField(this, 'startTime', 0);
    __publicField(this, 'endTime', 0);
    __publicField(this, 'isSemantic', true);
    this.text = text;
  }
  static splitIntoSentences(text, targetCount, timeSeed, fragmentSegmenter) {
    if (targetCount <= 1 && targetCount >= 0) {
      return [new _SentenceLayout(text)];
    }
    const maxLevel =
      targetCount === -1
        ? 1
        : targetCount === -2
          ? 2
          : targetCount === -3
            ? 3
            : targetCount === -4
              ? 4
              : targetCount === -5
                ? 5
                : 5;
    let sentences = [text];
    for (let level = 1; level <= maxLevel; level++) {
      if (sentences.length >= Math.abs(targetCount) && targetCount > 0) {
        break;
      }
      const newSentences = [];
      for (const sentence of sentences) {
        newSentences.push(..._SentenceLayout.splitByLevel(sentence, level));
      }
      sentences = newSentences;
    }
    let result = sentences.map((s) => new _SentenceLayout(s));
    if (targetCount > 0 && result.length < targetCount) {
      result = _SentenceLayout.secondarySplit(result, targetCount, timeSeed, fragmentSegmenter);
    }
    if (result.length > 1 && result.length > targetCount && targetCount > 0) {
      result = _SentenceLayout.mergeSentences(result, targetCount);
    }
    return result;
  }
  static splitByLevel(text, level) {
    switch (level) {
      case 1:
        return _SentenceLayout.splitByPunctuation(text);
      case 2:
        return _SentenceLayout.splitByBracketsQuotes(text);
      case 3:
        return _SentenceLayout.splitByWesternWords(text);
      case 4:
        return _SentenceLayout.splitCJKBySpace(text);
      case 5:
        return _SentenceLayout.splitBySpecialChars(text);
      default:
        return [text];
    }
  }
  static splitByPunctuation(text) {
    const allPunctRegex = /[，。；！？、…·\.\,\;\!\?]+/g;
    const matches = [];
    let matched;
    while ((matched = allPunctRegex.exec(text)) !== null) matches.push(matched);
    if (matches.length === 0) {
      return [text];
    }
    const result = [];
    let lastIndex = 0;
    for (const match of matches) {
      const punctStart = match.index;
      const punctEnd = punctStart + match[0].length;
      let trailingSpaces = '';
      const afterPunct = text.slice(punctEnd);
      const spaceMatch = afterPunct.match(/^\s+/);
      if (spaceMatch) {
        trailingSpaces = spaceMatch[0];
      }
      const beforePunct = text.slice(lastIndex, punctStart);
      const punctWithSpaces = match[0] + trailingSpaces;
      if (beforePunct.length > 0) {
        result.push(beforePunct + punctWithSpaces);
      } else if (result.length > 0) {
        result[result.length - 1] += punctWithSpaces;
      } else {
        result.push(punctWithSpaces);
      }
      lastIndex = punctEnd + trailingSpaces.length;
    }
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }
    return result.filter((r) => r.length > 0);
  }
  static splitByWesternWords(text) {
    var _a;
    if (!hasCjkText(text)) {
      return [text];
    }
    const westernBlockRegex =
      /[a-zA-Z0-9]+(?:[a-zA-Z0-9'\-]*[a-zA-Z0-9]+)?(?:\s+[a-zA-Z0-9]+(?:[a-zA-Z0-9'\-]*[a-zA-Z0-9]+)?)+[.,;:!?。，；：！？]?\s*/g;
    _SentenceLayout.charCountCache.clear();
    let hasMultipleWordBlock = false;
    let match;
    while ((match = westernBlockRegex.exec(text)) !== null) {
      const wordCount = ((_a = match[0].match(/[a-zA-Z0-9]+/g)) == null ? void 0 : _a.length) || 0;
      if (wordCount > 1) {
        hasMultipleWordBlock = true;
        break;
      }
    }
    if (!hasMultipleWordBlock) {
      return [text];
    }
    westernBlockRegex.lastIndex = 0;
    const parts = [];
    let lastIndex = 0;
    while ((match = westernBlockRegex.exec(text)) !== null) {
      const blockStart = match.index;
      const blockEnd = blockStart + match[0].length;
      const beforeBlock = text.slice(lastIndex, blockStart);
      if (_SentenceLayout.shouldSkipBoundary(text, beforeBlock, blockStart)) {
        parts.push(beforeBlock + match[0]);
      } else if (blockStart > lastIndex) {
        parts.push(beforeBlock);
        parts.push(match[0]);
      } else {
        parts.push(match[0]);
      }
      lastIndex = blockEnd;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 1 ? parts : [text];
  }
  static getGlobalCount(text, char) {
    const key = `${text.length}:${char}`;
    if (_SentenceLayout.charCountCache.has(key)) {
      return _SentenceLayout.charCountCache.get(key);
    }
    const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const count = (text.match(new RegExp(escaped, 'g')) || []).length;
    _SentenceLayout.charCountCache.set(key, count);
    return count;
  }
  static shouldSkipBoundary(fullText, beforeBlock, _boundaryPos) {
    if (beforeBlock.length === 0) return false;
    const sepChar = beforeBlock[beforeBlock.length - 1];
    if (sepChar === '-') return true;
    if (
      sepChar === ':' ||
      sepChar === '\uFF1A' ||
      sepChar === '/' ||
      sepChar === '\uFF0F' ||
      sepChar === '|' ||
      sepChar === '\uFF5C'
    ) {
      return _SentenceLayout.getGlobalCount(fullText, sepChar) >= 2;
    }
    return false;
  }
  static splitWesternPhrase(text) {
    if (!hasCjkText(text) && text.length > 0) {
      const splitRegex = new RegExp(
        '(?<=\\w[.,;:!?\u3002\uFF0C\uFF1B\uFF1A\uFF01\uFF1F])(?=\\s+\\w)'
      );
      const parts = text.split(splitRegex);
      if (parts.length > 1) {
        return parts.filter((p) => p.length > 0);
      }
    }
    return [text];
  }
  static splitByBracketsQuotes(text) {
    const allPairedSymbols = [
      { open: /「/, close: /」/ },
      { open: /『/, close: /』/ },
      { open: /《/, close: /》/ },
      { open: /【/, close: /】/ },
      { open: /｛/, close: /｝/ },
      { open: /［/, close: /］/ },
      { open: /\[/, close: /\]/ },
      { open: /（/, close: /）/ },
      { open: /\(/, close: /\)/ },
      { openStr: '"', closeStr: '"' },
      { openStr: "'", closeStr: "'" },
    ];
    const result = _SentenceLayout.extractOutermostPairs(text, allPairedSymbols);
    return result.length > 1 ? result : [text];
  }
  static extractOutermostPairs(text, defs) {
    const best = _SentenceLayout.findOutermostPair(text, defs);
    if (!best) {
      return [text];
    }
    const before = text.slice(0, best.openStart);
    const pairedContent = text.slice(best.openStart, best.closeEnd);
    const remainder = text.slice(best.closeEnd);
    const result = [];
    if (before.length > 0) {
      result.push(..._SentenceLayout.extractOutermostPairs(before, defs));
    }
    result.push(pairedContent);
    if (remainder.length > 0) {
      result.push(..._SentenceLayout.extractOutermostPairs(remainder, defs));
    }
    return result.filter((p) => p.length > 0);
  }
  static findOutermostPair(text, defs) {
    let best = null;
    for (const def of defs) {
      const openMatch =
        def.openStr !== void 0
          ? findStringMatch(def.openStr, text)
          : findRegexMatch(def.open, text);
      if (!openMatch) continue;
      const searchFrom = openMatch.end;
      const closeMatch =
        def.closeStr !== void 0
          ? findStringMatch(def.closeStr, text, searchFrom)
          : findRegexMatch(def.close, text, searchFrom);
      if (!closeMatch) continue;
      const candidate = {
        openStart: openMatch.start,
        openEnd: openMatch.end,
        closeStart: closeMatch.start,
        closeEnd: closeMatch.end,
      };
      if (!best || candidate.openStart < best.openStart) {
        best = candidate;
      } else if (candidate.openStart === best.openStart && candidate.closeEnd > best.closeEnd) {
        best = candidate;
      }
    }
    return best;
  }
  static splitCJKBySpace(text) {
    if (!hasCjkText(text)) {
      return [text];
    }
    const segments = [];
    let currentSegment = '';
    let inCjkBlock = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const isCJK = CJK_REGEX.test(char);
      const isWestern = /[a-zA-Z0-9]/.test(char);
      const isSpace = /\s/.test(char);
      if (isCJK) {
        currentSegment += char;
        inCjkBlock = true;
      } else if (isWestern) {
        currentSegment += char;
      } else if (isSpace) {
        const isFullWidthSpace = char === '\u3000';
        if (isFullWidthSpace && currentSegment.length > 0) {
          currentSegment += char;
          segments.push(currentSegment);
          currentSegment = '';
          inCjkBlock = false;
        } else if (inCjkBlock && currentSegment.length > 0) {
          const lastChar = currentSegment[currentSegment.length - 1];
          if (CJK_REGEX.test(lastChar)) {
            currentSegment += char;
            segments.push(currentSegment);
            currentSegment = '';
            inCjkBlock = false;
          } else {
            currentSegment += char;
          }
        } else if (currentSegment.length === 0 && segments.length > 0) {
          segments[segments.length - 1] += char;
        } else {
          currentSegment += char;
        }
      } else {
        if (currentSegment.length === 0 && segments.length > 0) {
          segments[segments.length - 1] += char;
        } else {
          currentSegment += char;
        }
      }
    }
    if (currentSegment) {
      if (segments.length > 0 && /^\s+$/.test(currentSegment)) {
        segments[segments.length - 1] += currentSegment;
      } else {
        segments.push(currentSegment);
      }
    }
    return segments.length > 1 ? segments : [text];
  }
  static splitBySpecialChars(text) {
    const specialCharRegex = /[：:\/／\\|｜~～]+/;
    const parts = text.split(specialCharRegex);
    if (parts.filter((part) => part.length > 0).length <= 1) {
      return [text];
    }
    const result = [];
    let lastIndex = 0;
    for (const part of parts) {
      const index = text.indexOf(part, lastIndex);
      if (index > lastIndex) {
        const specialChar = text.slice(lastIndex, index);
        if (result.length > 0) {
          result[result.length - 1] += specialChar;
        } else {
          result.push(specialChar);
        }
      }
      if (part) {
        result.push(part);
        lastIndex = index + part.length;
      } else if (index !== -1) {
        lastIndex = index;
      }
    }
    if (lastIndex < text.length) {
      const tail = text.slice(lastIndex);
      if (tail && result.length > 0) {
        result[result.length - 1] += tail;
      } else if (tail) {
        result.push(tail);
      }
    }
    return result.filter((r) => r.length > 0);
  }
  // The one word-granularity Segmenter left outside utils/lyrics/wordSegmentation, and so the one
  // place the user's saved segmentation does not reach. It splits a sentence *fragment* rather
  // than a whole line, purely to find a break point, so a per-line boundary list would have to be
  // mapped into fragment coordinates first. Left as is deliberately; see the lyric-segmentation
  // command, which is offered only for the modes that segment whole lines.
  static secondarySplit(sentences, targetCount, timeSeed, fragmentSegmenter) {
    const segmenter = fragmentSegmenter;
    while (sentences.length < targetCount) {
      const candidates = sentences.filter((s) => s.text.length > 2);
      if (candidates.length === 0) break;
      if (segmenter) {
        const semanticCandidates = [];
        for (const s of candidates) {
          try {
            const segments = Array.from(segmenter.segment(s.text));
            const wordPositions = [];
            let offset = 0;
            for (const seg of segments) {
              if (seg.isWordLike) {
                wordPositions.push({ start: offset, end: offset + seg.segment.length });
              }
              offset += seg.segment.length;
            }
            if (wordPositions.length >= 2) {
              const midChar = s.text.length / 2;
              let bestGapIdx = 1;
              let bestDist = Infinity;
              for (let g = 1; g < wordPositions.length; g++) {
                const dist = Math.abs(wordPositions[g].start - midChar);
                if (dist < bestDist) {
                  bestDist = dist;
                  bestGapIdx = g;
                }
              }
              const splitPos = wordPositions[bestGapIdx].start;
              const balanceScore = 1 - Math.abs(splitPos - midChar) / midChar;
              semanticCandidates.push({
                sentence: s,
                index: sentences.indexOf(s),
                splitPos,
                score: balanceScore * 10 + wordPositions.length,
              });
            }
          } catch (e) {}
        }
        // Suspend this stage before source fallback can explore an unchosen branch.
        // With all real ICU fragments present, every original decision is unchanged.
        if (segmenter.hasMissing && segmenter.hasMissing()) {
          const error = new Error('ICU fragments pending');
          error.fragmentPending = true;
          throw error;
        }
        if (semanticCandidates.length > 0) {
          semanticCandidates.sort((a, b) => b.score - a.score);
          const best = semanticCandidates[0];
          const firstHalf2 = best.sentence.text.slice(0, best.splitPos);
          const secondHalf2 = best.sentence.text.slice(best.splitPos);
          sentences.splice(
            best.index,
            1,
            new _SentenceLayout(firstHalf2),
            new _SentenceLayout(secondHalf2)
          );
          continue;
        }
      }
      const pseudoRandom = (seed2) => {
        const x = Math.sin(seed2) * 1e4;
        return x - Math.floor(x);
      };
      const textHash = sentences.reduce(
        (acc, s) => acc + s.text.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0),
        0
      );
      const seed = textHash + sentences.length + (timeSeed != null ? timeSeed : 0);
      const randomIndex = Math.floor(pseudoRandom(seed) * candidates.length);
      const selectedCandidate = candidates[randomIndex];
      const candidateIndex = sentences.indexOf(selectedCandidate);
      const midPoint = Math.floor(selectedCandidate.text.length / 2);
      const firstHalf = selectedCandidate.text.slice(0, midPoint);
      const secondHalf = selectedCandidate.text.slice(midPoint);
      sentences.splice(
        candidateIndex,
        1,
        new _SentenceLayout(firstHalf),
        new _SentenceLayout(secondHalf)
      );
    }
    return sentences;
  }
  static mergeSentences(sentences, targetCount) {
    while (sentences.length > targetCount) {
      let bestMergeIndex = 0;
      let shortestCombinedLength = Infinity;
      for (let i = 0; i < sentences.length - 1; i++) {
        const combinedLength = sentences[i].text.length + sentences[i + 1].text.length;
        if (combinedLength < shortestCombinedLength) {
          shortestCombinedLength = combinedLength;
          bestMergeIndex = i;
        }
      }
      const merged = new _SentenceLayout(
        sentences[bestMergeIndex].text + sentences[bestMergeIndex + 1].text
      );
      sentences.splice(bestMergeIndex, 2, merged);
    }
    return sentences;
  }
};
__publicField(_SentenceLayout, 'charCountCache', /* @__PURE__ */ new Map());
let SentenceLayout = _SentenceLayout;
export { SentenceLayout };
