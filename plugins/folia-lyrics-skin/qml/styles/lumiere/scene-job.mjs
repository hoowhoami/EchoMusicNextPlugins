import { createNativeLumiereRuntime } from './runtime-frame.mjs';
// Worker-owned preparation. A discovery round can never publish a provisional scene.
import * as Native from './native-measure.mjs';
import { clearCache } from '../monet/pretext.mjs';
import { createTextMeasurer } from '../sonnet/pixi-text-metrics.mjs';
import { createNativeLumiereScene } from './scene-frame.mjs';
function measurement(value) {
  if (
    !['advance', 'inkLeft', 'inkRight', 'inkTop', 'inkBottom', 'emAscent', 'emDescent'].every(
      (key) => Number.isFinite(value[key])
    )
  )
    throw new Error('Lumiere requires native advance, ink and primary-font em metrics');
  return Object.assign({}, value, {
    width: value.advance,
    actualBoundingBoxAscent: -value.inkTop,
    actualBoundingBoxDescent: value.inkBottom,
  });
}
export function createLumiereSceneJob(input) {
  const metrics = new Map(),
    pieces = new Map((input.pieces || []).map((value) => [value.text, value])),
    options = input.options;
  let scene = null,
    destroyed = false,
    time = input.time || 0,
    layer = input.layer || { alpha: 1, scale: 1, blur: 0 },
    audio = input.audio || { bass: 0, treble: 0, power: 0 },
    round = 0,
    runtimeFrame = input.runtimeFrame || {};
  function configure() {
    clearCache();
    Native.configure({
      pieces: [...pieces.values()],
      measurements: [...metrics.values()],
      discovery: true,
    });
    options.measureText = createTextMeasurer((font, text) => {
      const context = Native.getMeasureContext();
      context.font = font;
      const metric = context.measureText(text);
      return {
        advance: metric.advance || 0,
        inkLeft: metric.inkLeft || 0,
        inkRight: metric.inkRight || 0,
        inkTop: metric.inkTop || 0,
        inkBottom: metric.inkBottom || 0,
      };
    });
  }
  function retainRuntimeOptions() {
    if (!input.runtime) return;
    if (runtimeFrame.tuning) options.tuning = runtimeFrame.tuning;
    if (runtimeFrame.metadata) options.metadata = runtimeFrame.metadata;
    if (runtimeFrame.paused !== undefined) options.paused = runtimeFrame.paused;
    if (runtimeFrame.motionEnabled !== undefined)
      options.motionEnabled = runtimeFrame.motionEnabled;
    if (runtimeFrame.showText !== undefined) options.showText = runtimeFrame.showText;
    if (runtimeFrame.song) {
      options.program = runtimeFrame.song.program;
      options.seed = runtimeFrame.song.seed;
      options.theme = runtimeFrame.song.theme;
    }
  }
  function evaluate() {
    retainRuntimeOptions();
    let frame = null,
      error = null,
      texts = [];
    try {
      if (!scene)
        scene = input.runtime
          ? createNativeLumiereRuntime(options)
          : createNativeLumiereScene(options);
      frame = input.runtime
        ? scene.frame(time, Object.assign({}, runtimeFrame, { audio }))
        : scene.frame(time, layer, audio);
    } catch (caught) {
      error = caught;
      const prefix = 'Exact ICU pieces missing for Monet: ';
      if (error.message.startsWith(prefix)) {
        texts = [JSON.parse(error.message.slice(prefix.length))];
        error = null;
      }
    }
    const measurements = Native.pendingMeasurements().map((query) =>
      Object.assign({}, query, { fontFamily: JSON.parse(query.key)[2] })
    );
    if (measurements.length || texts.length) {
      if (scene) scene.destroy();
      scene = null;
      if (++round > 32) throw new Error('Lumiere native preparation did not converge');
      if (measurements.length > 8192) throw new Error('Lumiere native query budget exceeded');
      return { phase: 'measure', measurements, texts, round };
    }
    if (error) throw error;
    return { phase: 'frame', frame };
  }
  return {
    run(next = {}) {
      if (destroyed) throw new Error('Lumiere scene job is released');
      if (scene) {
        scene.destroy();
        scene = null;
      }
      for (const value of next.measurements || []) metrics.set(value.key, measurement(value));
      if (metrics.size > 32768) throw new Error('Lumiere native metric cache budget exceeded');
      for (const value of next.pieces || []) pieces.set(value.text, value);
      if (next.time !== undefined) time = next.time;
      if (next.layer) layer = next.layer;
      if (next.audio) audio = next.audio;
      if (next.runtimeFrame) runtimeFrame = Object.assign({}, runtimeFrame, next.runtimeFrame);
      configure();
      return evaluate();
    },
    frame(nextTime, nextLayer = layer, nextAudio = audio, nextRuntimeFrame = runtimeFrame) {
      if (destroyed) throw new Error('Lumiere scene job is released');
      time = nextTime;
      layer = nextLayer;
      audio = nextAudio;
      runtimeFrame = Object.assign({}, runtimeFrame, nextRuntimeFrame);
      return evaluate();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (scene) scene.destroy();
      scene = null;
      metrics.clear();
      pieces.clear();
      clearCache();
      Native.configure({});
    },
  };
}
