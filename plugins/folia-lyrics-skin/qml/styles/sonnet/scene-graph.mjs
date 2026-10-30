// Retained source display graph for native Qt rendering. No browser/Pixi renderer or width estimate.
const TAU = Math.PI * 2;
export function localMatrix(node) {
  const a = Math.cos(node.rotation + node.skew.y) * node.scale.x,
    b = Math.sin(node.rotation + node.skew.y) * node.scale.x,
    c = -Math.sin(node.rotation - node.skew.x) * node.scale.y,
    d = Math.cos(node.rotation - node.skew.x) * node.scale.y;
  return [
    a,
    c,
    node.x - node.pivot.x * a - node.pivot.y * c,
    b,
    d,
    node.y - node.pivot.x * b - node.pivot.y * d,
  ];
}
export function multiply(parent, child) {
  return [
    parent[0] * child[0] + parent[1] * child[3],
    parent[0] * child[1] + parent[1] * child[4],
    parent[0] * child[2] + parent[1] * child[5] + parent[2],
    parent[3] * child[0] + parent[4] * child[3],
    parent[3] * child[1] + parent[4] * child[4],
    parent[3] * child[2] + parent[4] * child[5] + parent[5],
  ];
}
export function qtMatrix(m) {
  return [m[0], m[1], 0, m[2], m[3], m[4], 0, m[5], 0, 0, 1, 0, 0, 0, 0, 1];
}
function emptyBounds() {
  return { x: 0, y: 0, width: 0, height: 0 };
}
function union(a, b) {
  if (!a) return Object.assign({}, b);
  const x = Math.min(a.x, b.x),
    y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}
function transformed(box, m) {
  let result = null;
  for (const p of [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x, box.y + box.height],
    [box.x + box.width, box.y + box.height],
  ])
    result = union(result, {
      x: m[0] * p[0] + m[1] * p[1] + m[2],
      y: m[3] * p[0] + m[4] * p[1] + m[5],
      width: 0,
      height: 0,
    });
  return result;
}
export function color(value) {
  if (typeof value === 'number')
    return '#' + ('000000' + (value & 0xffffff).toString(16)).slice(-6);
  if (typeof value === 'string') return value;
  if (Array.isArray(value) || value instanceof Float32Array)
    return (
      'rgba(' +
      Array.from(value)
        .slice(0, 3)
        .map((v) => Math.round(v * 255))
        .join(',') +
      ',' +
      (value.length > 3 ? value[3] : 1) +
      ')'
    );
  throw Error('Unsupported source colour');
}
function channels(value) {
  if (typeof value === 'number') return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  if (Array.isArray(value) || value instanceof Float32Array)
    return Array.from(value)
      .slice(0, 3)
      .map((v) => v * 255);
  if (typeof value === 'string') {
    if (/^#[a-f\d]{6}$/i.test(value)) return channels(parseInt(value.slice(1), 16));
    if (/^#[a-f\d]{3}$/i.test(value))
      return channels(
        parseInt(
          value
            .slice(1)
            .split('')
            .map((v) => v + v)
            .join(''),
          16
        )
      );
    const m = /^rgba?\(([^)]+)\)$/.exec(value);
    if (m) return m[1].split(',').slice(0, 3).map(Number);
    if (value === 'white') return [255, 255, 255];
    if (value === 'black') return [0, 0, 0];
  }
  throw Error('Unsupported source colour conversion: ' + value);
}
export class Point {
  constructor(x = 0, y = x) {
    this.x = x;
    this.y = y;
  }
  set(x = 0, y = x) {
    this.x = x;
    this.y = y;
    return this;
  }
  copyFrom(p) {
    return this.set(p.x, p.y);
  }
  clone() {
    return new Point(this.x, this.y);
  }
}
function sampleCurve(points, t) {
  let p = points.map((v) => v.slice());
  for (let n = p.length - 1; n > 0; n--)
    for (let i = 0; i < n; i++)
      p[i] = [p[i][0] * (1 - t) + p[i + 1][0] * t, p[i][1] * (1 - t) + p[i + 1][1] * t];
  return p[0];
}
function curveBounds(points) {
  const ts = [0, 1];
  for (let axis = 0; axis < 2; axis++) {
    if (points.length === 3) {
      const a = points[0][axis] - 2 * points[1][axis] + points[2][axis];
      if (a) ts.push((points[0][axis] - points[1][axis]) / a);
    } else {
      const p = points.map((v) => v[axis]),
        a = -p[0] + 3 * p[1] - 3 * p[2] + p[3],
        b = 2 * (p[0] - 2 * p[1] + p[2]),
        c = p[1] - p[0];
      if (Math.abs(a) < 1e-12) {
        if (b) ts.push(-c / b);
      } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
          ts.push((-b + Math.sqrt(disc)) / (2 * a));
          ts.push((-b - Math.sqrt(disc)) / (2 * a));
        }
      }
    }
  }
  let bounds = null;
  for (const t of ts)
    if (t >= 0 && t <= 1) {
      const p = sampleCurve(points, t);
      bounds = union(bounds, { x: p[0], y: p[1], width: 0, height: 0 });
    }
  return bounds;
}
function polygonPath(points) {
  if (!points.length) return '';
  let s = 'M' + points[0] + ',' + points[1];
  for (let i = 2; i < points.length; i += 2) s += 'L' + points[i] + ',' + points[i + 1];
  return s + 'Z';
}
function polyBounds(points) {
  let b = null;
  for (let i = 0; i < points.length; i += 2)
    b = union(b, { x: points[i], y: points[i + 1], width: 0, height: 0 });
  return b || emptyBounds();
}
function pathOf(commands) {
  return commands.map((c) => c.svg).join('');
}
function boundsOf(commands) {
  let b = null;
  for (const c of commands) if (c.bounds) b = union(b, c.bounds);
  return b || emptyBounds();
}
function pathRecord(instruction) {
  let path = pathOf(instruction.commands),
    area = null,
    holeCount = 0;
  if (instruction.holes.length) {
    const outer = instruction.commands.filter((c) => c.polygon).slice(-1)[0];
    if (!outer) throw Error('Source cut requires a polygon outer contour');
    const points = outer.polygon.slice(),
      indices = [];
    for (const hole of instruction.holes)
      for (const cmd of hole) {
        if (!cmd.polygon) continue;
        indices.push(points.length / 2);
        points.push.apply(points, cmd.polygon);
        holeCount++;
      }
    const triangles = sourceEarcut(points, indices, 2);
    path = '';
    area = 0;
    for (let i = 0; i < triangles.length; i += 3) {
      const a = triangles[i] * 2,
        b = triangles[i + 1] * 2,
        c = triangles[i + 2] * 2;
      path += polygonPath([
        points[a],
        points[a + 1],
        points[b],
        points[b + 1],
        points[c],
        points[c + 1],
      ]);
      area +=
        Math.abs(
          (points[b] - points[a]) * (points[c + 1] - points[a + 1]) -
            (points[c] - points[a]) * (points[b + 1] - points[a + 1])
        ) * 0.5;
    }
  }
  const style = instruction.style,
    gradient = style.fill instanceof Object && style.fill.colorStops ? style.fill : null;
  return {
    path,
    fill:
      instruction.action === 'fill' && !gradient
        ? color(style.color === undefined ? 0xffffff : style.color)
        : 'transparent',
    stroke:
      instruction.action === 'stroke'
        ? color(style.color === undefined ? 0xffffff : style.color)
        : 'transparent',
    alpha: style.alpha === undefined ? 1 : style.alpha,
    width: instruction.action === 'stroke' ? (style.width === undefined ? 1 : style.width) : 0,
    join: style.join || 'miter',
    cap: style.cap || 'butt',
    miterLimit: style.miterLimit === undefined ? 10 : style.miterLimit,
    alignment: style.alignment === undefined ? 0.5 : style.alignment,
    gradient: gradient ? Object.assign({}, gradient) : null,
    bounds: boundsOf(instruction.commands),
    holeCount,
    area,
  };
}
function maxMiterRatio(commands, limit) {
  let max = 1;
  for (const command of commands) {
    const p = command.polygon;
    if (!p || p.length < 6 || command.primitiveType === 'rectangle') continue;
    const n = p.length;
    for (let j = 0; j < n; j += 2) {
      const prev = (j - 2 + n) % n,
        next = (j + 2) % n,
        a = p[prev] - p[j],
        b = p[prev + 1] - p[j + 1],
        c = p[next] - p[j],
        d = p[next + 1] - p[j + 1],
        l0 = a * a + b * b,
        l1 = c * c + d * d;
      if (l0 < 1e-12 || l1 < 1e-12) continue;
      const cos = Math.max(-1, Math.min(1, (a * c + b * d) / Math.sqrt(l0 * l1))),
        sin = Math.sqrt((1 - cos) * 0.5);
      if (sin >= 1e-6) max = Math.max(max, Math.min(1 / sin, limit));
    }
  }
  return max;
}
export function createSceneGraph(options = {}) {
  let nextId = 1;
  let liveNodes = 0;
  const maxNodes = options.maxNodes === undefined ? Infinity : options.maxNodes;
  if (maxNodes !== Infinity && (!Number.isInteger(maxNodes) || maxNodes < 1))
    throw Error('Invalid native retained-object limit');
  let measurer = options.measureText || null;
  class Container {
    constructor(input = {}) {
      if (liveNodes >= maxNodes) throw Error('Native retained-object budget exceeded');
      ++liveNodes;
      this.id = nextId++;
      this.kind = 'container';
      this.position = new Point();
      this.scale = new Point(1);
      this.pivot = new Point();
      this.skew = new Point();
      this.rotation = 0;
      this.alpha = 1;
      this.visible = true;
      this.renderable = true;
      this.children = [];
      this.parent = null;
      this.filters = null;
      this.mask = null;
      this.blendMode = 'normal';
      this.zIndex = 0;
      this.label = '';
      this.destroyed = false;
      Object.assign(this, input);
    }
    get x() {
      return this.position.x;
    }
    set x(v) {
      this.position.x = v;
    }
    get y() {
      return this.position.y;
    }
    set y(v) {
      this.position.y = v;
    }
    addChild(...nodes) {
      for (const n of nodes) {
        if (n.parent) n.parent.removeChild(n);
        n.parent = this;
        this.children.push(n);
      }
      return nodes[0];
    }
    addChildAt(n, index) {
      if (n.parent) n.parent.removeChild(n);
      n.parent = this;
      this.children.splice(index, 0, n);
      return n;
    }
    removeChild(n) {
      const i = this.children.indexOf(n);
      if (i >= 0) {
        this.children.splice(i, 1);
        n.parent = null;
      }
      return n;
    }
    removeChildren(begin = 0, end = this.children.length) {
      const nodes = this.children.splice(begin, end - begin);
      for (const n of nodes) n.parent = null;
      return nodes;
    }
    getLocalBounds() {
      let b = null;
      for (const child of this.children)
        if (child.visible && child.renderable)
          b = union(b, transformed(child.getLocalBounds(), localMatrix(child)));
      return b || emptyBounds();
    }
    getBounds() {
      let m = localMatrix(this);
      for (let p = this.parent; p; p = p.parent) m = multiply(localMatrix(p), m);
      return transformed(this.getLocalBounds(), m);
    }
    get width() {
      const b = this.getLocalBounds();
      return Math.abs(this.scale.x) * b.width;
    }
    set width(v) {
      const b = this.getLocalBounds();
      this.scale.x = b.width ? v / b.width : 1;
    }
    get height() {
      const b = this.getLocalBounds();
      return Math.abs(this.scale.y) * b.height;
    }
    set height(v) {
      const b = this.getLocalBounds();
      this.scale.y = b.height ? v / b.height : 1;
    }
    destroy(input) {
      if (this.destroyed) return;
      --liveNodes;
      if (this.parent) this.parent.removeChild(this);
      if (input && input.children) for (const n of this.children.slice()) n.destroy(input);
      this.removeChildren();
      this.destroyed = true;
    }
    unload() {}
    cacheAsTexture() {}
    removeFromParent() {
      if (this.parent) this.parent.removeChild(this);
    }
  }
  class Graphics extends Container {
    constructor() {
      super();
      this.kind = 'graphics';
      this.instructions = [];
      this._active = [];
      this._last = new Point();
      this._tick = 0;
      this.geometryRevision = 0;
      this._fillStyle = { color: 0xffffff, alpha: 1 };
      this._strokeStyle = { color: 0xffffff, width: 1, alpha: 1, alignment: 0.5 };
      const self = this;
      this.context = {
        get instructions() {
          return self.instructions.map((i) => ({ action: i.action, data: { style: i.style } }));
        },
        unload() {},
        destroy() {},
      };
    }
    _push(svg, bounds, polygon) {
      this._active.push({ svg, bounds, polygon });
      this._tick++;
      return this;
    }
    moveTo(x, y) {
      this._last.set(x, y);
      return this._push('M' + x + ',' + y, null);
    }
    lineTo(x, y) {
      const b = polyBounds([this._last.x, this._last.y, x, y]);
      this._last.set(x, y);
      return this._push('L' + x + ',' + y, b);
    }
    quadraticCurveTo(cx, cy, x, y) {
      const b = curveBounds([
        [this._last.x, this._last.y],
        [cx, cy],
        [x, y],
      ]);
      this._last.set(x, y);
      return this._push('Q' + cx + ',' + cy + ' ' + x + ',' + y, b);
    }
    bezierCurveTo(ax, ay, bx, by, x, y) {
      const b = curveBounds([
        [this._last.x, this._last.y],
        [ax, ay],
        [bx, by],
        [x, y],
      ]);
      this._last.set(x, y);
      return this._push('C' + ax + ',' + ay + ' ' + bx + ',' + by + ' ' + x + ',' + y, b);
    }
    closePath() {
      return this._push('Z', null);
    }
    poly(values, close = true) {
      const pts =
        values.length && typeof values[0] === 'object'
          ? [].concat(...values.map((v) => [v.x, v.y]))
          : values.slice();
      if (!pts.length) return this;
      this._last.set(pts[pts.length - 2], pts[pts.length - 1]);
      return this._push(
        close ? polygonPath(pts) : polygonPath(pts).slice(0, -1),
        polyBounds(pts),
        pts
      );
    }
    rect(x, y, w, h) {
      this.poly([x, y, x + w, y, x + w, y + h, x, y + h]);
      this._active[this._active.length - 1].primitiveType = 'rectangle';
      return this;
    }
    circle(x, y, r) {
      return this.ellipse(x, y, r, r);
    }
    ellipse(x, y, rx, ry) {
      this._last.set(x + rx, y);
      return this._push(
        'M' +
          (x + rx) +
          ',' +
          y +
          'A' +
          rx +
          ',' +
          ry +
          ' 0 1 0 ' +
          (x - rx) +
          ',' +
          y +
          'A' +
          rx +
          ',' +
          ry +
          ' 0 1 0 ' +
          (x + rx) +
          ',' +
          y +
          'Z',
        { x: x - rx, y: y - ry, width: rx * 2, height: ry * 2 }
      );
    }
    arc(cx, cy, r, start, end, anticlockwise = false) {
      let delta = end - start;
      if (!anticlockwise) {
        if (delta >= TAU) delta = TAU;
        else delta = ((delta % TAU) + TAU) % TAU;
      } else {
        if (delta <= -TAU) delta = -TAU;
        else delta = -(((-delta % TAU) + TAU) % TAU);
      }
      const sx = cx + Math.cos(start) * r,
        sy = cy + Math.sin(start) * r;
      let svg = (this._active.length ? 'L' : 'M') + sx + ',' + sy;
      let b = { x: sx, y: sy, width: 0, height: 0 };
      const inArc = (a) => {
        const d = delta < 0 ? (((start - a) % TAU) + TAU) % TAU : (((a - start) % TAU) + TAU) % TAU;
        return d <= Math.abs(delta) + 1e-10;
      };
      for (const a of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5, start + delta])
        if (inArc(a))
          b = union(b, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, width: 0, height: 0 });
      const steps = Math.max(1, Math.ceil(Math.abs(delta) / Math.PI));
      for (let i = 1; i <= steps; i++) {
        const a = start + (delta * i) / steps;
        svg +=
          'A' +
          r +
          ',' +
          r +
          ' 0 ' +
          (Math.abs(delta / steps) > Math.PI ? 1 : 0) +
          ' ' +
          (delta >= 0 ? 1 : 0) +
          ' ' +
          (cx + Math.cos(a) * r) +
          ',' +
          (cy + Math.sin(a) * r);
      }
      this._last.set(cx + Math.cos(start + delta) * r, cy + Math.sin(start + delta) * r);
      return this._push(svg, b);
    }
    beginPath() {
      this._active = [];
      this._tick = 0;
      return this;
    }
    clear() {
      this.instructions = [];
      this._active = [];
      this._last.set(0, 0);
      this._tick = 0;
      this.geometryRevision++;
      return this;
    }
    _paint(action, input) {
      const last = this.instructions[this.instructions.length - 1],
        commands =
          this._tick === 0 && last && last.action !== action
            ? last.commands.slice()
            : this._active.slice();
      const key = action === 'fill' ? '_fillStyle' : '_strokeStyle';
      if (input !== undefined)
        this[key] = Object.assign(
          {},
          action === 'fill'
            ? { color: 0xffffff, alpha: 1 }
            : {
                color: 0xffffff,
                width: 1,
                alpha: 1,
                alignment: 0.5,
                join: 'miter',
                miterLimit: 10,
                cap: 'butt',
              },
          typeof input === 'object' && input !== null ? input : { color: input }
        );
      this.instructions.push({ action, commands, style: Object.assign({}, this[key]), holes: [] });
      this._active = [{ svg: 'M' + this._last.x + ',' + this._last.y, bounds: null }];
      this._tick = 0;
      this.geometryRevision++;
      return this;
    }
    fill(input) {
      return this._paint('fill', input);
    }
    stroke(input) {
      return this._paint('stroke', input);
    }
    cut() {
      for (let i = 0; i < 2; i++) {
        const instruction = this.instructions[this.instructions.length - 1 - i];
        if (instruction) {
          const had = instruction.holes.length > 0;
          instruction.holes.push(this._active.slice());
          if (!had) break;
        }
      }
      this._active = [{ svg: 'M' + this._last.x + ',' + this._last.y, bounds: null }];
      this._tick = 0;
      this.geometryRevision++;
      return this;
    }
    get paths() {
      if (this._pathRevision !== this.geometryRevision) {
        this._pathRevision = this.geometryRevision;
        this._paths = [];
        for (const instruction of this.instructions) {
          const groups = [];
          let current = [];
          for (const command of instruction.commands) {
            if (command.svg[0] === 'M' && current.some((value) => value.bounds)) {
              groups.push(current);
              current = [];
            }
            current.push(command);
          }
          if (current.some((value) => value.bounds)) groups.push(current);
          groups.forEach((commands, index) =>
            this._paths.push(
              pathRecord(
                Object.assign({}, instruction, {
                  commands,
                  holes: index === groups.length - 1 ? instruction.holes : [],
                })
              )
            )
          );
        }
      }
      return this._paths;
    }
    getLocalBounds() {
      let b = null;
      for (const instruction of this.instructions) {
        const box = boundsOf(instruction.commands),
          s = instruction.style,
          ratio =
            (s.join || 'miter') === 'miter'
              ? maxMiterRatio(instruction.commands, s.miterLimit === undefined ? 10 : s.miterLimit)
              : 1,
          pad =
            instruction.action === 'stroke'
              ? (s.width === undefined ? 1 : s.width) *
                ratio *
                (1 - (s.alignment === undefined ? 0.5 : s.alignment))
              : 0;
        b = union(b, {
          x: box.x - pad,
          y: box.y - pad,
          width: box.width + pad * 2,
          height: box.height + pad * 2,
        });
      }
      for (const child of this.children)
        if (child.visible && child.renderable)
          b = union(b, transformed(child.getLocalBounds(), localMatrix(child)));
      return b || emptyBounds();
    }
  }
  class TextStyle {
    constructor(input = {}) {
      Object.assign(this, input);
    }
    clone() {
      return new TextStyle(Object.assign({}, this));
    }
  }
  class Text extends Container {
    constructor(input = {}) {
      super();
      this.kind = 'text';
      this.text = input.text === undefined ? '' : input.text;
      this.style = input.style || new TextStyle();
      this.anchor = new Point();
      this.tint = 0xffffff;
      this.nativeContext = input.nativeContext;
    }
    get metrics() {
      if (!measurer) throw Error('Real native text measurement provider is required');
      const result = measurer({
        text: this.text,
        style: this.style,
        nativeContext: this.nativeContext,
        node: this,
      });
      if (
        !result ||
        ![result.width, result.height].every(Number.isFinite) ||
        result.width < 0 ||
        result.height < 0
      )
        throw Error('Invalid native text measurement');
      return result;
    }
    getLocalBounds() {
      const m = this.metrics;
      return {
        x: -this.anchor.x * m.width,
        y: -this.anchor.y * m.height,
        width: m.width,
        height: m.height,
      };
    }
  }
  class Sprite extends Container {
    constructor(texture) {
      super();
      this.kind = 'sprite';
      this.texture = texture || { width: 0, height: 0 };
      this.anchor = new Point();
      this.tint = 0xffffff;
    }
    getLocalBounds() {
      return {
        x: -this.anchor.x * this.texture.width,
        y: -this.anchor.y * this.texture.height,
        width: this.texture.width,
        height: this.texture.height,
      };
    }
  }
  class FillGradient {
    constructor(input) {
      Object.assign(this, input);
    }
    destroy() {
      this.destroyed = true;
    }
  }
  class UniformGroup {
    constructor(values) {
      this.uniforms = {};
      for (const key of Object.keys(values)) this.uniforms[key] = values[key].value;
    }
    update() {}
  }
  class Filter {
    constructor(input = {}) {
      Object.assign(this, input);
      this.enabled = true;
    }
    destroy() {
      this.destroyed = true;
    }
  }
  class BlurFilter extends Filter {
    constructor(input = {}) {
      super();
      this.kind = 'blur';
      Object.assign(this, { strength: 8, quality: 4, kernelSize: 5 }, input);
    }
  }
  class ColorMatrixFilter extends Filter {
    contrast(amount) {
      this.kind = 'contrast';
      this.amount = amount;
      return this;
    }
  }
  class NoiseFilter extends Filter {
    constructor(input) {
      super();
      this.kind = 'noise';
      this.options = input;
    }
  }
  class Rectangle {
    constructor(x = 0, y = 0, width = 0, height = 0) {
      Object.assign(this, { x, y, width, height });
    }
  }
  class Color {
    setValue(value) {
      this.value = value;
      return this;
    }
    toNumber() {
      const c = channels(this.value);
      return (Math.round(c[0]) << 16) + (Math.round(c[1]) << 8) + Math.round(c[2]);
    }
    toArray() {
      return channels(this.value)
        .map((v) => v / 255)
        .concat(1);
    }
  }
  Color.shared = new Color();
  return {
    Container,
    Graphics,
    Text,
    TextStyle,
    Sprite,
    FillGradient,
    UniformGroup,
    Filter,
    BlurFilter,
    ColorMatrixFilter,
    NoiseFilter,
    Rectangle,
    Color,
    Point,
    Texture: { EMPTY: { width: 1, height: 1 } },
    GlProgram: { from: (input) => input },
    get nodeCount() {
      return liveNodes;
    },
    setTextMeasurer(callback) {
      measurer = callback;
    },
  };
}
export function poseSnapshot(root) {
  const values = [];
  function visit(node, parent) {
    values.push({
      id: node.id,
      parent,
      matrix: localMatrix(node),
      alpha: node.alpha,
      visible: node.visible && node.renderable && !node.destroyed,
      zIndex: node.zIndex,
      geometryRevision: node.geometryRevision || 0,
    });
    for (const child of node.children) visit(child, node.id);
  }
  visit(root, null);
  return values;
}
export function snapshot(root, limits = {}) {
  const maxNodes = limits.maxNodes === undefined ? 32768 : limits.maxNodes,
    maxBytes = limits.maxBytes === undefined ? 64 * 1024 * 1024 : limits.maxBytes;
  let bytes = 0,
    pathCount = 0;
  const nodes = [];
  function visit(node, parent) {
    if (nodes.length >= maxNodes) throw Error('Native scene node budget exceeded');
    const result = {
      id: node.id,
      parent,
      kind: node.kind,
      matrix: localMatrix(node),
      alpha: node.alpha,
      visible: node.visible && node.renderable && !node.destroyed,
      zIndex: node.zIndex,
      blendMode: node.blendMode,
      mask: node.mask ? node.mask.id : null,
      label: node.label,
    };
    if (node.kind === 'graphics') {
      result.paths = node.paths;
      result.geometryRevision = node.geometryRevision;
      for (const path of result.paths) {
        pathCount++;
        bytes += path.path.length * 2;
        if (bytes > maxBytes || pathCount > 65536)
          throw Error('Native scene geometry budget exceeded');
      }
    } else if (node.kind === 'text') {
      result.text = node.text;
      result.style = node.style;
      result.anchor = [node.anchor.x, node.anchor.y];
      result.tint = node.tint;
      result.nativeContext = node.nativeContext;
    } else if (node.kind === 'sprite') {
      result.texture = node.texture;
      result.anchor = [node.anchor.x, node.anchor.y];
      result.tint = node.tint;
    }
    nodes.push(result);
    for (const child of node.children) visit(child, node.id);
  }
  visit(root, null);
  return { nodes, pathBytes: bytes, pathCount };
}
// BEGIN pinned earcut 3.2.3 (ISC) generated
// Pixi8.21.0 / earcut3.2.3 SHA256 1b27d3d4a33f13425b10c446aede03b4e834355eacd8afd012758137f4563013
/*
ISC License

Copyright (c) 2026, Mapbox

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
*/
// ../folia-major/node_modules/earcut/src/earcut.js
var steiners = /* @__PURE__ */ new Set();
var filteredOut = false;
function sourceEarcut(data, holeIndices, dim = 2) {
  const hasHoles = holeIndices && holeIndices.length;
  const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
  if (steiners.size) steiners.clear();
  let outerNode = linkedList(data, 0, outerLen, dim, true);
  const triangles = [];
  if (!outerNode || outerNode.next === outerNode.prev) return triangles;
  let minX = 0,
    minY = 0,
    invSize = 0;
  if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);
  if (data.length > 80 * dim) {
    minX = data[0];
    minY = data[1];
    let maxX = minX;
    let maxY = minY;
    for (let i = dim; i < outerLen; i += dim) {
      const x = data[i];
      const y = data[i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    invSize = Math.max(maxX - minX, maxY - minY);
    invSize = invSize !== 0 ? 32767 / invSize : 0;
  }
  earcutLinked(outerNode, triangles, minX, minY, invSize);
  return triangles;
}
function linkedList(data, start, end, dim, clockwise) {
  let last = null;
  if (clockwise === signedArea(data, start, end, dim) > 0) {
    for (let i = start; i < end; i += dim)
      last = insertNode((i / dim) | 0, data[i], data[i + 1], last);
  } else {
    for (let i = end - dim; i >= start; i -= dim)
      last = insertNode((i / dim) | 0, data[i], data[i + 1], last);
  }
  if (last && equals(last, last.next)) {
    removeNode(last);
    last = last.next;
  }
  return last;
}
function filterPoints(start, end = start) {
  const full = end === start;
  let p = start,
    again;
  do {
    again = false;
    if (
      p !== p.next &&
      (steiners.size === 0 || !steiners.has(p)) &&
      (equals(p, p.next) || area(p.prev, p, p.next) === 0)
    ) {
      if (full || p === end) end = p.prev;
      filteredOut = true;
      removeNode(p);
      p = p.prev;
      again = true;
    } else if (full || p !== end) {
      p = p.next;
      again = !full;
    }
  } while (again || p !== end);
  return end;
}
function earcutLinked(ear, triangles, minX, minY, invSize) {
  if (invSize) indexCurve(ear, minX, minY, invSize);
  let stop = ear,
    cured = false;
  while (ear.prev !== ear.next) {
    const prev = ear.prev;
    const next = ear.next;
    if (
      area(prev, ear, next) < 0 &&
      (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear))
    ) {
      triangles.push(prev.i, ear.i, next.i);
      removeNode(ear);
      ear = next;
      stop = next;
      continue;
    }
    ear = next;
    if (ear === stop) {
      filteredOut = false;
      ear = filterPoints(ear);
      if (filteredOut) {
        stop = ear;
        continue;
      }
      if (!cured) {
        ear = cureLocalIntersections(ear, triangles);
        stop = ear;
        cured = true;
        continue;
      }
      splitEarcut(ear, triangles, minX, minY, invSize);
      break;
    }
  }
}
function isEar(ear) {
  const a = ear.prev,
    b = ear,
    c = ear.next,
    ax = a.x,
    bx = b.x,
    cx = c.x,
    ay = a.y,
    by = b.y,
    cy = c.y,
    x0 = Math.min(ax, bx, cx),
    y0 = Math.min(ay, by, cy),
    x1 = Math.max(ax, bx, cx),
    y1 = Math.max(ay, by, cy);
  let p = c.next;
  while (p !== a) {
    if (
      p.x >= x0 &&
      p.x <= x1 &&
      p.y >= y0 &&
      p.y <= y1 &&
      !(ax === p.x && ay === p.y) &&
      pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    )
      return false;
    p = p.next;
  }
  return true;
}
function isEarHashed(ear, minX, minY, invSize) {
  const a = ear.prev,
    b = ear,
    c = ear.next,
    ax = a.x,
    bx = b.x,
    cx = c.x,
    ay = a.y,
    by = b.y,
    cy = c.y,
    x0 = Math.min(ax, bx, cx),
    y0 = Math.min(ay, by, cy),
    x1 = Math.max(ax, bx, cx),
    y1 = Math.max(ay, by, cy),
    minZ = zOrder(x0, y0, minX, minY, invSize),
    maxZ = zOrder(x1, y1, minX, minY, invSize);
  let p = ear.prevZ;
  while (p && p.z >= minZ) {
    if (
      p.x >= x0 &&
      p.x <= x1 &&
      p.y >= y0 &&
      p.y <= y1 &&
      p !== c &&
      !(ax === p.x && ay === p.y) &&
      pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    )
      return false;
    p = p.prevZ;
  }
  let n = ear.nextZ;
  while (n && n.z <= maxZ) {
    if (
      n.x >= x0 &&
      n.x <= x1 &&
      n.y >= y0 &&
      n.y <= y1 &&
      n !== c &&
      !(ax === n.x && ay === n.y) &&
      pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) &&
      area(n.prev, n, n.next) >= 0
    )
      return false;
    n = n.nextZ;
  }
  return true;
}
function cureLocalIntersections(start, triangles) {
  let p = start;
  let cured = false;
  do {
    const a = p.prev,
      b = p.next.next;
    if (intersects(a, p, p.next, b, false) && locallyInside(a, b) && locallyInside(b, a)) {
      triangles.push(a.i, p.i, b.i);
      removeNode(p);
      removeNode(p.next);
      p = start = b;
      cured = true;
    }
    p = p.next;
  } while (p !== start);
  return cured ? filterPoints(p) : p;
}
function splitEarcut(start, triangles, minX, minY, invSize) {
  let a = start;
  do {
    let b = a.next.next;
    while (b !== a.prev) {
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        let c = splitPolygon(a, b);
        a = filterPoints(a, a.next);
        c = filterPoints(c, c.next);
        earcutLinked(a, triangles, minX, minY, invSize);
        earcutLinked(c, triangles, minX, minY, invSize);
        return;
      }
      b = b.next;
    }
    a = a.next;
  } while (a !== start);
}
var indexActive = false;
function eliminateHoles(data, holeIndices, outerNode, dim) {
  const queue = [];
  for (let i = 0, len = holeIndices.length; i < len; i++) {
    const start = holeIndices[i] * dim;
    const end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
    const list =
      /** @type {Node} */
      linkedList(data, start, end, dim, false);
    if (list === list.next) steiners.add(list);
    queue.push(getLeftmost(list));
  }
  queue.sort(compareXYSlope);
  buildBlockIndex(data.length / dim, holeIndices.length);
  indexSegment(outerNode, outerNode);
  indexActive = true;
  for (let i = 0; i < queue.length; i++) {
    outerNode = eliminateHole(queue[i], outerNode);
  }
  indexActive = false;
  return filterPoints(outerNode);
}
function compareXYSlope(a, b) {
  return (
    a.x - b.x ||
    a.y - b.y ||
    (a.next.y - a.y) / (a.next.x - a.x) - (b.next.y - b.y) / (b.next.x - b.x)
  );
}
function eliminateHole(hole, outerNode) {
  const bridge = findHoleBridge(hole, outerNode);
  if (!bridge) {
    return outerNode;
  }
  const bridgeReverse = splitPolygon(bridge, hole);
  const bridge2 = bridgeReverse.next;
  indexSegment(bridge, bridge2.next);
  filterPoints(bridgeReverse, bridgeReverse.next);
  return filterPoints(bridge, bridge.next);
}
var K = 16;
var blockBBox = new Float64Array(0);
var numBlocks = 0;
var blockHead = [];
var blockStop = [];
function buildBlockIndex(maxNodes, numHoles) {
  const maxBlocks = Math.ceil((maxNodes + 2 * numHoles) / K) + numHoles + 2;
  if (blockBBox.length < maxBlocks * 4) blockBBox = new Float64Array(maxBlocks * 4);
  numBlocks = 0;
}
function indexSegment(head, stop) {
  let p = head;
  do {
    const b = numBlocks++;
    blockHead[b] = p;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let k = 0;
    do {
      const c = p.next;
      p.z = b;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
      p = c;
    } while (++k < K && p !== stop);
    blockStop[b] = p;
    const g = b * 4;
    blockBBox[g] = minX;
    blockBBox[g + 1] = minY;
    blockBBox[g + 2] = maxX;
    blockBBox[g + 3] = maxY;
  } while (p !== stop);
}
function growBlock(head, tail) {
  const g = head.z * 4;
  if (tail.x < blockBBox[g]) blockBBox[g] = tail.x;
  if (tail.y < blockBBox[g + 1]) blockBBox[g + 1] = tail.y;
  if (tail.x > blockBBox[g + 2]) blockBBox[g + 2] = tail.x;
  if (tail.y > blockBBox[g + 3]) blockBBox[g + 3] = tail.y;
}
function liveBlockStop(b) {
  let stop = blockStop[b];
  while (stop.prev.next !== stop) stop = stop.next;
  blockStop[b] = stop;
  return stop;
}
function liveBlockHead(b) {
  let head = blockHead[b];
  while (head.prev.next !== head) head = head.next;
  blockHead[b] = head;
  return head;
}
function findHoleBridge(hole, outerNode) {
  let p = outerNode;
  const hx = hole.x;
  const hy = hole.y;
  let qx = -Infinity;
  let m;
  if (equals(hole, p)) return p;
  for (let b = 0, g = 0; b < numBlocks; b++, g += 4) {
    if (
      hy < blockBBox[g + 1] ||
      hy > blockBBox[g + 3] ||
      blockBBox[g] > hx ||
      blockBBox[g + 2] <= qx
    )
      continue;
    const stop = liveBlockStop(b);
    p = liveBlockHead(b);
    do {
      if (p.prev.next === p) {
        if (equals(hole, p.next)) return p.next;
        else if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
          const x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
          if (x <= hx && x > qx) {
            qx = x;
            m = p.x < p.next.x ? p : p.next;
            if (x === hx) return m;
          }
        }
      }
      p = p.next;
    } while (p !== stop);
  }
  if (!m) return null;
  const mx = m.x;
  const my = m.y;
  const tminY = Math.min(hy, my);
  const tmaxY = Math.max(hy, my);
  let tanMin = Infinity;
  for (let b = 0, g = 0; b < numBlocks; b++, g += 4) {
    if (
      blockBBox[g + 2] < mx ||
      blockBBox[g] > hx ||
      blockBBox[g + 3] < tminY ||
      blockBBox[g + 1] > tmaxY
    )
      continue;
    const stop = liveBlockStop(b);
    p = liveBlockHead(b);
    do {
      if (
        p.prev.next === p &&
        hx >= p.x &&
        p.x >= mx &&
        hx !== p.x && // skip dead nodes
        pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)
      ) {
        const tan = Math.abs(hy - p.y) / (hx - p.x);
        if (
          (locallyInside(p, hole) || (p.y === hy && p.next.y === hy && p.next.x > hx)) &&
          (tan < tanMin ||
            (tan === tanMin && (p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))
        ) {
          m = p;
          tanMin = tan;
        }
      }
      p = p.next;
    } while (p !== stop);
  }
  return m;
}
function sectorContainsSector(m, p) {
  return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}
var sortArr = [];
var sortBuf = [];
var zArr = new Uint32Array(0);
var zBuf = new Uint32Array(0);
var counts = new Uint32Array(256);
function indexCurve(start, minX, minY, invSize) {
  let p = start;
  let n = 0;
  do {
    p.z = zOrder(p.x, p.y, minX, minY, invSize);
    sortArr[n++] = p;
    p = p.next;
  } while (p !== start);
  sortNodes(n);
  let prev = null;
  for (let i = 0; i < n; i++) {
    const node = sortArr[i];
    node.prevZ = prev;
    if (prev) prev.nextZ = node;
    prev = node;
  }
  prev.nextZ = null;
}
function sortNodes(n) {
  if (n <= 32) {
    for (let i = 1; i < n; i++) {
      const node = sortArr[i],
        z = node.z;
      let j = i - 1;
      while (j >= 0 && sortArr[j].z > z) {
        sortArr[j + 1] = sortArr[j];
        j--;
      }
      sortArr[j + 1] = node;
    }
    return;
  }
  if (zArr.length < n) {
    zArr = new Uint32Array(n);
    zBuf = new Uint32Array(n);
    sortBuf = new Array(n);
  }
  for (let i = 0; i < n; i++) zArr[i] = sortArr[i].z;
  radixPass(n, sortArr, zArr, sortBuf, zBuf, 0);
  radixPass(n, sortBuf, zBuf, sortArr, zArr, 8);
  radixPass(n, sortArr, zArr, sortBuf, zBuf, 16);
  radixPass(n, sortBuf, zBuf, sortArr, zArr, 24);
}
function radixPass(n, src, srcZ, dst, dstZ, shift) {
  counts.fill(0);
  for (let i = 0; i < n; i++) counts[(srcZ[i] >>> shift) & 255]++;
  let sum = 0;
  for (let b = 0; b < 256; b++) {
    const c = counts[b];
    counts[b] = sum;
    sum += c;
  }
  for (let i = 0; i < n; i++) {
    const z = srcZ[i];
    const pos = counts[(z >>> shift) & 255]++;
    dst[pos] = src[i];
    dstZ[pos] = z;
  }
}
function zOrder(x, y, minX, minY, invSize) {
  x = ((x - minX) * invSize) | 0;
  y = ((y - minY) * invSize) | 0;
  x = (x | (x << 8)) & 16711935;
  x = (x | (x << 4)) & 252645135;
  x = (x | (x << 2)) & 858993459;
  x = (x | (x << 1)) & 1431655765;
  y = (y | (y << 8)) & 16711935;
  y = (y | (y << 4)) & 252645135;
  y = (y | (y << 2)) & 858993459;
  y = (y | (y << 1)) & 1431655765;
  return x | (y << 1);
}
function getLeftmost(start) {
  let p = start,
    leftmost = start;
  do {
    if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
    p = p.next;
  } while (p !== start);
  return leftmost;
}
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
  return (
    (cx - px) * (ay - py) >= (ax - px) * (cy - py) &&
    (ax - px) * (by - py) >= (bx - px) * (ay - py) &&
    (bx - px) * (cy - py) >= (cx - px) * (by - py)
  );
}
function isValidDiagonal(a, b) {
  const zeroLength = equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0;
  return (
    a.next.i !== b.i &&
    (zeroLength ||
      (locallyInside(a, b) &&
        locallyInside(b, a) && // // locally visible
        (area(a.prev, a, b.prev) !== 0 || area(a, b.prev, b) !== 0))) && // no opposite-facing sectors
    !intersectsPolygon(a, b) &&
    (zeroLength || middleInside(a, b))
  );
}
function area(p, q, r) {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}
function equals(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y;
}
function intersects(p1, q1, p2, q2, includeBoundary = true) {
  const o1 = area(p1, q1, p2);
  const o2 = area(p1, q1, q2);
  const o3 = area(p2, q2, p1);
  const o4 = area(p2, q2, q1);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)))
    return true;
  if (!includeBoundary) return false;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}
function onSegment(p, q, r) {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}
function intersectsPolygon(a, b) {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  let p = a;
  do {
    const n = p.next;
    if (
      (p.x > maxX && n.x > maxX) ||
      (p.x < minX && n.x < minX) ||
      (p.y > maxY && n.y > maxY) ||
      (p.y < minY && n.y < minY)
    ) {
      p = n;
      continue;
    }
    if (p.i !== a.i && n.i !== a.i && p.i !== b.i && n.i !== b.i && intersects(p, n, a, b))
      return true;
    p = n;
  } while (p !== a);
  return false;
}
function locallyInside(a, b) {
  return area(a.prev, a, a.next) < 0
    ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0
    : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}
function middleInside(a, b) {
  let p = a;
  let inside = false;
  const px = (a.x + b.x) / 2;
  const py = (a.y + b.y) / 2;
  do {
    const n = p.next;
    if (p.y > py !== n.y > py && px < ((n.x - p.x) * (py - p.y)) / (n.y - p.y) + p.x)
      inside = !inside;
    p = n;
  } while (p !== a);
  return inside;
}
function splitPolygon(a, b) {
  const a2 = createNode(a.i, a.x, a.y),
    b2 = createNode(b.i, b.x, b.y),
    an = a.next,
    bp = b.prev;
  a.next = b;
  b.prev = a;
  a2.next = an;
  an.prev = a2;
  b2.next = a2;
  a2.prev = b2;
  bp.next = b2;
  b2.prev = bp;
  return b2;
}
function insertNode(i, x, y, last) {
  const p = createNode(i, x, y);
  if (!last) {
    p.prev = p;
    p.next = p;
  } else {
    p.next = last.next;
    p.prev = last;
    last.next.prev = p;
    last.next = p;
  }
  return p;
}
function removeNode(p) {
  p.next.prev = p.prev;
  p.prev.next = p.next;
  if (p.prevZ) p.prevZ.nextZ = p.nextZ;
  if (p.nextZ) p.nextZ.prevZ = p.prevZ;
  if (indexActive) growBlock(p.prev, p.next);
}
function createNode(i, x, y) {
  return (
    /** @type {Node} */
    /** @type {unknown} */
    {
      i,
      // vertex index in coordinates array
      x,
      y,
      // vertex coordinates
      prev: null,
      // previous and next vertex nodes in a polygon ring
      next: null,
      z: 0,
      // z-order curve value; doubles as owning block in the hole-bridge index during eliminateHoles
      prevZ: null,
      // previous and next nodes in z-order
      nextZ: null,
    }
  );
}
function signedArea(data, start, end, dim) {
  let sum = 0;
  for (let i = start, j = end - dim; i < end; i += dim) {
    sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
    j = i;
  }
  return sum;
}

// END pinned earcut
