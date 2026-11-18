// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { createLumiereCredits, hasLumiereCredits, resolveLumiereCreditsFrame } from './credits.mjs';
import { applyLumiereSceneQuality } from './lumiereSceneEntry.mjs';
const PREBUILD_SECONDS = 4;
const INACTIVE = {
  active: false,
  lyricAlpha: 1,
  lyricBlur: 0,
  posterAlpha: 0,
  posterOffsetY: 0,
  posterScale: 1,
};
const toSongMetadata = (metadata) => {
  var _a, _b, _c;
  return {
    title: (_a = metadata.title) != null ? _a : null,
    artist: (_b = metadata.artist) != null ? _b : null,
    album: (_c = metadata.album) != null ? _c : null,
  };
};
class LumiereCreditsLayer {
  constructor(pixi, sprites) {
    __publicField(this, 'pixi', pixi);
    __publicField(this, 'sprites', sprites);
    __publicField(this, 'holder');
    __publicField(this, 'credits', null);
    __publicField(this, 'lyricEndTime', 0);
    this.holder = new pixi.Container();
    this.holder.visible = false;
  }
  get built() {
    return this.credits !== null;
  }
  hasMetadata(metadata) {
    return hasLumiereCredits(toSongMetadata(metadata));
  }
  /** 片尾时间线帧；没有片尾卡时恒为 inactive（歌词不淡出）。 */
  resolveFrame(time, program, metadata) {
    if (program.lyricEndTime === null || !this.hasMetadata(metadata)) return INACTIVE;
    this.lyricEndTime = program.lyricEndTime;
    return resolveLumiereCreditsFrame(time, program.lyricEndTime);
  }
  needsBuild(time, program, metadata) {
    return (
      !this.credits &&
      program.lyricEndTime !== null &&
      time >= program.lyricEndTime - PREBUILD_SECONDS &&
      this.hasMetadata(metadata)
    );
  }
  build(context) {
    this.invalidate();
    this.credits = createLumiereCredits(this.pixi, {
      width: context.width,
      height: context.height,
      resolution: context.resolution,
      theme: context.theme,
      metadata: toSongMetadata(context.metadata),
      tuning: context.tuning,
      sprites: this.sprites,
    });
    applyLumiereSceneQuality(this.credits, context.quality);
    this.holder.addChild(this.credits.view);
    this.holder.pivot.set(context.width / 2, context.height / 2);
  }
  applyQuality(quality) {
    if (this.credits) applyLumiereSceneQuality(this.credits, quality);
  }
  /** 片尾卡以画面中心缩放、上下偏移；没激活时整层不画。 */
  update(time, frame, width, height) {
    const credits = this.credits;
    this.holder.visible = Boolean(credits) && frame.active && frame.posterAlpha > 2e-3;
    if (!credits || !this.holder.visible) return;
    this.holder.alpha = frame.posterAlpha;
    this.holder.position.set(width / 2, height / 2 + frame.posterOffsetY * height);
    this.holder.scale.set(frame.posterScale);
    credits.update(time - this.lyricEndTime);
  }
  /** 作废当前片尾卡（下次需要时重建）。 */
  invalidate() {
    if (!this.credits) return;
    const credits = this.credits;
    this.credits = null;
    this.holder.removeChild(credits.view);
    credits.graphics.filters = [];
    credits.destroy();
    this.holder.visible = false;
  }
  destroy() {
    this.invalidate();
    this.holder.destroy({ children: true });
  }
}
export { LumiereCreditsLayer };
