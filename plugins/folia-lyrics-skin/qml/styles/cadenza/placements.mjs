// Generated from Folia a8da4437 (AGPL-3.0-only). See cadenza-reference.md.
import { flatMap } from './compat.mjs';
import { clamp, isCJK, splitGraphemes } from './envelopes.mjs';
const buildEmphasisMap = (lineData, isInterlude) => {
  const emphasisMap = /* @__PURE__ */ new Map();
  if (isInterlude) {
    return emphasisMap;
  }
  const primaryFragments = flatMap(lineData, (lineView) => lineView.fragments).filter(
    (fragment) => fragment.isPrimaryFragment
  );
  const candidates = primaryFragments
    .filter((fragment) => !fragment.isSplitAcrossLines && fragment.text.trim().length > 0)
    .map((fragment) => {
      const graphemeCount = Math.max(
        fragment.wordGraphemeCount,
        splitGraphemes(fragment.word.text).length,
        1
      );
      const semanticWeight = isCJK(fragment.word.text)
        ? 0.18
        : Math.min(graphemeCount * 0.08, 0.36);
      const centerBias =
        1 -
        Math.abs(fragment.wordIndex - (primaryFragments.length - 1) / 2) /
          Math.max(primaryFragments.length, 1);
      return {
        fragment,
        score: semanticWeight + centerBias * 0.18,
      };
    })
    .sort((a, b) => b.score - a.score);
  const hero = candidates[0];
  if (hero) {
    const scoreBoost = 1 + clamp(hero.score - 0.48, 0, 0.52);
    emphasisMap.set(hero.fragment.wordIndex, 1.46 * scoreBoost);
  }
  return emphasisMap;
};
const buildWordPlacements = (
  lineData,
  fontPx,
  lineHeight,
  maxWidth,
  animationIntensity,
  seed,
  isInterlude
) => {
  var _a, _b, _c;
  const totalHeight = Math.max(lineData.length, 1) * lineHeight;
  const baseMargin = animationIntensity === 'calm' ? 4 : 6;
  const baseScale =
    animationIntensity === 'chaotic' ? 1.02 : animationIntensity === 'calm' ? 1 : 1.01;
  const emphasisMap = buildEmphasisMap(lineData, isInterlude);
  const heroWordIndex =
    (_b =
      (_a = [...emphasisMap.entries()].sort((a, b) => b[1] - a[1])[0]) == null ? void 0 : _a[0]) !=
    null
      ? _b
      : null;
  const placements = [];
  const occupiedRects = [];
  const occupiedBands = /* @__PURE__ */ new Map();
  const occupiedMarks = [];
  let occupiedQueryStamp = 0;
  const collisionBandSize = Math.max(24, Math.round(lineHeight * 0.9));
  const getBandIndex = (value) => Math.floor(value / collisionBandSize);
  const registerOccupiedRect = (rect) => {
    const rectIndex = occupiedRects.length;
    occupiedRects.push(rect);
    const startBand = getBandIndex(rect.top);
    const endBand = getBandIndex(rect.bottom);
    for (let band = startBand; band <= endBand; band++) {
      const bucket = occupiedBands.get(band);
      if (bucket) {
        bucket.push(rectIndex);
      } else {
        occupiedBands.set(band, [rectIndex]);
      }
    }
  };
  const evaluateCollisionRect = (left, top, right, bottom) => {
    if (occupiedRects.length === 0) {
      return {
        intersects: false,
        overlapArea: 0,
      };
    }
    occupiedQueryStamp += 1;
    const stamp = occupiedQueryStamp;
    const startBand = getBandIndex(top);
    const endBand = getBandIndex(bottom);
    let intersects = false;
    let overlapArea = 0;
    for (let band = startBand; band <= endBand; band++) {
      const bucket = occupiedBands.get(band);
      if (!bucket) continue;
      for (let bucketIndex = 0; bucketIndex < bucket.length; bucketIndex++) {
        const rectIndex = bucket[bucketIndex];
        if (occupiedMarks[rectIndex] === stamp) {
          continue;
        }
        occupiedMarks[rectIndex] = stamp;
        const rect = occupiedRects[rectIndex];
        const overlapWidth = Math.max(0, Math.min(right, rect.right) - Math.max(left, rect.left));
        const overlapHeight = Math.max(0, Math.min(bottom, rect.bottom) - Math.max(top, rect.top));
        if (overlapWidth <= 0 || overlapHeight <= 0) {
          continue;
        }
        intersects = true;
        overlapArea += overlapWidth * overlapHeight;
      }
    }
    return {
      intersects,
      overlapArea,
    };
  };
  const pushPlacementRect = (left, top, width, height, padding) => {
    registerOccupiedRect({
      left: left - padding,
      top: top - height - padding,
      right: left + width + padding,
      bottom: top + padding,
    });
  };
  const placementPlans = flatMap(lineData, (lineView, lineIndex) => {
    const lineLeft = -lineView.line.width / 2;
    const baselineY = -totalHeight / 2 + fontPx + lineIndex * lineHeight;
    return lineView.fragments.map((fragment, fragmentIndex) => {
      var _a2;
      const emphasis = (_a2 = emphasisMap.get(fragment.wordIndex)) != null ? _a2 : 1;
      const width = Math.max(fragment.endX - fragment.startX, fontPx * 0.18);
      const scale = emphasis > 1 ? baseScale * emphasis : baseScale;
      const height = fontPx * scale * 0.95;
      return {
        fragment,
        lineIndex,
        fragmentIndex,
        baseX: lineLeft + fragment.startX,
        baseY: baselineY,
        emphasis,
        width,
        height,
        scale,
        collisionWidth: width * scale * (emphasis > 1 ? 1.48 : 1.26),
        collisionHeight: height * (emphasis > 1 ? 1.36 : 1.24),
        padding: baseMargin + (emphasis > 1 ? 10 : 2),
      };
    });
  }).sort((a, b) => {
    const emphasisDelta = b.emphasis - a.emphasis;
    if (Math.abs(emphasisDelta) > 1e-3) {
      return emphasisDelta;
    }
    if (a.lineIndex !== b.lineIndex) {
      return a.lineIndex - b.lineIndex;
    }
    return a.fragment.startX - b.fragment.startX;
  });
  const primaryPlanByWordIndex = /* @__PURE__ */ new Map();
  placementPlans.forEach((plan) => {
    if (!primaryPlanByWordIndex.has(plan.fragment.wordIndex)) {
      primaryPlanByWordIndex.set(plan.fragment.wordIndex, plan);
    }
  });
  const heroPlan =
    heroWordIndex === null
      ? null
      : (_c = primaryPlanByWordIndex.get(heroWordIndex)) != null
        ? _c
        : null;
  const heroMetrics = heroPlan
    ? {
        centerX: (heroPlan.width * heroPlan.scale) / 2,
        centerY: -heroPlan.height * 0.46,
        width: heroPlan.width * heroPlan.scale,
      }
    : null;
  placementPlans.forEach((plan) => {
    const {
      fragment,
      lineIndex,
      fragmentIndex,
      emphasis,
      width,
      height,
      scale,
      collisionWidth,
      collisionHeight,
      padding,
    } = plan;
    const wordSeed = seed + fragment.wordIndex * 17 + lineIndex * 31 + fragmentIndex * 13;
    const random = (offset) => {
      const x = Math.sin(wordSeed + offset) * 1e4;
      return x - Math.floor(x);
    };
    const rotate = 0;
    const passedRotate = (random(3) - 0.5) * (animationIntensity === 'chaotic' ? 20 : 12);
    const entryOffsetX = 0;
    const entryOffsetY = 0;
    const step = Math.max(10, Math.round(fontPx * 0.14));
    const maxRadius =
      emphasis > 1
        ? Math.max(20, lineHeight * 0.5)
        : Math.max(lineHeight * 2.2, collisionWidth * 0.75, 56);
    let preferredX = emphasis > 1 ? -width / 2 : plan.baseX;
    let preferredY = emphasis > 1 ? 0 : plan.baseY;
    if (!isInterlude && emphasis <= 1 && heroMetrics) {
      const wordCenterX = preferredX + width / 2;
      const wordCenterY = preferredY - height * 0.46;
      let dx = wordCenterX - heroMetrics.centerX;
      let dy = wordCenterY - heroMetrics.centerY;
      const distance = Math.hypot(dx, dy);
      if (distance < 1) {
        dx = preferredX >= 0 ? 1 : -1;
        dy = lineIndex % 2 === 0 ? -0.65 : 0.65;
      }
      const minHeroSeparation = heroMetrics.width * 0.34 + width * 0.52 + padding * 2;
      if (distance < minHeroSeparation) {
        const normalizedDistance = Math.max(Math.hypot(dx, dy), 1);
        const ux = dx / normalizedDistance;
        const uy = dy / normalizedDistance;
        const push = minHeroSeparation - distance;
        preferredX += ux * push;
        preferredY += uy * push * 0.92;
      }
    }
    const horizontalMin = -maxWidth / 2 - 72;
    const horizontalMax = maxWidth / 2 + 72;
    const verticalMin = -Math.max(totalHeight * 0.9, lineHeight * 1.6);
    const verticalMax = Math.max(totalHeight * 0.9, lineHeight * 1.45);
    let chosenX = preferredX;
    let chosenY = preferredY;
    let found = false;
    let bestFallback = {
      x: preferredX,
      y: preferredY,
      score: Number.POSITIVE_INFINITY,
    };
    const baseAngle =
      heroMetrics && emphasis <= 1 ? Math.atan2(preferredY, preferredX + width / 2) : 0;
    for (let radius = 0; radius <= maxRadius && !found; radius += step) {
      const sampleCount =
        radius === 0
          ? 1
          : emphasis > 1
            ? 8
            : Math.max(12, Math.round((Math.PI * 2 * radius) / Math.max(step * 1.1, 10)));
      const candidates =
        radius === 0
          ? [[0, 0]]
          : Array.from({ length: sampleCount }, (_, sampleIndex) => {
              const angle = baseAngle + (sampleIndex / sampleCount) * Math.PI * 2;
              const ellipseY = radius * (emphasis > 1 ? 0.8 : 0.92);
              return [Math.cos(angle) * radius, Math.sin(angle) * ellipseY];
            });
      for (const [dx, dy] of candidates) {
        const left = preferredX + dx - padding;
        const top = preferredY + dy - collisionHeight - padding;
        const right = left + collisionWidth + padding * 2;
        const bottom = top + collisionHeight + padding * 2;
        const withinBounds =
          left >= horizontalMin &&
          right <= horizontalMax &&
          top >= verticalMin &&
          bottom <= verticalMax;
        if (!withinBounds) {
          continue;
        }
        const collision = evaluateCollisionRect(left, top, right, bottom);
        const travel = Math.hypot(dx, dy);
        const score = collision.overlapArea * 2.2 + travel;
        if (score < bestFallback.score) {
          bestFallback = {
            x: preferredX + dx,
            y: preferredY + dy,
            score,
          };
        }
        if (!collision.intersects) {
          chosenX = preferredX + dx;
          chosenY = preferredY + dy;
          pushPlacementRect(chosenX, chosenY, collisionWidth, collisionHeight, padding);
          found = true;
          break;
        }
      }
    }
    if (!found) {
      chosenX = bestFallback.x;
      chosenY = bestFallback.y;
      pushPlacementRect(chosenX, chosenY, collisionWidth, collisionHeight, padding);
    }
    const outwardX = chosenX + width / 2;
    const outwardY = chosenY - height * 0.46;
    const outwardLength = Math.max(Math.hypot(outwardX, outwardY), 1);
    const outwardUnitX = outwardX / outwardLength;
    const outwardUnitY = outwardY / outwardLength;
    const driftAmount = isInterlude
      ? 3 + random(6) * 3
      : emphasis > 1
        ? 4 + random(6) * 4
        : animationIntensity === 'chaotic'
          ? 8 + random(6) * 9
          : 5 + random(6) * 6;
    const passedDriftX = outwardUnitX * driftAmount + (random(7) - 0.5) * 2.4;
    const passedDriftY = outwardUnitY * driftAmount * 0.72 + (random(8) - 0.5) * 2;
    placements.push({
      id: `${fragment.word.text}-${fragment.wordIndex}-${lineIndex}-${fragmentIndex}-${fragment.fragmentIndexInWord}`,
      wordIndex: fragment.wordIndex,
      word: fragment.word,
      text: fragment.text,
      color: fragment.color,
      x: chosenX,
      y: chosenY,
      width,
      height,
      rotate,
      scale,
      passedRotate,
      passedDriftX,
      passedDriftY,
      entryOffsetX,
      entryOffsetY,
      fragmentStartInWord: fragment.fragmentStartInWord,
      fragmentEndInWord: fragment.fragmentEndInWord,
      wordGraphemeCount: fragment.wordGraphemeCount,
      wordGraphemeTimings: fragment.wordGraphemeTimings,
      emphasis,
      isInterlude,
    });
  });
  return placements;
};
export { buildWordPlacements };
