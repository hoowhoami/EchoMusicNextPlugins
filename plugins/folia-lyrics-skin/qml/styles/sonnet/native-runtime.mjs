import { renderSourceFrame } from './runtime-frame.mjs';
import { buildScene } from './scene-build.mjs';
import { configure, metricKey } from './native-measure.mjs';
import { clearCache } from './pretext.mjs';
import { clearLayoutMeasurements } from './sonnetTypographyLayout.mjs';
import { clearShotTrackingCache } from './sonnetShotFrame.mjs';
import { SonnetOutroBlur } from './sonnetOutroBlur.mjs';
import { snapResolutionToTexturePool } from './texture-budget.mjs';
export class NativeRuntime {
  constructor(program, context) {
    this.options = {
      program,
      theme: context.theme,
      tuning: context.tuning,
      staticMode: context.staticMode === true,
      currentTime: { get: () => this.time },
    };
    this.context = Object.assign({}, context, { programSeed: program.seed });
    this.time = 0;
    this.destroyed = false;
    this.activeParagraphIndex = -1;
    this.songSwap = null;
    this.lastWidth = Math.max(context.width, 320);
    this.lastHeight = Math.max(context.height, 240);
    this.renderResolution = snapResolutionToTexturePool(
      this.lastWidth,
      this.lastHeight,
      context.tuning.textureResolution
    );
    this.records = new Map();
    this.mod = () => 1;
    this.sceneCache = {
      ensure: () => null,
      has: (index) => this.records.has(index),
      prune: (index) => {
        for (const [key, record] of Array.from(this.records.entries()))
          if (Math.abs(key - index) > 1) {
            this.destroyRecord(record);
            this.records.delete(key);
          }
      },
      forEach: (callback) => this.records.forEach((value, key) => callback(value.scene, key)),
    };
    this.creditsContainer = null;
    this.outroBlur = null;
  }
  accept(reply) {
    if (this.records.has(reply.index)) return this.records.get(reply.index);
    const measurements = new Map(reply.measurements.map((value) => [value.key, value]));
    const provider = (font, text) => {
      const metric = measurements.get(metricKey(font, text));
      if (!metric)
        throw Error('Sonnet scene is missing prepared native context ' + metricKey(font, text));
      return metric;
    };
    configure({ measurements: reply.measurements, pieces: reply.pieces, discovery: false });
    clearCache();
    clearLayoutMeasurements();
    const record = buildScene(reply.paragraph, this.context, provider);
    record.provider = provider;
    record.index = reply.index;
    if (!this.outroBlur) this.outroBlur = new SonnetOutroBlur(record.pixi);
    this.records.set(reply.index, record);
    return record;
  }
  advanceSongSwap() {}
  frame(time, audioPower, audioBands) {
    this.time = time;
    this.options.audioPower = { get: () => audioPower || 0 };
    const bands = {};
    for (const key of Object.keys(audioBands || {})) bands[key] = { get: () => audioBands[key] };
    this.options.audioBands = bands;
    const active = Array.from(this.records.values()).find(
      (record) => record.index === this.activeIndex(time)
    );
    if (!active) return null;
    this.creditsContainer = active.credits;
    renderSourceFrame.call(this);
    return active;
  }
  activeIndex(time) {
    let index = 0;
    for (let at = this.options.program.paragraphs.length - 1; at >= 0; --at)
      if (time >= this.options.program.paragraphs[at].startTime) {
        index = at;
        break;
      }
    return index;
  }
  destroyRecord(record) {
    clearShotTrackingCache();
    if (this.outroBlur && this.outroBlur.isOn(record.scene)) this.outroBlur.clear();
    for (const filter of record.scene.postProcessFilters) filter.destroy();
    record.scene.container.destroy({ children: true });
    record.credits.destroy({ children: true });
    record.overlay.destroy({ children: true });
  }
  clear() {
    if (this.outroBlur) this.outroBlur.clear();
    for (const record of this.records.values()) this.destroyRecord(record);
    this.records.clear();
    this.destroyed = true;
    this.creditsContainer = null;
  }
}
