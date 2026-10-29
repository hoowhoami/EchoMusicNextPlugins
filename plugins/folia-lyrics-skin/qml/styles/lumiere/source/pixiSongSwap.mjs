// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
class PixiSongSwap {
  constructor(hooks) {
    __publicField(this, 'hooks', hooks);
    __publicField(this, 'pending', null);
  }
  get active() {
    return this.pending !== null;
  }
  /** 正在交接的新歌（还没切过去）。 */
  get song() {
    var _a, _b;
    return (_b = (_a = this.pending) == null ? void 0 : _a.song) != null ? _b : null;
  }
  /** 已经建好、还没切过去的场景（tuning / 尺寸变化时需要一起更新或丢弃）。 */
  get staged() {
    var _a, _b;
    return (_b = (_a = this.pending) == null ? void 0 : _a.staged) != null ? _b : null;
  }
  /** 丢掉已建好的 staged（它是按旧的尺寸 / tuning 建的）；交接照常在下一帧切，切的时候重建。 */
  dropStaged() {
    const pending = this.pending;
    if (!(pending == null ? void 0 : pending.staged)) return;
    this.hooks.discard(pending.staged);
    pending.staged = null;
  }
  /** 开始一次交接，两帧之后 resolve。 */
  begin(song, signal) {
    return new Promise((resolve) => {
      const onAbort = () => this.settle(true);
      this.pending = {
        song,
        staged: null,
        prepared: false,
        settle: resolve,
        detachAbort: () => (signal == null ? void 0 : signal.removeEventListener('abort', onAbort)),
      };
      signal == null ? void 0 : signal.addEventListener('abort', onAbort, { once: true });
    });
  }
  /**
   * 每帧开头调用：第一帧 stage，第二帧 commit。
   *
   * One frame of the handover. First frame builds the incoming scene while the outgoing song
   * still holds the picture; second frame cuts to it. Nothing is drawn over the change - the
   * point is that the cut costs no work, not that it is hidden.
   */
  advance() {
    const pending = this.pending;
    if (!pending) return;
    if (!pending.prepared) {
      pending.prepared = true;
      pending.staged = this.hooks.stage(pending.song);
      return;
    }
    this.settle(true);
  }
  /**
   * 立即了结：commit 为 false（运行时正在销毁）时只丢弃 staged。
   *
   * Finishes an in-flight handover immediately, committing whatever it was still holding.
   */
  settle(commit) {
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    pending.detachAbort();
    if (commit) this.hooks.commit(pending.song, pending.staged);
    else if (pending.staged) this.hooks.discard(pending.staged);
    pending.settle();
  }
}
export { PixiSongSwap };
