// Copyright (c) 2026 chthollyphile. Derived from Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935; AGPL-3.0-only.
// Source: src/components/visualizer/metaphor/metaphorFigures.ts
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
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { arrayAt } from './compat.mjs';
import {
  METAPHOR_SHAPE_ARC,
  METAPHOR_SHAPE_BAR,
  METAPHOR_SHAPE_BLOB,
  METAPHOR_SHAPE_WAVE,
  staticMetaphorShape,
} from './metaphorShapes.mjs';
const METAPHOR_FIGURE_KINDS = [
  'orbit',
  'starmap',
  'lattice',
  'cell',
  'molecule',
  'detector',
  'feynman',
  'paths',
  'draft',
  // 高能物理的草稿图
  'shower',
  'decay',
  'bubble',
  'spectrum',
  'penguin',
  'box',
  'collider',
  'potential',
  'running',
  'cherenkov',
];
const FIGURE_LIMIT = 240;
const BACKDROP_LIMIT = 48;
const TAU = Math.PI * 2;
const STROKE = 0.016;
const BLOB_CORE = 0.55;
const ARC_AT = 0.9;
const WAVE_AMP = 0.75;
class Pen {
  constructor(cx, cy, scale, rot, delay, mix = { ink: 1, tone: 0, accent: 0 }, heavy = 1) {
    __publicField(this, 'cx', cx);
    __publicField(this, 'cy', cy);
    __publicField(this, 'scale', scale);
    __publicField(this, 'rot', rot);
    __publicField(this, 'delay', delay);
    __publicField(this, 'mix', mix);
    __publicField(this, 'heavy', heavy);
    __publicField(this, 'shapes', []);
    __publicField(this, 'notes', []);
    __publicField(this, 'cos');
    __publicField(this, 'sin');
    __publicField(this, 'stroke', 0);
    this.cos = Math.cos(rot);
    this.sin = Math.sin(rot);
  }
  at(x, y) {
    return [
      this.cx + (x * this.cos - y * this.sin) * this.scale,
      this.cy + (x * this.sin + y * this.cos) * this.scale,
    ];
  }
  /** 三笔一组，一组比上一组晚 0.2 秒。 */
  born() {
    const born = this.delay + Math.floor(this.stroke / 3) * 0.2;
    this.stroke += 1;
    return born;
  }
  line(x0, y0, x1, y1, dashes = 0, weight = 1) {
    const [ax, ay] = this.at(x0, y0);
    const [bx, by] = this.at(x1, y1);
    this.shapes.push(
      staticMetaphorShape(
        METAPHOR_SHAPE_BAR,
        __spreadValues(
          {
            x: (ax + bx) / 2,
            y: (ay + by) / 2,
            sx: Math.hypot(bx - ax, by - ay) / 2,
            sy: STROKE * weight * this.heavy,
            rot: Math.atan2(by - ay, bx - ax),
            param: dashes,
            born: this.born(),
          },
          this.mix,
        ),
      ),
    );
  }
  /** 两点之间的波浪线：halfWaves 个半波（两头都落在点上），amp 是振幅。 */
  wave(x0, y0, x1, y1, halfWaves, amp) {
    const [ax, ay] = this.at(x0, y0);
    const [bx, by] = this.at(x1, y1);
    this.shapes.push(
      staticMetaphorShape(
        METAPHOR_SHAPE_WAVE,
        __spreadProps(
          __spreadValues(
            {
              x: (ax + bx) / 2,
              y: (ay + by) / 2,
              sx: Math.hypot(bx - ax, by - ay) / 2,
              sy: (amp * this.scale) / WAVE_AMP + STROKE * 3,
              rot: Math.atan2(by - ay, bx - ax),
              param: halfWaves,
              born: this.born(),
            },
            this.mix,
          ),
          {
            tone: this.mix.tone + (this.heavy > 1 ? 0.2 : 0),
          },
        ),
      ),
    );
  }
  /** 圆弧：圆心、半径、弧的中点方向和半张角（默认整圆）。 */
  arc(x, y, radius, mid = 0, half = Math.PI, weight = 1) {
    const [cx, cy] = this.at(x, y);
    const size = (radius * this.scale) / ARC_AT;
    this.shapes.push(
      staticMetaphorShape(
        METAPHOR_SHAPE_ARC,
        __spreadValues(
          {
            x: cx,
            y: cy,
            sx: size,
            sy: weight * this.heavy,
            rot: mid + this.rot,
            param: Math.min(1, half / Math.PI),
            born: this.born(),
          },
          this.mix,
        ),
      ),
    );
  }
  dot(x, y, radius) {
    const [cx, cy] = this.at(x, y);
    const size = (radius * this.scale) / BLOB_CORE;
    this.shapes.push(
      staticMetaphorShape(
        METAPHOR_SHAPE_BLOB,
        __spreadValues({ x: cx, y: cy, sx: size, sy: size, born: this.born() }, this.mix),
      ),
    );
  }
  /** 绕着一个点匀速转的点（行星）。 */
  orbiter(x, y, orbit, radius, speed, phase) {
    const [cx, cy] = this.at(x, y);
    const size = (radius * this.scale) / BLOB_CORE;
    this.shapes.push(
      staticMetaphorShape(
        METAPHOR_SHAPE_BLOB,
        __spreadValues(
          {
            x: cx,
            y: cy,
            sx: size,
            sy: size,
            orbit: orbit * this.scale,
            orbitSpeed: speed,
            p1: phase,
            steady: true,
            born: this.born(),
          },
          this.mix,
        ),
      ),
    );
  }
  /** 带箭头的线：箭头在线上 at 处，朝终点。 */
  arrow(x0, y0, x1, y1, at = 0.55) {
    this.line(x0, y0, x1, y1);
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const hx = x0 + (x1 - x0) * at;
    const hy = y0 + (y1 - y0) * at;
    for (const side of [0.45, -0.45]) {
      this.line(hx, hy, hx - Math.cos(angle + side) * 0.11, hy - Math.sin(angle + side) * 0.11);
    }
  }
  note(text, x, y, size, align = 0, rot = 0) {
    const [ax, ay] = this.at(x, y);
    this.notes.push({
      text,
      x: ax,
      y: ay,
      size: size * this.scale,
      rot: rot + this.rot,
      align,
      born: this.born(),
    });
  }
}
const span = (rng, min, max) => min + rng() * (max - min);
const choose = (rng, items) => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
const shuffle = (rng, items) => {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [list[index], list[other]] = [list[other], list[index]];
  }
  return list;
};
const drawOrbit = (pen, rng) => {
  const rings = 3 + Math.floor(rng() * 2);
  pen.dot(0, 0, 0.085);
  for (let index = 0; index < rings; index += 1) {
    const radius = 0.3 + (index * 0.7) / (rings - 1);
    pen.arc(0, 0, radius);
    pen.orbiter(
      0,
      0,
      radius,
      span(rng, 0.03, 0.055),
      ((rng() < 0.85 ? 1 : -1) * 0.1) / radius ** 1.5,
      rng() * TAU,
    );
  }
  const angle = span(rng, 0.2, 1.2);
  pen.line(0, 0, Math.cos(angle), Math.sin(angle), 9);
  pen.arc(0, 0, 0.16, angle / 2, angle / 2);
  pen.note(
    choose(rng, ['T² ∝ a³', 'a = 1.52 AU', 'e = 0.0167', 'v² = GM/r']),
    Math.cos(angle) * 1.08,
    Math.sin(angle) * 1.08,
    0.15,
  );
  pen.arc(span(rng, -0.4, 0.4), span(rng, 0.9, 1.3), 1.5, -Math.PI / 2, 0.55);
};
const drawStarmap = (pen, rng) => {
  var _a, _b;
  const stars = [];
  for (let tries = 0; stars.length < 7 && tries < 60; tries += 1) {
    const angle = rng() * TAU;
    const radius = Math.sqrt(rng()) * 0.85;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (stars.every(([sx, sy]) => Math.hypot(sx - x, sy - y) > 0.32)) stars.push([x, y]);
  }
  stars.sort((a, b) => a[0] - b[0]);
  stars.forEach(([x, y], index) => {
    pen.dot(x, y, span(rng, 0.03, 0.07));
    if (index > 0) pen.line(stars[index - 1][0], stars[index - 1][1], x, y);
  });
  const [named, crossed] = [
    (_a = stars[1]) != null ? _a : stars[0],
    (_b = arrayAt(stars, -1)) != null ? _b : stars[0],
  ];
  pen.arc(named[0], named[1], 0.14);
  pen.note(choose(rng, ['α', 'β', 'γ', 'δ']), named[0] + 0.18, named[1] + 0.14, 0.17);
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    pen.line(
      crossed[0] + dx * 0.1,
      crossed[1] + dy * 0.1,
      crossed[0] + dx * 0.24,
      crossed[1] + dy * 0.24,
    );
  }
  const mid = span(rng, 0.9, 2.2);
  pen.arc(0, 0, 1.08, mid, 0.5);
  for (let tick = -2; tick <= 2; tick += 1) {
    const angle = mid + tick * 0.22;
    pen.line(
      Math.cos(angle) * 1.08,
      Math.sin(angle) * 1.08,
      Math.cos(angle) * 1.16,
      Math.sin(angle) * 1.16,
    );
  }
  pen.note(
    choose(rng, ['δ −05° 23′', 'RA 05h 35m', 'z = 0.0073', 'd = 4.2 ly']),
    -0.95,
    -1.05,
    0.14,
  );
};
const drawLattice = (pen, rng) => {
  const gamma = choose(rng, [Math.PI / 3, Math.PI / 2, 1.3]);
  const pitch = 0.46;
  const bx = Math.cos(gamma) * pitch;
  const by = Math.sin(gamma) * pitch;
  const at = (column, row) => [(column - 1.5) * pitch + (row - 1) * bx, (row - 1) * by];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const [x, y] = at(column, row);
      if (column < 3) pen.line(x, y, ...at(column + 1, row));
      if (row < 2) pen.line(x, y, ...at(column, row + 1));
      pen.dot(x, y, 0.045);
    }
  }
  const [ox, oy] = at(1, 0);
  pen.line(ox, oy, ...at(2, 0), 0, 2.2);
  pen.line(ox, oy, ...at(1, 1), 0, 2.2);
  pen.note('a', ox + pitch / 2, oy - 0.14, 0.16, 0.5);
  pen.note('b', ox + bx / 2 - 0.14, oy + by / 2, 0.16, 0.5);
  for (let column = 0; column < 3; column += 1) {
    const [x, y] = at(column, 1);
    pen.arc(x + (pitch + bx) / 2, y + by / 2, 0.05);
  }
  pen.note(
    choose(rng, ['nλ = 2d sinθ', 'a = 5.43 Å', '(1 1 1)', 'G · R = 2πn']),
    -0.9,
    -0.82,
    0.15,
  );
};
const drawCell = (pen, rng) => {
  const half = 0.52;
  const front = [
    [-half - 0.2, -half - 0.14],
    [half - 0.2, -half - 0.14],
    [half - 0.2, half - 0.14],
    [-half - 0.2, half - 0.14],
  ];
  const back = front.map(([x, y]) => [x + 0.44, y + 0.32]);
  for (let index = 0; index < 4; index += 1) {
    const next = (index + 1) % 4;
    pen.line(...front[index], ...front[next]);
    pen.line(...back[index], ...back[next], index === 0 || index === 3 ? 7 : 0);
    pen.line(...front[index], ...back[index], index === 0 ? 5 : 0);
    pen.dot(...front[index], 0.055);
    pen.dot(...back[index], 0.045);
  }
  const faceCentred = rng() < 0.5;
  if (faceCentred) {
    for (const face of [front, back])
      pen.arc((face[0][0] + face[2][0]) / 2, (face[0][1] + face[2][1]) / 2, 0.06);
    for (const index of [0, 1, 2, 3]) {
      const next = (index + 1) % 4;
      pen.arc((front[index][0] + back[next][0]) / 2, (front[index][1] + back[next][1]) / 2, 0.05);
    }
  } else {
    pen.dot(0.02, 0.02, 0.075);
    pen.line(...front[0], ...back[2], 9);
  }
  pen.note(faceCentred ? 'fcc' : 'bcc', -half - 0.2, half + 0.38, 0.18);
  pen.note(
    choose(rng, ['a = 3.61 Å', 'a = 2.87 Å', '[1 0 0]', 'Z = 4']),
    -half - 0.2,
    -half - 0.36,
    0.14,
  );
};
const drawMolecule = (pen, rng) => {
  if (rng() < 0.55) {
    const vertex = (index, radius) => [
      Math.cos(Math.PI / 6 + (index * Math.PI) / 3) * radius,
      Math.sin(Math.PI / 6 + (index * Math.PI) / 3) * radius,
    ];
    for (let index = 0; index < 6; index += 1) {
      pen.line(...vertex(index, 0.5), ...vertex(index + 1, 0.5));
      if (index % 2 === 0) {
        const [ax, ay] = vertex(index, 0.39);
        const [bx, by] = vertex(index + 1, 0.39);
        pen.line(
          ax + (bx - ax) * 0.12,
          ay + (by - ay) * 0.12,
          bx + (ax - bx) * 0.12,
          by + (ay - by) * 0.12,
        );
      }
    }
    const groups = shuffle(rng, ['OH', 'NH₂', 'CH₃', 'Cl', 'COOH']);
    shuffle(rng, [0, 1, 2, 3, 4, 5])
      .slice(0, 1 + Math.floor(rng() * 2))
      .forEach((index, order) => {
        const [x, y] = vertex(index, 0.5);
        const [ex, ey] = vertex(index, 0.86);
        pen.line(x, y, ex, ey);
        pen.note(groups[order], ...vertex(index, 1.02), 0.16, 0.5);
      });
    pen.note(choose(rng, ['C₆H₆', 'sp²', 'π', '1.39 Å']), 0, -1.05, 0.15, 0.5);
    return;
  }
  const [arms, angle, formula] = choose(rng, [
    [2, 104.5, 'H₂O'],
    [3, 120, 'BF₃'],
    [4, 109.5, 'CH₄'],
    [2, 180, 'CO₂'],
  ]);
  const spread = arms === 2 ? (angle * Math.PI) / 180 : TAU / arms;
  const start = Math.PI / 2 - (arms === 2 ? spread / 2 : 0);
  pen.dot(0, 0, 0.13);
  for (let index = 0; index < arms; index += 1) {
    const direction = start + index * spread;
    pen.line(
      Math.cos(direction) * 0.14,
      Math.sin(direction) * 0.14,
      Math.cos(direction) * 0.62,
      Math.sin(direction) * 0.62,
      0,
      1.6,
    );
    pen.dot(Math.cos(direction) * 0.7, Math.sin(direction) * 0.7, 0.08);
  }
  if (angle < 180) {
    pen.arc(0, 0, 0.3, start + spread / 2, spread / 2);
    pen.note(
      `${angle}°`,
      Math.cos(start + spread / 2) * 0.42,
      Math.sin(start + spread / 2) * 0.42,
      0.13,
      0.5,
    );
  }
  pen.note(formula, 0, -0.95, 0.18, 0.5);
};
const drawDetector = (pen, rng) => {
  pen.arc(0, 0, 0.32);
  pen.arc(0, 0, 0.62);
  pen.arc(0, 0, 1, 0, Math.PI, 1.6);
  pen.dot(0, 0, 0.035);
  for (let track = 5 + Math.floor(rng() * 4); track > 0; track -= 1) {
    const bend = span(rng, 0.55, 2.4);
    const direction = rng() * TAU;
    const side = rng() < 0.5 ? 1 : -1;
    const reach = rng() < 0.3 ? 0.62 : 1;
    const centre = direction + (side * Math.PI) / 2;
    const half = Math.asin(Math.min(1, reach / (2 * bend)));
    pen.arc(
      Math.cos(centre) * bend,
      Math.sin(centre) * bend,
      bend,
      centre + Math.PI + side * half,
      half,
    );
  }
  const jets = [rng() * TAU, rng() * TAU];
  for (let tower = 7 + Math.floor(rng() * 4); tower > 0; tower -= 1) {
    const angle = choose(rng, jets) + span(rng, -0.35, 0.35);
    const height = span(rng, 0.05, 0.3);
    pen.line(
      Math.cos(angle) * 1.04,
      Math.sin(angle) * 1.04,
      Math.cos(angle) * (1.04 + height),
      Math.sin(angle) * (1.04 + height),
      0,
      2.4,
    );
  }
  pen.note(choose(rng, ['√s = 13 TeV', 'pT > 20 GeV', '|η| < 2.5', 'B = 3.8 T']), -1, -1.3, 0.14);
};
const drawFeynman = (pen, rng) => {
  const variant = Math.floor(rng() * 3);
  if (variant === 0) {
    const [inA, inB, boson, outA, outB] = choose(rng, [
      ['e⁻', 'e⁺', 'γ', 'μ⁻', 'μ⁺'],
      ['u', 'd', 'W', 'e', 'ν'],
      ['q', 'q', 'g', 't', 't'],
    ]);
    pen.arrow(-1, 0.6, -0.35, 0);
    pen.arrow(-0.35, 0, -1, -0.6);
    pen.wave(-0.35, 0, 0.35, 0, 7, 0.07);
    pen.arrow(0.35, 0, 1, 0.6);
    pen.arrow(1, -0.6, 0.35, 0);
    pen.dot(-0.35, 0, 0.04);
    pen.dot(0.35, 0, 0.04);
    pen.note(inA, -1.02, 0.78, 0.17, 0.5);
    pen.note(inB, -1.02, -0.78, 0.17, 0.5);
    pen.note(boson, 0, 0.22, 0.17, 0.5);
    pen.note(outA, 1.02, 0.78, 0.17, 0.5);
    pen.note(outB, 1.02, -0.78, 0.17, 0.5);
  } else if (variant === 1) {
    for (const y of [0.45, -0.45]) {
      pen.arrow(-1, y, 0, y);
      pen.arrow(0, y, 1, y);
      pen.dot(0, y, 0.04);
    }
    pen.wave(0, 0.45, 0, -0.45, 9, 0.07);
    pen.note('e⁻', -1.02, 0.64, 0.17, 0.5);
    pen.note('p', -1.02, -0.66, 0.17, 0.5);
    pen.note('γ', 0.2, 0, 0.17, 0.5);
    pen.note('−ie γμ', 0.2, 0.68, 0.13);
  } else {
    pen.wave(-1, 0, -0.4, 0, 7, 0.07);
    pen.arc(0, 0, 0.4);
    pen.wave(0.4, 0, 1, 0, 7, 0.07);
    pen.dot(-0.4, 0, 0.04);
    pen.dot(0.4, 0, 0.04);
    pen.line(0, 0.4, -0.1, 0.46);
    pen.line(0, 0.4, -0.1, 0.34);
    pen.line(0, -0.4, 0.1, -0.34);
    pen.line(0, -0.4, 0.1, -0.46);
    pen.note('γ', -0.72, 0.2, 0.17, 0.5);
    pen.note('k', 0, 0.6, 0.15, 0.5);
    pen.note('O(α²)', 0.5, -0.66, 0.14);
  }
  pen.line(-0.9, -1, 0.9, -1, 0, 0.8);
  pen.line(0.9, -1, 0.8, -0.95, 0, 0.8);
  pen.line(0.9, -1, 0.8, -1.05, 0, 0.8);
  pen.note('t', 1, -1, 0.14);
};
const drawPaths = (pen, rng) => {
  pen.dot(-0.9, 0, 0.06);
  pen.dot(0.9, 0, 0.06);
  pen.line(-0.9, 0, 0.9, 0, 0, 1.5);
  for (let halfWaves = 1; halfWaves <= 6; halfWaves += 1)
    pen.wave(-0.9, 0, 0.9, 0, halfWaves, span(rng, 0.12, 0.6) / Math.sqrt(halfWaves));
  pen.note('A', -1.08, 0, 0.17, 0.5);
  pen.note('B', 1.08, 0, 0.17, 0.5);
  pen.note(
    choose(rng, ['Z = ∫Dφ exp(iS/ħ)', 'δS = 0', 'S = ∫ L dt', '⟨B|A⟩ = Σ exp(iS/ħ)']),
    -0.9,
    -0.85,
    0.15,
  );
};
const FORMULAS = [
  'E² = p²c² + m²c⁴',
  'S = ∫ L d⁴x',
  '∇·E = ρ/ε₀',
  'Δx Δp ≥ ħ/2',
  'r = 2GM/c²',
  '1/(p² − m² + iε)',
  '∫ d⁴k/(2π)⁴',
  'α ≈ 1/137',
  'Σ 1/n² = π²/6',
  'H ψ = E ψ',
  '∂μ Fμν = Jν',
  'T = 2.725 K',
  'F = G m₁m₂/r²',
  'dS ≥ 0',
  'β = −11 + 2n/3',
];
const drawDraft = (pen, rng) => {
  const lines = shuffle(rng, FORMULAS).slice(0, 4);
  const struck = Math.floor(rng() * 2);
  const boxed = 3;
  lines.forEach((text, row) => {
    const y = 0.85 - row * 0.3;
    const width = Array.from(text).length * 0.085;
    pen.note(text, -1, y, 0.16);
    if (row === struck) pen.line(-1.04, y - 0.03, -1 + width + 0.04, y + 0.04);
    if (row === 2) pen.line(-1, y - 0.12, -1 + width, y - 0.12);
    if (row === boxed) {
      const [x0, x1, y0, y1] = [-1.08, -1 + width + 0.08, y - 0.14, y + 0.14];
      pen.line(x0, y0, x1, y0);
      pen.line(x1, y0, x1, y1);
      pen.line(x1, y1, x0, y1);
      pen.line(x0, y1, x0, y0);
    }
  });
  const [ox, oy] = [-0.2, -1.1];
  pen.line(ox, oy, ox + 1.2, oy);
  pen.line(ox, oy, ox, oy + 0.62);
  const peak = span(rng, 0.45, 0.8);
  for (let index = 0; index < 11; index += 1) {
    const x = 0.08 + index * 0.1;
    const offset = (x - peak) / 0.11;
    pen.dot(ox + x, oy + 0.06 + 0.5 / (1 + offset * offset) + span(rng, -0.025, 0.025), 0.022);
  }
  pen.line(ox + peak, oy, ox + peak, oy + 0.6, 7);
  pen.note(choose(rng, ['m = 125 GeV', 'Γ', 'm₀', 'σ(E)']), ox + peak + 0.06, oy + 0.64, 0.13);
  pen.note(choose(rng, ['∴', '= 0 ?', '→ ∞', '+ h.c.', 'QED']), 0.55, 0.55, 0.2);
};
const drawShower = (pen, rng) => {
  pen.arrow(-1.05, 0, -0.6, 0);
  pen.note('e⁻', -1.05, 0.16, 0.16);
  let layer = [{ x: -0.6, y: 0, photon: false }];
  for (let generation = 0; generation < 4; generation += 1) {
    const spread = 0.42 / 2 ** generation;
    const next = [];
    if (generation > 0) pen.line(layer[0].x, -0.95, layer[0].x, 0.95, 11);
    for (const node of layer) {
      pen.dot(node.x, node.y, 0.022);
      for (const side of [1, -1]) {
        const child = {
          x: node.x + 0.38,
          y: node.y + side * spread * span(rng, 0.8, 1.15),
          photon: node.photon ? false : side > 0,
        };
        if (child.photon) pen.wave(node.x, node.y, child.x, child.y, 5, 0.028);
        else pen.line(node.x, node.y, child.x, child.y);
        next.push(child);
      }
    }
    layer = next;
  }
  pen.note('X₀', -0.22, -1.08, 0.15, 0.5);
  pen.note(choose(rng, ['N ≈ 2ⁿ', 'E/2ⁿ < Ec', 'tmax ∝ ln E']), 0.2, 1.1, 0.14);
};
const drawDecay = (pen, rng) => {
  const [parent, boson, a, b, c, d, tail] = choose(rng, [
    ['H', 'Z', 'μ⁺', 'μ⁻', 'e⁺', 'e⁻', 'm = 125 GeV'],
    ['H', 'W', 'ℓ', 'ν', 'q', 'q', 'BR ≈ 21%'],
    ['t t', 'W', 'b', 'ℓν', 'b', 'jj', 'm = 173 GeV'],
  ]);
  pen.dot(-0.95, 0, 0.07);
  pen.line(-0.95, 0, -0.4, 0, 5);
  pen.dot(-0.4, 0, 0.035);
  pen.note(parent, -0.95, 0.2, 0.18, 0.5);
  const leaves = [
    [a, b],
    [c, d],
  ];
  [1, -1].forEach((side, branch) => {
    const y = side * 0.52;
    pen.wave(-0.4, 0, 0.2, y, 7, 0.045);
    pen.dot(0.2, y, 0.035);
    pen.note(boson, -0.16, y * 0.5 + side * 0.2, 0.16, 0.5);
    [1, -1].forEach((fork, leaf) => {
      const end = y + fork * 0.3;
      pen.arrow(0.2, y, 0.9, end);
      pen.note(leaves[branch][leaf], 1.04, end, 0.16, 0.5);
    });
  });
  pen.note(tail, -1, -1, 0.14);
};
const spiral = (pen, x, y, radius, shrink, direction, flip) => {
  for (let turn = 0; turn < 5 && radius - turn * shrink > 0.03; turn += 1) {
    const centre = x + direction * (radius - (turn % 2 === 0 ? 0 : shrink));
    pen.arc(
      centre,
      y,
      radius - turn * shrink,
      (turn % 2 === 0 ? 1 : -1) * flip * (Math.PI / 2),
      Math.PI / 2,
    );
  }
};
const drawBubble = (pen, rng) => {
  const [vx, vy] = [span(rng, -0.15, 0.15), span(rng, -0.25, 0.05)];
  pen.line(-1.1, vy - 0.25, vx, vy, 9);
  pen.dot(vx, vy, 0.03);
  spiral(pen, vx, vy, span(rng, 0.3, 0.42), 0.07, -1, 1);
  spiral(pen, vx, vy, span(rng, 0.36, 0.5), 0.085, 1, -1);
  for (let track = 2 + Math.floor(rng() * 2); track > 0; track -= 1) {
    const angle = span(rng, -0.5, 0.5);
    pen.line(vx, vy, vx + Math.cos(angle) * 1.1, vy + Math.sin(angle) * 1.1);
  }
  for (let bubble = 0; bubble < 7; bubble += 1)
    pen.dot(-0.95 + bubble * (0.2 - bubble * 0.012), 0.75 + bubble * 0.03, 0.02);
  for (const [cx, cy] of [
    [-0.85, -0.85],
    [0.85, 0.8],
  ]) {
    pen.line(cx - 0.1, cy, cx + 0.1, cy);
    pen.line(cx, cy - 0.1, cx, cy + 0.1);
  }
  pen.note('γ → e⁺e⁻', vx - 0.5, vy - 0.62, 0.15);
  pen.note(choose(rng, ['B = 2 T', 'p = 0.3 B r', 'Λ → p π⁻']), 0.3, -1, 0.14);
};
const drawSpectrum = (pen, rng) => {
  const [ox, oy] = [-0.9, -0.8];
  pen.line(ox, oy, 1, oy);
  pen.line(ox, oy, ox, 0.85);
  const peak = 6 + Math.floor(rng() * 4);
  const bins = 14;
  const width = 1.8 / bins;
  for (let bin = 0; bin < bins; bin += 1) {
    const offset = (bin - peak) / 0.9;
    const height = 1.35 * Math.exp(-bin * 0.2) + 0.3 * Math.exp(-offset * offset) + 0.05;
    const x = ox + 0.05 + bin * width;
    pen.line(x, oy + height, x + width, oy + height);
    const point = oy + height + span(rng, -0.06, 0.06);
    pen.dot(x + width / 2, point, 0.022);
    pen.line(x + width / 2, point - 0.07, x + width / 2, point + 0.07);
  }
  const px = ox + 0.05 + (peak + 0.5) * width;
  pen.line(px, oy, px, oy + 0.95, 7);
  pen.note(choose(rng, ['125', '91.2', '3.1']), px, oy - 0.14, 0.14, 0.5);
  pen.note(choose(rng, ['m(γγ)  GeV', 'm(μμ)  GeV', 'm(4ℓ)  GeV']), 1, oy - 0.14, 0.14, 1);
  pen.note('Events', ox - 0.14, 0.85, 0.14, 1, Math.PI / 2);
  pen.note(choose(rng, ['5σ', 'S/√B', 'χ²/ndf = 1.1']), px + 0.12, oy + 1.02, 0.16);
};
const drawPenguin = (pen, rng) => {
  pen.arrow(-1.05, 0.15, -0.45, 0.15);
  pen.arrow(-0.45, 0.15, 0.45, 0.15, 0.3);
  pen.arrow(0.45, 0.15, 1.05, 0.15);
  pen.arc(0, 0.15, 0.45, Math.PI / 2, Math.PI / 2);
  pen.dot(-0.45, 0.15, 0.035);
  pen.dot(0.45, 0.15, 0.035);
  pen.dot(0, 0.15, 0.035);
  pen.wave(0, 0.15, 0, -0.5, 9, 0.05);
  pen.dot(0, -0.5, 0.035);
  pen.arrow(0, -0.5, 0.75, -0.3);
  pen.arrow(0.75, -0.8, 0, -0.5);
  pen.note('b', -1.05, 0.33, 0.17, 0.5);
  pen.note('s', 1.05, 0.33, 0.17, 0.5);
  pen.note('W', 0, 0.76, 0.17, 0.5);
  pen.note(choose(rng, ['t', 'u, c, t']), -0.22, 0.02, 0.14, 0.5);
  pen.note('g', 0.18, -0.2, 0.16, 0.5);
  pen.note('q', 0.88, -0.28, 0.15, 0.5);
  pen.note('q', 0.88, -0.84, 0.15, 0.5);
  pen.note(choose(rng, ['b → s g', 'Vtb V*ts', 'O(GF αs)']), -1, -0.95, 0.14);
};
const drawBox = (pen, rng) => {
  const [meson, upper, lower] = choose(rng, [
    ['K⁰', 's', 'd'],
    ['B⁰', 'b', 'd'],
    ['D⁰', 'c', 'u'],
  ]);
  pen.arrow(-1.05, 0.38, -0.42, 0.38);
  pen.arrow(-0.42, 0.38, 0.42, 0.38);
  pen.arrow(0.42, 0.38, 1.05, 0.38);
  pen.arrow(1.05, -0.38, 0.42, -0.38);
  pen.arrow(0.42, -0.38, -0.42, -0.38);
  pen.arrow(-0.42, -0.38, -1.05, -0.38);
  pen.wave(-0.42, 0.38, -0.42, -0.38, 7, 0.05);
  pen.wave(0.42, 0.38, 0.42, -0.38, 7, 0.05);
  for (const x of [-0.42, 0.42]) {
    pen.dot(x, 0.38, 0.035);
    pen.dot(x, -0.38, 0.035);
  }
  pen.note(upper, -0.75, 0.56, 0.16, 0.5);
  pen.note(lower, -0.75, -0.58, 0.16, 0.5);
  pen.note(lower, 0.75, 0.56, 0.16, 0.5);
  pen.note(upper, 0.75, -0.58, 0.16, 0.5);
  pen.note('u, c, t', 0, 0.56, 0.13, 0.5);
  pen.note('W', -0.62, 0, 0.16, 0.5);
  pen.note('W', 0.62, 0, 0.16, 0.5);
  pen.note(meson, -1.25, 0, 0.18, 0.5);
  pen.note(choose(rng, ['Δm', 'ΔF = 2', 'ε ≈ 2.2×10⁻³']), -0.3, -1, 0.15);
};
const drawCollider = (pen, rng) => {
  pen.arc(0.15, 0.1, 0.85, 0, Math.PI, 1.4);
  pen.arc(0.15, 0.1, 0.79);
  pen.arc(-0.52, -0.68, 0.27);
  pen.arc(-0.92, -0.9, 0.1);
  pen.line(-1.3, -1.02, -1, -0.96, 0, 2.2);
  pen.line(-0.84, -0.84, -0.72, -0.86);
  pen.line(-0.33, -0.49, -0.42, -0.52);
  const turn = rng() * 0.6;
  for (let point = 0; point < 4; point += 1) {
    const angle = turn + (point * Math.PI) / 2;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    pen.dot(0.15 + cos * 0.82, 0.1 + sin * 0.82, 0.05);
    pen.line(0.15 + cos * 0.7, 0.1 + sin * 0.7, 0.15 + cos * 0.95, 0.1 + sin * 0.95, 0, 1.6);
    pen.note(`IP${[1, 2, 5, 8][point]}`, 0.15 + cos * 1.12, 0.1 + sin * 1.12, 0.13, 0.5);
  }
  for (const [angle, radius, way] of [
    [turn + 0.8, 0.85, 1],
    [turn + 0.8 + Math.PI, 0.79, -1],
  ]) {
    const [x, y] = [0.15 + Math.cos(angle) * radius, 0.1 + Math.sin(angle) * radius];
    const along = angle + (way * Math.PI) / 2;
    for (const side of [0.5, -0.5])
      pen.line(x, y, x - Math.cos(along + side) * 0.12, y - Math.sin(along + side) * 0.12);
  }
  pen.note(choose(rng, ['27 km', 'C = 26.7 km', '2808 bunches']), 0.15, 0.1, 0.16, 0.5);
  pen.note(choose(rng, ['√s = 13.6 TeV', 'L = 2×10³⁴', 'B = 8.3 T']), 0.15, -0.14, 0.13, 0.5);
  pen.note('LINAC', -1.3, -1.18, 0.12);
};
const drawPotential = (pen, rng) => {
  const curve = (x) => 3.2 * (x * x - 0.5) ** 2 - 0.6;
  pen.line(-1.15, -0.78, 1.15, -0.78);
  pen.line(0, -0.9, 0, 0.9);
  const steps = 22;
  for (let step = 0; step < steps; step += 1) {
    const x0 = -1.05 + (step * 2.1) / steps;
    const x1 = -1.05 + ((step + 1) * 2.1) / steps;
    pen.line(x0, curve(x0), x1, curve(x1), 0, 1.3);
  }
  const side = rng() < 0.5 ? 1 : -1;
  const valley = side * Math.SQRT1_2;
  pen.arc(0, curve(0) + 0.07, 0.06);
  pen.dot(valley, curve(valley) + 0.07, 0.065);
  pen.line(side * 0.1, curve(0) + 0.02, valley - side * 0.12, curve(valley) + 0.24, 6);
  pen.line(valley, -0.78, valley, curve(valley), 5);
  pen.note('V(φ)', 0.08, 0.92, 0.16);
  pen.note('φ', 1.2, -0.92, 0.16, 0.5);
  pen.note('v', valley, -0.92, 0.15, 0.5);
  pen.note(
    choose(rng, ['v = 246 GeV', 'μ² < 0', 'V = μ²φ² + λφ⁴', 'mH² = 2λv²']),
    -1.1,
    -1.12,
    0.14,
  );
};
const drawRunning = (pen, rng) => {
  const [ox, oy] = [-0.9, -0.8];
  pen.line(ox, oy, 1.05, oy);
  pen.line(ox, oy, ox, 0.85);
  for (let tick = 1; tick <= 6; tick += 1)
    pen.line(ox + tick * 0.28, oy, ox + tick * 0.28, oy + (tick % 2 === 0 ? 0.08 : 0.05));
  const meet = span(rng, 0.5, 0.7);
  const gap = rng() < 0.5 ? 0.09 : 0.02;
  const starts = [0.62, 0.05, -0.5];
  starts.forEach((start, index) => {
    const end = -0.02 + (index - 1) * -gap;
    const slope = (end - start) / (meet - ox);
    pen.line(ox, start, 1, start + slope * (1 - ox), 0, index === 2 ? 1.6 : 1);
    pen.note(`α${['₁', '₂', '₃'][index]}⁻¹`, ox + 0.08, start + 0.13, 0.15);
  });
  pen.line(meet, oy, meet, 0.6, 9);
  pen.note(choose(rng, ['10¹⁶ GeV', 'MGUT', 'Λ']), meet, oy - 0.14, 0.14, 0.5);
  pen.note('log Q', 1.05, oy - 0.14, 0.14, 1);
  pen.note(choose(rng, ['β₀ = 11 − 2n/3', 'dα/d ln Q = β(α)', 'SUSY ?']), 0, 0.92, 0.14);
};
const drawCherenkov = (pen, rng) => {
  const sine = span(rng, 0.42, 0.6);
  const angle = Math.asin(sine);
  pen.arrow(-1.1, 0, 1.05, 0, 0.92);
  for (let wave = 0; wave < 6; wave += 1) {
    const x = -0.85 + wave * 0.3;
    pen.arc(x, 0, (0.9 - x) * sine);
    pen.dot(x, 0, 0.02);
  }
  const reach = 1.75 * Math.cos(angle);
  for (const side of [1, -1]) {
    pen.line(0.9, 0, 0.9 - Math.cos(angle) * reach, side * Math.sin(angle) * reach, 0, 1.5);
    const [fx, fy] = [0.9 - Math.cos(angle) * reach * 0.55, side * Math.sin(angle) * reach * 0.55];
    pen.wave(fx, fy, fx + Math.sin(angle) * 0.5, fy + side * Math.cos(angle) * 0.5, 6, 0.035);
  }
  pen.arc(0.9, 0, 0.3, Math.PI - angle / 2, angle / 2);
  pen.note('θ', 0.5, 0.1, 0.15, 0.5);
  pen.note('cos θ = 1/nβ', -1.1, -1.12, 0.15);
  pen.note(choose(rng, ['β > 1/n', 'n = 1.33', 'v > c/n']), 0.35, 1.02, 0.14);
};
const DRAW = {
  orbit: drawOrbit,
  starmap: drawStarmap,
  lattice: drawLattice,
  cell: drawCell,
  molecule: drawMolecule,
  detector: drawDetector,
  feynman: drawFeynman,
  paths: drawPaths,
  draft: drawDraft,
  shower: drawShower,
  decay: drawDecay,
  bubble: drawBubble,
  spectrum: drawSpectrum,
  penguin: drawPenguin,
  box: drawBox,
  collider: drawCollider,
  potential: drawPotential,
  running: drawRunning,
  cherenkov: drawCherenkov,
};
const TONE_MIX = { ink: 0, tone: 0.75, accent: 0 };
const TONE_HEAVY = 2.6;
const drawMetaphorFigure = (
  kind,
  rng,
  x = 0,
  y = 0,
  scale = 1,
  rot = 0,
  delay = 0,
  toned = false,
) => {
  const pen = toned
    ? new Pen(x, y, scale, rot, delay, TONE_MIX, TONE_HEAVY)
    : new Pen(x, y, scale, rot, delay);
  DRAW[kind](pen, rng);
  if (toned) return { shapes: pen.shapes, notes: [] };
  return { shapes: pen.shapes, notes: pen.notes };
};
const STAGE_SLOTS = [
  [-0.72, 0.3],
  [0.72, -0.3],
  [0, -0.1],
];
const FIGURE_REACH = 1.35;
const WIDE_MARGIN = 1.1;
const FRAME_SPILL = 1.15;
const freeCells = (halfW, halfH, aspect, rng) => {
  const frameH = Math.max(halfH, 0.6, Math.max(halfW, 0.8) / aspect) * WIDE_MARGIN * FRAME_SPILL;
  const frameW = frameH * aspect;
  const cell = Math.min(5, Math.max(2.4, Math.min(frameW, frameH) / 1.1));
  const columns = Math.max(1, Math.round((frameW * 2) / cell));
  const rows = Math.max(1, Math.round((frameH * 2) / cell));
  const cellW = (frameW * 2) / columns;
  const cellH = (frameH * 2) / rows;
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x0 = -frameW + column * cellW;
      const y0 = -frameH + row * cellH;
      if (
        x0 < halfW + 0.15 &&
        x0 + cellW > -halfW - 0.15 &&
        y0 < halfH + 0.15 &&
        y0 + cellH > -halfH - 0.15
      )
        continue;
      cells.push({
        x: x0 + cellW / 2,
        y: y0 + cellH / 2,
        scale: Math.min(2.4, Math.min(cellW, cellH) / (2 * FIGURE_REACH)),
      });
    }
  }
  return shuffle(rng, cells);
};
const planMetaphorFigures = (bounds, rng, amount, interlude, aspect = 1.6) => {
  const figures = { shapes: [], notes: [] };
  if (amount <= 0) return figures;
  const halfW = (bounds.x1 - bounds.x0) / 2;
  const halfH = (bounds.y1 - bounds.y0) / 2;
  const reach = Math.max(halfW, halfH, 2);
  const cells = interlude ? [] : freeCells(halfW, halfH, Math.min(4, Math.max(0.25, aspect)), rng);
  const wanted =
    cells.length > 0
      ? cells.length * 0.5 * Math.min(1.5, amount) + rng() * 0.6
      : 1.6 * amount + rng() * 0.9;
  const total = interlude
    ? Math.min(STAGE_SLOTS.length, 1 + Math.round(amount))
    : Math.min(4, Math.max(1, Math.round(wanted)));
  const kinds = shuffle(rng, METAPHOR_FIGURE_KINDS);
  const sides = shuffle(rng, [0, 1, 2, 3]);
  const under = drawMetaphorFigure(
    kinds[total],
    rng,
    span(rng, -0.35, 0.35) * halfW,
    span(rng, -0.35, 0.35) * halfH,
    reach * (interlude ? 0.6 : 0.85) * span(rng, 0.85, 1.2),
    span(rng, -0.3, 0.3),
    0,
    true,
  );
  figures.shapes.push(...under.shapes);
  for (let index = 0; index < total; index += 1) {
    let scale = (interlude ? 1.2 : Math.min(2, Math.max(1, reach * 0.36))) * span(rng, 0.85, 1.15);
    let x;
    let y;
    if (interlude) {
      const [slotX, slotY] = STAGE_SLOTS[index % STAGE_SLOTS.length];
      x = slotX * halfW + span(rng, -0.25, 0.25);
      y = slotY * halfH + span(rng, -0.3, 0.3);
    } else if (index < cells.length) {
      const cell = cells[index];
      const fit = span(rng, 0.7, 0.95);
      scale = Math.max(0.8, cell.scale * fit);
      x = cell.x + span(rng, -1, 1) * cell.scale * (1 - fit) * FIGURE_REACH;
      y = cell.y + span(rng, -1, 1) * cell.scale * (1 - fit) * FIGURE_REACH;
    } else {
      const out = scale * FIGURE_REACH + 0.2;
      const side = sides[index];
      const along = span(rng, -0.7, 0.7);
      x = side < 2 ? along * halfW : (side === 2 ? -1 : 1) * (halfW + out);
      y = side < 2 ? (side === 0 ? 1 : -1) * (halfH + out) : along * halfH;
    }
    const figure = drawMetaphorFigure(
      kinds[index % kinds.length],
      rng,
      x,
      y,
      scale,
      span(rng, -0.12, 0.12),
      0.3 + index * 0.7,
    );
    figures.shapes.push(...figure.shapes);
    figures.notes.push(...figure.notes);
  }
  figures.shapes.length = Math.min(figures.shapes.length, FIGURE_LIMIT);
  return figures;
};
const pad2 = (value) => String(Math.max(0, Math.floor(value))).padStart(2, '0');
const timecode = (seconds) => `${pad2(seconds / 60)}:${pad2(seconds % 60)}`;
const planMetaphorBackdrop = (bounds, rng, amount, interlude, info) => {
  const halfW = (bounds.x1 - bounds.x0) / 2;
  const halfH = (bounds.y1 - bounds.y0) / 2;
  const reach = Math.max(halfW, halfH, 2);
  const shapes = [];
  const tone = (shape, patch) =>
    shapes.push(staticMetaphorShape(shape, __spreadValues({ ink: 0, accent: 0 }, patch)));
  if (amount > 0) {
    const layer = choose(rng, ['band', 'band', 'grid', 'arcs', 'dots', 'plain']);
    if (layer === 'band') {
      const upright = rng() < 0.3;
      const half = (upright ? halfW : halfH) * span(rng, 0.3, 0.75);
      const shift = (upright ? halfW : halfH) * span(rng, -0.7, 0.7);
      tone(METAPHOR_SHAPE_BAR, {
        x: upright ? shift : 0,
        y: upright ? 0 : shift,
        sx: reach * 9,
        sy: half,
        tone: span(rng, 0.3, 0.5),
        rot: (upright ? Math.PI / 2 : 0) + (rng() < 0.4 ? span(rng, -0.2, 0.2) : 0),
      });
    } else if (layer === 'grid') {
      const pitch = Math.max(1, reach / 3.5);
      const columns = Math.min(7, Math.ceil((halfW + pitch * 2) / pitch));
      const rows = Math.min(5, Math.ceil((halfH + pitch * 2) / pitch));
      for (let column = -columns; column <= columns; column += 1) {
        tone(METAPHOR_SHAPE_BAR, {
          x: column * pitch,
          sx: rows * pitch,
          sy: 0.022,
          rot: Math.PI / 2,
          tone: column === 0 ? 0.8 : 0.4,
        });
      }
      for (let row = -rows; row <= rows; row += 1) {
        tone(METAPHOR_SHAPE_BAR, {
          y: row * pitch,
          sx: columns * pitch,
          sy: 0.022,
          tone: row === 0 ? 0.8 : 0.4,
        });
      }
    } else if (layer === 'arcs') {
      const cx = (rng() < 0.5 ? -1 : 1) * (halfW + reach * 0.6);
      const cy = (rng() < 0.5 ? -1 : 1) * (halfH + reach * 0.4);
      for (let ring = 1; ring <= 5; ring += 1) {
        tone(METAPHOR_SHAPE_ARC, {
          x: cx,
          y: cy,
          sx: (reach * 0.7 * ring) / ARC_AT,
          sy: 2.5,
          param: 1,
          tone: 0.55,
        });
      }
    } else if (layer === 'dots') {
      const pitch = Math.max(0.9, reach / 3);
      const skew = rng() < 0.5 ? 0.5 : 0;
      for (let row = -2; row <= 2; row += 1) {
        for (let column = -3; column <= 3; column += 1) {
          tone(METAPHOR_SHAPE_BLOB, {
            x: (column + (row % 2 === 0 ? 0 : skew)) * pitch,
            y: row * pitch * 0.87,
            sx: 0.2,
            sy: 0.2,
            tone: 1,
          });
        }
      }
    }
  }
  shapes.length = Math.min(shapes.length, BACKDROP_LIMIT);
  if (interlude) return { shapes, notes: [] };
  const pen = new Pen(0, 0, 1, 0, 0);
  const furniture = choose(rng, ['rules', 'rules', 'crop', 'margin', 'none']);
  const left = -halfW - 0.1;
  const right = halfW + 0.1;
  const size = Math.min(0.34, Math.max(0.2, reach * 0.07));
  if (furniture === 'rules') {
    pen.line(left, halfH + 0.3, right, halfH + 0.3, 0, 2.6);
    pen.line(left, -halfH - 0.3, right, -halfH - 0.3);
    pen.note(pad2(info.index), left, halfH + 0.3 + size * 0.95, size);
    pen.note(timecode(info.time), right, -halfH - 0.3 - size * 0.95, size, 1);
  } else if (furniture === 'crop') {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const x = sx * (halfW + 0.3);
        const y = sy * (halfH + 0.3);
        pen.line(x + sx * 0.12, y, x + sx * 0.5, y);
        pen.line(x, y + sy * 0.12, x, y + sy * 0.5);
      }
    }
    pen.note(
      `${pad2(info.index)} — ${timecode(info.time)}`,
      0,
      -halfH - 0.3 - size * 1.1,
      size,
      0.5,
    );
  } else if (furniture === 'margin') {
    const x = left - 0.3;
    pen.line(x, -halfH, x, halfH, 0, 1.8);
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = -halfH + (tick * halfH) / 2;
      pen.line(x, y, x + (tick % 2 === 0 ? 0.22 : 0.12), y);
    }
    pen.note(
      `${pad2(info.index)} / ${timecode(info.time)}`,
      x - size * 0.9,
      halfH,
      size,
      1,
      Math.PI / 2,
    );
  }
  return { shapes: [...shapes, ...pen.shapes], notes: pen.notes };
};
const layoutMetaphorNotes = (notes, measure) => {
  const glyphs = [];
  for (const note of notes) {
    const chars = Array.from(note.text);
    const advances = chars.map((char) => measure(char) * note.size);
    const total = advances.reduce((sum, advance) => sum + advance, 0);
    const cos = Math.cos(note.rot);
    const sin = Math.sin(note.rot);
    let pen = -total * note.align;
    chars.forEach((char, index) => {
      const along = pen + advances[index] / 2;
      pen += advances[index];
      if (char.trim() === '') return;
      glyphs.push({
        char,
        x: note.x + along * cos,
        y: note.y + along * sin,
        size: note.size,
        rot: note.rot,
        born: note.born,
      });
    });
  }
  return glyphs;
};
export {
  METAPHOR_FIGURE_KINDS,
  drawMetaphorFigure,
  layoutMetaphorNotes,
  planMetaphorBackdrop,
  planMetaphorFigures,
};
