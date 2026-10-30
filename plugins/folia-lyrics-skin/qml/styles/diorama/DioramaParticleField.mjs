// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import React, { useEffect, useMemo, useRef } from './react.mjs';
import { useFrame } from './react.mjs';
import * as THREE from './three.mjs';
import { DIORAMA_STEP_DISTANCE, hashSeed, seededUnit } from './cameraPath.mjs';
import { DIORAMA_PARTICLE_CORRIDOR_RADIUS } from './dioramaParticleCorridor.mjs';
import {
  buildDioramaCloudGeometryData,
  buildDioramaCorridorGeometryData,
  createDioramaBufferGeometry,
  createDioramaBandTracker,
  createDioramaParticleElasticState,
  DIORAMA_RIPPLE_COUNT,
  resolveDioramaParticleAudioResponse,
  resolveDioramaPulseTarget,
  resolveWaveNumberMax,
  RIPPLE_BANDS,
  RIPPLE_SLOTS_PER_BAND,
  stepDioramaBandTracker,
  stepDioramaEnvelope,
  stepDioramaParticleElasticResponse,
} from './dioramaParticleModel.mjs';
import {
  createDioramaParticleGlowMaterial,
  createDioramaParticleMaterial,
  lerpDioramaParticleMaterialColors,
  resolveDioramaParticleContrastColors,
} from './dioramaParticleMaterials.mjs';
const createRipplePool = () => ({
    sources: new Float32Array(DIORAMA_RIPPLE_COUNT * 4),
    shapes: new Float32Array(DIORAMA_RIPPLE_COUNT * 4),
    cursor: RIPPLE_BANDS.map(() => 0),
    spawned: 0,
  }),
  CORRIDOR_UNITS_PER_LINE = DIORAMA_STEP_DISTANCE / DIORAMA_PARTICLE_CORRIDOR_RADIUS,
  spawnRipple = (pool, bandIndex, strength, now, corridor, readHeadAlong) => {
    const seed = hashSeed(`diorama-ripple:${pool.spawned}`),
      preset = RIPPLE_BANDS[bandIndex],
      height = seededUnit(seed + 1),
      spread = seededUnit(seed + 2),
      pace = seededUnit(seed + 3),
      cursor = pool.cursor[bandIndex],
      offset = (bandIndex * RIPPLE_SLOTS_PER_BAND + cursor) * 4;
    if (corridor)
      ((pool.sources[offset] = readHeadAlong + 0.4 + seededUnit(seed + 4) * 2.2),
        (pool.sources[offset + 1] = seededUnit(seed + 5) * Math.PI * 2),
        (pool.sources[offset + 2] = 0));
    else {
      const up = seededUnit(seed + 4) * 2 - 1,
        around = seededUnit(seed + 5) * Math.PI * 2,
        ring = Math.sqrt(Math.max(0, 1 - up * up));
      ((pool.sources[offset] = ring * Math.cos(around)),
        (pool.sources[offset + 1] = up),
        (pool.sources[offset + 2] = ring * Math.sin(around)));
    }
    ((pool.sources[offset + 3] = now),
      (pool.shapes[offset] = preset.strength * strength * (0.7 + height * 0.6)),
      (pool.shapes[offset + 1] = preset.speed * (0.8 + pace * 0.45)),
      (pool.shapes[offset + 2] = preset.width * (0.78 + spread * 0.5)),
      (pool.shapes[offset + 3] = preset.wavenumber),
      (pool.cursor[bandIndex] = (cursor + 1) % RIPPLE_SLOTS_PER_BAND),
      (pool.spawned += 1));
  },
  FORMATION_SETTLE_SECONDS = 0.4,
  CLOUD_SWELL = 0.34,
  CORRIDOR_MAX_SWELL = 0.45,
  CORRIDOR_QUIET_SWELL = 0.1,
  MAX_WAVE = 0.85,
  CLOUD_MAX_SWELL = MAX_WAVE * CLOUD_SWELL,
  CORRIDOR_MAX_SWELL_REACH = MAX_WAVE * CORRIDOR_MAX_SWELL,
  DioramaParticleField = ({
    mode,
    clusters,
    corridorSpans,
    density,
    particleGlowEnabled,
    particleGlowIntensity,
    currentTime,
    audioBands,
    audioLevel,
    primaryColor,
    accentColor,
    secondaryColor,
    backgroundColor,
    transitionActive,
    readHeadLine,
    resetKey,
  }) => {
    const built = useMemo(() => {
        const data =
          mode === 'corridor'
            ? buildDioramaCorridorGeometryData(corridorSpans, density)
            : buildDioramaCloudGeometryData(clusters, density);
        return {
          geometry: createDioramaBufferGeometry(data),
          waveNumberMax: resolveWaveNumberMax(data.spacing),
        };
      }, [mode, clusters, corridorSpans, density]),
      { geometry, waveNumberMax } = built,
      targetColors = useMemo(
        () =>
          resolveDioramaParticleContrastColors(
            {
              primary: new THREE.Color(primaryColor),
              accent: new THREE.Color(accentColor),
              secondary: new THREE.Color(secondaryColor),
            },
            new THREE.Color(backgroundColor)
          ),
        [primaryColor, accentColor, secondaryColor, backgroundColor]
      ),
      materialRef = useRef(null);
    materialRef.current === null &&
      (materialRef.current = createDioramaParticleMaterial(targetColors));
    const material = materialRef.current,
      glowMaterialRef = useRef(null);
    glowMaterialRef.current === null &&
      (glowMaterialRef.current = createDioramaParticleGlowMaterial(
        targetColors,
        particleGlowIntensity
      ));
    const glowMaterial = glowMaterialRef.current,
      trackersRef = useRef(RIPPLE_BANDS.map(() => createDioramaBandTracker())),
      ripplesRef = useRef(createRipplePool()),
      flowTimeRef = useRef(0),
      previousPlaybackTimeRef = useRef(null),
      drawingBufferSizeRef = useRef(new THREE.Vector2()),
      elasticStateRef = useRef(createDioramaParticleElasticState()),
      formationRef = useRef(1),
      lockedSecondsRef = useRef(FORMATION_SETTLE_SECONDS);
    return (
      useEffect(
        () => () => {
          geometry.dispose();
        },
        [geometry]
      ),
      useEffect(
        () => () => {
          (material.dispose(), glowMaterial.dispose());
        },
        [glowMaterial, material]
      ),
      useEffect(() => {
        glowMaterial.uniforms.uGlow.value = particleGlowIntensity;
      }, [glowMaterial, particleGlowIntensity]),
      useEffect(() => {
        ((previousPlaybackTimeRef.current = null),
          (elasticStateRef.current = createDioramaParticleElasticState()),
          (ripplesRef.current = createRipplePool()),
          (trackersRef.current = RIPPLE_BANDS.map(() => createDioramaBandTracker())));
      }, [resetKey]),
      useFrame((frameState, rawDelta) => {
        const delta = Math.min(rawDelta, 0.1),
          bassTarget = Math.min(1, audioBands.bass.get() / 255),
          midTarget = Math.min(
            1,
            (audioBands.lowMid.get() * 0.5 + audioBands.mid.get() * 0.5) / 255
          ),
          trebleTarget = Math.min(1, audioBands.treble.get() / 255),
          trackers = trackersRef.current,
          bass = stepDioramaBandTracker(trackers[0], bassTarget, delta),
          mid = stepDioramaBandTracker(trackers[1], midTarget, delta),
          treble = stepDioramaBandTracker(trackers[2], trebleTarget, delta),
          bands = [bass, mid, treble],
          response = resolveDioramaParticleAudioResponse(bass, mid),
          gain = Math.max(0, audioLevel),
          playbackTime = Math.max(0, currentTime.get()),
          previousPlaybackTime = previousPlaybackTimeRef.current,
          playbackDelta = previousPlaybackTime == null ? 0 : playbackTime - previousPlaybackTime;
        (previousPlaybackTime == null || playbackDelta < -0.05 || playbackDelta > 0.5
          ? ((flowTimeRef.current = playbackTime * 0.28), (ripplesRef.current = createRipplePool()))
          : playbackDelta > 0 && (flowTimeRef.current += playbackDelta * response.flowSpeed),
          (previousPlaybackTimeRef.current = playbackTime));
        const pool = ripplesRef.current,
          isCorridor = mode === 'corridor',
          readHeadAlong = readHeadLine * CORRIDOR_UNITS_PER_LINE;
        gain > 1e-3 &&
          bands.forEach((signal, index) => {
            signal.onset &&
              spawnRipple(
                pool,
                index,
                signal.transient,
                flowTimeRef.current,
                isCorridor,
                readHeadAlong
              );
          });
        const elasticPulse = stepDioramaParticleElasticResponse(
          elasticStateRef.current,
          resolveDioramaPulseTarget(response.clusterPulse, gain, isCorridor),
          delta
        );
        frameState.gl.getDrawingBufferSize(drawingBufferSizeRef.current);
        const colorAmount = 1 - Math.exp(-1.2 * delta);
        lockedSecondsRef.current = transitionActive
          ? 0
          : Math.min(FORMATION_SETTLE_SECONDS, lockedSecondsRef.current + delta);
        const formationTarget =
          !transitionActive && lockedSecondsRef.current >= FORMATION_SETTLE_SECONDS ? 1 : 0;
        formationRef.current = stepDioramaEnvelope(
          formationRef.current,
          formationTarget,
          1.5,
          3.2,
          delta
        );
        const amplitude =
            gain *
            (isCorridor
              ? Math.min(
                  CORRIDOR_MAX_SWELL,
                  CORRIDOR_QUIET_SWELL + bass.sustained * 0.18 + mid.sustained * 0.08
                )
              : CLOUD_SWELL),
          flow = isCorridor ? 1 : 0,
          scatterDistance = isCorridor ? 6 : 1.4,
          sizeBase = isCorridor ? 0.072 : 0.05,
          sizeGain = isCorridor ? 0.34 : 0.3,
          centroid = Math.min(1, 0.2 + treble.sustained * 0.8),
          viewportHeight = drawingBufferSizeRef.current.y;
        for (const target of [material, glowMaterial]) {
          const u = target.uniforms;
          ((u.uTime.value = flowTimeRef.current),
            (u.uCorridor.value = isCorridor ? 1 : 0),
            (u.uAmplitude.value = amplitude),
            (u.uMaxSwell.value = isCorridor ? CORRIDOR_MAX_SWELL_REACH : CLOUD_MAX_SWELL),
            (u.uWaveNumberMax.value = waveNumberMax),
            (u.uDetail.value = Math.min(1, treble.sustained * gain)),
            (u.uRippleSource.value = pool.sources),
            (u.uRippleShape.value = pool.shapes),
            (u.uOffsetGain.value = mid.sustained * gain),
            (u.uFlow.value = flow),
            (u.uFormation.value = formationRef.current),
            (u.uScatter.value = scatterDistance),
            (u.uSizeBase.value = sizeBase),
            (u.uSizeGain.value = sizeGain),
            (u.uPulse.value = elasticPulse),
            (u.uSpectralCentroid.value = centroid),
            (u.uViewportHeight.value = viewportHeight),
            lerpDioramaParticleMaterialColors(target, targetColors, colorAmount));
        }
      }),
      /* @__PURE__ */ React.createElement(
        React.Fragment,
        null,
        particleGlowEnabled &&
          /* @__PURE__ */ React.createElement('points', {
            geometry,
            material: glowMaterial,
            frustumCulled: !1,
            renderOrder: 3,
          }),
        /* @__PURE__ */ React.createElement('points', {
          geometry,
          material,
          frustumCulled: !1,
          renderOrder: 4,
        })
      )
    );
  };
export { DioramaParticleField };
