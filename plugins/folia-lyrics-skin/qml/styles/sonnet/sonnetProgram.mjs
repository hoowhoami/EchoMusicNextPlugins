// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { at, flatMap } from './compat.mjs';
import { getLineRenderEndTime } from '../../shared/renderHints.mjs';
import { SONNET_TRANSITION_KINDS } from './types.mjs';
import { hashSonnetSeed } from './sonnetRandom.mjs';
import { buildSonnetSemanticSegments } from './sonnetSemantic.mjs';
import { buildSonnetSemanticSegments as buildSonnetSemanticSegments2 } from './sonnetSemantic.mjs';
const SONNET_SHOT_KINDS = [
    'editorial-column',
    'type-impact',
    'fragment-collage',
    'tracking-ribbon',
    'mask-reveal',
    'poster-blocks',
    'quiet-tableau',
  ],
  SONNET_DEBUG_SHOT_KIND = null,
  resolveSonnetDebugShotKind = () => SONNET_DEBUG_SHOT_KIND,
  clamp = (value, min, max) => Math.min(max, Math.max(min, value)),
  median = (values) => {
    var _a;
    if (values.length === 0) return 0.5;
    const sorted = [...values].sort((a, b) => a - b),
      middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (((_a = sorted[middle - 1]) != null ? _a : sorted[middle]) + sorted[middle]) / 2
      : sorted[middle];
  },
  resolveSonnetParagraphGapThreshold = (lines) => {
    const gaps = lines
      .slice(1)
      .map(
        (line, index) =>
          line.startTime - Math.min(getLineRenderEndTime(lines[index]), line.startTime)
      )
      .filter((gap) => gap > 0);
    return clamp(median(gaps) * 2.5, 1.25, 3.5);
  },
  metadataChanged = (previous, next) =>
    (previous.blockIndex !== void 0 &&
      next.blockIndex !== void 0 &&
      previous.blockIndex !== next.blockIndex) ||
    (previous.songPart !== void 0 &&
      next.songPart !== void 0 &&
      previous.songPart !== next.songPart),
  splitOversizedDraft = (draft) => {
    var _a, _b;
    const output = [];
    let remaining = draft.lines,
      boundary = draft.boundary,
      loopGuard = 0;
    for (
      ;
      remaining.length > 6 ||
      (remaining.length > 1 && at(remaining, -1).renderEndTime - remaining[0].line.startTime > 18);
    ) {
      if (loopGuard++ > 1e3) {
        console.error('splitOversizedDraft: Infinite loop detected, breaking');
        break;
      }
      const rawSplitIndex =
          (_b =
            (_a = remaining
              .slice(2, -1)
              .map((line, offset) => ({
                splitIndex: offset + 2,
                gap: line.line.startTime - remaining[offset + 1].renderEndTime,
              }))
              .filter((c) => !Number.isNaN(c.gap))
              .sort((a, b) => b.gap - a.gap)[0]) == null
              ? void 0
              : _a.splitIndex) != null
            ? _b
            : Math.min(4, remaining.length - 1),
        splitIndex = Math.max(1, rawSplitIndex);
      (output.push({ lines: remaining.slice(0, splitIndex), boundary }),
        (remaining = remaining.slice(splitIndex)),
        (boundary = at(output, -1).lines.length >= 6 ? 'line-cap' : 'duration-cap'));
    }
    return (output.push({ lines: remaining, boundary }), output);
  },
  classifyParagraph = (lines, index, total) => {
    if (
      lines.some((item) => {
        var _a;
        return (
          item.line.isChorus || /chorus|副歌/i.test((_a = item.line.songPart) != null ? _a : '')
        );
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
    const duration = at(lines, -1).renderEndTime - lines[0].line.startTime,
      segmentCount = lines.reduce(
        (sum, line) => sum + line.segments.filter((segment) => segment.isWordLike).length,
        0
      ),
      punctuationCount = lines.reduce((sum, line) => {
        var _a, _b;
        return (
          sum +
          ((_b = (_a = line.line.fullText.match(/[!?！？…]/g)) == null ? void 0 : _a.length) != null
            ? _b
            : 0)
        );
      }, 0);
    return duration <= 3.5 || segmentCount <= 3
      ? 'breath'
      : punctuationCount >= 2 || segmentCount / Math.max(duration, 1) > 2.5
        ? 'lift'
        : 'verse';
  },
  chooseWithoutRepeat = (choices, seed, previous) => {
    const start = hashSonnetSeed(seed) % choices.length;
    for (let offset = 0; offset < choices.length; offset += 1) {
      const candidate = choices[(start + offset) % choices.length];
      if (candidate !== previous) return candidate;
    }
    return choices[start];
  },
  buildCues = (lines) => {
    const segments = flatMap(lines, (line) => line.segments).filter(
      (segment) => segment.text.length > 0
    );
    return segments.map((segment, index) => ({
      at: segment.startTime,
      duration: Math.max(0.08, segment.endTime - segment.startTime),
      kind: index === segments.length - 1 ? 'accent' : 'enter',
      segmentStart: index,
      segmentEnd: index + 1,
    }));
  },
  groupShotLines = (lines) => {
    const groups = [];
    let currentGroup = [],
      groupStartTime = 0;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (currentGroup.length === 0)
        (currentGroup.push(line), (groupStartTime = line.line.startTime));
      else {
        const durationSoFar = line.renderEndTime - groupStartTime;
        currentGroup.length < 4 && durationSoFar <= 6
          ? currentGroup.push(line)
          : (groups.push(currentGroup),
            (currentGroup = [line]),
            (groupStartTime = line.line.startTime));
      }
    }
    return (currentGroup.length > 0 && groups.push(currentGroup), groups);
  },
  buildShots = (lines, kind, paragraphIndex, seed, previousKind) => {
    let lastKind = previousKind;
    return groupShotLines(lines).map((group, shotIndex) => {
      const signature = group.map((item) => item.line.fullText).join('|'),
        debugShotKind = resolveSonnetDebugShotKind();
      let shotKind =
        debugShotKind != null
          ? debugShotKind
          : chooseWithoutRepeat(
              SONNET_SHOT_KINDS,
              `${seed}:${paragraphIndex}:${shotIndex}:${signature}`,
              lastKind
            );
      const wordCount = group.reduce(
        (sum, item) => sum + item.segments.filter((s) => s.isWordLike).length,
        0
      );
      (debugShotKind === null &&
        (kind === 'breath' && shotIndex === 0 && wordCount <= 2 && (shotKind = 'quiet-tableau'),
        kind === 'chorus' && shotKind === 'quiet-tableau' && (shotKind = 'type-impact')),
        (lastKind = shotKind));
      const random = hashSonnetSeed(`${seed}:${paragraphIndex}:${shotIndex}:camera`),
        zoomRandom = ((random >>> 16) & 255) / 255,
        zoomBase = shotKind === 'poster-blocks' ? 1.02 : shotKind === 'quiet-tableau' ? 1.12 : 1.22,
        zoomSpan = shotKind === 'poster-blocks' ? 0.16 : shotKind === 'quiet-tableau' ? 0.2 : 0.26;
      return {
        id: `p${paragraphIndex}-s${shotIndex}`,
        kind: shotKind,
        startTime: group[0].line.startTime,
        endTime: at(group, -1).renderEndTime,
        lineIndices: group.map((item) => item.sourceIndex),
        cues: buildCues(group),
        camera: {
          x: ((random & 255) / 255 - 0.5) * 0.18,
          y: (((random >>> 8) & 255) / 255 - 0.5) * 0.14,
          zoom: zoomBase + zoomRandom * zoomSpan,
          rotation: (((random >>> 24) & 255) / 255 - 0.5) * 0.08,
        },
      };
    });
  },
  compileSonnetProgram = (lines, seed = 'sonnet') => {
    const compiled = lines.map((line, sourceIndex) => {
        var _a, _b;
        return {
          sourceIndex,
          line,
          renderEndTime: Math.max(
            line.startTime,
            Math.min(
              getLineRenderEndTime(line),
              (_b = (_a = lines[sourceIndex + 1]) == null ? void 0 : _a.startTime) != null
                ? _b
                : Number.POSITIVE_INFINITY
            )
          ),
          segments: buildSonnetSemanticSegments(line),
        };
      }),
      paragraphGapThreshold = resolveSonnetParagraphGapThreshold(lines),
      drafts = [];
    let current = { lines: [], boundary: 'song-start' };
    (compiled.forEach((line, index) => {
      const previous = compiled[index - 1],
        gap = previous ? line.line.startTime - previous.renderEndTime : 0,
        boundary =
          previous && metadataChanged(previous.line, line.line)
            ? 'metadata'
            : previous && gap >= paragraphGapThreshold
              ? 'time-gap'
              : null;
      (boundary &&
        current.lines.length > 0 &&
        (drafts.push(...splitOversizedDraft(current)), (current = { lines: [], boundary })),
        current.lines.push(line));
    }),
      current.lines.length > 0 && drafts.push(...splitOversizedDraft(current)));
    const resolvedSeed = String(seed);
    let previousShot = null,
      previousTransition = null;
    const paragraphs = drafts.map((draft, index) => {
      var _a, _b, _c;
      const kind = classifyParagraph(draft.lines, index, drafts.length),
        shots = buildShots(draft.lines, kind, index, resolvedSeed, previousShot);
      previousShot =
        (_b = (_a = at(shots, -1)) == null ? void 0 : _a.kind) != null ? _b : previousShot;
      const next = drafts[index + 1],
        endTime = at(draft.lines, -1).renderEndTime,
        gap = next ? next.lines[0].line.startTime - endTime : 0,
        availableTransitions = [...SONNET_TRANSITION_KINDS],
        transitionKind = next
          ? chooseWithoutRepeat(
              availableTransitions,
              `${resolvedSeed}:${index}:transition`,
              previousTransition
            )
          : null;
      transitionKind && (previousTransition = transitionKind);
      const transitionDuration = next
          ? Math.min(0.3, Math.max(0.16, gap > 0 ? gap * 0.5 : 0.2))
          : 0,
        transitionEndTime =
          (_c = next == null ? void 0 : next.lines[0].line.startTime) != null ? _c : endTime;
      return {
        id: `sonnet-p${index}`,
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
    return { version: 1, seed: resolvedSeed, paragraphGapThreshold, paragraphs };
  },
  findSonnetParagraphIndexAtTime = (program, time) => {
    for (let index = program.paragraphs.length - 1; index >= 0; index -= 1)
      if (time >= program.paragraphs[index].startTime) return index;
    return 0;
  };
export {
  SONNET_DEBUG_SHOT_KIND,
  SONNET_SHOT_KINDS,
  buildSonnetSemanticSegments2 as buildSonnetSemanticSegments,
  compileSonnetProgram,
  findSonnetParagraphIndexAtTime,
  resolveSonnetParagraphGapThreshold,
};
