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
export function spriteIntersectsCapture(node, state) {
  if (node.kind !== 'sprite' && node.kind !== 'solid') return true;
  const frame = node.texture ? node.texture.frame : node.frame;
  const width = node.tile ? node.tile.width : frame.width,
    height = node.tile ? node.tile.height : frame.height,
    x = -node.anchor[0] * width,
    y = -node.anchor[1] * height,
    m = state.matrix,
    clip = state.capture,
    originX = m[0] * x + m[1] * y + m[2],
    originY = m[3] * x + m[4] * y + m[5],
    dx = m[0] * width,
    ex = m[1] * height,
    dy = m[3] * width,
    ey = m[4] * height,
    margin = 2 / clip.resolution + 1e-7;
  return (
    originX + Math.max(0, dx) + Math.max(0, ex) >= clip.x - margin &&
    originX + Math.min(0, dx) + Math.min(0, ex) <= clip.x + clip.width + margin &&
    originY + Math.max(0, dy) + Math.max(0, ey) >= clip.y - margin &&
    originY + Math.min(0, dy) + Math.min(0, ey) <= clip.y + clip.height + margin
  );
}
export function createFramePlan(width, height, resolution, leafSink = null) {
  const groups = [],
    leaves = [];
  const origin = {
    matrix: identity,
    alpha: 1,
    group: null,
    shown: true,
    capture: { x: 0, y: 0, width, height, resolution },
  };
  let order = 0;
  function publishLeaf(node) {
    if (leafSink) leafSink(node);
    else leaves.push(node);
  }
  function appendLeaf(node, state, publish = true) {
    if (!state.shown || node.kind === 'container' || !spriteIntersectsCapture(node, state))
      return false;
    node.parent = state.group;
    node.matrix = state.matrix;
    node.alpha = state.alpha;
    node.order = order++;
    if (publish) publishLeaf(node);
    return true;
  }
  function append(node, parent = origin, deferLeaf = false, matrixBuffer = null) {
    const matrix = multiply(parent.matrix, node.matrix, matrixBuffer),
      alpha = parent.alpha * node.alpha;
    let group = parent.group,
      shown = parent.shown,
      capture = parent.capture;
    if (shown && node.filters.length) {
      const bounds = filterFrame(node.filterBounds, node.filters, width, height, resolution);
      shown = bounds !== null;
      if (shown) {
        groups.push({ id: node.id, parent: group, order: order++, bounds, filters: node.filters });
        group = node.id;
        capture = bounds;
      }
    }
    const state = { matrix, alpha, group, shown, capture };
    if (!deferLeaf) appendLeaf(node, state);
    return state;
  }
  return { groups, leaves, append, appendLeaf, publishLeaf };
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
