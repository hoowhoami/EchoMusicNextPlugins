// Derived from Folia a8da4437 (AGPL-3.0-only). See fume-reference.md.
import { resolveThemeFontStack } from '../cadenza/font-stacks.mjs';
import { colorWithAlpha, mixColors } from '../cadenza/color.mjs';
import { clearCanvasTextGlow, fillGlowText, setCanvasTextGlow } from './canvas-glow.mjs';
import {
  clamp,
  easeInOutCubic,
  easeOutCubic,
  isCJK,
  mix,
  resolveDelayedGlowEnvelope,
} from './math.mjs';
import { resolvePrintedGraphemeCount, resolveVisualProgressWithCutoff } from './reveal.mjs';
import { getActiveColor } from './text-style.mjs';
import {
  buildFontSpec,
  resolveRenderLineOffset,
  resolveSegmentGlyphAdvance,
  resolveSegmentGlyphOffset,
} from './text-measure.mjs';
const buildCanvasFont = (block, theme) => {
  const fontFamily = resolveThemeFontStack(theme);
  return buildFontSpec(block.fontPx, block.variant, fontFamily, theme);
};
const buildTextStyleKey = (fillStyle, shadowBlur, shadowColor) =>
  `${fillStyle}|${shadowColor}|${shadowBlur.toFixed(3)}`;
const roundShadowBlur = (px) => (Number.isFinite(px) ? Math.max(0, Math.round(px)) : 0);
const drawRenderTextRun = (context, renderLine, segment, runStart, runEnd, baseX, baseY) => {
  var _a, _b;
  if (!segment.text || runEnd <= runStart) {
    return;
  }
  if (context.fumeTextRange) {
    context.fumeTextRange(renderLine, segment, runStart, runEnd, baseX, baseY);
    return;
  }
  const segmentRunStart = Math.max(runStart - segment.localStart, 0);
  const segmentRunEnd = Math.min(
    runEnd - segment.localStart,
    segment.measuredGlyphOffsets.length - 1
  );
  const clipLeft =
    (_a = segment.measuredGlyphOffsets[segmentRunStart]) != null
      ? _a
      : resolveRenderLineOffset(renderLine, runStart) - segment.x;
  const clipRight =
    (_b = segment.measuredGlyphOffsets[segmentRunEnd]) != null
      ? _b
      : resolveRenderLineOffset(renderLine, runEnd) - segment.x;
  const clipWidth = Math.max(clipRight - clipLeft, 0);
  if (clipWidth <= 0) {
    return;
  }
  context.save();
  context.beginPath();
  context.rect(
    baseX + segment.x + clipLeft,
    baseY - Math.max(clipWidth, 1) - 64,
    clipWidth,
    Math.max(128 + clipWidth * 2, 256)
  );
  context.clip();
  context.fillText(segment.text, baseX + segment.x, baseY);
  context.restore();
};
const drawFumeLiveBlock = (
  context,
  block,
  timing,
  { time, theme, glowIntensity, activeGlowBoost, passedGlowBase, showPrintStamp }
) => {
  var _a, _b, _c, _d, _e;
  const {
    waitingOpacity,
    activeOpacity,
    transitionPassedStyle,
    baselineOffset,
    linePassCutoffTime,
    hasRevealCompleted,
    hasPassCutoffReached,
    lineDuration,
    colorTrailDuration,
  } = timing;
  const printedCount = resolvePrintedGraphemeCount(
    block.line,
    block.wordRanges,
    block.graphemes.length,
    time
  );
  const totalGraphemeCount = block.graphemes.length;
  context.save();
  context.font = buildCanvasFont(block, theme);
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  const isLineActive = time >= block.line.startTime && time <= linePassCutoffTime;
  if (isLineActive) {
    const lineProgress = resolveVisualProgressWithCutoff(
      block.line.startTime,
      lineDuration,
      time,
      linePassCutoffTime
    );
    const lineGlowEnvelope = resolveDelayedGlowEnvelope(lineProgress, 0.8);
    const lineGlowAlpha =
      ((block.variant === 'hero' ? 0.16 : 0.12) +
        lineGlowEnvelope * (block.variant === 'hero' ? 0.26 : 0.2)) *
      glowIntensity;
    const lineGlowBlur =
      ((block.variant === 'hero' ? 12 : 8) +
        lineGlowEnvelope * (block.fontPx * (block.variant === 'hero' ? 0.7 : 0.52))) *
      glowIntensity;
    const lineGlowColor = colorWithAlpha(theme.accentColor, lineGlowAlpha);
    context.save();
    context.fillStyle = lineGlowColor;
    setCanvasTextGlow(
      context,
      roundShadowBlur(lineGlowBlur),
      colorWithAlpha(theme.accentColor, lineGlowAlpha * 1.35)
    );
    for (const renderLine of block.renderLines) {
      const glowBaseX = block.x + renderLine.left;
      const glowBaseY = block.y + renderLine.top + baselineOffset;
      for (const segment of renderLine.segments) {
        if (segment.text.trim().length === 0) {
          continue;
        }
        fillGlowText(context, segment.text, glowBaseX + segment.x, glowBaseY);
      }
    }
    context.restore();
  }
  for (const renderLine of block.renderLines) {
    const baseX = block.x + renderLine.left;
    const baseY = block.y + renderLine.top + baselineOffset;
    for (const segment of renderLine.segments) {
      let runStart = -1;
      let runFillStyle = '';
      let runShadowBlur = 0;
      let runShadowColor = 'transparent';
      let runStyleKey = '';
      const flushRun = (segmentEnd) => {
        if (runStart < 0 || !runStyleKey || segmentEnd <= runStart) {
          return;
        }
        const localStart = runStart - renderLine.start;
        const localEnd = segmentEnd - renderLine.start;
        const runText = renderLine.graphemes.slice(localStart, localEnd).join('');
        if (!runText || (runText.trim().length === 0 && runFillStyle === '')) {
          runStart = -1;
          runStyleKey = '';
          return;
        }
        context.fillStyle = runFillStyle;
        setCanvasTextGlow(context, runShadowBlur, runShadowColor);
        drawRenderTextRun(context, renderLine, segment, localStart, localEnd, baseX, baseY);
        clearCanvasTextGlow(context);
        runStart = -1;
        runStyleKey = '';
      };
      for (let globalOffset = segment.start; globalOffset < segment.end; globalOffset += 1) {
        const graphemeIndex = globalOffset - renderLine.start;
        const grapheme = renderLine.graphemes[graphemeIndex];
        const rangeIndex = (_a = block.wordRangeIndexByOffset[globalOffset]) != null ? _a : -1;
        const range = rangeIndex >= 0 ? block.wordRanges[rangeIndex] : null;
        const colorRangeIndex =
          (_b = block.colorRangeIndexByOffset[globalOffset]) != null ? _b : -1;
        const colorRange = colorRangeIndex >= 0 ? block.wordRanges[colorRangeIndex] : range;
        const isPrinted = hasRevealCompleted || globalOffset < printedCount;
        const isFrontier =
          printedCount > 0 &&
          globalOffset === printedCount &&
          printedCount < totalGraphemeCount &&
          !hasRevealCompleted &&
          !hasPassCutoffReached;
        let alpha = isPrinted ? activeOpacity : isFrontier ? 0.82 : waitingOpacity;
        let shadowBlur = 0;
        let shadowColor = 'transparent';
        let fillStyle = colorWithAlpha(theme.primaryColor, alpha);
        if (range) {
          const wordDuration = Math.max(range.word.endTime - range.word.startTime, 0.08);
          const wordProgress = clamp((time - range.word.startTime) / wordDuration, 0, 1);
          const glyphCount = Math.max(range.end - range.start, 1);
          const glyphIndexInRange = globalOffset - range.start;
          const glyphTiming = ((_c = range.word.syllables) == null ? void 0 : _c.length)
            ? range.graphemeTimings[
                Math.min(glyphIndexInRange, Math.max(range.graphemeTimings.length - 1, 0))
              ]
            : void 0;
          const glyphStartTime =
            (_d = glyphTiming == null ? void 0 : glyphTiming.startTime) != null
              ? _d
              : range.word.startTime + (glyphIndexInRange / glyphCount) * wordDuration;
          const glyphEndTime =
            (_e = glyphTiming == null ? void 0 : glyphTiming.endTime) != null
              ? _e
              : range.word.startTime + ((glyphIndexInRange + 1) / glyphCount) * wordDuration;
          const glyphDuration = Math.max(glyphEndTime - glyphStartTime, 1e-3);
          const glyphProgress = glyphTiming
            ? clamp((time - glyphStartTime) / glyphDuration + 0.16, 0, 1)
            : clamp(wordProgress * glyphCount - glyphIndexInRange + 0.16, 0, 1);
          const easedGlyphProgress = easeOutCubic(glyphProgress);
          const activeColor = getActiveColor(
            (colorRange != null ? colorRange : range).word.text,
            theme
          );
          const glyphTrailStart = glyphStartTime + glyphDuration * 0.18;
          const colorTrailPhase = resolveVisualProgressWithCutoff(
            glyphTrailStart,
            colorTrailDuration,
            time,
            linePassCutoffTime
          );
          const colorTrailProgress = Math.pow(colorTrailPhase, 1.35);
          if (hasPassCutoffReached) {
            alpha = mix(activeOpacity, transitionPassedStyle.opacity, colorTrailProgress);
            fillStyle = mixColors(
              activeColor,
              theme.primaryColor,
              0.18 + colorTrailProgress * 0.82,
              alpha
            );
            shadowBlur =
              (2 + block.fontPx * 0.1) *
              (1 - colorTrailProgress * 0.35) *
              passedGlowBase *
              transitionPassedStyle.glowMultiplier;
            shadowColor = colorWithAlpha(
              mixColors(activeColor, theme.primaryColor, 0.55 + colorTrailProgress * 0.45),
              transitionPassedStyle.shadowAlphaBase +
                (1 - colorTrailProgress) * transitionPassedStyle.shadowAlphaTrail
            );
          } else if (time < range.word.startTime) {
            alpha = waitingOpacity;
            fillStyle = colorWithAlpha(theme.primaryColor, alpha);
          } else if (time <= glyphTrailStart) {
            alpha = mix(waitingOpacity, activeOpacity, easedGlyphProgress);
            fillStyle = mixColors(
              theme.primaryColor,
              activeColor,
              0.22 + easedGlyphProgress * 0.78,
              alpha
            );
            shadowBlur = (4 + block.fontPx * 0.22) * easedGlyphProgress * activeGlowBoost;
            shadowColor = colorWithAlpha(activeColor, 0.4 + easedGlyphProgress * 0.44);
          } else {
            alpha = mix(activeOpacity, transitionPassedStyle.opacity, colorTrailProgress);
            fillStyle = mixColors(
              activeColor,
              theme.primaryColor,
              0.18 + colorTrailProgress * 0.82,
              alpha
            );
            shadowBlur =
              (2 + block.fontPx * 0.1) *
              (1 - colorTrailProgress * 0.35) *
              passedGlowBase *
              transitionPassedStyle.glowMultiplier;
            shadowColor = colorWithAlpha(
              mixColors(activeColor, theme.primaryColor, 0.55 + colorTrailProgress * 0.45),
              transitionPassedStyle.shadowAlphaBase +
                (1 - colorTrailProgress) * transitionPassedStyle.shadowAlphaTrail
            );
          }
          if (showPrintStamp && grapheme.trim().length > 0) {
            const glyphWindowDuration = Math.max(wordDuration / glyphCount, 0.04);
            const activationLeadDuration = clamp(
              Math.min(glyphWindowDuration * 0.86, lineDuration * 0.16),
              0.055,
              block.variant === 'hero' ? 0.2 : 0.16
            );
            const activationReleaseDuration = activationLeadDuration * 0.42;
            const activationWindowStart = glyphTrailStart - activationLeadDuration;
            const activationWindowEnd = glyphTrailStart + activationReleaseDuration;
            const glyphAdvance = resolveSegmentGlyphAdvance(segment, globalOffset);
            const stampProgress = resolveVisualProgressWithCutoff(
              activationWindowStart,
              activationWindowEnd - activationWindowStart,
              time,
              linePassCutoffTime
            );
            if (stampProgress > 0 && stampProgress < 1) {
              const glyphTrailPhase = resolveVisualProgressWithCutoff(
                glyphTrailStart,
                Math.max(activationWindowEnd - glyphTrailStart, 1e-3),
                time,
                linePassCutoffTime
              );
              const isDropping = glyphTrailPhase <= 0;
              const dropProgress = isDropping
                ? easeOutCubic(
                    resolveVisualProgressWithCutoff(
                      activationWindowStart,
                      Math.max(glyphTrailStart - activationWindowStart, 1e-3),
                      time,
                      linePassCutoffTime
                    )
                  )
                : 1;
              const fadeProgress = isDropping ? 0 : easeInOutCubic(glyphTrailPhase);
              const blockPulse = isDropping
                ? mix(0.18, 1, Math.pow(dropProgress, 0.78))
                : Math.pow(1 - fadeProgress, 1.2);
              const glyphVisualWidth = Math.max(
                glyphAdvance * 0.88,
                isCJK(grapheme) ? block.fontPx * 0.56 : block.fontPx * 0.38
              );
              const blockCenterX =
                baseX +
                segment.x +
                resolveSegmentGlyphOffset(segment, globalOffset) +
                glyphAdvance * 0.5;
              const dropDistance = block.lineHeight * (block.variant === 'hero' ? 0.24 : 0.2);
              const activationBlockAlpha = blockPulse * (block.variant === 'hero' ? 0.82 : 0.72);
              const activationBlockWidth =
                glyphVisualWidth + block.fontPx * (block.variant === 'hero' ? 0.18 : 0.12);
              const activationBlockHeight = block.fontPx * (block.variant === 'hero' ? 0.72 : 0.62);
              const activationBlockY =
                baseY - block.fontPx * 0.38 - mix(dropDistance, 0, dropProgress);
              const activationBlockBlur = (8 + block.fontPx * 0.24) * blockPulse * activeGlowBoost;
              if (activationBlockWidth > 0) {
                const blockLeft = blockCenterX - activationBlockWidth * 0.5;
                context.save();
                context.fillStyle = colorWithAlpha(activeColor, activationBlockAlpha);
                context.shadowBlur = activationBlockBlur;
                context.shadowColor = colorWithAlpha(activeColor, 0.56 * blockPulse);
                context.fillRect(
                  blockLeft,
                  activationBlockY - activationBlockHeight * 0.5,
                  activationBlockWidth,
                  activationBlockHeight
                );
                context.restore();
              }
            }
          }
        }
        if (alpha <= 2e-3) {
          flushRun(globalOffset);
          continue;
        }
        shadowBlur = roundShadowBlur(shadowBlur);
        const styleKey = buildTextStyleKey(fillStyle, shadowBlur, shadowColor);
        if (runStart < 0) {
          runStart = globalOffset;
          runFillStyle = fillStyle;
          runShadowBlur = shadowBlur;
          runShadowColor = shadowColor;
          runStyleKey = styleKey;
          continue;
        }
        if (styleKey !== runStyleKey) {
          flushRun(globalOffset);
          runStart = globalOffset;
          runFillStyle = fillStyle;
          runShadowBlur = shadowBlur;
          runShadowColor = shadowColor;
          runStyleKey = styleKey;
        }
      }
      flushRun(segment.end);
    }
  }
  context.restore();
};
export { buildCanvasFont, buildTextStyleKey, drawFumeLiveBlock, drawRenderTextRun };
