// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaFogGl.ts
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
import { FOG_DIV } from './nebbiaConstants.mjs';
import { makeTex } from './nebbiaGlUtils.mjs';
const SHARP_DIV = 4;
class NebbiaFogGl {
  constructor(gl, unit, ok, sharpUnit = null) {
    __publicField(this, 'gl', gl);
    __publicField(this, 'ok', ok);
    /** 两层：0.03 的（主画面的 uFogBlur）、0.09 的（uFogGlow），纹理挂在 `unit`、`unit + 1`；凝露玻璃再加清晰的一层（uFogSharp）挂在 `sharpUnit`。 */
    __publicField(this, 'layers');
    this.layers = [
      {
        tex: makeTex(gl, unit),
        fb: ok ? gl.createFramebuffer() : null,
        div: FOG_DIV,
        b: 0.03,
        w: 1,
        h: 1,
      },
      {
        tex: makeTex(gl, unit + 1),
        fb: ok ? gl.createFramebuffer() : null,
        div: FOG_DIV * 2,
        b: 0.09,
        w: 1,
        h: 1,
      },
    ];
    if (ok && sharpUnit !== null)
      this.layers.push({
        tex: makeTex(gl, sharpUnit),
        fb: gl.createFramebuffer(),
        div: SHARP_DIV,
        b: 6e-3,
        w: 1,
        h: 1,
      });
  }
  /** 画布的像素尺寸。帧缓冲能不能拼起来在建上下文时已经试过，这里不再同步查状态。 */
  resize(canvasW, canvasH) {
    const { gl } = this;
    if (!this.ok) return;
    for (const L of this.layers) {
      L.w = Math.max(1, Math.ceil(canvasW / L.div));
      L.h = Math.max(1, Math.ceil(canvasH / L.div));
      gl.activeTexture(gl.TEXTURE0 + L.tex.unit);
      gl.bindTexture(gl.TEXTURE_2D, L.tex.t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, L.w, L.h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, L.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, L.tex.t, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /**
   * 每帧在主画面之前调：雾的预渲染程序是当前程序、街景 uniform 已设好、全屏四边形已绑好；`uFogB` 是那个程序里模糊半径的位置。
   * 预渲染程序只采样楼群缓存，画进雾纹理不会和采样单元成反馈环。
   */
  draw(uFogB) {
    const { gl } = this;
    if (!this.ok) return;
    for (const L of this.layers) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, L.fb);
      gl.viewport(0, 0, L.w, L.h);
      gl.uniform1f(uFogB, L.b);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
export { NebbiaFogGl };
