// Derived from Folia a8da4437 (AGPL-3.0-only). See fume-reference.md.
import { getLineRenderEndTime } from '../../shared/renderHints.mjs';
import { colorWithAlpha } from '../cadenza/color.mjs';
import { clamp, isCJK } from './math.mjs';
import { resolveLinePassCutoffTime } from './reveal.mjs';
import { resolvePassedDimAmount, resolvePassedTextStyle } from './text-style.mjs';
const resolveFumeGlowBases = (animationIntensity, glowIntensity) => ({
  activeGlowBoost:
    (animationIntensity === 'chaotic' ? 1.15 : animationIntensity === 'calm' ? 0.72 : 0.92) *
    glowIntensity,
  passedGlowBase:
    (animationIntensity === 'chaotic' ? 0.95 : animationIntensity === 'calm' ? 0.35 : 0.62) *
    glowIntensity,
});
const isFumeBlockOnScreen = (block, camera, viewport, overscan = 180) => {
  const screenScale = camera.scale;
  const screenLeft = viewport.width * 0.5 + (block.x - camera.x) * screenScale;
  const screenTop = viewport.height * 0.5 + (block.y - camera.y) * screenScale;
  const screenRight = screenLeft + block.width * screenScale;
  const screenBottom = screenTop + block.height * screenScale;
  return !(
    screenRight < -overscan ||
    screenLeft > viewport.width + overscan ||
    screenBottom < -overscan ||
    screenTop > viewport.height + overscan
  );
};
const resolveFumeBlockTiming = (block, time, nextLineStartTime, textHoldRatio) => {
  const waitingOpacity = block.variant === 'hero' ? 0.06 : 0.035;
  const activeOpacity = block.variant === 'hero' ? 0.985 : 0.92;
  const effectiveTextHoldStyle = textHoldRatio >= 1 ? 'standard' : 'dimmed';
  const passedStyle = resolvePassedTextStyle(block.variant, effectiveTextHoldStyle);
  const transitionPassedStyle = resolvePassedTextStyle(block.variant, 'standard');
  const baselineOffset = block.lineHeight * (isCJK(block.line.fullText) ? 0.52 : 0.5);
  const lineEndTime = getLineRenderEndTime(block.line);
  const linePassCutoffTime = resolveLinePassCutoffTime(block.line, nextLineStartTime);
  const revealCompleteTime = block.line.endTime;
  const hasRevealCompleted = time >= revealCompleteTime;
  const hasPassCutoffReached = time >= linePassCutoffTime;
  const lineDuration = Math.max(lineEndTime - block.line.startTime, 0.18);
  const colorTrailDuration = clamp(
    lineDuration * (block.variant === 'hero' ? 0.42 : 0.52),
    0.45,
    1.45
  );
  const staticState =
    time < block.line.startTime
      ? 'waiting'
      : time >= lineEndTime + colorTrailDuration
        ? 'passed'
        : null;
  return {
    waitingOpacity,
    activeOpacity,
    effectiveTextHoldStyle,
    passedStyle,
    transitionPassedStyle,
    baselineOffset,
    lineEndTime,
    linePassCutoffTime,
    hasRevealCompleted,
    hasPassCutoffReached,
    lineDuration,
    colorTrailDuration,
    staticState,
  };
};
const resolveFumeStaticLayers = (
  block,
  timing,
  { time, theme, passedGlowBase, passedFadeDuration, overviewTextRestoreProgress, snapshotScale },
  getSnapshot
) => {
  const {
    staticState,
    effectiveTextHoldStyle,
    passedStyle,
    waitingOpacity,
    lineEndTime,
    colorTrailDuration,
  } = timing;
  if (!staticState) return null;
  const cacheStyleKey = staticState === 'passed' ? effectiveTextHoldStyle : 'base';
  const snapshot = getSnapshot({
    key: `${block.id}:${staticState}:${cacheStyleKey}:${snapshotScale}`,
    fill:
      staticState === 'waiting'
        ? colorWithAlpha(theme.primaryColor, waitingOpacity)
        : colorWithAlpha(theme.primaryColor, passedStyle.opacity),
    shadowBlur:
      staticState === 'waiting'
        ? 0
        : (2 + block.fontPx * 0.1) * 0.65 * passedGlowBase * passedStyle.glowMultiplier,
    shadowColor:
      staticState === 'waiting'
        ? 'transparent'
        : colorWithAlpha(theme.primaryColor, passedStyle.shadowAlphaBase),
  });
  if (!snapshot) return null;
  if (staticState === 'passed' && effectiveTextHoldStyle === 'dimmed') {
    const passedAt = lineEndTime + colorTrailDuration;
    const baseDimAmount = resolvePassedDimAmount(time, passedAt, passedFadeDuration);
    const dimAmount = baseDimAmount * (1 - overviewTextRestoreProgress);
    const standardStyle = resolvePassedTextStyle(block.variant, 'standard');
    const standardSnapshot = getSnapshot({
      key: `${block.id}:passed:standard:${snapshotScale}`,
      fill: colorWithAlpha(theme.primaryColor, standardStyle.opacity),
      shadowBlur: (2 + block.fontPx * 0.1) * 0.65 * passedGlowBase * standardStyle.glowMultiplier,
      shadowColor: colorWithAlpha(theme.primaryColor, standardStyle.shadowAlphaBase),
    });
    if (standardSnapshot) {
      if (dimAmount <= 0) return [{ snapshot: standardSnapshot, alpha: 1 }];
      if (dimAmount < 1) {
        return [
          { snapshot: standardSnapshot, alpha: 1 - dimAmount },
          { snapshot, alpha: dimAmount },
        ];
      }
    }
  }
  return [{ snapshot, alpha: 1 }];
};
export {
  isFumeBlockOnScreen,
  resolveFumeBlockTiming,
  resolveFumeGlowBases,
  resolveFumeStaticLayers,
};
