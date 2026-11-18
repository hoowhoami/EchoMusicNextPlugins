import { createLumiereBackend } from '../lumiere/backend.mjs';
export function createHanabiBackend(options) {
  const pixi = createLumiereBackend(options);
  const destroy = pixi.Container.prototype.destroy;
  pixi.Container.prototype.getChildIndex = function (child) {
    const index = this.children.indexOf(child);
    if (index < 0) throw new Error('Native retained child is missing');
    return index;
  };
  pixi.Container.prototype.setChildIndex = function (child, index) {
    this.removeChild(child);
    this.addChildAt(child, index);
  };
  pixi.Container.prototype.on = function (name, callback) {
    if (!this._listeners) this._listeners = new Map();
    this._listeners.set(name, (this._listeners.get(name) || []).concat([callback]));
    return this;
  };
  pixi.Container.prototype.destroy = function (input) {
    if (this.destroyed) return;
    destroy.call(this, input);
    const callbacks = this._listeners && this._listeners.get('destroyed');
    if (callbacks) for (const callback of callbacks) callback();
    if (this._listeners) this._listeners.clear();
  };
  const BaseGraphics = pixi.Graphics;
  BaseGraphics.prototype.roundRect = function (x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2));
    if (!r) return this.rect(x, y, w, h);
    return this.moveTo(x + r, y)
      .lineTo(x + w - r, y)
      .arc(x + w - r, y + r, r, -Math.PI / 2, 0)
      .lineTo(x + w, y + h - r)
      .arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
      .lineTo(x + r, y + h)
      .arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
      .lineTo(x, y + r)
      .arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
      .closePath();
  };
  class Graphics extends BaseGraphics {
    constructor(context) {
      super();
      if (context) {
        this.instructions = context.instructions;
        this.geometryRevision = context.geometryRevision;
      }
    }
  }
  pixi.Graphics = Graphics;
  pixi.GraphicsContext = BaseGraphics;
  pixi.CanvasSource.prototype.update = function () {
    this.version = (this.version || 0) + 1;
  };
  class TilingSprite extends pixi.Sprite {
    constructor(input) {
      super(input.texture);
      this.kind = 'tiling';
      this._width = input.width;
      this._height = input.height;
      this.tilePosition = new pixi.Point();
      this.tileScale = new pixi.Point(1, 1);
    }
    get width() {
      return this._width;
    }
    set width(value) {
      this._width = value;
    }
    get height() {
      return this._height;
    }
    set height(value) {
      this._height = value;
    }
    getLocalBounds() {
      return {
        x: -this.anchor.x * this.width,
        y: -this.anchor.y * this.height,
        width: this.width,
        height: this.height,
      };
    }
  }
  pixi.TilingSprite = TilingSprite;
  return pixi;
}
