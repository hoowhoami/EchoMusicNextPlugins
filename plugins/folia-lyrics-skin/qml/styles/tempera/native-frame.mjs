// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { at } from './compat.mjs';
import { findTemperaParagraphIndexAtTime } from './temperaProgram.mjs';
import { resolveTemperaCreditsFrame } from './temperaCreditsLayer.mjs';
import { setPixiDisplayTreeVisibility } from './display-resources.mjs';
import {
  resolveTemperaSceneTransitionFrame,
  findTemperaActiveShotIndex,
} from './temperaSceneFrame.mjs';
import { resolveTemperaShotExit, updateTemperaShot } from './temperaShotFrame.mjs';
import { setTemperaTransitionBlur } from './temperaSceneFilters.mjs';
function renderSourceFrame(time) {
  var _a, _b, _c;
  if (this.destroyed) return;
  if (this.options.program.paragraphs.length === 0) return;
  const paragraphIndex = findTemperaParagraphIndexAtTime(this.options.program, time);
  if (paragraphIndex !== this.activeParagraphIndex) {
    this.activeParagraphIndex = paragraphIndex;
    this.sceneCache.ensure(paragraphIndex);
    this.sceneCache.prune(paragraphIndex);
  } else if (true) {
    const next = paragraphIndex + 1;
    const previous = paragraphIndex - 1;
    if (this.sceneCache.hasRetired) {
      this.sceneCache.drainRetired();
    } else if (next < this.options.program.paragraphs.length && !this.sceneCache.has(next)) {
      this.sceneCache.ensure(next);
    } else if (previous >= 0 && !this.sceneCache.has(previous)) {
      this.sceneCache.ensure(previous);
    }
  }
  const width = this.lastWidth || Math.max(this.lastWidth, 320);
  const height = this.lastHeight || Math.max(this.lastHeight, 240);
  const finalParagraph = at(this.options.program.paragraphs, -1);
  const creditsFrame = resolveTemperaCreditsFrame(
    time,
    (_a = finalParagraph == null ? void 0 : finalParagraph.endTime) != null
      ? _a
      : Number.POSITIVE_INFINITY
  );
  const hasCredits = this.creditsLayer.hasPoster;
  let wipeDrawn = false;
  const transitionsEnabled = this.options.tuning.enableTransitions && !this.options.staticMode;
  const outgoingTransition =
    (_c =
      (_b = this.options.program.paragraphs[paragraphIndex]) == null ? void 0 : _b.transitionOut) !=
    null
      ? _c
      : null;
  const preRoll =
    transitionsEnabled &&
    outgoingTransition !== null &&
    outgoingTransition.kind !== 'block-wipe' &&
    time >= outgoingTransition.startTime;
  this.sceneCache.forEach((scene, index) => {
    const isActive = index === paragraphIndex;
    const isIncoming = preRoll && index === paragraphIndex + 1;
    setPixiDisplayTreeVisibility(scene.container, isActive || isIncoming);
    scene.container.zIndex = index;
    if (!scene.container.visible) {
      scene.shots.forEach((shot) => {
        shot.container.visible = false;
      });
      scene.activeShotIndex = -1;
      return;
    }
    const paragraphTransitionFrame = resolveTemperaSceneTransitionFrame(
      this.options.program,
      scene,
      index,
      time,
      isIncoming,
      outgoingTransition,
      transitionsEnabled
    );
    const activeShotIndex = findTemperaActiveShotIndex(scene, time);
    const transitionFrame = paragraphTransitionFrame;
    scene.shots.forEach((shot, shotIndex) => {
      const isShotActive = shotIndex === activeShotIndex;
      const isHandingOff = shotIndex < activeShotIndex && resolveTemperaShotExit(shot, time) < 1;
      setPixiDisplayTreeVisibility(shot.container, isShotActive || isHandingOff);
      if (!shot.container.visible) return;
      updateTemperaShot(shot, time, width, height, this.options.tuning, this.options.theme);
    });
    scene.activeShotIndex = activeShotIndex;
    const isFinalScene = index === this.options.program.paragraphs.length - 1;
    const lyricAlpha = isFinalScene && hasCredits ? creditsFrame.lyricAlpha : 1;
    scene.container.alpha = transitionFrame.alpha * lyricAlpha;
    scene.container.pivot.set(width / 2, height / 2);
    scene.container.position.set(
      width / 2 + transitionFrame.x * width,
      height / 2 + transitionFrame.y * height
    );
    scene.container.scale.set(transitionFrame.scale);
    scene.container.rotation = transitionFrame.rotation;
    setTemperaTransitionBlur(scene, transitionFrame.blur);
    if (transitionFrame.wipe > 1e-3 && transitionFrame.wipe < 1.999) {
      this.overlay.drawWipe(
        transitionFrame.wipe,
        transitionFrame.wipeAngle,
        width,
        height,
        scene.palette.tone3
      );
      wipeDrawn = true;
    }
  });
  if (!wipeDrawn) this.overlay.drawWipe(0, 0, width, height, '#000000');
  this.creditsLayer.applyFrame(
    creditsFrame,
    hasCredits,
    time,
    finalParagraph == null ? void 0 : finalParagraph.endTime,
    width,
    height
  );
}
export { renderSourceFrame };
