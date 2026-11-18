import { DEFAULT_NEBBIA_TUNING } from './source/types.mjs';
import { normalizeNebbiaTuning } from './source/tuning.mjs';
export { theme } from '../lumiere/stage.mjs';
export function tuning(settings) {
  const input = {};
  for (const key of Object.keys(DEFAULT_NEBBIA_TUNING)) {
    const flat = 'nebbia' + key[0].toUpperCase() + key.slice(1);
    if (settings[flat] !== undefined) input[key] = settings[flat];
  }
  return normalizeNebbiaTuning(input);
}
