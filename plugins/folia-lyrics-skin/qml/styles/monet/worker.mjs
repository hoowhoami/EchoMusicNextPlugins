import { LayoutJob } from './layout-job.mjs';
let job = null,
  generation = -1;
WorkerScript.onMessage = function (message) {
  const request = JSON.parse(JSON.stringify(message));
  try {
    if (request.phase === 'layout') {
      generation = request.generation;
      job = new LayoutJob(request);
    } else if (request.phase === 'measurements') {
      if (generation !== request.generation || !job) return;
      job.accept(request.measurements);
    } else throw new Error('Unknown Monet worker request');
    const reply = job.step();
    reply.generation = generation;
    // A JSON payload creates GUI-owned data when parsed, rather than retaining a message backing store.
    WorkerScript.sendMessage({ generation, payload: JSON.stringify(reply) });
    if (reply.phase === 'complete') job = null;
  } catch (error) {
    job = null;
    WorkerScript.sendMessage({
      generation: request.generation,
      error: String(error.message || error),
    });
  }
};
