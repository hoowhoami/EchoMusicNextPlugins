// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty,
  __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty,
  __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
      : (obj[key] = value),
  __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  },
  __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { flat } from './compat.mjs';
import { codePoints } from '../../shared/text/codepoints.mjs';
import { layoutWithLines, prepareWithSegments } from './pretext.mjs';
import {
  findSonnetHeroSegmentIndex,
  findSonnetSemiHeroSegmentIndices,
  getSonnetVisibleSegmentLength,
  resolveSonnetRoleFontWeight,
  scoreSonnetHeroSegment,
} from './sonnetTypographyRoles.mjs';
import { layoutSonnetPosterBlocks } from './sonnetPosterBlocksLayout.mjs';
import {
  layoutCrossStack,
  layoutEditorialColumn,
  layoutFragmentCollage,
  layoutQuietTableau,
  layoutTrackingRibbon,
  resolveSonnetFlowGaps,
} from './sonnetShotFlowLayouts.mjs';
import { hashSonnetSeed } from './sonnetRandom.mjs';
import {
  findSonnetHeroSegmentIndex as findSonnetHeroSegmentIndex2,
  findSonnetSemiHeroSegmentIndex as findSonnetSemiHeroSegmentIndex2,
  findSonnetSemiHeroSegmentIndices as findSonnetSemiHeroSegmentIndices2,
  isSonnetEmphasisRole,
} from './sonnetTypographyRoles.mjs';
const isSonnetLayoutSegment = (segment) => segment.text.trim().length > 0,
  CJK_TEXT = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/u,
  shouldRotateNonCjkSegment = (segment, vertical) =>
    vertical &&
    segment.graphemes.filter((item) => item.char.trim().length > 0).length > 1 &&
    !CJK_TEXT.test(segment.text),
  verticalText = (segment) =>
    (segment.graphemes.length
      ? segment.graphemes.map((item) => item.char)
      : codePoints(segment.text)
    ).join(`
`),
  MEASURE_CACHE_LIMIT = 2e4,
  measureCache = /* @__PURE__ */ new Map(),
  measureText = (text, fontSpec, fontSize) => {
    var _a, _b;
    const key = `${fontSpec}|${fontSize}|${text}`,
      cached = measureCache.get(key);
    if (cached !== void 0) return cached;
    let width;
    try {
      width =
        (_b =
          (_a = layoutWithLines(prepareWithSegments(text || ' ', fontSpec), 99999, fontSize * 1.2)
            .lines[0]) == null
            ? void 0
            : _a.width) != null
          ? _b
          : text.length * fontSize * 0.6;
    } catch (error) {
      throw error;
    }
    if (measureCache.size >= MEASURE_CACHE_LIMIT) {
      const oldest = measureCache.keys().next();
      oldest.done || measureCache.delete(oldest.value);
    }
    return (measureCache.set(key, width), width);
  },
  resolveSonnetTypographyLayout = ({
    lines,
    shotKind,
    paragraphKind,
    width,
    height,
    baseFontSize,
    fontFamily,
    fontWeight,
  }) => {
    var _a;
    const segments = flat(lines);
    let offset = 0;
    const heroIndices = [],
      semiHeroIndices = [];
    lines.forEach((lineSegs) => {
      const localHero = findSonnetHeroSegmentIndex(lineSegs),
        globalHero = offset + localHero,
        localSemiHeroes = findSonnetSemiHeroSegmentIndices(lineSegs, localHero);
      (heroIndices.push(globalHero),
        localSemiHeroes.forEach((localSemiHero) => semiHeroIndices.push(offset + localSemiHero)),
        (offset += lineSegs.length));
    });
    const heroIndex = findSonnetHeroSegmentIndex(segments),
      midpoints = segments.map((segment) => (segment.startTime + segment.endTime) / 2),
      timelineStart = Math.min(...midpoints),
      timelineDuration = Math.max(...midpoints) - timelineStart,
      phases = midpoints.map((midpoint, index) =>
        timelineDuration > 1e-3
          ? (midpoint - timelineStart) / timelineDuration
          : index / Math.max(1, segments.length - 1)
      ),
      heroPhase = (_a = phases[heroIndex]) != null ? _a : 0.5,
      layoutVariantSeed =
        segments.reduce((acc, seg) => acc + (seg.text.trim().length || 1), 0) + segments.length,
      posterLayoutSeed = hashSonnetSeed(segments.map((segment) => segment.text).join('\u241F'));
    let editorialVariant = layoutVariantSeed % 5;
    const ribbonVariant = layoutVariantSeed % 3,
      tableauVariant = layoutVariantSeed % 4,
      collageVariant = layoutVariantSeed % 3;
    let secondaryHeroIndex = -1;
    if (editorialVariant === 3 && segments.length > 2) {
      let bestScore = -1 / 0;
      (segments.forEach((segment, index) => {
        if (
          index === heroIndex ||
          !segment.isWordLike ||
          getSonnetVisibleSegmentLength(segment) === 0
        )
          return;
        const distanceBonus = Math.abs(index - heroIndex) > 1 ? 50 : 0,
          score = scoreSonnetHeroSegment(segment) + distanceBonus;
        score > bestScore && ((bestScore = score), (secondaryHeroIndex = index));
      }),
        secondaryHeroIndex === -1 && (editorialVariant = 0));
    } else
      editorialVariant === 3
        ? (editorialVariant = 0)
        : editorialVariant === 4 && segments.length < 2 && (editorialVariant = 2);
    const boxes = segments.map((segment, index) => {
        const isHero =
            heroIndices.includes(index) ||
            (index === secondaryHeroIndex &&
              shotKind === 'editorial-column' &&
              editorialVariant === 3),
          isSemiHero = semiHeroIndices.includes(index) && !isHero,
          isEmphasized = isHero || isSemiHero;
        let heroFontScale = 1,
          supportFontScale = 1,
          vertical = !1,
          rotation = 0;
        switch (shotKind) {
          case 'editorial-column':
            editorialVariant === 3
              ? ((heroFontScale = 3.8), (supportFontScale = 1.3), (vertical = !1))
              : editorialVariant === 4
                ? ((heroFontScale = 4.2), (supportFontScale = 1.25), (vertical = isEmphasized))
                : ((heroFontScale = editorialVariant === 2 ? 3.2 : 4),
                  (supportFontScale = 1.2),
                  (vertical = isEmphasized && editorialVariant !== 2));
            break;
          case 'type-impact':
            ((heroFontScale = 5.5), (supportFontScale = 1.5));
            break;
          case 'fragment-collage':
            ((heroFontScale = 3.2),
              (supportFontScale = 1.35),
              (vertical = isSemiHero || index % 4 === 0));
            break;
          case 'tracking-ribbon':
            ((heroFontScale = 3.5), (supportFontScale = 1.5));
            break;
          case 'mask-reveal':
            ((heroFontScale = 4.5), (supportFontScale = 1.6), (vertical = isEmphasized));
            break;
          case 'poster-blocks':
            ((heroFontScale = 4.4), (supportFontScale = 1.15));
            break;
          default:
            ((heroFontScale = 3),
              (supportFontScale = 1.15),
              (vertical = isEmphasized && (tableauVariant === 0 || tableauVariant === 1)));
            break;
        }
        let fontScale = isHero
          ? heroFontScale
          : isSemiHero
            ? Math.max(supportFontScale * 1.35, heroFontScale * 0.72)
            : supportFontScale;
        const rotatesNonCjkSegment = shouldRotateNonCjkSegment(segment, vertical);
        rotatesNonCjkSegment && ((vertical = !1), (rotation += Math.PI / 2));
        const displayText = vertical ? verticalText(segment) : segment.text,
          renderWeight = resolveSonnetRoleFontWeight(
            fontWeight,
            isHero ? 'hero' : isSemiHero ? 'semi-hero' : 'support'
          );
        let targetFontSize = baseFontSize * fontScale;
        const fontSpec = `${renderWeight} ${targetFontSize}px ${fontFamily}`,
          horizontalAdvance = rotatesNonCjkSegment
            ? segment.graphemes.reduce(
                (sum, item) =>
                  item.char.trim().length > 0
                    ? sum +
                      Math.max(
                        targetFontSize * 0.2,
                        measureText(item.char, fontSpec, targetFontSize)
                      )
                    : sum,
                0
              )
            : measureText(displayText, fontSpec, targetFontSize);
        let measuredWidth = rotatesNonCjkSegment ? targetFontSize * 1.2 : horizontalAdvance,
          measuredHeight = rotatesNonCjkSegment ? horizontalAdvance : targetFontSize * 1.2;
        if (vertical) {
          const columnChars = segment.graphemes.length
              ? segment.graphemes.map((item) => item.char)
              : codePoints(segment.text),
            glyphAdvances = columnChars
              .filter((char) => char.trim().length > 0)
              .map((char) =>
                Math.max(targetFontSize * 0.2, measureText(char, fontSpec, targetFontSize))
              );
          ((measuredWidth = glyphAdvances.length ? Math.max(...glyphAdvances) : targetFontSize),
            (measuredHeight = Math.max(1, columnChars.length) * targetFontSize * 0.9));
        }
        const maxW = width * 0.82,
          maxH = height * 0.82;
        let fitScale = 1;
        (measuredWidth > maxW && (fitScale = Math.min(fitScale, maxW / measuredWidth)),
          measuredHeight > maxH && (fitScale = Math.min(fitScale, maxH / measuredHeight)),
          fitScale < 1 &&
            ((targetFontSize *= fitScale),
            (fontScale *= fitScale),
            (measuredWidth *= fitScale),
            (measuredHeight *= fitScale)));
        let posterVerticalDisplayText,
          posterVerticalMeasuredWidth,
          posterVerticalMeasuredHeight,
          posterVerticalFontScale;
        if (shotKind === 'poster-blocks' && CJK_TEXT.test(segment.text)) {
          const columnChars = segment.graphemes.length
              ? segment.graphemes.map((item) => item.char)
              : codePoints(segment.text),
            glyphAdvances = columnChars
              .filter((char) => char.trim().length > 0)
              .map((char) =>
                Math.max(targetFontSize * 0.2, measureText(char, fontSpec, targetFontSize))
              );
          let columnWidth = glyphAdvances.length ? Math.max(...glyphAdvances) : targetFontSize,
            columnHeight = Math.max(1, columnChars.length) * targetFontSize * 0.9;
          const verticalFit = Math.min(1, maxW / columnWidth, maxH / columnHeight);
          ((columnWidth *= verticalFit),
            (columnHeight *= verticalFit),
            (posterVerticalDisplayText = verticalText(segment)),
            (posterVerticalMeasuredWidth = columnWidth),
            (posterVerticalMeasuredHeight = columnHeight),
            (posterVerticalFontScale = fontScale * verticalFit));
        }
        return {
          index,
          isHero,
          isSemiHero,
          displayText,
          verticalDisplayText: posterVerticalDisplayText,
          verticalMeasuredWidth: posterVerticalMeasuredWidth,
          verticalMeasuredHeight: posterVerticalMeasuredHeight,
          verticalFontScale: posterVerticalFontScale,
          fontScale,
          vertical,
          layoutDirection: 'horizontal',
          rotation,
          measuredWidth,
          measuredHeight,
          timingPhase: phases[index],
          relativePhase: phases[index] - heroPhase,
          role: void 0,
          x: 0,
          y: 0,
          enterX: 0,
          enterY: 0,
        };
      }),
      heroBox = boxes[heroIndex];
    if (heroBox) {
      if (shotKind === 'poster-blocks')
        layoutSonnetPosterBlocks(boxes, width, height, baseFontSize, posterLayoutSeed);
      else {
        const { flowGap, stackGap } = resolveSonnetFlowGaps(baseFontSize),
          flowCtx = { boxes, heroIndex, width, height, flowGap, stackGap };
        shotKind === 'quiet-tableau'
          ? layoutQuietTableau(flowCtx, tableauVariant)
          : shotKind === 'tracking-ribbon'
            ? layoutTrackingRibbon(flowCtx, ribbonVariant)
            : shotKind === 'editorial-column'
              ? layoutEditorialColumn(flowCtx, editorialVariant, secondaryHeroIndex)
              : shotKind === 'fragment-collage'
                ? layoutFragmentCollage(flowCtx, collageVariant)
                : layoutCrossStack(flowCtx);
      }
      ((heroBox.enterX = 0), (heroBox.enterY = height * 0.15));
      const decorations = [];
      if (shotKind !== 'quiet-tableau' && shotKind !== 'poster-blocks') {
        const allHeroes = boxes.filter((b) => b.isHero);
        if (
          (allHeroes.forEach((hBox, idx) => {
            decorations.push(
              __spreadProps(__spreadValues({}, hBox), {
                isHero: !1,
                role: 'decoration',
                fontScale: Math.max(2.8, Math.min(hBox.fontScale * 3.5, 5.5)),
                vertical: !1,
                x: hBox.x - width * (0.1 - idx * 0.03),
                y: hBox.y - height * (0.05 - idx * 0.02),
                rotation: -0.15 + (idx % 2 === 0 ? 0 : 0.05),
                enterX: -width * 0.05,
                enterY: -height * 0.05,
              })
            );
          }),
          boxes.length > 1 && allHeroes.length > 0)
        ) {
          const dec2 = boxes[boxes.length - 1].isHero ? boxes[0] : boxes[boxes.length - 1];
          decorations.push(
            __spreadProps(__spreadValues({}, dec2), {
              isHero: !1,
              role: 'decoration',
              fontScale: Math.max(1.8, Math.min(allHeroes[0].fontScale * 2.2, 3.5)),
              vertical: !1,
              x: allHeroes[0].x + width * 0.25,
              y: allHeroes[0].y + height * 0.15,
              rotation: 0.08,
              enterX: width * 0.05,
              enterY: height * 0.05,
            })
          );
        }
      }
      boxes.unshift(...decorations);
    }
    return boxes.map((box) => ({
      segmentIndex: box.index,
      displayText: box.displayText,
      role: box.role || (box.isHero ? 'hero' : box.isSemiHero ? 'semi-hero' : 'support'),
      fontScale: box.fontScale,
      measuredWidth: box.measuredWidth,
      measuredHeight: box.measuredHeight,
      x: box.x,
      y: box.y,
      rotation: box.rotation,
      enterX: box.enterX,
      enterY: box.enterY,
      vertical: box.vertical,
      layoutDirection: box.layoutDirection,
      timingPhase: box.timingPhase,
    }));
  },
  clearLayoutMeasurements = () => measureCache.clear();
export {
  clearLayoutMeasurements,
  findSonnetHeroSegmentIndex2 as findSonnetHeroSegmentIndex,
  findSonnetSemiHeroSegmentIndex2 as findSonnetSemiHeroSegmentIndex,
  findSonnetSemiHeroSegmentIndices2 as findSonnetSemiHeroSegmentIndices,
  isSonnetEmphasisRole,
  isSonnetLayoutSegment,
  measureText,
  resolveSonnetTypographyLayout,
};
