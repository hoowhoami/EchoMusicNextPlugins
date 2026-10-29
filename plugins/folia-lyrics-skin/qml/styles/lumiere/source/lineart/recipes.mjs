// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { flatMap } from '../../../../shared/text/compat.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (523 ^ lumiereScaleMask) +
  Math.imul(47868 ^ lumiereScaleMask, 15875 ^ lumiereScaleMask) -
  ((523 ^ lumiereScaleMask) + Math.imul(47868 ^ lumiereScaleMask, 15875 ^ lumiereScaleMask));
const arcPoints = (cx, cy, r, from, to, steps = 64 + LUMIERE_NEUTRAL_OFFSET) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
const cubicPoints = (p0, p1, p2, p3, steps = 40) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    const a = u * u * u,
      b = 3 * u * u * t,
      c = 3 * u * t * t,
      d = t * t * t;
    return [
      a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
      a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
    ];
  });
const line = (a, b) => [a, b];
const mergeSpecs = (...specs) => ({
  paths: flatMap(specs, (spec) => spec.paths),
  nodes: flatMap(specs, (spec) => spec.nodes),
});
const protractorHalo = (options) => {
  var _a, _b, _c;
  const { cx, cy, radius } = options;
  const delay = (_a = options.delay) != null ? _a : 0;
  const alpha = (_b = options.alpha) != null ? _b : 0.5;
  const from = Math.PI * 0.04;
  const to = Math.PI * 0.96;
  const inner = radius * 0.62;
  const paths = [
    { points: arcPoints(cx, cy, radius, to, from, 96), width: 16e-4, alpha, delay, span: 0.45 },
    {
      points: arcPoints(cx, cy, inner, from, to, 72),
      width: 13e-4,
      alpha: alpha * 0.8,
      delay: delay + 0.08,
      span: 0.4,
    },
    {
      points: arcPoints(cx, cy, radius * 1.18, from + 0.1, to - 0.1, 80),
      width: 11e-4,
      alpha: alpha * 0.45,
      delay: delay + 0.2,
      span: 0.4,
      dash: [4e-3, 9e-3],
    },
  ];
  const step = (_c = options.spokeStep) != null ? _c : Math.PI / 12;
  const nodes = [];
  let index = 0;
  for (let a = Math.PI / 2 - step * 5; a <= Math.PI / 2 + step * 5 + 1e-6; a += step) {
    const long = index % 2 === 0;
    const r0 = inner * 0.2;
    const r1 = radius * (long ? 1.12 : 1.02);
    paths.push({
      points: line(
        [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0],
        [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]
      ),
      width: long ? 13e-4 : 9e-4,
      alpha: alpha * (long ? 0.7 : 0.45),
      delay: delay + 0.12 + Math.abs(a - Math.PI / 2) * 0.12,
      span: 0.3,
    });
    if (long)
      nodes.push({
        at: [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius],
        size: 0.022,
        delay: delay + 0.45,
        twinklePhase: index * 1.7,
      });
    index += 1;
  }
  for (let a = from; a <= to; a += Math.PI / 72) {
    paths.push({
      points: line(
        [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius],
        [cx + Math.cos(a) * radius * 0.975, cy + Math.sin(a) * radius * 0.975]
      ),
      width: 8e-4,
      alpha: alpha * 0.4,
      delay: delay + 0.25 + (a - from) * 0.05,
      span: 0.15,
    });
  }
  return { paths, nodes };
};
const viewfinderFrame = (options) => {
  var _a, _b;
  const { aspect, top, bottom } = options;
  const left = options.left * aspect;
  const right = options.right * aspect;
  const delay = (_a = options.delay) != null ? _a : 0;
  const alpha = (_b = options.alpha) != null ? _b : 0.3;
  const corner = 0.03;
  const paths = [
    {
      points: [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
        [left, top],
      ],
      width: 9e-4,
      alpha: alpha * 0.55,
      delay,
      span: 0.6,
    },
  ];
  const corners = [
    [
      [left, top + corner],
      [left, top],
      [left + corner, top],
    ],
    [
      [right - corner, top],
      [right, top],
      [right, top + corner],
    ],
    [
      [right, bottom - corner],
      [right, bottom],
      [right - corner, bottom],
    ],
    [
      [left + corner, bottom],
      [left, bottom],
      [left, bottom - corner],
    ],
  ];
  corners.forEach((points, i) =>
    paths.push({ points, width: 18e-4, alpha, delay: delay + 0.1 + i * 0.05, span: 0.2 })
  );
  const ticks = 12;
  for (let i = 1; i < ticks; i += 1) {
    const x = left + ((right - left) * i) / ticks;
    const y = top + ((bottom - top) * i) / ticks;
    const len = i % 3 === 0 ? 0.014 : 7e-3;
    paths.push({
      points: line([x, top], [x, top + len]),
      width: 8e-4,
      alpha: alpha * 0.6,
      delay: delay + 0.3 + i * 0.01,
      span: 0.1,
    });
    paths.push({
      points: line([x, bottom], [x, bottom - len]),
      width: 8e-4,
      alpha: alpha * 0.6,
      delay: delay + 0.3 + i * 0.01,
      span: 0.1,
    });
    paths.push({
      points: line([left, y], [left + len, y]),
      width: 8e-4,
      alpha: alpha * 0.6,
      delay: delay + 0.3 + i * 0.01,
      span: 0.1,
    });
    paths.push({
      points: line([right, y], [right - len, y]),
      width: 8e-4,
      alpha: alpha * 0.6,
      delay: delay + 0.3 + i * 0.01,
      span: 0.1,
    });
  }
  const guideX = [left + (right - left) * 0.14, right - (right - left) * 0.14];
  guideX.forEach((x, i) =>
    paths.push({
      points: line([x, top + 0.06], [x, bottom - 0.06]),
      width: 1e-3,
      alpha: alpha * 0.5,
      delay: delay + 0.35 + i * 0.05,
      span: 0.4,
      dash: [3e-3, 0.012],
    })
  );
  return { paths, nodes: [] };
};
const sprout = (options) => {
  var _a, _b, _c;
  const { cx, baseY, size } = options;
  const delay = (_a = options.delay) != null ? _a : 0;
  const alpha = (_b = options.alpha) != null ? _b : 0.55;
  const open = (_c = options.open) != null ? _c : 1;
  const paths = [
    {
      points: cubicPoints([cx, 1.04], [cx + 0.01, 0.94], [cx - 8e-3, baseY + 0.08], [cx, baseY]),
      width: 16e-4,
      alpha,
      delay,
      span: 0.3,
    },
  ];
  const nodes = [];
  const leaf = (side, index) => {
    const lean = (0.2 + 0.2 * open) * Math.PI;
    const d = [Math.sin(lean) * side, -Math.cos(lean)];
    const n = [-d[1], d[0]];
    const base = [cx, baseY];
    const tip = [base[0] + d[0] * size, base[1] + d[1] * size - size * 0.12];
    const bulge = size * 0.34;
    const at = (along, across) => [
      base[0] + d[0] * size * along + n[0] * across,
      base[1] + d[1] * size * along + n[1] * across - size * 0.12 * along * along,
    ];
    const leafDelay = delay + 0.22 + index * 0.08;
    paths.push({
      points: cubicPoints(base, at(0.3, bulge), at(0.78, bulge * 0.9), tip, 48),
      width: 26e-4,
      alpha,
      delay: leafDelay,
      span: 0.35,
    });
    paths.push({
      points: cubicPoints(base, at(0.3, -bulge * 0.95), at(0.8, -bulge * 0.6), tip, 48),
      width: 26e-4,
      alpha,
      delay: leafDelay + 0.04,
      span: 0.35,
    });
    paths.push({
      points: cubicPoints(base, at(0.35, bulge * 0.08), at(0.7, bulge * 0.05), tip, 32),
      width: 11e-4,
      alpha: alpha * 0.7,
      delay: leafDelay + 0.12,
      span: 0.3,
    });
    for (let v = 1; v <= 4; v += 1) {
      const f = v / 5.2;
      const start = at(f, bulge * 0.04);
      for (const s of [1, -1]) {
        const end = at(f + 0.14, s * bulge * (0.72 - f * 0.35));
        paths.push({
          points: cubicPoints(
            start,
            at(f + 0.04, s * bulge * 0.25),
            at(f + 0.1, s * bulge * 0.5),
            end,
            16
          ),
          width: 8e-4,
          alpha: alpha * 0.45,
          delay: leafDelay + 0.2 + v * 0.03,
          span: 0.18,
        });
      }
    }
    nodes.push({ at: tip, size: 0.03, delay: leafDelay + 0.3, twinklePhase: index * 2.1 });
    nodes.push({
      at: at(0.45, bulge * 0.86),
      size: 0.014,
      delay: leafDelay + 0.33,
      twinklePhase: index * 2.1 + 1,
    });
    nodes.push({
      at: at(0.6, -bulge * 0.8),
      size: 0.012,
      delay: leafDelay + 0.36,
      twinklePhase: index * 2.1 + 2,
    });
  };
  leaf(-1, 0);
  leaf(1, 1);
  nodes.push({ at: [cx, baseY], size: 0.02, delay: delay + 0.3, twinklePhase: 0.5 });
  return { paths, nodes };
};
const scatteredSparks = (options) => {
  var _a;
  const [x0, y0, x1, y1] = (_a = options.region) != null ? _a : [0.05, 0.08, 0.95, 0.92];
  const nodes = Array.from({ length: options.count }, (_, i) => {
    var _a2;
    return {
      at: [(x0 + (x1 - x0) * options.random()) * options.aspect, y0 + (y1 - y0) * options.random()],
      size: 6e-3 + options.random() * 0.012,
      delay: ((_a2 = options.delay) != null ? _a2 : 0) + options.random() * 0.5,
      twinklePhase: i * 2.399,
    };
  });
  return { paths: [], nodes };
};
const blindsWindow = (options) => {
  var _a, _b;
  const { x, y, w, h, slats } = options;
  const delay = (_a = options.delay) != null ? _a : 0;
  const alpha = (_b = options.alpha) != null ? _b : 0.5;
  const paths = [
    {
      points: [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x, y],
      ],
      width: 18e-4,
      alpha,
      delay,
      span: 0.5,
    },
  ];
  for (let i = 1; i < slats; i += 1) {
    const sy = y + (h * i) / slats;
    paths.push({
      points: line([x, sy], [x + w, sy]),
      width: 1e-3,
      alpha: alpha * 0.6,
      delay: delay + 0.1 + i * 0.03,
      span: 0.2,
    });
  }
  return {
    paths,
    nodes: [{ at: [x + w, y + h], size: 0.018, delay: delay + 0.4, twinklePhase: 1 }],
  };
};
const prismTriangle = (options) => {
  var _a, _b;
  const { cx, cy, size } = options;
  const h = (size * Math.sqrt(3)) / 2;
  const top = [cx, cy - (h * 2) / 3];
  const left = [cx - size / 2, cy + h / 3];
  const right = [cx + size / 2, cy + h / 3];
  const alpha = (_a = options.alpha) != null ? _a : 0.7;
  const delay = (_b = options.delay) != null ? _b : 0;
  return {
    paths: [
      { points: [top, right, left, top], width: 22e-4, alpha, delay, span: 0.5 },
      {
        points: [top, [cx, cy + h / 3]],
        width: 8e-4,
        alpha: alpha * 0.4,
        delay: delay + 0.3,
        span: 0.3,
        dash: [4e-3, 8e-3],
      },
    ],
    nodes: [top, left, right].map((at, i) => ({
      at,
      size: 0.02,
      delay: delay + 0.4 + i * 0.05,
      twinklePhase: i * 1.3,
    })),
  };
};
const slitBarrier = (options) => {
  var _a, _b;
  const { cx, y, width, gap, separation } = options;
  const alpha = (_a = options.alpha) != null ? _a : 0.6;
  const delay = (_b = options.delay) != null ? _b : 0;
  const a = cx - separation / 2;
  const b = cx + separation / 2;
  const segments = [
    [cx - width / 2, a - gap / 2],
    [a + gap / 2, b - gap / 2],
    [b + gap / 2, cx + width / 2],
  ];
  return {
    paths: segments.map(([from, to], i) => ({
      points: line([from, y], [to, y]),
      width: 26e-4,
      alpha,
      delay: delay + i * 0.08,
      span: 0.3,
    })),
    nodes: [a, b].map((x, i) => ({
      at: [x, y],
      size: 0.022,
      delay: delay + 0.35 + i * 0.05,
      twinklePhase: i * 2,
    })),
  };
};
export {
  arcPoints,
  blindsWindow,
  cubicPoints,
  mergeSpecs,
  prismTriangle,
  protractorHalo,
  scatteredSparks,
  slitBarrier,
  sprout,
  viewfinderFrame,
};
