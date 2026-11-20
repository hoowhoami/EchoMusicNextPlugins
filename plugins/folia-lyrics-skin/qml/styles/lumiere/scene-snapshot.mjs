import { createHanabiBatcher } from '../hanabi/batch-frame.mjs';
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
    sources = new Map(),
    sourceSpecs = new Map();
  const batcher = options.batchSprites ? createHanabiBatcher((id) => sourceSpecs.get(id)) : null;
  const spriteTexture = { source: null, frame: null };
  const spriteScratch = { anchor: [0, 0] };
  const spriteMatrix = [1, 0, 0, 0, 1, 0];
  const plan = options.viewport
    ? createFramePlan(
        options.viewport.width,
        options.viewport.height,
        options.resolution,
        batcher ? batcher.append : null,
      )
    : null;
  const textureCache = options.textureCache;
  const snapshotSerial = textureCache ? (textureCache.snapshotSerial || 0) + 1 : 0;
  if (textureCache) textureCache.snapshotSerial = snapshotSerial;
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
        if (unchanged) {
          pathBytes += previous.pathBytes;
          // A returning source keeps its identity. Republish its program so
          // consumers may independently evict their bounded image caches.
          if (previous.snapshot !== snapshotSerial - 1) spec.commands = copy(commands);
          previous.snapshot = snapshotSerial;
        } else {
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
            snapshot: snapshotSerial,
          });
        }
      } else {
        spec.commands = copy(commands);
        pathBytes += JSON.stringify(spec.commands).length * 2;
      }
    }
    textures.push(spec);
    sourceSpecs.set(id, spec);
    sources.set(source, id);
    return id;
  }
  function visit(node, parent, inheritedBlend = 'normal', parentState) {
    if (node.destroyed || !node.visible || !node.renderable || node.alpha === 0) return;
    if (++nodeCount > 8192) throw new Error('Lumiere visible scene node budget exceeded');
    const fast =
      batcher &&
      plan &&
      !node.children.length &&
      (!node.filters || !node.filters.length) &&
      ['sprite', 'tiling', 'text'].includes(node.kind);
    const result = fast ? spriteScratch : {};
    result.id = node.id;
    result.parent = parent;
    result.kind = node.kind;
    result.matrix = localMatrix(node, fast ? spriteMatrix : null);
    result.alpha = node.alpha;
    result.zIndex = node.zIndex;
    result.blendMode =
      options.inheritBlend && node.blendMode === 'normal' ? inheritedBlend : node.blendMode;
    result.tint = node.tint === undefined ? 0xffffff : node.tint;
    result.filters =
      node.filters && node.filters.length
        ? node.filters.filter((filter) => filter.enabled !== false).map(filterData)
        : noFilters;
    if (fast) {
      result.texture = null;
      result.frame = null;
      result.tile = null;
    }
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
    const state = plan ? plan.append(result, parentState, true, fast ? spriteMatrix : null) : null;
    let textureSource = null;
    // A clipped filter subtree contributes no pixels. Discover its visibility
    // before publishing sources: otherwise unseen glyphs still allocate atlases
    // and immutable textures, and can exhaust the visible scene's budget.
    if (plan && !state.shown) return;
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
        result.frame = fast ? node.texture.frame : rect(node.texture.frame);
      } else {
        textureSource = node.texture.source;
        if (fast) {
          spriteTexture.frame = node.texture.frame;
          result.texture = spriteTexture;
        } else result.texture = { source: null, frame: rect(node.texture.frame) };
      }
      if (fast) {
        result.anchor[0] = node.anchor.x;
        result.anchor[1] = node.anchor.y;
      } else result.anchor = [node.anchor.x, node.anchor.y];
    } else if (node.kind === 'light-field') {
      result.bounds = node.getLocalBounds();
      result.uniforms = {};
      const uniforms = node.shader.resources.lightUniforms.uniforms;
      for (const key of Object.keys(uniforms)) result.uniforms[key] = [...uniforms[key]];
    } else if (node.kind === 'text') {
      const texture = textTexture(node, options.resolution || 1, options.registeredScreens || []);
      result.kind = 'sprite';
      textureSource = texture.source;
      if (fast) {
        spriteTexture.frame = texture.frame;
        result.texture = spriteTexture;
      } else result.texture = { source: null, frame: rect(texture.frame) };
      if (fast) {
        result.anchor[0] = node.anchor.x;
        result.anchor[1] = node.anchor.y;
      } else result.anchor = [node.anchor.x, node.anchor.y];
    } else if (node.kind !== 'container') throw new Error('Unsupported Lumiere scene node');
    if (pathBytes > 64 * 1024 * 1024 || pathCount > 65536)
      throw new Error('Lumiere visible geometry budget exceeded');
    const shown = !plan || plan.appendLeaf(result, state, false);
    if (shown) {
      if (textureSource) result.texture.source = sourceOf(textureSource);
      if (plan) plan.publishLeaf(result);
      else nodes.push(result);
    }
    if (!node.children.length) return;
    const children = node.sortableChildren
      ? node.children.slice().sort((a, b) => a.zIndex - b.zIndex)
      : node.children;
    for (let i = 0; i < children.length; ++i) visit(children[i], node.id, result.blendMode, state);
  }
  visit(root, null);
  if (textureCache) {
    let retainedBytes = 0;
    const idle = [];
    for (const [source, entry] of textureCache) {
      if (source.destroyed || (!sources.has(source) && snapshotSerial - entry.snapshot > 60))
        textureCache.delete(source);
      else {
        retainedBytes += entry.pathBytes;
        if (!sources.has(source)) idle.push([source, entry]);
      }
    }
    idle.sort((a, b) => a[1].snapshot - b[1].snapshot);
    for (const [source, entry] of idle) {
      if (retainedBytes <= 2 * 1024 * 1024) break;
      textureCache.delete(source);
      retainedBytes -= entry.pathBytes;
    }
  }
  if (plan)
    return { groups: plan.groups, leaves: batcher ? batcher.finish() : plan.leaves, textures };
  return { nodes, textures, pathBytes, pathCount };
}
