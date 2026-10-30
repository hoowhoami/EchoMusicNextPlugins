// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import * as THREE from './three.mjs';
import {
  buildWordColorRangesFromMatchers,
  prepareWordColorMatchers,
  resolveTokenColorMap,
} from '../tempera/word-colors.mjs';
import { getDioramaParticleContrastRatio as wcagContrastRatio } from './dioramaParticleMaterials.mjs';
const ACTIVE_LINE_OPACITY = 0.92,
  KEYWORD_MIN_BG_CONTRAST = 4.5,
  KEYWORD_MIN_PRIMARY_SEPARATION = 0.4,
  separationFromPrimary = (color, primary) =>
    Math.abs(color.r - primary.r) + Math.abs(color.g - primary.g) + Math.abs(color.b - primary.b),
  asDisplayedText = (color, background) => {
    const src = color.clone().convertLinearToSRGB(),
      dst = background.clone().convertLinearToSRGB(),
      blend = (s, d) => s * ACTIVE_LINE_OPACITY + d * (1 - ACTIVE_LINE_OPACITY);
    return new THREE.Color(
      blend(src.r, dst.r),
      blend(src.g, dst.g),
      blend(src.b, dst.b)
    ).convertSRGBToLinear();
  },
  getDioramaKeywordDisplayedContrastRatio = (color, background) =>
    wcagContrastRatio(asDisplayedText(color, background), background),
  nudgeUntil = (color, target, minimum, measure) => {
    if (measure(color) >= minimum) return color.clone();
    let low = 0,
      high = 1;
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const amount = (low + high) * 0.5;
      measure(color.clone().lerp(target, amount)) >= minimum ? (high = amount) : (low = amount);
    }
    return color.clone().lerp(target, high);
  },
  resolveDioramaKeywordColor = (keyword, primary, accent, background) => {
    const separated = nudgeUntil(keyword, accent, KEYWORD_MIN_PRIMARY_SEPARATION, (candidate) =>
        separationFromPrimary(candidate, primary)
      ),
      lightTarget = new THREE.Color(16777215),
      darkTarget = new THREE.Color(328965),
      pole =
        getDioramaKeywordDisplayedContrastRatio(lightTarget, background) >=
        getDioramaKeywordDisplayedContrastRatio(darkTarget, background)
          ? lightTarget
          : darkTarget;
    return nudgeUntil(separated, pole, KEYWORD_MIN_BG_CONTRAST, (candidate) =>
      getDioramaKeywordDisplayedContrastRatio(candidate, background)
    );
  },
  prepareDioramaKeywordMatchers = (wordColors, enabled) =>
    prepareWordColorMatchers(wordColors, enabled),
  resolveDioramaKeywordUnitColors = (lineText, units, matchers, primary, accent, background) => {
    const resolved = /* @__PURE__ */ new Map();
    if (!lineText || units.length === 0 || matchers.length === 0) return resolved;
    const ranges = buildWordColorRangesFromMatchers(lineText, matchers);
    if (ranges.length === 0) return resolved;
    const colorByKey = resolveTokenColorMap(
        units.map((unit, index) => ({
          key: String(index),
          timed: !0,
          startOffset: unit.charStart,
          endOffset: unit.charEnd,
        })),
        ranges
      ),
      adapted = /* @__PURE__ */ new Map();
    return (
      colorByKey.forEach((hex, key) => {
        let color = adapted.get(hex);
        (color ||
          ((color = resolveDioramaKeywordColor(new THREE.Color(hex), primary, accent, background)),
          adapted.set(hex, color)),
          resolved.set(Number(key), color));
      }),
      resolved
    );
  };
export {
  getDioramaKeywordDisplayedContrastRatio,
  prepareDioramaKeywordMatchers,
  resolveDioramaKeywordColor,
  resolveDioramaKeywordUnitColors,
};
