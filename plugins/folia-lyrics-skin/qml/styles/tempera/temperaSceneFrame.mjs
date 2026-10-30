// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import {
  resolveTemperaEnterTransitionFrame,
  resolveTemperaExitTransitionFrame,
} from './temperaTransitions.mjs';
const resolveTemperaSceneTransitionFrame = (
  program,
  scene,
  index,
  time,
  isIncoming,
  outgoingTransition,
  transitionsEnabled
) => {
  var _a, _b, _c, _d, _e;
  const previousTransition =
    index > 0 ? ((_a = program.paragraphs[index - 1]) == null ? void 0 : _a.transitionOut) : null;
  const enterDuration = previousTransition
    ? Math.max(0.35, Math.min(1, previousTransition.endTime - previousTransition.startTime))
    : 0;
  const entering =
    transitionsEnabled &&
    previousTransition !== null &&
    previousTransition.kind === 'block-wipe' &&
    time >= scene.paragraph.startTime &&
    time <= scene.paragraph.startTime + enterDuration;
  return isIncoming && outgoingTransition
    ? resolveTemperaEnterTransitionFrame(
        outgoingTransition.kind,
        time - outgoingTransition.startTime,
        Math.max(1e-3, outgoingTransition.endTime - outgoingTransition.startTime),
        true,
        // Enter on the incoming paragraph's own flow, so the arrival continues
        // the direction the outgoing composition was already travelling.
        (_c = (_b = scene.paragraph.shots[0]) == null ? void 0 : _b.flowAngle) != null ? _c : 0
      )
    : entering && previousTransition
      ? resolveTemperaEnterTransitionFrame(
          previousTransition.kind,
          time - scene.paragraph.startTime,
          enterDuration,
          true,
          (_e = (_d = scene.paragraph.shots[0]) == null ? void 0 : _d.flowAngle) != null ? _e : 0
        )
      : resolveTemperaExitTransitionFrame(scene.paragraph, time, transitionsEnabled);
};
const findTemperaActiveShotIndex = (scene, time) => {
  let activeShotIndex = 0;
  for (let i = scene.shots.length - 1; i >= 0; i--) {
    if (time >= scene.shots[i].shot.startTime) {
      activeShotIndex = i;
      break;
    }
  }
  return activeShotIndex;
};
const requiresTemperaSceneRebuild = (previous, next) =>
  previous.colorMode !== next.colorMode ||
  previous.textureResolution !== next.textureResolution ||
  previous.glyphSettleStretch !== next.glyphSettleStretch ||
  previous.showBlocks !== next.showBlocks ||
  previous.showDecor !== next.showDecor ||
  previous.textInversion !== next.textInversion ||
  previous.enableTransitions !== next.enableTransitions ||
  previous.postProcessEnabled !== next.postProcessEnabled ||
  previous.postProcessTextureCompression !== next.postProcessTextureCompression ||
  previous.postProcessGrain !== next.postProcessGrain ||
  previous.postProcessContrast !== next.postProcessContrast ||
  previous.postProcessRgbShift !== next.postProcessRgbShift ||
  previous.postProcessVignette !== next.postProcessVignette ||
  previous.postProcessLensDistortion !== next.postProcessLensDistortion ||
  previous.layerImageDepth !== next.layerImageDepth ||
  previous.layerImageFrequency !== next.layerImageFrequency ||
  previous.layerImages.length !== next.layerImages.length ||
  previous.layerImages.some((image, index) => {
    var _a, _b, _c;
    return (
      image.id !== ((_a = next.layerImages[index]) == null ? void 0 : _a.id) ||
      image.align !== ((_b = next.layerImages[index]) == null ? void 0 : _b.align) ||
      image.verticalAlign !== ((_c = next.layerImages[index]) == null ? void 0 : _c.verticalAlign)
    );
  });
export {
  findTemperaActiveShotIndex,
  requiresTemperaSceneRebuild,
  resolveTemperaSceneTransitionFrame,
};
