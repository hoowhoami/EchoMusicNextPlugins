// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaNoiseTex.ts
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { makeTex } from './nebbiaGlUtils.mjs';
class NebbiaNoiseTex {
  constructor(gl, unit) {
    __publicField(this, 'gl', gl);
    __publicField(this, 'tex');
    __publicField(this, 'fb');
    __publicField(this, 'w', 1);
    __publicField(this, 'h', 1);
    __publicField(this, 'ok', false);
    __publicField(this, 'dirty', false);
    this.tex = makeTex(gl, unit);
    this.fb = gl.createFramebuffer();
  }
  /** 画布的像素尺寸。 */
  resize(w, h) {
    const { gl } = this;
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.w = w;
    this.h = h;
    this.ok = w <= max && h <= max;
    if (!this.ok) return;
    gl.activeTexture(gl.TEXTURE0 + this.tex.unit);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex.t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.dirty = true;
  }
  /**
   * 每帧在主画面之前调（全屏四边形已绑好）：改过尺寸就用 `prog`（NEBBIA_NOISE_FS）重算一次；返回主画面能不能取纹理（uNoiseOn）。
   * 调完当前程序可能是 `prog`。
   */
  update(prog) {
    const { gl } = this;
    if (this.ok && this.dirty) {
      gl.activeTexture(gl.TEXTURE0 + this.tex.unit);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.useProgram(prog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
      gl.viewport(0, 0, this.w, this.h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.t);
      this.dirty = false;
    }
    return this.ok;
  }
}
export { NebbiaNoiseTex };
