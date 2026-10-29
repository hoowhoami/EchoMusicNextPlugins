// Exact source pretext prefix widths. Unmeasured fallbacks never leave the worker.
import { prepareWithSegments, layoutWithLines, clearCache } from '../../styles/pendolo/pretext.mjs';
import { configure, pending } from '../../styles/pendolo/native-measure.mjs';
import { splitLyricGraphemes } from '../text/unicode.mjs';
import { buildLineGraphemeTimeline } from '../text/graphemeTiming.mjs';
export function requestedTexts(vocals) {
  const unique = new Set();
  let units = 0;
  for (const vocal of vocals) {
    if (vocal.text.length > 8192) throw Error('Harmony voice exceeds the native 8192 UTF16 budget');
    let prefix = '';
    for (const ch of splitLyricGraphemes(vocal.text)) {
      prefix += ch;
      const normalized = prefix.replace(/[ \t\n\r\f]+/g, ' ').replace(/^ | $/g, '');
      if (normalized && !unique.has(normalized)) {
        units += normalized.length;
        if (units > 2097152) throw Error('Harmony prefix measurement exceeds 2Mi UTF16');
        unique.add(normalized);
      }
    }
  }
  return Array.from(unique);
}
export class LayoutJob {
  constructor(request) {
    this.request = request;
    this.widths = new Map();
    this.round = 0;
  }
  accept(values) {
    for (const value of values) {
      if (!Number.isFinite(value.width) || value.width < 0)
        throw Error('Invalid Harmony native width');
      this.widths.set(value.key, value.width);
    }
    if (this.widths.size > 16384) throw Error('Harmony native width cache exceeds 16384 entries');
  }
  step() {
    if (++this.round > 16) throw Error('Harmony source layout exceeded 16 refinement rounds');
    clearCache();
    configure({
      pieces: this.request.pieces,
      widths: Array.from(this.widths, (entry) => ({ key: entry[0], width: entry[1] })),
    });
    const font = this.request.weight + ' ' + this.request.size + 'px body';
    const items = [];
    for (const vocal of this.request.vocals) {
      const offsets = [0];
      let prefix = '';
      for (const ch of splitLyricGraphemes(vocal.text)) {
        prefix += ch;
        const prepared = prepareWithSegments(prefix || ' ', font);
        const layout = layoutWithLines(prepared, 99999, this.request.size * 1.2);
        offsets.push(
          layout.lines.length
            ? layout.lines[0].width
            : Math.max(prefix.length, 1) * this.request.size * 0.6
        );
      }
      items.push({
        vocal,
        offsets,
        timings: buildLineGraphemeTimeline({
          fullText: vocal.text,
          startTime: vocal.startTime,
          endTime: vocal.endTime,
          words: vocal.words,
        }),
      });
    }
    const requests = pending();
    return requests.length ? { phase: 'measure', requests } : { phase: 'complete', items };
  }
}
