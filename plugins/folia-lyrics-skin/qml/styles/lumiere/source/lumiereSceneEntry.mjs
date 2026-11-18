// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { applyLumiereGroupQuality, detachLumierePassthrough } from './lumiereGroupFilters.mjs';
import { createLumiereUnit } from './lumiereUnit.mjs';
import { LUMIERE_BLOOM } from './types.mjs';
const BLUR_EPSILON = 0.3;
const applyLumiereSceneQuality = (groups, quality) => {
  applyLumiereGroupQuality(groups.graphics, {
    preset: LUMIERE_BLOOM.graphics,
    multiplier: quality.bloom,
    resolution: quality.graphicsResolution,
    levelDrop: quality.bloomLevelDrop,
    passthrough: quality.passthrough,
  });
  applyLumiereGroupQuality(groups.text, {
    preset: LUMIERE_BLOOM.text,
    multiplier: quality.textBloom,
    resolution: null,
    levelDrop: 0,
    passthrough: null,
  });
};
const buildLumiereSceneEntry = (pixi, context, index) => {
  const { width, height } = context;
  const unit = createLumiereUnit(pixi, {
    paragraph: context.program.paragraphs[index],
    width,
    height,
    resolution: context.resolution,
    programSeed: context.program.seed,
    theme: context.theme,
    tuning: context.tuning,
    sprites: context.sprites,
    audioAt: context.audioAt,
  });
  unit.scene.text.visible = context.showText;
  applyLumiereSceneQuality(unit.scene, context.quality);
  const holder = new pixi.Container();
  holder.addChild(unit.scene.view);
  holder.pivot.set(width / 2, height / 2);
  holder.position.set(width / 2, height / 2);
  holder.zIndex = index;
  return { index, unit, holder, blur: null };
};
const applyLumiereLayerFrame = (pixi, entry, frame, blurResolution) => {
  var _a, _b;
  entry.holder.alpha = frame.alpha;
  entry.holder.scale.set(frame.scale);
  if (frame.blur > BLUR_EPSILON) {
    if (!entry.blur) {
      entry.blur = new pixi.BlurFilter({
        strength: frame.blur,
        quality: 3,
        resolution: blurResolution,
      });
    }
    entry.blur.strength = frame.blur;
    if (!((_a = entry.holder.filters) == null ? void 0 : _a.includes(entry.blur)))
      entry.holder.filters = [entry.blur];
  } else if ((_b = entry.holder.filters) == null ? void 0 : _b.length) {
    entry.holder.filters = [];
  }
};
const destroyLumiereSceneEntry = (entry, passthrough) => {
  var _a, _b;
  (_a = entry.holder.parent) == null ? void 0 : _a.removeChild(entry.holder);
  entry.holder.filters = [];
  (_b = entry.blur) == null ? void 0 : _b.destroy();
  entry.blur = null;
  detachLumierePassthrough(entry.unit.scene.graphics, passthrough);
  entry.holder.removeChild(entry.unit.scene.view);
  entry.unit.destroy();
  entry.holder.destroy();
};
export {
  applyLumiereLayerFrame,
  applyLumiereSceneQuality,
  buildLumiereSceneEntry,
  destroyLumiereSceneEntry,
};
