// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { ProgramPreparation } from './preparation-job.mjs';
let generation = -1,
  trackRevision = '',
  job = null;
function send(value) {
  WorkerScript.sendMessage(Object.assign({ generation, trackRevision }, value));
}
WorkerScript.onMessage = function (request) {
  try {
    if (request.phase === 'reset') {
      ((generation = request.generation),
        (trackRevision = request.trackRevision),
        job ? job.reset() : (job = new ProgramPreparation()),
        send({ phase: 'read' }));
      return;
    }
    if (request.generation !== generation || request.trackRevision !== trackRevision) return;
    request.phase === 'append'
      ? (job.append(request.lines), send({ phase: 'read' }))
      : request.phase === 'prepare'
        ? send(job.begin(request.context, request.time, request.presentationSeconds, request.audio))
        : request.phase === 'measurements'
          ? send(job.accept(request.measurements))
          : request.phase === 'frame'
            ? send(job.frame(request.time, request.presentationSeconds, request.audio))
            : request.phase === 'tuning' &&
              send(
                job.updateTuning(
                  request.tuning,
                  request.time,
                  request.presentationSeconds,
                  request.audio
                )
              );
  } catch (error) {
    send({ error: String(error.message || error) });
  }
};
