// Worker-local data surfaces; source scene logic uses no browser or DOM renderer.
export {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math,
  configurePixels,
  pendingPixels,
  Intl,
} from '../nebbia/environment.mjs';
import { configurePixels as configureSourcePixels } from '../nebbia/environment.mjs';
import { sourceImages } from './inline-images.mjs';
let now = 0,
  next = 1;
export const performance = { now: () => now };
export function setNativeNow(value) {
  now = value;
}
export function configureNativePixels(values, seed = 1) {
  configureSourcePixels(values, seed, sourceImages());
}
export const window = {
  devicePixelRatio: 1,
  screen: { width: 640, height: 480, availLeft: 0, availTop: 0 },
  setInterval: () => next++,
  clearInterval() {},
  setTimeout: () => next++,
  clearTimeout() {},
};
export class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
}
export const requestAnimationFrame = () => next++;
export const cancelAnimationFrame = () => {};
export class AbortController {
  constructor() {
    this.signal = { aborted: false };
  }
  abort() {
    this.signal.aborted = true;
  }
}
export class DOMException extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
  }
}
export function resolveThemeFontStack(theme) {
  return theme.fontFamilyStack && theme.fontFamilyStack.length
    ? theme.fontFamilyStack.join(',')
    : theme.fontFamily || 'sans-serif';
}
export function resolveThemeFontWeight(theme, fallback) {
  return theme.fontWeight || fallback;
}

export class Path2D {
  constructor(source) {
    this.path = source ? [['svg', String(source)]] : [];
  }
  moveTo(...p) {
    this.path.push(['moveTo', ...p]);
  }
  lineTo(...p) {
    this.path.push(['lineTo', ...p]);
  }
  closePath() {
    this.path.push(['closePath']);
  }
  bezierCurveTo(...p) {
    this.path.push(['bezierCurveTo', ...p]);
  }
  quadraticCurveTo(...p) {
    this.path.push(['quadraticCurveTo', ...p]);
  }
  arc(...p) {
    this.path.push(['arc', ...p]);
  }
  rect(...p) {
    this.path.push(['rect', ...p]);
  }
}
