// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaMaskGl.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { MASK_SCALE } from './nebbiaConstants.mjs';
import { makeTex } from './nebbiaGlUtils.mjs';
import { SEGMENT_FLOATS } from './nebbiaSegments.mjs';
const NEBBIA_MASK_VS =
  /* glsl */
  `#version 300 es
in vec2 aCorner; in vec4 aSeg; in vec2 aParam;
uniform vec2 uView;
out vec2 vP; flat out vec4 vSeg; flat out vec2 vParam;
void main() {
  vec2 a = aSeg.xy, b = aSeg.zw, d = b - a;
  float l = length(d);
  vec2 t = l > 1e-5 ? d / l : vec2(1.0, 0.0), n = vec2(-t.y, t.x);
  // \u6700\u5BBD\u90A3\u5C42\u7684\u534A\u5BBD\u518D\u7559 1 \u50CF\u7D20\u6297\u952F\u9F7F
  float R = aParam.x * 0.65 + 1.0;
  vec2 p = (a + b) * 0.5 + t * aCorner.x * (l * 0.5 + R) + n * aCorner.y * R;
  vP = p; vSeg = aSeg; vParam = aParam;
  gl_Position = vec4(p / uView * 2.0 - 1.0, 0.0, 1.0);
}`;
const NEBBIA_MASK_FS =
  /* glsl */
  `#version 300 es
precision highp float;
in vec2 vP; flat in vec4 vSeg; flat in vec2 vParam;
out vec4 o;
// \u534A\u5BBD r \u7684\u7EBF\u79BB\u50CF\u7D20\u4E2D\u5FC3 d \u65F6\u7684\u8986\u76D6\u5EA6\uFF081 \u50CF\u7D20\u7EBF\u6027\u8FC7\u6E21\uFF0C\u63A5\u8FD1\u753B\u5E03\u7684\u6297\u952F\u9F7F\uFF09
float cover(float r, float d) { return clamp(r + 0.5 - d, 0.0, 1.0); }
// \u753B\u5E03\u7684\u989C\u8272\u662F 8 \u4F4D\uFF1A\u5148\u91CF\u5316\u518D\u4E58\u8986\u76D6\u5EA6
float level(float x) { return floor(x * 255.0 + 0.5) / 255.0; }
void main() {
  vec2 a = vSeg.xy, ba = vSeg.zw - a, pa = vP - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  float d = length(pa - ba * h), w = vParam.x * 0.5, v = vParam.y;
  // \u4E09\u5C42\u6309\u753B\u5E03\u7684 lighten \u4E00\u5C42\u5C42\u53E0\uFF1A\u6BCF\u5C42\u90FD\u6BD4\u4E0B\u9762\u4EAE\uFF0C\u8986\u76D6\u5EA6 a \u7684\u50CF\u7D20\u662F m + a \xD7 (\u8FD9\u5C42 \u2212 m)
  float m = level(v * 0.38) * cover(w * 1.3, d);
  m += cover(w, d) * (level(v * 0.72) - m);
  m += cover(w * 0.62, d) * (level(v) - m);
  o = vec4(m, 0.0, 0.0, 1.0);
}`;
class NebbiaMaskGl {
  /** 纹理挂在采样单元 `unit` 上（主程序的 uMask 由 nebbiaGl.ts 编好后指过来）。 */
  constructor(gl, unit) {
    __publicField(this, 'gl', gl);
    /** 主程序 uMask 采样的那张纹理。 */
    __publicField(this, 'tex');
    __publicField(this, 'prog', null);
    __publicField(this, 'vao');
    __publicField(this, 'buf');
    __publicField(this, 'uView', null);
    __publicField(this, 'fb');
    __publicField(this, 'w', 1);
    __publicField(this, 'h', 1);
    this.tex = makeTex(gl, unit);
    this.fb = gl.createFramebuffer();
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const stride = SEGMENT_FLOATS * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
  }
  /** 编好的遮罩程序（nebbiaPrograms.ts 的 `mask`）。 */
  attach(prog) {
    this.prog = prog;
    this.uView = this.gl.getUniformLocation(prog, 'uView');
  }
  /** W、H 是 CSS 像素，遮罩按 MASK_SCALE 缩（和原来的遮罩画布一样大）。 */
  resize(W, H) {
    const { gl } = this;
    this.w = Math.max(1, Math.round(W * MASK_SCALE));
    this.h = Math.max(1, Math.round(H * MASK_SCALE));
    gl.activeTexture(gl.TEXTURE0 + this.tex.unit);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.w, this.h, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex.t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /** 清成全雾，再把这一帧的线段画上去。画完恢复默认的加法混合（水珠那一趟只设混合因子）。 */
  draw(segs) {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (segs.count && this.prog) {
      gl.useProgram(this.prog);
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        segs.data.subarray(0, segs.count * SEGMENT_FLOATS),
        gl.DYNAMIC_DRAW,
      );
      gl.uniform2f(this.uView, this.w, this.h);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.MAX);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, segs.count);
      gl.blendEquation(gl.FUNC_ADD);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
export { NEBBIA_MASK_FS, NEBBIA_MASK_VS, NebbiaMaskGl };
