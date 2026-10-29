// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
const DEFAULT_LUMIERE_SCENE_TUNING = {
  lightIntensity: 1,
  audioResponse: 1,
  fogDensity: 1,
  darkField: 0.75,
  moteAmount: 1,
  bloom: 1,
  textBloom: 1,
  unlitOpacity: 0.22,
  windowNeighbors: 2,
  decay: 1,
  echo: 1,
  fogOctaves: 5,
  lineArt: true,
  frontBokeh: true,
  overlayFrame: true,
  trails: false,
  hideTrails: false,
  textOnly: false,
  keywordColors: true,
  themeIcons: true,
  themeColorMix: 0.3,
};
const LUMIERE_BLOOM = {
  // 图形组阈值高一些：只让光源与光柱芯发晕，光柱本身不再被抬亮，文字在光里才压得住。
  graphics: { strength: 1.5, threshold: 0.42, knee: 0.3, levels: 6, spread: 0.9 },
  // 文字组：原来的 1.9 × 调试时试出的 0.6（可读性最好）。
  text: { strength: 1.15, threshold: 0.12, knee: 0.2, levels: 5, spread: 0.95 },
};
export { DEFAULT_LUMIERE_SCENE_TUNING, LUMIERE_BLOOM };
