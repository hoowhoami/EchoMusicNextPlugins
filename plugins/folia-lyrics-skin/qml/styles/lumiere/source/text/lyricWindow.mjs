// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { flatMap } from '../../../../shared/text/compat.mjs';
import { compressLight, lightAt } from '../light/rig.mjs';
import { hexOf, mixRgb, WHITE } from '../color.mjs';
import { createTextMeasurer, frameBand } from './lineWrap.mjs';
import { flashEnvelope } from './reveal.mjs';
import { MAX_WORD_SCALE } from './wordStyle.mjs';
import { keywordColorsOf, lineTimingOf } from './windowLines.mjs';
import { KEYWORD_HALO_GAIN } from './keywordColors.mjs';
import {
  clamp01,
  decayAmount,
  DISSOLVE_FROM,
  DISSOLVE_SPAN,
  lerp,
  lerpPoint,
  LIGHT_UP,
  resolveSpotX,
  SLIDE,
  smooth,
  TRACK_SAMPLES,
  TRACK_TIME,
} from './windowTiming.mjs';
import { createWindowLineStore } from './windowLineStore.mjs';
import { createWindowGeometry, toWorld } from './windowGeometry.mjs';
import { createWindowProtection } from './windowProtection.mjs';
import {
  decayAmount as decayAmount2,
  flightPoint,
  flightProgress,
  resolveLinePhase,
  resolveSpotX as resolveSpotX2,
  resolveWindowCursor,
} from './windowTiming.mjs';
import { freePlacements } from './windowSlots.mjs';
const createLyricWindow = (pixi, options) => {
  var _a;
  const { height, heroPx, decay } = options;
  const view = new pixi.Container();
  const trackLayer = new pixi.Graphics();
  const halos = new pixi.Container();
  const glyphLayer = new pixi.Container();
  const stars = new pixi.Container();
  const spots = new pixi.Container();
  const trackHolder = new pixi.Container({ isRenderGroup: true });
  trackHolder.addChild(trackLayer);
  view.addChild(spots, trackHolder, halos, glyphLayer, stars);
  const lineCount = options.lines.length;
  const nextAlpha = options.neighbors >= 2 ? 0.95 : 0;
  const band = frameBand(options.width, height);
  const columnCap = (band.bottom - band.top) * height;
  const maxWidthOf = (kind) => (band.right - band.left) * height * (kind === 'crossed' ? 0.9 : 1);
  const measurer = createTextMeasurer(
    options.font,
    options.weight,
    (_a = options.letterSpacing) != null ? _a : 0
  );
  const KEYWORDS = options.keywords && options.keywords.length > 0 ? options.keywords : void 0;
  const lines = createWindowLineStore({
    pixi,
    options,
    lineCount,
    measurer,
    limits: { horizontal: maxWidthOf('horizontal'), vertical: columnCap },
    keywords: KEYWORDS,
    nextAlpha,
    glyphLayer,
    halos,
    stars,
    spots,
  });
  const { metas, lineOf } = lines;
  const geometry = createWindowGeometry({
    options,
    lineCount,
    band,
    columnCap,
    maxWidthOf,
    nextAlpha,
    lineOf,
  });
  const { lineTransform, glyphLocal, activeRange } = geometry;
  const protection = createWindowProtection({ lines: options.lines, heroPx, lineOf });
  const frameTransforms = new Array(lineCount);
  let tracksDrawn = false;
  const drawTracks = (index, view2, time, transform, alpha, color) => {
    if (alpha <= 3e-3 || !Number.isFinite(transform.slideStart)) return;
    if (time > transform.slideStart + SLIDE + TRACK_TIME) return;
    const from = Math.max(transform.slideStart, time - TRACK_TIME);
    if (time - from < 1e-3) return;
    const samples = Array.from(
      { length: TRACK_SAMPLES + 1 },
      (_, i) => from + ((time - from) * i) / TRACK_SAMPLES
    );
    const transforms = samples.map((sample) => lineTransform(index, sample));
    if (!transforms.some((sample) => sample.fly)) return;
    const width = 1.2;
    tracksDrawn = true;
    view2.glyphs.forEach((glyph) => {
      if (glyph.blank) return;
      let length = 0;
      let previous = null;
      let fontPx = heroPx;
      let flying = 0;
      samples.forEach((sample, i) => {
        const local = glyphLocal(view2, glyph, sample, transforms[i]);
        const world = toWorld(transforms[i], local);
        fontPx = heroPx * transforms[i].scale * local.scale;
        flying = local.flying;
        const wobble = Math.sin(i * 0.9 + glyph.flight.wobble + sample * 6) * heroPx * 0.02;
        const x = world.x + wobble;
        const y = world.y - wobble * 0.6;
        if (previous) {
          length += Math.hypot(x - previous.x, y - previous.y);
          trackLayer.lineTo(x, y);
        } else {
          trackLayer.moveTo(x, y);
        }
        previous = { x, y };
      });
      const strength = Math.min(1, length / (heroPx * 3));
      const head = previous;
      const shield = head ? protection.shield(index, head.x, head.y, fontPx / 2, flying) : 1;
      if (strength > 0.05)
        trackLayer.stroke({
          width,
          color,
          alpha: alpha * 0.55 * strength * shield,
          cap: 'round',
          join: 'round',
        });
      else trackLayer.beginPath();
    });
  };
  const update = (frame) => {
    const { time, beams, litColor, unlitColor, unlitAlpha, intensity } = frame;
    trackLayer.visible = frame.hideTrails !== true;
    if (tracksDrawn) {
      trackLayer.clear();
      tracksDrawn = false;
    }
    if (KEYWORDS) lines.refreshKeywordTints(litColor);
    const litHex = hexOf(litColor);
    const starHex = hexOf(mixRgb(litColor, WHITE, 0.5));
    const { low, high, current: cursor } = activeRange(time);
    lines.syncBuilt(low, high);
    for (let index = low; index <= high; index += 1)
      frameTransforms[index] = lineTransform(index, time);
    protection.build(time, cursor, low, frameTransforms);
    for (let index = low; index <= high; index += 1) {
      const view2 = lines.viewAt(index);
      const transform = frameTransforms[index];
      const { current, scale } = transform;
      const lineAlpha = transform.alpha * intensity;
      const visible = lineAlpha > 3e-3;
      view2.holder.visible = visible;
      view2.haloLayer.visible = visible;
      view2.starLayer.visible = visible;
      view2.holder.position.set(transform.x, transform.y);
      view2.holder.scale.set(scale);
      view2.holder.rotation = transform.rotation;
      const passed = index < current || (index === current && time > view2.line.endTime);
      const passedAge = passed ? time - view2.line.endTime : 0;
      const passedDim = passed ? lerp(1, 0.75, clamp01(passedAge / 2.5)) : 1;
      const lineFontPx = heroPx * scale;
      if (trackLayer.visible)
        drawTracks(index, view2, time, transform, lineAlpha * passedDim, litHex);
      for (const glyph of view2.glyphs) {
        if (glyph.blank) continue;
        if (!visible) {
          glyph.glyph.visible = false;
          glyph.halo.visible = false;
          glyph.star.visible = false;
          continue;
        }
        const local = glyphLocal(view2, glyph, time, transform);
        glyph.glyph.position.set(local.x, local.y);
        glyph.glyph.rotation = local.rotation;
        glyph.glyph.scale.set(local.scale / MAX_WORD_SCALE);
        const fontPx = lineFontPx * local.scale;
        const { x: gx, y: gy } = toWorld(transform, local);
        const lit = smooth(
          (time - glyph.timing.start) / Math.max(glyph.timing.end - glyph.timing.start, LIGHT_UP)
        );
        const flash = flashEnvelope(glyph.timing, time, 0.45);
        const illumination = compressLight(lightAt(beams, gx / height, gy / height));
        const heat = clamp01(illumination * 1.3 + flash * 0.2);
        const dissolve =
          1 -
          clamp01(
            (decayAmount(decay, glyph.timing.start, time) * glyph.drift.speed - DISSOLVE_FROM) /
              DISSOLVE_SPAN
          );
        const shield = protection.shield(index, gx, gy, fontPx / 2, local.flying);
        const glyphAlpha = lineAlpha * passedDim * dissolve * (0.35 + 0.65 * local.gather) * shield;
        glyph.glyph.visible = true;
        const revealed = Math.min(1, unlitAlpha + illumination * 0.45 + local.flying * 0.4);
        glyph.glyph.alpha =
          glyphAlpha *
          (revealed * (1 - lit) + lit * Math.min(1, 0.55 + 0.4 * heat + 0.3 * local.flying));
        const tints = glyph.tints;
        const hot = mixRgb(
          tints ? tints.glyph : litColor,
          WHITE,
          clamp01(0.08 * illumination + 0.1 * flash + 0.25 * local.flying)
        );
        const cold = mixRgb(unlitColor, litColor, illumination * 0.35);
        glyph.glyph.tint = hexOf(mixRgb(cold, hot, lit));
        const haloAlpha =
          glyphAlpha *
          lit *
          (0.03 + 0.14 * illumination + 0.08 * flash) *
          (tints ? KEYWORD_HALO_GAIN : 1);
        glyph.halo.visible = true;
        if (haloAlpha > 3e-3) {
          glyph.halo.position.set(gx, gy);
          const size = fontPx * (2.2 + 0.8 * illumination);
          glyph.halo.width = size;
          glyph.halo.height = size * 0.9;
          glyph.halo.alpha = haloAlpha;
          glyph.halo.tint = tints ? tints.halo : litHex;
        } else {
          glyph.halo.scale.set(0);
        }
        const starAlpha = lineAlpha * flash * 0.55 * shield;
        glyph.star.visible = true;
        if (starAlpha > 3e-3) {
          const star = glyph.starShape;
          glyph.star.position.set(gx + fontPx * star.dx, gy + fontPx * star.dy);
          glyph.star.rotation = star.rotation * (1 + (1 - flash) * 0.6);
          const size = fontPx * star.size * (0.8 + 0.5 * flash);
          glyph.star.width = size;
          glyph.star.height = size;
          glyph.star.alpha = starAlpha;
          glyph.star.tint = tints ? tints.star : starHex;
        } else {
          glyph.star.scale.set(0);
        }
      }
      const spotAlpha = visible
        ? lineAlpha *
          smooth((time - view2.singStart + 0.3) / 0.3) *
          (1 - smooth((time - view2.singEnd) / 0.6))
        : 0;
      view2.spot.visible = spotAlpha > 3e-3;
      if (view2.spot.visible) {
        const vertical = transform.toOrient >= 0.5;
        const spotOf = (wrap) => {
          const path = view2.flow[vertical ? 1 : 0][wrap].spots;
          return {
            x: resolveSpotX(
              view2.glyphs.map((glyph) => ({ timing: glyph.timing, center: path[glyph.index].x })),
              time
            ),
            y: resolveSpotX(
              view2.glyphs.map((glyph) => ({ timing: glyph.timing, center: path[glyph.index].y })),
              time
            ),
          };
        };
        const local =
          transform.wrap <= 0
            ? spotOf(0)
            : transform.wrap >= 1
              ? spotOf(1)
              : lerpPoint(spotOf(0), spotOf(1), transform.wrap);
        const position = toWorld(transform, local);
        const size = lineFontPx * 5;
        view2.spot.position.set(position.x, position.y);
        view2.spot.rotation = transform.rotation;
        view2.spot.width = size * (vertical ? 1 : 1.6);
        view2.spot.height = size * (vertical ? 1.6 : 1);
        view2.spot.alpha = 0.07 * spotAlpha;
        view2.spot.tint = litHex;
      }
    }
    lines.prebuild(high);
  };
  return {
    view,
    update,
    glyphTimes: (lineIndex) => {
      const meta = metas[lineIndex];
      if (!meta) return [];
      return flatMap(meta.graphemes, (char, glyphIndex) => {
        var _a2;
        return char.trim().length === 0
          ? []
          : [
              {
                glyphIndex,
                start: ((_a2 = lineTimingOf(meta).timings[glyphIndex]) != null
                  ? _a2
                  : { start: meta.line.startTime }
                ).start,
              },
            ];
      });
    },
    glyphAnchor: (lineIndex, glyphIndex, time) => {
      const transform = lineTransform(lineIndex, time);
      const view2 = lineOf(lineIndex);
      const local = glyphLocal(view2, view2.glyphs[glyphIndex], time, transform);
      const world = toWorld(transform, local);
      return { x: world.x, y: world.y, fontPx: heroPx * transform.scale * local.scale };
    },
    lineAnchor: (lineIndex, time) => {
      const transform = lineTransform(lineIndex, time);
      return { x: transform.x, y: transform.y, scale: transform.scale, alpha: transform.alpha };
    },
    glyphKeyword: (lineIndex, glyphIndex) => {
      var _a2, _b, _c;
      const meta = metas[lineIndex];
      if (!meta || ((_a2 = meta.graphemes[glyphIndex]) != null ? _a2 : '').trim().length === 0)
        return null;
      return (_c = (_b = keywordColorsOf(meta, KEYWORDS)) == null ? void 0 : _b[glyphIndex]) != null
        ? _c
        : null;
    },
    destroy: () => {
      lines.releaseAll();
      view.destroy({ children: true, context: true });
    },
  };
};
export {
  createLyricWindow,
  decayAmount2 as decayAmount,
  flightPoint,
  flightProgress,
  freePlacements,
  resolveLinePhase,
  resolveSpotX2 as resolveSpotX,
  resolveWindowCursor,
};
