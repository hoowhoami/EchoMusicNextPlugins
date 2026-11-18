import { getLyricsSignature } from '../lumiere/source/songHandover.mjs';
import { createSongProgramHandler } from '../../shared/songProgramWorker.mjs';
const handle = createSongProgramHandler((lines) => lines, getLyricsSignature);
WorkerScript.onMessage = (message) => WorkerScript.sendMessage(handle(message));
