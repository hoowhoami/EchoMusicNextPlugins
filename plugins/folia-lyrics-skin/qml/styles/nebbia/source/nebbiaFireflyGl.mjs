// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaFireflyGl.ts
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
import { FIREFLY_FLOATS, fireflyParams } from './nebbiaFireflies.mjs';
const NEBBIA_FIREFLY_VS =
  /* glsl */
  `#version 300 es
in vec2 aCorner; in vec4 aA; in vec4 aB; in vec4 aC;
uniform vec2 uView; uniform float uHalo;
out vec2 vLocal; out vec2 vFu; flat out vec4 vP; flat out vec4 vGlow;
void main() {
  // \u65B9\u5757\u8981\u76D6\u4F4F\u7CCA\u5F00\u7684\u866B\u5B50\u548C\u67D4\u5149\uFF1A\u67D4\u5149\u5230\u65B9\u5757\u8FB9\u4E0A\u8981\u6DE1\u5230\u770B\u4E0D\u51FA\uFF08\u4F4E\u4E8E 1/255\uFF09\uFF0C\u4E0D\u7136\u706F\u4E0B\u770B\u5F97\u89C1\u65B9\u6846
  float ext = max(2.6, 4.1 * uHalo);
  vec2 c = (aCorner * 2.0 - 1.0) * ext;
  // \u6309\u8EAB\u5B50\u671D\u5411\u8F6C\uFF1AvLocal \u662F\u866B\u5B50\u81EA\u5DF1\u7684\u5750\u6807\uFF08x \u671D\u5934\uFF0C\u5355\u4F4D\u662F\u534A\u5F84\uFF09
  float cs = cos(aB.z), sn = sin(aB.z);
  vec2 off = c * aA.z;
  vec2 p = aA.xy + vec2(off.x * cs - off.y * sn, off.x * sn + off.y * cs);
  vLocal = c; vP = vec4(aA.w, aB.x, aB.y, aB.w); vGlow = aC;
  // \u96FE\u7684\u9884\u6E32\u67D3\u7EB9\u7406\u7B2C 0 \u884C\u662F\u5C4F\u5E55\u5E95\u90E8
  vFu = vec2(p.x / uView.x, 1.0 - p.y / uView.y);
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}`;
const NEBBIA_FIREFLY_FS =
  /* glsl */
  `#version 300 es
precision mediump float;
uniform sampler2D uGlow;
// uHalo \u4E24\u8FB9\u90FD\u7528\uFF1A\u548C\u9876\u70B9\u7740\u8272\u5668\u7684\u7CBE\u5EA6\u8981\u4E00\u6837
uniform bool uLit; uniform highp float uHalo;
in vec2 vLocal; in vec2 vFu; flat in vec4 vP; flat in vec4 vGlow;
out vec4 o;
// \u4E00\u4E2A\u692D\u5706\uFF08\u4E2D\u5FC3 c\u3001\u534A\u8F74 ab\u3001\u8F6C a \u5F27\u5EA6\uFF09\u7684\u8986\u76D6\uFF0C\u8FB9\u7F18\u5BBD e
float blob(vec2 q, vec2 c, vec2 ab, float a, float e) {
  q -= c;
  float cs = cos(a), sn = sin(a);
  q = vec2(q.x * cs + q.y * sn, -q.x * sn + q.y * cs) / ab;
  return 1.0 - smoothstep(1.0 - e, 1.0 + e, length(q));
}
void main() {
  float p = vP.y, flap = vP.w;
  vec2 q = vLocal;
  // \u6CA1\u5BF9\u4E0A\u7126\uFF1A\u8FB9\u7F18\u7CCA\u5F00
  float e = 0.18 + 0.9 * (1.0 - p);
  // \u8EAB\u5B50\uFF1A\u5934\u3001\u80F8\u3001\u957F\u4E00\u70B9\u7684\u809A\u5B50
  float body = max(max(blob(q, vec2(0.62, 0.0), vec2(0.17, 0.15), 0.0, e),
                       blob(q, vec2(0.3, 0.0), vec2(0.22, 0.2), 0.0, e)),
                   blob(q, vec2(-0.25, 0.0), vec2(0.48, 0.19), 0.0, e));
  // \u7FC5\u8180\uFF1A\u6536\u62E2\u65F6\u76D6\u5728\u80CC\u4E0A\u5F80\u540E\uFF0C\u5F20\u5F00\u65F6\u5F80\u4E24\u8FB9\u6446\uFF1B\u6247\u5F97\u5FEB\uFF0C\u770B\u7740\u662F\u4E00\u7247\u534A\u900F\u660E\u7684\u7CCA\u5F71
  float wa = 0.12 + 1.2 * flap, we = e + 0.3 * flap;
  float wing = max(blob(q, vec2(-0.15 + 0.2 * flap, 0.08 + 0.45 * flap), vec2(0.62, 0.17), wa, we),
                   blob(q, vec2(-0.15 + 0.2 * flap, -0.08 - 0.45 * flap), vec2(0.62, 0.17), -wa, we));
  // \u8EAB\u540E\u7684\u5149\uFF1A\u989C\u8272\u5E26\u5927\u534A\uFF0C\u4EAE\u5EA6\u8DDF\u7740\u8D70\uFF1A\u6697\u5904\u538B\u5F97\u5F88\u6697\uFF0C\u706F\u4E0B\u4EAE\u8FC7\u96FE
  vec3 L = uLit ? texture(uGlow, vFu).rgb : vec3(0.42);
  float lum = dot(L, vec3(0.3, 0.59, 0.11));
  vec3 hue = clamp(mix(vec3(1.0), L / max(lum, 0.02), 0.8), 0.0, 2.2);
  vec3 lit = hue * clamp(0.22 + 2.5 * lum, 0.0, 1.4);
  // \u8EAB\u5B50\u6DE1\u6DE1\u7684\u767D\uFF1B\u7FC5\u8180\u66F4\u8584\u3001\u900F\u5149\uFF0C\u53E0\u5728\u8EAB\u5B50\u4E0A\u9762
  float ab = body * 0.5, aw = wing * (0.3 - 0.1 * flap);
  float ca = (aw + ab * (1.0 - aw)) * vP.x;
  vec3 rgb = (vec3(0.95, 0.97, 1.0) * aw + vec3(0.86, 0.88, 0.92) * ab * (1.0 - aw)) * lit * vP.x;
  float d = length(q);
  // \u8FD8\u6CA1\u98D8\u5230\u7126\u70B9\u4E0A\uFF1A\u5916\u9762\u5957\u4E00\u5708\u7CCA\u7684
  float ha = 0.35 * (1.0 - p) * max(0.0, 1.0 - d / (1.6 - 0.6 * p)) * vP.x;
  rgb = vec3(0.92, 0.95, 1.0) * lit * ha + rgb * (1.0 - ha);
  float a = ha + ca * (1.0 - ha);
  // \u9760\u8FD1\u4EAE\u5149\uFF1A\u6563\u4E00\u5708\u5F88\u6DE1\u7684\u67D4\u5149\uFF08\u53EA\u52A0\u989C\u8272\uFF09\uFF1B\u6CA1\u6709\u5149\u7167\uFF08\u900F\u660E\uFF09\u65F6\u4E0D\u52A0
  // \u8EAB\u540E\u5DF2\u7ECF\u5F88\u4EAE\uFF08\u805A\u5149\u706F\u6B63\u7167\u7740\uFF09\u65F6\u67D4\u5149\u6536\u6389\u5927\u534A\uFF1A\u518D\u5F80\u4EAE\u5904\u52A0\u5149\u53EA\u4F1A\u53E0\u6210\u4E00\u7247\u767D
  float soft = float(uLit) * smoothstep(0.12, 0.6, lum) * (1.0 - 0.75 * smoothstep(0.6, 1.2, lum)) * 0.45 * exp(-d * d * 0.3 / (uHalo * uHalo)) * vP.z;
  // \u5C3E\u5DF4\u7684\u5149\uFF1A\u809A\u5B50\u5C16\u4E0A\u4E00\u5C0F\u56E2\uFF0C\u5916\u9762\u4E00\u5C0F\u5708\u5149\u6655\uFF0C\u53EA\u52A0\u989C\u8272\uFF08\u81EA\u5DF1\u53D1\u5149\uFF0C\u4E0D\u6321\u540E\u9762\uFF09\uFF1B\u6CA1\u5BF9\u4E0A\u7126\u65F6\u7CCA\u5927
  float dt = length(q - vec2(-0.55, 0.0)), gr = 0.45 + 0.35 * (1.0 - p);
  float lamp = (1.0 - smoothstep(0.0, gr, dt)) + 0.8 * exp(-dt * dt * 0.7);
  // \u4E2D\u5FC3\u504F\u767D\u4E00\u70B9\uFF08\u4EAE\u5230\u53D1\u767D\uFF09\uFF0C\u5916\u5708\u662F\u706F\u5149\u8272
  vec3 tint = mix(vGlow.yzw, vec3(1.0), 0.35 * (1.0 - smoothstep(0.0, gr, dt)));
  vec3 glow = tint * lamp * vGlow.x * vP.x * mix(0.5, 1.0, p);
  o = vec4(rgb + min(L, vec3(1.2)) * soft + glow, a);
}`;
class NebbiaFireflyGl {
  constructor(gl) {
    __publicField(this, 'gl', gl);
    __publicField(this, 'vao');
    __publicField(this, 'buf');
    __publicField(this, 'prog', null);
    __publicField(this, 'uView', null);
    __publicField(this, 'uHalo', null);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const stride = FIREFLY_FLOATS * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 32);
    gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);
  }
  /** 程序编好时调：取 uniform 位置，指好雾的光晕层（glowUnit）；lit 为假时不取光。 */
  attach(prog, glowUnit, lit) {
    const { gl } = this;
    this.prog = prog;
    gl.useProgram(prog);
    this.uView = gl.getUniformLocation(prog, 'uView');
    this.uHalo = gl.getUniformLocation(prog, 'uHalo');
    gl.uniform1i(gl.getUniformLocation(prog, 'uGlow'), glowUnit);
    gl.uniform1i(gl.getUniformLocation(prog, 'uLit'), lit ? 1 : 0);
  }
  /** 叠到当前帧缓冲上：data 里 count 只，W、H 是 CSS 像素。 */
  draw(data, count, W, H) {
    const { gl } = this;
    if (!this.prog || !count) return;
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * FIREFLY_FLOATS), gl.DYNAMIC_DRAW);
    gl.uniform2f(this.uView, W, H);
    gl.uniform1f(this.uHalo, Math.max(0.05, fireflyParams.halo));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}
export { NEBBIA_FIREFLY_FS, NEBBIA_FIREFLY_VS, NebbiaFireflyGl };
