// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { destroyPixiContainerChildren, destroyPixiDisplayTree } from './display-resources.mjs';
import { buildTemperaCreditsPoster, hasTemperaCreditsMetadata } from './temperaSceneBuilder.mjs';
import { resolveTemperaPalette } from './temperaPalette.mjs';
import { easeTemperaInOut } from './temperaMotion.mjs';
import { destroyTemperaGradientFills } from './temperaShapes.mjs';
const resolveTemperaCreditsFrame = (time, finalEndTime) => {
  const lyricAlpha = 1 - easeTemperaInOut((time - finalEndTime - 0.1) / 0.9);
  const posterProgress = easeTemperaInOut((time - finalEndTime - 0.9) / 1.1);
  return {
    active: time > finalEndTime + 0.35,
    lyricAlpha,
    posterAlpha: posterProgress,
    posterOffsetY: (1 - posterProgress) * 0.06,
    posterScale: 0.96 + posterProgress * 0.04,
  };
};
class TemperaCreditsLayer {
  constructor(pixi) {
    __publicField(this, 'pixi', pixi);
    __publicField(this, 'container');
    __publicField(this, 'view', null);
    this.container = new pixi.Container();
  }
  /** Whether a poster is installed; read once per frame before the scenes are posed. */
  get hasPoster() {
    return this.container.children.length > 0;
  }
  /**
   * Builds the credits poster for a song without installing it, so a handover can prepare the
   * incoming one under the block rather than on the frame the swap lands.
   */
  build(input, scenePalette, width, height) {
    if (!hasTemperaCreditsMetadata(input.metadata)) return null;
    const palette =
      scenePalette != null
        ? scenePalette
        : resolveTemperaPalette(input.theme, input.tuning, input.coverColors);
    return buildTemperaCreditsPoster(this.pixi, {
      theme: input.theme,
      tuning: input.tuning,
      palette,
      metadata: input.metadata,
      width,
      height,
      lyricsFontScale: input.lyricsFontScale,
    });
  }
  adopt(view, width, height) {
    this.dispose();
    this.view = view;
    if (!view) return;
    this.container.addChild(view.container);
    this.container.pivot.set(0, 0);
    this.container.position.set(width / 2, height / 2);
    this.container.visible = false;
  }
  dispose() {
    var _a, _b;
    (_a = this.view) == null
      ? void 0
      : _a.container.children.forEach((child) => {
          child.filters = null;
        });
    (_b = this.view) == null ? void 0 : _b.filters.forEach((filter) => filter.destroy());
    this.view = null;
    destroyTemperaGradientFills(this.pixi, this.container);
    destroyPixiContainerChildren(this.container);
  }
  /** Frees a poster that was never installed in the credits container. */
  destroyView(view) {
    view.container.children.forEach((child) => {
      child.filters = null;
    });
    view.filters.forEach((filter) => filter.destroy());
    destroyTemperaGradientFills(this.pixi, view.container);
    destroyPixiDisplayTree(view.container);
  }
  applyFrame(frame, hasPoster, time, finalEndTime, width, height) {
    var _a;
    this.container.visible = frame.active && hasPoster;
    this.container.alpha = frame.posterAlpha;
    if (this.container.visible) {
      (_a = this.view) == null
        ? void 0
        : _a.updateTime(time - (finalEndTime != null ? finalEndTime : time));
    }
    this.container.position.set(width / 2, height / 2 + frame.posterOffsetY * height);
    this.container.scale.set(frame.posterScale);
  }
}
export { TemperaCreditsLayer, resolveTemperaCreditsFrame };
