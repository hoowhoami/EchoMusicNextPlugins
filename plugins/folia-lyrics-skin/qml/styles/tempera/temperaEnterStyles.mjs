// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { easeTemperaSoftBack } from './temperaMotionEasing.mjs';
const TEMPERA_ENTER_STYLES = [
  'slide',
  'from-left',
  'from-right',
  'from-above',
  'from-below',
  'swing',
  'stamp',
];
const directional = (input, travel, uniform, dirX, dirY, rotationScale) => {
  const magnitude = Math.hypot(input.enterX, input.enterY);
  const length = Math.hypot(dirX, dirY) || 1;
  return {
    x: (dirX / length) * magnitude * travel,
    y: (dirY / length) * magnitude * travel,
    rotation: input.enterRotation * rotationScale * travel,
    scaleX: uniform,
    scaleY: uniform,
    echo: travel,
  };
};
const resolveTemperaEnterFrame = (style, input, travel, linear) => {
  const settle = easeTemperaSoftBack(linear);
  const uniform = input.enterScale + (1 - input.enterScale) * settle;
  switch (style) {
    case 'from-left':
      return directional(input, travel, uniform, -1, 0.12, 0.4);
    case 'from-right':
      return directional(input, travel, uniform, 1, -0.12, 0.4);
    case 'from-above':
      return directional(input, travel, uniform, 0.12, -1, 0.4);
    case 'from-below':
      return directional(input, travel, uniform, -0.12, 1, 0.4);
    case 'swing':
      return {
        x: input.enterX * 0.6 * travel,
        y: input.enterY * 0.6 * travel,
        rotation: (input.enterRotation + Math.sign(input.enterRotation || 1) * 0.95) * travel,
        scaleX: uniform,
        scaleY: uniform,
        echo: travel * 0.8,
      };
    case 'stamp':
      return {
        x: 0,
        y: 0,
        rotation: input.enterRotation * 0.6 * travel,
        scaleX: 1 + travel * 0.7,
        scaleY: 1 + travel * 0.7,
        echo: 0,
      };
    case 'slide':
    default:
      return {
        x: input.enterX * travel,
        y: input.enterY * travel,
        rotation: input.enterRotation * travel,
        scaleX: uniform,
        scaleY: uniform,
        echo: travel,
      };
  }
};
export { TEMPERA_ENTER_STYLES, resolveTemperaEnterFrame };
