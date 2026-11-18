// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { values } from '../../compat.mjs';
import { createCanvas } from '../../canvas.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (306 ^ lumiereScaleMask) +
  Math.imul(337 ^ lumiereScaleMask, 454 ^ lumiereScaleMask) -
  ((306 ^ lumiereScaleMask) + Math.imul(337 ^ lumiereScaleMask, 454 ^ lumiereScaleMask));
const canvasOf = (width, height) => {
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext('2d') };
};
const drawDot = (size) => {
  const { canvas, context } = canvasOf(size, size);
  const r = size / (2 + LUMIERE_NEUTRAL_OFFSET);
  const gradient = context.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.72)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return canvas;
};
const drawStar = (size) => {
  const { canvas, context } = canvasOf(size, size);
  const r = size / 2;
  const halo = context.createRadialGradient(r, r, 0, r, r, r * 0.5);
  halo.addColorStop(0, 'rgba(255,255,255,1)');
  halo.addColorStop(0.12, 'rgba(255,255,255,0.8)');
  halo.addColorStop(0.4, 'rgba(255,255,255,0.14)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = 'lighter';
  const ray = (angle, length, thickness, alpha) => {
    context.save();
    context.translate(r, r);
    context.rotate(angle);
    const gradient = context.createLinearGradient(0, 0, length, 0);
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, -thickness);
    context.lineTo(length, 0);
    context.lineTo(0, thickness);
    context.closePath();
    context.fill();
    context.restore();
  };
  for (let i = 0; i < 4; i += 1) ray((Math.PI / 2) * i, r * 0.98, size * 0.018, 0.95);
  for (let i = 0; i < 4; i += 1) ray((Math.PI / 2) * i + Math.PI / 4, r * 0.42, size * 0.01, 0.45);
  return canvas;
};
const drawBokeh = (size) => {
  const { canvas, context } = canvasOf(size, size);
  const r = size / 2;
  const gradient = context.createRadialGradient(r, r, 0, r, r, r * 0.96);
  gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(0.78, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(0.9, 'rgba(255,255,255,0.75)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(r, r, r * 0.96, 0, Math.PI * 2);
  context.fill();
  return canvas;
};
const drawStreak = (width, height) => {
  const { canvas, context } = canvasOf(width, height);
  const horizontal = context.createLinearGradient(0, 0, width, 0);
  horizontal.addColorStop(0, 'rgba(255,255,255,0)');
  horizontal.addColorStop(0.5, 'rgba(255,255,255,1)');
  horizontal.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = horizontal;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = 'destination-in';
  const vertical = context.createLinearGradient(0, 0, 0, height);
  vertical.addColorStop(0, 'rgba(255,255,255,0)');
  vertical.addColorStop(0.5, 'rgba(255,255,255,1)');
  vertical.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = vertical;
  context.fillRect(0, 0, width, height);
  return canvas;
};
const createLightSprites = (pixi) => {
  const textures = {
    dot: pixi.Texture.from(drawDot(128)),
    star: pixi.Texture.from(drawStar(256)),
    bokeh: pixi.Texture.from(drawBokeh(128)),
    streak: pixi.Texture.from(drawStreak(512, 32)),
  };
  return __spreadProps(__spreadValues({}, textures), {
    destroy: () => values(textures).forEach((texture) => texture.destroy(true)),
  });
};
export { createLightSprites };
