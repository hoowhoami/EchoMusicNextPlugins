// Evaluated in the real Qt WorkerScript engine, never in the GUI QML engine.
import { createIcuFoliaEngines } from './engines.mjs';
import { prepareLines } from './prepare.mjs';

WorkerScript.onMessage = function (message) {
  // ICU/source caches may outlive the delivery turn. Keep a plain, engine-owned
  // payload rather than retaining Qt delivery wrappers in those caches.
  const request = JSON.parse(JSON.stringify(message));
  const envelope = { requestId: request.requestId, trackRevision: request.trackRevision };
  try {
    envelope.result = prepareLines(
      request.lines,
      request.icuPieces,
      createIcuFoliaEngines(),
      request.options
    );
  } catch (error) {
    envelope.error = String((error && error.message) || error);
  }
  WorkerScript.sendMessage(envelope);
};
