// Original runtime owns shot/cache/credits/setting semantics; Qt supplies its native app sink.
import { LumierePixiRuntime } from './source/createLumierePixiRuntime.mjs';
import { LumiereDarkFieldLayer } from './source/lumiereDarkField.mjs';
import { LumiereCreditsLayer } from './source/lumiereCreditsLayer.mjs';
import { createLightSprites } from './source/light/sprites.mjs';
import { createLumiereBackend } from './backend.mjs';
import { snapshotLumiereScene } from './scene-frame.mjs';
import {
  createRuntimeEnvironment,
  withRuntimeEnvironment,
  advanceRuntimeEnvironment,
} from './runtime-environment.mjs';
export function createNativeLumiereRuntime(input, RuntimeClass = LumierePixiRuntime) {
  const environment = createRuntimeEnvironment(input.resolution),
    pixi = createLumiereBackend({ measureText: input.measureText }),
    audio = { bass: 0, treble: 0, power: 0 },
    host = { clientWidth: input.width, clientHeight: input.height },
    song = { seed: input.seed, program: input.program, theme: input.theme };
  let time = 0,
    destroyed = false,
    renderCount = 0,
    lastTuning = JSON.stringify(input.tuning),
    lastMetadata = JSON.stringify(input.metadata || {}),
    lastSong = '',
    lastSongValue = null;
  const options = {
      host,
      song,
      tuning: input.tuning,
      currentTime: { get: () => time },
      audioPower: { get: () => audio.power },
      audioBands: { bass: { get: () => audio.bass }, treble: { get: () => audio.treble } },
      staticMode: input.motionEnabled === false,
      showText: input.showText !== false,
      paused: input.paused === true,
      metadata: input.metadata || {},
    },
    app = {
      stage: new pixi.Container(),
      canvas: { isConnected: true },
      renderer: {
        type: 1,
        resize() {},
        render() {
          ++renderCount;
        },
      },
      ticker: { add() {}, remove() {} },
      start() {},
      stop() {},
      destroy() {
        this.canvas.isConnected = false;
        this.stage.destroy({ children: true });
      },
    };
  const runtime = withRuntimeEnvironment(environment, () => {
    const value = new RuntimeClass(pixi, options, app);
    value.renderResolution = input.resolution;
    value.sprites = createLightSprites(pixi);
    value.passthrough = new pixi.AlphaFilter({ alpha: 1 });
    value.quality.passthrough = value.passthrough;
    value.darkField = new LumiereDarkFieldLayer(pixi);
    value.sceneLayer = new pixi.Container();
    value.sceneLayer.sortableChildren = true;
    value.overlayLayer = new pixi.Container();
    value.credits = new LumiereCreditsLayer(pixi, value.sprites);
    app.stage.addChild(
      value.darkField.view,
      value.sceneLayer,
      value.credits.holder,
      value.overlayLayer
    );
    value.resizeToHost(true);
    return value;
  });
  function invoke(run) {
    if (destroyed) throw new Error('Lumiere runtime is released');
    return withRuntimeEnvironment(environment, run);
  }
  return {
    frame(nextTime, frame = {}) {
      return invoke(() => {
        time = nextTime;
        if (frame.audio) Object.assign(audio, frame.audio);
        const before = renderCount;
        advanceRuntimeEnvironment(
          environment,
          frame.nowMs === undefined ? environment.now : frame.nowMs
        );
        if (frame.tuning) {
          const key = JSON.stringify(frame.tuning);
          if (key !== lastTuning) {
            lastTuning = key;
            runtime.setTuning(frame.tuning);
          }
        }
        if (frame.metadata) {
          const key = JSON.stringify(frame.metadata);
          if (key !== lastMetadata) {
            lastMetadata = key;
            runtime.setSongMetadata(frame.metadata);
          }
        }
        if (frame.song && frame.song !== lastSongValue) {
          lastSongValue = frame.song;
          const key = JSON.stringify(frame.song);
          if (key !== lastSong) {
            lastSong = key;
            runtime.swapSong(frame.song);
          }
        }
        if (frame.showText !== undefined) runtime.setShowText(frame.showText);
        if (frame.motionEnabled !== undefined) runtime.setStaticMode(!frame.motionEnabled);
        if (frame.paused !== undefined) runtime.setPaused(frame.paused);
        if (renderCount === before) runtime.renderOnce();
        return snapshotLumiereScene(app.stage, {
          resolution: runtime.renderResolution,
          registeredScreens: [
            {
              width: Math.round(runtime.width * runtime.renderResolution),
              height: Math.round(runtime.height * runtime.renderResolution),
            },
          ],
        });
      });
    },
    setPaused(value) {
      invoke(() => runtime.setPaused(value));
    },
    setTuning(value) {
      invoke(() => runtime.setTuning(value));
    },
    setShowText(value) {
      invoke(() => runtime.setShowText(value));
    },
    setMotionEnabled(value) {
      invoke(() => runtime.setStaticMode(!value));
    },
    setMetadata(value) {
      invoke(() => runtime.setSongMetadata(value));
    },
    swapSong(next) {
      invoke(() => runtime.swapSong({ seed: next.seed, program: next.program, theme: next.theme }));
    },
    cacheState() {
      return {
        size: runtime.sceneCache.size,
        retired: runtime.sceneCache.hasRetired,
        swapping: runtime.songSwap.active,
        seed: options.song.seed,
        renderCount,
      };
    },
    audioFrame() {
      return Object.assign({}, runtime.audio.frame);
    },
    destroy() {
      if (destroyed) return;
      withRuntimeEnvironment(environment, () => runtime.destroy());
      environment.timers.clear();
      destroyed = true;
    },
  };
}
