// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaGl.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
import { arrayAt, arrayFlatMap, fromEntries } from '../compat.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { FOG_DIV, NEBBIA_FIXED } from './nebbiaConstants.mjs';
const raindropSpriteUrl = 'nebbiaRaindrop.png';
import { BLD_FILL_UNIFORMS, NebbiaBuildingCache } from './nebbiaBuildingCache.mjs';
import { NebbiaFogGl } from './nebbiaFogGl.mjs';
import { NebbiaNoiseTex } from './nebbiaNoiseTex.mjs';
import { makeTex } from './nebbiaGlUtils.mjs';
import { NebbiaMaskGl } from './nebbiaMaskGl.mjs';
import { canRenderFogToFloat, NebbiaProgramBuild } from './nebbiaPrograms.mjs';
import { NebbiaSnowGl } from './nebbiaSnowGl.mjs';
import { NebbiaFireflyGl } from './nebbiaFireflyGl.mjs';
const PALETTE_UNIFORMS = ['uSky0', 'uSky1', 'uLa', 'uLb', 'uLc'];
const SCENE_UNIFORMS = [
  'uRes',
  'uSceneShift',
  'uTime',
  'uBus',
  'uNeon',
  ...PALETTE_UNIFORMS,
  'uSpotSrc',
  'uSpotSrc2',
  'uSpotTgt',
  'uSpotR',
  'uSpotI',
  'uScenery',
  'uBldOn',
  'uBldGeo',
  'uJelly',
  'uJellyC',
  'uJellyN',
  'uBubbles',
  'uSway',
  'uBurst',
  'uBurstN',
  'uBeatRows',
  'uWeedIdle',
];
const MAIN_UNIFORMS = [
  ...SCENE_UNIFORMS,
  'uDewGlint',
  'uMist',
  'uEdge',
  'uRefract',
  'uGlint',
  'uGlassShift',
  'uBreathOn',
  'uBreathThick',
  'uNoiseOn',
  'uSeeThrough',
  'uMistTint',
];
const SCN_BUILDINGS = 1;
const NO_BUILDINGS = { on: [0, 0, 0], geo: [0, 1, 1, 0, 1, 1, 0, 1, 1] };
const locate = (gl, prog, names) =>
  fromEntries(names.map((n) => [n, gl.getUniformLocation(prog, n)]));
class NebbiaGl {
  constructor(canvas, seeThrough = false, scene = 'night', glass = 'rain') {
    __publicField(this, 'canvas', canvas);
    __publicField(this, 'seeThrough', seeThrough);
    __publicField(this, 'gl');
    __publicField(this, 'build');
    __publicField(this, 'quadVao');
    __publicField(this, 'spriteVao');
    __publicField(this, 'instBuf');
    /** 编好后取的 uniform 位置：主画面、雾的预渲染、楼群缓存的补画。 */
    __publicField(this, 'U', {});
    __publicField(this, 'F', {});
    __publicField(this, 'B', {});
    /** 楼群缓存，只有雨夜街景有（水族箱没有楼群，不建这几张纹理）。 */
    __publicField(this, 'bld');
    __publicField(this, 'uView', null);
    __publicField(this, 'uFogB', null);
    __publicField(this, 'linked', false);
    __publicField(this, 'mask');
    __publicField(this, 'drop');
    __publicField(this, 'field');
    __publicField(this, 'sprite');
    __publicField(this, 'breath');
    __publicField(this, 'fogGl');
    __publicField(this, 'fogOK');
    __publicField(this, 'noise');
    __publicField(this, 'snow');
    /** 凝露玻璃上的萤虫；别的玻璃 null。 */
    __publicField(this, 'fireflies');
    __publicField(this, 'W', 1);
    __publicField(this, 'H', 1);
    __publicField(this, 'spriteReady', false);
    /** 白气纹理里是哪一版画布、多大（版本没变不重传）。 */
    __publicField(this, 'breathVersion', -1);
    __publicField(this, 'breathW', 0);
    __publicField(this, 'breathH', 0);
    /** 雾上水珠纹理是不是还是对的：换尺寸后、精灵贴图加载好之前画的都不算，下一帧照画。 */
    __publicField(this, 'fieldValid', false);
    __publicField(this, 'instData', new Float32Array(0));
    /** 主题配色：编好之前先记下，编好时补上。 */
    __publicField(this, 'palette', null);
    /** 透明时雾的颜色（0..1 的 RGB），跟主题日夜。 */
    __publicField(this, 'mistTint', [0.07, 0.08, 0.1]);
    /** 精灵贴图加载好时调（这之前不画水珠）。 */
    __publicField(this, 'onSpriteReady', null);
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: seeThrough,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('Nebbia: WebGL2 unavailable');
    this.gl = gl;
    this.fogOK = canRenderFogToFloat(gl);
    this.build = new NebbiaProgramBuild(gl, this.fogOK, scene, glass);
    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.mask = new NebbiaMaskGl(gl, 2);
    this.drop = makeTex(gl, 3);
    this.field = makeTex(gl, 4);
    this.sprite = makeTex(gl, 5);
    this.fogGl = new NebbiaFogGl(gl, 6, this.fogOK, glass === 'dew' && !seeThrough ? 1 : null);
    this.breath = makeTex(gl, 8);
    this.bld = scene === 'night' ? new NebbiaBuildingCache(gl, 9) : null;
    this.noise = new NebbiaNoiseTex(gl, 15);
    this.snow = glass === 'snow' ? new NebbiaSnowGl(gl, 1) : null;
    this.fireflies = glass === 'dew' ? new NebbiaFireflyGl(gl) : null;
    this.spriteVao = gl.createVertexArray();
    gl.bindVertexArray(this.spriteVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.instBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
    this.loadSprite();
  }
  get isContextLost() {
    return this.gl.isContextLost();
  }
  /** 着色器编好了没有（没编好不等）；编好的那一次取 uniform 位置、指好采样器。链接失败时抛错。 */
  get ready() {
    var _a, _b, _c, _d;
    if (this.linked) return true;
    if (!this.build.poll()) return false;
    const { gl } = this;
    const { main, fog, sprite, mask, bldFill, flake, firefly } = this.build.programs;
    this.mask.attach(mask);
    this.U = locate(gl, main, MAIN_UNIFORMS);
    gl.useProgram(main);
    const [fogBlur, fogGlow, fogSharp] = this.fogGl.layers;
    const samplers = [
      ['uMask', this.mask.tex],
      ['uDrop', this.drop],
      ['uField', this.field],
      ['uFogBlur', fogBlur.tex],
      ['uFogGlow', fogGlow.tex],
      ['uBreath', this.breath],
      ['uNoise', this.noise.tex],
    ];
    if (fogSharp) samplers.push(['uFogSharp', fogSharp.tex]);
    for (const [name, tex] of samplers) gl.uniform1i(gl.getUniformLocation(main, name), tex.unit);
    gl.uniform1f(this.U.uBreathThick, NEBBIA_FIXED.breathThick);
    gl.uniform1i(this.U.uSeeThrough, this.seeThrough ? 1 : 0);
    (_a = this.bld) == null ? void 0 : _a.bindSamplers(main);
    if (fog) {
      this.F = locate(gl, fog, SCENE_UNIFORMS);
      this.uFogB = gl.getUniformLocation(fog, 'uFogB');
      (_b = this.bld) == null ? void 0 : _b.bindSamplers(fog);
    }
    if (bldFill) this.B = locate(gl, bldFill, [...PALETTE_UNIFORMS, ...BLD_FILL_UNIFORMS]);
    if (flake)
      (_c = this.snow) == null
        ? void 0
        : _c.attach(flake, fogGlow.tex.unit, fogBlur.tex.unit, this.fogOK && !this.seeThrough);
    if (firefly)
      (_d = this.fireflies) == null
        ? void 0
        : _d.attach(firefly, fogGlow.tex.unit, this.fogOK && !this.seeThrough);
    gl.useProgram(sprite);
    this.uView = gl.getUniformLocation(sprite, 'uView');
    gl.uniform1i(gl.getUniformLocation(sprite, 'uSprite'), this.sprite.unit);
    this.linked = true;
    if (this.palette) this.applyPalette(this.palette);
    return true;
  }
  loadSprite() {
    const img = new Image();
    img.onload = () => {
      var _a;
      const { gl } = this;
      if (gl.isContextLost()) return;
      gl.activeTexture(gl.TEXTURE0 + this.sprite.unit);
      gl.bindTexture(gl.TEXTURE_2D, this.sprite.t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      this.spriteReady = true;
      (_a = this.onSpriteReady) == null ? void 0 : _a.call(this);
    };
    img.src = raindropSpriteUrl;
  }
  /** 主题配色：天色两档、三个灯光色，0..1 的 RGB。 */
  setPalette(sky0, sky1, la, lb, lc) {
    this.palette = [sky0, sky1, la, lb, lc];
    if (this.linked) this.applyPalette(this.palette);
  }
  applyPalette([sky0, sky1, la, lb, lc]) {
    var _a;
    const { gl } = this;
    const { main, fog, bldFill } = this.build.programs;
    for (const [prog, L] of [
      [main, this.U],
      [fog, this.F],
      [bldFill, this.B],
    ]) {
      if (!prog) continue;
      gl.useProgram(prog);
      gl.uniform3fv(L.uSky0, sky0);
      gl.uniform3fv(L.uSky1, sky1);
      gl.uniform3fv(L.uLa, la);
      gl.uniform3fv(L.uLb, lb);
      gl.uniform3fv(L.uLc, lc);
    }
    (_a = this.bld) == null ? void 0 : _a.invalidate();
  }
  /** W、H 是 CSS 像素（水珠纹理用这个分辨率），dpr 是画布的像素比。 */
  resize(W, H, dpr) {
    var _a;
    const { gl } = this;
    this.W = Math.max(1, Math.round(W));
    this.H = Math.max(1, Math.round(H));
    this.canvas.width = Math.max(1, Math.round(W * dpr));
    this.canvas.height = Math.max(1, Math.round(H * dpr));
    this.mask.resize(W, H);
    this.fieldValid = false;
    for (const tex of [this.drop, this.field]) {
      gl.activeTexture(gl.TEXTURE0 + tex.unit);
      gl.bindTexture(gl.TEXTURE_2D, tex.t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.W, this.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      if (!tex.fb) tex.fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, tex.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.t, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fogGl.resize(this.canvas.width, this.canvas.height);
    this.noise.resize(this.canvas.width, this.canvas.height);
    (_a = this.bld) == null
      ? void 0
      : _a.resize(
          this.canvas.width,
          this.canvas.height,
          Math.max(1, Math.ceil(this.canvas.height / FOG_DIV)),
        );
  }
  // 水珠实例画进一张水珠纹理（CSS 分辨率）
  // inst 是 Float32Array（凝露的冷凝水珠，nebbiaCondensation.ts）时直接上传，不再拷一遍
  renderDrops(tex, inst) {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, tex.fb);
    gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (inst.length && this.spriteReady) {
      let data;
      if (inst instanceof Float32Array) data = inst;
      else {
        if (this.instData.length < inst.length)
          this.instData = new Float32Array(Math.ceil(inst.length * 1.5));
        this.instData.set(inst);
        data = this.instData.subarray(0, inst.length);
      }
      gl.useProgram(this.build.programs.sprite);
      gl.bindVertexArray(this.spriteVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.uniform2f(this.uView, this.W, this.H);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.ONE_MINUS_DST_COLOR,
        gl.ONE_MINUS_SRC_COLOR,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
      );
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, inst.length / 6);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  // 街景要的 uniform（两个程序都设）
  setScene(L, u) {
    const { gl } = this;
    gl.uniform2f(L.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(L.uTime, u.time);
    gl.uniform1f(L.uBus, u.bus);
    gl.uniform1f(L.uNeon, u.neon);
    gl.uniform2fv(L.uSceneShift, u.sceneShift);
    gl.uniform2fv(L.uSpotSrc, u.spotSrc);
    gl.uniform2fv(L.uSpotSrc2, u.spotSrc2);
    gl.uniform2fv(L.uSpotTgt, u.spotTgt);
    gl.uniform1f(L.uSpotR, u.spotR);
    gl.uniform1f(L.uSpotI, u.spotI);
    gl.uniform1i(L.uScenery, u.scenery);
    gl.uniform1f(L.uDewGlint, u.dewGlint);
    if (u.aqua) {
      gl.uniform4fv(L.uJelly, u.aqua.jelly);
      gl.uniform4fv(L.uJellyC, u.aqua.jellyColor);
      gl.uniform1i(L.uJellyN, u.aqua.count);
      gl.uniform1f(L.uBubbles, u.aqua.bubbles);
      gl.uniform4fv(L.uSway, u.aqua.sway);
      gl.uniform4fv(L.uBurst, u.aqua.bursts);
      gl.uniform1i(L.uBurstN, u.aqua.burstCount);
      gl.uniform1f(L.uBeatRows, u.aqua.beatRows);
      gl.uniform1f(L.uWeedIdle, u.aqua.weedIdle);
    }
  }
  // 楼群缓存的取样状态（两个程序都设）
  setBuildings(L, s) {
    const { gl } = this;
    gl.uniform3i(L.uBldOn, s.on[0], s.on[1], s.on[2]);
    gl.uniform3fv(L.uBldGeo, s.geo);
  }
  /**
   * 画一帧（`ready` 为真之后才调）：擦痕遮罩，白气遮罩上传（这一帧有哈气、且画布重画过才传，`breath` 为 null 就不传），
   * 两张水珠纹理，补画楼群缓存，静态噪声纹理（改尺寸后算一次），雾的预渲染，主画面。
   */
  render(mask, breath, drops, field, u, fieldChanged = true) {
    const { gl, U } = this;
    const { main, fog, bldFill, noise } = this.build.programs;
    this.mask.draw(mask);
    if (breath && breath.version !== this.breathVersion) {
      const { canvas: c } = breath;
      gl.activeTexture(gl.TEXTURE0 + this.breath.unit);
      gl.bindTexture(gl.TEXTURE_2D, this.breath.t);
      if (c.width === this.breathW && c.height === this.breathH)
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, c);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      this.breathVersion = breath.version;
      this.breathW = c.width;
      this.breathH = c.height;
    }
    this.renderDrops(this.drop, drops);
    if (fieldChanged || !this.fieldValid) {
      this.renderDrops(this.field, field);
      this.fieldValid = this.spriteReady;
    }
    gl.bindVertexArray(this.quadVao);
    const buildings =
      u.scenery & SCN_BUILDINGS && !this.seeThrough && bldFill && this.bld
        ? this.bld.update(u.time * u.bus, bldFill, this.B)
        : NO_BUILDINGS;
    const noiseOn = this.noise.update(noise);
    if (fog && !this.seeThrough) {
      gl.useProgram(fog);
      this.setScene(this.F, u);
      this.setBuildings(this.F, buildings);
      this.fogGl.draw(this.uFogB);
    }
    gl.useProgram(main);
    this.setScene(U, u);
    this.setBuildings(U, buildings);
    gl.uniform1f(U.uMist, u.mist);
    gl.uniform1f(U.uEdge, u.edge);
    gl.uniform1f(U.uRefract, u.refract);
    gl.uniform1f(U.uGlint, u.glint);
    gl.uniform2fv(U.uGlassShift, u.glassShift);
    gl.uniform1i(U.uBreathOn, breath ? 1 : 0);
    gl.uniform1i(U.uNoiseOn, noiseOn ? 1 : 0);
    gl.uniform3fv(U.uMistTint, this.mistTint);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }
  /** 雪花图集（雪窗才有）。 */
  setFlakeAtlas(canvas, rows) {
    var _a;
    (_a = this.snow) == null ? void 0 : _a.setAtlas(canvas, rows);
  }
  /** render 之后叠上雪花：count 片，shift 是这一帧的玻璃颠簸（uniform 里的 glassShift）。 */
  drawFlakes(data, count, shift) {
    var _a;
    (_a = this.snow) == null
      ? void 0
      : _a.draw(data, count, this.W, this.H, [-shift[0] * this.W, -shift[1] * this.H]);
  }
  /** render 之后叠上凝露玻璃上的萤虫：count 只（nebbiaFireflies.ts 排好的实例）。 */
  drawFireflies(data, count) {
    var _a;
    (_a = this.fireflies) == null ? void 0 : _a.draw(data, count, this.W, this.H);
  }
  destroy() {
    var _a;
    (_a = this.gl.getExtension('WEBGL_lose_context')) == null ? void 0 : _a.loseContext();
  }
}
export { NebbiaGl };
