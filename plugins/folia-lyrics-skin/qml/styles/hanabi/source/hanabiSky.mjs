// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/hanabiSky.ts
import { document, OffscreenCanvas, globalThis } from '../environment.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { hexOfCss } from './color.mjs';
const hslOfHex = (hex) => {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};
const cssOfHsl = ([h, s, l]) => `hsl(${(((h % 1) + 1) % 1) * 360}deg ${s * 100}% ${l * 100}%)`;
const leanHue = (from, to, amount) => {
  let delta = to - from;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return from + delta * amount;
};
const resolveHanabiSkyStops = (theme) => {
  const [hue, saturation] = hslOfHex(hexOfCss(theme.accentColor, 16743050));
  const lean = (base) => (saturation < 0.2 ? base : leanHue(base, hue, 0.3));
  return [
    { at: 0, color: cssOfHsl([lean(0.66), 0.62, 0.06]) },
    { at: 0.45, color: cssOfHsl([lean(0.7), 0.5, 0.11]) },
    { at: 0.82, color: cssOfHsl([lean(0.8), 0.48, 0.19]) },
    { at: 1, color: cssOfHsl([lean(0.9), 0.55, 0.27]) },
  ];
};
const paintSky = (theme) => {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  resolveHanabiSkyStops(theme).forEach((stop) => gradient.addColorStop(stop.at, stop.color));
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
};
class HanabiSkyLayer {
  constructor(pixi) {
    __publicField(this, 'pixi', pixi);
    __publicField(this, 'view');
    __publicField(this, 'sprite');
    __publicField(this, 'texture', null);
    __publicField(this, 'theme', null);
    this.view = new pixi.Container();
    this.sprite = new pixi.Sprite();
    this.view.addChild(this.sprite);
  }
  /** 每帧调用：主题变了才重画渐变，尺寸与不透明度直接改。 */
  update(theme, alpha, width, height) {
    this.view.visible = alpha > 2e-3;
    if (!this.view.visible) return;
    if (theme !== this.theme) {
      this.theme = theme;
      const previous = this.texture;
      this.texture = this.pixi.Texture.from(paintSky(theme));
      this.sprite.texture = this.texture;
      previous == null ? void 0 : previous.destroy(true);
    }
    this.sprite.width = width;
    this.sprite.height = height;
    this.view.alpha = alpha;
  }
  destroy() {
    var _a;
    (_a = this.texture) == null ? void 0 : _a.destroy(true);
    this.texture = null;
    this.view.destroy({ children: true });
  }
}
export { HanabiSkyLayer, resolveHanabiSkyStops };
