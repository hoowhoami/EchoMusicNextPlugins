// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
const compressedPassResolution = (renderResolution) => Math.min(1, renderResolution);
const resolveTemperaPassResolution = (tuning, renderResolution) =>
  tuning.postProcessTextureCompression ? compressedPassResolution(renderResolution) : 'inherit';
const resolveTemperaTransitionBlurResolution = (tuning, renderResolution) =>
  (tuning.postProcessTextureCompression
    ? compressedPassResolution(renderResolution)
    : renderResolution) * 0.5;
const BLUR_ACTIVE_STRENGTH = 0.01;
const setTemperaTransitionBlur = (scene, strength) => {
  const filter = scene.transitionBlurFilter;
  if (!filter) return;
  const active = strength > BLUR_ACTIVE_STRENGTH;
  if (active) filter.strength = strength;
  if (active === scene.transitionBlurAttached) return;
  scene.transitionBlurAttached = active;
  scene.container.filters = active ? [...scene.baseFilters, filter] : scene.baseFilters;
};
export {
  resolveTemperaPassResolution,
  resolveTemperaTransitionBlurResolution,
  setTemperaTransitionBlur,
};
