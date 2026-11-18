// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/kowloon/hologram.ts
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
} from '../../../environment.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
import { context2d, createCanvas, fitFont, fontSpec, wrapText } from '../../engine/signRaster.mjs';
const resolveKowloonHologramText = (target, lines, song) => {
  var _a, _b;
  const title = song.title || 'KOWLOON';
  if (target.kind === 'line') {
    const next = lines.slice(target.index + 1).find((line) => line.fullText.trim());
    if (next) return { label: 'NEXT', text: next.fullText.trim() };
    const translation =
      (_b = (_a = lines[target.index]) == null ? void 0 : _a.translation) == null
        ? void 0
        : _b.trim();
    if (translation) return { label: 'TRANSLATION', text: translation };
  }
  return { label: 'NOW PLAYING', text: song.artist ? `${title} \u2014 ${song.artist}` : title };
};
const TEXTURE = { width: 1024, height: 376 };
const SWITCH_SECONDS = 0.35;
const PANEL_VERTEX =
  /* glsl */
  `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const PANEL_FRAGMENT =
  /* glsl */
  `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uTime;
uniform float uLevel;
uniform float uGlitch;
uniform float uAspect;
varying vec2 vUv;
float hHash(float n) { return fract(sin(n * 91.7) * 43758.5453); }
void main() {
    vec2 uv = vUv;
    // \u6362\u5B57\u65F6\u51E0\u6761\u6A2A\u5E26\u9519\u5F00\u3002
    float band = floor(uv.y * 26.0);
    float tear = hHash(band + floor(uTime * 24.0) * 3.1);
    uv.x += (tear - 0.5) * 0.06 * uGlitch * step(0.55, tear);
    float text = texture2D(uMap, uv).r;
    // \u626B\u63CF\u7EBF\u3001\u5F80\u4E0A\u8D70\u7684\u4E00\u9053\u4EAE\u5E26\u3001\u7EC6\u6846\u4E0E\u56DB\u89D2\u7684\u6298\u89D2\u3002
    float scan = 0.82 + 0.18 * sin(vUv.y * 190.0 - uTime * 8.0);
    // \u8D1F\u6570\u7684 pow \u5728 D3D \u4E0A\u662F NaN\uFF08\u4F1A\u88AB bloom \u6655\u6EE1\u5168\u5C4F\uFF09\uFF0C\u5E73\u65B9\u90FD\u5199\u6210\u76F8\u4E58\u3002
    float sweepAt = (fract(vUv.y - uTime * 0.22) - 0.5) * 7.0;
    float sweep = exp(-sweepAt * sweepAt) * 0.35;
    vec2 edge = min(vUv, 1.0 - vUv) * vec2(uAspect, 1.0);
    float frame = 1.0 - smoothstep(0.006, 0.016, min(edge.x, edge.y));
    float corner = step(min(edge.x, edge.y), 0.035) * step(max(edge.x, edge.y), 0.12);
    float fill = 0.07 + 0.06 * (1.0 - vUv.y);
    float flicker = 0.9 + 0.1 * hHash(floor(uTime * 14.0));
    float intensity = (text * 1.35 + frame * 0.5 + corner * 0.6 + fill) * scan * flicker + sweep * (0.15 + text * 0.4);
    gl_FragColor = vec4(uColor * intensity * uLevel * (1.0 - 0.4 * uGlitch), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
const BEAM_FRAGMENT =
  /* glsl */
  `
uniform vec3 uColor;
uniform float uLevel;
uniform float uTime;
varying vec2 vUv;
void main() {
    // \u5149\u675F\uFF1A\u8D8A\u5F80\u4E0A\u8D8A\u6DE1\uFF0C\u4E2D\u95F4\u4EAE\u4E24\u8FB9\u6DE1\uFF0C\u51E0\u6761\u5F80\u4E0A\u6D41\u7684\u7EC6\u7EB9\u3002
    float across = max(0.0, 1.0 - abs(vUv.x - 0.5) * 2.0);
    float streak = 0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 1.3) * sin(vUv.y * 9.0 - uTime * 3.0);
    float alpha = pow(across, 1.5) * (0.35 + 0.65 * (1.0 - vUv.y)) * streak;
    gl_FragColor = vec4(uColor * alpha * 0.3 * uLevel, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
const additive = (material) => {
  material.transparent = true;
  material.depthWrite = false;
  material.blending = THREE.AdditiveBlending;
  material.side = THREE.DoubleSide;
  return material;
};
class KowloonHologram {
  /** base 是投影机镜头的位置，panel 是面板中心（在镜头正上方）；面板绕 y 转 rotationY 朝向镜头。 */
  constructor(materials, base, panel) {
    __publicField(this, 'group', new THREE.Group());
    __publicField(this, 'canvas', createCanvas(TEXTURE.width, TEXTURE.height));
    __publicField(this, 'texture');
    __publicField(this, 'panel');
    __publicField(this, 'beam');
    __publicField(this, 'geometries', []);
    __publicField(this, 'key', '');
    __publicField(this, 'switchElapsed', SWITCH_SECONDS);
    __publicField(this, 'pending', null);
    this.group.name = 'Hologram';
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.anisotropy = 4;
    this.panel = materials.track(
      additive(
        new THREE.ShaderMaterial({
          vertexShader: PANEL_VERTEX,
          fragmentShader: PANEL_FRAGMENT,
          uniforms: {
            uMap: { value: this.texture },
            uColor: { value: new THREE.Color() },
            uTime: { value: 0 },
            uLevel: { value: 1 },
            uGlitch: { value: 0 },
            uAspect: { value: panel.width / panel.height },
          },
        }),
      ),
    );
    this.panel.name = 'machi:glow:hologram';
    const panelGeometry = new THREE.PlaneGeometry(panel.width, panel.height);
    const panelMesh = new THREE.Mesh(panelGeometry, this.panel);
    panelMesh.name = 'Hologram/panel';
    panelMesh.position.copy(panel.position);
    panelMesh.rotation.y = panel.rotationY;
    panelMesh.renderOrder = 4;
    this.beam = materials.track(
      additive(
        new THREE.ShaderMaterial({
          vertexShader: PANEL_VERTEX,
          fragmentShader: BEAM_FRAGMENT,
          uniforms: {
            uColor: { value: new THREE.Color() },
            uLevel: { value: 1 },
            uTime: { value: 0 },
          },
        }),
      ),
    );
    const top = panel.position.y - panel.height / 2;
    const beamGeometry = new THREE.BufferGeometry();
    const half = panel.width / 2;
    const lens = 0.08;
    const rise = top - base.y;
    beamGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-lens, 0, 0, lens, 0, 0, half, rise, 0, -half, rise, 0], 3),
    );
    beamGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    beamGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    const beamMesh = new THREE.Mesh(beamGeometry, this.beam);
    beamMesh.name = 'Hologram/beam';
    beamMesh.position.copy(base);
    beamMesh.rotation.y = panel.rotationY;
    beamMesh.renderOrder = 3;
    this.geometries.push(panelGeometry, beamGeometry);
    this.group.add(beamMesh, panelMesh);
  }
  /** 换字：内容一样就不重画；immediate 时不做错位。 */
  setText(text, font, immediate) {
    const key = `${text.label}|${text.text}|${font.stack}|${font.weight}`;
    if (key === this.key) return;
    this.key = key;
    if (immediate) {
      this.paint(text, font);
      this.switchElapsed = SWITCH_SECONDS;
      this.pending = null;
    } else {
      this.pending = { text, font };
      this.switchElapsed = 0;
    }
  }
  /** 内容作废（换主题、换字体）：下次 setText 一定重画。 */
  invalidate() {
    this.key = '';
  }
  paint(text, font) {
    const context = context2d(this.canvas);
    const { width, height } = this.canvas;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#000000';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = fontSpec(
      { stack: 'ui-monospace, "Cascadia Mono", Consolas, monospace', weight: 700 },
      height * 0.1,
    );
    context.globalAlpha = 0.75;
    context.fillText(`\u25B8 ${text.label}`, width * 0.05, height * 0.14);
    context.globalAlpha = 1;
    context.textAlign = 'center';
    const maxWidth = width * 0.88;
    let px = height * 0.3;
    context.font = fontSpec(font, px);
    let rows = wrapText(context, text.text, maxWidth, 2);
    if (rows.length > 1) {
      px = height * 0.28;
      context.font = fontSpec(font, px);
      rows = wrapText(context, text.text, maxWidth, 2);
    }
    if (rows.length === 1) px = fitFont(context, font, rows[0], maxWidth, px);
    const center = height * 0.58;
    rows.forEach((row, index) => {
      const y = center + (index - (rows.length - 1) / 2) * px * 1.18;
      context.fillText(row, width / 2, y);
    });
    this.texture.needsUpdate = true;
  }
  update(frame) {
    let glitch = 0;
    if (this.switchElapsed < SWITCH_SECONDS) {
      this.switchElapsed += frame.staticMode ? SWITCH_SECONDS : Math.max(frame.delta, 1 / 120);
      const t = Math.min(1, this.switchElapsed / SWITCH_SECONDS);
      if (t >= 0.4 && this.pending) {
        this.paint(this.pending.text, this.pending.font);
        this.pending = null;
      }
      glitch = t >= 1 ? 0 : Math.sin(Math.PI * t);
    }
    const time = frame.staticMode ? 0 : frame.time;
    const uniforms = this.panel.uniforms;
    uniforms.uTime.value = time;
    uniforms.uLevel.value = frame.level;
    uniforms.uGlitch.value = glitch;
    uniforms.uColor.value.copy(frame.color);
    this.beam.uniforms.uTime.value = time;
    this.beam.uniforms.uLevel.value = frame.level;
    this.beam.uniforms.uColor.value.copy(frame.color);
  }
  get busy() {
    return this.switchElapsed < SWITCH_SECONDS;
  }
  dispose() {
    this.texture.dispose();
    this.geometries.forEach((geometry) => geometry.dispose());
  }
}
export { KowloonHologram, resolveKowloonHologramText };
