// Same public snapshots/ICU protocol; Hanabi owns only its original compiler.
import { compileHanabiProgram } from './source/hanabiProgram.mjs';
import { getLyricsSignature } from '../lumiere/source/songHandover.mjs';
import { createSongProgramHandler } from '../../shared/songProgramWorker.mjs';
const handle = createSongProgramHandler((lines, seed) => {
  const program = compileHanabiProgram(lines, seed);
  for (const paragraph of program.paragraphs) paragraph.transitionOut = null;
  return program;
}, getLyricsSignature);
WorkerScript.onMessage = (message) => WorkerScript.sendMessage(handle(message));
