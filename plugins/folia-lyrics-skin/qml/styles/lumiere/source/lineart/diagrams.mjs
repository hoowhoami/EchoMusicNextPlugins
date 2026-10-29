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
import { flatMap } from '../../../../shared/text/compat.mjs';
import { arcPoints, cubicPoints } from './recipes.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (15230 ^ lumiereScaleMask) +
  Math.imul(10553 ^ lumiereScaleMask, 3118931976 ^ lumiereScaleMask) -
  ((15230 ^ lumiereScaleMask) + Math.imul(10553 ^ lumiereScaleMask, 3118931976 ^ lumiereScaleMask));
const TAU = Math.PI * (2 + LUMIERE_NEUTRAL_OFFSET);
const path = (points, style = {}) => {
  var _a, _b, _c, _d;
  return __spreadValues(
    {
      points,
      width: (_a = style.width) != null ? _a : 16e-4,
      alpha: (_b = style.alpha) != null ? _b : 0.55,
      delay: (_c = style.delay) != null ? _c : 0,
      span: (_d = style.span) != null ? _d : 0.4,
    },
    style.dash ? { dash: style.dash } : {}
  );
};
const node = (at, size = 0.018, delay = 0.4, twinklePhase = 0) => ({
  at,
  size,
  delay,
  twinklePhase,
});
const segment = (a, b, style = {}) => path([a, b], style);
const ellipsePath = (cx, cy, rx, ry, rotation = 0, from = 0, to = TAU, steps = 96) => {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return arcPoints(0, 0, 1, from, to, steps).map(([x, y]) => [
    cx + x * rx * cos - y * ry * sin,
    cy + x * rx * sin + y * ry * cos,
  ]);
};
const circle = (cx, cy, r, style = {}) => path(ellipsePath(cx, cy, r, r), style);
const merge = (...specs) => ({
  paths: flatMap(specs, (spec) => spec.paths),
  nodes: flatMap(specs, (spec) => spec.nodes),
});
const rays = (cx, cy, r0, r1, count, from = 0, to = TAU, style = {}) => ({
  paths: Array.from({ length: count }, (_, i) => {
    var _a, _b;
    const a = from + ((to - from) * (i + (to - from >= TAU - 1e-6 ? 0 : 0.5))) / count;
    return segment(
      [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0],
      [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1],
      __spreadProps(
        __spreadValues(
          {
            width: 1e-3,
            alpha: 0.4,
          },
          style
        ),
        {
          delay: ((_a = style.delay) != null ? _a : 0) + (i / count) * 0.3,
          span: (_b = style.span) != null ? _b : 0.2,
        }
      )
    );
  }),
  nodes: [],
});
const concentric = (cx, cy, radii, style = {}) => ({
  paths: radii.map((r, i) => {
    var _a;
    return circle(
      cx,
      cy,
      r,
      __spreadProps(__spreadValues({ width: 11e-4, alpha: 0.45 }, style), {
        delay: ((_a = style.delay) != null ? _a : 0) + i * 0.06,
      })
    );
  }),
  nodes: [],
});
const crossWindow = (x, y, w, h, style = {}) => {
  var _a, _b, _c;
  return {
    paths: [
      path(
        [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
          [x, y],
        ],
        __spreadValues({ width: 2e-3, alpha: 0.55 }, style)
      ),
      segment([x + w / 2, y], [x + w / 2, y + h], {
        width: 14e-4,
        alpha: 0.45,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.15,
      }),
      segment([x, y + h / 2], [x + w, y + h / 2], {
        width: 14e-4,
        alpha: 0.45,
        delay: ((_b = style.delay) != null ? _b : 0) + 0.2,
      }),
    ],
    nodes: [node([x + w / 2, y + h / 2], 0.02, ((_c = style.delay) != null ? _c : 0) + 0.4)],
  };
};
const archWindow = (x, y, w, h, style = {}) => {
  var _a, _b;
  const r = w / 2;
  const top = y + r;
  return {
    paths: [
      path(
        [
          [x, y + h],
          [x, top],
          ...arcPoints(x + r, top, r, Math.PI, TAU, 40),
          [x + w, y + h],
          [x, y + h],
        ],
        __spreadValues({ width: 18e-4, alpha: 0.55 }, style)
      ),
      segment([x + r, y], [x + r, y + h], {
        width: 1e-3,
        alpha: 0.35,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.2,
      }),
    ],
    nodes: [node([x + r, y + 0.01], 0.018, ((_b = style.delay) != null ? _b : 0) + 0.4)],
  };
};
const roseWindow = (cx, cy, r, style = {}) => {
  var _a, _b;
  return merge(
    concentric(
      cx,
      cy,
      [r, r * 0.62, r * 0.22],
      __spreadValues({ width: 16e-4, alpha: 0.55 }, style)
    ),
    rays(cx, cy, r * 0.22, r, 12, 0, TAU, { delay: ((_a = style.delay) != null ? _a : 0) + 0.2 }),
    {
      paths: Array.from({ length: 12 }, (_, i) => {
        var _a2;
        const a = (i / 12) * TAU;
        return circle(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8, r * 0.14, {
          width: 9e-4,
          alpha: 0.35,
          delay: ((_a2 = style.delay) != null ? _a2 : 0) + 0.35 + i * 0.02,
        });
      }),
      nodes: [node([cx, cy], 0.028, ((_b = style.delay) != null ? _b : 0) + 0.5)],
    }
  );
};
const doorSlit = (cx, top, bottom, gap, style = {}) => {
  var _a, _b, _c;
  return {
    paths: [
      segment(
        [cx - gap / 2, top],
        [cx - gap / 2, bottom],
        __spreadValues({ width: 18e-4, alpha: 0.55 }, style)
      ),
      segment(
        [cx + gap / 2, top],
        [cx + gap / 2, bottom],
        __spreadProps(__spreadValues({ width: 18e-4, alpha: 0.55 }, style), {
          delay: ((_a = style.delay) != null ? _a : 0) + 0.05,
        })
      ),
      segment([cx - gap / 2 - 0.25, bottom], [cx + gap / 2 + 0.25, bottom], {
        width: 1e-3,
        alpha: 0.35,
        delay: ((_b = style.delay) != null ? _b : 0) + 0.2,
      }),
    ],
    nodes: [node([cx, top + 0.02], 0.02, ((_c = style.delay) != null ? _c : 0) + 0.4)],
  };
};
const gridPanel = (x, y, w, h, cols, rows, diagonal = false, style = {}) => {
  var _a;
  const paths = [
    path(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x, y],
      ],
      __spreadValues({ width: 18e-4, alpha: 0.5 }, style)
    ),
  ];
  const inner = {
    width: 9e-4,
    alpha: 0.32,
    delay: ((_a = style.delay) != null ? _a : 0) + 0.15,
    span: 0.25,
  };
  if (diagonal) {
    const n = cols + rows;
    for (let i = 1; i < n; i += 1) {
      const t = i / n;
      paths.push(
        segment(
          [x + w * Math.min(1, t * 2), y + h * Math.max(0, t * 2 - 1)],
          [x + w * Math.max(0, t * 2 - 1), y + h * Math.min(1, t * 2)],
          inner
        )
      );
      paths.push(
        segment(
          [x + w * (1 - Math.min(1, t * 2)), y + h * Math.max(0, t * 2 - 1)],
          [x + w * (1 - Math.max(0, t * 2 - 1)), y + h * Math.min(1, t * 2)],
          inner
        )
      );
    }
  } else {
    for (let i = 1; i < cols; i += 1)
      paths.push(segment([x + (w * i) / cols, y], [x + (w * i) / cols, y + h], inner));
    for (let j = 1; j < rows; j += 1)
      paths.push(segment([x, y + (h * j) / rows], [x + w, y + (h * j) / rows], inner));
  }
  return { paths, nodes: [] };
};
const tallWindows = (x0, x1, y, h, count, style = {}) =>
  merge(
    ...Array.from({ length: count }, (_, i) => {
      var _a;
      const w = ((x1 - x0) / count) * 0.45;
      const x = x0 + ((x1 - x0) * (i + 0.5)) / count - w / 2;
      return archWindow(
        x,
        y,
        w,
        h,
        __spreadProps(__spreadValues({ alpha: 0.45 }, style), {
          delay: ((_a = style.delay) != null ? _a : 0) + i * 0.07,
        })
      );
    })
  );
const shards = (aspect, random, count, style = {}) => ({
  paths: Array.from({ length: count }, (_, i) => {
    var _a;
    const cx = (0.1 + random() * 0.8) * aspect;
    const cy = 0.12 + random() * 0.76;
    const r = 0.025 + random() * 0.05;
    const a = random() * TAU;
    const points = [0, 1, 2, 0].map((k) => [
      cx + Math.cos(a + (k * TAU) / 3) * r,
      cy + Math.sin(a + (k * TAU) / 3) * r * (0.7 + random() * 0.6),
    ]);
    return path(
      points,
      __spreadProps(__spreadValues({ width: 14e-4, alpha: 0.5 }, style), {
        delay: ((_a = style.delay) != null ? _a : 0) + i * 0.04,
        span: 0.25,
      })
    );
  }),
  nodes: [],
});
const spectrumLines = (x0, x1, y, h, random, count, style = {}) => ({
  paths: [
    segment([x0, y + h / 2], [x1, y + h / 2], __spreadValues({ width: 1e-3, alpha: 0.35 }, style)),
    ...Array.from({ length: count }, (_, i) => {
      var _a;
      const x = x0 + (x1 - x0) * (0.05 + 0.9 * random());
      const k = 0.3 + random() * 0.7;
      return segment([x, y + h / 2], [x, y + h / 2 - h * k], {
        width: 12e-4 + random() * 12e-4,
        alpha: 0.4 + k * 0.3,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.1 + i * 0.03,
        span: 0.2,
      });
    }),
  ],
  nodes: [],
});
const cubeSplitter = (cx, cy, size, style = {}) => {
  var _a, _b;
  return {
    paths: [
      path(
        [
          [cx - size / 2, cy - size / 2],
          [cx + size / 2, cy - size / 2],
          [cx + size / 2, cy + size / 2],
          [cx - size / 2, cy + size / 2],
          [cx - size / 2, cy - size / 2],
        ],
        __spreadValues({ width: 2e-3, alpha: 0.6 }, style)
      ),
      segment([cx - size / 2, cy + size / 2], [cx + size / 2, cy - size / 2], {
        width: 12e-4,
        alpha: 0.45,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.2,
      }),
    ],
    nodes: [node([cx, cy], 0.022, ((_b = style.delay) != null ? _b : 0) + 0.35)],
  };
};
const rainbowArcs = (cx, cy, r, style = {}) => {
  var _a, _b;
  return {
    paths: [
      path(
        arcPoints(cx, cy, r, Math.PI * 1.08, Math.PI * 1.92, 72),
        __spreadValues({ width: 18e-4, alpha: 0.5 }, style)
      ),
      path(arcPoints(cx, cy, r * 1.18, Math.PI * 1.1, Math.PI * 1.9, 72), {
        width: 1e-3,
        alpha: 0.3,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.15,
        dash: [6e-3, 0.01],
      }),
      circle(cx, cy - r * 0.4, 0.03, {
        width: 12e-4,
        alpha: 0.45,
        delay: ((_b = style.delay) != null ? _b : 0) + 0.3,
      }),
    ],
    nodes: [],
  };
};
const glassCup = (cx, top, w, h, style = {}) => {
  var _a, _b, _c;
  return {
    paths: [
      path(
        ellipsePath(cx, top, w / 2, w * 0.12),
        __spreadValues({ width: 16e-4, alpha: 0.5 }, style)
      ),
      path(
        [
          [cx - w / 2, top],
          [cx - w * 0.4, top + h],
          [cx + w * 0.4, top + h],
          [cx + w / 2, top],
        ],
        { width: 16e-4, alpha: 0.5, delay: ((_a = style.delay) != null ? _a : 0) + 0.1 }
      ),
      path(ellipsePath(cx, top + h, w * 0.4, w * 0.09, 0, 0, Math.PI), {
        width: 1e-3,
        alpha: 0.35,
        delay: ((_b = style.delay) != null ? _b : 0) + 0.2,
      }),
    ],
    nodes: [
      node([cx - w * 0.3, top + h * 0.3], 0.016, ((_c = style.delay) != null ? _c : 0) + 0.35),
    ],
  };
};
const ripples = (cx, cy, r, count, style = {}) => {
  var _a;
  return {
    paths: Array.from({ length: count }, (_, i) => {
      var _a2;
      return path(
        ellipsePath(cx, cy, (r * (i + 1)) / count, (r * 0.3 * (i + 1)) / count),
        __spreadProps(
          __spreadValues(
            {
              width: 12e-4,
              alpha: 0.5 - i * 0.07,
            },
            style
          ),
          {
            delay: ((_a2 = style.delay) != null ? _a2 : 0) + i * 0.08,
          }
        )
      );
    }),
    nodes: [node([cx, cy], 0.02, ((_a = style.delay) != null ? _a : 0) + 0.3)],
  };
};
const waterline = (aspect, y, amplitude, waves, style = {}) => ({
  paths: [
    path(
      Array.from({ length: 121 }, (_, i) => {
        const x = (i / 120) * aspect;
        return [x, y + Math.sin((i / 120) * waves * TAU) * amplitude];
      }),
      __spreadProps(__spreadValues({ width: 14e-4, alpha: 0.45 }, style), { span: 0.6 })
    ),
  ],
  nodes: [],
});
const magnifier = (cx, cy, r, style = {}) => {
  var _a, _b;
  return {
    paths: [
      circle(cx, cy, r, __spreadValues({ width: 22e-4, alpha: 0.6 }, style)),
      circle(cx, cy, r * 0.9, {
        width: 9e-4,
        alpha: 0.3,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.1,
      }),
      segment([cx + r * 0.7, cy + r * 0.7], [cx + r * 1.6, cy + r * 1.6], {
        width: 4e-3,
        alpha: 0.5,
        delay: ((_b = style.delay) != null ? _b : 0) + 0.2,
      }),
    ],
    nodes: [],
  };
};
const crystal = (cx, cy, r, style = {}) => {
  const outer = Array.from({ length: 7 }, (_, i) => [
    cx + Math.cos((i * TAU) / 6) * r,
    cy + Math.sin((i * TAU) / 6) * r * 1.3,
  ]);
  return {
    paths: [
      path(outer, __spreadValues({ width: 2e-3, alpha: 0.55 }, style)),
      ...[0, 1, 2].map((i) => {
        var _a;
        return segment(outer[i], outer[i + 3], {
          width: 9e-4,
          alpha: 0.3,
          delay: ((_a = style.delay) != null ? _a : 0) + 0.15 + i * 0.05,
        });
      }),
    ],
    nodes: outer
      .slice(0, 6)
      .filter((_, i) => i % 2 === 0)
      .map((at, i) => {
        var _a;
        return node(at, 0.016, ((_a = style.delay) != null ? _a : 0) + 0.4, i);
      }),
  };
};
const lens = (cx, cy, h, convex, aspect, style = {}) => {
  var _a;
  const bulge = h * 0.18;
  const top = [cx, cy - h / 2];
  const bottom = [cx, cy + h / 2];
  const side = (sign) =>
    cubicPoints(
      top,
      [cx + sign * (convex ? bulge : -bulge * 0.2) + (convex ? 0 : sign * bulge * 0.6), cy - h / 4],
      [cx + sign * (convex ? bulge : -bulge * 0.2) + (convex ? 0 : sign * bulge * 0.6), cy + h / 4],
      bottom,
      32
    );
  const outline = convex
    ? [...side(1), ...side(-1).reverse()]
    : [
        [cx - bulge * 0.7, cy - h / 2],
        [cx + bulge * 0.7, cy - h / 2],
        ...cubicPoints(
          [cx + bulge * 0.7, cy - h / 2],
          [cx + bulge * 0.1, cy - h / 4],
          [cx + bulge * 0.1, cy + h / 4],
          [cx + bulge * 0.7, cy + h / 2],
          24
        ),
        [cx - bulge * 0.7, cy + h / 2],
        ...cubicPoints(
          [cx - bulge * 0.7, cy + h / 2],
          [cx - bulge * 0.1, cy + h / 4],
          [cx - bulge * 0.1, cy - h / 4],
          [cx - bulge * 0.7, cy - h / 2],
          24
        ),
      ];
  return {
    paths: [
      path(outline, __spreadValues({ width: 2e-3, alpha: 0.6 }, style)),
      segment([aspect * 0.05, cy], [aspect * 0.95, cy], {
        width: 9e-4,
        alpha: 0.3,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.1,
        dash: [8e-3, 8e-3],
        span: 0.5,
      }),
    ],
    nodes: [],
  };
};
const rayPath = (points, style = {}) => {
  var _a, _b;
  return {
    paths: [path(points, __spreadValues({ width: 14e-4, alpha: 0.6, span: 0.5 }, style))],
    nodes: [
      node(
        points[points.length - 1],
        0.016,
        ((_a = style.delay) != null ? _a : 0) + ((_b = style.span) != null ? _b : 0.5),
        points.length
      ),
    ],
  };
};
const focusMark = (x, y, style = {}) => {
  var _a;
  return {
    paths: [
      segment([x - 0.012, y], [x + 0.012, y], __spreadValues({ width: 12e-4, alpha: 0.55 }, style)),
      segment([x, y - 0.012], [x, y + 0.012], __spreadValues({ width: 12e-4, alpha: 0.55 }, style)),
    ],
    nodes: [node([x, y], 0.024, ((_a = style.delay) != null ? _a : 0) + 0.3)],
  };
};
const mirror = (cx, cy, length, angle, style = {}) => {
  var _a, _b;
  const dx = (Math.cos(angle) * length) / 2;
  const dy = (Math.sin(angle) * length) / 2;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const hatches = Array.from({ length: 10 }, (_, i) => {
    var _a2;
    const t = -0.45 + (i / 9) * 0.9;
    const bx = cx + dx * 2 * t;
    const by = cy + dy * 2 * t;
    return segment([bx, by], [bx + nx * 0.015 - dx * 0.04, by + ny * 0.015 - dy * 0.04], {
      width: 8e-4,
      alpha: 0.3,
      delay: ((_a2 = style.delay) != null ? _a2 : 0) + 0.2 + i * 0.01,
      span: 0.1,
    });
  });
  return {
    paths: [
      segment(
        [cx - dx, cy - dy],
        [cx + dx, cy + dy],
        __spreadValues({ width: 3e-3, alpha: 0.6 }, style)
      ),
      ...hatches,
      segment([cx, cy], [cx - nx * length * 0.5, cy - ny * length * 0.5], {
        width: 9e-4,
        alpha: 0.35,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.25,
        dash: [6e-3, 6e-3],
      }),
      path(
        arcPoints(
          cx,
          cy,
          length * 0.12,
          Math.atan2(-ny, -nx) - 0.5,
          Math.atan2(-ny, -nx) + 0.5,
          20
        ),
        { width: 9e-4, alpha: 0.4, delay: ((_b = style.delay) != null ? _b : 0) + 0.35 }
      ),
    ],
    nodes: [],
  };
};
const interfaceLine = (aspect, y, style = {}) => ({
  paths: [
    segment(
      [aspect * 0.06, y],
      [aspect * 0.94, y],
      __spreadProps(__spreadValues({ width: 2e-3, alpha: 0.55 }, style), { span: 0.5 })
    ),
    ...Array.from({ length: 24 }, (_, i) => {
      var _a;
      const x = aspect * (0.08 + (i / 23) * 0.84);
      return segment([x, y + 0.01], [x - 0.02, y + 0.04], {
        width: 8e-4,
        alpha: 0.22,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.2 + i * 0.01,
        span: 0.1,
      });
    }),
  ],
  nodes: [],
});
const ruler = (x0, x1, y, ticks, style = {}) => ({
  paths: [
    segment(
      [x0, y],
      [x1, y],
      __spreadProps(__spreadValues({ width: 16e-4, alpha: 0.5 }, style), { span: 0.5 })
    ),
    ...Array.from({ length: ticks + 1 }, (_, i) => {
      var _a;
      const x = x0 + ((x1 - x0) * i) / ticks;
      const long = i % 5 === 0;
      return segment([x, y], [x, y + (long ? 0.02 : 0.01)], {
        width: 8e-4,
        alpha: 0.4,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.2 + i * 5e-3,
        span: 0.08,
      });
    }),
  ],
  nodes: [],
});
const fiber = (points, thickness, style = {}) => {
  var _a, _b;
  const center = cubicPoints(...points, 60);
  const offset = (sign) =>
    center.map(([x, y], i) => {
      const [nx0, ny0] = center[Math.max(0, i - 1)];
      const [nx1, ny1] = center[Math.min(center.length - 1, i + 1)];
      const dx = nx1 - nx0;
      const dy = ny1 - ny0;
      const len = Math.hypot(dx, dy) || 1;
      return [x - (dy / len) * thickness * sign, y + (dx / len) * thickness * sign];
    });
  return {
    paths: [
      path(
        offset(1),
        __spreadProps(__spreadValues({ width: 14e-4, alpha: 0.5 }, style), { span: 0.6 })
      ),
      path(
        offset(-1),
        __spreadProps(__spreadValues({ width: 14e-4, alpha: 0.5 }, style), {
          delay: ((_a = style.delay) != null ? _a : 0) + 0.05,
          span: 0.6,
        })
      ),
    ],
    nodes: [node(center[center.length - 1], 0.024, ((_b = style.delay) != null ? _b : 0) + 0.6)],
  };
};
const pinholeBox = (cx, cy, w, h, style = {}) => {
  var _a, _b, _c, _d, _e;
  return {
    paths: [
      path(
        [
          [cx - w / 2, cy - h / 2],
          [cx + w / 2, cy - h / 2],
          [cx + w / 2, cy + h / 2],
          [cx - w / 2, cy + h / 2],
          [cx - w / 2, cy - h / 2],
        ],
        __spreadValues({ width: 18e-4, alpha: 0.5 }, style)
      ),
      segment([cx - w / 2 - 0.25, cy - h * 0.35], [cx - w / 2 - 0.25, cy + h * 0.35], {
        width: 16e-4,
        alpha: 0.45,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.1,
      }),
      segment([cx + w / 2 - 0.02, cy + h * 0.28], [cx + w / 2 - 0.02, cy - h * 0.28], {
        width: 14e-4,
        alpha: 0.4,
        delay: ((_b = style.delay) != null ? _b : 0) + 0.3,
        dash: [5e-3, 5e-3],
      }),
      segment([cx - w / 2 - 0.25, cy - h * 0.35], [cx + w / 2 - 0.02, cy + h * 0.28], {
        width: 8e-4,
        alpha: 0.3,
        delay: ((_c = style.delay) != null ? _c : 0) + 0.2,
      }),
      segment([cx - w / 2 - 0.25, cy + h * 0.35], [cx + w / 2 - 0.02, cy - h * 0.28], {
        width: 8e-4,
        alpha: 0.3,
        delay: ((_d = style.delay) != null ? _d : 0) + 0.2,
      }),
    ],
    nodes: [node([cx - w / 2, cy], 0.02, ((_e = style.delay) != null ? _e : 0) + 0.3)],
  };
};
const rings = (cx, cy, r, count, style = {}) =>
  concentric(
    cx,
    cy,
    Array.from({ length: count }, (_, i) => r * Math.sqrt((i + 1) / count)),
    style
  );
const grating = (cx, y, width, slits, style = {}) => ({
  paths: [
    segment(
      [cx - width / 2, y],
      [cx + width / 2, y],
      __spreadValues({ width: 22e-4, alpha: 0.55 }, style)
    ),
    ...Array.from({ length: slits }, (_, i) => {
      var _a;
      const x = cx - width * 0.3 + (width * 0.6 * i) / Math.max(1, slits - 1);
      return segment([x, y - 0.01], [x, y + 0.01], {
        width: 8e-4,
        alpha: 0.4,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.15 + i * 0.01,
        span: 0.1,
      });
    }),
  ],
  nodes: [],
});
const twoSources = (cx, cy, separation, r, style = {}) => {
  var _a;
  return merge(
    concentric(
      cx - separation / 2,
      cy,
      [r * 0.25, r * 0.5, r * 0.75, r],
      __spreadValues({ alpha: 0.3 }, style)
    ),
    concentric(
      cx + separation / 2,
      cy,
      [r * 0.25, r * 0.5, r * 0.75, r],
      __spreadProps(__spreadValues({ alpha: 0.3 }, style), {
        delay: ((_a = style.delay) != null ? _a : 0) + 0.1,
      })
    ),
    {
      paths: [],
      nodes: [
        node([cx - separation / 2, cy], 0.024, 0.3),
        node([cx + separation / 2, cy], 0.024, 0.35, 1),
      ],
    }
  );
};
const moire = (cx, cy, size, count, rotation, style = {}) => {
  var _a, _b;
  const set = (angle, delay) =>
    Array.from({ length: count }, (_, i) => {
      const t = -0.5 + i / (count - 1);
      const ox = Math.cos(angle + Math.PI / 2) * t * size;
      const oy = Math.sin(angle + Math.PI / 2) * t * size;
      return segment(
        [cx + ox - (Math.cos(angle) * size) / 2, cy + oy - (Math.sin(angle) * size) / 2],
        [cx + ox + (Math.cos(angle) * size) / 2, cy + oy + (Math.sin(angle) * size) / 2],
        __spreadProps(
          __spreadValues(
            {
              width: 8e-4,
              alpha: 0.3,
            },
            style
          ),
          {
            delay: delay + i * 8e-3,
            span: 0.15,
          }
        )
      );
    });
  return {
    paths: [
      ...set(0, (_a = style.delay) != null ? _a : 0),
      ...set(rotation, ((_b = style.delay) != null ? _b : 0) + 0.2),
    ],
    nodes: [],
  };
};
const standingWave = (x0, x1, y, amplitude, loops, style = {}) => ({
  paths: [-1, -0.5, 0.5, 1].map((k, j) => {
    var _a;
    return path(
      Array.from({ length: 121 }, (_, i) => {
        const t = i / 120;
        return [x0 + (x1 - x0) * t, y + Math.sin(t * loops * Math.PI) * amplitude * k];
      }),
      __spreadProps(__spreadValues({ width: 12e-4, alpha: 0.35 + Math.abs(k) * 0.2 }, style), {
        delay: ((_a = style.delay) != null ? _a : 0) + j * 0.06,
        span: 0.5,
      })
    );
  }),
  nodes: Array.from({ length: loops + 1 }, (_, i) => {
    var _a;
    return node(
      [x0 + ((x1 - x0) * i) / loops, y],
      0.014,
      ((_a = style.delay) != null ? _a : 0) + 0.5,
      i
    );
  }),
});
const polarizers = (cx, cy, r, gap, rotation, style = {}) => {
  var _a, _b;
  const disc = (x, angle, delay) => [
    circle(x, cy, r, __spreadProps(__spreadValues({ width: 16e-4, alpha: 0.5 }, style), { delay })),
    ...Array.from({ length: 7 }, (_, i) => {
      const t = -0.75 + (i / 6) * 1.5;
      const half = Math.sqrt(Math.max(0, 1 - t * t)) * r;
      const ox = -Math.sin(angle) * t * r;
      const oy = Math.cos(angle) * t * r;
      return segment(
        [x + ox - Math.cos(angle) * half, cy + oy - Math.sin(angle) * half],
        [x + ox + Math.cos(angle) * half, cy + oy + Math.sin(angle) * half],
        { width: 8e-4, alpha: 0.3, delay: delay + 0.15 + i * 0.02, span: 0.15 }
      );
    }),
  ];
  return {
    paths: [
      ...disc(cx - gap / 2, 0, (_a = style.delay) != null ? _a : 0),
      ...disc(cx + gap / 2, rotation, ((_b = style.delay) != null ? _b : 0) + 0.2),
    ],
    nodes: [],
  };
};
const bigLeaf = (cx, cy, length, angle, style = {}) => {
  var _a, _b, _c, _d;
  const d = [Math.cos(angle), Math.sin(angle)];
  const n = [-d[1], d[0]];
  const at = (along, across) => [
    cx + d[0] * length * (along - 0.5) + n[0] * across,
    cy + d[1] * length * (along - 0.5) + n[1] * across,
  ];
  const bulge = length * 0.3;
  const paths = [
    path(
      cubicPoints(at(0, 0), at(0.3, bulge), at(0.75, bulge * 0.8), at(1, 0), 48),
      __spreadProps(__spreadValues({ width: 2e-3, alpha: 0.6 }, style), { span: 0.4 })
    ),
    path(
      cubicPoints(at(0, 0), at(0.3, -bulge), at(0.75, -bulge * 0.8), at(1, 0), 48),
      __spreadProps(__spreadValues({ width: 2e-3, alpha: 0.6 }, style), {
        delay: ((_a = style.delay) != null ? _a : 0) + 0.05,
        span: 0.4,
      })
    ),
    path([at(-0.12, 0), at(1, 0)], {
      width: 14e-4,
      alpha: 0.5,
      delay: ((_b = style.delay) != null ? _b : 0) + 0.15,
      span: 0.4,
    }),
  ];
  for (let v = 1; v <= 6; v += 1) {
    const f = v / 7.5;
    for (const s of [1, -1]) {
      paths.push(
        path(
          cubicPoints(
            at(f, 0),
            at(f + 0.05, s * bulge * 0.3),
            at(f + 0.1, s * bulge * 0.55),
            at(f + 0.15, s * bulge * (0.8 - f * 0.35)),
            16
          ),
          {
            width: 9e-4,
            alpha: 0.4,
            delay: ((_c = style.delay) != null ? _c : 0) + 0.25 + v * 0.05,
            span: 0.18,
          }
        )
      );
    }
  }
  return { paths, nodes: [node(at(1, 0), 0.026, ((_d = style.delay) != null ? _d : 0) + 0.6)] };
};
const canopy = (aspect, random, style = {}) => {
  const paths = [];
  const grow = (x, y, angle, length, depth, delay) => {
    const x1 = x + Math.cos(angle) * length;
    const y1 = y + Math.sin(angle) * length;
    paths.push(
      segment([x, y], [x1, y1], {
        width: 8e-4 + depth * 5e-4,
        alpha: 0.3 + depth * 0.08,
        delay,
        span: 0.2,
      })
    );
    if (depth <= 0) return;
    grow(x1, y1, angle - 0.35 - random() * 0.3, length * 0.72, depth - 1, delay + 0.08);
    grow(x1, y1, angle + 0.35 + random() * 0.3, length * 0.72, depth - 1, delay + 0.08);
  };
  [0.08, 0.35, 0.65, 0.92].forEach((fx, i) => {
    var _a;
    return grow(
      fx * aspect,
      -0.02,
      Math.PI / 2 + (random() - 0.5) * 0.6,
      0.14,
      4,
      ((_a = style.delay) != null ? _a : 0) + i * 0.05
    );
  });
  return { paths, nodes: [] };
};
const fernCurl = (cx, cy, r, style = {}) => {
  var _a;
  const spiral = Array.from({ length: 140 }, (_, i) => {
    const t = i / 139;
    const a = t * TAU * 2.2;
    const rr = r * Math.exp(-t * 2.4);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  const stem = [
    [cx + r, cy],
    [cx + r, cy + r * 2.2],
  ];
  const leaflets = Array.from({ length: 9 }, (_, i) => {
    var _a2;
    const [x, y] = spiral[Math.floor((i / 9) * 90)];
    return circle(x, y, 8e-3 + (1 - i / 9) * 0.01, {
      width: 8e-4,
      alpha: 0.35,
      delay: ((_a2 = style.delay) != null ? _a2 : 0) + 0.4 + i * 0.03,
      span: 0.1,
    });
  });
  return {
    paths: [
      path(stem, __spreadValues({ width: 16e-4, alpha: 0.5 }, style)),
      path(
        spiral,
        __spreadProps(__spreadValues({ width: 16e-4, alpha: 0.55 }, style), {
          delay: ((_a = style.delay) != null ? _a : 0) + 0.1,
          span: 0.5,
        })
      ),
      ...leaflets,
    ],
    nodes: [],
  };
};
const seedRoots = (cx, cy, random, style = {}) => {
  var _a;
  return {
    paths: [
      path(
        ellipsePath(cx, cy, 0.025, 0.035, 0.3),
        __spreadValues({ width: 2e-3, alpha: 0.6 }, style)
      ),
      ...Array.from({ length: 6 }, (_, i) => {
        var _a2;
        const spread = (i - 2.5) * 0.05;
        return path(
          cubicPoints(
            [cx, cy + 0.03],
            [cx + spread * 0.4, cy + 0.08],
            [cx + spread, cy + 0.12],
            [cx + spread * 1.4 + (random() - 0.5) * 0.04, cy + 0.2 + random() * 0.06],
            24
          ),
          {
            width: 9e-4,
            alpha: 0.4,
            delay: ((_a2 = style.delay) != null ? _a2 : 0) + 0.2 + i * 0.05,
            span: 0.35,
          }
        );
      }),
    ],
    nodes: [node([cx, cy - 0.04], 0.03, ((_a = style.delay) != null ? _a : 0) + 0.2)],
  };
};
const bloom = (cx, cy, r, petals, style = {}) => {
  var _a, _b;
  return {
    paths: [
      ...Array.from({ length: petals }, (_, i) => {
        var _a2;
        const a = (i / petals) * TAU;
        const d = [Math.cos(a), Math.sin(a)];
        const n = [-d[1], d[0]];
        const tip = [cx + d[0] * r, cy + d[1] * r];
        const w = r * 0.35;
        return path(
          [
            ...cubicPoints(
              [cx, cy],
              [cx + d[0] * r * 0.4 + n[0] * w, cy + d[1] * r * 0.4 + n[1] * w],
              [cx + d[0] * r * 0.9 + n[0] * w * 0.6, cy + d[1] * r * 0.9 + n[1] * w * 0.6],
              tip,
              20
            ),
            ...cubicPoints(
              tip,
              [cx + d[0] * r * 0.9 - n[0] * w * 0.6, cy + d[1] * r * 0.9 - n[1] * w * 0.6],
              [cx + d[0] * r * 0.4 - n[0] * w, cy + d[1] * r * 0.4 - n[1] * w],
              [cx, cy],
              20
            ),
          ],
          __spreadProps(__spreadValues({ width: 16e-4, alpha: 0.5 }, style), {
            delay: ((_a2 = style.delay) != null ? _a2 : 0) + i * 0.05,
            span: 0.3,
          })
        );
      }),
      circle(cx, cy, r * 0.12, {
        width: 12e-4,
        alpha: 0.5,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.4,
      }),
    ],
    nodes: [node([cx, cy], 0.03, ((_b = style.delay) != null ? _b : 0) + 0.5)],
  };
};
const vine = (x, bottom, top, amplitude, turns, style = {}) => {
  var _a, _b;
  return {
    paths: [
      path(
        Array.from({ length: 161 }, (_, i) => {
          const t = i / 160;
          return [
            x + Math.sin(t * turns * TAU) * amplitude * (1 - t * 0.4),
            bottom + (top - bottom) * t,
          ];
        }),
        __spreadProps(__spreadValues({ width: 16e-4, alpha: 0.55 }, style), { span: 0.7 })
      ),
      segment([x, bottom], [x, top], {
        width: 8e-4,
        alpha: 0.25,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.1,
        dash: [5e-3, 8e-3],
        span: 0.5,
      }),
    ],
    nodes: [node([x, top], 0.024, ((_b = style.delay) != null ? _b : 0) + 0.7)],
  };
};
const cells = (cx, cy, r, random, count, style = {}) => ({
  paths: [
    circle(cx, cy, r, __spreadValues({ width: 22e-4, alpha: 0.5 }, style)),
    ...Array.from({ length: count }, (_, i) => {
      var _a;
      const a = random() * TAU;
      const d = Math.sqrt(random()) * r * 0.8;
      return path(
        ellipsePath(
          cx + Math.cos(a) * d,
          cy + Math.sin(a) * d,
          0.012 + random() * 0.012,
          8e-3 + random() * 8e-3,
          random() * Math.PI
        ),
        {
          width: 9e-4,
          alpha: 0.4,
          delay: ((_a = style.delay) != null ? _a : 0) + 0.15 + i * 0.02,
          span: 0.15,
        }
      );
    }),
  ],
  nodes: [],
});
const molecule = (cx, cy, r, style = {}) => {
  var _a;
  const hex = Array.from({ length: 7 }, (_, i) => [
    cx + Math.cos((i * TAU) / 6 + Math.PI / 6) * r,
    cy + Math.sin((i * TAU) / 6 + Math.PI / 6) * r,
  ]);
  return {
    paths: [
      path(hex, __spreadValues({ width: 18e-4, alpha: 0.55 }, style)),
      circle(cx, cy, r * 0.55, {
        width: 1e-3,
        alpha: 0.35,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.2,
      }),
      ...[0, 2, 4].map((k, i) => {
        var _a2;
        const [x, y] = hex[k];
        return segment([x, y], [x + (x - cx) * 0.8, y + (y - cy) * 0.8], {
          width: 12e-4,
          alpha: 0.45,
          delay: ((_a2 = style.delay) != null ? _a2 : 0) + 0.3 + i * 0.05,
        });
      }),
    ],
    nodes: [0, 2, 4].map((k, i) => {
      var _a2;
      const [x, y] = hex[k];
      return node(
        [x + (x - cx) * 0.8, y + (y - cy) * 0.8],
        0.02,
        ((_a2 = style.delay) != null ? _a2 : 0) + 0.45,
        i
      );
    }),
  };
};
const orbits = (cx, cy, radii, tilt, flatten, random, style = {}) => {
  var _a;
  return {
    paths: radii.map((r, i) => {
      var _a2;
      return path(
        ellipsePath(cx, cy, r, r * flatten, tilt),
        __spreadProps(__spreadValues({ width: 12e-4, alpha: 0.45 }, style), {
          delay: ((_a2 = style.delay) != null ? _a2 : 0) + i * 0.07,
          span: 0.5,
        })
      );
    }),
    nodes: [
      node([cx, cy], 0.04, ((_a = style.delay) != null ? _a : 0) + 0.2),
      ...radii.map((r, i) => {
        var _a2;
        const a = random() * TAU;
        const [x, y] = ellipsePath(cx, cy, r, r * flatten, tilt, a, a, 1)[0];
        return node(
          [x, y],
          0.018 + random() * 0.012,
          ((_a2 = style.delay) != null ? _a2 : 0) + 0.5 + i * 0.05,
          i
        );
      }),
    ],
  };
};
const starTrails = (cx, cy, random, count, maxR, style = {}) => {
  var _a;
  return {
    paths: Array.from({ length: count }, (_, i) => {
      var _a2;
      const r = maxR * (0.1 + random() * 0.9);
      const a = random() * TAU;
      const span = 0.4 + random() * 0.8;
      return path(
        arcPoints(cx, cy, r, a, a + span, 24),
        __spreadProps(
          __spreadValues({ width: 8e-4 + random() * 8e-4, alpha: 0.25 + random() * 0.3 }, style),
          { delay: ((_a2 = style.delay) != null ? _a2 : 0) + (i / count) * 0.4, span: 0.3 }
        )
      );
    }),
    nodes: [node([cx, cy], 0.03, ((_a = style.delay) != null ? _a : 0) + 0.1)],
  };
};
const sextant = (cx, cy, r, style = {}) => {
  var _a, _b, _c, _d, _e, _f;
  return merge(
    {
      paths: [
        path(
          arcPoints(cx, cy, r, Math.PI * 0.33, Math.PI * 0.67, 48),
          __spreadValues({ width: 2e-3, alpha: 0.6 }, style)
        ),
        segment([cx, cy], [cx + Math.cos(Math.PI * 0.33) * r, cy + Math.sin(Math.PI * 0.33) * r], {
          width: 14e-4,
          alpha: 0.5,
          delay: ((_a = style.delay) != null ? _a : 0) + 0.1,
        }),
        segment([cx, cy], [cx + Math.cos(Math.PI * 0.67) * r, cy + Math.sin(Math.PI * 0.67) * r], {
          width: 14e-4,
          alpha: 0.5,
          delay: ((_b = style.delay) != null ? _b : 0) + 0.12,
        }),
        segment(
          [cx, cy],
          [cx + Math.cos(Math.PI * 0.45) * r * 1.1, cy + Math.sin(Math.PI * 0.45) * r * 1.1],
          {
            width: 1e-3,
            alpha: 0.45,
            delay: ((_c = style.delay) != null ? _c : 0) + 0.3,
            dash: [6e-3, 6e-3],
          }
        ),
        segment([cx - r * 0.9, cy - r * 0.2], [cx + r * 0.2, cy - r * 0.05], {
          width: 9e-4,
          alpha: 0.35,
          delay: ((_d = style.delay) != null ? _d : 0) + 0.35,
          dash: [4e-3, 6e-3],
        }),
      ],
      nodes: [node([cx, cy], 0.022, ((_e = style.delay) != null ? _e : 0) + 0.3)],
    },
    rays(cx, cy, r * 0.94, r, 30, Math.PI * 0.33, Math.PI * 0.67, {
      delay: ((_f = style.delay) != null ? _f : 0) + 0.2,
      alpha: 0.4,
    })
  );
};
const constellation = (aspect, random, count, region, style = {}) => {
  const [x0, y0, x1, y1] = region;
  const stars = Array.from({ length: count }, () => [
    (x0 + random() * (x1 - x0)) * aspect,
    y0 + random() * (y1 - y0),
  ]);
  stars.sort((a, b) => a[0] - b[0]);
  return {
    paths: stars.slice(1).map((star, i) => {
      var _a;
      return segment(
        stars[i],
        star,
        __spreadProps(__spreadValues({ width: 1e-3, alpha: 0.4 }, style), {
          delay: ((_a = style.delay) != null ? _a : 0) + 0.2 + i * 0.06,
          span: 0.2,
        })
      );
    }),
    nodes: stars.map((at, i) => {
      var _a;
      return node(
        at,
        0.018 + random() * 0.016,
        ((_a = style.delay) != null ? _a : 0) + i * 0.05,
        i
      );
    }),
  };
};
const corona = (cx, cy, r, random, style = {}) => {
  var _a;
  return {
    paths: [
      circle(cx, cy, r, __spreadValues({ width: 24e-4, alpha: 0.65 }, style)),
      ...Array.from({ length: 40 }, (_, i) => {
        var _a2;
        const a = (i / 40) * TAU + random() * 0.05;
        const len = r * (0.25 + random() * 0.9);
        return segment(
          [cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05],
          [cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len)],
          {
            width: 8e-4,
            alpha: 0.25 + random() * 0.3,
            delay: ((_a2 = style.delay) != null ? _a2 : 0) + 0.2 + (i / 40) * 0.3,
            span: 0.15,
          }
        );
      }),
    ],
    nodes: [node([cx + r * 0.7, cy - r * 0.7], 0.03, ((_a = style.delay) != null ? _a : 0) + 0.5)],
  };
};
const crescent = (cx, cy, r, style = {}) => {
  var _a;
  return {
    paths: [
      path(
        arcPoints(cx, cy, r, Math.PI * 0.35, Math.PI * 1.65, 60),
        __spreadValues({ width: 2e-3, alpha: 0.6 }, style)
      ),
      path(arcPoints(cx + r * 0.45, cy, r * 0.85, Math.PI * 0.58, Math.PI * 1.42, 60), {
        width: 12e-4,
        alpha: 0.4,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.15,
      }),
    ],
    nodes: [],
  };
};
const armillary = (cx, cy, r, style = {}) => {
  var _a, _b, _c, _d, _e;
  return {
    paths: [
      circle(cx, cy, r, __spreadValues({ width: 2e-3, alpha: 0.55 }, style)),
      path(ellipsePath(cx, cy, r, r * 0.3, 0), {
        width: 14e-4,
        alpha: 0.45,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.1,
      }),
      path(ellipsePath(cx, cy, r, r * 0.3, 0.41), {
        width: 14e-4,
        alpha: 0.45,
        delay: ((_b = style.delay) != null ? _b : 0) + 0.15,
      }),
      path(ellipsePath(cx, cy, r * 0.3, r, 0), {
        width: 12e-4,
        alpha: 0.4,
        delay: ((_c = style.delay) != null ? _c : 0) + 0.2,
      }),
      segment(
        [cx - Math.sin(0.41) * r * 1.25, cy - Math.cos(0.41) * r * 1.25],
        [cx + Math.sin(0.41) * r * 1.25, cy + Math.cos(0.41) * r * 1.25],
        { width: 12e-4, alpha: 0.45, delay: ((_d = style.delay) != null ? _d : 0) + 0.3 }
      ),
    ],
    nodes: [node([cx, cy], 0.03, ((_e = style.delay) != null ? _e : 0) + 0.3)],
  };
};
const meteors = (aspect, random, count, style = {}) => {
  var _a, _b;
  const paths = [];
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    const x = (0.2 + random() * 0.8) * aspect;
    const y = random() * 0.5;
    const len = 0.12 + random() * 0.25;
    const head = [x - len * 0.8, y + len * 0.6];
    paths.push(
      segment(
        [x, y],
        head,
        __spreadProps(__spreadValues({ width: 12e-4 + random() * 1e-3, alpha: 0.45 }, style), {
          delay: ((_a = style.delay) != null ? _a : 0) + i * 0.08,
          span: 0.2,
        })
      )
    );
    nodes.push(node(head, 0.02, ((_b = style.delay) != null ? _b : 0) + i * 0.08 + 0.2, i));
  }
  return { paths, nodes };
};
const lampHead = (x, y, angle, size, style = {}) => {
  const d = [Math.cos(angle), Math.sin(angle)];
  const n = [-d[1], d[0]];
  const back = [x - d[0] * size, y - d[1] * size];
  const corners = [
    [back[0] + n[0] * size * 0.35, back[1] + n[1] * size * 0.35],
    [x + n[0] * size * 0.6, y + n[1] * size * 0.6],
    [x - n[0] * size * 0.6, y - n[1] * size * 0.6],
    [back[0] - n[0] * size * 0.35, back[1] - n[1] * size * 0.35],
  ];
  return {
    paths: [
      path(
        [...corners, corners[0]],
        __spreadValues({ width: 18e-4, alpha: 0.55, span: 0.3 }, style)
      ),
    ],
    nodes: [],
  };
};
const curtains = (aspect, gap, style = {}) => ({
  paths: flatMap([-1, 1], (side) =>
    Array.from({ length: 6 }, (_, i) => {
      var _a;
      const base = aspect / 2 + side * (gap / 2 + i * 0.05);
      return path(
        Array.from({ length: 41 }, (_2, k) => {
          const t = k / 40;
          return [base + Math.sin(t * 5 + i) * 8e-3 * side, -0.02 + t * 1.04];
        }),
        __spreadProps(
          __spreadValues({ width: 1e-3 + (5 - i) * 2e-4, alpha: 0.2 + (5 - i) * 0.05 }, style),
          { delay: ((_a = style.delay) != null ? _a : 0) + i * 0.05, span: 0.5 }
        )
      );
    })
  ),
  nodes: [],
});
const projector = (x, y, size, style = {}) => {
  var _a, _b, _c, _d;
  return {
    paths: [
      path(
        [
          [x - size, y - size * 0.3],
          [x, y - size * 0.3],
          [x, y + size * 0.3],
          [x - size, y + size * 0.3],
          [x - size, y - size * 0.3],
        ],
        __spreadValues({ width: 18e-4, alpha: 0.55 }, style)
      ),
      circle(x - size * 0.75, y - size * 0.65, size * 0.33, {
        width: 14e-4,
        alpha: 0.5,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.1,
      }),
      circle(x - size * 0.25, y - size * 0.65, size * 0.33, {
        width: 14e-4,
        alpha: 0.5,
        delay: ((_b = style.delay) != null ? _b : 0) + 0.15,
      }),
      path(
        [
          [x, y - size * 0.12],
          [x + size * 0.18, y - size * 0.18],
          [x + size * 0.18, y + size * 0.18],
          [x, y + size * 0.12],
        ],
        { width: 14e-4, alpha: 0.5, delay: ((_c = style.delay) != null ? _c : 0) + 0.2 }
      ),
    ],
    nodes: [node([x + size * 0.18, y], 0.024, ((_d = style.delay) != null ? _d : 0) + 0.3)],
  };
};
const horizon = (aspect, y, style = {}) => ({
  paths: [
    segment(
      [0, y],
      [aspect, y],
      __spreadProps(__spreadValues({ width: 14e-4, alpha: 0.4 }, style), { span: 0.6 })
    ),
    ...Array.from({ length: 16 }, (_, i) => {
      var _a;
      return segment([(aspect * (i + 0.5)) / 16, y], [(aspect * (i + 0.5)) / 16, y + 0.012], {
        width: 8e-4,
        alpha: 0.3,
        delay: ((_a = style.delay) != null ? _a : 0) + 0.3 + i * 0.01,
        span: 0.08,
      });
    }),
  ],
  nodes: [],
});
export {
  archWindow,
  armillary,
  bigLeaf,
  bloom,
  canopy,
  cells,
  circle,
  constellation,
  corona,
  crescent,
  crossWindow,
  crystal,
  cubeSplitter,
  curtains,
  doorSlit,
  ellipsePath,
  fernCurl,
  fiber,
  focusMark,
  glassCup,
  grating,
  gridPanel,
  horizon,
  interfaceLine,
  lampHead,
  lens,
  magnifier,
  merge as mergeDiagrams,
  meteors,
  mirror,
  moire,
  molecule,
  orbits,
  pinholeBox,
  polarizers,
  projector,
  rainbowArcs,
  rayPath,
  rays,
  rings,
  ripples,
  roseWindow,
  ruler,
  seedRoots,
  segment,
  sextant,
  shards,
  spectrumLines,
  standingWave,
  starTrails,
  tallWindows,
  twoSources,
  vine,
  waterline,
};
