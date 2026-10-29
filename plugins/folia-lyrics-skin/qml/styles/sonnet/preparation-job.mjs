// Whole source text stays in the lazy Worker; only the bounded scene window crosses to QML.
import { prepareLines } from '../../shared/text/prepare.mjs';
import { createIcuFoliaEngines } from '../../shared/text/engines.mjs';
import { compileSonnetProgram } from './sonnetProgram.mjs';
import { prepare } from './prepare.mjs';

export class ProgramPreparation {
  constructor() {
    this.lines = [];
    this.units = 0;
    this.program = null;
    this.job = null;
    this.cache = new Map();
  }
  append(lines, pieces) {
    const units = lines.reduce((sum, line) => sum + line.fullText.length, 0);
    if (this.lines.length + lines.length > 8192 || this.units + units > 1048576)
      throw new Error('Sonnet whole-song budget exceeded (8192 lines / 1048576 UTF16)');
    const prepared = prepareLines(lines, pieces, createIcuFoliaEngines());
    this.lines.push.apply(
      this.lines,
      prepared.lines.map((value) => value.line)
    );
    this.units += units;
  }
  compile(seed) {
    this.program = compileSonnetProgram(this.lines, seed);
    this.job = null;
    this.cache.clear();
    return Object.assign({}, this.program, {
      paragraphs: this.program.paragraphs.map((paragraph) => {
        const summary = Object.assign({}, paragraph);
        delete summary.lines;
        return summary;
      }),
    });
  }
  begin(index, context) {
    if (
      !Number.isInteger(index) ||
      !this.program ||
      index < 0 ||
      index >= this.program.paragraphs.length
    )
      throw new Error('Invalid Sonnet paragraph index');
    const key = JSON.stringify([index, context]);
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    this.job = {
      index,
      key,
      context: Object.assign({}, context, { programSeed: this.program.seed }),
      measurements: new Map(),
      pieces: new Map(),
      rounds: 0,
    };
    return this.step();
  }
  accept(measurements, pieces) {
    if (!this.job) throw new Error('Sonnet has no active paragraph preparation');
    for (const value of measurements) this.job.measurements.set(value.key, value);
    for (const value of pieces) this.job.pieces.set(value.text, value);
    return this.step();
  }
  step() {
    const job = this.job;
    if (++job.rounds > 32) throw new Error('Sonnet native discovery did not converge in 32 rounds');
    const paragraph = this.program.paragraphs[job.index];
    const measurements = Array.from(job.measurements.values()),
      pieces = Array.from(job.pieces.values());
    const result = prepare(paragraph, job.context, measurements, pieces);
    if (result.phase === 'native')
      return Object.assign({ index: job.index, round: job.rounds }, result);
    const scene = {
      phase: 'scene',
      index: job.index,
      paragraph,
      layout: result,
      measurements,
      pieces,
    };
    this.cache.set(job.key, scene);
    while (this.cache.size > 3) this.cache.delete(this.cache.keys().next().value);
    this.job = null;
    return scene;
  }
  cachedIndices() {
    return Array.from(this.cache.values()).map((scene) => scene.index);
  }
}
