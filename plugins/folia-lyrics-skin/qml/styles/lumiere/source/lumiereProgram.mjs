// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
import { flatMap } from '../../../shared/text/compat.mjs';
import {
  buildStructureLines,
  draftParagraphs,
  resolveParagraphGapThreshold,
  classifyParagraph,
} from './lumiereStructure.mjs';
import { mergeLumiereParagraphs } from './lumiereSeamless.mjs';
import { chooseLumiereTransition, LUMIERE_TRANSITIONS } from './lumiereTransitions.mjs';
import { advanceChain, castShot, DEFAULT_LUMIERE_PARAMS, planShots } from './program.mjs';
const REOPEN_GAP = 2.5;
const INSTRUMENTAL_DURATION = 480;
const INSTRUMENTAL_PARAGRAPH = 32;
const BRIDGE_SHOT = 10;
const BRIDGE_SPLIT = 16;
const splitLongBridges = (shots) =>
  flatMap(shots, (shot) => {
    const length = shot.endTime - shot.startTime;
    if (!shot.isBridge || length <= BRIDGE_SPLIT) return [shot];
    const count = Math.max(2, Math.round(length / BRIDGE_SHOT));
    return Array.from({ length: count }, (_, index) => {
      const startTime = shot.startTime + (length * index) / count;
      const endTime =
        index === count - 1 ? shot.endTime : shot.startTime + (length * (index + 1)) / count;
      return { lines: [], startTime, endTime, lyricEndTime: endTime, isBridge: true };
    });
  });
const planLyricParagraphs = (lines, params, duration) => {
  const structure = buildStructureLines(lines);
  const paragraphGapThreshold = resolveParagraphGapThreshold(lines);
  const drafts = draftParagraphs(structure, paragraphGapThreshold);
  const lyricEndTime = Math.max(...structure.map((line) => line.renderEndTime));
  const programEnd = Math.max(lyricEndTime, duration != null ? duration : 0);
  const firstStart = structure[0].line.startTime;
  const plans = [];
  const intro = firstStart >= params.bridgeGap;
  if (intro) {
    plans.push({
      lines: [],
      kind: 'break',
      boundary: 'intro',
      startTime: 0,
      endTime: firstStart,
      lyricEndTime: firstStart,
    });
  }
  drafts.forEach((draft, index) => {
    const next = drafts[index + 1];
    plans.push({
      lines: draft.lines,
      kind: classifyParagraph(draft.lines, index, drafts.length),
      boundary: draft.boundary,
      startTime: index === 0 && !intro ? Math.min(0, firstStart) : draft.lines[0].line.startTime,
      endTime: next ? next.lines[0].line.startTime : programEnd,
      lyricEndTime: draft.lines[draft.lines.length - 1].renderEndTime,
    });
  });
  return { plans, paragraphGapThreshold, lyricEndTime, programEnd };
};
const planInstrumentalParagraphs = (duration) => {
  const count = Math.max(1, Math.round(duration / INSTRUMENTAL_PARAGRAPH));
  return Array.from({ length: count }, (_, index) => {
    const startTime = (duration * index) / count;
    const endTime = index === count - 1 ? duration : (duration * (index + 1)) / count;
    return {
      lines: [],
      kind: 'break',
      boundary: index === 0 ? 'song-start' : 'instrumental',
      startTime,
      endTime,
      lyricEndTime: endTime,
    };
  });
};
const compileLumiereProgram = (lines, seed, params = {}, options = {}) => {
  var _a;
  const resolvedParams = __spreadValues(__spreadValues({}, DEFAULT_LUMIERE_PARAMS), params);
  const resolvedSeed = String(seed != null ? seed : 'lumiere');
  const instrumental = lines.length === 0;
  const lyric = instrumental ? null : planLyricParagraphs(lines, resolvedParams, options.duration);
  const instrumentalDuration = Math.max(
    1,
    options.duration && options.duration > 0 ? options.duration : INSTRUMENTAL_DURATION
  );
  const plans = lyric ? lyric.plans : planInstrumentalParagraphs(instrumentalDuration);
  const chain = { recent: [], family: null };
  let previousTransition = null;
  const paragraphs = plans.map((plan, index) => {
    const planned = splitLongBridges(
      planShots(plan.lines, plan.startTime, plan.endTime, resolvedParams)
    );
    const shots = planned.map((shot, shotIndex) => {
      const kind = castShot({
        seed: resolvedSeed,
        paragraphIndex: index,
        shotIndex,
        kind: plan.kind,
        isBridge: shot.isBridge,
        chain,
      });
      advanceChain(chain, kind);
      return {
        id: `p${index}-lu${shotIndex}`,
        kind,
        lineIndices: shot.lines.map((line) => line.sourceIndex),
        startTime: shot.startTime,
        endTime: shot.endTime,
        lyricEndTime: shot.lyricEndTime,
        isBridge: shot.isBridge,
      };
    });
    const next = plans[index + 1];
    let transitionOut = null;
    if (next) {
      const kind = chooseLumiereTransition(resolvedSeed, index, previousTransition);
      previousTransition = kind;
      const gap = next.startTime - plan.lyricEndTime;
      transitionOut = {
        kind,
        startTime: Math.max(plan.startTime, plan.endTime - LUMIERE_TRANSITIONS[kind].duration(gap)),
        endTime: plan.endTime,
      };
    }
    const previous = plans[index - 1];
    const opening = !previous || plan.startTime - previous.lyricEndTime >= REOPEN_GAP;
    const lineIndices = plan.lines.map((line) => line.sourceIndex);
    return {
      id: `lumiere-p${index}`,
      index,
      kind: plan.kind,
      boundary: plan.boundary,
      startTime: plan.startTime,
      endTime: plan.endTime,
      lyricEndTime: plan.lyricEndTime,
      lineIndices,
      lines: lineIndices.map((lineIndex) => lines[lineIndex]),
      shots,
      transitionOut,
      opening,
    };
  });
  return {
    version: 1,
    seed: resolvedSeed,
    instrumental,
    paragraphGapThreshold:
      (_a = lyric == null ? void 0 : lyric.paragraphGapThreshold) != null ? _a : 0,
    duration: lyric ? lyric.programEnd : instrumentalDuration,
    lyricEndTime: lyric ? lyric.lyricEndTime : null,
    paragraphs: options.seamless ? mergeLumiereParagraphs(paragraphs) : paragraphs,
  };
};
const findLumiereParagraphIndexAtTime = (program, time) => {
  for (let index = program.paragraphs.length - 1; index >= 0; index -= 1) {
    if (time >= program.paragraphs[index].startTime) return index;
  }
  return 0;
};
export { REOPEN_GAP, compileLumiereProgram, findLumiereParagraphIndexAtTime };
