// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { clampInto, fitScale, shouldWrap } from './lineWrap.mjs';
import { awayDrift, heldDrift } from './lineClearance.mjs';
import {
  clamp01,
  decayAmount,
  easeInOutCubic,
  easeInOutSine,
  flightPoint,
  flightProgress,
  GATHER,
  GATHER_LEAD,
  LEAD,
  lerp,
  lerpPoint,
  MAX_LAG,
  ORBIT,
  resolveLinePhase,
  resolveWindowCursor,
  SLIDE,
  smooth,
  TRACK_TIME,
} from './windowTiming.mjs';
import { awayOf, CROSSED_CLEARANCE, fixedSlot, sameSlot, stackX } from './windowSlots.mjs';
const WINDOW_REACH = 3;
const toWorld = (transform, point) => {
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  return {
    x: transform.x + (point.x * cos - point.y * sin) * transform.scale,
    y: transform.y + (point.x * sin + point.y * cos) * transform.scale,
  };
};
const createWindowGeometry = ({
  options,
  lineCount,
  band,
  columnCap,
  maxWidthOf,
  nextAlpha,
  lineOf,
}) => {
  var _a;
  const { height, region, heroPx, typography, decay } = options;
  const fontH = heroPx / height;
  const driftScale = (_a = options.drift) != null ? _a : 1;
  const typographyAt = (c) =>
    options.typographyOf
      ? options.typographyOf(Math.max(0, Math.min(lineCount - 1, c)))
      : typography;
  const settle = (index, kind, orient, scale) => {
    const flow = lineOf(index).flow[orient];
    const budget = orient === 1 ? columnCap : maxWidthOf(kind);
    const wrap = shouldWrap(flow, budget, scale) ? 1 : 0;
    const variant = flow[wrap];
    return { wrap, variant, scale: scale * fitScale(variant.along, budget, scale) };
  };
  const acrossOf = (index, kind, orient, scale) => {
    if (index < 0 || index >= lineCount) return fontH * scale;
    const settled = settle(index, kind, orient, scale);
    return (settled.variant.across / height) * settled.scale;
  };
  const windowShift = (current, kind) => {
    if (current < 0 || current >= lineCount) return { x: 0, y: 0 };
    const orient = kind === 'vertical' ? 1 : 0;
    const { variant, scale } = settle(current, kind, orient, 1);
    const w = (variant.inkWidth / height) * scale;
    const h = (variant.inkHeight / height) * scale;
    return {
      x: clampInto(region.cx, w, band.left, band.right) - region.cx,
      y: clampInto(region.cy, h, band.top, band.bottom) - region.cy,
    };
  };
  const slotCache = /* @__PURE__ */ new Map();
  const slotOf = (index, current, kind) => {
    const key = `${index}|${current}|${kind}`;
    const cached = slotCache.get(key);
    if (cached) return cached;
    const view = lineOf(index);
    const clamped = Math.max(-2, Math.min(2, index - current));
    const shift = windowShift(current, kind);
    let slot;
    let wrap = null;
    if (kind === 'crossed' && clamped !== 0) {
      const base = view.placements.get(clamped);
      const baseOrient = base.orient >= 0.5 ? 1 : 0;
      const sign = base.dy < 0 ? -1 : 1;
      const currentHalf =
        current >= 0 && current < lineCount
          ? (() => {
              const settled = settle(current, kind, 0, 1);
              return ((settled.variant.inkHeight / height) * settled.scale) / 2;
            })()
          : fontH / 2;
      const gap = fontH * CROSSED_CLEARANCE;
      const centerY = region.cy + shift.y;
      const room =
        sign < 0
          ? centerY - currentHalf - gap - band.top
          : band.bottom - (centerY + currentHalf + gap);
      const flow = view.flow[baseOrient];
      const budget = baseOrient === 1 ? columnCap : maxWidthOf(kind);
      const tilt = Math.abs(base.rotation) + 0.03;
      const heightOf = (w2, s) =>
        ((flow[w2].inkHeight * Math.cos(tilt) + flow[w2].inkWidth * Math.sin(tilt)) / height) *
        s *
        fitScale(flow[w2].along, budget, s);
      let scale = base.scale;
      let w = settle(index, kind, baseOrient, scale).wrap ? 1 : 0;
      if (baseOrient === 1 && room > 0) {
        if (w === 0 && flow[1].lines > 1 && heightOf(0, scale) > room) w = 1;
        const tall = heightOf(w, scale);
        if (tall > room) scale = Math.max(base.scale * 0.5, scale * (room / tall));
      }
      wrap = w;
      const clearance = currentHalf + gap + heightOf(w, scale) / 2;
      const dy = sign * Math.max(Math.abs(base.dy), clearance);
      const wider =
        baseOrient === 1 ? Math.max(0, acrossOf(index, kind, 1, scale) - fontH * scale) / 2 : 0;
      slot = __spreadProps(__spreadValues({}, base), {
        scale,
        dy,
        dx: base.dx + Math.sign(base.dx) * wider,
      });
    } else {
      const orient = kind === 'vertical' ? 1 : 0;
      slot = fixedSlot(
        kind === 'crossed' ? 'horizontal' : kind,
        clamped,
        region,
        fontH,
        nextAlpha,
        (offset, scale) =>
          acrossOf(offset === clamped ? index : current + offset, kind, orient, scale)
      );
    }
    const result = __spreadProps(__spreadValues({}, slot), {
      dx: slot.dx + shift.x,
      dy: slot.dy + shift.y,
      wrap: wrap != null ? wrap : settle(index, kind, slot.orient >= 0.5 ? 1 : 0, slot.scale).wrap,
    });
    slotCache.set(key, result);
    return result;
  };
  const firstLiveChange = (time, current) => {
    let c = current;
    while (c >= 0 && options.lines[c].startTime - LEAD + MAX_LAG + SLIDE + TRACK_TIME > time)
      c -= 1;
    return c + 1;
  };
  const lineTransform = (index, time) => {
    const view = lineOf(index);
    const { current } = resolveWindowCursor(options.lines, time);
    const first = firstLiveChange(time, current);
    const base = first - 1;
    const initialKind = typographyAt(base);
    const initial = slotOf(index, base, initialKind);
    let dx = initial.dx,
      dy = initial.dy,
      scale = initial.scale,
      rotation = initial.rotation;
    let alpha = initial.alpha,
      orient = initial.orient,
      wrap = initial.wrap;
    let latest = null;
    let restOrient = initial.orient;
    let restWrap = initial.wrap;
    const moves = [];
    let widthCap = maxWidthOf(initialKind);
    let jitterOn = initialKind === 'crossed' ? 0 : 1;
    let awayX = stackX(initialKind) * awayOf(index, base, initialKind);
    let awayY = (1 - stackX(initialKind)) * awayOf(index, base, initialKind);
    let hero = index === base ? 1 : 0;
    const last = Math.min(lineCount - 1, current);
    for (let c = first; c <= last; c += 1) {
      const beforeKind = typographyAt(c - 1);
      const afterKind = typographyAt(c);
      const before = slotOf(index, c - 1, beforeKind);
      const after = slotOf(index, c, afterKind);
      const kindChanged = beforeKind !== afterKind;
      if (sameSlot(before, after) && !kindChanged) continue;
      const { phase, start } = resolveLinePhase(options.lines, c, index - c, time);
      const k = easeInOutSine(phase);
      if (kindChanged) {
        widthCap += (maxWidthOf(afterKind) - maxWidthOf(beforeKind)) * k;
        jitterOn += ((afterKind === 'crossed' ? 0 : 1) - (beforeKind === 'crossed' ? 0 : 1)) * k;
      }
      const awayBefore = awayOf(index, c - 1, beforeKind);
      const awayAfter = awayOf(index, c, afterKind);
      awayX += (stackX(afterKind) * awayAfter - stackX(beforeKind) * awayBefore) * k;
      awayY += ((1 - stackX(afterKind)) * awayAfter - (1 - stackX(beforeKind)) * awayBefore) * k;
      hero += ((index === c ? 1 : 0) - (index === c - 1 ? 1 : 0)) * k;
      const fade =
        after.alpha < before.alpha
          ? easeInOutCubic(phase / 0.6)
          : after.alpha > before.alpha
            ? easeInOutCubic((phase - 0.4) / 0.6)
            : k;
      dx += (after.dx - before.dx) * k;
      dy += (after.dy - before.dy) * k;
      scale += (after.scale - before.scale) * k;
      rotation += (after.rotation - before.rotation) * k;
      alpha += (after.alpha - before.alpha) * fade;
      orient += (after.orient - before.orient) * phase;
      wrap += (after.wrap - before.wrap) * k;
      if (phase > 0) latest = { before, after, phase, start, kind: afterKind };
      if (phase >= 1) {
        restOrient = after.orient;
        restWrap = after.wrap;
        moves.length = 0;
      } else if (phase > 0) {
        moves.push({
          toOrient: after.orient,
          toWrap: after.wrap,
          phase,
          fly:
            options.alwaysFly === true || afterKind === 'crossed' || before.orient !== after.orient,
        });
      }
    }
    const o = clamp01(orient);
    const w = clamp01(wrap);
    const [hSingle, hWrapped] = view.flow[0];
    const [vSingle, vWrapped] = view.flow[1];
    const fitH = lerp(
      fitScale(hSingle.along, widthCap, scale),
      fitScale(hWrapped.along, widthCap, scale),
      w
    );
    const fitV = lerp(
      fitScale(vSingle.along, columnCap, scale),
      fitScale(vWrapped.along, columnCap, scale),
      w
    );
    const fitted = scale * lerp(fitH, fitV, o);
    const jitter = jitterOn * view.jitter * region.w * clamp01((1 - scale) / 0.5);
    const baseX = region.cx + dx + jitter * (1 - orient);
    const baseY = region.cy + dy + jitter * 0.5 * orient;
    const alongH = (lerp(hSingle.inkWidth, hWrapped.inkWidth, w) / height) * fitted;
    const alongV = (lerp(vSingle.inkHeight, vWrapped.inkHeight, w) / height) * fitted;
    const x =
      baseX + (clampInto(baseX, alongH, band.left, band.right) - baseX) * (1 - o) * jitterOn;
    const y = baseY + (clampInto(baseY, alongV, band.top, band.bottom) - baseY) * o * jitterOn;
    const age = time - view.line.startTime;
    const m = view.motionPhase;
    const { x: vx, y: vy } = view.velocity;
    const orbitX = Math.sin(time * 0.52 + m) * ORBIT;
    const orbitY = Math.cos(time * 0.41 + m * 1.3) * ORBIT * 0.7;
    const held = clamp01(hero);
    const driftX = lerp(
      awayDrift((vx * age + orbitX) * driftScale, awayX),
      (heldDrift(vx, vy, age, 0) + orbitX) * driftScale,
      held
    );
    const driftY = lerp(
      awayDrift((vy * age + orbitY) * driftScale, awayY),
      (heldDrift(vx, vy, age, 1) + orbitY) * driftScale,
      held
    );
    const settledOrient = latest ? latest.after.orient : initial.orient;
    const settledWrap = latest ? latest.after.wrap : initial.wrap;
    return {
      current,
      x: (x + driftX) * height,
      y: (y + driftY) * height,
      scale: fitted * (1 + 0.025 * Math.sin(time * 0.43 + m)),
      rotation: rotation + 0.03 * Math.sin(time * 0.23 + m * 0.7),
      alpha: clamp01(alpha),
      fromOrient: latest ? latest.before.orient : settledOrient,
      toOrient: settledOrient,
      fromWrap: latest ? latest.before.wrap : settledWrap,
      toWrap: settledWrap,
      wrap: w,
      orient: o,
      phase: latest ? latest.phase : 1,
      // 纵横交错时每次换槽位都飞；另两种排版只在朝向变化时飞。
      fly:
        latest !== null &&
        latest.phase < 1 &&
        (options.alwaysFly === true ||
          latest.kind === 'crossed' ||
          latest.before.orient !== latest.after.orient),
      slideStart: latest ? latest.start : Number.NEGATIVE_INFINITY,
      restOrient,
      restWrap,
      moves,
    };
  };
  const glyphLocal = (view, glyph, time, transform) => {
    const at = (orient, wrap) =>
      view.flow[orient >= 0.5 ? 1 : 0][wrap >= 0.5 ? 1 : 0].points[glyph.index];
    let point = at(transform.restOrient, transform.restWrap);
    let orientation = transform.restOrient;
    let flying = 0;
    for (const move of transform.moves) {
      const target = at(move.toOrient, move.toWrap);
      if (move.fly) {
        const s = flightProgress(glyph.flight, move.phase);
        point = flightPoint(glyph.flight, point, target, s);
        orientation = lerp(orientation, move.toOrient, s);
        flying = Math.max(flying, Math.sin(Math.PI * s));
      } else {
        const k = easeInOutSine(move.phase);
        point = lerpPoint(point, target, k);
        orientation = lerp(orientation, move.toOrient, k);
      }
    }
    let x = point.x;
    let y = point.y;
    let rotation = glyph.vRotation * orientation + glyph.flight.spin * flying;
    const pulse = 1 - 0.28 * flying;
    const gather = smooth((time - (view.line.startTime - LEAD - GATHER_LEAD)) / GATHER);
    const scatter = (1 - gather) ** 2 * decay.strength;
    x += glyph.scatter.x * heroPx * scatter;
    y += glyph.scatter.y * heroPx * scatter;
    const amount = decayAmount(decay, glyph.timing.start, time) * glyph.drift.speed;
    x += glyph.drift.dx * heroPx * amount;
    y += glyph.drift.dy * heroPx * amount;
    rotation += glyph.drift.spin * amount * 0.18;
    const breath = heroPx * 0.022 * Math.min(1, decay.strength + 0.3);
    x += Math.sin(time * 0.9 + glyph.phase) * breath;
    y += Math.cos(time * 1.13 + glyph.phase * 1.7) * breath;
    return { x, y, rotation, gather, flying, scale: glyph.scale * pulse };
  };
  const activeRange = (time) => {
    const { current } = resolveWindowCursor(options.lines, time);
    const first = firstLiveChange(time, current);
    return {
      current,
      low: Math.max(0, Math.min(current, first) - WINDOW_REACH),
      high: Math.min(lineCount - 1, Math.max(current, 0) + WINDOW_REACH),
    };
  };
  return { fontH, lineTransform, glyphLocal, activeRange };
};
export { createWindowGeometry, toWorld };
