// Lumiere scene creation and compatibility exports; the snapshot sink is independent.
import { snapshotLumiereScene } from './scene-snapshot.mjs';
export { snapshotLumiereScene } from './scene-snapshot.mjs';
import { createLumiereBackend } from './backend.mjs';
import { createLightSprites } from './source/light/sprites.mjs';
import {
  buildLumiereSceneEntry,
  applyLumiereLayerFrame,
  destroyLumiereSceneEntry,
} from './source/lumiereSceneEntry.mjs';
export function createNativeLumiereScene(options) {
  let audio = { bass: 0, treble: 0, power: 0 },
    destroyed = false;
  const pixi = createLumiereBackend({ measureText: options.measureText }),
    sprites = createLightSprites(pixi),
    entry = buildLumiereSceneEntry(
      pixi,
      Object.assign({}, options, { sprites, audioAt: () => audio }),
      options.index,
    );
  return {
    frame(
      time,
      layer = { alpha: 1, scale: 1, blur: 0 },
      nextAudio = { bass: 0, treble: 0, power: 0 },
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
