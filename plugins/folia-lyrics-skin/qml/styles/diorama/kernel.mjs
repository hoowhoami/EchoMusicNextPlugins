// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
export * from './defaults.mjs';
export * from './cameraPath.mjs';
export * from './dioramaSequencer.mjs';
export * from './dioramaTransition.mjs';
export * from './dioramaGeometry.mjs';
export * from './dioramaMoteField.mjs';
export * from './dioramaParticleModel.mjs';
export * from './dioramaParticleSurfaces.mjs';
export * from './dioramaParticleCorridor.mjs';
export * from './dioramaSceneConstants.mjs';
export * from './dioramaSceneUnits.mjs';
export * from './dioramaKeywordColor.mjs';
export * from './dioramaSceneLayout.mjs';
export * from './dioramaSceneFrame.mjs';
export * from './dioramaParticleMaterials.mjs';
import { DEFAULT_DIORAMA_TUNING } from './defaults.mjs';
import { resolveStoredDioramaTuning } from './tuning.mjs';
function tuning(settings = {}) {
  const input = {};
  for (const key of Object.keys(DEFAULT_DIORAMA_TUNING))
    input[key] = settings['diorama' + key[0].toUpperCase() + key.slice(1)];
  input.geometryVisibility = Object.assign({}, input.geometryVisibility || {});
  for (const key of ['enabled', 'mode', 'strands', 'blobs', 'ribbons', 'rings']) {
    const value = settings['dioramaGeometry' + key[0].toUpperCase() + key.slice(1)];
    value !== void 0 && (input.geometryVisibility[key] = value);
  }
  return resolveStoredDioramaTuning(input);
}
export { tuning };
