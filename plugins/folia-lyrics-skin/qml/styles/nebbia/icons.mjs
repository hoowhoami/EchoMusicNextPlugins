import { definitions, aliases, canonical } from '../sonnet/icons-data.mjs';
import { iconNodeToPolylines } from '../lumiere/source/lineart/iconPaths.mjs';
function iconName(value) {
  const name = String(value || '').trim();
  return aliases[name] ? name : canonical[name.toLowerCase()] || null;
}
export function resolveLucideIconNames(values) {
  return (values || []).map(iconName).filter(Boolean);
}
export function resolveLucideIconNode(value) {
  const name = iconName(value);
  return name ? definitions[aliases[name]].node : null;
}
export function iconPolys(value) {
  const node = resolveLucideIconNode(value);
  if (!node) return null;
  const lines = iconNodeToPolylines(node)
    .map((p) => p.points.map((v) => [v[0] / 24, v[1] / 24]))
    .filter((p) => p.length > 1);
  return lines.length ? lines : null;
}
