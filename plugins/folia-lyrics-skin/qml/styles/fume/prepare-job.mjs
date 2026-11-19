import { buildArticleLayout } from './article-layout.mjs';
import { configure, pendingMeasurements, clearGraphemeCache } from './native-measure.mjs';
import { clearCache, clearMeasurementState } from './pretext.mjs';
import { clearFumeTextMeasureCaches } from './text-measure.mjs';
// Unknown widths only discover the next native queries. No provisional article crosses this boundary.
export class ArticlePreparation {
  constructor(lines, context, pieces) {
    clearGraphemeCache();
    clearCache();
    this.lines = lines;
    this.context = context;
    this.pieces = pieces;
    this.widths = Object.create(null);
    this.widthCount = 0;
    this.orderBySeed = new Map();
    this.round = 0;
    this.iterator = null;
    this.waiting = false;
    this.finished = false;
    this.restart();
  }
  restart() {
    if (++this.round > 32)
      throw new Error('Fume native measurement preparation exceeded 32 refinement rounds');
    clearMeasurementState();
    clearFumeTextMeasureCaches();
    configure({
      pieces: this.pieces,
      widths: this.widths,
      discovery: true,
    });
    this.iterator = buildArticleLayout(
      this.lines,
      this.context.viewport,
      this.context.theme,
      this.context.lyricsFontScale,
      this.context.tuning,
      this.orderBySeed,
    );
    this.waiting = false;
  }
  step(maxSteps) {
    if (this.waiting)
      throw new Error('Fume native measurements must be accepted before continuing');
    if (this.finished) throw new Error('Fume article preparation is finished');
    const deadline = Date.now() + 8;
    let result;
    for (let i = 0; i < maxSteps; i++) {
      result = this.iterator.next();
      if (result.done) break;
      if (Date.now() >= deadline) return { phase: 'continue' };
    }
    if (!result.done) return { phase: 'continue' };
    const requests = pendingMeasurements();
    if (requests.length) {
      this.waiting = true;
      return { phase: 'measure', round: this.round, requests };
    }
    // The displayed article owns its render data. Only source rows are
    // consulted by the worker when a later model reset checks identity.
    clearGraphemeCache();
    this.finished = true;
    this.iterator = null;
    this.orderBySeed.clear();
    this.widths = Object.create(null);
    this.widthCount = 0;
    this.pieces = [];
    clearCache();
    clearFumeTextMeasureCaches();
    configure({ pieces: [] });
    return { phase: 'complete', article: result.value };
  }
  accept(measurements) {
    if (!this.waiting) throw new Error('Fume was not waiting for native measurements');
    for (const item of measurements) {
      if (typeof item.key !== 'string' || !Number.isFinite(item.width) || item.width < 0)
        throw new Error('Invalid native Fume measurement');
      if (this.widths[item.key] === undefined) ++this.widthCount;
      this.widths[item.key] = item.width;
    }
    if (this.widthCount > 65536)
      throw new Error('Fume font measurement budget exceeded (65536 unique widths)');
    this.restart();
  }
}
