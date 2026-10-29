// Source leaves stay in draw order; native word masks are shared across per-EGC poses.
import { localMatrix, multiply, color } from './scene-graph.mjs';
import { fontSpec } from './pixi-text-metrics.mjs';
import { canvasText } from './native-measure.mjs';
const identity = [1, 0, 0, 0, 1, 0];
const map = (m, x, y) => [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]];
export function filterDescriptor(filter) {
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
    'sonnet-mono-glitch': 'glitch',
  };
  const kind = names[filter.glProgram && filter.glProgram.name];
  if (!kind) throw Error('Unsupported source Sonnet filter');
  const values = { kind };
  for (const key of Object.keys(filter.resources || {}))
    Object.assign(values, filter.resources[key].uniforms || {});
  return values;
}
export function filterPlan(container, canvasResolution) {
  let resolution = canvasResolution;
  const filters = (container.filters || []).filter(
    (filter) => filter.enabled !== false && !filter.destroyed
  );
  for (const filter of filters)
    resolution = Math.min(
      resolution,
      typeof filter.resolution === 'number' ? filter.resolution : 1
    );
  return { passes: filters.map(filterDescriptor), resolution };
}
function state(node, cache) {
  if (cache.has(node)) return cache.get(node);
  const parent = node.parent
    ? state(node.parent, cache)
    : { matrix: identity, alpha: 1, visible: true };
  const value = {
    matrix: multiply(parent.matrix, localMatrix(node)),
    alpha: parent.alpha * node.alpha,
    visible:
      parent.visible && node.visible !== false && node.renderable !== false && !node.destroyed,
  };
  cache.set(node, value);
  return value;
}
function rotationScale(matrix) {
  const scale = Math.hypot(matrix[0], matrix[3]),
    second = Math.hypot(matrix[1], matrix[4]);
  if (
    Math.abs(scale - second) > 1e-5 ||
    Math.abs(matrix[0] * matrix[1] + matrix[3] * matrix[4]) > 1e-4
  )
    throw Error('Source Sonnet text has an unsupported nonuniform affine transform');
  return { scale, rotation: (Math.atan2(matrix[3], matrix[0]) * 180) / Math.PI };
}
export class RenderPlan {
  constructor(root, provider, excluded = []) {
    this.root = root;
    this.provider = provider;
    this.items = [];
    this.glyphs = 0;
    this.pathBytes = 0;
    const masks = new Set();
    const collect = (node) => {
      if (node.mask) masks.add(node.mask);
      for (const child of node.children) collect(child);
    };
    collect(root);
    const walk = (node) => {
      if (excluded.includes(node)) return;
      if (!masks.has(node)) {
        if (node.kind === 'graphics' || node.kind === 'sprite')
          this.items.push({ id: String(node.id), kind: 'vector', node });
        else if (node.kind === 'text') this.text(node);
      }
      for (const child of node.children) walk(child);
    };
    walk(root);
    if (this.items.length > 4096) throw Error('Sonnet native actor budget exceeded (4096)');
  }
  text(node) {
    const style = node.style,
      font = fontSpec(style),
      native = node.nativeContext,
      bounds = node.metrics;
    const family = Array.isArray(style.fontFamily)
      ? style.fontFamily.join(', ')
      : style.fontFamily || 'Arial';
    const composition = node.blendMode === 'screen' ? 'screen' : 'source-over';
    const lines = native ? [canvasText(native.text)] : bounds.lines;
    for (let lineIndex = 0; lineIndex < lines.length; ++lineIndex) {
      const text = lines[lineIndex],
        metric = this.provider(font, text),
        chars = metric.graphemes || [];
      if (!chars.length && text.length) throw Error('Sonnet native grapheme geometry missing');
      const strokeWidth = (style.stroke && style.stroke.width) || 0;
      const halo = style.dropShadow ? Math.max(0, style.dropShadow.blur || 0) / 2 : 0;
      const budget = halo > 80 ? 160 : halo > 40 ? 80 : halo > 0 ? 40 : 0;
      const signature = JSON.stringify([
        native ? native.key : node.id,
        lineIndex,
        font,
        strokeWidth,
        budget,
      ]);
      let batch = this.items[this.items.length - 1];
      if (
        !batch ||
        batch.kind !== 'glyph' ||
        batch.family !== family ||
        batch.composition !== composition ||
        batch.runs.length >= 128 ||
        batch.units + text.length > 8192 ||
        batch.clusterCount + chars.length > 1800
      ) {
        batch = {
          id: 'b' + this.items.length,
          kind: 'glyph',
          family,
          composition,
          runs: [],
          entries: [],
          keys: new Map(),
          instances: new Set(),
          units: 0,
          clusterCount: 0,
        };
        this.items.push(batch);
      }
      let key = batch.keys.get(signature);
      if (!key) {
        key = 'r' + batch.runs.length;
        batch.keys.set(signature, key);
        batch.units += text.length;
        batch.clusterCount += chars.length;
        batch.runs.push({
          key,
          text,
          size: Number(style.fontSize) || 26,
          weight: style.fontWeight === 'bold' ? 700 : Number(style.fontWeight) || 400,
          spacing: 0,
          strokeWidth,
          strokeBitmap: 'fill',
          maxBlur: 0,
          maxHaloRadius: budget,
        });
      }
      const starts = native
        ? [native.start]
        : chars
            .filter(
              (value, index) => index === 0 || chars[index - 1].clusterStart !== value.clusterStart
            )
            .map((value) => value.start);
      for (const start of starts) {
        const selected = chars.find((value) => value.start === start);
        if (!selected) throw Error('Sonnet source/native UTF16 glyph mapping mismatch');
        const safeStart = selected.clusterStart,
          instance = native ? native.instance : 'line' + lineIndex;
        const instanceKey = signature + ':' + safeStart + ':' + instance;
        if (batch.instances.has(instanceKey)) continue;
        batch.instances.add(instanceKey);
        const clusterChars = chars.filter((value) => value.clusterStart === safeStart),
          first = clusterChars[0],
          last = clusterChars[clusterChars.length - 1];
        const anchorX = (first.x + last.x + last.advance) / 2,
          anchorY = metric.baseline + (first.y || 0);
        let x, y;
        if (native) {
          const isolated = this.provider(font, canvasText(node.text));
          x = -node.anchor.x * bounds.width + strokeWidth / 2 + isolated.advance / 2;
          y = -node.anchor.y * bounds.height + bounds.baseline;
        } else {
          const align =
            style.align === 'center'
              ? (bounds.maxLineWidth - bounds.lineWidths[lineIndex]) / 2
              : style.align === 'right'
                ? bounds.maxLineWidth - bounds.lineWidths[lineIndex]
                : 0;
          x =
            -node.anchor.x * bounds.width +
            strokeWidth / 2 +
            align +
            anchorX +
            chars.indexOf(first) * (style.letterSpacing || 0);
          y = -node.anchor.y * bounds.height + bounds.baseline + lineIndex * bounds.lineHeight;
        }
        batch.entries.push({
          key,
          start: safeStart,
          instance: 'p' + batch.entries.length,
          node,
          x,
          y,
          anchorX,
          anchorY,
          halo,
          style,
        });
        ++this.glyphs;
      }
    }
  }
  frame() {
    const cache = new Map(),
      items = [];
    this.pathBytes = 0;
    for (const item of this.items) {
      if (item.kind === 'glyph') {
        const poses = item.entries.map((entry) => {
          const s = state(entry.node, cache),
            point = map(s.matrix, entry.x, entry.y),
            transform = rotationScale(s.matrix);
          return {
            key: entry.key,
            start: entry.start,
            instance: entry.instance,
            x: point[0] - entry.anchorX,
            y: point[1] - entry.anchorY,
            scale: transform.scale,
            rotation: transform.rotation,
            opacity: s.visible ? s.alpha : 0,
            color: color(
              entry.style.stroke && entry.style.stroke.width
                ? entry.style.stroke.color
                : entry.style.fill
            ),
            tint: color(entry.node.tint),
            halos:
              entry.halo > 0
                ? [
                    {
                      radius: entry.halo,
                      opacity:
                        entry.style.dropShadow.alpha === undefined
                          ? 1
                          : entry.style.dropShadow.alpha,
                      color: color(entry.style.dropShadow.color),
                    },
                  ]
                : [],
          };
        });
        items.push({
          id: item.id,
          kind: 'glyph',
          runs: item.runs,
          family: item.family,
          composition: item.composition,
          poses,
        });
      } else {
        const node = item.node,
          s = state(node, cache),
          sprite = node.kind === 'sprite',
          texture = node.texture;
        const paths = sprite ? texture.paths || [] : node.paths;
        for (const path of paths) this.pathBytes += path.path.length * 2;
        let matrix = s.matrix;
        if (sprite) {
          const scale = texture.vectorScale || 1;
          matrix = multiply(matrix, [
            scale,
            0,
            -node.anchor.x * texture.width,
            0,
            scale,
            -node.anchor.y * texture.height,
          ]);
        }
        const masks = [];
        for (let current = node; current; current = current.parent)
          if (current.mask) {
            const mask = current.mask,
              maskState = state(mask, cache);
            const rect = mask.getLocalBounds();
            masks.push({ matrix: maskState.matrix, rect });
          }
        items.push({
          id: item.id,
          kind: 'vector',
          matrix,
          alpha: s.alpha,
          visible: s.visible,
          paths,
          tint: color(node.tint === undefined ? 0xffffff : node.tint),
          revision: sprite ? 0 : node.geometryRevision,
          masks,
        });
      }
    }
    if (this.pathBytes > 64 * 1024 * 1024) throw Error('Sonnet source vector path budget exceeded');
    return items;
  }
}

export function inverse(m) {
  const determinant = m[0] * m[4] - m[1] * m[3];
  if (Math.abs(determinant) < 1e-12) return identity.slice();
  const a = m[4] / determinant,
    c = -m[1] / determinant,
    b = -m[3] / determinant,
    d = m[0] / determinant;
  return [a, c, -a * m[2] - c * m[5], b, d, -b * m[2] - d * m[5]];
}
export { identity };
