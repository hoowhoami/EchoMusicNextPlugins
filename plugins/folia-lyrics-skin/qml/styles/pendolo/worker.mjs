import { buildNativeScene } from './native-scene.mjs';
import { LayoutJob } from './layout-job.mjs';
let job = null,
  generation = -1,
  fontKey = '',
  widths = new Map();
// Qt 6.12 WorkerScript payload wrappers must not back a retained multi-message job.
// Materialize strings/arrays inside this worker before later messages arrive.
WorkerScript.onMessage = function (message) {
  const request = JSON.parse(JSON.stringify(message));
  try {
    if (request.phase === 'geometry') {
      WorkerScript.sendMessage({
        generation: request.generation,
        scene: buildNativeScene(request.input),
      });
      return;
    }
    if (request.phase === 'layout') {
      generation = request.generation;
      if (fontKey !== request.fontKey) {
        fontKey = request.fontKey;
        widths.clear();
      }
      job = new LayoutJob(request, widths);
    } else if (request.generation !== generation || !job) return;
    else if (request.phase === 'measurements') job.accept(request.measurements);
    const result = job.step();
    WorkerScript.sendMessage(Object.assign({}, result, { generation }));
    if (result.phase === 'complete') job = null;
  } catch (error) {
    WorkerScript.sendMessage({
      generation: request.generation,
      error: String(error.message || error),
    });
    job = null;
  }
};
