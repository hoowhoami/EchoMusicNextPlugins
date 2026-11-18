// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { DEFAULT_LUMIERE_TUNING } from './app-defaults.mjs';
const clampNumber = (value, fallback, min, max) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
const pickBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const RENDER_QUALITIES = ['full', 'balanced', 'low'];
const normalizeLumiereTuning = (value) => {
  const raw = value && typeof value === 'object' ? value : {};
  const d = DEFAULT_LUMIERE_TUNING;
  const fogOctaves = clampNumber(raw.fogOctaves, d.fogOctaves, 2, 6);
  return {
    lightIntensity: clampNumber(raw.lightIntensity, d.lightIntensity, 0.3, 2),
    audioResponse: clampNumber(raw.audioResponse, d.audioResponse, 0, 2),
    fogDensity: clampNumber(raw.fogDensity, d.fogDensity, 0, 2),
    darkField: clampNumber(raw.darkField, d.darkField, 0, 1),
    moteAmount: clampNumber(raw.moteAmount, d.moteAmount, 0, 2),
    bloom: clampNumber(raw.bloom, d.bloom, 0, 2),
    textBloom: clampNumber(raw.textBloom, d.textBloom, 0, 2),
    unlitOpacity: clampNumber(raw.unlitOpacity, d.unlitOpacity, 0.05, 0.6),
    windowNeighbors:
      raw.windowNeighbors === 1 || raw.windowNeighbors === 2
        ? raw.windowNeighbors
        : d.windowNeighbors,
    decay: clampNumber(raw.decay, d.decay, 0, 2),
    echo: clampNumber(raw.echo, d.echo, 0, 2),
    fogOctaves: Math.round(fogOctaves),
    lineArt: pickBoolean(raw.lineArt, d.lineArt),
    frontBokeh: pickBoolean(raw.frontBokeh, d.frontBokeh),
    trails: pickBoolean(raw.trails, d.trails),
    hideTrails: pickBoolean(raw.hideTrails, d.hideTrails),
    seamlessTransitions: pickBoolean(raw.seamlessTransitions, d.seamlessTransitions),
    overlayFrame: pickBoolean(raw.overlayFrame, d.overlayFrame),
    textOnly: pickBoolean(raw.textOnly, d.textOnly),
    keywordColors: pickBoolean(raw.keywordColors, d.keywordColors),
    themeIcons: pickBoolean(raw.themeIcons, d.themeIcons),
    themeColorMix: clampNumber(raw.themeColorMix, d.themeColorMix, 0, 1),
    renderQuality: RENDER_QUALITIES.includes(raw.renderQuality)
      ? raw.renderQuality
      : d.renderQuality,
  };
};
export { normalizeLumiereTuning };
