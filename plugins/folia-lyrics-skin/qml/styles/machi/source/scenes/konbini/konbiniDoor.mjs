// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/konbini/konbiniDoor.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../../environment.mjs';
import { isInterludeLine } from '../../_shared/utils/lyrics/parserCore.mjs';
import { getLineRenderEndTime } from '../../_shared/utils/lyrics/renderHints.mjs';
import {
  buildStructureLines,
  draftParagraphs,
  resolveParagraphGapThreshold,
} from '../../_shared/components/visualizer/paragraphStructure.mjs';
const KONBINI_DOOR_TIMING = { open: 0.75, hold: 2.6, close: 1, lead: 0.7 };
const DOOR_CYCLE = KONBINI_DOOR_TIMING.open + KONBINI_DOOR_TIMING.hold + KONBINI_DOOR_TIMING.close;
const buildKonbiniDoorEvents = (lines, variation) => {
  const sung = lines.filter((line) => !isInterludeLine(line) && line.fullText.trim());
  if (sung.length === 0) return [];
  const structure = buildStructureLines(sung);
  const drafts = draftParagraphs(structure, resolveParagraphGapThreshold(sung));
  const events = [];
  drafts.forEach((draft, index) => {
    if (index === 0) return;
    const start = draft.lines[0].line.startTime;
    events.push(Math.max(0, start - KONBINI_DOOR_TIMING.lead));
  });
  const gaps = [[0, sung[0].startTime]];
  for (let i = 1; i < sung.length; i += 1)
    gaps.push([getLineRenderEndTime(sung[i - 1]), sung[i].startTime]);
  gaps.forEach(([from, to]) => {
    if (to - from < variation.doorInterval * 0.6) return;
    for (
      let t = from + variation.doorInterval * (0.35 + variation.doorPhase * 0.4);
      t < to - DOOR_CYCLE;
      t += variation.doorInterval
    ) {
      events.push(t);
    }
  });
  return events
    .sort((a, b) => a - b)
    .filter((time, index, all) => index === 0 || time - all[index - 1] >= DOOR_CYCLE);
};
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const resolveKonbiniDoorOpenness = (events, time, variation, instrumental) => {
  let since = Infinity;
  if (instrumental || events.length === 0) {
    const phase = time / variation.doorInterval + variation.doorPhase;
    since = (phase - Math.floor(phase)) * variation.doorInterval;
  } else {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      if (events[i] <= time) {
        since = time - events[i];
        break;
      }
    }
  }
  const { open, hold, close } = KONBINI_DOOR_TIMING;
  if (since < 0 || since >= open + hold + close) return 0;
  if (since < open) return easeOutCubic(since / open);
  if (since < open + hold) return 1;
  return 1 - easeInOutCubic((since - open - hold) / close);
};
export { KONBINI_DOOR_TIMING, buildKonbiniDoorEvents, resolveKonbiniDoorOpenness };
