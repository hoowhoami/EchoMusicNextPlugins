import * as Fume from './api.mjs';
import { ArticlePreparation } from './prepare-job.mjs';
let generation = -1,
  revision = '',
  lines = [],
  pieces = [],
  units = 0,
  job = null,
  identityKey = '',
  identityIndex = 0,
  identifying = false;
function send(value) {
  WorkerScript.sendMessage(Object.assign({ generation, trackRevision: revision }, value));
}
function step() {
  const result = job.step(16);
  if (result.phase === 'complete' && result.article) {
    const article = result.article;
    delete article.blockBySourceLineIndex;
    delete article.chronologicalBlocks;
  }
  send(result);
}
WorkerScript.onMessage = function (message) {
  const request = JSON.parse(JSON.stringify(message));
  try {
    if (request.phase === 'generator-probe') {
      function* inner() {
        for (const [i, { a }] of [{ a: 1 }, { a: 2 }].entries()) {
          if (i) yield;
        }
      }
      const it = inner();
      const first = it.next(),
        last = it.next();
      WorkerScript.sendMessage({ generation: request.generation, first, last });
      return;
    }
    if (request.phase === 'probe') {
      const result = Fume.buildArticleLayout(
        [],
        { width: 1000, height: 700 },
        { fontStyle: 'sans', name: 'test' },
        1,
        { heroScale: 1 }
      ).next();
      WorkerScript.sendMessage({
        generation: request.generation,
        generator: result.done,
        value: result.value,
      });
      return;
    }
    if (request.phase === 'identify') {
      generation = request.generation;
      revision = request.trackRevision;
      identityIndex = 0;
      identifying = Boolean(job && job.finished && request.identityKey === identityKey);
      send({ phase: identifying ? 'identity-read' : 'identity-different' });
      return;
    }
    if (request.phase === 'reset') {
      generation = request.generation;
      revision = request.trackRevision;
      lines = [];
      pieces = [];
      units = 0;
      job = null;
      identityKey = request.identityKey || '';
      identifying = false;
      send({ phase: 'read' });
      return;
    }
    if (request.generation !== generation || request.trackRevision !== revision) return;
    if (request.phase === 'identity-append') {
      if (!identifying) return;
      for (const line of request.lines) {
        if (
          identityIndex >= lines.length ||
          JSON.stringify(line) !== JSON.stringify(lines[identityIndex++])
        ) {
          identifying = false;
          send({ phase: 'identity-different' });
          return;
        }
      }
      if (request.last) {
        identifying = false;
        send({ phase: identityIndex === lines.length ? 'identity-match' : 'identity-different' });
      } else send({ phase: 'identity-read' });
    } else if (request.phase === 'append') {
      for (const line of request.lines) {
        units += line.fullText.length;
        if (lines.length >= 8192 || units > 1048576)
          throw new Error('Fume whole-article budget exceeded (8192 rows / 1048576 UTF16)');
        lines.push(line);
      }
      pieces.push.apply(pieces, request.pieces);
      send({ phase: 'read' });
    } else if (request.phase === 'prepare') {
      job = new ArticlePreparation(lines, request.context, pieces);
      step();
    } else if (request.phase === 'step') step();
    else if (request.phase === 'measurements') {
      job.accept(request.measurements);
      step();
    }
  } catch (error) {
    send({ error: String(error.message || error) });
  }
};
