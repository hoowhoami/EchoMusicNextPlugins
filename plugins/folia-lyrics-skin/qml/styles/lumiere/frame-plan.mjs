// Pixi filters consume world-space content. Camera transforms precede bloom, never scale its taps.
import { multiply } from '../sonnet/scene-graph.mjs';
const identity = [1, 0, 0, 0, 1, 0];
export function filterFrame(bounds, filters, width, height, resolution) {
  let scale = resolution,
    padding = 0;
  for (const filter of filters) {
    if (typeof filter.resolution === 'number') scale = Math.min(scale, filter.resolution);
    padding +=
      filter.kind === 'blur'
        ? Math.abs(filter.strength) * 2
        : filter.kind === 'copy'
          ? 0
          : filter.options.padding;
  }
  const left = Math.max(0, bounds.x),
    top = Math.max(0, bounds.y),
    right = Math.min(width, bounds.x + bounds.width),
    bottom = Math.min(height, bounds.y + bounds.height);
  if (right <= left || bottom <= top) return null;
  const x = Math.floor(left * scale) * (1 / scale) - (padding | 0),
    y = Math.floor(top * scale) * (1 / scale) - (padding | 0),
    x2 = Math.ceil(right * scale) * (1 / scale) + (padding | 0),
    y2 = Math.ceil(bottom * scale) * (1 / scale) + (padding | 0);
  return { x, y, width: x2 - x, height: y2 - y, resolution: scale };
}
// A live scene already visits parents before their children. Pass their state
// down the tree so particle frames do not retain a second node list and ID map.
export function createFramePlan(width, height, resolution) {
  const groups = [],
    leaves = [];
  const origin = { matrix: identity, alpha: 1, group: null, shown: true };
  let order = 0;
  function append(node, parent = origin) {
    const matrix = multiply(parent.matrix, node.matrix),
      alpha = parent.alpha * node.alpha;
    let group = parent.group,
      shown = parent.shown;
    if (shown && node.filters.length) {
      const bounds = filterFrame(node.filterBounds, node.filters, width, height, resolution);
      shown = bounds !== null;
      if (shown) {
        groups.push({ id: node.id, parent: group, order: order++, bounds, filters: node.filters });
        group = node.id;
      }
    }
    if (shown && node.kind !== 'container') {
      node.parent = group;
      node.matrix = matrix;
      node.alpha = alpha;
      node.order = order++;
      leaves.push(node);
    }
    return { matrix, alpha, group, shown };
  }
  return { groups, leaves, append };
}
export function flattenLumiereScene(frame, width, height, resolution) {
  const plan = createFramePlan(width, height, resolution),
    states = new Map();
  for (const node of frame.nodes) {
    const parent = states.get(node.parent);
    if (node.parent !== null && !parent) throw new Error('Lumiere frame parent is missing');
    states.set(node.id, plan.append(Object.assign({}, node), parent));
  }
  return { groups: plan.groups, leaves: plan.leaves, textures: frame.textures };
}
