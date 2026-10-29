// Source-order sequencing runs once per metadata/theme/pack revision, never per frame.
import { buildMessages, intensity, eligibilityIndex } from './kernel.mjs';
WorkerScript.onMessage = function (request) {
  try {
    const messages = buildMessages(
      request.metadata,
      request.title,
      intensity(request.intensity),
      request.settings,
      request.emojis,
      false
    );
    const lyricOffsets = {};
    messages.forEach((message, index) => {
      message.order = index;
      if (message.kind === 'lyric') lyricOffsets[message.lineIndex] = index;
    });
    WorkerScript.sendMessage({
      generation: request.generation,
      messages,
      index: eligibilityIndex(messages),
      lyricOffsets,
    });
  } catch (error) {
    WorkerScript.sendMessage({ generation: request.generation, error: String(error) });
  }
};
