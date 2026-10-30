// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { hexOf, luminance, rgbOf, scaleRgb } from './color.mjs';
const BRIGHT_BACKGROUND_LUMINANCE = 0.18;
const LUMIERE_BRIGHT_DARK_FIELD_FLOOR = 0.94;
const DARK_FIELD_SHADE = 0.06;
const resolveLumiereDarkField = (theme, darkField) => {
  const background = rgbOf(theme.backgroundColor, [0, 0, 0]);
  const strength = Number.isFinite(darkField) ? Math.min(1, Math.max(0, darkField)) : 0;
  const bright = luminance(background) > BRIGHT_BACKGROUND_LUMINANCE;
  return {
    color: scaleRgb(background, DARK_FIELD_SHADE),
    alpha: bright ? Math.max(strength, LUMIERE_BRIGHT_DARK_FIELD_FLOOR) : strength,
  };
};
class LumiereDarkFieldLayer {
  constructor(pixi) {
    __publicField(this, 'view');
    __publicField(this, 'sprite');
    __publicField(this, 'theme', null);
    __publicField(this, 'darkField', Number.NaN);
    __publicField(this, 'width', 0);
    __publicField(this, 'height', 0);
    this.sprite = new pixi.Sprite(pixi.Texture.WHITE);
    this.sprite.visible = false;
    this.view = this.sprite;
  }
  update(theme, darkField, width, height) {
    if (theme !== this.theme || darkField !== this.darkField) {
      this.theme = theme;
      this.darkField = darkField;
      const field = resolveLumiereDarkField(theme, darkField);
      this.sprite.tint = hexOf(field.color);
      this.sprite.alpha = field.alpha;
      this.sprite.visible = field.alpha > 2e-3;
    }
    if (width !== this.width || height !== this.height) {
      this.width = width;
      this.height = height;
      this.sprite.setSize(width, height);
    }
  }
  destroy() {
    this.sprite.destroy();
  }
}
export { LUMIERE_BRIGHT_DARK_FIELD_FLOOR, LumiereDarkFieldLayer, resolveLumiereDarkField };
