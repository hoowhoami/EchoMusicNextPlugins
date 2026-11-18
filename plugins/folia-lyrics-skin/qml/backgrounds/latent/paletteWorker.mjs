import { extractRepresentativeColorsFromPixels } from './palette.mjs';
WorkerScript.onMessage = function (message) {
  WorkerScript.sendMessage({
    generation: message.generation,
    colors: extractRepresentativeColorsFromPixels(message.pixels, 6),
  });
};
