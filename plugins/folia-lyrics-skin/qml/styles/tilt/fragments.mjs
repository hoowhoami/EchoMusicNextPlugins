// Folia a8da4437 secondarySplit adapter. Raw ICU only; never whole-line dictionary output.
import { buildTiltLayout } from './kernel.mjs';

export class FragmentCache {
  constructor(limits) {
    this.maxFragments = (limits && limits.maxFragments) || 32;
    this.maxUnits = (limits && limits.maxUnits) || 65536;
    this.generation = 0;
    this.entries = new Map();
    this.units = 0;
  }
  get size() {
    return this.entries.size;
  }
  invalidate() {
    ++this.generation;
    this.entries.clear();
    this.units = 0;
  }
  plan(text, seed, tuning, width, measure) {
    const requests = [];
    const lookup = {
      hasMissing: () => requests.length > 0,
      segment: (fragment) => {
        if (this.entries.has(fragment)) return this.entries.get(fragment);
        if (requests.indexOf(fragment) < 0) requests.push(fragment);
        throw new Error('ICU fragment pending');
      },
    };
    let layout = null;
    try {
      layout = buildTiltLayout(text, seed, tuning, width, measure, lookup);
    } catch (error) {
      if (!error.fragmentPending) throw error;
    }
    const units = requests.reduce((sum, value) => sum + value.length, 0);
    if (
      this.entries.size + requests.length > this.maxFragments ||
      this.units + units > this.maxUnits
    )
      throw new Error('ICU fragment preparation exceeds its bounded limit');
    return { ready: requests.length === 0, layout: requests.length ? null : layout, requests };
  }
  accept(generation, texts, lines) {
    if (generation !== this.generation) return false;
    if (texts.length !== lines.length) throw new Error('ICU fragment result count mismatch');
    const missing = texts.filter(
      (text, index) => !this.entries.has(text) && texts.indexOf(text) === index
    );
    if (
      this.entries.size + missing.length > this.maxFragments ||
      this.units + missing.reduce((sum, text) => sum + text.length, 0) > this.maxUnits
    )
      throw new Error('ICU fragment result exceeds its bounded limit');
    const records = [];
    for (let index = 0; index < texts.length; index++) {
      let offset = 0;
      const pieces = [];
      for (const part of lines[index]) {
        if (
          part.index !== offset ||
          typeof part.segment !== 'string' ||
          typeof part.isWordLike !== 'boolean'
        )
          throw new Error('Invalid ICU fragment UTF16 boundary');
        offset += part.segment.length;
        pieces.push({ segment: part.segment, index: part.index, isWordLike: part.isWordLike });
      }
      if (
        offset !== texts[index].length ||
        pieces.map((part) => part.segment).join('') !== texts[index]
      )
        throw new Error('ICU fragment does not reconstruct its original text');
      records.push(pieces);
    }
    for (let index = 0; index < texts.length; index++)
      if (!this.entries.has(texts[index])) {
        this.entries.set(texts[index], records[index]);
        this.units += texts[index].length;
      }
    return true;
  }
}
