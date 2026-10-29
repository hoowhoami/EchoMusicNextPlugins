// Source pretext layout runs only in the Worker. Unmeasured fallback output never publishes.
import { buildPendoloTextLayout } from './text-layout.mjs';
import {
  resolvePendoloSubtitleTracks,
  sumPendoloSubtitleTrackHeights,
} from './subtitle-tracks.mjs';
import { calculatePendoloWheelLayout } from './geometry.mjs';
import { geometry, resolveSettings } from './kernel.mjs';
import { configure, pending, usedKeys, getMeasureContext, normalize } from './native-measure.mjs';
import { clearCache } from './pretext.mjs';
import { splitLyricGraphemes } from '../../shared/text/graphemeTiming.mjs';
export class LayoutJob {
  constructor(request, cache) {
    this.request = request;
    this.widths = cache || new Map();
    this.round = 0;
    this.touched = new Set();
  }
  accept(values) {
    for (const v of values) {
      if (!Number.isFinite(v.width) || v.width < 0) throw new Error('Invalid Pendolo native width');
      this.widths.set(v.key, v.width);
    }
    if (this.widths.size > 16384) {
      for (const key of Array.from(this.widths.keys())) {
        if (!this.touched.has(key)) this.widths.delete(key);
        if (this.widths.size <= 16384) break;
      }
    }
    if (this.widths.size > 16384) throw new Error('Pendolo native width budget exceeded');
  }
  step() {
    if (++this.round > 32) throw new Error('Pendolo layout exceeded 32 native refinement rounds');
    clearCache();
    configure({
      pieces: this.request.pieces,
      widths: Array.from(this.widths, ([key, width]) => ({ key, width })),
    });
    const { width, height, target, items, count, settings } = this.request,
      config = resolveSettings(settings),
      t = config.tuning,
      g = geometry(width, height, t),
      lines = new Array(count),
      heights = new Array(count),
      held = new Map();
    const fontPx = Math.round(28 * config.lyricsFontScale),
      focalWidth = g.availableTextWidth / t.activeScale;
    const spec = (px, weight, subtitle, spaced) =>
      weight + ' ' + px + 'px ' + (subtitle ? 'subtitle' : 'body') + (spaced ? '-spaced' : '');
    let units = 0;
    for (const entry of items) {
      const line = entry.prepared.line;
      units +=
        line.fullText.length + (line.translation || '').length + (line.romanization || '').length;
      if (line.fullText.length > 8192 || units > 262144)
        throw new Error('Pendolo visible text budget exceeded');
      lines[entry.position] = line;
      const text = normalize(line.fullText);
      const main = buildPendoloTextLayout(
        text,
        spec(fontPx, config.fontWeight, false, false),
        focalWidth,
        Math.round(fontPx * 1.2)
      );
      const focalTracks = resolvePendoloSubtitleTracks(line, {
        mode: config.subtitleContentMode,
        hidden: config.hideTranslationSubtitle,
        focal: true,
        subtitleFontScale: config.subtitleFontScale,
      });
      heights[entry.position] =
        (main.height +
          sumPendoloSubtitleTrackHeights(focalTracks, (track) => {
            const r = buildPendoloTextLayout(
              normalize(track.text),
              spec(
                track.fontPx,
                config.subtitleFontWeight === null
                  ? track.fontWeightFallback
                  : config.subtitleFontWeight,
                true,
                true
              ),
              focalWidth,
              track.lineHeightPx
            ).height;
            return r;
          })) *
        t.activeScale;
      held.set(entry.position, { entry, text });
    }
    if (pending().length) {
      this.touched = usedKeys();
      return { phase: 'measure', round: this.round, requests: pending() };
    }
    const wheel = calculatePendoloWheelLayout(
      lines,
      target,
      0,
      width,
      height,
      t,
      Math.min(width, height) * 0.06,
      heights
    );
    const result = [];
    for (const item of wheel) {
      const { entry, text } = held.get(item.index),
        px = Math.round((item.isActive ? 28 : 22) * config.lyricsFontScale),
        mainSpec = spec(px, config.fontWeight, false, !item.isActive),
        maxWidth = g.availableTextWidth / item.scale;
      const main = buildPendoloTextLayout(
        text,
        mainSpec,
        maxWidth,
        item.isActive ? Math.round(px * 1.2) : px * 1.5
      );
      if (item.isActive && !pending().length) {
        const context = getMeasureContext();
        context.font = mainSpec;
        for (const row of main.lines) {
          const chars = splitLyricGraphemes(row.text),
            offsets = [0];
          let prefix = '';
          for (const ch of chars) {
            prefix += ch;
            offsets.push(context.measureText(prefix).width);
          }
          row.offsets = offsets;
        }
      }
      const tracks = resolvePendoloSubtitleTracks(item.line, {
        mode: config.subtitleContentMode,
        hidden: config.hideTranslationSubtitle,
        focal: item.isActive,
        subtitleFontScale: config.subtitleFontScale,
      }).map((track) => {
        const weight =
          config.subtitleFontWeight === null ? track.fontWeightFallback : config.subtitleFontWeight;
        return Object.assign({}, track, {
          fontWeight: weight,
          layout: buildPendoloTextLayout(
            normalize(track.text),
            spec(track.fontPx, weight, true, true),
            maxWidth,
            track.lineHeightPx
          ),
        });
      });
      const blockHeight =
        main.height + sumPendoloSubtitleTrackHeights(tracks, (track) => track.layout.height);
      result.push(
        Object.assign({}, item, {
          line: undefined,
          prepared: entry.prepared,
          sourceIndex: entry.sourceIndex,
          main,
          tracks,
          blockHeight,
          fontPx: px,
          fontWeight: config.fontWeight,
          maxWidth,
        })
      );
    }
    this.touched = usedKeys();
    const requests = pending();
    if (requests.length) {
      let bytes = 0;
      for (const v of requests) bytes += v.text.length * 2;
      if (requests.length > 16384 || bytes > 8 * 1024 * 1024)
        throw new Error('Pendolo measurement discovery budget exceeded');
      return { phase: 'measure', round: this.round, requests };
    }
    return { phase: 'complete', items: result };
  }
}
export function requestedTexts(items, settings) {
  const config = resolveSettings(settings),
    texts = new Set();
  for (const item of items) {
    texts.add(normalize(item.prepared.line.fullText));
    for (const track of resolvePendoloSubtitleTracks(item.prepared.line, {
      mode: config.subtitleContentMode,
      hidden: config.hideTranslationSubtitle,
      focal: true,
      subtitleFontScale: config.subtitleFontScale,
    }))
      texts.add(normalize(track.text));
  }
  return Array.from(texts);
}
