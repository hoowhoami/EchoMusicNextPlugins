// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
class PixiSceneCache {
  constructor(hooks) {
    __publicField(this, 'hooks', hooks);
    __publicField(this, 'scenes', /* @__PURE__ */ new Map());
    /**
     * Scenes the song handover replaced, waiting to be freed. Destroying a scene walks every
     * shot and every glyph's Text, and doing that for the whole cache on the frame the swap
     * lands is exactly the stall the wipe was supposed to hide. They are dropped one per frame
     * once the sweep is over instead.
     *
     * 换歌时换下来的场景，之后一帧销毁一个，免得交接那一帧卡住。
     */
    __publicField(this, 'retired', []);
  }
  get size() {
    return this.scenes.size;
  }
  /** 还有等着销毁的换下场景。 */
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
  /** 取缓存里的场景，没有就建；越界返回 null。 */
  ensure(index) {
    if (index < 0 || index >= this.hooks.count()) return null;
    const cached = this.scenes.get(index);
    if (cached) return cached;
    const scene = this.hooks.build(index);
    this.scenes.set(index, scene);
    return scene;
  }
  /** 收下一个在缓存外建好的场景（换歌交接的 staged）。 */
  adopt(index, scene) {
    this.scenes.set(index, scene);
  }
  /** 销毁离 index 超过一段、且不在 keep 里的场景。 */
  prune(index, keep) {
    this.scenes.forEach((scene, sceneIndex) => {
      if (Math.abs(sceneIndex - index) <= 1 || (keep == null ? void 0 : keep.has(sceneIndex)))
        return;
      this.hooks.destroy(scene);
      this.scenes.delete(sceneIndex);
    });
  }
  /** 立即销毁全部缓存场景（不含已换下的）。 */
  clear() {
    this.scenes.forEach((scene) => this.hooks.destroy(scene));
    this.scenes.clear();
  }
  /** 整批换下：摘离场景层但不销毁，留给 drainRetired 一帧一个地释放。 */
  retireAll() {
    this.scenes.forEach((scene) => {
      var _a, _b;
      (_b = (_a = this.hooks).detach) == null ? void 0 : _b.call(_a, scene);
      this.retired.push(scene);
    });
    this.scenes.clear();
  }
  /**
   * 销毁一个换下的场景；没有可销毁的返回 false。
   *
   * Frees one retired scene. Called on frames that are not doing anything else expensive.
   */
  drainRetired() {
    const scene = this.retired.shift();
    if (scene === void 0) return false;
    this.hooks.destroy(scene);
    return true;
  }
  /** 运行时销毁：缓存与换下的场景全部释放。 */
  destroyAll() {
    this.clear();
    this.retired.forEach((scene) => this.hooks.destroy(scene));
    this.retired.length = 0;
  }
}
export { PixiSceneCache };
