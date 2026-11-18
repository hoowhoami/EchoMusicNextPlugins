import * as Native from '../lumiere/native-measure.mjs';
import { createNativeSceneJob } from '../../shared/nativeSceneJob.mjs';
import { createNativeMachiRuntime } from './runtime-factory.mjs';
import { createMachiFrameEncoder } from './frame-encoder.mjs';
import { configureNativePixels } from './environment.mjs';
import { layoutMachiBoardLine } from './source/engine/boardLayout.mjs';
import { resolveMachiBoardTarget } from './source/engine/director.mjs';
let nextSceneEpoch = 0;
function create(options) {
  configureNativePixels([]);
  const sceneEpoch = ++nextSceneEpoch;
  const scene = createNativeMachiRuntime(options),
    encoder = createMachiFrameEncoder();
  let preparedWindow = -1;
  return {
    frame(time, parameters) {
      // Discover exact source measurements ahead of playback in bounded windows.
      // Otherwise a long preparation can chase each newly playing lyric forever.
      const target = resolveMachiBoardTarget(options.program || [], time);
      const window = Math.floor((target.kind === 'line' ? target.index : 0) / 64);
      if (preparedWindow !== window) {
        const screen = scene.runtime.stage.signs.screen;
        const first = Math.max(0, window * 64 - 32);
        for (const line of (options.program || []).slice(first, first + 128))
          layoutMachiBoardLine(line, screen.box, screen.content.measure);
        preparedWindow = window;
      }
      const commands = scene.frame(time, parameters);
      if (Native.pendingMeasurements().length) return null;
      const frame = encoder.encode(commands);
      frame.width = scene.runtime.renderer.domElement.width;
      frame.height = scene.runtime.renderer.domElement.height;
      frame.scene = scene.runtime.stageId;
      frame.sceneEpoch = sceneEpoch;
      frame.viewChange = scene.takeViewChange();
      const runtime = scene.runtime;
      frame.needsFrame =
        !runtime.clock.paused ||
        runtime.camera.busy ||
        runtime.stage.busy ||
        runtime.wantsFrame ||
        runtime.environmentMoving ||
        runtime.fadePhase !== 'idle';
      return frame;
    },
    refreshMeasurements() {
      // Source font changes repaint signs in place. Keep the original world,
      // geometry IDs and GPU namespace while exact metrics are resolved.
      scene.refreshMeasurements();
      preparedWindow = -1;
    },
    destroy() {
      scene.destroy();
      encoder.destroy();
    },
  };
}
export const createMachiSceneJob = (input) => createNativeSceneJob(input, create, create);
