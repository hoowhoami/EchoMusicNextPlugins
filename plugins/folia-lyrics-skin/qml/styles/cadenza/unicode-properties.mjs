import { hasCategory } from '../../shared/text/unicode.mjs';
import { ranges } from './unicode-properties-data.mjs';
function contains(table, cp) {
  let lo = 0,
    hi = table.length / 2;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cp < table[mid * 2]) hi = mid;
    else if (cp > table[mid * 2 + 1]) lo = mid + 1;
    else return true;
  }
  return false;
}
export function property(cp, name) {
  if (name === 'Regional_Indicator') return cp >= 0x1f1e6 && cp <= 0x1f1ff;
  if (name === 'VariationEmoji') return cp === 0xfe0f;
  if (name === 'Keycap') return cp === 0x20e3;
  return ranges[name] ? contains(ranges[name], cp) : hasCategory(cp, name);
}
export function propertyTest(names, every) {
  return {
    test(text) {
      if (every && !text) return false;
      for (const character of text) {
        const cp = character.codePointAt(0);
        const matches = names.some((name) => property(cp, name));
        if (!every && matches) return true;
        if (every && !matches) return false;
      }
      return !!every;
    },
  };
}
