// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSnowGl.ts
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { FLAKE_FILL, FLAKE_STAGES } from './nebbiaSnowFlakes.mjs';
import { makeTex } from './nebbiaGlUtils.mjs';
import { NEBBIA_FIRE_GLSL } from './nebbiaFireGlsl.mjs';
const FLAKE_FLOATS = 10;
const GLINT_GRID = '9.0';
const EXT = 2.6;
const NEBBIA_FLAKE_VS =
  /* glsl */
  `#version 300 es
in vec2 aCorner; in vec4 aA; in vec4 aB; in vec2 aC;
uniform vec2 uView, uShift;
out vec2 vLocal; out vec2 vHalo; out vec2 vFu; flat out vec4 vB; flat out float vR; flat out float vSeed;
void main() {
  vec2 c = (aCorner * 2.0 - 1.0) * ${EXT.toFixed(2)};
  float cs = cos(aA.w), sn = sin(aA.w);
  vec2 off = c * aA.z;
  vec2 p = aA.xy + vec2(off.x * cs - off.y * sn, off.x * sn + off.y * cs) + uShift;
  // vLocal\uFF1A\u8D34\u56FE\u91CC\u7684\u5750\u6807\uFF08\u5355\u4F4D\u662F\u96EA\u82B1\u534A\u5F84\uFF0C\u538B\u6241\u4E4B\u524D\uFF09\uFF1BvHalo\uFF1A\u7CCA\u5149\u3001\u67D4\u5149\u7528\u7684\uFF08\u4E0D\u538B\u6241\uFF09
  vLocal = c / aC; vHalo = c; vB = aB; vR = aA.z;
  // \u6BCF\u7247\u96EA\u81EA\u5DF1\u7684\u968F\u673A\u6570\uFF08\u95EA\u5149\u7528\uFF09\uFF1A\u8D34\u4E0A\u4EE5\u540E\u8F6C\u89D2\u3001\u79CD\u7C7B\u90FD\u4E0D\u518D\u53D8
  vSeed = fract(sin(aA.w * 12.9898 + aB.y * 78.233) * 43758.5453);
  // \u96FE\u7684\u9884\u6E32\u67D3\u7EB9\u7406\u7B2C 0 \u884C\u662F\u5C4F\u5E55\u5E95\u90E8
  vFu = vec2(p.x / uView.x, 1.0 - p.y / uView.y);
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}`;
const NEBBIA_FLAKE_FS =
  /* glsl */
  `#version 300 es
precision mediump float;
uniform sampler2D uAtlas, uGlow, uBehind;
uniform bool uLit; uniform vec2 uGrid; uniform highp vec2 uView;
in vec2 vLocal; in vec2 vHalo; in vec2 vFu; flat in vec4 vB; flat in float vR; flat in float vSeed;
out vec4 o;
${NEBBIA_FIRE_GLSL}
vec4 tile(float col, vec2 t, float bias) { return texture(uAtlas, (vec2(col, vB.y) + t) / uGrid, bias); }
void main() {
  float p = vB.w;
  vec2 t = 0.5 + vLocal * ${(FLAKE_FILL / 2).toFixed(3)};
  // \u76F8\u90BB\u4E24\u4E2A\u878D\u5316\u9636\u6BB5\u4EA4\u53C9\uFF1B\u8FD8\u6CA1\u98D8\u5230\u7126\u70B9\u4E0A\u7684\u53D6\u66F4\u7CCA\u7684\u4E00\u7EA7\u3002\u4E0D\u653E\u5728\u5206\u652F\u91CC\u53D6\uFF08\u5206\u652F\u91CC\u53D6\u6837\u7684 mipmap \u7EA7\u522B\u4E0D\u53EF\u9760\uFF09\uFF0C\u683C\u5B50\u5916\u9762\u4E58 0
  float st = floor(vB.x), fr = vB.x - st, bias = 2.0 * (1.0 - p);
  vec2 tc = clamp(t, 0.0, 1.0);
  vec4 c = mix(tile(st, tc, bias), tile(min(st + 1.0, uGrid.x - 1.0), tc, bias), fr);
  c *= vB.z * float(t == tc);
  // \u8EAB\u540E\u7684\u5149\uFF1A\u989C\u8272\u5E26\u5927\u534A\uFF08\u8FD8\u770B\u5F97\u51FA\u662F\u767D\u96EA\uFF09\uFF0C\u4EAE\u5EA6\u8DDF\u7740\u8D70\uFF1A\u6697\u5904\u538B\u5F97\u5F88\u6697\uFF0C\u706F\u4E0B\u4EAE\u8FC7\u96FE
  vec3 L = uLit ? texture(uGlow, vFu).rgb : vec3(0.42);
  float lum = dot(L, vec3(0.3, 0.59, 0.11));
  vec3 hue = clamp(mix(vec3(1.0), L / max(lum, 0.02), 0.8), 0.0, 2.2);
  vec3 lit = hue * clamp(0.22 + 2.5 * lum, 0.0, 1.4);
  vec3 rgb = c.rgb * lit;
  // \u9006\u5149\uFF08\u8EAB\u540E\u6709\u4EAE\u5149\uFF09\uFF1A\u96EA\u50CF\u51B0\u4E00\u6837\u88AB\u7167\u900F\u3002\u51B0\u6676\u7684\u539A\u8584\uFF08\u8D34\u56FE\u7684\u4E0D\u900F\u660E\u5EA6\uFF09\u5F53\u6210\u8868\u9762\u7684\u8D77\u4F0F\uFF0C\u659C\u7684\u5730\u65B9\u628A\u8EAB\u540E\u7684\u7A97\u5916\u5F80\u91CC\u6298\uFF08\u53D6\u4E3B\u753B\u9762\u90A3\u5C42\u7A0D\u7CCA\u7684\u7A97\u5916\uFF0CuBehind\uFF09\uFF0C
  // \u900F\u8FC7\u6765\u7684\u5149\u6BD4\u56DB\u5468\u4EAE\u4E00\u70B9\uFF1B\u8584\u7684\u8FB9\u3001\u659C\u9762\u4E0A\u518D\u4EAE\u4E00\u9053\u3002\u6697\u5904\u7167\u65E7\u662F\u767D\u96EA\u3002\u53EA\u5728\u5BF9\u4E0A\u7126\uFF08\u8D34\u4E0A\u73BB\u7483\uFF09\u540E\uFF0C\u5316\u5F97\u8D8A\u591A\u8D8A\u5F31\uFF08\u5316\u6210\u6C34\u4EA4\u7ED9\u6C34\u73E0\u53BB\u6298\u5C04\uFF09
  float back = float(uLit) * smoothstep(0.08, 0.45, lum) * p * (1.0 - 0.7 * vB.x / ${(FLAKE_STAGES - 1).toFixed(1)});
  float a0 = c.a / max(vB.z, 0.001);
  vec2 n = vec2(dFdx(a0), dFdy(a0)) * vR;
  float edge = clamp(length(n) * 0.5, 0.0, 1.0);
  // \u8272\u6563\uFF08\u6BD4\u771F\u51B0\u653E\u5927\u4E86\u4E0D\u5C11\uFF0C\u8981\u770B\u5F97\u51FA\uFF09\uFF1A\u7EA2\u3001\u7EFF\u3001\u84DD\u6298\u5F97\u4E0D\u4E00\u6837\u591A\uFF0C\u68F1\u4E0A\u518D\u6CBF\u659C\u7684\u65B9\u5411\u5206\u5F00\u4E00\u70B9\uFF0C\u900F\u8FC7\u6765\u7684\u7A97\u5916\u5728\u8FB9\u4E0A\u9519\u51FA\u5F69\u8FB9\u3001\u989C\u8272\u52A0\u6D53\uFF1B
  vec2 bend = n * vR * 0.7 / uView, split = n / max(length(n), 0.001) * vR * 0.35 * edge / uView;
  vec3 through = vec3(texture(uBehind, vFu - bend * 0.8 - split).r, texture(uBehind, vFu - bend).g, texture(uBehind, vFu - bend * 1.25 + split).b);
  vec3 gray = vec3(dot(through, vec3(0.3333)));
  through = gray + (through - gray) * (1.0 + 1.5 * edge);
  vec3 ice = (through * (1.1 + 0.3 * edge) + min(L, vec3(1.2)) * edge * 0.3) * c.a + c.rgb * lit * 0.15;
  rgb = mix(rgb, ice, back * 0.85);
  float d = length(vHalo);
  // \u8FD8\u6CA1\u98D8\u5230\u7126\u70B9\u4E0A\uFF1A\u5916\u9762\u5957\u4E00\u5708\u7CCA\u7684
  float ha = 0.35 * (1.0 - p) * max(0.0, 1.0 - d / (1.6 - 0.6 * p));
  rgb = vec3(0.92, 0.95, 1.0) * lit * ha + rgb * (1.0 - ha);
  float a = ha + c.a * (1.0 - ha);
  // \u9760\u8FD1\u4EAE\u5149\uFF1A\u5916\u9762\u6563\u4E00\u5708\u5F88\u6DE1\u7684\u67D4\u5149\uFF08\u53EA\u52A0\u989C\u8272\uFF0C\u6BD4\u96EA\u82B1\u5927\u4E0D\u4E86\u591A\u5C11\uFF09\uFF0C\u5316\u5F97\u8D8A\u591A\u8D8A\u6DE1\uFF1B\u6CA1\u6709\u5149\u7167\uFF08\u900F\u660E\uFF09\u65F6\u4E0D\u52A0
  float soft = float(uLit) * smoothstep(0.12, 0.6, lum) * 0.45 * exp(-d * d * 2.4) * vB.z * (1.0 - vB.x / ${(FLAKE_STAGES - 1).toFixed(1)});
  // \u706B\u5F69\uFF08\u8272\u6563\uFF09\uFF1A\u8D34\u56FE\u6309\u683C\u5B50\u5206\uFF0C\u6BCF\u683C\u4E00\u5757\u51B0\u9762\u3001\u6709\u81EA\u5DF1\u56FA\u5B9A\u7684\u6298\u5C04\u89D2\uFF0C\u53EA\u6709\u51B0\u68F1\u4E0A\uFF08\u659C\u9762\uFF09\u7684\u683C\u5B50\u4F1A\u51FA\uFF1B\u989C\u8272\u7531\u659C\u9762\u548C\u5149\u7684\u65B9\u5411\u5B9A\uFF08nebbiaFireGlsl.ts\uFF09\uFF0C
  // \u53EA\u52A0\u5149\uFF0C\u4EAE\u5EA6\u6309\u8EAB\u540E\u5149\u7684\u4EAE\u5EA6\u7ED9\uFF0C\u4E0D\u8DDF\u706F\u7684\u989C\u8272\u8D70\uFF1B\u7EA6\u56DB\u6210\u683C\u5B50\u6709\u671D\u5F97\u5BF9\u7684\u51B0\u9762
  vec2 g = tc * ${GLINT_GRID}, gc = floor(g), gf = fract(g) - 0.5;
  float h = fract(sin(dot(gc, vec2(12.9898, 78.233)) + vSeed * 91.7) * 43758.5453);
  vec3 fire = fixedFire(uGlow, vFu, n, fract(h * 7.31)) * step(h, 0.4);
  float glint = back * exp(-dot(gf, gf) * 18.0) * edge * (0.6 + 2.0 * lum) * vB.z;
  o = vec4(rgb + min(L, vec3(1.2)) * soft + fire * glint * 2.2, a);
}`;
class NebbiaSnowGl {
  constructor(gl, unit) {
    __publicField(this, 'gl', gl);
    __publicField(this, 'vao');
    __publicField(this, 'buf');
    __publicField(this, 'atlas');
    __publicField(this, 'prog', null);
    __publicField(this, 'uView', null);
    __publicField(this, 'uShift', null);
    __publicField(this, 'uGrid', null);
    __publicField(this, 'rows', 0);
    /** 实例缓冲分配了多少个数（只在要放的比这多时重新分配，平时每帧只覆盖内容）。 */
    __publicField(this, 'capacity', 0);
    this.atlas = makeTex(gl, unit);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const stride = FLAKE_FLOATS * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 32);
    gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);
  }
  /** 程序编好时调：取 uniform 位置、指好图集、雾的光晕层（glowUnit）和稍糊的窗外（behindUnit，冰折射用）；lit 为假时不取光。 */
  attach(prog, glowUnit, behindUnit, lit) {
    const { gl } = this;
    this.prog = prog;
    gl.useProgram(prog);
    this.uView = gl.getUniformLocation(prog, 'uView');
    this.uShift = gl.getUniformLocation(prog, 'uShift');
    this.uGrid = gl.getUniformLocation(prog, 'uGrid');
    gl.uniform1i(gl.getUniformLocation(prog, 'uAtlas'), this.atlas.unit);
    gl.uniform1i(gl.getUniformLocation(prog, 'uGlow'), glowUnit);
    gl.uniform1i(gl.getUniformLocation(prog, 'uBehind'), behindUnit);
    gl.uniform1i(gl.getUniformLocation(prog, 'uLit'), lit ? 1 : 0);
  }
  /** 上传图集（每种一行、每个阶段一格），带 mipmap：小雪花、飘过来时的糊都从这里取。 */
  setAtlas(canvas, rows) {
    const { gl } = this;
    this.rows = rows;
    gl.activeTexture(gl.TEXTURE0 + this.atlas.unit);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas.t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 4);
  }
  /** 叠到当前帧缓冲上：data 里 count 片雪，W、H 是 CSS 像素，shift 是玻璃颠簸（CSS 像素）。 */
  draw(data, count, W, H, shift) {
    const { gl } = this;
    if (!this.prog || !this.rows || !count) return;
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    if (data.length > this.capacity) {
      gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
      this.capacity = data.length;
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * FLAKE_FLOATS);
    gl.uniform2f(this.uView, W, H);
    gl.uniform2f(this.uShift, shift[0], shift[1]);
    gl.uniform2f(this.uGrid, FLAKE_STAGES, this.rows);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}
export { FLAKE_FLOATS, NEBBIA_FLAKE_FS, NEBBIA_FLAKE_VS, NebbiaSnowGl };
