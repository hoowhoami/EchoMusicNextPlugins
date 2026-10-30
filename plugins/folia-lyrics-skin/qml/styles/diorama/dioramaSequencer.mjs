// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { buildDioramaPath, getFrame, translateFrames } from './cameraPath.mjs';
const createSequencerState = () => ({ segments: [], nextGlobalStart: 0 }),
  activeSegment = (state) => {
    var _a;
    return (_a = state.segments[state.segments.length - 1]) != null ? _a : null;
  },
  appendSegment = (state, input) => {
    const raw = buildDioramaPath(input.lines.length, input.seed),
      frames = translateFrames(raw, input.placementOrigin),
      span = Math.max(input.lines.length, 1),
      segment = {
        key: `${String(input.seed)}#${input.round}`,
        seed: input.seed,
        round: input.round,
        lines: input.lines,
        frames,
        globalStart: state.nextGlobalStart,
        span,
        placementOrigin: input.placementOrigin,
        linesEpoch: 0,
      };
    return (state.segments.push(segment), (state.nextGlobalStart += span), segment);
  },
  updateActiveSegmentLines = (state, lines) => {
    const seg = state.segments[state.segments.length - 1];
    if (!seg) return;
    const raw = buildDioramaPath(lines.length, seg.seed),
      span = Math.max(lines.length, 1);
    ((state.nextGlobalStart += span - seg.span),
      (seg.lines = lines),
      (seg.frames = translateFrames(raw, seg.placementOrigin)),
      (seg.span = span),
      (seg.linesEpoch += 1));
  },
  totalGlobalLines = (state) => state.nextGlobalStart,
  resolveGlobal = (state, globalIndex) => {
    var _a;
    for (const segment of state.segments) {
      const localIndex = globalIndex - segment.globalStart;
      if (localIndex >= 0 && localIndex < segment.span)
        return {
          segment,
          localIndex,
          frame: getFrame(segment.frames, localIndex),
          line: (_a = segment.lines[localIndex]) != null ? _a : null,
        };
    }
    return null;
  },
  pruneSegments = (state, keepFromGlobal) => {
    state.segments.length <= 1 ||
      (state.segments = state.segments.filter(
        (segment) => segment.globalStart + segment.span - 1 >= keepFromGlobal
      ));
  };
export {
  activeSegment,
  appendSegment,
  createSequencerState,
  pruneSegments,
  resolveGlobal,
  totalGlobalLines,
  updateActiveSegmentLines,
};
