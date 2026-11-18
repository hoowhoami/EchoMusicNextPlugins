// The shared worker protocol does not load another style's runtime.
import { createNativeSceneJob } from '../../shared/nativeSceneJob.mjs';
import { createNativeLumiereRuntime } from './runtime-frame.mjs';
import { createNativeLumiereScene } from './scene-frame.mjs';
export const createLumiereSceneJob = (input) =>
  createNativeSceneJob(input, createNativeLumiereRuntime, createNativeLumiereScene, true);
