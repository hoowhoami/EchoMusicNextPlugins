// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { NativeDioramaScene } from './scene.mjs';
import * as Metrics from './native-measure.mjs';
import { rasterDioramaLine, buildDioramaFontSpec } from './dioramaTextRaster.mjs';
import { layoutDioramaActiveUnits, splitDioramaLyricUnits } from './dioramaSceneLayout.mjs';
import { buildLineGraphemeTimeline } from '../../shared/text/graphemeTiming.mjs';
import { resolveThemeFontStack, resolveThemeFontWeight } from '../sonnet/font-stacks.mjs';
import { clearDioramaSurfaceCache } from './dioramaParticleSurfaces.mjs';
class ProgramPreparation {
  constructor() {
    ((this.scene = new NativeDioramaScene()),
      (this.measurements = /* @__PURE__ */ new Map()),
      this.reset());
  }
  reset() {
    ((this.lines = []),
      (this.context = null),
      (this.pending = null),
      (this.round = 0),
      (this.presentation = 0),
      (this.audio = {}));
  }
  append(lines) {
    if ((this.lines.push(...lines), this.lines.length > 8192))
      throw Error('Diorama source row budget exceeded');
  }
  begin(context, time, presentation = 0, audio = {}) {
    return (
      (this.context = context),
      (this.presentation = presentation),
      (this.audio = audio),
      (this.pending = { time, commit: !0 }),
      this.prepare()
    );
  }
  window(time) {
    let center = 0;
    for (let i = 0; i < this.lines.length && this.lines[i].startTime <= time; i++) center = i;
    const values = this.lines.slice(Math.max(0, center - 3), center + 5);
    if (this.scene.output.state) {
      const state = this.scene.output.state;
      for (const segment of state.seq.segments)
        for (
          let i = Math.max(0, state.globalIndex - segment.globalStart - 3);
          i < Math.min(segment.lines.length, state.globalIndex - segment.globalStart + 5);
          i++
        )
          values.push(segment.lines[i]);
    }
    return values;
  }
  prepare() {
    Metrics.configure({ measurements: Array.from(this.measurements.values()), discovery: !0 });
    const theme = this.context.theme,
      stack = resolveThemeFontStack(theme),
      weight = resolveThemeFontWeight(theme, 700),
      spec = buildDioramaFontSpec(stack, weight);
    for (const line of this.window(this.pending.time))
      if (line.fullText) {
        rasterDioramaLine(line.fullText, stack, weight).texture.dispose();
        const units = splitDioramaLyricUnits(line, buildLineGraphemeTimeline(line)),
          layout = layoutDioramaActiveUnits(line, units, spec);
        if (layout)
          for (const item of layout.units)
            (item.raster.baseTexture.dispose(), item.raster.glowTexture.dispose());
      }
    const requests = Metrics.pendingMeasurements();
    if (requests.length) {
      if (++this.round > 6) throw Error('Diorama font refinement did not converge');
      return { phase: 'native', requests, pieces: [], round: this.round };
    }
    (Metrics.configure({ measurements: Array.from(this.measurements.values()) }),
      this.pending.commit && this.scene.update(this.context, this.lines));
    const frame = this.scene.draw(this.pending.time, this.presentation, this.audio);
    return (
      (this.pending = null),
      (this.round = 0),
      {
        phase: 'frame',
        paragraphCount: this.lines.length,
        cachedParagraphs: frame.ops.length,
        frame,
      }
    );
  }
  accept(measurements) {
    for (const v of measurements) {
      if (!Number.isFinite(v.advance)) throw Error('Invalid Diorama native text measurement');
      this.measurements.set(v.key, Object.assign({}, v, { width: v.advance }));
    }
    if (this.measurements.size > 32768) throw Error('Diorama native metric cache exceeds budget');
    return this.prepare();
  }
  frame(time, presentation = 0, audio = {}) {
    return (
      (this.presentation = presentation),
      (this.audio = audio),
      (this.pending = { time, commit: !1 }),
      this.prepare()
    );
  }
  updateTuning(tuning, time, presentation, audio) {
    return (
      (this.context.tuning = tuning),
      (this.scene.context.tuning = tuning),
      this.frame(time, presentation, audio)
    );
  }
  destroy() {
    (this.scene.destroy(), this.measurements.clear(), clearDioramaSurfaceCache());
  }
}
export { ProgramPreparation };
