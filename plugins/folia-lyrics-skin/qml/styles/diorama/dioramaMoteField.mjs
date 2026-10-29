// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import {
  DIORAMA_MOTE_CIRCUMFERENCE_MAX,
  DIORAMA_MOTE_CIRCUMFERENCE_MIN,
  DIORAMA_MOTE_RADIAL_MAX,
  DIORAMA_MOTE_RADIAL_MIN,
  DEFAULT_DIORAMA_TUNING,
} from './defaults.mjs';
import { composeLocal, DIORAMA_STEP_DISTANCE, hashSeed, seededUnit } from './cameraPath.mjs';
const DIORAMA_MOTE_LINES_BEHIND = 2,
  DIORAMA_MOTE_LINES_AHEAD = 5,
  DIORAMA_MOTE_WINDOW_LINES = DIORAMA_MOTE_LINES_BEHIND + DIORAMA_MOTE_LINES_AHEAD + 1,
  DIORAMA_MOTE_MAX_POINTS =
    DIORAMA_MOTE_WINDOW_LINES * DIORAMA_MOTE_CIRCUMFERENCE_MAX * DIORAMA_MOTE_RADIAL_MAX,
  resolveDioramaMoteCircumference = (requested) =>
    Math.round(
      Math.min(
        DIORAMA_MOTE_CIRCUMFERENCE_MAX,
        Math.max(
          DIORAMA_MOTE_CIRCUMFERENCE_MIN,
          Number.isFinite(requested)
            ? requested
            : DEFAULT_DIORAMA_TUNING.backgroundParticleCircumference
        )
      )
    ),
  resolveDioramaMoteRadial = (requested) =>
    Math.round(
      Math.min(
        DIORAMA_MOTE_RADIAL_MAX,
        Math.max(
          DIORAMA_MOTE_RADIAL_MIN,
          Number.isFinite(requested) ? requested : DEFAULT_DIORAMA_TUNING.backgroundParticleRadial
        )
      )
    ),
  resolveDioramaMoteCount = (circumference, radial) =>
    resolveDioramaMoteCircumference(circumference) * resolveDioramaMoteRadial(radial),
  dioramaMoteSlot = (line) =>
    ((line % DIORAMA_MOTE_WINDOW_LINES) + DIORAMA_MOTE_WINDOW_LINES) % DIORAMA_MOTE_WINDOW_LINES,
  MOTE_INNER_RADIUS = 2.4,
  MOTE_RADIAL_SPAN = 5.2,
  MOTE_VERTICAL_SQUASH = 0.64,
  radicalInverse = (index, base) => {
    let result = 0,
      fraction = 1 / base,
      i = index;
    for (; i > 0;)
      ((result += (i % base) * fraction), (i = Math.floor(i / base)), (fraction /= base));
    return result;
  },
  extendDioramaFrame = (frame, steps) =>
    steps === 0
      ? frame
      : {
          position: {
            x: frame.position.x + frame.forward.x * DIORAMA_STEP_DISTANCE * steps,
            y: frame.position.y + frame.forward.y * DIORAMA_STEP_DISTANCE * steps,
            z: frame.position.z + frame.forward.z * DIORAMA_STEP_DISTANCE * steps,
          },
          forward: frame.forward,
          right: frame.right,
          up: frame.up,
        },
  writeDioramaMoteLine = (out, frame, line, circumference, radial, seed) => {
    const base = hashSeed(seed),
      goldenAngle = Math.PI * (3 - Math.sqrt(5)),
      twoPi = Math.PI * 2,
      phase = seededUnit(base + 991) * twoPi,
      total = circumference * radial;
    let write = dioramaMoteSlot(line) * total * 3;
    for (let ri = 0; ri < radial; ri += 1)
      for (let ci = 0; ci < circumference; ci += 1) {
        const p = ri * circumference + ci,
          s = base + line * 131 + p * 17,
          stratum = (ri + 0.35 + seededUnit(s + 4) * 0.3) / radial,
          radius = MOTE_INNER_RADIUS + Math.sqrt(stratum) * MOTE_RADIAL_SPAN,
          angle =
            phase +
            (line + ri) * goldenAngle +
            (ci / circumference) * twoPi +
            (seededUnit(s + 3) - 0.5) * (twoPi / circumference),
          depth =
            (radicalInverse(p + 1, 2) + (seededUnit(s + 2) - 0.5) / total - 0.5) *
            DIORAMA_STEP_DISTANCE,
          point = composeLocal(
            frame,
            Math.cos(angle) * radius,
            Math.sin(angle) * radius * MOTE_VERTICAL_SQUASH,
            depth
          );
        ((out[write] = point.x),
          (out[write + 1] = point.y),
          (out[write + 2] = point.z),
          (write += 3));
      }
  };
export {
  DIORAMA_MOTE_LINES_AHEAD,
  DIORAMA_MOTE_LINES_BEHIND,
  DIORAMA_MOTE_MAX_POINTS,
  DIORAMA_MOTE_WINDOW_LINES,
  dioramaMoteSlot,
  extendDioramaFrame,
  resolveDioramaMoteCircumference,
  resolveDioramaMoteCount,
  resolveDioramaMoteRadial,
  writeDioramaMoteLine,
};
