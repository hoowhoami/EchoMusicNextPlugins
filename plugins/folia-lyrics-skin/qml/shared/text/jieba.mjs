// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/text-reference.md.
import { codePoints } from './codepoints.mjs';
const STATES = ['B', 'E', 'M', 'S'];
const B = 0;
const E = 1;
const M = 2;
const S = 3;
const PREV_STATES = [
  [E, S],
  [B, M],
  [M, B],
  [S, E],
];
const MIN_FLOAT = -314e98;
const RE_HAN_DEFAULT =
  /([㐀-䶿一-鿿豈-﫿\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}\u{2CEB0}-\u{2EBEF}\u{2F800}-\u{2FA1F}a-zA-Z0-9+#&._%-]+)/u;
const RE_SKIP_DEFAULT = /(\r\n|\s)/u;
const RE_HAN_HMM = /([一-鿕]+)/u;
const RE_SKIP_HMM = /([a-zA-Z0-9]+(?:\.\d+)?%?)/u;
const LATIN_CHAR = /^[a-zA-Z0-9]$/;
import { decodeBase64 as portableDecodeBase64 } from './base64.mjs';
const decodeBase64 = (base64) => {
  return portableDecodeBase64(base64);
};
const decodeVarints = (base64, count) => {
  const bytes = decodeBase64(base64);
  const values = new Uint32Array(count);
  let cursor = 0;
  for (let index = 0; index < count; index += 1) {
    let value = 0;
    let scale = 1;
    for (;;) {
      const byte = bytes[cursor++];
      value += (byte & 127) * scale;
      if (byte < 128) break;
      scale *= 128;
    }
    values[index] = value;
  }
  return values;
};
const splitKeep = (text, pattern) =>
  text
    .split(pattern)
    .map((piece, index) => ({ text: piece, matched: index % 2 === 1 }))
    .filter((piece) => piece.text.length > 0);
const createJieba = (data, options = {}) => {
  var _a;
  const maxHmmWordLength = (_a = options.maxHmmWordLength) != null ? _a : Number.POSITIVE_INFINITY;
  const { words } = data;
  let count = words.length > 0 ? 1 : 0;
  for (let index = 0; index < words.length; index += 1)
    if (words.charCodeAt(index) === 10) count += 1;
  const starts = new Int32Array(count + 1);
  for (let index = 0, word = 1; index < words.length; index += 1) {
    if (words.charCodeAt(index) === 10) starts[word++] = index + 1;
  }
  starts[count] = words.length + 1;
  const freqs = decodeVarints(data.freqs, count);
  const compareAt = (index, text, from, to) => {
    const wordStart = starts[index];
    const wordLength = starts[index + 1] - 1 - wordStart;
    const keyLength = to - from;
    const shared = Math.min(wordLength, keyLength);
    for (let offset = 0; offset < shared; offset += 1) {
      const diff = words.charCodeAt(wordStart + offset) - text.charCodeAt(from + offset);
      if (diff !== 0) return diff;
    }
    return wordLength - keyLength;
  };
  const lowerBound = (text, from, to) => {
    let low = 0;
    let high = count;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (compareAt(mid, text, from, to) < 0) low = mid + 1;
      else high = mid;
    }
    return low;
  };
  const added = /* @__PURE__ */ new Map();
  const addedPrefixes = /* @__PURE__ */ new Set();
  const addedFirstCodes = /* @__PURE__ */ new Set();
  let total = data.total;
  let logTotal = Math.log(total);
  const freqAt = (text, from, to) => {
    if (addedFirstCodes.has(text.charCodeAt(from))) {
      const extra = added.get(text.slice(from, to));
      if (extra !== void 0) return extra;
    }
    const index = lowerBound(text, from, to);
    return index < count && compareAt(index, text, from, to) === 0 ? freqs[index] : 0;
  };
  const isPrefixAt = (text, from, to) => {
    if (addedFirstCodes.has(text.charCodeAt(from)) && addedPrefixes.has(text.slice(from, to)))
      return true;
    const index = lowerBound(text, from, to);
    if (index >= count) return false;
    const wordStart = starts[index];
    if (starts[index + 1] - 1 - wordStart < to - from) return false;
    for (let offset = 0; offset < to - from; offset += 1) {
      if (words.charCodeAt(wordStart + offset) !== text.charCodeAt(from + offset)) return false;
    }
    return true;
  };
  const freqOf = (word) => freqAt(word, 0, word.length);
  const start = STATES.map((state) => data.hmm.start[state]);
  const trans = STATES.map((from) =>
    STATES.map((to) => {
      var _a2;
      return (_a2 = data.hmm.trans[from][to]) != null ? _a2 : MIN_FLOAT;
    })
  );
  const emit = STATES.map((state) => {
    const [chars, logsBase64] = data.hmm.emit[state];
    const bytes = decodeBase64(logsBase64);
    const logs = new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8);
    const table = /* @__PURE__ */ new Map();
    codePoints(chars).forEach((char, index) => table.set(char, logs[index]));
    return table;
  });
  const viterbi = (chars) => {
    var _a2;
    const n = chars.length;
    const probs = new Float64Array(n * 4);
    const back = new Int8Array(n * 4);
    STATES.forEach((_, state2) => {
      var _a3;
      probs[state2] =
        start[state2] + ((_a3 = emit[state2].get(chars[0])) != null ? _a3 : MIN_FLOAT);
    });
    for (let t = 1; t < n; t += 1) {
      for (let state2 = 0; state2 < 4; state2 += 1) {
        const emitProb = (_a2 = emit[state2].get(chars[t])) != null ? _a2 : MIN_FLOAT;
        let best = Number.NEGATIVE_INFINITY;
        let bestPrev = -1;
        for (const prev of PREV_STATES[state2]) {
          const prob = probs[(t - 1) * 4 + prev] + trans[prev][state2] + emitProb;
          if (prob > best || (prob === best && prev > bestPrev)) {
            best = prob;
            bestPrev = prev;
          }
        }
        probs[t * 4 + state2] = best;
        back[t * 4 + state2] = bestPrev;
      }
    }
    const lastE = probs[(n - 1) * 4 + E];
    const lastS = probs[(n - 1) * 4 + S];
    let state = lastS >= lastE ? S : E;
    const labels = new Array(n);
    for (let t = n - 1; t >= 0; t -= 1) {
      labels[t] = state;
      state = back[t * 4 + state];
    }
    return labels;
  };
  const cutHmm = (text, out) => {
    for (const block of splitKeep(text, RE_HAN_HMM)) {
      if (!block.matched) {
        splitKeep(block.text, RE_SKIP_HMM).forEach((piece) => out.push(piece.text));
        continue;
      }
      const chars = codePoints(block.text);
      const labels = viterbi(chars);
      const words2 = [];
      let begin = 0;
      let next = 0;
      labels.forEach((label, index) => {
        if (label === B) {
          begin = index;
        } else if (label === E) {
          words2.push(chars.slice(begin, index + 1).join(''));
          next = index + 1;
        } else if (label === S) {
          words2.push(chars[index]);
          next = index + 1;
        }
      });
      if (next < chars.length) words2.push(chars.slice(next).join(''));
      words2.forEach((word) => {
        if (codePoints(word).length > maxHmmWordLength) out.push(...codePoints(word));
        else out.push(word);
      });
    }
  };
  const route = (text, bounds) => {
    const n = bounds.length - 1;
    const best = new Float64Array(n + 1);
    const nextIndex = new Int32Array(n + 1);
    for (let index = n - 1; index >= 0; index -= 1) {
      let bestProb = Number.NEGATIVE_INFINITY;
      let bestEnd = index;
      let end = index;
      let found = false;
      while (end < n && isPrefixAt(text, bounds[index], bounds[end + 1])) {
        const freq = freqAt(text, bounds[index], bounds[end + 1]);
        if (freq) {
          found = true;
          const prob = Math.log(freq) - logTotal + best[end + 1];
          if (prob >= bestProb) {
            bestProb = prob;
            bestEnd = end;
          }
        }
        end += 1;
      }
      if (!found) {
        bestProb = Math.log(1) - logTotal + best[index + 1];
        bestEnd = index;
      }
      best[index] = bestProb;
      nextIndex[index] = bestEnd + 1;
    }
    return nextIndex;
  };
  const cutBlock = (text, hmm, out) => {
    const bounds = new Int32Array(codePoints(text).length + 1);
    for (let index = 0, offset = 0; offset < text.length; index += 1) {
      offset += text.codePointAt(offset) > 65535 ? 2 : 1;
      bounds[index + 1] = offset;
    }
    const n = bounds.length - 1;
    const nextIndex = route(text, bounds);
    let buffer = [];
    const flush = () => {
      if (buffer.length === 1) {
        out.push(buffer[0]);
      } else if (buffer.length > 1) {
        const run = buffer.join('');
        if (!freqOf(run)) cutHmm(run, out);
        else out.push(...buffer);
      }
      buffer = [];
    };
    let latin = '';
    for (let index = 0; index < n;) {
      const end = nextIndex[index];
      const word = text.slice(bounds[index], bounds[end]);
      if (!hmm) {
        if (end - index === 1 && LATIN_CHAR.test(word)) {
          latin += word;
        } else {
          if (latin) out.push(latin);
          latin = '';
          out.push(word);
        }
      } else if (end - index === 1) {
        buffer.push(word);
      } else {
        flush();
        out.push(word);
      }
      index = end;
    }
    if (hmm) flush();
    else if (latin) out.push(latin);
  };
  const cut = (text, hmm = true) => {
    const out = [];
    for (const block of splitKeep(text, RE_HAN_DEFAULT)) {
      if (block.matched) {
        cutBlock(block.text, hmm, out);
        continue;
      }
      for (const piece of splitKeep(block.text, RE_SKIP_DEFAULT)) {
        if (piece.matched) out.push(piece.text);
        else out.push(...codePoints(piece.text));
      }
    }
    return out;
  };
  const suggestFreq = (word) => {
    const logFreq = cut(word, false).reduce(
      (sum, piece) => sum + Math.log(freqOf(piece) || 1) - logTotal,
      0
    );
    return Math.max(Math.floor(Math.exp(logFreq + logTotal)) + 1, freqOf(word) || 1);
  };
  const addWord = (word, freq) => {
    const weight = freq != null ? freq : suggestFreq(word);
    total += weight - freqOf(word);
    logTotal = Math.log(total);
    added.set(word, weight);
    addedFirstCodes.add(word.charCodeAt(0));
    const chars = codePoints(word);
    for (let length = 1; length <= chars.length; length += 1)
      addedPrefixes.add(chars.slice(0, length).join(''));
    return weight;
  };
  return { cut, addWord };
};
export { createJieba };
