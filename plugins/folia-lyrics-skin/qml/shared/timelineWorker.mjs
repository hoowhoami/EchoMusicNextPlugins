import { buildTimelineIndex } from './timelineIndex.mjs';
WorkerScript.onMessage = function (request) {
  WorkerScript.sendMessage({
    generation: request.generation,
    index: buildTimelineIndex(request.rows),
  });
};
