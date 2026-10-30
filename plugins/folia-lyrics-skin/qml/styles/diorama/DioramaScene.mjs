// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { document } from './canvas.mjs';
import React, { useEffect, useMemo, useRef, useState } from './react.mjs';
import { useThree } from './react.mjs';
import * as THREE from './three.mjs';
import { buildLineGraphemeTimeline } from '../../shared/text/graphemeTiming.mjs';
import { resolveThemeFontStack, resolveThemeFontWeight } from '../sonnet/font-stacks.mjs';
import {
  prepareDioramaKeywordMatchers,
  resolveDioramaKeywordUnitColors,
} from './dioramaKeywordColor.mjs';
import { resolveGlobal, totalGlobalLines } from './dioramaSequencer.mjs';
import { buildDioramaFontSpec } from './dioramaTextRaster.mjs';
import { DioramaParticleField } from './DioramaParticleField.mjs';
import {
  DIORAMA_MOTE_WINDOW_LINES,
  resolveDioramaMoteCircumference,
  resolveDioramaMoteRadial,
} from './dioramaMoteField.mjs';
import {
  FOG_FAR,
  FOG_NEAR,
  LINE_FONT_SIZE,
  resolveNeighborLineOpacity,
  resolveOutgoingLineOpacity,
} from './dioramaSceneConstants.mjs';
import {
  buildDioramaCorridorSpans,
  buildDioramaParticleClusters,
  buildDioramaVisibleLines,
  layoutDioramaActiveUnits,
  resolveDioramaMountedIndices,
  splitDioramaLyricUnits,
} from './dioramaSceneLayout.mjs';
import { DioramaLineRasterCache } from './dioramaLineRasterCache.mjs';
import { DioramaActiveUnitPlanes } from './DioramaActiveUnitPlanes.mjs';
const DioramaScene = ({
  theme,
  sequencer,
  globalIndex,
  transitionOutgoingIndex,
  currentTime,
  activeLineWidthRef,
  audioPower,
  audioBands,
  motion,
  showLyrics,
  showParticles,
  backgroundParticleCircumference,
  backgroundParticleRadial,
  geometryVisibility,
  particleDensity,
  particleScale,
  particleGlowEnabled,
  particleGlowIntensity,
  lyricsFontScale,
  glowIntensity,
  soulIntensity,
  soulActiveEnabled,
  gradientIntensity,
  keywordColoringEnabled,
}) => {
  var _a, _b, _c, _d, _e;
  const lineMeshRefs = useRef(/* @__PURE__ */ new Map()),
    lineMatRefs = useRef(/* @__PURE__ */ new Map()),
    unitsGroupRef = useRef(null),
    unitPlanesRef = useRef({
      baseMats: [],
      glowMats: [],
      glowMeshes: [],
      soulMats: [],
      soulMeshes: [],
      unitGroups: [],
    }),
    unitLightValsRef = useRef(null),
    unitSoulValsRef = useRef(null),
    prevActiveGlobalRef = useRef(-1),
    powerEnvRef = useRef(0),
    trebleEnvRef = useRef(0),
    pointsRef = useRef(null),
    pointsMatRef = useRef(null),
    colors = useMemo(
      () => ({
        primary: theme.primaryColor,
        accent: theme.accentColor || theme.primaryColor,
        secondary: theme.secondaryColor,
      }),
      [theme.primaryColor, theme.accentColor, theme.secondaryColor]
    ),
    colorTargets = useMemo(
      () => ({
        primary: new THREE.Color(colors.primary),
        accent: new THREE.Color(colors.accent),
        secondary: new THREE.Color(colors.secondary),
        bg: new THREE.Color(theme.backgroundColor),
      }),
      [colors, theme.backgroundColor]
    ),
    dampedColorsRef = useRef(null),
    [fontsEpoch, setFontsEpoch] = useState(0);
  useEffect(() => {
    var _a2;
    let mounted = !0;
    return (
      typeof document != 'undefined' &&
        (_a2 = document.fonts) != null &&
        _a2.ready &&
        document.fonts.ready.then(() => {
          mounted && setFontsEpoch((e) => e + 1);
        }),
      () => {
        mounted = !1;
      }
    );
  }, []);
  const fontStack = useMemo(
      () => resolveThemeFontStack(theme),
      [theme.fontStyle, theme.fontFamily, fontsEpoch]
    ),
    fontWeight = resolveThemeFontWeight(theme, 700),
    fontSpec = useMemo(() => buildDioramaFontSpec(fontStack, fontWeight), [fontStack, fontWeight]),
    activeSeg = (_a = sequencer.segments[sequencer.segments.length - 1]) != null ? _a : null,
    total = totalGlobalLines(sequencer),
    linesEpoch = (_b = activeSeg == null ? void 0 : activeSeg.linesEpoch) != null ? _b : 0,
    mountedIndices = useMemo(
      () => resolveDioramaMountedIndices(globalIndex, transitionOutgoingIndex, total),
      [globalIndex, transitionOutgoingIndex, total]
    ),
    visibleLines = useMemo(
      () =>
        buildDioramaVisibleLines(
          sequencer,
          mountedIndices,
          globalIndex,
          transitionOutgoingIndex,
          motion.weaveScale
        ),
      [
        mountedIndices,
        sequencer,
        linesEpoch,
        transitionOutgoingIndex,
        globalIndex,
        motion.weaveScale,
      ]
    ),
    geometryMode = (_c = geometryVisibility.mode) != null ? _c : 'clouds',
    corridorSpans = useMemo(
      () =>
        buildDioramaCorridorSpans(
          sequencer,
          globalIndex,
          transitionOutgoingIndex,
          geometryVisibility,
          geometryMode
        ),
      [
        geometryVisibility.enabled,
        geometryMode,
        globalIndex,
        transitionOutgoingIndex,
        sequencer,
        linesEpoch,
      ]
    ),
    particleClusters = useMemo(
      () =>
        buildDioramaParticleClusters(
          sequencer,
          mountedIndices,
          geometryMode,
          motion,
          geometryVisibility,
          particleScale
        ),
      [
        geometryMode,
        mountedIndices,
        sequencer,
        motion.weaveScale,
        motion.subMode,
        geometryVisibility,
        particleScale,
      ]
    ),
    activeSegKey = (_d = activeSeg == null ? void 0 : activeSeg.key) != null ? _d : 'x',
    moteCircumference = resolveDioramaMoteCircumference(backgroundParticleCircumference),
    moteRadial = resolveDioramaMoteRadial(backgroundParticleRadial),
    moteDensity = moteCircumference * moteRadial,
    motePositions = useMemo(
      () => new Float32Array(DIORAMA_MOTE_WINDOW_LINES * moteDensity * 3),
      [moteDensity]
    ),
    moteAttrRef = useRef(null),
    moteWrittenRef = useRef([]);
  useEffect(() => {
    moteWrittenRef.current = [];
  }, [moteCircumference, moteRadial, activeSegKey]);
  const particleKey = `dust-${activeSegKey}-${moteCircumference}x${moteRadial}`,
    activeResolved = resolveGlobal(sequencer, globalIndex),
    activeLine = (_e = activeResolved == null ? void 0 : activeResolved.line) != null ? _e : null,
    activeEntry = useMemo(() => {
      var _a2;
      return (_a2 = visibleLines.find((entry) => entry.index === globalIndex)) != null ? _a2 : null;
    }, [visibleLines, globalIndex]),
    activeLineTimeline = useMemo(
      () => (activeLine ? buildLineGraphemeTimeline(activeLine) : []),
      [activeLine]
    ),
    activeLineUnits = useMemo(
      () => splitDioramaLyricUnits(activeLine, activeLineTimeline),
      [activeLine, activeLineTimeline]
    ),
    keywordMatchers = useMemo(
      () => prepareDioramaKeywordMatchers(theme.wordColors, keywordColoringEnabled),
      [theme.wordColors, keywordColoringEnabled]
    ),
    keywordUnitColors = useMemo(() => {
      var _a2;
      return resolveDioramaKeywordUnitColors(
        (_a2 = activeLine == null ? void 0 : activeLine.fullText) != null ? _a2 : '',
        activeLineUnits,
        keywordMatchers,
        colorTargets.primary,
        colorTargets.accent,
        colorTargets.bg
      );
    }, [activeLine, activeLineUnits, keywordMatchers, colorTargets]),
    activeUnitsRaster = useMemo(
      () => layoutDioramaActiveUnits(activeLine, activeLineUnits, fontSpec),
      [activeLine, activeLineUnits, fontSpec]
    );
  useEffect(() => {
    const current = activeUnitsRaster;
    return () => {
      current == null ||
        current.units.forEach((u) => {
          (u.raster.baseTexture.dispose(), u.raster.glowTexture.dispose());
        });
    };
  }, [activeUnitsRaster]);
  const lineRasterCacheRef = useRef(null);
  lineRasterCacheRef.current || (lineRasterCacheRef.current = new DioramaLineRasterCache());
  const lineRasters = lineRasterCacheRef.current,
    [, bumpNeighborTick] = useState(0);
  (useEffect(
    () =>
      lineRasters.sync({
        visibleLines,
        globalIndex,
        fontSpec,
        fontStack,
        fontWeight,
        linesEpoch,
        onChange: () => bumpNeighborTick((v) => v + 1),
      }),
    [visibleLines, globalIndex, fontSpec, fontStack, fontWeight, linesEpoch, lineRasters]
  ),
    useEffect(
      () => () => {
        lineRasters.disposeAll();
      },
      [lineRasters]
    ),
    transitionOutgoingIndex != null &&
      lineRasters.ensureOutgoing(transitionOutgoingIndex, visibleLines, fontStack, fontWeight));
  const scene = useThree((state) => state.scene);
  return (
    useEffect(() => {
      const previous = scene.fog;
      return (
        (scene.fog = new THREE.Fog(colorTargets.bg.getHex(), FOG_NEAR, FOG_FAR)),
        () => {
          scene.fog = previous;
        }
      );
    }, [scene]),
    /* @__PURE__ */ React.createElement(
      'group',
      null,
      showParticles &&
        /* @__PURE__ */ React.createElement(
          'points',
          { key: particleKey, ref: pointsRef, frustumCulled: !1 },
          /* @__PURE__ */ React.createElement(
            'bufferGeometry',
            null,
            /* @__PURE__ */ React.createElement('bufferAttribute', {
              ref: moteAttrRef,
              attach: 'attributes-position',
              args: [motePositions, 3],
            })
          ),
          /* @__PURE__ */ React.createElement('pointsMaterial', {
            ref: pointsMatRef,
            size: 0.03,
            sizeAttenuation: !0,
            transparent: !0,
            opacity: 0.2,
            depthWrite: !1,
            color: colors.secondary,
            blending: THREE.NormalBlending,
          })
        ),
      (geometryMode === 'corridor' ? corridorSpans.length > 0 : particleClusters.length > 0) &&
        /* @__PURE__ */ React.createElement(DioramaParticleField, {
          mode: geometryMode,
          clusters: particleClusters,
          corridorSpans,
          density: particleDensity,
          particleGlowEnabled,
          particleGlowIntensity,
          currentTime,
          audioPower,
          audioBands,
          audioLevel: motion.audioLevel,
          primaryColor: colors.primary,
          accentColor: colors.accent,
          secondaryColor: colors.secondary,
          backgroundColor: theme.backgroundColor,
          transitionActive: transitionOutgoingIndex != null,
          readHeadLine: globalIndex,
          resetKey: activeSegKey,
        }),
      showLyrics &&
        visibleLines.map(({ index, line, position, quaternion, isOutgoing }) => {
          if (!(line != null && line.fullText) || index === globalIndex) return null;
          const offset = index - globalIndex,
            initialOpacity = isOutgoing
              ? resolveOutgoingLineOpacity(
                  index - (transitionOutgoingIndex != null ? transitionOutgoingIndex : index)
                )
              : resolveNeighborLineOpacity(offset);
          if (initialOpacity <= 0) return null;
          const raster = lineRasters.get(index);
          if (!raster) return null;
          const worldPerPx = LINE_FONT_SIZE / raster.fontPx,
            initialColor = isOutgoing || offset < 0 ? colors.primary : colors.secondary;
          return /* @__PURE__ */ React.createElement(
            'mesh',
            {
              key: index,
              ref: (el) => {
                el ? lineMeshRefs.current.set(index, el) : lineMeshRefs.current.delete(index);
              },
              position,
              quaternion,
              renderOrder: 0,
            },
            /* @__PURE__ */ React.createElement('planeGeometry', {
              args: [raster.canvasWidthPx * worldPerPx, raster.canvasHeightPx * worldPerPx],
            }),
            /* @__PURE__ */ React.createElement('meshBasicMaterial', {
              ref: (el) => {
                el ? lineMatRefs.current.set(index, el) : lineMatRefs.current.delete(index);
              },
              map: raster.texture,
              transparent: !0,
              opacity: initialOpacity,
              depthWrite: !1,
              color: initialColor,
            })
          );
        }),
      showLyrics &&
        (activeLine == null ? void 0 : activeLine.fullText) &&
        activeEntry &&
        activeUnitsRaster &&
        /* @__PURE__ */ React.createElement(
          'group',
          {
            key: globalIndex,
            ref: unitsGroupRef,
            position: activeEntry.position,
            quaternion: activeEntry.quaternion,
          },
          /* @__PURE__ */ React.createElement(DioramaActiveUnitPlanes, {
            units: activeUnitsRaster.units,
            planes: unitPlanesRef.current,
            primaryColor: colors.primary,
            accentColor: colors.accent,
          })
        )
    )
  );
};
var stdin_default = DioramaScene;
export { stdin_default as default };
