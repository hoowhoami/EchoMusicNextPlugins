// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
const LINES_AHEAD = 3,
  LINES_BEHIND = 2,
  OUTGOING_LINES_BEHIND = 2,
  OUTGOING_LINES_AHEAD = 1,
  CORRIDOR_LINES_AHEAD = 7,
  CORRIDOR_LINES_BEHIND = 6,
  NEIGHBOR_RASTER_BUDGET = 2,
  resolveNeighborLineOpacity = (offset) =>
    offset === -1
      ? 0.3
      : offset === -2
        ? 0.1
        : offset === 1
          ? 0.34
          : offset === 2
            ? 0.16
            : offset === 3
              ? 0.06
              : 0,
  resolveOutgoingLineOpacity = (offsetFromOutgoing) =>
    offsetFromOutgoing === 0 ? 0.7 : Math.abs(offsetFromOutgoing) <= 2 ? 0.45 : 0.25,
  LINE_FONT_SIZE = 0.62,
  TARGET_FRAME_WIDTH_FRACTION = 0.72,
  MIN_FIT_SCALE = 0.28,
  DEG_TO_RAD = Math.PI / 180,
  FOG_NEAR = 12,
  FOG_FAR = 30,
  TEXT_DISSOLVE_START = 2,
  TEXT_DISSOLVE_END = 0.9,
  TEXT_FADE_IN_START = 32,
  TEXT_FADE_IN_END = 40,
  COLOR_DAMP_RATE = 1.2,
  ACTIVE_LINE_OPACITY = 0.92,
  UNSUNG_UNIT_OPACITY = 0.5,
  UNIT_GLOW_MAX_OPACITY = 0.9,
  SOUL_MAX_OPACITY = 0.6,
  SOUL_ACTIVE_LIFT_EM = 0.06,
  SOUL_DETACH_LIFT_EM = 0.5,
  SOUL_ACTIVE_SWELL = 0.1,
  SOUL_DETACH_SWELL = 0.3,
  SOUL_HANDOFF_SECONDS = 0.5,
  clamp01 = (value) => Math.min(1, Math.max(0, value)),
  stepEnvelope = (current, target, attack, release, delta) =>
    current + (target - current) * (1 - Math.exp(-(target > current ? attack : release) * delta)),
  smoothstep01 = (t) => t * t * (3 - 2 * t),
  GRADIENT_HOLD_SECONDS = 0.35,
  GRADIENT_TRAIL_SECONDS = 1.8;
export {
  ACTIVE_LINE_OPACITY,
  COLOR_DAMP_RATE,
  CORRIDOR_LINES_AHEAD,
  CORRIDOR_LINES_BEHIND,
  DEG_TO_RAD,
  FOG_FAR,
  FOG_NEAR,
  GRADIENT_HOLD_SECONDS,
  GRADIENT_TRAIL_SECONDS,
  LINES_AHEAD,
  LINES_BEHIND,
  LINE_FONT_SIZE,
  MIN_FIT_SCALE,
  NEIGHBOR_RASTER_BUDGET,
  OUTGOING_LINES_AHEAD,
  OUTGOING_LINES_BEHIND,
  SOUL_ACTIVE_LIFT_EM,
  SOUL_ACTIVE_SWELL,
  SOUL_DETACH_LIFT_EM,
  SOUL_DETACH_SWELL,
  SOUL_HANDOFF_SECONDS,
  SOUL_MAX_OPACITY,
  TARGET_FRAME_WIDTH_FRACTION,
  TEXT_DISSOLVE_END,
  TEXT_DISSOLVE_START,
  TEXT_FADE_IN_END,
  TEXT_FADE_IN_START,
  UNIT_GLOW_MAX_OPACITY,
  UNSUNG_UNIT_OPACITY,
  clamp01,
  resolveNeighborLineOpacity,
  resolveOutgoingLineOpacity,
  smoothstep01,
  stepEnvelope,
};
