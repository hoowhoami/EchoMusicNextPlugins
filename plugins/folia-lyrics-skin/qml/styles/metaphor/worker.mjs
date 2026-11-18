// Full-song numerical compilation is isolated from QObjects and owns each message's values.

import { compileMetaphorProgram } from './source/metaphorProgram.mjs';
import { isValidWordSegmentation } from '../../shared/text/wordSegmentation.mjs';
import { createIcuFoliaEngines } from '../../shared/text/engines.mjs';
import { prepareLines } from '../../shared/text/prepare.mjs';
let state = null;
function validate(lines) {
  if (!Array.isArray(lines) || lines.length > 4096)
    throw new Error('Metaphor full-song snapshot exceeds 4096 lines');
  let units = 0;
  for (const line of lines) {
    if (
      typeof line.fullText !== 'string' ||
      !Number.isFinite(line.startTime) ||
      !Number.isFinite(line.endTime)
    )
      throw new Error('Invalid Metaphor source line');
    units += line.fullText.length;
    if (line.fullText.length > 8192 || units > 1024 * 1024)
      throw new Error('Metaphor full-song snapshot exceeds text budget');
    if (
      line.fullText &&
      !isValidWordSegmentation(line.fullText, line.wordSegments) &&
      !isValidWordSegmentation(line.fullText, line.autoWordSegments)
    )
      throw new Error('Metaphor requires real prepared semantic boundaries');
  }
}
function program(lines, seed, options) {
  validate(lines);
  return {
    phase: 'program',
    signature: String(seed),
    lines,
    program: compileMetaphorProgram(
      lines,
      Object.assign({}, options, { seed, transitions: false }),
    ),
    sourceIndices: lines.map((line, index) =>
      Number.isInteger(line.sourceIndex) ? line.sourceIndex : index,
    ),
  };
}
WorkerScript.onMessage = function (message) {
  const request = JSON.parse(JSON.stringify(message)),
    envelope = { request: request.request, trackRevision: request.trackRevision };
  try {
    let result;
    if (request.phase === 'reset') {
      state = {
        request: request.request,
        trackRevision: request.trackRevision,
        seed: request.seed,
        options: request.options,
        lines: [],
        units: 0,
      };
      result = { phase: 'reset' };
    } else if (request.phase === 'compile')
      result = program(request.lines, request.seed, request.options);
    else {
      if (
        !state ||
        state.request !== request.request ||
        state.trackRevision !== request.trackRevision
      )
        throw new Error('Stale Metaphor snapshot');
      if (request.phase === 'append') {
        if (!Array.isArray(request.lines) || request.lines.length > 64)
          throw new Error('Metaphor preparation batch exceeds 64 lines');
        const lines = prepareLines(request.lines, request.icuPieces, createIcuFoliaEngines(), {
          semantic: false,
          sticky: false,
        }).lines.map((value) => value.line);
        validate(lines);
        state.units += lines.reduce((sum, line) => sum + line.fullText.length, 0);
        if (state.lines.length + lines.length > 4096 || state.units > 1024 * 1024)
          throw new Error('Metaphor full-song snapshot exceeds text budget');
        state.lines.push.apply(state.lines, lines);
        result = { phase: 'appended', count: state.lines.length };
      } else if (request.phase === 'complete') {
        result = program(state.lines, state.seed, state.options);
      } else throw new Error('Unknown Metaphor worker phase');
    }
    envelope.payload = JSON.stringify(result);
  } catch (error) {
    envelope.error = String(error.message || error);
  }
  WorkerScript.sendMessage(envelope);
};
