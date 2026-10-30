import { textTexture } from './text-texture.mjs';
// Retains and evaluates the complete original scene. Native snapshots contain data only.
import { localMatrix, multiply } from '../sonnet/scene-graph.mjs';
import { createLumiereBackend } from './backend.mjs';
import { createLightSprites } from './source/light/sprites.mjs';
import {
  buildLumiereSceneEntry,
  applyLumiereLayerFrame,
  destroyLumiereSceneEntry,
} from './source/lumiereSceneEntry.mjs';
const copy = (value) => JSON.parse(JSON.stringify(value));
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
  let pathBytes = 0,
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
      spec.commands = copy(source.resource.commands);
      pathBytes += JSON.stringify(spec.commands).length * 2;
    }
    textures.push(spec);
    sources.set(source, id);
    return id;
  }
  function visit(node, parent) {
    if (node.destroyed || !node.visible || !node.renderable || node.alpha === 0) return;
    if (nodes.length >= 8192) throw new Error('Lumiere visible scene node budget exceeded');
    const result = {
      id: node.id,
      parent,
      kind: node.kind,
      matrix: localMatrix(node),
      alpha: node.alpha,
      zIndex: node.zIndex,
      blendMode: node.blendMode,
      tint: node.tint === undefined ? 0xffffff : node.tint,
      filters: (node.filters || []).filter((filter) => filter.enabled !== false).map(filterData),
    };
    if (node.filterArea) result.filterArea = copy(node.filterArea);
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
      } else result.filterBounds = copy(node.getBounds());
    }
    if (node.kind === 'graphics') {
      result.paths = copy(node.paths);
      result.geometryRevision = node.geometryRevision;
      for (const path of result.paths) {
        pathCount++;
        pathBytes += path.path.length * 2;
      }
    } else if (node.kind === 'sprite') {
      if (node.texture.source.kind === 'white') {
        result.kind = 'solid';
        result.frame = copy(node.texture.frame);
      } else
        result.texture = { source: sourceOf(node.texture.source), frame: copy(node.texture.frame) };
      result.anchor = [node.anchor.x, node.anchor.y];
    } else if (node.kind === 'light-field') {
      result.bounds = node.getLocalBounds();
      result.uniforms = {};
      const uniforms = node.shader.resources.lightUniforms.uniforms;
      for (const key of Object.keys(uniforms)) result.uniforms[key] = [...uniforms[key]];
    } else if (node.kind === 'text') {
      const texture = textTexture(node, options.resolution || 1, options.registeredScreens || []);
      result.kind = 'sprite';
      result.texture = { source: sourceOf(texture.source), frame: copy(texture.frame) };
      result.anchor = [node.anchor.x, node.anchor.y];
    } else if (node.kind !== 'container') throw new Error('Unsupported Lumiere scene node');
    if (pathBytes > 64 * 1024 * 1024 || pathCount > 65536)
      throw new Error('Lumiere visible geometry budget exceeded');
    nodes.push(result);
    const children = node.sortableChildren
      ? node.children.slice().sort((a, b) => a.zIndex - b.zIndex)
      : node.children;
    for (const child of children) visit(child, node.id);
  }
  visit(root, null);
  return { nodes, textures, pathBytes, pathCount };
}
export function createNativeLumiereScene(options) {
  let audio = { bass: 0, treble: 0, power: 0 },
    destroyed = false;
  const pixi = createLumiereBackend({ measureText: options.measureText }),
    sprites = createLightSprites(pixi),
    entry = buildLumiereSceneEntry(
      pixi,
      Object.assign({}, options, { sprites, audioAt: () => audio }),
      options.index
    );
  return {
    frame(
      time,
      layer = { alpha: 1, scale: 1, blur: 0 },
      nextAudio = { bass: 0, treble: 0, power: 0 }
    ) {
      if (destroyed) throw new Error('Lumiere scene is released');
      audio = nextAudio;
      applyLumiereLayerFrame(pixi, entry, layer, options.resolution * 0.5);
      entry.unit.update(time);
      return snapshotLumiereScene(entry.holder);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      destroyLumiereSceneEntry(entry, options.quality.passthrough);
      sprites.destroy();
    },
  };
}
export function createLumiereLightTextures() {
  const pixi = createLumiereBackend(),
    sprites = createLightSprites(pixi),
    result = [];
  for (const name of ['dot', 'star', 'bokeh', 'streak']) {
    const source = sprites[name].source;
    result.push({
      name,
      kind: 'canvas',
      width: source.width,
      height: source.height,
      pixelWidth: source.pixelWidth,
      pixelHeight: source.pixelHeight,
      resolution: source.resolution,
      commands: copy(source.resource.commands),
    });
  }
  sprites.destroy();
  return result;
}
