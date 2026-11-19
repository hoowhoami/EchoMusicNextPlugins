import { createFramePlan } from './frame-plan.mjs';
import { textTexture } from './text-texture.mjs';
// Retains and evaluates the complete original scene. Native snapshots contain data only.
import { localMatrix, multiply } from '../sonnet/scene-graph.mjs';
let textureRevision = 0;
const noFilters = Object.freeze([]);
const copy = (value) => JSON.parse(JSON.stringify(value));
function rect(value) {
  return { x: value.x, y: value.y, width: value.width, height: value.height };
}
function filterData(filter) {
  if (filter.kind === 'copy')
    return {
      kind: 'copy',
      alpha: filter.alpha,
      resolution: filter.resolution,
      enabled: filter.enabled,
    };
  if (filter.options && typeof filter.options.strength === 'number')
    return {
      kind: 'lumiere-bloom',
      options: copy(filter.options),
      resolution: filter.resolution,
      enabled: filter.enabled,
      blendMode: filter.blendMode,
    };
  if (filter.kind === 'blur')
    return {
      kind: 'blur',
      strength: filter.strength,
      quality: filter.quality,
      kernelSize: filter.kernelSize,
      resolution: filter.resolution,
      enabled: filter.enabled,
    };
  throw new Error('Unsupported Lumiere source filter');
}
export function snapshotLumiereScene(root, options = {}) {
  const nodes = [],
    textures = [],
    sources = new Map();
  const plan = options.viewport
    ? createFramePlan(options.viewport.width, options.viewport.height, options.resolution)
    : null;
  let nodeCount = 0,
    pathBytes = 0,
    pathCount = 0;
  function sourceOf(source) {
    if (sources.has(source)) return sources.get(source);
    const id = source.id || 'builtin-' + source.kind,
      spec = {
        id,
        kind: source.kind,
        width: source.width,
        height: source.height,
        pixelWidth: source.pixelWidth,
        pixelHeight: source.pixelHeight,
        resolution: source.resolution,
      };
    if (source.kind === 'canvas') {
      const commands = source.resource.commands,
        cache = options.textureCache,
        previous = cache && cache.get(source);
      const unchanged =
        previous &&
        previous.commands === commands &&
        previous.length === commands.length &&
        previous.width === spec.pixelWidth &&
        previous.height === spec.pixelHeight &&
        previous.resolution === spec.resolution;
      if (cache) {
        spec.revision = unchanged ? previous.revision : ++textureRevision;
        if (unchanged) pathBytes += previous.pathBytes;
        else {
          spec.commands = copy(commands);
          const bytes = JSON.stringify(spec.commands).length * 2;
          pathBytes += bytes;
          cache.set(source, {
            commands,
            length: commands.length,
            width: spec.pixelWidth,
            height: spec.pixelHeight,
            resolution: spec.resolution,
            revision: spec.revision,
            pathBytes: bytes,
          });
        }
      } else {
        spec.commands = copy(commands);
        pathBytes += JSON.stringify(spec.commands).length * 2;
      }
    }
    textures.push(spec);
    sources.set(source, id);
    return id;
  }
  function visit(node, parent, inheritedBlend = 'normal', parentState) {
    if (node.destroyed || !node.visible || !node.renderable || node.alpha === 0) return;
    if (++nodeCount > 8192) throw new Error('Lumiere visible scene node budget exceeded');
    const result = {
      id: node.id,
      parent,
      kind: node.kind,
      matrix: localMatrix(node),
      alpha: node.alpha,
      zIndex: node.zIndex,
      blendMode:
        options.inheritBlend && node.blendMode === 'normal' ? inheritedBlend : node.blendMode,
      tint: node.tint === undefined ? 0xffffff : node.tint,
      filters:
        node.filters && node.filters.length
          ? node.filters.filter((filter) => filter.enabled !== false).map(filterData)
          : noFilters,
    };
    if (node.filterArea) result.filterArea = rect(node.filterArea);
    if (result.filters.length) {
      if (node.filterArea) {
        let matrix = localMatrix(node);
        for (let parent = node.parent; parent; parent = parent.parent)
          matrix = multiply(localMatrix(parent), matrix);
        const area = node.filterArea,
          points = [
            [area.x, area.y],
            [area.x + area.width, area.y],
            [area.x, area.y + area.height],
            [area.x + area.width, area.y + area.height],
          ].map(([x, y]) => [
            matrix[0] * x + matrix[1] * y + matrix[2],
            matrix[3] * x + matrix[4] * y + matrix[5],
          ]),
          xs = points.map((point) => point[0]),
          ys = points.map((point) => point[1]),
          x = Math.min(...xs),
          y = Math.min(...ys);
        result.filterBounds = { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
      } else result.filterBounds = rect(node.getBounds());
    }
    if (node.kind === 'graphics') {
      result.paths = node.paths;
      result.geometryRevision = node.geometryRevision;
      for (const path of result.paths) {
        pathCount++;
        pathBytes += path.path.length * 2;
      }
    } else if (node.kind === 'sprite' || node.kind === 'tiling') {
      if (node.kind === 'tiling') {
        result.kind = 'sprite';
        result.tile = {
          width: node.width,
          height: node.height,
          x: node.tilePosition.x,
          y: node.tilePosition.y,
          scaleX: node.tileScale.x,
          scaleY: node.tileScale.y,
        };
      }
      if (node.texture.source.kind === 'white') {
        result.kind = 'solid';
        result.frame = rect(node.texture.frame);
      } else
        result.texture = { source: sourceOf(node.texture.source), frame: rect(node.texture.frame) };
      result.anchor = [node.anchor.x, node.anchor.y];
    } else if (node.kind === 'light-field') {
      result.bounds = node.getLocalBounds();
      result.uniforms = {};
      const uniforms = node.shader.resources.lightUniforms.uniforms;
      for (const key of Object.keys(uniforms)) result.uniforms[key] = [...uniforms[key]];
    } else if (node.kind === 'text') {
      const texture = textTexture(node, options.resolution || 1, options.registeredScreens || []);
      result.kind = 'sprite';
      result.texture = { source: sourceOf(texture.source), frame: rect(texture.frame) };
      result.anchor = [node.anchor.x, node.anchor.y];
    } else if (node.kind !== 'container') throw new Error('Unsupported Lumiere scene node');
    if (pathBytes > 64 * 1024 * 1024 || pathCount > 65536)
      throw new Error('Lumiere visible geometry budget exceeded');
    const state = plan ? plan.append(result, parentState) : null;
    if (!plan) nodes.push(result);
    if (!node.children.length) return;
    const children = node.sortableChildren
      ? node.children.slice().sort((a, b) => a.zIndex - b.zIndex)
      : node.children;
    for (let i = 0; i < children.length; ++i) visit(children[i], node.id, result.blendMode, state);
  }
  visit(root, null);
  if (options.textureCache)
    for (const source of options.textureCache.keys())
      if (!sources.has(source)) options.textureCache.delete(source);
  if (plan) return { groups: plan.groups, leaves: plan.leaves, textures };
  return { nodes, textures, pathBytes, pathCount };
}
