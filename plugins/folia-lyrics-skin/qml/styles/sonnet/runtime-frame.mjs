// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { at } from './compat.mjs';
import { findSonnetParagraphIndexAtTime } from './sonnetProgram.mjs';
import { resolveSonnetCreditsFrame } from './sonnetCredits.mjs';
import { sonnetDebugState } from './sonnetDebug.mjs';
import { unloadSonnetDisplayTree } from './sonnetPixiResources.mjs';
import { updateSonnetShot } from './sonnetShotFrame.mjs';
import {
  findSonnetActiveShotIndex,
  resolveSonnetSceneTransitionFrame,
} from './sonnetSceneFrame.mjs';
function renderSourceFrame() {
  var _a;
  if (this.destroyed) return;
  if ((this.advanceSongSwap(), this.options.program.paragraphs.length === 0)) {
    ((sonnetDebugState.activeShot = null), (sonnetDebugState.paragraphIndex = -1));
    return;
  }
  const time = this.options.currentTime.get(),
    paragraphIndex = findSonnetParagraphIndexAtTime(this.options.program, time);
  if (paragraphIndex !== this.activeParagraphIndex)
    ((this.activeParagraphIndex = paragraphIndex),
      this.sceneCache.ensure(paragraphIndex),
      this.sceneCache.prune(paragraphIndex));
  else if (!this.songSwap) {
    const next = paragraphIndex + 1,
      previous = paragraphIndex - 1;
    next < this.options.program.paragraphs.length && !this.sceneCache.has(next)
      ? this.sceneCache.ensure(next)
      : previous >= 0 && !this.sceneCache.has(previous) && this.sceneCache.ensure(previous);
  }
  const width = this.lastWidth,
    height = this.lastHeight,
    finalParagraph = at(this.options.program.paragraphs, -1),
    creditsFrame = resolveSonnetCreditsFrame(
      time,
      (_a = finalParagraph == null ? void 0 : finalParagraph.endTime) != null
        ? _a
        : Number.POSITIVE_INFINITY
    ),
    hasCredits = this.creditsContainer.children.length > 0,
    shotFrameContext = {
      tuning: this.options.tuning,
      theme: this.options.theme,
      audioBands: this.options.audioBands,
      audioPower: this.options.audioPower,
      mod: this.mod,
    };
  (this.sceneCache.forEach((scene, index) => {
    var _a2, _b;
    const isActive = index === paragraphIndex;
    if (((scene.container.visible = isActive), !isActive)) {
      const previousShot = scene.shots[scene.activeShotIndex];
      (previousShot && unloadSonnetDisplayTree(previousShot.container),
        (scene.activeShotIndex = -1));
      return;
    }
    const transitionsEnabled = this.options.tuning.enableTransitions && !this.options.staticMode,
      visibleShotIndex = findSonnetActiveShotIndex(scene, time),
      transitionFrame = resolveSonnetSceneTransitionFrame(
        this.options.program,
        scene,
        index,
        visibleShotIndex,
        time,
        transitionsEnabled
      );
    if (
      (scene.shots.forEach((shot, shotIndex) => {
        const isShotActive = shotIndex === visibleShotIndex;
        ((shot.container.visible = isShotActive),
          isShotActive && updateSonnetShot(shot, time, width, height, 0, shotFrameContext));
      }),
      scene.activeShotIndex !== visibleShotIndex)
    ) {
      const previousShot = scene.shots[scene.activeShotIndex];
      (previousShot && unloadSonnetDisplayTree(previousShot.container),
        (scene.activeShotIndex = visibleShotIndex));
    }
    ((sonnetDebugState.activeShot =
      (_b = (_a2 = scene.shots[visibleShotIndex]) == null ? void 0 : _a2.debugInfo) != null
        ? _b
        : null),
      (sonnetDebugState.paragraphIndex = index));
    const isFinalScene = index === this.options.program.paragraphs.length - 1,
      lyricAlpha = isFinalScene && hasCredits ? creditsFrame.lyricAlpha : 1,
      transitionMotionScale = this.mod('transitionMotionScale'),
      transitionBlurScale = this.mod('transitionBlurScale'),
      transitionGlitchScale = this.mod('transitionGlitchScale');
    if (
      ((scene.container.alpha = transitionFrame.alpha * lyricAlpha),
      scene.container.pivot.set(width / 2, height / 2),
      scene.container.position.set(
        width / 2 + transitionFrame.x * width * transitionMotionScale,
        height / 2 + transitionFrame.y * height * transitionMotionScale
      ),
      scene.container.scale.set(1 + (transitionFrame.scale - 1) * transitionMotionScale),
      (scene.container.rotation = transitionFrame.rotation * transitionMotionScale),
      scene.transitionBlurFilter &&
        ((scene.transitionBlurFilter.strength = transitionFrame.blur * transitionBlurScale),
        (scene.transitionBlurFilter.enabled = transitionFrame.blur > 0.01)),
      scene.transitionGlitchEffect)
    ) {
      const glitchAmount = transitionFrame.glitch * transitionGlitchScale;
      (scene.transitionGlitchEffect.update(glitchAmount, transitionFrame.glitchSeed),
        (scene.transitionGlitchEffect.filter.enabled = transitionFrame.glitch > 0.01));
    }
    isFinalScene && hasCredits && this.outroBlur.update(scene, creditsFrame.lyricBlur);
  }),
    (!creditsFrame.active || !hasCredits) && this.outroBlur.clear(),
    (this.creditsContainer.visible =
      creditsFrame.active && hasCredits && !this.options.tuning.showOnlyText),
    (this.creditsContainer.alpha = creditsFrame.posterAlpha),
    this.creditsContainer.position.set(width / 2, height / 2 + creditsFrame.posterOffsetY * height),
    this.creditsContainer.scale.set(creditsFrame.posterScale));
}
export { renderSourceFrame };
