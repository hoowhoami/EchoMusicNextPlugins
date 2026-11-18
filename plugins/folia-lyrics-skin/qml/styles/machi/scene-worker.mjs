// Every retained job is made from Worker-owned values, never the transient message wrapper.
import { createMachiSceneJob as createLumiereSceneJob } from './scene-job.mjs';
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
    // WorkerScript transfers strings intact. Keep binary rows out of the JSON
    // document so neither engine has to scan or temporarily copy their text.
    let bulkBytes = 0;
    if (result.phase === 'frame') {
      reply.resourceData = [];
      for (const event of result.frame.events) {
        const fields = [event, ...(event.streams || [])];
        for (const item of fields) {
          for (const key of ['vertex', 'index', 'data']) {
            if (typeof item[key] !== 'string') continue;
            const packed = item[key];
            item[key] = reply.resourceData.length;
            reply.resourceData.push(packed);
            bulkBytes += packed.length * 2;
          }
        }
      }
      reply.objectRows = result.frame.passes.map((pass) => {
        const rows = pass.objects || '';
        if (rows) {
          bulkBytes += rows.length * 2;
          delete pass.objects;
        }
        return rows;
      });
    }
    const encoded = Date.now();
    reply.payload = JSON.stringify(result);
    reply.timing = {
      evaluateMs: evaluated - started,
      encodeMs: encoded - evaluated,
      serializeMs: Date.now() - encoded,
      payloadBytes: reply.payload.length * 2 + bulkBytes,
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
