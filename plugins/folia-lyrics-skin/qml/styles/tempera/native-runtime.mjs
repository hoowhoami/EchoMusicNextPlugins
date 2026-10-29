import { renderSourceFrame } from './native-frame.mjs';
// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { PixiSceneCache } from './scene-cache.mjs';
import { buildTemperaScene } from './temperaSceneBuilder.mjs';
import { TemperaCreditsLayer } from './temperaCreditsLayer.mjs';
import { TemperaOverlay } from './temperaOverlay.mjs';
import { destroyTemperaGradientFills } from './temperaShapes.mjs';
import { destroyPixiDisplayTree, unloadPixiDisplayTree } from './display-resources.mjs';
import { snapResolutionToTexturePool } from './texture-budget.mjs';
import { snapshot, poseSnapshot } from '../sonnet/scene-graph.mjs';
class NativeRuntime {
  constructor(pixi, options) {
    this.pixi = pixi;
    this.options = options;
    this.destroyed = false;
    this.activeParagraphIndex = -1;
    this.lastWidth = Math.max(options.width, 320);
    this.lastHeight = Math.max(options.height, 240);
    this.renderResolution = snapResolutionToTexturePool(
      this.lastWidth,
      this.lastHeight,
      options.tuning.textureResolution
    );
    this.stage = new pixi.Container();
    this.sceneContainer = new pixi.Container();
    this.sceneContainer.sortableChildren = true;
    this.creditsLayer = new TemperaCreditsLayer(pixi);
    this.overlay = new TemperaOverlay(pixi);
    this.stage.addChild(this.sceneContainer, this.creditsLayer.container, this.overlay.container);
    this.sceneCache = new PixiSceneCache({
      count: () => this.options.program.paragraphs.length,
      build: (index) => {
        const scene = this.buildScene(index);
        this.sceneContainer.addChild(scene.container);
        return scene;
      },
      destroy: (scene) => this.destroyScene(scene),
      detach: (scene) => this.sceneContainer.removeChild(scene.container),
    });
    this.overlay.draw(this.lastWidth, this.lastHeight, options.tuning, options.theme);
    const poster = this.creditsLayer.build(
      {
        theme: options.theme,
        coverColors: options.coverColors,
        tuning: options.tuning,
        metadata: options.metadata,
        lyricsFontScale: options.lyricsFontScale,
      },
      void 0,
      this.lastWidth,
      this.lastHeight
    );
    this.creditsLayer.adopt(poster, this.lastWidth, this.lastHeight);
  }
  buildScene(index) {
    return buildTemperaScene(
      this.pixi,
      {
        programSeed: this.options.program.seed,
        host: { clientWidth: this.lastWidth, clientHeight: this.lastHeight },
        theme: this.options.theme,
        tuning: this.options.tuning,
        renderResolution: this.renderResolution,
        lyricsFontScale: this.options.lyricsFontScale,
        staticMode: this.options.staticMode,
        coverColors: this.options.coverColors,
        imageTextures: new Map(this.options.images.map((image) => [image.id, image])),
      },
      this.options.program.paragraphs[index]
    );
  }
  destroyScene(scene) {
    this.sceneContainer.removeChild(scene.container);
    unloadPixiDisplayTree(scene.container);
    scene.container.filters = null;
    for (const shot of scene.shots) shot.textLayer.filters = null;
    for (const filter of scene.postProcessFilters) filter.destroy();
    destroyTemperaGradientFills(this.pixi, scene.container);
    destroyPixiDisplayTree(scene.container);
  }
  clear() {
    this.sceneCache.destroyAll();
    this.creditsLayer.dispose();
    this.stage.destroy({ children: true });
    this.destroyed = true;
  }
  setLiveTuning(tuning) {
    const old = this.options.tuning;
    this.options.tuning = tuning;
    this.sceneCache.forEach((scene) =>
      scene.shots.forEach((shot) => shot.images.applyPool(tuning.layerImages))
    );
    if (old.showCornerMarks !== tuning.showCornerMarks)
      this.overlay.draw(this.lastWidth, this.lastHeight, tuning, this.options.theme);
  }
  frame(time) {
    return renderSourceFrame.call(this, time);
  }
  serial() {
    return snapshot(this.stage);
  }
  poses() {
    return poseSnapshot(this.stage);
  }
}
export { NativeRuntime };
