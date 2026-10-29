import { discover, complete } from './prepare.mjs';
WorkerScript.onMessage = function (request) {
  try {
    const result =
      request.phase === 'discover'
        ? discover(request.line, request.context, request.pieces)
        : complete(request.line, request.context, request.pieces, request.measurements);
    WorkerScript.sendMessage({ generation: request.generation, phase: request.phase, result });
  } catch (error) {
    WorkerScript.sendMessage({
      generation: request.generation,
      phase: request.phase,
      error: String(error.message || error),
    });
  }
};
