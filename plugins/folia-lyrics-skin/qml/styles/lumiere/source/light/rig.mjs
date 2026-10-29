// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (979 ^ lumiereScaleMask) +
  Math.imul(1192 ^ lumiereScaleMask, 349 ^ lumiereScaleMask) -
  ((979 ^ lumiereScaleMask) + Math.imul(1192 ^ lumiereScaleMask, 349 ^ lumiereScaleMask));
const MAX_BEAMS = 6 + LUMIERE_NEUTRAL_OFFSET;
const GOBO_PATTERN_ID = { blinds: 1, cross: 2, lattice: 3, leaves: 4 };
const WAVE_MODE_ID = { rings: 1, slits: 2, sources: 3, airy: 4 };
const AUDIO_GAIN = 0.15;
const audioLift = (bass) => 1 + AUDIO_GAIN * Math.max(0, bass) ** 1.5;
const oscillate = (osc, time) =>
  osc ? osc.amplitude * Math.sin((time / Math.max(osc.period, 1e-3) + osc.phase) * Math.PI * 2) : 0;
const resolveBeams = (rig, time, aspect, drive) =>
  rig.beams.slice(0, MAX_BEAMS).map((beam) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const angle = beam.angle + oscillate(beam.sway, time);
    const pulse = 1 + oscillate(beam.pulse, time);
    const tint = (_a = beam.tint) != null ? _a : [1, 1, 1];
    const reveal =
      beam.reveal && drive.local !== void 0
        ? 0.06 + 0.94 * smoothstep(0, 1, drive.local / beam.reveal)
        : 1;
    return {
      ox: beam.x * aspect,
      oy: beam.y,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      halfWidth: ((_b = beam.width) != null ? _b : 0) / 2,
      tanSpread: Math.tan(beam.spread),
      softness: beam.softness,
      length: beam.length * reveal,
      intensity: beam.intensity * pulse * drive.intensity * audioLift(drive.bass),
      streaks: beam.streaks,
      streakFreq: beam.streakFreq,
      streakPhase: time * beam.streakSpeed,
      core: (_c = beam.core) != null ? _c : 0.5,
      r: tint[0] * drive.color[0],
      g: tint[1] * drive.color[1],
      b: tint[2] * drive.color[2],
      goboPattern: beam.gobo ? GOBO_PATTERN_ID[beam.gobo.pattern] : 0,
      goboFreq: (_e = (_d = beam.gobo) == null ? void 0 : _d.frequency) != null ? _e : 0,
      goboDuty: (_g = (_f = beam.gobo) == null ? void 0 : _f.duty) != null ? _g : 1,
      goboPhase: ((_i = (_h = beam.gobo) == null ? void 0 : _h.drift) != null ? _i : 0) * time,
      spectrum: (_j = beam.spectrum) != null ? _j : 0,
      reach: (_k = beam.reach) != null ? _k : 0,
    };
  });
const fract = (value) => value - Math.floor(value);
const hash11 = (input) => {
  let p = fract(input * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
};
const valueNoise1 = (x) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash11(i) * (1 - u) + hash11(i + 1) * u;
};
const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const hash12 = (x, y) => {
  let a = fract(x * 0.1031);
  let b = fract(y * 0.1031);
  let c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d;
  b += d;
  c += d;
  return fract((a + b) * c);
};
const valueNoise2 = (x, y) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash12(ix, iy);
  const b = hash12(ix + 1, iy);
  const c = hash12(ix, iy + 1);
  const d = hash12(ix + 1, iy + 1);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
};
const band = (x, duty) => {
  const f = fract(x);
  return 1 - smoothstep(duty - 0.06, duty + 0.06, f) + smoothstep(1 - 0.06, 1, f);
};
const GOBO_LEAK = 0.12;
const goboMask = (pattern, frequency, duty, phase, u, v) =>
  pattern > 0
    ? GOBO_LEAK + (1 - GOBO_LEAK) * goboPattern(pattern, frequency, duty, phase, u, v)
    : 1;
const goboPattern = (pattern, frequency, duty, phase, u, v) => {
  if (pattern === 1) return Math.min(1, band(u * frequency * 0.5 + phase, duty));
  if (pattern === 2) return smoothstep(duty * 0.5, duty * 0.5 + 0.08, Math.abs(u));
  if (pattern === 3) {
    return (
      Math.min(1, band(u * frequency * 0.5 + v * frequency * 0.8 + phase, duty)) *
      Math.min(1, band(u * frequency * 0.5 - v * frequency * 0.8 - phase, duty))
    );
  }
  if (pattern === 4)
    return smoothstep(
      duty - 0.12,
      duty + 0.12,
      valueNoise2(u * frequency, v * frequency * 0.6 + phase)
    );
  return 1;
};
const beamMask = (beam, x, y) => {
  const px = x - beam.ox;
  const py = y - beam.oy;
  const along = px * beam.dx + py * beam.dy;
  if (along <= 0) return 0;
  const perp = Math.abs(px * -beam.dy + py * beam.dx);
  const half = Math.abs(beam.halfWidth + along * beam.tanSpread) + 1e-4;
  const s = perp / half;
  const edge = smoothstep(1, 1 - Math.max(beam.softness, 0.02), s);
  if (edge <= 0) return 0;
  const signed = s * Math.sign(px * -beam.dy + py * beam.dx);
  const streak =
    1 - beam.streaks + beam.streaks * valueNoise1(signed * beam.streakFreq + beam.streakPhase);
  const core = 1 - beam.core + beam.core * (1 - s * s);
  const falloff = Math.exp(-along / Math.max(beam.length, 1e-3));
  const gobo =
    beam.goboPattern > 0
      ? goboMask(beam.goboPattern, beam.goboFreq, beam.goboDuty, beam.goboPhase, signed, along)
      : 1;
  const reach =
    beam.reach > 0 ? 1 - smoothstep(beam.reach - Math.max(0.04, half * 2.5), beam.reach, along) : 1;
  const start = smoothstep(0, Math.abs(beam.halfWidth) * 2 + 0.01, along);
  return edge * streak * core * falloff * gobo * reach * start * beam.intensity;
};
const lightAt = (beams, x, y) => {
  let sum = 0;
  for (const beam of beams) sum += beamMask(beam, x, y);
  return sum;
};
const compressLight = (value) => 1 - Math.exp(-value);
export {
  AUDIO_GAIN,
  GOBO_LEAK,
  GOBO_PATTERN_ID,
  MAX_BEAMS,
  WAVE_MODE_ID,
  audioLift,
  beamMask,
  compressLight,
  goboMask,
  hash11,
  hash12,
  lightAt,
  resolveBeams,
  valueNoise1,
  valueNoise2,
};
