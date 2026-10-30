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
export function flattenLumiereScene(frame, width, height, resolution) {
  const states = new Map(),
    groups = [],
    leaves = [];
  let order = 0;
  for (const node of frame.nodes) {
    const parent =
      node.parent === null
        ? { matrix: identity, alpha: 1, group: null, shown: true }
        : states.get(node.parent);
    if (!parent) throw new Error('Lumiere frame parent is missing');
    const state = {
      matrix: multiply(parent.matrix, node.matrix),
      alpha: parent.alpha * node.alpha,
      group: parent.group,
      shown: parent.shown,
    };
    if (node.filters.length) {
      const bounds = filterFrame(node.filterBounds, node.filters, width, height, resolution);
      state.shown = state.shown && bounds !== null;
      if (state.shown) {
        groups.push({
          id: node.id,
          parent: state.group,
          order: order++,
          bounds,
          filters: node.filters,
        });
        state.group = node.id;
      }
    }
    states.set(node.id, state);
    if (state.shown && node.kind !== 'container')
      leaves.push(
        Object.assign({}, node, {
          parent: state.group,
          matrix: state.matrix,
          alpha: state.alpha,
          order: order++,
        })
      );
  }
  return { groups, leaves, textures: frame.textures };
}
