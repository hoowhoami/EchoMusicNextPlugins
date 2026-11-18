import { normalizeMachiTuning } from './source/machiTuning.mjs';
export { theme } from '../lumiere/stage.mjs';
export function tuning(settings) {
  const result = {};
  for (const key of [
    'scene',
    'timeOfDay',
    'weather',
    'camera',
    'motion',
    'motionSpeed',
    'aperture',
    'dof',
    'dofRange',
    'tiltShift',
    'focus',
    'focusOffset',
    'simulatedBeat',
  ]) {
    const name = 'machi' + key[0].toUpperCase() + key.slice(1);
    if (settings[name] !== undefined) result[key] = settings[name];
  }
  result.quality = {};
  for (const key of ['renderScale', 'antialias', 'shadows', 'reflections', 'glow', 'adaptive']) {
    const name = 'machiQuality' + key[0].toUpperCase() + key.slice(1);
    if (settings[name] !== undefined) result.quality[key] = settings[name];
  }
  result.views = {};
  for (const scene of ['konbini', 'station', 'kowloon']) {
    const view = {};
    for (const key of ['azimuth', 'elevation', 'zoom', 'panX', 'panZ']) {
      const name =
        'machi' + scene[0].toUpperCase() + scene.slice(1) + key[0].toUpperCase() + key.slice(1);
      if (settings[name] !== undefined) view[key] = settings[name];
    }
    result.views[scene] = view;
  }
  return normalizeMachiTuning(result);
}
