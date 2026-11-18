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
  const width = this.lastWidth || Math.max(this.lastWidth, 320);
  const height = this.lastHeight || Math.max(this.lastHeight, 240);
  const finalParagraph = at(this.options.program.paragraphs, -1);
  const creditsFrame = resolveTemperaCreditsFrame(
    time,
    (_a = finalParagraph == null ? void 0 : finalParagraph.endTime) != null
      ? _a
      : Number.POSITIVE_INFINITY,
  );
  // Prepare the poster before its first lyric fade, including a direct seek to credits.
  if (finalParagraph && time >= finalParagraph.endTime - 1) this.prepareCredits();
  else if (this.creditsPrepared) {
    this.creditsLayer.dispose();
    this.creditsPrepared = false;
  }
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
  const nextParagraph = this.options.program.paragraphs[paragraphIndex + 1];
  const nextVisibleAt =
    transitionsEnabled && outgoingTransition && outgoingTransition.kind !== 'block-wipe'
      ? outgoingTransition.startTime
      : nextParagraph?.startTime;
  const warmNext = nextParagraph && time >= nextVisibleAt - 1;
  this.sceneCache.retainVisible(paragraphIndex, warmNext ? paragraphIndex + 1 : -1);
  this.sceneCache.ensure(paragraphIndex);
  if (warmNext) this.sceneCache.ensure(paragraphIndex + 1);
  this.activeParagraphIndex = paragraphIndex;
  this.sceneCache.forEach((scene, index) => {
    const isActive = index === paragraphIndex;
    const isIncoming = preRoll && index === paragraphIndex + 1;
    setPixiDisplayTreeVisibility(scene.container, isActive || isIncoming);
    scene.container.zIndex = index;
    if (!scene.container.visible) {
      for (const [i, slot] of scene.shots.entries()) {
        if (i === 0 && warmNext) {
          if (slot.prepare(this.options.tuning.layerImages)) ++scene.shotRevision;
          slot.view.container.visible = false;
        } else slot.release();
      }
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
      transitionsEnabled,
    );
    const activeShotIndex = findTemperaActiveShotIndex(scene, time);
    const transitionFrame = paragraphTransitionFrame;
    scene.shots.forEach((slot, shotIndex) => {
      const shown =
        shotIndex === activeShotIndex ||
        (shotIndex < activeShotIndex && resolveTemperaShotExit(slot, time) < 1);
      const approaching = shotIndex === activeShotIndex + 1 && time >= slot.shot.startTime - 1;
      if (!shown && !approaching) {
        slot.release();
        return;
      }
      if (slot.prepare(this.options.tuning.layerImages)) ++scene.shotRevision;
      setPixiDisplayTreeVisibility(slot.view.container, shown);
      if (shown)
        updateTemperaShot(slot.view, time, width, height, this.options.tuning, this.options.theme);
    });
    scene.activeShotIndex = activeShotIndex;
    const isFinalScene = index === this.options.program.paragraphs.length - 1;
    const lyricAlpha = isFinalScene && hasCredits ? creditsFrame.lyricAlpha : 1;
    scene.container.alpha = transitionFrame.alpha * lyricAlpha;
    scene.container.pivot.set(width / 2, height / 2);
    scene.container.position.set(
      width / 2 + transitionFrame.x * width,
      height / 2 + transitionFrame.y * height,
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
        scene.palette.tone3,
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
    height,
  );
}
export { renderSourceFrame };
