// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/sky.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../environment.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../three.mjs';
class MachiSky {
  constructor() {
    __publicField(this, 'texture');
    __publicField(this, 'context');
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    this.context = canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }
  paint(top, bottom) {
    const gradient = this.context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, `#${top.getHexString()}`);
    gradient.addColorStop(1, `#${bottom.getHexString()}`);
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, 4, 256);
    this.texture.needsUpdate = true;
  }
  dispose() {
    this.texture.dispose();
  }
}
export { MachiSky };
