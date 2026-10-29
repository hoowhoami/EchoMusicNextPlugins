// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { flatMap, at } from './compat.mjs';
import { isPunctuationOnly, isSingleHan } from './unicode.mjs';
import { codePoints } from '../../shared/text/codepoints.mjs';
import {
  buildLineGraphemeTimeline,
  splitLyricGraphemes,
} from '../../shared/text/graphemeTiming.mjs';
import { getLineRenderEndTime } from '../../shared/renderHints.mjs';
import { TEMPERA_DECOR_MOTIFS, TEMPERA_TRANSITION_KINDS } from './types.mjs';
import { resolveTemperaShotCandidates, resolveTemperaShotProfile } from './temperaShotProfiles.mjs';
import {
  chooseWithoutRepeat,
  hashTemperaSeed,
  mixTemperaSeed,
  temperaHash01,
} from './temperaRandom.mjs';
import { segmentLyricWords } from '../../shared/text/wordSegmentation.mjs';
import { TEMPERA_SHOT_KINDS } from './types.mjs';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const median = (values) => {
  var _a;
  if (values.length === 0) return 0.5;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (((_a = sorted[middle - 1]) != null ? _a : sorted[middle]) + sorted[middle]) / 2
    : sorted[middle];
};
const resolveTemperaParagraphGapThreshold = (lines) => {
  const gaps = lines
    .slice(1)
    .map(
      (line, index) => line.startTime - Math.min(getLineRenderEndTime(lines[index]), line.startTime)
    )
    .filter((gap) => gap > 0);
  return clamp(median(gaps) * 2.5, 1.25, 3.5);
};
const PUNCTUATION_ONLY = { test: isPunctuationOnly };
const metadataChanged = (previous, next) =>
  (previous.blockIndex !== void 0 &&
    next.blockIndex !== void 0 &&
    previous.blockIndex !== next.blockIndex) ||
  (previous.songPart !== void 0 && next.songPart !== void 0 && previous.songPart !== next.songPart);
const buildTemperaSegments = (line) => {
  if (!line.fullText) return [];
  const timeline = buildLineGraphemeTimeline(line);
  let cursor = 0;
  const ranges = splitLyricGraphemes(line.fullText).map((grapheme) => {
    const range = { start: cursor, end: cursor + grapheme.length };
    cursor = range.end;
    return range;
  });
  const parts = segmentLyricWords(line);
  const segments = parts.map((part, index) => {
    var _a, _b, _c, _d, _e, _f;
    const startOffset = part.index;
    const endOffset =
      (_b = (_a = parts[index + 1]) == null ? void 0 : _a.index) != null
        ? _b
        : line.fullText.length;
    const indices = flatMap(ranges, (range, rangeIndex) =>
      range.end > startOffset && range.start < endOffset ? [rangeIndex] : []
    );
    const graphemes = indices.map((graphemeIndex) => timeline[graphemeIndex]).filter(Boolean);
    return {
      text: line.fullText.slice(startOffset, endOffset),
      startOffset,
      endOffset,
      graphemes,
      startTime:
        (_d = (_c = graphemes[0]) == null ? void 0 : _c.startTime) != null ? _d : line.startTime,
      endTime:
        (_f = (_e = graphemes[graphemes.length - 1]) == null ? void 0 : _e.endTime) != null
          ? _f
          : line.endTime,
      isWordLike: part.isWordLike,
    };
  });
  const sticky = [];
  for (const segment of segments) {
    const previous = sticky[sticky.length - 1];
    if (previous && !segment.isWordLike && !/^\s+$/u.test(segment.text)) {
      previous.text += segment.text;
      previous.endOffset = segment.endOffset;
      const tail = previous.endTime;
      const merged = segment.graphemes.map((grapheme) =>
        grapheme.endTime > grapheme.startTime
          ? grapheme
          : __spreadProps(__spreadValues({}, grapheme), { startTime: tail, endTime: tail })
      );
      previous.graphemes.push(...merged);
      previous.endTime = Math.max(previous.endTime, ...merged.map((grapheme) => grapheme.endTime));
    } else {
      sticky.push(
        __spreadProps(__spreadValues({}, segment), { graphemes: [...segment.graphemes] })
      );
    }
  }
  return sticky;
};
const splitOversizedDraft = (draft) => {
  var _a, _b;
  const output = [];
  let remaining = draft.lines;
  let boundary = draft.boundary;
  let loopGuard = 0;
  while (
    remaining.length > 6 ||
    (remaining.length > 1 && at(remaining, -1).renderEndTime - remaining[0].line.startTime > 18)
  ) {
    if (loopGuard++ > 1e3) {
      console.error('splitOversizedDraft: Infinite loop detected, breaking');
      break;
    }
    const candidates = remaining.slice(2, -1).map((line, offset) => ({
      splitIndex: offset + 2,
      gap: line.line.startTime - remaining[offset + 1].renderEndTime,
    }));
    const validCandidates = candidates.filter((candidate) => !Number.isNaN(candidate.gap));
    const rawSplitIndex =
      (_b =
        (_a = validCandidates.sort((a, b) => b.gap - a.gap)[0]) == null ? void 0 : _a.splitIndex) !=
      null
        ? _b
        : Math.min(4, remaining.length - 1);
    const splitIndex = Math.max(1, rawSplitIndex);
    output.push({ lines: remaining.slice(0, splitIndex), boundary });
    remaining = remaining.slice(splitIndex);
    boundary = at(output, -1).lines.length >= 6 ? 'line-cap' : 'duration-cap';
  }
  output.push({ lines: remaining, boundary });
  return output;
};
const classifyParagraph = (lines, index, total) => {
  if (
    lines.some((item) => {
      var _a;
      return item.line.isChorus || /chorus|副歌/i.test((_a = item.line.songPart) != null ? _a : '');
    })
  )
    return 'chorus';
  if (
    lines.some((item) => {
      var _a;
      return /bridge|break|間奏|ブリッジ/i.test((_a = item.line.songPart) != null ? _a : '');
    })
  )
    return 'break';
  if (index === total - 1) return 'outro';
  const duration = at(lines, -1).renderEndTime - lines[0].line.startTime;
  const segmentCount = lines.reduce(
    (sum, line) => sum + line.segments.filter((segment) => segment.isWordLike).length,
    0
  );
  const punctuationCount = lines.reduce((sum, line) => {
    var _a, _b;
    return (
      sum +
      ((_b = (_a = line.line.fullText.match(/[!?！？…]/g)) == null ? void 0 : _a.length) != null
        ? _b
        : 0)
    );
  }, 0);
  if (duration <= 3.5 || segmentCount <= 3) return 'breath';
  if (punctuationCount >= 2 || segmentCount / Math.max(duration, 1) > 2.5) return 'lift';
  return 'verse';
};
const isRenderableSegment = (segment) =>
  segment.text.trim().length > 0 && segment.graphemes.length > 0;
const SINGLE_HAN = { test: isSingleHan };
const SINGLE_HAN_GLUE_MAX_SECONDS = 3.2;
const isSingleHanWord = (segment) => segment.isWordLike && SINGLE_HAN.test(segment.text);
const buildShotChunks = (lines, seed, paragraphIndex, wholeLineLyrics) => {
  const chunks = [];
  lines.forEach((line) => {
    const usable = line.segments
      .map((segment, index) => ({ segment, index }))
      .filter((entry) => isRenderableSegment(entry.segment));
    if (usable.length === 0) return;
    if (wholeLineLyrics) {
      const first = usable[0];
      const last = at(usable, -1);
      chunks.push({
        lineIndex: line.sourceIndex,
        segmentStart: first.index,
        segmentEnd: last.index + 1,
        startTime: first.segment.startTime,
        endTime: Math.max(last.segment.endTime, first.segment.startTime + 0.2),
        lyricEndTime: Math.max(last.segment.endTime, first.segment.startTime + 0.2),
      });
      return;
    }
    let segmentStart = usable[0].index;
    let startTime = usable[0].segment.startTime;
    let words = 0;
    usable.forEach((entry, order) => {
      words += 1;
      const chunkSeed = hashTemperaSeed(
        `${seed}:${paragraphIndex}:${line.sourceIndex}:${chunks.length}`
      );
      const target = 2 + Math.floor(temperaHash01(chunkSeed, 1, 179) * 3);
      const spent = entry.segment.endTime - startTime;
      const isLast = order === usable.length - 1;
      if (!isLast && words < target && spent < 2.2) return;
      const next = usable[order + 1];
      if (
        !isLast &&
        spent < SINGLE_HAN_GLUE_MAX_SECONDS &&
        next &&
        isSingleHanWord(entry.segment) &&
        isSingleHanWord(next.segment) &&
        next.segment.startOffset === entry.segment.endOffset
      )
        return;
      chunks.push({
        lineIndex: line.sourceIndex,
        segmentStart,
        segmentEnd: entry.index + 1,
        startTime,
        endTime: Math.max(entry.segment.endTime, startTime + 0.2),
        lyricEndTime: Math.max(entry.segment.endTime, startTime + 0.2),
      });
      if (next) {
        segmentStart = next.index;
        startTime = next.segment.startTime;
        words = 0;
      }
    });
  });
  return chunks.map((chunk, index) => {
    var _a, _b;
    return __spreadProps(__spreadValues({}, chunk), {
      endTime: Math.max(
        chunk.startTime + 0.2,
        (_b = (_a = chunks[index + 1]) == null ? void 0 : _a.startTime) != null ? _b : chunk.endTime
      ),
    });
  });
};
const buildCameraKeys = (kind, seed, flowAngle) => {
  const jitterX = (temperaHash01(seed, 1, 11) - 0.5) * 0.02;
  const jitterY = (temperaHash01(seed, 2, 23) - 0.5) * 0.02;
  const jitterZoom = temperaHash01(seed, 3, 37) * 0.025;
  const jitterRotation = (temperaHash01(seed, 4, 51) - 0.5) * 0.012;
  const { camera } = resolveTemperaShotProfile(kind);
  const travelX = Math.cos(flowAngle) * camera.travel;
  const travelY = Math.sin(flowAngle) * camera.travel;
  return {
    start: {
      x: -travelX / 2 + jitterX,
      y: -travelY / 2 + jitterY,
      zoom: camera.zoomStart + jitterZoom,
      rotation: jitterRotation,
    },
    end: {
      x: travelX / 2 + jitterX,
      y: travelY / 2 + jitterY,
      zoom: camera.zoomEnd + jitterZoom,
      rotation: -jitterRotation,
    },
  };
};
const buildDecorFragments = (pool, count, seed) => {
  const chars = codePoints(pool).filter(
    (char) => char.trim().length > 0 && !PUNCTUATION_ONLY.test(char)
  );
  if (chars.length === 0 || count <= 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const char = chars[Math.floor(temperaHash01(seed, index, 13) * chars.length) % chars.length];
    const onLeft = temperaHash01(seed, index, 29) > 0.5;
    const edge = 0.03 + temperaHash01(seed, index, 41) * 0.13;
    return {
      char,
      x: onLeft ? edge : 1 - edge,
      y: 0.08 + temperaHash01(seed, index, 53) * 0.84,
      rotation: (temperaHash01(seed, index, 67) - 0.5) * 0.5,
      scale: 0.26 + temperaHash01(seed, index, 71) * 0.2,
    };
  });
};
const buildDecorWatermark = (pool, seed, allowed) => {
  const words = pool
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && word.length <= 12);
  if (!allowed || words.length === 0 || temperaHash01(seed, 4, 107) > 0.62) return null;
  return {
    text: words[Math.floor(temperaHash01(seed, 5, 109) * words.length) % words.length],
    x: 0.28 + temperaHash01(seed, 6, 113) * 0.44,
    y: 0.26 + temperaHash01(seed, 7, 127) * 0.48,
    rotation: (temperaHash01(seed, 8, 131) - 0.5) * 0.5,
    scale: 2.6 + temperaHash01(seed, 9, 137) * 1.9,
  };
};
const buildDecorSpec = (
  paragraphKind,
  shotKind,
  seedKey,
  fragmentPool,
  watermarkPool,
  previousMotif
) => {
  const seed = hashTemperaSeed(seedKey);
  const motif = chooseWithoutRepeat(TEMPERA_DECOR_MOTIFS, seedKey, previousMotif);
  const sparse =
    resolveTemperaShotProfile(shotKind).mood === 'quiet' ||
    paragraphKind === 'break' ||
    paragraphKind === 'outro';
  return {
    motif,
    // Shallow diagonals only; steep hatch reads as noise once the post-process grain lands.
    hatchAngle: (temperaHash01(seed, 1, 83) - 0.5) * (Math.PI / 2),
    crossCount: 1 + Math.floor(temperaHash01(seed, 2, 89) * 3),
    scribbleSeed: mixTemperaSeed(seed, 97),
    fragments: sparse
      ? buildDecorFragments(fragmentPool, 3 + Math.floor(temperaHash01(seed, 3, 101) * 3), seed)
      : [],
    watermark: buildDecorWatermark(
      watermarkPool,
      seed,
      resolveTemperaShotProfile(shotKind).mood !== 'loud'
    ),
  };
};
const resolveFlowAngle = (previous, seed) => {
  if (previous === null) {
    const sign = temperaHash01(seed, 6, 71) > 0.5 ? 1 : -1;
    return (sign * Math.PI) / 2 + (temperaHash01(seed, 8, 79) - 0.5) * 0.4;
  }
  const axis = ((Math.sin(previous) >= 0 ? 1 : -1) * Math.PI) / 2;
  return previous + (axis - previous) * 0.3 + (temperaHash01(seed, 7, 73) - 0.5) * 0.5;
};
const buildShots = (
  lines,
  songLines,
  kind,
  paragraphIndex,
  seed,
  previousKind,
  previousMotif,
  previousFlow,
  wholeLineLyrics
) => {
  var _a, _b;
  let lastKind = previousKind;
  let lastMotif = previousMotif;
  let lastFlow = previousFlow;
  const paragraphEnd =
    (_b = (_a = at(lines, -1)) == null ? void 0 : _a.renderEndTime) != null ? _b : 0;
  const chunks = buildShotChunks(lines, seed, paragraphIndex, wholeLineLyrics);
  const byIndex = new Map(lines.map((line) => [line.sourceIndex, line]));
  return chunks.map((chunk, shotIndex) => {
    var _a2;
    const line = byIndex.get(chunk.lineIndex);
    const sliceSegments =
      (_a2 = line == null ? void 0 : line.segments.slice(chunk.segmentStart, chunk.segmentEnd)) !=
      null
        ? _a2
        : [];
    const sliceText = sliceSegments.map((segment) => segment.text).join('');
    const wordCount = sliceSegments.filter((segment) => segment.isWordLike).length;
    const sparse = kind === 'breath' || (kind !== 'chorus' && wordCount <= 2);
    const moods = sparse
      ? ['quiet']
      : kind === 'chorus'
        ? ['neutral', 'loud']
        : ['quiet', 'neutral', 'loud'];
    const shotKind = chooseWithoutRepeat(
      resolveTemperaShotCandidates(moods),
      `${seed}:${paragraphIndex}:${shotIndex}:${sliceText}`,
      lastKind
    );
    lastKind = shotKind;
    const cameraSeed = hashTemperaSeed(`${seed}:${paragraphIndex}:${shotIndex}:camera`);
    const flowAngle = resolveFlowAngle(lastFlow, cameraSeed);
    lastFlow = flowAngle;
    const { start, end } = buildCameraKeys(shotKind, cameraSeed, flowAngle);
    const outsideSlice = flatMap(lines, (item) =>
      item.sourceIndex === chunk.lineIndex
        ? item.segments.filter(
            (_, index) => index < chunk.segmentStart || index >= chunk.segmentEnd
          )
        : item.segments
    );
    const decorPool =
      outsideSlice.length > 0
        ? outsideSlice
        : flatMap(songLines, (item) => (item.sourceIndex === chunk.lineIndex ? [] : item.segments));
    const fragmentPool = decorPool.map((segment) => segment.text).join('');
    const watermarkPool = decorPool
      .filter((segment) => segment.isWordLike)
      .map((segment) => segment.text);
    const decor = buildDecorSpec(
      kind,
      shotKind,
      `${seed}:${paragraphIndex}:${shotIndex}:decor`,
      fragmentPool,
      watermarkPool,
      lastMotif
    );
    lastMotif = decor.motif;
    const slices = [
      {
        lineIndex: chunk.lineIndex,
        segmentStart: chunk.segmentStart,
        segmentEnd: chunk.segmentEnd,
      },
    ];
    return {
      id: `p${paragraphIndex}-s${shotIndex}`,
      kind: shotKind,
      startTime: chunk.startTime,
      // The closing shot holds until the paragraph's own render tail ends.
      endTime:
        shotIndex === chunks.length - 1 ? Math.max(chunk.endTime, paragraphEnd) : chunk.endTime,
      lyricEndTime: chunk.lyricEndTime,
      slices,
      isBridge: false,
      camera: start,
      cameraEnd: end,
      flowAngle,
      decor,
    };
  });
};
const BRIDGE_MIN_GAP = 1.2;
const BRIDGE_MAX_LENGTH = 5;
const buildBridgeShots = (
  paragraphKind,
  paragraphIndex,
  seed,
  fragmentPool,
  gapStart,
  gapEnd,
  previousKind,
  previousMotif,
  previousFlow
) => {
  const gap = gapEnd - gapStart;
  if (gap < BRIDGE_MIN_GAP) return [];
  const count = Math.min(3, Math.max(1, Math.ceil(gap / BRIDGE_MAX_LENGTH)));
  const step = gap / count;
  let lastKind = previousKind;
  let lastMotif = previousMotif;
  let lastFlow = previousFlow;
  return Array.from({ length: count }, (_, index) => {
    const shotKind = chooseWithoutRepeat(
      resolveTemperaShotCandidates(['quiet', 'neutral']),
      `${seed}:${paragraphIndex}:bridge${index}`,
      lastKind
    );
    lastKind = shotKind;
    const cameraSeed = hashTemperaSeed(`${seed}:${paragraphIndex}:bridge${index}:camera`);
    const flowAngle = resolveFlowAngle(lastFlow, cameraSeed);
    lastFlow = flowAngle;
    const { start, end } = buildCameraKeys(shotKind, cameraSeed, flowAngle);
    const decor = buildDecorSpec(
      paragraphKind,
      shotKind,
      `${seed}:${paragraphIndex}:bridge${index}:decor`,
      fragmentPool,
      [],
      lastMotif
    );
    lastMotif = decor.motif;
    return {
      id: `p${paragraphIndex}-b${index}`,
      kind: shotKind,
      startTime: gapStart + step * index,
      endTime: gapStart + step * (index + 1),
      // A bridge carries no lyric, so its graphics pace over the whole gap.
      lyricEndTime: gapStart + step * (index + 1),
      slices: [],
      isBridge: true,
      camera: start,
      cameraEnd: end,
      flowAngle,
      decor,
    };
  });
};
const compileTemperaProgram = (lines, seed = 'tempera', options = {}) => {
  const compiled = lines.map((line, sourceIndex) => {
    var _a, _b;
    return {
      sourceIndex: Number.isInteger(line.sourceIndex) ? line.sourceIndex : sourceIndex,
      line,
      // The visual tail may extend beyond authored timing, but never into the next line.
      renderEndTime: Math.max(
        line.startTime,
        Math.min(
          getLineRenderEndTime(line),
          (_b = (_a = lines[sourceIndex + 1]) == null ? void 0 : _a.startTime) != null
            ? _b
            : Number.POSITIVE_INFINITY
        )
      ),
      segments: buildTemperaSegments(line),
    };
  });
  const paragraphGapThreshold = resolveTemperaParagraphGapThreshold(lines);
  const drafts = [];
  let current = { lines: [], boundary: 'song-start' };
  compiled.forEach((line, index) => {
    const previous = compiled[index - 1];
    const gap = previous ? line.line.startTime - previous.renderEndTime : 0;
    const boundary =
      previous && metadataChanged(previous.line, line.line)
        ? 'metadata'
        : previous && gap >= paragraphGapThreshold
          ? 'time-gap'
          : null;
    if (boundary && current.lines.length > 0) {
      drafts.push(...splitOversizedDraft(current));
      current = { lines: [], boundary };
    }
    current.lines.push(line);
  });
  if (current.lines.length > 0) drafts.push(...splitOversizedDraft(current));
  const resolvedSeed = String(seed);
  let previousShot = null;
  let previousMotif = null;
  let previousFlow = null;
  let previousTransition = null;
  const paragraphs = drafts.map((draft, index) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const kind = classifyParagraph(draft.lines, index, drafts.length);
    const lyricShots = buildShots(
      draft.lines,
      compiled,
      kind,
      index,
      resolvedSeed,
      previousShot,
      previousMotif,
      previousFlow,
      options.wholeLineLyrics === true
    );
    previousShot =
      (_b = (_a = at(lyricShots, -1)) == null ? void 0 : _a.kind) != null ? _b : previousShot;
    previousMotif =
      (_d = (_c = at(lyricShots, -1)) == null ? void 0 : _c.decor.motif) != null
        ? _d
        : previousMotif;
    previousFlow =
      (_f = (_e = at(lyricShots, -1)) == null ? void 0 : _e.flowAngle) != null ? _f : previousFlow;
    const next = drafts[index + 1];
    const endTime = at(draft.lines, -1).renderEndTime;
    const gap = next ? next.lines[0].line.startTime - endTime : 0;
    const bridgeShots = next
      ? buildBridgeShots(
          kind,
          index,
          resolvedSeed,
          draft.lines.map((item) => item.line.fullText).join(''),
          endTime,
          next.lines[0].line.startTime,
          previousShot,
          previousMotif,
          previousFlow
        )
      : [];
    const shots = [...lyricShots, ...bridgeShots];
    previousShot =
      (_h = (_g = at(shots, -1)) == null ? void 0 : _g.kind) != null ? _h : previousShot;
    previousMotif =
      (_j = (_i = at(shots, -1)) == null ? void 0 : _i.decor.motif) != null ? _j : previousMotif;
    previousFlow =
      (_l = (_k = at(shots, -1)) == null ? void 0 : _k.flowAngle) != null ? _l : previousFlow;
    const transitionKind = next
      ? chooseWithoutRepeat(
          TEMPERA_TRANSITION_KINDS,
          `${resolvedSeed}:${index}:transition`,
          previousTransition
        )
      : null;
    if (transitionKind) previousTransition = transitionKind;
    const transitionDuration = next ? Math.min(1, Math.max(0.35, Math.max(gap, 0) + 0.3)) : 0;
    const transitionEndTime =
      (_m = next == null ? void 0 : next.lines[0].line.startTime) != null ? _m : endTime;
    return {
      id: `tempera-p${index}`,
      kind,
      boundary: draft.boundary,
      startTime: draft.lines[0].line.startTime,
      endTime,
      lines: draft.lines,
      shots,
      transitionOut: transitionKind
        ? {
            kind: transitionKind,
            startTime: Math.max(
              draft.lines[0].line.startTime,
              transitionEndTime - transitionDuration
            ),
            endTime: transitionEndTime,
          }
        : null,
    };
  });
  paragraphs.forEach((paragraph, index) => {
    var _a;
    const incoming = paragraph.shots[0];
    const transition = (_a = paragraphs[index - 1]) == null ? void 0 : _a.transitionOut;
    if (!incoming || !transition || transition.kind === 'block-wipe') return;
    incoming.startTime = Math.min(
      incoming.startTime,
      Math.max(transition.startTime, paragraphs[index - 1].endTime)
    );
  });
  return { version: 1, seed: resolvedSeed, paragraphGapThreshold, paragraphs };
};
const findTemperaParagraphIndexAtTime = (program, time) => {
  for (let index = program.paragraphs.length - 1; index >= 0; index -= 1) {
    if (time >= program.paragraphs[index].startTime) return index;
  }
  return 0;
};
export {
  TEMPERA_SHOT_KINDS,
  buildTemperaSegments,
  compileTemperaProgram,
  findTemperaParagraphIndexAtTime,
  resolveTemperaParagraphGapThreshold,
};
