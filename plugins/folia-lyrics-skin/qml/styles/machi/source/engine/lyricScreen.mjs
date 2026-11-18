// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/lyricScreen.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../environment.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../three.mjs';
import { buildWordColorRangesFromMatchers } from '../_shared/components/visualizer/wordColoring.mjs';
import {
  layoutMachiBoardCard,
  layoutMachiBoardLine,
  resolveMachiBoardReveal,
} from './boardLayout.mjs';
import { createCanvas, MACHI_REFERENCE_PX, paintMachiBoard } from './signRaster.mjs';
const TEXTURE_WIDTH = 1280;
const SWITCH_SECONDS = 0.3;
const CELLS_X = 150;
const PEAK = { dark: 0.95, light: 0.8 };
const POOL_SIZE = 3;
const VERTEX =
  /* glsl */
  `
varying vec2 vUv;
varying vec3 vViewNormal;
void main() {
    vUv = uv;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const FRAGMENT =
  /* glsl */
  `
uniform sampler2D uMap;
uniform vec3 uBase;
uniform float uBright;
uniform float uLitGain;
uniform float uUnlitGain;
uniform vec3 uRowBottom;
uniform vec3 uReveal;
uniform float uSoft;
uniform vec2 uCells;
uniform float uTime;
uniform float uGlitch;
uniform float uPeak;
uniform vec3 uSheen;
uniform vec4 uSwellAt;
uniform vec4 uSwellAmp;
varying vec2 vUv;
varying vec3 vViewNormal;
float bHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
    // \u6362\u884C\u65F6\u7684\u4FE1\u53F7\u5207\u6362\uFF1A\u51E0\u6761\u6A2A\u5E26\u9519\u5F00\u3001\u8272\u6563\u53D8\u5927\u3001\u4EAE\u5EA6\u6389\u4E00\u4E0B\u3002
    vec2 uv = vUv;
    float tear = bHash(floor(vUv.y * 22.0) + floor(uTime * 24.0) * 7.0);
    uv.x += (tear - 0.5) * 0.08 * uGlitch * step(0.62, tear);
    // \u50CF\u7D20\u683C\uFF1A\u8D34\u56FE\u6309\u539F\u5206\u8FA8\u7387\u53D6\uFF08\u5B57\u4E0D\u7CCA\uFF09\uFF0C\u70B9\u4EAE\u7684\u8FB9\u754C\u5BF9\u9F50\u5230\u683C\uFF1B\u683C\u5B50\u5C0F\u5230\u7EA6 2.5 \u4E2A\u5C4F\u5E55\u50CF\u7D20\u4EE5\u4E0B\u5C31\u628A\u7F51\u683C\u6DE1\u6389\uFF0C\u514D\u5F97\u51FA\u6469\u5C14\u7EB9\u3002
    vec2 cellUv = vUv * uCells;
    vec2 perPixel = fwidth(cellUv);
    float grid = 1.0 - smoothstep(0.3, 0.55, max(perPixel.x, perPixel.y));
    float y = 1.0 - vUv.y;
    float split = 0.0008 + 0.006 * uGlitch;
    vec4 unlit = texture2D(uMap, vec2(uv.x, 0.5 + uv.y * 0.5));
    vec4 litR = texture2D(uMap, vec2(uv.x + split, uv.y * 0.5));
    vec4 litG = texture2D(uMap, vec2(uv.x, uv.y * 0.5));
    vec4 litB = texture2D(uMap, vec2(uv.x - split, uv.y * 0.5));
    float reveal = y < uRowBottom.x ? uReveal.x : (y < uRowBottom.y ? uReveal.y : uReveal.z);
    float snapped = (floor(vUv.x * uCells.x) + 0.5) / uCells.x;
    float on = 1.0 - smoothstep(reveal - uSoft, reveal + uSoft, mix(vUv.x, snapped, grid));
    // \u5C4F\u5E55\u7684\u5E95\uFF1A\u8FB9\u7F18\u4E00\u5708\u7565\u6697\uFF08\u50CF\u7D20\u8001\u5316 / \u8FB9\u6846\u9634\u5F71\uFF09\u3002
    float edge = smoothstep(0.0, 0.03, vUv.x) * smoothstep(1.0, 0.97, vUv.x) * smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
    vec3 base = uBase * (0.92 + 0.08 * smoothstep(1.0, 0.0, y)) * (0.8 + 0.2 * edge);
    vec3 color = mix(base, unlit.rgb * uUnlitGain, unlit.a);
    color = mix(color, vec3(litR.r, litG.g, litB.b) * uLitGain, vec3(litR.a, litG.a, litB.a) * on);
    // \u50CF\u7D20\u4E4B\u95F4\u7684\u9ED1\u7F1D\u4E0E RGB \u5B50\u50CF\u7D20\u6761\uFF08\u6309\u683C\u7684\u53EF\u89C1\u5EA6\u6DE1\u5165\u6DE1\u51FA\uFF09\uFF0C\u5E73\u5747\u4EAE\u5EA6\u4E0D\u53D8\u3002
    vec2 f = fract(cellUv) - 0.5;
    float gap = smoothstep(0.5, 0.38, abs(f.x)) * smoothstep(0.5, 0.36, abs(f.y));
    vec3 stripe = clamp(1.6 - abs(vec3(fract(cellUv.x) * 3.0) - vec3(0.5, 1.5, 2.5)) * 1.1, 0.0, 1.0) * 2.0;
    vec3 mask = gap * mix(vec3(1.0), stripe, 0.35) / 0.78;
    color *= mix(vec3(1.0), mask, grid * 0.8);
    // \u6162\u6162\u5F80\u4E0B\u8D70\u7684\u5237\u65B0\u5E26\uFF0C\u5207\u6362\u65F6\u7684\u96EA\u82B1\u70B9\u3002
    float roll = fract(vUv.y + uTime * 0.07);
    color *= (1.0 + 0.045 * exp(-pow((roll - 0.5) * 9.0, 2.0))) * (1.0 - 0.3 * uGlitch);
    color += (bHash(dot(floor(cellUv), vec2(1.0, 157.0)) + floor(uTime * 30.0)) - 0.5) * 0.12 * uGlitch;
    color = max(color * uBright, 0.0);
    // \u5927\u5C4F\u95EA\u62CD\uFF1A\u51E0\u5904\u5BBD\u7684\u4EAE\u6591\uFF08\u6574\u5757\u4E5F\u5E26\u4E00\u70B9\uFF09\uFF0C\u53E0\u8D77\u6765\u6309 1 - e^-x \u6536\u4F4F\uFF0C\u519B\u9F13\u518D\u5BC6\u4E5F\u4E0D\u8FC7\u4EAE\uFF1B\u5B57\u548C\u5E95\u8272\u4E00\u8D77\u63D0\u4EAE\u3002
    vec4 swellDx = vec4(vUv.x) - uSwellAt;
    float swell = 1.0 - exp(-dot(uSwellAmp, 0.2 + 0.8 * exp(-swellDx * swellDx * 10.0)));
    color = color * (1.0 + 0.85 * swell) + uBase * 0.5 * swell;
    // \u6700\u4EAE\u7684\u901A\u9053\u538B\u5230 uPeak\uFF08\u4FDD\u8272\u76F8\uFF09\uFF1A\u5B57\u6E05\u695A\uFF0C\u4E0D\u88AB bloom \u6655\u5F00\u3002
    float peak = max(max(color.r, color.g), color.b);
    color *= min(1.0, (uPeak + 0.55 * swell) / max(peak, 1e-4));
    // \u9762\u677F\u73BB\u7483\uFF1A\u4E00\u70B9\u5929\u5149\u53CD\u5C04\uFF0C\u4FA7\u7740\u770B\u66F4\u660E\u663E\uFF0C\u518D\u52A0\u4E00\u9053\u659C\u7684\u67D4\u5149\u3002
    float fresnel = pow(1.0 - clamp(vViewNormal.z, 0.0, 1.0), 3.0);
    float glare = smoothstep(0.22, 0.0, abs(vUv.x * 0.7 + vUv.y * 0.9 - 1.05));
    color += uSheen * (0.035 + 0.22 * fresnel + 0.05 * glare);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
class MachiLyricScreen {
  /** width / height 是屏幕面的尺寸（米）。 */
  constructor(materials, blend, width, height) {
    __publicField(this, 'blend', blend);
    __publicField(this, 'width', width);
    __publicField(this, 'height', height);
    __publicField(this, 'material');
    __publicField(this, 'pool');
    __publicField(this, 'slot', null);
    __publicField(this, 'pendingSlot', null);
    __publicField(this, 'switchElapsed', SWITCH_SECONDS);
    __publicField(this, 'target', null);
    __publicField(this, 'box');
    __publicField(this, 'content', null);
    __publicField(this, 'lines', []);
    __publicField(this, 'chorusGlow', 0);
    __publicField(this, 'geometries', []);
    const half = Math.round(TEXTURE_WIDTH * (height / width));
    this.box = {
      width: TEXTURE_WIDTH,
      height: half,
      paddingX: 0.05,
      referencePx: MACHI_REFERENCE_PX,
    };
    this.pool = Array.from({ length: POOL_SIZE }, () => {
      const canvas = createCanvas(TEXTURE_WIDTH, half * 2);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      return { canvas, texture, key: '', layout: null, usedAt: 0 };
    });
    this.material = materials.track(
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uMap: { value: this.pool[0].texture },
          uBase: { value: new THREE.Color() },
          uBright: { value: 1 },
          uLitGain: { value: 1.25 },
          uUnlitGain: { value: 0.9 },
          uRowBottom: { value: new THREE.Vector3(1, 1, 1) },
          uReveal: { value: new THREE.Vector3(0, 0, 0) },
          uSoft: { value: 4e-3 },
          uCells: { value: new THREE.Vector2(CELLS_X, Math.round((CELLS_X * height) / width)) },
          uTime: { value: 0 },
          uGlitch: { value: 0 },
          uPeak: { value: PEAK.dark },
          uSheen: { value: new THREE.Color() },
          uSwellAt: { value: new THREE.Vector4(0.5, 0.5, 0.5, 0.5) },
          uSwellAmp: { value: new THREE.Vector4() },
        },
      }),
    );
    this.material.name = 'machi:lyricScreen';
  }
  /** 一块屏幕面（平面网格），摆在 position、绕 y 转 rotationY。 */
  createFace(position, rotationY, name) {
    const geometry = new THREE.PlaneGeometry(this.width, this.height);
    this.geometries.push(geometry);
    const face = new THREE.Mesh(geometry, this.material);
    face.name = name;
    face.position.copy(position);
    face.rotation.y = rotationY;
    return face;
  }
  /** 换歌 / 换主题：牌面按新颜色、字体重画。 */
  setContent(content) {
    this.content = content;
    this.pool.forEach((slot) => {
      slot.key = '';
    });
    const target = this.target;
    this.target = null;
    if (target) this.show(target, this.lines, true);
  }
  slotKey(target, showText) {
    return target.kind === 'line' && showText ? `line:${target.index}` : 'card';
  }
  /** 把 target 画进一个空闲槽（或命中已画好的槽）。 */
  prepare(target, lines, showText) {
    const content = this.content;
    if (!content) return null;
    const key = this.slotKey(target, showText);
    const hit = this.pool.find((slot2) => slot2.key === key);
    if (hit) {
      hit.usedAt = performance.now();
      return hit;
    }
    const slot = this.pool
      .filter((candidate) => candidate !== this.slot && candidate !== this.pendingSlot)
      .sort((a, b) => a.usedAt - b.usedAt)[0];
    if (!slot) return null;
    const line = target.kind === 'line' ? lines[target.index] : void 0;
    const card = !line || !showText;
    const layout = card
      ? layoutMachiBoardCard(content.cardTitle, content.cardSubtitle, this.box, content.measure)
      : layoutMachiBoardLine(line, this.box, content.measure);
    const keywordRanges = card
      ? []
      : buildWordColorRangesFromMatchers(line.fullText, content.matchers);
    paintMachiBoard(slot.canvas, {
      layout,
      font: content.font,
      unlit: content.palette.boardUnlit,
      lit: content.palette.boardLit,
      keywordRanges,
      card,
    });
    slot.texture.needsUpdate = true;
    slot.key = key;
    slot.layout = layout;
    slot.usedAt = performance.now();
    return slot;
  }
  /** 换牌面：画好新的，信号切换过去（静态模式、暂停时直接换）。 */
  show(target, lines, immediate, showText = true) {
    this.lines = lines;
    const sameKey =
      this.target && this.slotKey(this.target, showText) === this.slotKey(target, showText);
    this.target = target;
    const slot = this.prepare(target, lines, showText);
    if (!slot) return;
    if (sameKey && this.slot === slot) return;
    if (immediate || !this.slot) {
      this.apply(slot);
      this.switchElapsed = SWITCH_SECONDS;
      this.pendingSlot = null;
    } else {
      this.pendingSlot = slot;
      this.switchElapsed = 0;
    }
  }
  /** 空闲时提前画好下一行。 */
  preheat(target, lines, showText) {
    const key = this.slotKey(target, showText);
    if (this.pool.some((slot) => slot.key === key)) return;
    this.prepare(target, lines, showText);
  }
  apply(slot) {
    this.slot = slot;
    this.material.uniforms.uMap.value = slot.texture;
    const layout = slot.layout;
    const bottoms = [1, 1, 1];
    if (layout) {
      layout.rows.forEach((row, index) => {
        if (index < 3)
          bottoms[index] = index === layout.rows.length - 1 ? 1 : row.bottom / layout.height;
      });
    }
    this.material.uniforms.uRowBottom.value.set(bottoms[0], bottoms[1], bottoms[2]);
  }
  /** 每帧：点亮位置、换行的信号切换、亮度（副歌、音频）。 */
  update(frame) {
    var _a, _b, _c, _d;
    const content = this.content;
    if (!content) return;
    const palette = content.palette;
    let glitch = 0;
    if (this.switchElapsed < SWITCH_SECONDS) {
      this.switchElapsed += frame.staticMode ? SWITCH_SECONDS : Math.max(frame.delta, 1 / 120);
      const t = Math.min(1, this.switchElapsed / SWITCH_SECONDS);
      if (t >= 0.45 && this.pendingSlot) {
        this.apply(this.pendingSlot);
        this.pendingSlot = null;
      }
      glitch = t >= 1 ? 0 : Math.sin(Math.PI * t) ** 0.7;
    }
    this.chorusGlow += (frame.chorus - this.chorusGlow) * (1 - Math.exp(-frame.delta * 3));
    const layout = (_a = this.slot) == null ? void 0 : _a.layout;
    const reveal = layout ? resolveMachiBoardReveal(layout, frame.songTime) : [];
    this.material.uniforms.uReveal.value.set(
      ((_b = reveal[0]) != null ? _b : 0) / this.box.width,
      ((_c = reveal[1]) != null ? _c : 0) / this.box.width,
      ((_d = reveal[2]) != null ? _d : 0) / this.box.width,
    );
    const uniforms = this.material.uniforms;
    uniforms.uBase.value
      .copy(this.blend.get('boardBase'))
      .multiplyScalar(palette.boardIsLight ? 0.98 : 1);
    uniforms.uLitGain.value = palette.boardIsLight ? 1 : 1.25 + 0.2 * this.chorusGlow;
    uniforms.uUnlitGain.value = palette.boardIsLight ? 1 : 0.9;
    uniforms.uBright.value = 1 + 0.05 * frame.audio + 0.06 * this.chorusGlow;
    uniforms.uPeak.value = palette.boardIsLight ? PEAK.light : PEAK.dark;
    uniforms.uGlitch.value = glitch;
    uniforms.uTime.value = frame.ambientTime;
    uniforms.uSheen.value.copy(this.blend.get('moon')).multiplyScalar(0.35);
    uniforms.uSwellAt.value.fromArray(frame.beat.swellAt);
    uniforms.uSwellAmp.value.fromArray(frame.beat.swellAmp);
  }
  /** 副歌的平滑权重（招牌跟着它加亮、不闪）。 */
  get chorus() {
    return this.chorusGlow;
  }
  /** 屏幕上有切换动画：暂停时也要继续出帧。 */
  get busy() {
    return this.switchElapsed < SWITCH_SECONDS;
  }
  dispose() {
    this.pool.forEach((slot) => slot.texture.dispose());
    this.geometries.forEach((geometry) => geometry.dispose());
  }
}
export { MachiLyricScreen };
