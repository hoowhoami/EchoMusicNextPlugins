// Exact ICU semantic preparation; native metrics are refined before any source layout is published.
import { prepareLines } from '../../shared/text/prepare.mjs';
import { createIcuFoliaEngines } from '../../shared/text/engines.mjs';
import { compileTemperaProgram } from './temperaProgram.mjs';
import { clearLayoutMeasurements } from './temperaMeasure.mjs';
import { clearCache } from './pretext.mjs';
import {
  configure,
  pendingMeasurements,
  pendingSegmentations,
  requestMetric,
} from './native-measure.mjs';
import { createTextMeasurer } from '../sonnet/pixi-text-metrics.mjs';
import { createSceneGraph } from '../sonnet/scene-graph.mjs';
import { NativeRuntime } from './native-runtime.mjs';
import { RenderPlanner } from './render-plan.mjs';
export class ProgramPreparation {
  constructor() {
    this.lines = [];
    this.units = 0;
    this.measurements = new Map();
    this.pieces = new Map();
    this.context = null;
    this.runtime = null;
    this.round = 0;
    this.planner = null;
    this.incremental = false;
    this.invalid = [];
    this.queryUnits = 0;
  }
  append(lines, pieces) {
    const units = lines.reduce((s, l) => s + l.fullText.length, 0);
    if (this.lines.length + lines.length > 8192 || this.units + units > 1048576)
      throw Error('Tempera whole-song budget exceeded (8192 rows / 1048576 UTF16)');
    const prepared = prepareLines(
      lines,
      pieces.map((v) => v.pieces),
      createIcuFoliaEngines(),
      { semantic: true, sticky: true }
    );
    this.lines.push.apply(
      this.lines,
      prepared.lines.map((v) => v.line)
    );
    for (const value of pieces)
      if (!this.pieces.has(value.text)) {
        this.pieces.set(value.text, value);
        this.queryUnits += value.text.length * 2;
      }
    this.units += units;
  }
  begin(context, time) {
    this.context = context;
    this.time = time;
    this.round = 0;
    this.incremental = false;
    this.measurements.clear();
    this.queryUnits = Array.from(this.pieces.keys()).reduce((sum, key) => sum + key.length * 2, 0);
    const sourceLines = context.hideLyrics
      ? []
      : context.instrumental
        ? Array.from({ length: 60 }, (_, i) => ({
            id: 'virtual-block-' + i,
            startTime: i * 8,
            endTime: i * 8 + 6,
            fullText: '♪',
            words: [],
            isChorus: false,
          }))
        : this.lines;
    this.program = compileTemperaProgram(sourceLines, context.seed, {
      wholeLineLyrics: context.tuning.wholeLineLyrics,
    });
    return this.step();
  }
  accept(metrics, pieces) {
    for (const v of metrics)
      if (!this.measurements.has(v.key)) {
        if (
          !Number.isFinite(v.advance) ||
          !Number.isFinite(v.inkLeft) ||
          !Number.isFinite(v.inkRight)
        )
          throw Error('Invalid native Tempera advance/ink metrics');
        this.measurements.set(v.key, v);
        this.queryUnits += v.key.length;
      }
    for (const v of pieces)
      if (!this.pieces.has(v.text)) {
        this.pieces.set(v.text, v);
        this.queryUnits += v.text.length * 2;
      }
    if (
      this.measurements.size > 65536 ||
      this.pieces.size > 65536 ||
      this.queryUnits * 2 > 32 * 1024 * 1024
    )
      throw Error('Tempera native query cache budget exceeded');
    return this.step();
  }
  configure() {
    configure({
      pieces: Array.from(this.pieces.values()),
      measurements: Array.from(this.measurements.values()),
      discovery: true,
    });
    clearCache();
    clearLayoutMeasurements();
  }
  step() {
    if (++this.round > 32) throw Error('Tempera font discovery did not converge in 32 rounds');
    this.configure();
    if (this.incremental) {
      for (const index of this.invalid) {
        const scene = this.runtime.sceneCache.get(index);
        if (scene) {
          this.runtime.destroyScene(scene);
          this.runtime.sceneCache.scenes.delete(index);
        }
      }
      this.runtime.activeParagraphIndex = -1;
    } else {
      if (this.runtime) this.runtime.clear();
      const pixi = createSceneGraph({
        maxNodes: 98304,
        measureText: createTextMeasurer(requestMetric),
      });
      this.runtime = new NativeRuntime(
        pixi,
        Object.assign({}, this.context, { program: this.program })
      );
    }
    // Build the source's bounded +/-1 paragraph window, not the whole track.
    for (let i = 0; i < 3; i++) this.runtime.frame(this.time);
    const inspect = (n) => {
      if (n.kind === 'text') n.metrics;
      for (const c of n.children) inspect(c);
    };
    inspect(this.runtime.stage);
    const requests = pendingMeasurements(),
      pieces = pendingSegmentations();
    if (requests.length || pieces.length)
      return { phase: 'native', requests, pieces, round: this.round };
    if (!this.incremental) this.planner = new RenderPlanner();
    this.incremental = false;
    this.invalid = [];
    return this.frame(this.time);
  }
  updateTuning(tuning, time) {
    this.context.tuning = tuning;
    this.runtime.setLiveTuning(tuning);
    return this.frame(time);
  }
  frame(time) {
    this.time = time;
    const before = new Set(this.runtime.sceneCache.scenes.keys());
    this.runtime.frame(time);
    const frame = this.planner
      ? this.planner.frame(
          this.runtime.stage,
          this.runtime.lastWidth,
          this.runtime.lastHeight,
          this.runtime.renderResolution,
          time
        )
      : null;
    const requests = pendingMeasurements(),
      pieces = pendingSegmentations();
    if (requests.length || pieces.length) {
      this.round = 1;
      this.incremental = true;
      this.invalid = Array.from(this.runtime.sceneCache.scenes.keys()).filter(
        (index) => !before.has(index)
      );
      if (!this.invalid.length)
        throw Error('Tempera native measurement appeared outside new source scene');
      return { phase: 'native', requests, pieces, round: this.round };
    }
    return {
      phase: 'frame',
      frame,
      paragraphCount: this.program.paragraphs.length,
      cachedParagraphs: this.runtime.sceneCache.size,
    };
  }
}
