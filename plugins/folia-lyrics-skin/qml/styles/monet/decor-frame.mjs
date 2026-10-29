// Folia MonetFloatingDecor's equal-offset Motion keyframes, owned UI wall time only.
import { easeInOut, easeOut } from '../classic/motion.mjs';
function keyframe(values, progress) {
  const offset = progress * 4;
  const exact = Math.round(offset);
  // Subtracting a decimal delay can move a key by one floating-point ULP.
  // Keep original exact keyframe values out of the Bezier subdivision loop.
  if (Math.abs(offset - exact) < 1e-12) return values[exact];
  const index = Math.min(3, Math.floor(offset));
  const p = easeInOut(offset - index);
  return values[index] + (values[index + 1] - values[index]) * p;
}
export function particleFrame(particle, elapsed, staticMode) {
  if (staticMode) return { x: 0, y: 0, rotation: particle.rotation, opacity: particle.opacity };
  const iterations = Math.max(0, elapsed - particle.delay) / particle.duration;
  // Motion JSAnimation keeps the last key on an exact repeat boundary.
  const p = iterations > 0 && iterations % 1 === 0 ? 1 : iterations % 1;
  const r = particle.rotation,
    sign = particle.reverse ? -1 : 1;
  return {
    x: keyframe(particle.reverse ? [15, -25, 10, -20, 15] : [-15, 25, -10, 20, -15], p),
    y: keyframe(particle.reverse ? [-40, 60, -20, 40, -40] : [40, -60, 20, -40, 40], p),
    rotation: keyframe([r, r + sign * 120, r + sign * 60, r + sign * 180, r], p),
    opacity: keyframe(
      [
        particle.opacity * 0.6,
        particle.opacity * 1.2,
        particle.opacity,
        particle.opacity * 1.3,
        particle.opacity * 0.7,
      ],
      p
    ),
  };
}
export function introOpacity(elapsed, staticMode) {
  return staticMode ? 1 : easeOut(Math.min(1, Math.max(0, elapsed / 2.2)));
}
