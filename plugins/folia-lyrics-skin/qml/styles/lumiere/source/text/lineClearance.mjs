// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
const AWAY_SOFTNESS = 5e-3;
const HOLD = 0.018;
const softAbs = (a) => Math.sqrt(a * a + AWAY_SOFTNESS * AWAY_SOFTNESS) - AWAY_SOFTNESS;
const awayDrift = (drift, away) => {
  if (away === 0) return drift;
  const sign = away > 0 ? 1 : -1;
  const along = drift * sign;
  return drift + Math.abs(away) * (softAbs(along) - along) * sign;
};
const heldDrift = (vx, vy, age, axis) => {
  const speed = Math.hypot(vx, vy);
  if (speed < 1e-9) return 0;
  const phi = (speed * age) / HOLD;
  const along = HOLD * Math.sin(phi);
  const turn = HOLD * (1 - Math.cos(phi));
  const ux = vx / speed;
  const uy = vy / speed;
  return axis === 0 ? along * ux - turn * uy : along * uy + turn * ux;
};
const PROTECT_FLOOR = 0.4;
const PROTECT_MARGIN = 0.5;
const createProtectBox = () => ({
  line: -1,
  x: 0,
  y: 0,
  cos: 1,
  sin: 0,
  halfW: 0,
  halfH: 0,
  margin: 1,
  weight: 0,
});
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
const protectionAt = (boxes, count, line, x, y, half) => {
  let protect = 0;
  for (let i = 0; i < count; i += 1) {
    const box = boxes[i];
    if (box.line === line || box.weight <= 0) continue;
    const dx = x - box.x;
    const dy = y - box.y;
    const u = Math.abs(dx * box.cos + dy * box.sin) - box.halfW - half;
    const v = Math.abs(dy * box.cos - dx * box.sin) - box.halfH - half;
    const outside = u > 0 && v > 0 ? Math.hypot(u, v) : Math.max(u, v, 0);
    protect += box.weight * (1 - smooth(outside / box.margin));
  }
  return Math.min(1, protect);
};
const protectedAlpha = (protect) => 1 - (1 - PROTECT_FLOOR) * protect;
export {
  HOLD,
  PROTECT_FLOOR,
  PROTECT_MARGIN,
  awayDrift,
  createProtectBox,
  heldDrift,
  protectedAlpha,
  protectionAt,
};
