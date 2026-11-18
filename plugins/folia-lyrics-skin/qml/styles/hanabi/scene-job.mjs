import { createNativeSceneJob } from '../../shared/nativeSceneJob.mjs';
import { createHanabiRuntime } from './runtime-frame.mjs';
export const createHanabiSceneJob = (input) =>
  createNativeSceneJob(input, createHanabiRuntime, createHanabiRuntime);
