// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const cubicCoordinate = (point1, point2, time) => {
  const inverse = 1 - time;
  return (
    3 * inverse * inverse * time * point1 + 3 * inverse * time * time * point2 + time * time * time
  );
};
const resolveCubicBezier = (x1, y1, x2, y2, value) => {
  const target = clamp01(value);
  if (target === 0 || target === 1) return target;
  let low = 0;
  let high = 1;
  let parameter = target;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const x = cubicCoordinate(x1, x2, parameter);
    if (x < target) low = parameter;
    else high = parameter;
    parameter = (low + high) / 2;
  }
  return cubicCoordinate(y1, y2, parameter);
};
const easeTemperaEnter = (value) => resolveCubicBezier(0.22, 1, 0.36, 1, value);
const easeTemperaInOut = (value) => resolveCubicBezier(0.62, 0, 0.32, 1, value);
const easeTemperaSoftBack = (value) => {
  const t = clamp01(value);
  const c = 1.42;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
export { clamp01, easeTemperaEnter, easeTemperaInOut, easeTemperaSoftBack, resolveCubicBezier };
