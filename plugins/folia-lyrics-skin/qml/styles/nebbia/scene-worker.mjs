import { encodeNebbiaFrame } from './transport.mjs';
// Every retained job is made from Worker-owned values, never the transient message wrapper.
import { createNebbiaSceneJob as createLumiereSceneJob } from './scene-job.mjs';
let state = null;
WorkerScript.onMessage = function (message) {
  const request = JSON.parse(JSON.stringify(message)),
    reply = {
      generation: request.generation,
      trackRevision: request.trackRevision,
      sequence: request.sequence,
    };
  try {
    const started = Date.now();
    let result;
    if (request.phase === 'prepare') {
      if (state) state.job.destroy();
      state = {
        generation: request.generation,
        trackRevision: request.trackRevision,
        job: createLumiereSceneJob(request.input),
      };
      result = state.job.run();
    } else {
      if (
        !state ||
        state.generation !== request.generation ||
        state.trackRevision !== request.trackRevision
      )
        throw new Error('Stale Lumiere scene job');
      if (request.phase === 'resolve') result = state.job.run(request.input);
      else if (request.phase === 'frame')
        result = state.job.frame(request.time, request.layer, request.audio, request.runtimeFrame);
      else if (request.phase === 'release') {
        state.job.destroy();
        state = null;
        result = { phase: 'released' };
      } else throw new Error('Unknown Lumiere scene worker phase');
    }
    const evaluated = Date.now();
    if (result.phase === 'frame') result.frame = encodeNebbiaFrame(result.frame);
    const encoded = Date.now();
    reply.payload = JSON.stringify(result);
    reply.timing = {
      evaluateMs: evaluated - started,
      encodeMs: encoded - evaluated,
      serializeMs: Date.now() - encoded,
      payloadBytes: reply.payload.length * 2,
    };
  } catch (error) {
    reply.error = String(error.message || error) + '\n' + String(error.stack || '');
    if (state) {
      state.job.destroy();
      state = null;
    }
  }
  WorkerScript.sendMessage(reply);
};
