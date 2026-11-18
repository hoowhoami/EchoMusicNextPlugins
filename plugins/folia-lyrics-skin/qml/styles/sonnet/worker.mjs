import { ProgramPreparation } from './preparation-job.mjs';
import { SongReadiness } from './song-state.mjs';
import { buildInstrumentalLines } from './instrumental.mjs';
const readiness = new SongReadiness();
let pendingSeed = '';
let generation = -1,
  trackRevision = '',
  sceneToken = -1,
  job = null;
function send(value) {
  WorkerScript.sendMessage(Object.assign({ generation, trackRevision, sceneToken }, value));
}
WorkerScript.onMessage = function (value) {
  const request = JSON.parse(JSON.stringify(value));
  try {
    if (request.phase === 'reset') {
      generation = request.generation;
      trackRevision = request.trackRevision;
      sceneToken = -1;
      job = new ProgramPreparation();
      send({ phase: 'read' });
      return;
    }
    if (request.generation !== generation || request.trackRevision !== trackRevision) return;
    if (request.phase === 'append') {
      job.append(request.lines, request.pieces);
      send({ phase: 'read' });
    } else if (request.phase === 'compile') {
      pendingSeed = request.seed;
      const decision = readiness.consider(request.seed, job.lines, request.wallMs);
      if (decision.action === 'watch') send({ phase: 'watch' });
      else {
        if (readiness.isInstrumental) job.lines = buildInstrumentalLines(true);
        send({
          phase: 'program',
          program: job.compile(request.seed),
          instrumental: readiness.isInstrumental,
        });
      }
    } else if (request.phase === 'watch') {
      const decision = readiness.watch(request.timeSeconds, request.wallMs);
      if (decision.action === 'commit') {
        job.lines = buildInstrumentalLines(true);
        send({ phase: 'program', program: job.compile(pendingSeed), instrumental: true });
      }
    } else if (request.phase === 'scene') {
      sceneToken = request.sceneToken;
      send(job.begin(request.index, request.context));
    } else if (request.phase === 'measurements' && request.sceneToken === sceneToken)
      send(job.accept(request.measurements, request.pieces));
  } catch (error) {
    send({ error: String(error.message || error) });
  }
};
