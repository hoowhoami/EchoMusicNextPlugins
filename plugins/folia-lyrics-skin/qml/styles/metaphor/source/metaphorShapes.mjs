// Copyright (c) 2026 chthollyphile. Derived from Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935; AGPL-3.0-only.
// Source: src/components/visualizer/metaphor/metaphorShapes.ts
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
const METAPHOR_SHAPE_STRIDE = 10;
const METAPHOR_SHAPE_CAPACITY = 1024;
const METAPHOR_DYNAMIC_RESERVE = 384;
const PLAN_LIMIT = 80;
const METAPHOR_SHAPE_BLOB = 0;
const METAPHOR_SHAPE_RING = 1;
const METAPHOR_SHAPE_BAR = 2;
const METAPHOR_SHAPE_ARC = 3;
const METAPHOR_SHAPE_WAVE = 4;
const TAU = Math.PI * 2;
const MAX_FLOW = 2;
const staticMetaphorShape = (shape, patch) =>
  __spreadValues(
    {
      shape,
      x: 0,
      y: 0,
      sx: 1,
      sy: 1,
      param: 0,
      born: 0,
      rot: 0,
      ink: 0,
      tone: 0,
      accent: 0,
      ampX: 0,
      ampY: 0,
      w1: 0,
      w2: 0,
      p1: 0,
      p2: 0,
      parent: -1,
      orbit: 0,
      orbitSpeed: 0,
      steady: false,
      pulse: 0,
    },
    patch,
  );
const make = (rng, shape, patch) =>
  __spreadValues(
    {
      shape,
      x: 0,
      y: 0,
      sx: 1,
      sy: 1,
      param: 0,
      born: 0,
      rot: 0,
      ink: 0,
      tone: 0,
      accent: 0,
      // 漂一个来回要四十秒到一百秒
      ampX: 0,
      ampY: 0,
      w1: 0.06 + rng() * 0.1,
      w2: 0.06 + rng() * 0.1,
      p1: rng() * TAU,
      p2: rng() * TAU,
      parent: -1,
      orbit: 0,
      orbitSpeed: 0,
      steady: false,
      pulse: 0,
    },
    patch,
  );
const stageOf = (bounds) => {
  const halfW = (bounds.x1 - bounds.x0) / 2;
  const halfH = (bounds.y1 - bounds.y0) / 2;
  return { halfW, halfH, reach: Math.max(halfW, halfH, 2) };
};
const outsidePoint = (stage, rng, pad, far) => {
  const angle = rng() * TAU;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const edge = Math.min(
    (stage.halfW + pad) / Math.max(1e-3, Math.abs(cos)),
    (stage.halfH + pad) / Math.max(1e-3, Math.abs(sin)),
  );
  const radius = edge + rng() * far;
  return { x: cos * radius, y: sin * radius };
};
const planMetaphorShapes = (bounds, rng, amount, interlude) => {
  const shapes = [];
  const stage = stageOf(bounds);
  const { halfW, halfH, reach } = stage;
  const scale = amount * (interlude ? 1.5 : 1);
  const count = (base) => Math.round(base * scale + rng() * 0.6 * Math.min(1, scale));
  const span = (min, max) => min + rng() * (max - min);
  const around = (min, max) => {
    const angle = rng() * TAU;
    const radius = span(min, max);
    return {
      x: Math.cos(angle) * radius * (halfW / reach + 0.6),
      y: Math.sin(angle) * radius * (halfH / reach + 0.6),
    };
  };
  for (let index = count(4); index > 0; index -= 1) {
    const radius = span(0.5, 1.4) * reach;
    shapes.push(
      make(
        rng,
        METAPHOR_SHAPE_BLOB,
        __spreadProps(__spreadValues({}, around(reach * 0.5, reach * 2.4)), {
          sx: radius,
          sy: radius,
          tone: span(0.5, 1),
          ampX: span(0.3, 1.2),
          ampY: span(0.3, 1),
          pulse: 0.5,
        }),
      ),
    );
  }
  for (let index = interlude ? Math.min(2, count(1.2)) : count(3); index > 0; index -= 1) {
    const radius = (interlude ? span(0.1, 0.24) : span(0.25, 0.7)) * reach;
    const ampX = span(0.2, 0.9);
    const ampY = span(0.2, 0.8);
    const place = interlude
      ? around(reach * 0.2, reach * 1.6)
      : outsidePoint(stage, rng, radius * 1.4 + 0.2 + Math.max(ampX, ampY) * MAX_FLOW, reach);
    const parent = shapes.length;
    shapes.push(
      make(
        rng,
        METAPHOR_SHAPE_BLOB,
        __spreadProps(__spreadValues({}, place), {
          sx: radius,
          sy: radius,
          ink: 1,
          tone: 0.6,
          ampX,
          ampY,
          pulse: 1,
        }),
      ),
    );
    for (let drop = 2 + Math.floor(rng() * 2); drop > 0; drop -= 1) {
      const small = radius * span(0.12, 0.3);
      shapes.push(
        make(rng, METAPHOR_SHAPE_BLOB, {
          sx: small,
          sy: small,
          ink: 1,
          parent,
          orbit: radius * span(0.55, 0.85),
          orbitSpeed: (rng() < 0.5 ? -1 : 1) * span(0.08, 0.22),
          pulse: 0.4,
        }),
      );
    }
  }
  if (!interlude) {
    for (let index = count(4); index > 0; index -= 1) {
      const radius = span(0.18, 0.45);
      const side = Math.floor(rng() * 4);
      const along = span(-1, 1);
      const out = span(0.35, 0.9);
      shapes.push(
        make(rng, METAPHOR_SHAPE_BLOB, {
          x: side < 2 ? along * halfW : (side === 2 ? -1 : 1) * (halfW + out),
          y: side < 2 ? (side === 0 ? -1 : 1) * (halfH + out) : along * halfH,
          sx: radius,
          sy: radius,
          ink: 1,
          ampX: span(0.1, 0.45),
          ampY: span(0.1, 0.45),
          pulse: 0.8,
        }),
      );
    }
  }
  for (let index = count(1.6); index > 0; index -= 1) {
    const radius = span(0.9, 1.5) * Math.min(1.6, Math.max(0.45, Math.min(halfW, halfH) * 0.9));
    shapes.push(
      make(rng, METAPHOR_SHAPE_BLOB, {
        x: span(-0.9, 0.9) * halfW,
        y: span(-0.9, 0.9) * halfH,
        sx: radius,
        sy: radius,
        accent: 1,
        tone: 0.4,
        ampX: span(0.3, 0.9) * Math.min(1.5, halfW),
        ampY: span(0.2, 0.6) * Math.min(1.5, halfH),
        pulse: 1,
      }),
    );
  }
  for (let index = count(0.8); index > 0; index -= 1) {
    const radius = span(0.5, 1.5) * reach;
    const accent = rng() < 0.35;
    shapes.push(
      make(
        rng,
        METAPHOR_SHAPE_RING,
        __spreadProps(__spreadValues({}, around(0, reach * 2)), {
          sx: radius,
          sy: radius,
          ink: accent ? 0 : 1,
          accent: accent ? 1 : 0,
          ampX: span(0, 0.4),
          ampY: span(0, 0.4),
        }),
      ),
    );
  }
  return shapes.slice(0, PLAN_LIMIT);
};
const joinMetaphorShapes = (...groups) => {
  const joined = [];
  for (const group of groups) {
    const base = joined.length;
    for (const shape of group)
      joined.push(
        shape.parent >= 0 && base > 0
          ? __spreadProps(__spreadValues({}, shape), { parent: shape.parent + base })
          : shape,
      );
  }
  return joined;
};
const putMetaphorShape = (out, count, shape, x, y, sx, sy, rot, ink, tone, accent, param = 0) => {
  if (count >= METAPHOR_SHAPE_CAPACITY) return count;
  const at = count * METAPHOR_SHAPE_STRIDE;
  out[at] = x;
  out[at + 1] = y;
  out[at + 2] = sx;
  out[at + 3] = sy;
  out[at + 4] = rot;
  out[at + 5] = ink;
  out[at + 6] = tone;
  out[at + 7] = accent;
  out[at + 8] = shape;
  out[at + 9] = param;
  return count + 1;
};
const writeMetaphorShapes = (
  shapes,
  time,
  audio,
  flow,
  out,
  since = Number.POSITIVE_INFINITY,
  limit = METAPHOR_SHAPE_CAPACITY - METAPHOR_DYNAMIC_RESERVE,
) => {
  let count = 0;
  const xs = [];
  const ys = [];
  for (const shape of shapes) {
    if (count >= limit) break;
    let x = shape.x + shape.ampX * flow * Math.sin(time * shape.w1 + shape.p1);
    let y = shape.y + shape.ampY * flow * Math.cos(time * shape.w2 + shape.p2);
    if (shape.orbit > 0) {
      const angle = time * shape.orbitSpeed + shape.p1;
      const radius = shape.steady
        ? shape.orbit
        : shape.orbit * (0.8 + 0.35 * Math.sin(time * 0.3 + shape.p2));
      x = (shape.parent >= 0 ? xs[shape.parent] : x) + Math.cos(angle) * radius;
      y = (shape.parent >= 0 ? ys[shape.parent] : y) + Math.sin(angle) * radius;
    }
    xs.push(x);
    ys.push(y);
    if (shape.born > since) continue;
    const swell = 1 + shape.pulse * (0.06 * Math.sin(time * 0.4 + shape.p2) + 0.14 * audio);
    count = putMetaphorShape(
      out,
      count,
      shape.shape,
      x,
      y,
      shape.sx * swell,
      shape.sy * swell,
      shape.rot,
      shape.ink,
      shape.tone,
      shape.accent,
      shape.param,
    );
  }
  return count;
};
const METAPHOR_COLLISION_APPROACH = 2.6;
const METAPHOR_COLLISION_LIFE = 6.5;
const TRAIL_DOTS = 5;
const TRAIL_GAP = 0.3;
const planMetaphorCollisions = (bounds, rng, times, amount, interlude) => {
  if (amount <= 0) return [];
  const stage = stageOf(bounds);
  const span = (min, max) => min + rng() * (max - min);
  return times.map((time) => {
    const unit = Math.max(1, stage.reach * 0.32) * span(0.8, 1.2);
    const place = interlude
      ? { x: span(-0.5, 0.5) * stage.halfW, y: span(-0.5, 0.5) * stage.halfH }
      : outsidePoint(stage, rng, unit * 0.9, stage.reach * 0.5);
    const total = Math.max(3, Math.round(span(5, 9) * Math.min(1.5, amount)));
    const fragments = [];
    for (let index = 0; index < total; index += 1) {
      const size = span(0.05, 0.15);
      fragments.push({
        dir: rng() * TAU,
        curl: (rng() < 0.5 ? -1 : 1) * span(0.5, 1.2) * (0.16 / (size + 0.04)),
        range: unit * span(1.2, 3.2),
        size: unit * size,
        life: span(3.5, METAPHOR_COLLISION_LIFE),
      });
    }
    return __spreadProps(__spreadValues({ time }, place), { angle: rng() * TAU, unit, fragments });
  });
};
const writeMetaphorCollisions = (collisions, time, out, offset) => {
  let count = offset;
  for (const hit of collisions) {
    const since = time - hit.time;
    if (since < -METAPHOR_COLLISION_APPROACH || since >= METAPHOR_COLLISION_LIFE) continue;
    const cos = Math.cos(hit.angle);
    const sin = Math.sin(hit.angle);
    if (since < 0) {
      for (let dot = 0; dot <= 3; dot += 1) {
        const u = 1 + since / METAPHOR_COLLISION_APPROACH - dot * 0.035;
        if (u < 0) continue;
        const left = hit.unit * 5 * (1 - u * u * u);
        const radius = hit.unit * (dot === 0 ? 0.22 : 0.13 - dot * 0.025);
        count = putMetaphorShape(
          out,
          count,
          METAPHOR_SHAPE_BLOB,
          hit.x + cos * left,
          hit.y + sin * left,
          radius,
          radius,
          0,
          1,
          0.3,
          0,
        );
        count = putMetaphorShape(
          out,
          count,
          METAPHOR_SHAPE_BLOB,
          hit.x - cos * left,
          hit.y - sin * left,
          radius,
          radius,
          0,
          1,
          0.3,
          0,
        );
      }
      continue;
    }
    const burst = hit.unit * 0.95 * Math.exp(-since * 1.6);
    if (burst > hit.unit * 0.04)
      count = putMetaphorShape(
        out,
        count,
        METAPHOR_SHAPE_BLOB,
        hit.x,
        hit.y,
        burst,
        burst,
        0,
        1,
        0.8,
        0,
      );
    if (since < 4) {
      const ring = hit.unit * (0.35 + 2.6 * (1 - Math.exp(-since * 0.55)));
      count = putMetaphorShape(
        out,
        count,
        METAPHOR_SHAPE_RING,
        hit.x,
        hit.y,
        ring,
        ring,
        0,
        since < 2.2 ? 1 : 0,
        1,
        0,
      );
    }
    for (const fragment of hit.fragments) {
      for (let dot = 0; dot <= TRAIL_DOTS; dot += 1) {
        const age = since - dot * TRAIL_GAP;
        if (age < 0 || age >= fragment.life) continue;
        const travelled = fragment.range * (1 - Math.exp(-age * 0.6));
        const angle = fragment.dir + (fragment.curl * travelled) / hit.unit;
        const fade = 1 - age / fragment.life;
        const radius = fragment.size * fade * (dot === 0 ? 1 : 0.6 - dot * 0.07);
        count = putMetaphorShape(
          out,
          count,
          METAPHOR_SHAPE_BLOB,
          hit.x + Math.cos(angle) * travelled,
          hit.y + Math.sin(angle) * travelled,
          radius,
          radius,
          0,
          1,
          0.25,
          0,
        );
      }
    }
  }
  return count;
};
const PAIR_LIFE = 3.6;
const writeMetaphorPairs = (glyphs, time, out, offset) => {
  let count = offset;
  for (const glyph of glyphs) {
    const age = time - glyph.t0;
    if (age < 0 || age >= PAIR_LIFE) continue;
    const life = age / PAIR_LIFE;
    const travelled = glyph.size * (0.4 + 1.5 * (1 - Math.exp(-age * 0.7)));
    const radius = glyph.size * (0.07 + glyph.seed * 0.05) * (1 - life * life);
    const curl = 0.9 + glyph.seed * 1.4;
    const ink = glyph.accent ? 0 : 1;
    const accent = glyph.accent ? 1 : 0;
    for (const side of [1, -1]) {
      const angle =
        glyph.seed * TAU + (side > 0 ? 0 : Math.PI) + (side * curl * travelled) / glyph.size;
      count = putMetaphorShape(
        out,
        count,
        METAPHOR_SHAPE_BLOB,
        glyph.x + Math.cos(angle) * travelled,
        glyph.y + Math.sin(angle) * travelled,
        radius,
        radius,
        0,
        ink,
        0.3,
        accent,
      );
    }
  }
  return count;
};
export {
  METAPHOR_COLLISION_APPROACH,
  METAPHOR_COLLISION_LIFE,
  METAPHOR_DYNAMIC_RESERVE,
  METAPHOR_SHAPE_ARC,
  METAPHOR_SHAPE_BAR,
  METAPHOR_SHAPE_BLOB,
  METAPHOR_SHAPE_CAPACITY,
  METAPHOR_SHAPE_RING,
  METAPHOR_SHAPE_STRIDE,
  METAPHOR_SHAPE_WAVE,
  joinMetaphorShapes,
  planMetaphorCollisions,
  planMetaphorShapes,
  putMetaphorShape,
  staticMetaphorShape,
  writeMetaphorCollisions,
  writeMetaphorPairs,
  writeMetaphorShapes,
};
