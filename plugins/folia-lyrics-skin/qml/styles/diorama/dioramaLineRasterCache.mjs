// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key != 'symbol' ? key + '' : key, value);
import { requestAnimationFrame, cancelAnimationFrame } from './environment.mjs';
import { rasterDioramaLine } from './dioramaTextRaster.mjs';
import { NEIGHBOR_RASTER_BUDGET } from './dioramaSceneConstants.mjs';
class DioramaLineRasterCache {
  constructor() {
    __publicField(this, 'rasters', /* @__PURE__ */ new Map());
    __publicField(this, 'font', '');
    __publicField(this, 'epoch', -1);
  }
  get(index) {
    return this.rasters.get(index);
  }
  sync({ visibleLines, globalIndex, fontSpec, fontStack, fontWeight, linesEpoch, onChange }) {
    const cache = this.rasters;
    (this.font !== fontSpec || this.epoch !== linesEpoch) &&
      (cache.forEach((raster) => raster.texture.dispose()),
      cache.clear(),
      (this.font = fontSpec),
      (this.epoch = linesEpoch));
    const wanted = /* @__PURE__ */ new Set();
    visibleLines.forEach(({ index, line }) => {
      line != null && line.fullText && index !== globalIndex && wanted.add(index);
    });
    let changed = !1;
    cache.forEach((raster, index) => {
      wanted.has(index) || (raster.texture.dispose(), cache.delete(index), (changed = !0));
    });
    const missing = [];
    if (
      (wanted.forEach((index) => {
        cache.has(index) || missing.push(index);
      }),
      missing.length === 0)
    ) {
      changed && onChange();
      return;
    }
    let cancelled = !1,
      rafId = 0,
      qi = 0;
    const buildBatch = () => {
      var _a;
      if (!cancelled) {
        for (let n = 0; n < NEIGHBOR_RASTER_BUDGET && qi < missing.length; n += 1, qi += 1) {
          const entry = visibleLines.find((e) => e.index === missing[qi]);
          (_a = entry == null ? void 0 : entry.line) != null &&
            _a.fullText &&
            !cache.has(missing[qi]) &&
            cache.set(missing[qi], rasterDioramaLine(entry.line.fullText, fontStack, fontWeight));
        }
        (onChange(), qi < missing.length && (rafId = requestAnimationFrame(buildBatch)));
      }
    };
    return (
      (rafId = requestAnimationFrame(buildBatch)),
      () => {
        ((cancelled = !0), rafId && cancelAnimationFrame(rafId));
      }
    );
  }
  ensureOutgoing(transitionOutgoingIndex, visibleLines, fontStack, fontWeight) {
    var _a;
    if (!this.rasters.has(transitionOutgoingIndex)) {
      const leaving = visibleLines.find((entry) => entry.index === transitionOutgoingIndex);
      (_a = leaving == null ? void 0 : leaving.line) != null &&
        _a.fullText &&
        this.rasters.set(
          transitionOutgoingIndex,
          rasterDioramaLine(leaving.line.fullText, fontStack, fontWeight)
        );
    }
  }
  disposeAll() {
    (this.rasters.forEach((raster) => raster.texture.dispose()), this.rasters.clear());
  }
}
export { DioramaLineRasterCache };
