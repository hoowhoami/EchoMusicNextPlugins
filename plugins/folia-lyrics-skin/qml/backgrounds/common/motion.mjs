// Folia GeometricBackground.css, a8da4437, AGPL-3.0-only.
export function phase(seconds, delay, duration) {
  return seconds <= delay ? 0 : ((seconds - delay) / duration) % 1;
}
export function drift(shape, seconds) {
  const t = phase(seconds, shape.delay, shape.duration);
  const linear = t < 0.5 ? t * 2 : 2 - t * 2;
  const direction = shape.reverse ? -1 : 1;
  return {
    x: (-15 + 30 * linear) * direction,
    y: (30 - 60 * linear) * direction,
    rotation: shape.initialRotation + 360 * t,
  };
}
export function rise(particle, seconds) {
  const t = phase(seconds, particle.delay, particle.duration);
  return { y: -100 * t, opacity: particle.opacity * (t < 0.5 ? t * 2 : 2 - t * 2) };
}
export function bandScale(value) {
  return 0.95 + 0.5 * Math.min(1, Math.max(0, (value - 10) / 190));
}
