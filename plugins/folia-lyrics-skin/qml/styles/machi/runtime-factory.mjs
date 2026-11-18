import { MachiRuntime } from './source/createMachiRuntime.mjs';
import { normalizeMachiTuning, resolveMachiSceneId } from './source/machiTuning.mjs';
import { configureRendererEnvironment } from './native-renderer.mjs';
import { configureNativePixels, setNativeNow, window, document } from './environment.mjs';
export function createNativeMachiRuntime(options) {
  let time = 0,
    power = 0,
    lastInputSequence = 0,
    viewChange = null;
  let clockOrigin = null;
  setNativeNow(0);
  // This job exists only while its real QML presentation is active.
  document.visibilityState = 'visible';
  const width = options.width,
    height = options.height;
  window.devicePixelRatio = options.resolution;
  configureRendererEnvironment({ width, height, pixelRatio: options.resolution });
  const tuning = normalizeMachiTuning(options.tuning);
  const runtime = new MachiRuntime({
    host: { clientWidth: width, clientHeight: height, appendChild() {} },
    paused: false,
    staticMode: false,
    showText: options.showText !== false,
    previewMode: !!options.previewMode,
    transparent: false,
    song: {
      seed: options.seed,
      lines: options.program || [],
      isInstrumental: !(options.program || []).length,
      title: options.metadata.title,
      artist: options.metadata.artist,
      album: options.metadata.album,
    },
    theme: options.theme,
    tuning,
    renderQuality: options.renderQuality || { scale: 1, antialias: 'auto' },
    currentTime: {
      get: () => time,
      set: (value) => {
        time = value;
      },
    },
    audioPower: { get: () => power },
    onContextLost() {},
    fallbackIcons: options.theme.lyricsIcons || [],
    onViewChange(view, scene) {
      viewChange = { view, scene };
    },
  });
  runtime.mountScene(resolveMachiSceneId(tuning, options.seed));
  runtime.holding = false;
  if (!options.previewMode) runtime.camera.attach(runtime.renderer.domElement);
  return {
    runtime,
    frame(seconds, parameters = {}) {
      time = seconds;
      power = (parameters.audio || {}).power || 0;
      // Lyrics use playback time; the source's camera/ambient clock uses real
      // elapsed time, so seeking or pausing never rewinds its UI clock.
      if (clockOrigin === null && parameters.presented) clockOrigin = Date.now() - 1;
      const now = clockOrigin === null ? 1 : Math.max(1, Date.now() - clockOrigin);
      setNativeNow(now);
      for (const event of parameters.pointerEvents || [])
        if (event.sequence > lastInputSequence) {
          runtime.renderer.domElement.dispatchNative(event);
          lastInputSequence = event.sequence;
        }
      if (runtime.paused !== !!parameters.paused) runtime.setPaused(!!parameters.paused);
      if (runtime.staticMode !== (parameters.motionEnabled === false))
        runtime.setStaticMode(parameters.motionEnabled === false);
      runtime.renderFrame(now);
      return runtime.renderer.drain();
    },
    takeViewChange() {
      const value = viewChange;
      viewChange = null;
      return value;
    },
    refreshMeasurements() {
      runtime.fillStage();
    },
    destroy() {
      runtime.destroy();
      document.visibilityState = 'hidden';
    },
  };
}
