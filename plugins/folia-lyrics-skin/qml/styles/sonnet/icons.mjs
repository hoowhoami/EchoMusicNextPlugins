// Pinned Lucide data is drawn as native vectors; no React, DOM or bitmap cache.
import { definitions, aliases, canonical } from './icons-data.mjs';
import { buildSonnetIconTextureKey } from './sonnetIcons.mjs';
export function resolveNames(input) {
  const seen = new Set(),
    result = [];
  for (const value of input || []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    const name = Object.prototype.hasOwnProperty.call(canonical, key) ? canonical[key] : null;
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result.length ? result : ['Flower'];
}
// Direct component callers (Monet/Pendolo) use exact export names. Their
// fallbacks differ from Sonnet's case-insensitive list/Flower policy.
export function exactIconName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return Object.prototype.hasOwnProperty.call(aliases, name) ? name : null;
}
export function iconPath(value) {
  const name = exactIconName(value);
  const data = name ? definitions[aliases[name]] : null;
  return data ? data.node.map((node) => shapePath(node[0], node[1], true)).join(' ') : '';
}
function shapePath(tag, p, directSvg = false) {
  if (tag === 'path') return p.d;
  if (tag === 'line') return `M${p.x1} ${p.y1}L${p.x2} ${p.y2}`;
  if (tag === 'polyline' || tag === 'polygon')
    return 'M' + p.points.trim().replace(/\s+/g, 'L') + (tag === 'polygon' ? 'Z' : '');
  if (tag === 'circle' || tag === 'ellipse') {
    const rx = Number(p.rx || p.r),
      ry = Number(p.ry || p.r),
      x = Number(p.cx),
      y = Number(p.cy);
    return `M${x - rx} ${y}A${rx} ${ry} 0 1 0 ${x + rx} ${y}A${rx} ${ry} 0 1 0 ${x - rx} ${y}`;
  }
  if (tag === 'rect') {
    const x = Number(p.x || 0),
      y = Number(p.y || 0),
      w = Number(p.width),
      h = Number(p.height),
      r = Math.min(Number(p.rx || p.ry || 0), w / 2, h / 2);
    if (directSvg) {
      const rx = Math.min(Math.max(Number(p.rx === undefined ? p.ry || 0 : p.rx), 0), w / 2);
      const ry = Math.min(Math.max(Number(p.ry === undefined ? p.rx || 0 : p.ry), 0), h / 2);
      return rx && ry
        ? `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
        : `M${x} ${y}h${w}v${h}h${-w}Z`;
    }
    return r
      ? `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`
      : `M${x} ${y}h${w}v${h}h${-w}Z`;
  }
  throw Error('Unsupported pinned Lucide SVG node ' + tag);
}
export function buildTextures(theme, tuning) {
  const result = new Map();
  if (tuning.showOnlyText || !tuning.showBackgroundDecor) return result;
  if ((theme.lyricsIcons || []).length > 64)
    throw Error('Sonnet icon list exceeds the 64-icon budget');
  const names = resolveNames(theme.lyricsIcons);
  const palette = [theme.accentColor, theme.secondaryColor, theme.primaryColor];
  names.forEach((name, index) => {
    const size = 192 + (index % 4) * 32,
      color = palette[index % 3],
      resolution = tuning.textureResolution;
    const data = definitions[aliases[name]];
    if (!data) throw Error('Pinned Lucide icon data missing: ' + name);
    const texture = {
      width: size,
      height: size,
      vectorScale: size / 24,
      name,
      paths: data.node.map((node) => ({
        path: shapePath(node[0], node[1]),
        fill: 'transparent',
        stroke: color,
        width: (3.5 * 24) / size,
        alpha: 1,
        cap: 'round',
        join: 'round',
        miter: 4,
      })),
    };
    result.set(buildSonnetIconTextureKey(name, color, 3.5, size, resolution), texture);
  });
  return result;
}
