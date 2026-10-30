// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { hashSonnetSeed } from './sonnetRandom.mjs';
import {
  IDLE_SONNET_TRANSITION_FRAME,
  resolveSonnetEnterTransitionFrame,
  resolveSonnetExitTransitionFrame,
  resolveSonnetShotTransitionFrame,
} from './sonnetTransitions.mjs';
const findSonnetActiveShotIndex = (scene, time) => {
    let activeShotIndex = 0;
    for (let i = scene.shots.length - 1; i >= 0; i--)
      if (time >= scene.shots[i].shot.startTime) {
        activeShotIndex = i;
        break;
      }
    return activeShotIndex;
  },
  resolveSonnetSceneTransitionFrame = (
    program,
    scene,
    index,
    visibleShotIndex,
    time,
    transitionsEnabled
  ) => {
    var _a;
    const transitionSeed = hashSonnetSeed(`${program.seed}:${scene.paragraph.id}:transition-frame`),
      previousTransition =
        index > 0
          ? (_a = program.paragraphs[index - 1]) == null
            ? void 0
            : _a.transitionOut
          : null,
      enterDuration = previousTransition
        ? Math.max(0.16, Math.min(0.3, previousTransition.endTime - previousTransition.startTime))
        : 0,
      paragraphTransitionFrame =
        transitionsEnabled &&
        previousTransition !== null &&
        time >= scene.paragraph.startTime &&
        time <= scene.paragraph.startTime + enterDuration
          ? resolveSonnetEnterTransitionFrame(
              previousTransition.kind,
              time - scene.paragraph.startTime,
              enterDuration,
              !0,
              transitionSeed
            )
          : resolveSonnetExitTransitionFrame(
              scene.paragraph,
              time,
              transitionsEnabled,
              transitionSeed
            ),
      shotTransitionFrame = resolveSonnetShotTransitionFrame(
        scene.shotTimeline,
        visibleShotIndex,
        time,
        transitionsEnabled,
        transitionSeed
      );
    return shotTransitionFrame !== IDLE_SONNET_TRANSITION_FRAME
      ? shotTransitionFrame
      : paragraphTransitionFrame;
  };
export { findSonnetActiveShotIndex, resolveSonnetSceneTransitionFrame };
