// Whole-song snapshots share bounded preparation and generation guards.
import { getLyricsSignature } from './source/songHandover.mjs';
import { compileLumiereProgram } from './source/lumiereProgram.mjs';
import { createSongProgramHandler } from '../../shared/songProgramWorker.mjs';
const handle = createSongProgramHandler(
  (lines, seed, seamless) =>
    compileLumiereProgram(lines, seed, {}, { seamless: seamless === true }),
  getLyricsSignature,
);
WorkerScript.onMessage = (message) => WorkerScript.sendMessage(handle(message));
