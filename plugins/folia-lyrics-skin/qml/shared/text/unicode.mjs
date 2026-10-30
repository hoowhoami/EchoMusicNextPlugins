// Portable Unicode 17 predicates and default extended grapheme boundaries (UAX #29).
// Data: Unicode license. Integration code: AGPL-3.0-only, see text-reference.md.
import { TABLES, UNICODE_VERSION } from './unicode-data.mjs';
export { UNICODE_VERSION };

function contains(ranges, cp) {
  if (!ranges) return false;
  let low = 0;
  let high = ranges.length / 2;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (cp < ranges[middle * 2]) high = middle;
    else if (cp > ranges[middle * 2 + 1]) low = middle + 1;
    else return true;
  }
  return false;
}

export function categoryOf(cp) {
  for (const name of Object.keys(TABLES.categories)) {
    if (contains(TABLES.categories[name], cp)) return name;
  }
  return 'Cn';
}
export function hasCategory(cp, category) {
  if (category === 'C') return categoryOf(cp)[0] === 'C';
  if (category.length === 2)
    return category === 'Cn' ? categoryOf(cp) === 'Cn' : contains(TABLES.categories[category], cp);
  for (const name of Object.keys(TABLES.categories)) {
    if (name[0] === category && contains(TABLES.categories[name], cp)) return true;
  }
  return false;
}
export function hasScript(cp, script) {
  if (!Object.prototype.hasOwnProperty.call(TABLES.scripts, script))
    throw new Error('Unsupported Unicode script: ' + script);
  return contains(TABLES.scripts[script], cp);
}
export function isEcmaWhitespace(cp) {
  return (
    (cp >= 9 && cp <= 13) ||
    cp === 0x20 ||
    cp === 0xa0 ||
    cp === 0x1680 ||
    (cp >= 0x2000 && cp <= 0x200a) ||
    cp === 0x2028 ||
    cp === 0x2029 ||
    cp === 0x202f ||
    cp === 0x205f ||
    cp === 0x3000 ||
    cp === 0xfeff
  );
}
function everyCodePoint(text, predicate) {
  if (!text) return false;
  for (let index = 0; index < text.length;) {
    const cp = text.codePointAt(index);
    if (!predicate(cp)) return false;
    index += cp > 0xffff ? 2 : 1;
  }
  return true;
}
function someCodePoint(text, predicate) {
  for (let index = 0; index < text.length;) {
    const cp = text.codePointAt(index);
    if (predicate(cp)) return true;
    index += cp > 0xffff ? 2 : 1;
  }
  return false;
}
export function isPunctuationOnly(text) {
  return everyCodePoint(
    text,
    (cp) => isEcmaWhitespace(cp) || hasCategory(cp, 'P') || hasCategory(cp, 'S')
  );
}
export function isWhitespaceOnly(text) {
  return everyCodePoint(text, isEcmaWhitespace);
}
export function hasLetterOrNumber(text) {
  return someCodePoint(text, (cp) => hasCategory(cp, 'L') || hasCategory(cp, 'N'));
}
export function endsWithLetterOrNumber(text) {
  if (!text) return false;
  let index = text.length - 1;
  const tail = text.charCodeAt(index);
  if (tail >= 0xdc00 && tail <= 0xdfff && index > 0) {
    const lead = text.charCodeAt(index - 1);
    if (lead >= 0xd800 && lead <= 0xdbff) index--;
  }
  const cp = text.codePointAt(index);
  return hasCategory(cp, 'L') || hasCategory(cp, 'N');
}
function isCjCodePoint(cp) {
  return (
    hasScript(cp, 'Han') ||
    hasScript(cp, 'Hiragana') ||
    hasScript(cp, 'Katakana') ||
    cp === 0x30fc ||
    cp === 0x3005 ||
    cp === 0x3006 ||
    cp === 0x3007
  );
}
export function isCjPiece(text) {
  return everyCodePoint(text, isCjCodePoint);
}
export function hasKana(text) {
  return someCodePoint(
    text,
    (cp) => hasScript(cp, 'Hiragana') || hasScript(cp, 'Katakana') || cp === 0x30fc
  );
}
export function isAlphabeticWord(text) {
  return everyCodePoint(
    text,
    (cp) =>
      (hasCategory(cp, 'L') || hasCategory(cp, 'M') || hasCategory(cp, 'N')) &&
      !hasScript(cp, 'Han') &&
      !hasScript(cp, 'Hiragana') &&
      !hasScript(cp, 'Katakana') &&
      !hasScript(cp, 'Hangul')
  );
}
// Same Unicode-aware, case-insensitive suffix behavior as Folia's /.../iu, including long s.
export function hasInlineContraction(text) {
  for (let index = 0; index < text.length;) {
    const cp = text.codePointAt(index);
    const next = index + (cp > 0xffff ? 2 : 1);
    if (
      (hasCategory(cp, 'L') || hasCategory(cp, 'N')) &&
      (text[next] === "'" || text[next] === '’')
    ) {
      if (/^(s|t|m|d|ll|re|ve|em)/i.test(text.slice(next + 1).replace(/ſ/g, 's'))) return true;
    }
    index = next;
  }
  return false;
}
function breakClass(cp) {
  if (cp >= 0xac00 && cp <= 0xd7a3) return (cp - 0xac00) % 28 === 0 ? 'LV' : 'LVT';
  for (const name of Object.keys(TABLES.grapheme))
    if (contains(TABLES.grapheme[name], cp)) return name;
  return 'Other';
}
function conjunctClass(cp) {
  for (const name of Object.keys(TABLES.conjunct))
    if (contains(TABLES.conjunct[name], cp)) return name;
  return 'None';
}
function isControl(name) {
  return name === 'Control' || name === 'CR' || name === 'LF';
}
export function graphemeSegments(text) {
  if (!text) return [];
  const points = [];
  for (let index = 0; index < text.length;) {
    const cp = text.codePointAt(index);
    points.push({
      index,
      cp,
      kind: breakClass(cp),
      conjunct: conjunctClass(cp),
      pictographic: contains(TABLES.emoji.Extended_Pictographic, cp),
    });
    index += cp > 0xffff ? 2 : 1;
  }
  const boundaries = [0];
  let riRun = points[0].kind === 'Regional_Indicator' ? 1 : 0;
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1];
    const right = points[index];
    const a = left.kind;
    const b = right.kind;
    let keep = false;
    if (a === 'CR' && b === 'LF')
      keep = true; // GB3
    else if (isControl(a) || isControl(b))
      keep = false; // GB4/5
    else if (a === 'L' && ['L', 'V', 'LV', 'LVT'].includes(b))
      keep = true; // GB6
    else if (['LV', 'V'].includes(a) && ['V', 'T'].includes(b))
      keep = true; // GB7
    else if (['LVT', 'T'].includes(a) && b === 'T')
      keep = true; // GB8
    else if (b === 'Extend' || b === 'ZWJ' || b === 'SpacingMark' || a === 'Prepend')
      keep = true; // GB9/9a/9b
    else {
      if (right.conjunct === 'Consonant') {
        // GB9c
        let cursor = index - 1;
        let linker = false;
        while (cursor >= 0 && ['Extend', 'Linker'].includes(points[cursor].conjunct)) {
          linker = linker || points[cursor].conjunct === 'Linker';
          cursor--;
        }
        keep = linker && cursor >= 0 && points[cursor].conjunct === 'Consonant';
      }
      if (!keep && a === 'ZWJ' && right.pictographic) {
        // GB11
        let cursor = index - 2;
        while (cursor >= 0 && points[cursor].kind === 'Extend') cursor--;
        keep = cursor >= 0 && points[cursor].pictographic;
      }
      if (!keep && a === 'Regional_Indicator' && b === 'Regional_Indicator') keep = riRun % 2 === 1; // GB12/13
    }
    if (!keep) boundaries.push(right.index); // GB999
    riRun = b === 'Regional_Indicator' ? (a === b ? riRun + 1 : 1) : 0;
  }
  return boundaries.map((index, ordinal) => ({
    index,
    segment: text.slice(
      index,
      ordinal + 1 < boundaries.length ? boundaries[ordinal + 1] : text.length
    ),
  }));
}
export function splitLyricGraphemes(text) {
  return graphemeSegments(text).map((part) => part.segment);
}
