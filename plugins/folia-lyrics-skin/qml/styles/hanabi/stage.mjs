import { DEFAULT_HANABI_TUNING } from './source/types.mjs';
import { normalizeHanabiTuning } from './source/hanabiTuning.mjs';
export { theme } from '../lumiere/stage.mjs';
export function tuning(settings) {
  const input = {};
  for (const key of Object.keys(DEFAULT_HANABI_TUNING)) {
    const flat = 'hanabi' + key[0].toUpperCase() + key.slice(1);
    if (settings[flat] !== undefined) input[key] = settings[flat];
  }
  return normalizeHanabiTuning(input);
}
export function geometryTuning(tuning) {
  const result = Object.assign({}, tuning);
  for (const key of ['render', 'sky', 'overlayFrame', 'bloom', 'chorusBloom']) delete result[key];
  return result;
}
