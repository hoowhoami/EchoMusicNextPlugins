// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeInOut = (value) => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const lerp = (from, to, amount) => from + (to - from) * amount;
const resolveTemperaCameraFrame = (shot, progress) => {
  const clamped = clamp01(progress);
  const eased = clamped * 0.5 + easeInOut(clamped) * 0.5;
  const overshoot = Math.max(0, progress - 1) * 0.35;
  const amount = eased + overshoot;
  const { camera: start, cameraEnd: end } = shot;
  return {
    x: lerp(start.x, end.x, amount),
    y: lerp(start.y, end.y, amount),
    scale: lerp(start.zoom, end.zoom, amount),
    rotation: lerp(start.rotation, end.rotation, amount),
  };
};
const TEMPERA_CAMERA_BREATH_MAX_OFFSET = 6e-3;
const TEMPERA_CAMERA_BREATH_MAX_SCALE = 2e-3;
const TEMPERA_CAMERA_BREATH_MAX_ROTATION = 15e-4;
const resolveTemperaCameraBreath = (time, phase = 0) => {
  const tau = time * Math.PI * 2;
  return {
    x:
      (Math.sin(tau * 0.13 + phase) * 0.65 + Math.sin(tau * 0.31 + phase * 1.7) * 0.35) *
      TEMPERA_CAMERA_BREATH_MAX_OFFSET,
    y:
      (Math.cos(tau * 0.11 + phase * 2.3) * 0.65 + Math.sin(tau * 0.29 + phase * 0.9) * 0.35) *
      TEMPERA_CAMERA_BREATH_MAX_OFFSET,
    scale: Math.sin(tau * 0.09 + phase * 1.3) * TEMPERA_CAMERA_BREATH_MAX_SCALE,
    rotation: Math.sin(tau * 0.07 + phase * 2.9) * TEMPERA_CAMERA_BREATH_MAX_ROTATION,
  };
};
const resolveTemperaBreathWeight = (time, revealDoneTime, rampDuration = 1.2) => {
  if (rampDuration <= 0) return time >= revealDoneTime ? 1 : 0;
  return easeInOut(clamp01((time - revealDoneTime) / rampDuration));
};
export {
  TEMPERA_CAMERA_BREATH_MAX_OFFSET,
  TEMPERA_CAMERA_BREATH_MAX_ROTATION,
  TEMPERA_CAMERA_BREATH_MAX_SCALE,
  resolveTemperaBreathWeight,
  resolveTemperaCameraBreath,
  resolveTemperaCameraFrame,
};
