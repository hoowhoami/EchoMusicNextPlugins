import { buildHarmonyIndex } from './index.mjs';
WorkerScript.onMessage = function (message) {
  const request = JSON.parse(JSON.stringify(message));
  try {
    WorkerScript.sendMessage({
      generation: request.generation,
      index: buildHarmonyIndex(request.vocals),
    });
  } catch (error) {
    WorkerScript.sendMessage({
      generation: request.generation,
      error: String(error.message || error),
    });
  }
};
