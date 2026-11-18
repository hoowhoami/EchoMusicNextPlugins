import { ProgramPreparation } from './preparation-job.mjs';
let generation = -1,
  trackRevision = '',
  job = null;
function send(value) {
  WorkerScript.sendMessage(Object.assign({ generation, trackRevision }, value));
}
WorkerScript.onMessage = function (message) {
  const request = JSON.parse(JSON.stringify(message));
  try {
    if (request.phase === 'reset') {
      generation = request.generation;
      trackRevision = request.trackRevision;
      job = new ProgramPreparation();
      send({ phase: 'read' });
      return;
    }
    if (request.generation !== generation || request.trackRevision !== trackRevision) return;
    if (request.phase === 'append') {
      job.append(request.lines, request.pieces);
      send({ phase: 'read' });
    } else if (request.phase === 'prepare') send(job.begin(request.context, request.time));
    else if (request.phase === 'measurements')
      send(job.accept(request.measurements, request.pieces));
    else if (request.phase === 'frame') send(job.frame(request.time));
    else if (request.phase === 'tuning') send(job.updateTuning(request.tuning, request.time));
  } catch (error) {
    send({ error: String(error.message || error) });
  }
};
