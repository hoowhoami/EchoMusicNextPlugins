// Folia a8da4437 / Paper0.0.80. See nomand-reference.md.
import { defaults, resolveStoredNomandBackgroundTuning } from './tuning.mjs';
export * from './adjustments.mjs';
import { profile } from './source-layer.mjs';
import { resolveNomandSourceUrl } from './source-layer.mjs';
function resolveSourceUrl(cover, uploaded, tuning2) {
  return resolveNomandSourceUrl(cover, uploaded ? { url: uploaded } : null, tuning2);
}
function tuning(settings = {}) {
  const input = {};
  for (const key of Object.keys(defaults))
    input[key] = settings['nomand' + key[0].toUpperCase() + key.slice(1)];
  return resolveStoredNomandBackgroundTuning(input);
}
function pixelBudget(width, height, dpr) {
  if (!(width > 0 && height > 0)) return { width: 1, height: 1, pixelRatio: 1 };
  const w = Math.max(1, Math.round(width)),
    h = Math.max(1, Math.round(height)),
    ratio = Math.max(1, dpr),
    correction = Math.min(1, Math.sqrt(1920 * 1080) / Math.sqrt(w * h * ratio * ratio)),
    pw = Math.max(1, Math.round(w * ratio * correction));
  return { width: pw, height: Math.max(1, Math.round(h * ratio * correction)), pixelRatio: pw / w };
}
export { defaults, pixelBudget, profile, resolveSourceUrl, tuning };
