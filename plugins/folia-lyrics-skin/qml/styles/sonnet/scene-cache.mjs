// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key != 'symbol' ? key + '' : key, value);
class PixiSceneCache {
  constructor(hooks) {
    __publicField(this, 'hooks', hooks);
    __publicField(this, 'scenes', /* @__PURE__ */ new Map());
    __publicField(this, 'retired', []);
  }
  get size() {
    return this.scenes.size;
  }
  get hasRetired() {
    return this.retired.length > 0;
  }
  has(index) {
    return this.scenes.has(index);
  }
  get(index) {
    return this.scenes.get(index);
  }
  forEach(callback) {
    this.scenes.forEach(callback);
  }
  ensure(index) {
    if (index < 0 || index >= this.hooks.count()) return null;
    const cached = this.scenes.get(index);
    if (cached) return cached;
    const scene = this.hooks.build(index);
    return (this.scenes.set(index, scene), scene);
  }
  adopt(index, scene) {
    this.scenes.set(index, scene);
  }
  prune(index, keep) {
    this.scenes.forEach((scene, sceneIndex) => {
      Math.abs(sceneIndex - index) <= 1 ||
        (keep != null && keep.has(sceneIndex)) ||
        (this.hooks.destroy(scene), this.scenes.delete(sceneIndex));
    });
  }
  clear() {
    (this.scenes.forEach((scene) => this.hooks.destroy(scene)), this.scenes.clear());
  }
  retireAll() {
    (this.scenes.forEach((scene) => {
      var _a, _b;
      ((_b = (_a = this.hooks).detach) == null || _b.call(_a, scene), this.retired.push(scene));
    }),
      this.scenes.clear());
  }
  drainRetired() {
    const scene = this.retired.shift();
    return scene === void 0 ? !1 : (this.hooks.destroy(scene), !0);
  }
  destroyAll() {
    (this.clear(),
      this.retired.forEach((scene) => this.hooks.destroy(scene)),
      (this.retired.length = 0));
  }
}
export { PixiSceneCache };
