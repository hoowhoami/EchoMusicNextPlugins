// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import * as THREE from './three.mjs';
import {
  DIORAMA_PARTICLE_DENSITY_MAX,
  DIORAMA_PARTICLE_DENSITY_MIN,
  DIORAMA_PARTICLE_DENSITY_STEP,
} from './defaults.mjs';
import {
  DIORAMA_PARTICLE_AUDIO_SCALE_MAX,
  DIORAMA_STEP_DISTANCE,
  hashSeed,
  seededUnit,
} from './cameraPath.mjs';
import { DIORAMA_PARTICLE_CORRIDOR_RADIUS } from './dioramaParticleCorridor.mjs';
import { buildDioramaStructuredSurface } from './dioramaParticleSurfaces.mjs';
const DIORAMA_MAX_PARTICLE_POINTS = 65536,
  DIORAMA_MAX_CLOUD_POINTS_PER_CLUSTER = 1024,
  DIORAMA_MAX_CORRIDOR_POINTS_PER_SPAN = 2048,
  FAMILY_INDEX = {
    box: 0,
    sphere: 1,
    cone: 2,
    torus: 3,
  },
  normalizeDensity = (density) => {
    const clamped = Math.min(
      DIORAMA_PARTICLE_DENSITY_MAX,
      Math.max(DIORAMA_PARTICLE_DENSITY_MIN, density)
    );
    return Math.max(
      DIORAMA_PARTICLE_DENSITY_MIN,
      Math.floor(clamped / DIORAMA_PARTICLE_DENSITY_STEP) * DIORAMA_PARTICLE_DENSITY_STEP
    );
  },
  resolveWaveNumberMax = (spacing) => (Math.PI * 2) / Math.max(1e-4, spacing * 4),
  allocate = (pointCount, pointsPerUnit, spacing) => ({
    positions: new Float32Array(pointCount * 3),
    normals: new Float32Array(pointCount * 3),
    anchors: new Float32Array(pointCount * 3),
    scales: new Float32Array(pointCount * 3),
    phases: new Float32Array(pointCount),
    styles: new Float32Array(pointCount * 3),
    waves: new Float32Array(pointCount * 2),
    pointCount,
    pointsPerUnit,
    spacing,
  }),
  writeStyle = (data, index, family, colorSlot, isFar) => {
    const offset = index * 3;
    ((data.styles[offset] = family),
      (data.styles[offset + 1] = colorSlot),
      (data.styles[offset + 2] = isFar));
  },
  buildDioramaCloudGeometryData = (clusters, density) => {
    const budget = normalizeDensity(Math.min(density, DIORAMA_MAX_CLOUD_POINTS_PER_CLUSTER)),
      surfaces = clusters.map((cluster) =>
        buildDioramaStructuredSurface(cluster.kind, budget, cluster.stretchY)
      ),
      pointCount = surfaces.reduce((sum, surface) => sum + surface.count, 0),
      spacing = surfaces.reduce((widest, surface) => Math.max(widest, surface.spacing), 0),
      data = allocate(pointCount, budget, spacing);
    let target = 0;
    return (
      clusters.forEach((cluster, clusterIndex) => {
        const surface = surfaces[clusterIndex],
          seed = hashSeed(`${cluster.particleSeed}|${cluster.kind}`),
          clusterPhase = seededUnit(seed + 31) * Math.PI * 2,
          family = FAMILY_INDEX[cluster.kind],
          isFar = cluster.layer === 'far' ? 1 : 0;
        for (let pointIndex = 0; pointIndex < surface.count; pointIndex += 1, target += 1) {
          const v = target * 3,
            s = target * 3,
            px = surface.positions[pointIndex * 3],
            py = surface.positions[pointIndex * 3 + 1],
            pz = surface.positions[pointIndex * 3 + 2];
          ((data.positions[v] = px),
            (data.positions[v + 1] = py),
            (data.positions[v + 2] = pz),
            (data.normals[v] = surface.normals[pointIndex * 3]),
            (data.normals[v + 1] = surface.normals[pointIndex * 3 + 1]),
            (data.normals[v + 2] = surface.normals[pointIndex * 3 + 2]),
            (data.anchors[v] = cluster.position.x),
            (data.anchors[v + 1] = cluster.position.y),
            (data.anchors[v + 2] = cluster.position.z),
            (data.scales[s] = cluster.scale),
            (data.scales[s + 1] = cluster.stretchY),
            (data.scales[s + 2] = surface.radius),
            (data.phases[target] = clusterPhase),
            (data.waves[target * 2] = clusterPhase + (px + pz * 0.6) * 2.2),
            (data.waves[target * 2 + 1] = clusterPhase * 0.7 + py * 2.6),
            writeStyle(data, target, family, cluster.colorSlot, isFar));
        }
      }),
      data
    );
  },
  normalizeVec = (x, y, z) => {
    const length = Math.hypot(x, y, z) || 1;
    return { x: x / length, y: y / length, z: z / length };
  },
  resolveRingSegments = (pointsPerSpan) =>
    Math.max(12, Math.min(256, Math.round(Math.sqrt(pointsPerSpan * 2.4)))),
  buildDioramaCorridorGeometryData = (
    spans,
    density,
    radius = DIORAMA_PARTICLE_CORRIDOR_RADIUS
  ) => {
    const activeSpans = spans.filter((span) => span.enabled),
      spanCount = activeSpans.length,
      pointsPerSpan = normalizeDensity(Math.min(density, DIORAMA_MAX_CORRIDOR_POINTS_PER_SPAN)),
      ringSegments = resolveRingSegments(pointsPerSpan),
      rings = Math.max(1, Math.floor(pointsPerSpan / ringSegments)),
      perSpan = ringSegments * rings,
      pointCount = spanCount * perSpan,
      spanUnits = DIORAMA_STEP_DISTANCE / radius,
      spacing = Math.max(spanUnits / Math.max(1, rings), (Math.PI * 2) / ringSegments),
      data = allocate(pointCount, perSpan, spacing);
    let target = 0;
    return (
      activeSpans.forEach((span) => {
        for (let ring = 0; ring < rings; ring += 1) {
          const t = rings > 1 ? ring / (rings - 1) : 0.5,
            cx = span.start.x + (span.end.x - span.start.x) * t,
            cy = span.start.y + (span.end.y - span.start.y) * t,
            cz = span.start.z + (span.end.z - span.start.z) * t,
            right = normalizeVec(
              span.startRight.x + (span.endRight.x - span.startRight.x) * t,
              span.startRight.y + (span.endRight.y - span.startRight.y) * t,
              span.startRight.z + (span.endRight.z - span.startRight.z) * t
            ),
            up = normalizeVec(
              span.startUp.x + (span.endUp.x - span.startUp.x) * t,
              span.startUp.y + (span.endUp.y - span.startUp.y) * t,
              span.startUp.z + (span.endUp.z - span.startUp.z) * t
            ),
            longitudinal = span.pathStart + t;
          for (let segment = 0; segment < ringSegments; segment += 1) {
            const angle = (segment / ringSegments) * Math.PI * 2,
              cos = Math.cos(angle),
              sin = Math.sin(angle),
              radial = normalizeVec(
                right.x * cos + up.x * sin,
                right.y * cos + up.y * sin,
                right.z * cos + up.z * sin
              ),
              v = target * 3,
              s = target * 3;
            ((data.positions[v] = radial.x * radius),
              (data.positions[v + 1] = radial.y * radius),
              (data.positions[v + 2] = radial.z * radius),
              (data.normals[v] = radial.x),
              (data.normals[v + 1] = radial.y),
              (data.normals[v + 2] = radial.z),
              (data.anchors[v] = cx),
              (data.anchors[v + 1] = cy),
              (data.anchors[v + 2] = cz),
              (data.scales[s] = 1),
              (data.scales[s + 1] = 1),
              (data.scales[s + 2] = radius),
              (data.phases[target] = longitudinal * 1.7),
              (data.waves[target * 2] = longitudinal * spanUnits),
              (data.waves[target * 2 + 1] = angle),
              writeStyle(data, target, 3, (Math.round(span.pathStart) + ring) % 2, 0),
              (target += 1));
          }
        }
      }),
      data
    );
  },
  createDioramaBufferGeometry = (data) => {
    const geometry = new THREE.BufferGeometry();
    return (
      geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3)),
      geometry.setAttribute('aNormal', new THREE.BufferAttribute(data.normals, 3)),
      geometry.setAttribute('aAnchor', new THREE.BufferAttribute(data.anchors, 3)),
      geometry.setAttribute('aScale', new THREE.BufferAttribute(data.scales, 3)),
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1)),
      geometry.setAttribute('aStyle', new THREE.BufferAttribute(data.styles, 3)),
      geometry.setAttribute('aWave', new THREE.BufferAttribute(data.waves, 2)),
      geometry.setDrawRange(0, data.pointCount),
      geometry
    );
  },
  stepDioramaEnvelope = (current, target, attack, release, delta) =>
    current + (target - current) * (1 - Math.exp(-(target > current ? attack : release) * delta)),
  clamp01 = (value) => Math.min(1, Math.max(0, value)),
  createDioramaBandTracker = () => ({
    fast: 0,
    floor: 0,
    peak: 0,
    armed: !1,
    primed: !1,
  }),
  FAST_ATTACK = 22,
  FAST_RELEASE = 7,
  FLOOR_RISE = 2.5,
  FLOOR_FALL = 4,
  PEAK_RISE = 9,
  PEAK_FALL = 0.28,
  MIN_RANGE = 0.12,
  MIN_PEAK = 0.22,
  TRIGGER_HIGH = 0.42,
  TRIGGER_LOW = 0.2,
  stepDioramaBandTracker = (state, level, delta) => {
    const safe = clamp01(level);
    state.primed
      ? ((state.fast = stepDioramaEnvelope(state.fast, safe, FAST_ATTACK, FAST_RELEASE, delta)),
        (state.floor = stepDioramaEnvelope(state.floor, safe, FLOOR_RISE, FLOOR_FALL, delta)),
        (state.peak = stepDioramaEnvelope(state.peak, safe, PEAK_RISE, PEAK_FALL, delta)))
      : ((state.fast = safe), (state.floor = safe), (state.peak = safe), (state.primed = !0));
    const range = Math.max(MIN_RANGE, state.peak - state.floor),
      transient = clamp01((state.fast - state.floor) / range),
      sustained = clamp01(state.fast / Math.max(MIN_PEAK, state.peak));
    let onset = !1;
    return (
      !state.armed && transient >= TRIGGER_HIGH
        ? ((state.armed = !0), (onset = !0))
        : state.armed && transient <= TRIGGER_LOW && (state.armed = !1),
      { transient, sustained, onset }
    );
  },
  RIPPLE_BANDS = [
    { band: 'bass', strength: 1.45, speed: 0.9, width: 0.66, wavenumber: 3.4 },
    { band: 'mid', strength: 0.9, speed: 1.6, width: 0.36, wavenumber: 5.5 },
    { band: 'treble', strength: 0.5, speed: 2.5, width: 0.22, wavenumber: 9 },
  ],
  RIPPLE_SLOTS_PER_BAND = 3,
  DIORAMA_RIPPLE_COUNT = RIPPLE_BANDS.length * RIPPLE_SLOTS_PER_BAND,
  smoothstep = (edge0, edge1, value) => {
    const amount = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return amount * amount * (3 - 2 * amount);
  },
  resolveDioramaParticleAudioResponse = (bass, mid) => ({
    flowSpeed: Math.min(1.55, 0.3 + clamp01(bass.sustained) * 1.25),
    clusterPulse: Math.min(
      DIORAMA_PARTICLE_AUDIO_SCALE_MAX,
      1 + smoothstep(0.1, 0.9, bass.transient) * 0.14 + smoothstep(0.15, 0.95, mid.transient) * 0.05
    ),
  }),
  DIORAMA_CORRIDOR_PULSE_SHARE = 0.12,
  resolveDioramaPulseTarget = (clusterPulse, gain, isCorridor) =>
    1 + (clusterPulse - 1) * gain * (isCorridor ? DIORAMA_CORRIDOR_PULSE_SHARE : 1),
  createDioramaParticleElasticState = () => ({
    value: 1,
    velocity: 0,
  }),
  stepDioramaParticleElasticResponse = (state, target, delta) => {
    let remaining = Math.min(0.1, Math.max(0, delta));
    const safeTarget = Math.min(DIORAMA_PARTICLE_AUDIO_SCALE_MAX, Math.max(0.9, target));
    for (; remaining > 0;) {
      const step = Math.min(0.004166666666666667, remaining),
        acceleration = (safeTarget - state.value) * 150 - state.velocity * 15;
      ((state.velocity += acceleration * step),
        (state.value += state.velocity * step),
        (remaining -= step));
    }
    return (
      (state.value = Math.min(DIORAMA_PARTICLE_AUDIO_SCALE_MAX, Math.max(0.9, state.value))),
      state.value
    );
  };
export {
  DIORAMA_CORRIDOR_PULSE_SHARE,
  DIORAMA_MAX_PARTICLE_POINTS,
  DIORAMA_RIPPLE_COUNT,
  RIPPLE_BANDS,
  RIPPLE_SLOTS_PER_BAND,
  buildDioramaCloudGeometryData,
  buildDioramaCorridorGeometryData,
  createDioramaBandTracker,
  createDioramaBufferGeometry,
  createDioramaParticleElasticState,
  resolveDioramaParticleAudioResponse,
  resolveDioramaPulseTarget,
  resolveWaveNumberMax,
  stepDioramaBandTracker,
  stepDioramaEnvelope,
  stepDioramaParticleElasticResponse,
};
