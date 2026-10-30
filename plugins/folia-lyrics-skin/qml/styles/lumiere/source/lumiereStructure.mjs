// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { getLineRenderEndTime } from '../../../shared/renderHints.mjs';
import { segmentLyricWords } from '../word-segmentation.mjs';
const DEFAULT_LUMIERE_STRUCTURE_PARAMS = {
  gapMultiplier: 2.5,
  gapMin: 1.25,
  gapMax: 3.5,
  maxLines: 6,
  maxDuration: 18,
  recursiveSplit: true,
};
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
const buildStructureLines = (lines) =>
  lines.map((line, sourceIndex) => {
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
    };
  });
const resolveParagraphGapThreshold = (lines, params = DEFAULT_LUMIERE_STRUCTURE_PARAMS) => {
  const gaps = lines
    .slice(1)
    .map(
      (line, index) => line.startTime - Math.min(getLineRenderEndTime(lines[index]), line.startTime)
    )
    .filter((gap) => gap > 0);
  return clamp(median(gaps) * params.gapMultiplier, params.gapMin, params.gapMax);
};
const metadataChanged = (previous, next) =>
  (previous.blockIndex !== void 0 &&
    next.blockIndex !== void 0 &&
    previous.blockIndex !== next.blockIndex) ||
  (previous.songPart !== void 0 && next.songPart !== void 0 && previous.songPart !== next.songPart);
const splitOversizedDraft = (draft, params) => {
  var _a, _b;
  const output = [];
  let remaining = draft.lines;
  let boundary = draft.boundary;
  let loopGuard = 0;
  while (
    remaining.length > params.maxLines ||
    (remaining.length > 1 &&
      remaining[remaining.length - 1].renderEndTime - remaining[0].line.startTime >
        params.maxDuration)
  ) {
    if (loopGuard++ > 1e3) break;
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
    const head = { lines: remaining.slice(0, splitIndex), boundary };
    output.push(...(params.recursiveSplit ? splitOversizedDraft(head, params) : [head]));
    remaining = remaining.slice(splitIndex);
    boundary =
      output[output.length - 1].lines.length >= params.maxLines ? 'line-cap' : 'duration-cap';
  }
  output.push({ lines: remaining, boundary });
  return output;
};
const draftParagraphs = (lines, threshold, params = DEFAULT_LUMIERE_STRUCTURE_PARAMS) => {
  const drafts = [];
  let current = { lines: [], boundary: 'song-start' };
  lines.forEach((line, index) => {
    const previous = lines[index - 1];
    const gap = previous ? line.line.startTime - previous.renderEndTime : 0;
    const boundary =
      previous && metadataChanged(previous.line, line.line)
        ? 'metadata'
        : previous && gap >= threshold
          ? 'time-gap'
          : null;
    if (boundary && current.lines.length > 0) {
      drafts.push(...splitOversizedDraft(current, params));
      current = { lines: [], boundary };
    }
    current.lines.push(line);
  });
  if (current.lines.length > 0) drafts.push(...splitOversizedDraft(current, params));
  return drafts;
};
const countWordLike = (line) => segmentLyricWords(line).filter((part) => part.isWordLike).length;
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
  const duration = lines[lines.length - 1].renderEndTime - lines[0].line.startTime;
  const segmentCount = lines.reduce((sum, line) => sum + countWordLike(line.line), 0);
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
export {
  DEFAULT_LUMIERE_STRUCTURE_PARAMS,
  buildStructureLines,
  classifyParagraph,
  countWordLike,
  draftParagraphs,
  metadataChanged,
  resolveParagraphGapThreshold,
  splitOversizedDraft,
};
