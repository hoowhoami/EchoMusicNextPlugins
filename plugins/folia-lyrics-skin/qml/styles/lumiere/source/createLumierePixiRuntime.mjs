// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) =>
      x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
import {
  runtimeWindow as window,
  runtimePerformance as performance,
  setRuntimeTimeout as setTimeout,
  clearRuntimeTimeout as clearTimeout,
} from '../runtime-environment.mjs';
import { PixiSceneCache } from './pixiSceneCache.mjs';
import { loadPixi } from '../runtime-browser.mjs';
import { linkPixiPrograms } from '../runtime-browser.mjs';
import { makePixiContext } from '../runtime-browser.mjs';
import { createLumiereAudioSampler } from './lumiereAudio.mjs';
import { findLumiereParagraphIndexAtTime } from './lumiereProgram.mjs';
import {
  resolveLumiereBloomLevelDrop,
  resolveLumiereGraphicsResolution,
  resolveLumiereRenderResolution,
  requiresLumiereSceneRebuild,
  toLumiereSceneTuning,
} from './lumiereRuntimeTuning.mjs';
import { resolveLumiereSceneFrames } from './lumiereSceneFrames.mjs';
import {
  applyLumiereLayerFrame,
  applyLumiereSceneQuality,
  buildLumiereSceneEntry,
  destroyLumiereSceneEntry,
} from './lumiereSceneEntry.mjs';
import { LumiereCreditsLayer } from './lumiereCreditsLayer.mjs';
import { LumiereDarkFieldLayer } from './lumiereDarkField.mjs';
import { PixiSongSwap } from './pixiSongSwap.mjs';
import { buildLumiereOverlay } from './overlay.mjs';
import { createLightSprites } from './light/sprites.mjs';
const REBUILD_DEBOUNCE_MS = 220;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
class LumierePixiRuntime {
  constructor(pixi, options, app) {
    __publicField(this, 'pixi', pixi);
    __publicField(this, 'options', options);
    __publicField(this, 'app', app);
    /** 换歌时换下来的场景进缓存的 retired 队列，之后一帧销毁一个，免得交接那一帧卡住。 */
    __publicField(
      this,
      'sceneCache',
      new PixiSceneCache({
        count: () => this.options.song.program.paragraphs.length,
        build: (index) => {
          const entry = this.buildEntry(this.options.song, index);
          this.sceneLayer.addChild(entry.holder);
          return entry;
        },
        destroy: (entry) => this.destroyEntry(entry),
        detach: (entry) => {
          var _a;
          return (_a = entry.holder.parent) == null ? void 0 : _a.removeChild(entry.holder);
        },
      })
    );
    __publicField(this, 'activeIndex', -1);
    __publicField(this, 'destroyed', false);
    __publicField(this, 'resizeObserver', null);
    __publicField(this, 'width', 0);
    __publicField(this, 'height', 0);
    __publicField(this, 'renderResolution', 1);
    __publicField(this, 'quality', {
      bloom: 1,
      textBloom: 1,
      graphicsResolution: null,
      bloomLevelDrop: 0,
      passthrough: null,
    });
    /** 所有场景共用、就地修改的场景 tuning：每帧现读的字段改了立刻生效（见 LUMIERE_LIVE_SCENE_KEYS）。 */
    __publicField(this, 'sceneTuning');
    __publicField(this, 'rebuildTimer', null);
    __publicField(this, 'rebuildDue', false);
    __publicField(
      this,
      'songSwap',
      new PixiSongSwap({
        stage: (song) => this.stageSong(song),
        commit: (song, staged) => this.commitSong(song, staged),
        discard: (entry) => this.destroyEntry(entry),
      })
    );
    __publicField(this, 'audio');
    __publicField(this, 'audioAt', () => this.audio.frame);
    /** 暗场底：在所有场景与片尾卡之下，不随段落转场变（见 lumiereDarkField.ts）。 */
    __publicField(this, 'darkField');
    __publicField(this, 'sceneLayer');
    __publicField(this, 'overlayLayer');
    __publicField(this, 'credits');
    __publicField(this, 'sprites');
    __publicField(this, 'passthrough');
    __publicField(this, 'renderFrame', () => {
      if (this.destroyed) return;
      const time = this.options.currentTime.get();
      this.audio.sample(performance.now(), this.options.paused);
      this.songSwap.advance();
      if (this.rebuildDue) {
        this.rebuildDue = false;
        this.songSwap.dropStaged();
        this.clearScenes();
        this.credits.invalidate();
      }
      const { program, theme } = this.options.song;
      this.darkField.update(theme, this.sceneTuning.darkField, this.width, this.height);
      const frames = resolveLumiereSceneFrames(program, time, !this.options.staticMode);
      let builtThisFrame = false;
      if (frames.activeIndex !== this.activeIndex) {
        this.activeIndex = frames.activeIndex;
        this.sceneCache.prune(
          frames.activeIndex,
          new Set(frames.layers.map((layer) => layer.index))
        );
      }
      frames.layers.forEach((layer) => {
        if (!this.sceneCache.has(layer.index)) {
          this.sceneCache.ensure(layer.index);
          builtThisFrame = true;
        }
      });
      const creditsFrame = this.credits.resolveFrame(time, program, this.options.metadata);
      if (!builtThisFrame && !this.songSwap.active) {
        const next = frames.activeIndex + 1;
        const previous = frames.activeIndex - 1;
        if (this.sceneCache.hasRetired) {
          this.sceneCache.drainRetired();
        } else if (next < program.paragraphs.length && !this.sceneCache.has(next)) {
          this.sceneCache.ensure(next);
        } else if (this.credits.needsBuild(time, program, this.options.metadata)) {
          this.credits.build(this.creditBuildContext(theme));
        } else if (previous >= 0 && !this.sceneCache.has(previous)) {
          this.sceneCache.ensure(previous);
        }
      }
      if (
        creditsFrame.active &&
        !this.credits.built &&
        this.credits.hasMetadata(this.options.metadata)
      ) {
        this.credits.build(this.creditBuildContext(theme));
      }
      const lyricAlpha = creditsFrame.active ? creditsFrame.lyricAlpha : 1;
      const lyricBlur = creditsFrame.active ? creditsFrame.lyricBlur : 0;
      const blurResolution = this.renderResolution * 0.5;
      this.sceneCache.forEach((entry, index) => {
        var _a;
        const layer = frames.layers.find((candidate) => candidate.index === index);
        const alpha = ((_a = layer == null ? void 0 : layer.alpha) != null ? _a : 0) * lyricAlpha;
        entry.holder.visible = alpha > 2e-3;
        if (!entry.holder.visible || !layer) return;
        entry.unit.update(time);
        applyLumiereLayerFrame(
          this.pixi,
          entry,
          {
            alpha,
            scale: layer.scale,
            blur: Math.max(layer.blur, lyricBlur),
          },
          blurResolution
        );
      });
      this.credits.update(time, creditsFrame, this.width, this.height);
    });
    this.sceneTuning = toLumiereSceneTuning(options.tuning, { showText: options.showText });
    this.audio = createLumiereAudioSampler({
      audioPower: options.audioPower,
      audioBands: options.audioBands,
    });
  }
  static create(options) {
    return __async(this, null, function* () {
      var _a, _b;
      const pixi = yield loadPixi();
      const contextOptions = {
        // 画布透明：folia 的共享背景层要透出来，由运行时的暗场层按暗场强度压暗。
        backgroundAlpha: 0,
        // 大头（图形组）画进 filter 纹理，MSAA 管不到；只剩画框细线，不值得整屏多重采样的解析开销。
        antialias: false,
        powerPreference: 'high-performance',
      };
      const context = yield makePixiContext(pixi, contextOptions, options.signal);
      const app = new pixi.Application();
      const width = Math.max(options.host.clientWidth, MIN_WIDTH);
      const height = Math.max(options.host.clientHeight, MIN_HEIGHT);
      const resolution = resolveLumiereRenderResolution(window.devicePixelRatio);
      yield app.init(
        __spreadProps(
          __spreadValues(
            __spreadValues(
              {
                width,
                height,
              },
              contextOptions
            ),
            context
          ),
          {
            autoDensity: true,
            resolution,
            autoStart: false,
            sharedTicker: false,
            preference: 'webgl',
          }
        )
      );
      if (app.renderer.type !== pixi.RendererType.WEBGL) {
        app.destroy({ removeView: true });
        throw new Error('Lumiere requires WebGL');
      }
      const runtime = new LumierePixiRuntime(pixi, options, app);
      runtime.renderResolution = resolution;
      runtime.sprites = createLightSprites(pixi);
      runtime.passthrough = new pixi.AlphaFilter({ alpha: 1 });
      runtime.quality.passthrough = runtime.passthrough;
      runtime.darkField = new LumiereDarkFieldLayer(pixi);
      runtime.sceneLayer = new pixi.Container();
      runtime.sceneLayer.sortableChildren = true;
      runtime.overlayLayer = new pixi.Container();
      runtime.credits = new LumiereCreditsLayer(pixi, runtime.sprites);
      app.stage.addChild(
        runtime.darkField.view,
        runtime.sceneLayer,
        runtime.credits.holder,
        runtime.overlayLayer
      );
      if ((_a = options.signal) == null ? void 0 : _a.aborted) {
        runtime.destroy();
        throw new DOMException('Lumiere runtime creation was cancelled', 'AbortError');
      }
      yield runtime.install();
      if ((_b = options.signal) == null ? void 0 : _b.aborted) {
        runtime.destroy();
        throw new DOMException('Lumiere runtime creation was cancelled', 'AbortError');
      }
      return runtime;
    });
  }
  /**
   * 第一帧分几步做，步与步之间页面照常跑：建 WebGL 上下文之后另起一个任务建第一个场景，它的着色器程序
   * 在页面照常跑时链接（linkPixiPrograms），之后画布才放上页面、画出来。中途取消就提前返回。
   */
  install() {
    return __async(this, null, function* () {
      var _a, _b;
      yield new Promise((resolve) => {
        window.setTimeout(resolve);
      });
      if ((_a = this.options.signal) == null ? void 0 : _a.aborted) return;
      this.resizeToHost(true);
      this.renderFrame();
      yield linkPixiPrograms(
        this.pixi,
        this.app.renderer,
        this.app.stage,
        'Lumiere',
        this.options.signal
      );
      if ((_b = this.options.signal) == null ? void 0 : _b.aborted) return;
      this.options.host.appendChild(this.app.canvas);
      this.app.canvas.style.cssText = 'width:100%;height:100%;display:block';
      this.app.ticker.add(this.renderFrame);
      this.resizeObserver = new ResizeObserver(() => {
        if (this.destroyed || !this.resizeToHost(false)) return;
        if (this.options.paused) this.renderOnce();
      });
      this.resizeObserver.observe(this.options.host);
      this.app.renderer.render(this.app.stage);
      if (!this.options.paused) this.app.start();
    });
  }
  /** 尺寸没变返回 false。渲染器立刻跟上，场景（尺寸烘焙在里面）防抖重建。 */
  resizeToHost(immediate) {
    if (this.destroyed) return false;
    const width = Math.max(this.options.host.clientWidth, MIN_WIDTH);
    const height = Math.max(this.options.host.clientHeight, MIN_HEIGHT);
    const resolution = resolveLumiereRenderResolution(window.devicePixelRatio);
    if (width === this.width && height === this.height && resolution === this.renderResolution)
      return false;
    this.width = width;
    this.height = height;
    this.renderResolution = resolution;
    this.app.renderer.resize(width, height, resolution);
    this.refreshQuality();
    this.drawOverlay();
    if (immediate) this.rebuildDue = true;
    else this.scheduleRebuild();
    return true;
  }
  /** 画质档 + 视口 → 图形组分辨率与 bloom 减级，写到所有现存场景与片尾卡上。 */
  refreshQuality() {
    const graphicsResolution = resolveLumiereGraphicsResolution(
      this.width,
      this.height,
      this.renderResolution,
      this.options.tuning.renderQuality
    );
    this.quality.bloom = this.sceneTuning.bloom;
    this.quality.textBloom = this.sceneTuning.textBloom;
    this.quality.graphicsResolution =
      graphicsResolution < this.renderResolution ? graphicsResolution : null;
    this.quality.bloomLevelDrop = resolveLumiereBloomLevelDrop(
      this.renderResolution,
      graphicsResolution
    );
    this.sceneCache.forEach((entry) => applyLumiereSceneQuality(entry.unit.scene, this.quality));
    if (this.songSwap.staged)
      applyLumiereSceneQuality(this.songSwap.staged.unit.scene, this.quality);
    this.credits.applyQuality(this.quality);
  }
  scheduleRebuild() {
    if (this.rebuildTimer !== null) clearTimeout(this.rebuildTimer);
    this.rebuildTimer = setTimeout(() => {
      this.rebuildTimer = null;
      if (this.destroyed) return;
      this.rebuildDue = true;
      if (this.options.paused) this.renderOnce();
    }, REBUILD_DEBOUNCE_MS);
  }
  drawOverlay() {
    this.overlayLayer
      .removeChildren()
      .forEach((child) => child.destroy({ children: true, context: true }));
    if (!this.options.tuning.overlayFrame || this.options.tuning.textOnly || this.width === 0)
      return;
    this.overlayLayer.addChild(
      buildLumiereOverlay(this.pixi, {
        width: this.width,
        height: this.height,
        theme: this.options.song.theme,
        themeColorMix: this.options.tuning.themeColorMix,
      })
    );
  }
  buildEntry(song, index) {
    return buildLumiereSceneEntry(
      this.pixi,
      {
        width: this.width,
        height: this.height,
        resolution: this.renderResolution,
        program: song.program,
        theme: song.theme,
        tuning: this.sceneTuning,
        sprites: this.sprites,
        audioAt: this.audioAt,
        showText: this.options.showText,
        quality: this.quality,
      },
      index
    );
  }
  destroyEntry(entry) {
    destroyLumiereSceneEntry(entry, this.passthrough);
  }
  clearScenes() {
    this.sceneCache.clear();
    this.activeIndex = -1;
  }
  creditBuildContext(theme) {
    return {
      width: this.width,
      height: this.height,
      resolution: this.renderResolution,
      theme,
      metadata: this.options.metadata,
      tuning: this.sceneTuning,
      quality: this.quality,
    };
  }
  renderOnce() {
    if (this.destroyed || !this.app.canvas.isConnected) return;
    this.renderFrame();
    if (this.destroyed) return;
    this.app.renderer.render(this.app.stage);
  }
  /**
   * 换歌：新歌当前段落的场景在第一帧建好（旧歌还在画），第二帧切过去；换下的场景之后一帧销毁一个。
   * 不是真正的换歌（同一个 seed：主题改了、歌词晚到）、暂停中、还没有画面时直接替换。
   */
  swapSong(next, signal) {
    if (this.destroyed) return Promise.resolve();
    if (
      next.seed === this.options.song.seed ||
      this.songSwap.active ||
      this.width === 0 ||
      this.sceneCache.size === 0 ||
      this.options.paused ||
      (signal == null ? void 0 : signal.aborted)
    ) {
      this.commitSong(next, null);
      if (this.options.paused) this.renderOnce();
      return Promise.resolve();
    }
    return this.songSwap.begin(next, signal);
  }
  /** 交接的第一帧：离屏建好新歌当前段落的场景（不进缓存，旧歌的场景被换下时它不受影响）。 */
  stageSong(song) {
    const index = findLumiereParagraphIndexAtTime(song.program, this.options.currentTime.get());
    if (index < 0 || index >= song.program.paragraphs.length) return null;
    const entry = this.buildEntry(song, index);
    entry.holder.visible = false;
    this.sceneLayer.addChild(entry.holder);
    return entry;
  }
  commitSong(next, staged) {
    const themeChanged = next.theme !== this.options.song.theme;
    this.options.song = next;
    if (staged) {
      this.sceneCache.retireAll();
      this.sceneCache.adopt(staged.index, staged);
      this.activeIndex = staged.index;
    } else {
      this.clearScenes();
    }
    this.credits.invalidate();
    if (themeChanged) this.drawOverlay();
  }
  /** 就地应用 tuning：每帧现读的字段直接改，bloom 强度写进 filter，烘焙进场景的字段防抖重建。 */
  setTuning(tuning) {
    if (this.destroyed || tuning === this.options.tuning) return;
    const previousTuning = this.options.tuning;
    this.options.tuning = tuning;
    this.applySceneTuning();
    if (
      previousTuning.overlayFrame !== tuning.overlayFrame ||
      previousTuning.textOnly !== tuning.textOnly ||
      previousTuning.themeColorMix !== tuning.themeColorMix
    )
      this.drawOverlay();
    if (this.options.paused) this.renderOnce();
  }
  setShowText(showText) {
    if (this.destroyed || showText === this.options.showText) return;
    this.options.showText = showText;
    this.sceneCache.forEach((entry) => {
      entry.unit.scene.text.visible = showText;
    });
    if (this.songSwap.staged) this.songSwap.staged.unit.scene.text.visible = showText;
    this.applySceneTuning();
    if (this.options.paused) this.renderOnce();
  }
  applySceneTuning() {
    const previous = __spreadValues({}, this.sceneTuning);
    const next = toLumiereSceneTuning(this.options.tuning, { showText: this.options.showText });
    Object.assign(this.sceneTuning, next);
    this.refreshQuality();
    if (requiresLumiereSceneRebuild(previous, next)) this.scheduleRebuild();
  }
  setStaticMode(staticMode) {
    if (this.destroyed || staticMode === this.options.staticMode) return;
    this.options.staticMode = staticMode;
    if (this.options.paused) this.renderOnce();
  }
  setAudioSources(audioPower, audioBands) {
    this.audio.setSources({ audioPower, audioBands });
  }
  setSongMetadata(metadata) {
    if (this.destroyed) return;
    const current = this.options.metadata;
    if (
      current.title === metadata.title &&
      current.artist === metadata.artist &&
      current.album === metadata.album
    )
      return;
    this.options.metadata = __spreadValues({}, metadata);
    this.credits.invalidate();
    if (this.options.paused) this.renderOnce();
  }
  setPaused(paused) {
    if (this.destroyed) return;
    this.options.paused = paused;
    if (paused) {
      this.app.stop();
      this.renderOnce();
    } else {
      this.app.start();
    }
  }
  destroy() {
    var _a, _b, _c, _d, _e, _f;
    if (this.destroyed) return;
    this.destroyed = true;
    this.songSwap.settle(false);
    if (this.rebuildTimer !== null) clearTimeout(this.rebuildTimer);
    this.rebuildTimer = null;
    (_a = this.resizeObserver) == null ? void 0 : _a.disconnect();
    this.resizeObserver = null;
    this.app.stop();
    this.app.ticker.remove(this.renderFrame);
    this.sceneCache.destroyAll();
    (_b = this.credits) == null ? void 0 : _b.destroy();
    (_c = this.darkField) == null ? void 0 : _c.destroy();
    (_d = this.overlayLayer) == null
      ? void 0
      : _d.removeChildren().forEach((child) => child.destroy({ children: true, context: true }));
    (_e = this.sprites) == null ? void 0 : _e.destroy();
    (_f = this.passthrough) == null ? void 0 : _f.destroy();
    this.app.destroy({ removeView: true }, { children: true });
  }
}
export { LumierePixiRuntime };
