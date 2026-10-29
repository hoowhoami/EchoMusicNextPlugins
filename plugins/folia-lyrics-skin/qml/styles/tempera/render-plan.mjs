// Source display order is retained. A difference filter samples its actual painted prefix.
import { localMatrix, multiply, color } from '../sonnet/scene-graph.mjs';
import { fontSpec } from '../sonnet/pixi-text-metrics.mjs';
import { texturePlan, expandPasses } from '../sonnet/filters/kernel.mjs';
const identity = [1, 0, 0, 0, 1, 0];
function uniforms(filter) {
  const out = {};
  for (const key of Object.keys(filter.resources || {})) {
    const group = filter.resources[key];
    if (group && group.uniforms)
      for (const name of Object.keys(group.uniforms)) {
        const value = group.uniforms[name];
        out[name] = typeof value === 'object' ? Array.from(value) : value;
      }
  }
  return out;
}
export function filterDescriptor(filter) {
  const name = (filter.glProgram && filter.glProgram.name) || '',
    values = uniforms(filter);
  if (name.indexOf('tempera-') === 0)
    return Object.assign(
      { kind: name === 'tempera-difference-inversion' ? 'difference' : 'tint' },
      values
    );
  if (filter.kind === 'blur')
    return {
      kind: 'blur',
      strength: filter.strength,
      quality: filter.quality,
      kernelSize: filter.kernelSize,
    };
  if (filter.kind === 'noise')
    return { kind: 'noise', uNoise: filter.options.noise, uSeed: filter.options.seed };
  if (filter.kind === 'contrast') return { kind: 'contrast', uContrast: filter.amount };
  const names = {
    'sonnet-lens-distortion': 'lens',
    'sonnet-print-rgb-shift': 'rgb',
    'sonnet-print-halftone': 'halftone',
    'sonnet-print-vignette': 'vignette',
  };
  if (!names[name]) throw Error('Unsupported source Tempera filter ' + name);
  return Object.assign({ kind: names[name] }, values);
}
function box(b, m) {
  const p = [
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x, b.y + b.height],
      [b.x + b.width, b.y + b.height],
    ].map((v) => [m[0] * v[0] + m[1] * v[1] + m[2], m[3] * v[0] + m[4] * v[1] + m[5]]),
    xs = p.map((v) => v[0]),
    ys = p.map((v) => v[1]);
  return [
    Math.min.apply(null, xs),
    Math.min.apply(null, ys),
    Math.max.apply(null, xs),
    Math.max.apply(null, ys),
  ];
}
export class RenderPlanner {
  constructor() {
    this.published = new Map();
    this.serial = 0;
  }
  frame(root, width, height, resolution, time) {
    const stages = [],
      resources = [],
      used = new Set();
    let byteCount = 0,
      pathBytes = 0,
      primitives = 0;
    const resource = (node) => {
      const key = String(node.id),
        revision =
          node.kind === 'graphics'
            ? node.geometryRevision
            : JSON.stringify([node.text, node.style, node.texture && node.texture.id]);
      used.add(key);
      if (this.published.get(key) === revision) return key;
      const value = { id: key, kind: node.kind };
      if (node.kind === 'graphics') {
        value.paths = node.paths;
        for (const p of value.paths) {
          pathBytes += p.path.length * 2;
          ++primitives;
        }
        value.tint = color(node.tint === undefined ? 0xffffff : node.tint);
      } else if (node.kind === 'text') {
        value.text = node.text;
        value.style = node.style;
        value.metrics = node.metrics;
        value.font = fontSpec(node.style);
        value.anchor = [node.anchor.x, node.anchor.y];
        value.tint = color(node.tint);
      } else if (node.kind === 'sprite') {
        value.texture = node.texture;
        value.anchor = [node.anchor.x, node.anchor.y];
        value.tint = color(node.tint);
      } else throw Error('Unsupported source primitive ' + node.kind);
      resources.push(value);
      this.published.set(key, revision);
      return key;
    };
    const push = (stage) => {
      if (stages.length >= 64) throw Error('Tempera exceeds 64 offscreen stages');
      stage.id = String(stage.id);
      stage.width = width;
      stage.height = height;
      const outputRes = stage.targetResolution || stage.resolution;
      byteCount += Math.ceil(width * outputRes) * Math.ceil(height * outputRes) * 4;
      if (stage.kind === 'filters')
        byteCount += texturePlan(
          stage.roi[2] - stage.roi[0],
          stage.roi[3] - stage.roi[1],
          stage.resolution,
          expandPasses(stage.passes).length,
          stage.targetResolution,
          [{ width: Math.round(width * resolution), height: Math.round(height * resolution) }]
        ).cacheBytes;
      stages.push(stage);
      return stage.id;
    };
    const paint = (id, previous, ops, res) =>
      ops.length ? push({ id, kind: 'paint', previous, ops, resolution: res }) : previous;
    const walk = (container, matrix, alpha, previous, res, suffix, skipFilters) => {
      if (container.visible === false || container.renderable === false || container.destroyed)
        return previous;
      const world = multiply(matrix, localMatrix(container)),
        a = alpha * container.alpha;
      if (!(a > 0)) return previous;
      const filters =
        !skipFilters &&
        (container.filters || []).filter((f) => f.enabled !== false && !f.destroyed);
      if (filters && filters.length) {
        let localRes = res;
        for (const f of filters)
          if (typeof f.resolution === 'number') localRes = Math.min(localRes, f.resolution);
        const descriptors = filters.map(filterDescriptor),
          difference = descriptors.find((f) => f.kind === 'difference' || f.kind === 'tint');
        const front = walk(container, matrix, alpha, null, localRes, suffix + 'i', true);
        if (!front) return previous;
        let filtered = front;
        if (difference) {
          const b = box(container.getLocalBounds(), world),
            roi = [
              Math.max(0, Math.floor(b[0] * localRes) / localRes),
              Math.max(0, Math.floor(b[1] * localRes) / localRes),
              Math.min(width, Math.ceil(b[2] * localRes) / localRes),
              Math.min(height, Math.ceil(b[3] * localRes) / localRes),
            ];
          filtered = push({
            id: container.id + 'd' + suffix,
            kind: 'difference',
            front,
            previous,
            profile: difference,
            roi,
            resolution: res,
          });
          return filtered;
        }
        const b = container.filterArea
            ? [0, 0, width, height]
            : box(container.getLocalBounds(), world),
          roi = [
            Math.max(0, Math.floor(b[0] * localRes) / localRes),
            Math.max(0, Math.floor(b[1] * localRes) / localRes),
            Math.min(width, Math.ceil(b[2] * localRes) / localRes),
            Math.min(height, Math.ceil(b[3] * localRes) / localRes),
          ];
        if (roi[2] <= roi[0] || roi[3] <= roi[1]) return previous;
        filtered = push({
          id: container.id + 'f' + suffix,
          kind: 'filters',
          front,
          passes: descriptors,
          roi,
          resolution: localRes,
          targetResolution: res,
          screenResolution: resolution,
        });
        return paint(
          container.id + 'c' + suffix,
          previous,
          [{ kind: 'texture', source: filtered, matrix: identity, alpha: 1 }],
          res
        );
      }
      const children = container.children.slice();
      if (container.sortableChildren) children.sort((a, b) => a.zIndex - b.zIndex);
      let ops = [];
      if (container.kind !== 'container')
        ops.push({ kind: container.kind, id: resource(container), matrix: world, alpha: a });
      let part = 0;
      for (const child of children) {
        if (
          child.visible === false ||
          child.renderable === false ||
          child.destroyed ||
          child.alpha <= 0
        )
          continue;
        if (child.filters && child.filters.length) {
          previous = paint(container.id + 'p' + part++ + suffix, previous, ops, res);
          ops = [];
          previous = walk(child, world, a, previous, res, suffix, false);
        } else {
          const collect = (n, m, opacity) => {
            if (n.visible === false || n.renderable === false || n.destroyed || n.alpha <= 0)
              return;
            const w = multiply(m, localMatrix(n)),
              aa = opacity * n.alpha;
            if (n.filters && n.filters.length) {
              previous = paint(container.id + 'p' + part++ + suffix, previous, ops, res);
              ops = [];
              previous = walk(n, m, opacity, previous, res, suffix, false);
              return;
            }
            if (n.kind !== 'container')
              ops.push({ kind: n.kind, id: resource(n), matrix: w, alpha: aa });
            const sorted = n.children.slice();
            if (n.sortableChildren) sorted.sort((a, b) => a.zIndex - b.zIndex);
            for (const c of sorted) collect(c, w, aa);
          };
          collect(child, world, a);
        }
      }
      return paint(container.id + 'p' + part + suffix, previous, ops, res);
    };
    const output = walk(root, identity, 1, null, resolution, '', false);
    if (
      pathBytes > 64 * 1024 * 1024 ||
      primitives > 65536 ||
      resources.length > 32768 ||
      byteCount > 256 * 1024 * 1024
    )
      throw Error('Tempera native scene resource budget exceeded (64MiB paths / 256MiB targets)');
    const retired = [];
    for (const key of Array.from(this.published.keys()))
      if (!used.has(key)) {
        retired.push(key);
        this.published.delete(key);
      }
    return {
      time,
      width,
      height,
      resolution,
      stages,
      resources,
      retired,
      output,
      cacheBytes: byteCount,
      pathBytes,
      serial: ++this.serial,
    };
  }
}
