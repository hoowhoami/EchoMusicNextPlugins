// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key != 'symbol' ? key + '' : key, value);
class SonnetOutroBlur {
  constructor(pixi) {
    __publicField(this, 'pixi', pixi);
    __publicField(this, 'filter', null);
    __publicField(this, 'scene', null);
  }
  isOn(scene) {
    return this.scene === scene;
  }
  clear() {
    var _a;
    (this.filter &&
      this.scene &&
      ((this.scene.container.filters = (
        (_a = this.scene.container.filters) != null ? _a : []
      ).filter((filter) => filter !== this.filter)),
      this.filter.destroy()),
      (this.filter = null),
      (this.scene = null));
  }
  update(scene, strength) {
    var _a;
    if (strength <= 0) {
      this.clear();
      return;
    }
    (this.scene !== scene && this.clear(),
      this.filter ||
        ((this.filter = new this.pixi.BlurFilter({
          strength: 0,
          quality: 2,
          kernelSize: 5,
          resolution: 0.75,
        })),
        (this.filter.repeatEdgePixels = !0),
        (scene.container.filters = [
          ...((_a = scene.container.filters) != null ? _a : []),
          this.filter,
        ]),
        (this.scene = scene)),
      (this.filter.strength = strength));
  }
}
export { SonnetOutroBlur };
