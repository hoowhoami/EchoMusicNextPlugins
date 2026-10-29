// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { useRef, useState, useEffect } from './react.mjs';
import { runtimeWindow as window } from './environment.mjs';
import {
  createSequencerState,
  activeSegment,
  appendSegment,
  updateActiveSegmentLines,
  pruneSegments,
} from './dioramaSequencer.mjs';
import { getFrame } from './cameraPath.mjs';
import { pickTransitionOffset, TRANSITION_DURATION } from './dioramaTransition.mjs';
const LOOP_RESTART_MAX_INDEX = 1,
  PRUNE_MARGIN_BEHIND = 4;
function useSequencer({ gatedSeed, effectiveLines, effectiveLineIndex }) {
  var _a;
  const seqRef = useRef(createSequencerState()),
    lastLocalIndexRef = useRef(0),
    hasEverActiveRef = useRef(!1),
    lastActiveKeyRef = useRef(null),
    transitionEpochRef = useRef(0),
    [transition, setTransition] = useState(null),
    seq = seqRef.current,
    outgoingSeg = activeSegment(seq),
    outgoingLocal = outgoingSeg
      ? Math.min(Math.max(lastLocalIndexRef.current, 0), outgoingSeg.span - 1)
      : 0,
    outgoingGlobal = outgoingSeg ? outgoingSeg.globalStart + outgoingLocal : 0,
    isNewSong = !outgoingSeg || outgoingSeg.seed !== gatedSeed,
    lyricsChanged = !isNewSong && !!outgoingSeg && outgoingSeg.lines !== effectiveLines,
    isLoopRestart =
      !!outgoingSeg &&
      !isNewSong &&
      effectiveLineIndex >= 0 &&
      effectiveLineIndex <= LOOP_RESTART_MAX_INDEX &&
      lastLocalIndexRef.current > effectiveLineIndex;
  if (isNewSong) {
    let placementOrigin = { x: 0, y: 0, z: 0 };
    if (outgoingSeg) {
      const anchor = getFrame(outgoingSeg.frames, outgoingLocal).position,
        off = pickTransitionOffset(
          gatedSeed != null ? gatedSeed : 'diorama',
          transitionEpochRef.current + 1
        );
      placementOrigin = { x: anchor.x + off.x, y: anchor.y + off.y, z: anchor.z + off.z };
    }
    appendSegment(seq, {
      seed: gatedSeed != null ? gatedSeed : 'diorama',
      lines: effectiveLines,
      round: 0,
      placementOrigin,
    });
  } else lyricsChanged && updateActiveSegmentLines(seq, effectiveLines);
  const activeSeg = activeSegment(seq),
    keyChanged = activeSeg.key !== lastActiveKeyRef.current,
    hadPrevious = lastActiveKeyRef.current !== null;
  (keyChanged &&
    ((lastActiveKeyRef.current = activeSeg.key),
    (lastLocalIndexRef.current = 0),
    (hasEverActiveRef.current = !1)),
    isLoopRestart && ((lastLocalIndexRef.current = 0), (hasEverActiveRef.current = !1)));
  const startingTransition = (keyChanged && hadPrevious) || isLoopRestart;
  (startingTransition &&
    ((transitionEpochRef.current += 1),
    console.log(
      `[Diorama] camera flight #${transitionEpochRef.current}: ${isNewSong ? 'new song' : 'loop restart'}, seed ${String(gatedSeed != null ? gatedSeed : 'none')}, leaving line ${outgoingGlobal}`
    ),
    setTransition({ epoch: transitionEpochRef.current, outgoingIndex: outgoingGlobal })),
    effectiveLineIndex >= 0 &&
      ((lastLocalIndexRef.current = effectiveLineIndex), (hasEverActiveRef.current = !0)));
  const rawLocalIndex = effectiveLineIndex >= 0 ? effectiveLineIndex : lastLocalIndexRef.current,
    localPositionIndex = Math.min(Math.max(rawLocalIndex, 0), Math.max(activeSeg.span - 1, 0)),
    globalIndex = activeSeg.globalStart + localPositionIndex,
    activeOutgoingIndex = startingTransition
      ? outgoingGlobal
      : transition
        ? transition.outgoingIndex
        : null,
    pruneFrom =
      activeOutgoingIndex != null ? Math.min(globalIndex, activeOutgoingIndex) : globalIndex;
  return (
    pruneSegments(seq, pruneFrom - PRUNE_MARGIN_BEHIND),
    useEffect(() => {
      if (!transition) return;
      const id = window.setTimeout(() => setTransition(null), TRANSITION_DURATION * 1e3);
      return () => window.clearTimeout(id);
    }, [transition]),
    {
      seq,
      globalIndex,
      transitionEpoch: transitionEpochRef.current,
      transitionOutgoingIndex:
        (_a = transition == null ? void 0 : transition.outgoingIndex) != null ? _a : null,
      hasEverActive: hasEverActiveRef.current,
    }
  );
}
export { useSequencer };
