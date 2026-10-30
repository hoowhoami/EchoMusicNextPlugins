// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
var __defProp = Object.defineProperty,
  __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty,
  __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
      : (obj[key] = value),
  __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  },
  __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { splitLyricGraphemes } from '../../shared/text/graphemeTiming.mjs';
import { buildFormation, getDioramaShot, getDioramaTextPlacement } from './cameraPath.mjs';
import { resolveGlobal } from './dioramaSequencer.mjs';
import {
  DIORAMA_CLUSTER_COLLISION_LINE_SPAN,
  selectVisibleDioramaClusters,
} from './dioramaGeometry.mjs';
import {
  DIORAMA_RASTER_FONT_PX,
  measureDioramaText,
  rasterDioramaUnit,
} from './dioramaTextRaster.mjs';
import { buildDioramaParticleCorridorWindow } from './dioramaParticleCorridor.mjs';
import {
  CORRIDOR_LINES_AHEAD,
  CORRIDOR_LINES_BEHIND,
  LINES_AHEAD,
  LINES_BEHIND,
  LINE_FONT_SIZE,
  OUTGOING_LINES_AHEAD,
  OUTGOING_LINES_BEHIND,
} from './dioramaSceneConstants.mjs';
import { frameQuaternion } from './dioramaSceneUnits.mjs';
import { CJK_GRAPHEME_RE } from './dioramaSceneTypes.mjs';
const resolveDioramaMountedIndices = (globalIndex, transitionOutgoingIndex, total) => {
    const indices = /* @__PURE__ */ new Set(),
      addWindow = (center, behind, ahead) => {
        const start = Math.max(center - behind, 0),
          end = Math.min(center + ahead, total - 1);
        for (let i = start; i <= end; i += 1) indices.add(i);
      };
    return (
      addWindow(globalIndex, LINES_BEHIND, LINES_AHEAD),
      transitionOutgoingIndex != null &&
        addWindow(transitionOutgoingIndex, OUTGOING_LINES_BEHIND, OUTGOING_LINES_AHEAD),
      Array.from(indices).sort((a, b) => a - b)
    );
  },
  buildDioramaVisibleLines = (
    sequencer,
    mountedIndices,
    globalIndex,
    transitionOutgoingIndex,
    weaveScale
  ) => {
    const result = [];
    for (const i of mountedIndices) {
      const resolved = resolveGlobal(sequencer, i);
      if (!resolved || !resolved.line) continue;
      const { frame } = resolved,
        placement = getDioramaTextPlacement(resolved.localIndex, resolved.segment.seed, weaveScale),
        position = {
          x: frame.position.x + frame.right.x * placement.offsetR + frame.up.x * placement.offsetU,
          y: frame.position.y + frame.right.y * placement.offsetR + frame.up.y * placement.offsetU,
          z: frame.position.z + frame.right.z * placement.offsetR + frame.up.z * placement.offsetU,
        };
      result.push({
        index: i,
        line: resolved.line,
        placement,
        position: [position.x, position.y, position.z],
        quaternion: frameQuaternion(frame, placement.roll, placement.yaw),
        isOutgoing:
          transitionOutgoingIndex != null &&
          Math.abs(i - transitionOutgoingIndex) <= Math.abs(i - globalIndex),
      });
    }
    return result;
  },
  buildDioramaCorridorSpans = (
    sequencer,
    globalIndex,
    transitionOutgoingIndex,
    geometryVisibility,
    geometryMode
  ) => {
    if (!geometryVisibility.enabled || geometryMode !== 'corridor') return [];
    const live = buildDioramaParticleCorridorWindow(
      sequencer,
      globalIndex,
      CORRIDOR_LINES_BEHIND,
      CORRIDOR_LINES_AHEAD
    );
    return transitionOutgoingIndex == null
      ? live
      : [
          ...buildDioramaParticleCorridorWindow(
            sequencer,
            transitionOutgoingIndex,
            CORRIDOR_LINES_BEHIND,
            CORRIDOR_LINES_AHEAD
          ),
          ...live,
        ];
  },
  buildDioramaParticleClusters = (
    sequencer,
    mountedIndices,
    geometryMode,
    motion,
    geometryVisibility,
    particleScale
  ) => {
    if (geometryMode !== 'clouds') return [];
    const result = [],
      mounted = new Set(mountedIndices),
      clusterIndices = /* @__PURE__ */ new Set();
    for (const i of mountedIndices)
      for (let back = 0; back <= DIORAMA_CLUSTER_COLLISION_LINE_SPAN; back += 1)
        i - back >= 0 && clusterIndices.add(i - back);
    for (const i of Array.from(clusterIndices).sort((a, b) => a - b)) {
      const resolved = resolveGlobal(sequencer, i);
      if (!resolved) continue;
      const { frame, localIndex, segment } = resolved,
        placement = getDioramaTextPlacement(localIndex, segment.seed, motion.weaveScale),
        shot = getDioramaShot(localIndex, segment.lines, segment.seed, motion.subMode);
      buildFormation(localIndex, segment.seed, shot, frame, placement, particleScale).forEach(
        (piece, slot) => {
          var _a;
          result.push(
            __spreadProps(__spreadValues({}, piece), {
              key: `${i}-${slot}`,
              sourceLine: i,
              particleSeed: `${(_a = segment.seed) != null ? _a : 'seed'}:${localIndex}:${slot}:${piece.kind}`,
              role: 'formation',
            })
          );
        }
      );
    }
    return selectVisibleDioramaClusters(result, geometryVisibility).filter((cluster) =>
      mounted.has(cluster.sourceLine)
    );
  },
  splitDioramaLyricUnits = (activeLine, activeLineTimeline) => {
    var _a, _b, _c;
    if (!activeLine || activeLineTimeline.length === 0) return [];
    const graphemes = splitLyricGraphemes(activeLine.fullText),
      charOffsets = [];
    let acc = 0;
    for (const g of graphemes) (charOffsets.push(acc), (acc += g.length));
    const units = [],
      pushUnit = (from, to) => {
        var _a2, _b2, _c2, _d;
        const text = graphemes.slice(from, to).join('');
        text.trim().length !== 0 &&
          units.push({
            text,
            charStart: (_a2 = charOffsets[from]) != null ? _a2 : 0,
            charEnd:
              ((_b2 = charOffsets[to - 1]) != null ? _b2 : 0) +
              ((_d = (_c2 = graphemes[to - 1]) == null ? void 0 : _c2.length) != null ? _d : 1),
            startTime: activeLineTimeline[from].startTime,
            endTime: activeLineTimeline[to - 1].endTime,
          });
      };
    let i = 0;
    for (; i < activeLineTimeline.length;) {
      const g = (_a = graphemes[i]) != null ? _a : '';
      if (g.trim().length === 0) {
        i += 1;
        continue;
      }
      if (CJK_GRAPHEME_RE.test(g)) {
        (pushUnit(i, i + 1), (i += 1));
        continue;
      }
      const wordIndex = activeLineTimeline[i].wordIndex;
      let j = i + 1;
      for (
        ;
        j < activeLineTimeline.length &&
        activeLineTimeline[j].wordIndex === wordIndex &&
        ((_b = graphemes[j]) != null ? _b : '').trim().length > 0 &&
        !CJK_GRAPHEME_RE.test((_c = graphemes[j]) != null ? _c : '');
      )
        j += 1;
      (pushUnit(i, j), (i = j));
    }
    return units;
  },
  layoutDioramaActiveUnits = (activeLine, activeLineUnits, fontSpec) => {
    if (!(activeLine != null && activeLine.fullText) || activeLineUnits.length === 0) return null;
    const worldPerPx = LINE_FONT_SIZE / DIORAMA_RASTER_FONT_PX,
      full = activeLine.fullText,
      totalPx = measureDioramaText(full, fontSpec);
    return {
      units: activeLineUnits.map((unit) => {
        const prefixPx = measureDioramaText(full.slice(0, unit.charStart), fontSpec),
          raster = rasterDioramaUnit(full.slice(unit.charStart, unit.charEnd), fontSpec);
        return {
          raster,
          centerX: (-totalPx / 2 + prefixPx + raster.advancePx / 2) * worldPerPx,
          width: raster.canvasWidthPx * worldPerPx,
          height: raster.canvasHeightPx * worldPerPx,
        };
      }),
      lineWidth: totalPx * worldPerPx,
    };
  };
export {
  buildDioramaCorridorSpans,
  buildDioramaParticleClusters,
  buildDioramaVisibleLines,
  layoutDioramaActiveUnits,
  resolveDioramaMountedIndices,
  splitDioramaLyricUnits,
};
