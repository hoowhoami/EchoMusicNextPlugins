import * as Native from '../lumiere/native-measure.mjs';
import { configurePixels, pendingPixels } from './environment.mjs';
import { createNebbiaRuntime } from './runtime-frame.mjs';
import { sourceImages } from './sprite-data.mjs';
export function createNebbiaSceneJob(input) {
  const metrics = new Map(),
    pixels = new Map(),
    pieces = new Map((input.pieces || []).map((v) => [v.text, v]));
  let scene = null,
    time = input.time || 0,
    parameters = input.runtimeFrame || {},
    round = 0,
    dead = false;
  function configure() {
    Native.configure({
      measurements: [...metrics.values()],
      pieces: [...pieces.values()],
      discovery: true,
    });
    configurePixels([...pixels.values()], 12345, input.options.images || sourceImages());
  }
  function evaluate() {
    if (dead) throw Error('Nebbia scene job retired');
    let frame,
      error,
      texts = [];
    try {
      if (!scene) scene = createNebbiaRuntime(input.options);
      frame = scene.frame(time, parameters);
    } catch (e) {
      const prefix = 'Exact ICU pieces missing for Monet: ';
      if (e.message.startsWith(prefix)) texts.push(JSON.parse(e.message.slice(prefix.length)));
      else error = e;
    }
    const measurements = Native.pendingMeasurements(),
      queries = pendingPixels();
    if (measurements.length || queries.length || texts.length) {
      if (scene) scene.destroy();
      scene = null;
      if (++round > 32) throw Error('Nebbia native preparation did not converge');
      return { phase: 'measure', measurements, pixels: queries, texts, round };
    }
    if (error) throw error;
    return { phase: 'frame', frame };
  }
  return {
    run(next = {}) {
      if (scene) scene.destroy();
      scene = null;
      for (const value of next.measurements || [])
        metrics.set(
          value.key,
          Object.assign({}, value, {
            width: value.advance,
            actualBoundingBoxAscent: -value.inkTop,
            actualBoundingBoxDescent: value.inkBottom,
          }),
        );
      for (const value of next.pixels || []) pixels.set(value.key, value);
      for (const value of next.pieces || []) pieces.set(value.text, value);
      if (metrics.size > 32768 || pixels.size > 4096)
        throw Error('Nebbia preparation cache exceeds budget');
      if (next.time !== undefined) time = next.time;
      if (next.runtimeFrame) parameters = Object.assign({}, parameters, next.runtimeFrame);
      configure();
      return evaluate();
    },
    frame(nextTime, layer, audio, runtimeFrame = {}) {
      time = nextTime;
      parameters = Object.assign({}, parameters, runtimeFrame, { audio });
      return evaluate();
    },
    destroy() {
      if (dead) return;
      dead = true;
      if (scene) scene.destroy();
      scene = null;
      metrics.clear();
      pixels.clear();
      Native.configure({});
      configurePixels([]);
    },
  };
}
