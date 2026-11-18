// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/ledStrip.ts
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
import { createCanvas, paintMachiLedStrip } from './signRaster.mjs';
const TEXTURE = { width: 4096, height: 96 };
const VERTEX =
  /* glsl */
  `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const FRAGMENT =
  /* glsl */
  `
uniform sampler2D uMap;
uniform vec3 uLed;
uniform float uScroll;
uniform float uUsed;
uniform float uWindow;
uniform float uDots;
uniform float uAspect;
uniform float uBright;
varying vec2 vUv;
void main() {
    vec2 grid = vec2(floor(uDots * uAspect), uDots);
    vec2 cell = floor(vUv * grid);
    vec2 f = fract(vUv * grid) - 0.5;
    vec2 sampleUv = (cell + 0.5) / grid;
    float u = fract(uScroll + sampleUv.x * uWindow) * uUsed;
    float a = texture2D(uMap, vec2(u, sampleUv.y)).r;
    float dotMask = 1.0 - smoothstep(0.28, 0.42, length(f));
    vec3 off = vec3(0.025, 0.022, 0.03);
    vec3 color = mix(off, mix(uLed * 0.08, uLed * 2.2, a) * uBright, dotMask);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
class MachiLedStrip {
  /** width / height 是灯条的尺寸（米），dots 是竖向的点数。colorKey 是 LED 的颜色键。 */
  constructor(materials, blend, width, height, dots = 18, colorKey = 'led') {
    __publicField(this, 'blend', blend);
    __publicField(this, 'width', width);
    __publicField(this, 'height', height);
    __publicField(this, 'colorKey', colorKey);
    __publicField(this, 'material');
    __publicField(this, 'canvas', createCanvas(TEXTURE.width, TEXTURE.height));
    __publicField(this, 'texture');
    __publicField(this, 'geometries', []);
    __publicField(this, 'text', '');
    __publicField(this, 'scroll', 0);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.material = materials.track(
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uMap: { value: this.texture },
          uLed: { value: new THREE.Color() },
          uScroll: { value: 0 },
          uUsed: { value: 1 },
          uWindow: { value: 0.3 },
          uDots: { value: dots },
          uAspect: { value: width / height },
          uBright: { value: 1 },
        },
      }),
    );
    this.material.name = 'machi:led';
  }
  /** 一块灯条面（平面网格）。 */
  createFace(position, rotationY, name) {
    const geometry = new THREE.PlaneGeometry(this.width, this.height);
    this.geometries.push(geometry);
    const face = new THREE.Mesh(geometry, this.material);
    face.name = name;
    face.position.copy(position);
    face.rotation.y = rotationY;
    return face;
  }
  /** 换字：内容一样就不重画。 */
  setText(text, font) {
    if (text === this.text) return;
    this.text = text;
    const used = paintMachiLedStrip(this.canvas, font, text);
    this.texture.needsUpdate = true;
    const uniforms = this.material.uniforms;
    uniforms.uUsed.value = used / TEXTURE.width;
    const dots = uniforms.uDots.value;
    const aspect = uniforms.uAspect.value;
    uniforms.uWindow.value = Math.min(
      4,
      (Math.floor(dots * aspect) * (TEXTURE.height / dots)) / Math.max(1, used),
    );
  }
  /** 内容作废（换主题、换字体）：下次 setText 一定重画。 */
  invalidate() {
    this.text = '';
  }
  get hasText() {
    return this.text !== '';
  }
  update(frame) {
    const speed = (frame.staticMode ? 0 : 70) * frame.speed;
    const used = this.material.uniforms.uUsed.value * TEXTURE.width;
    this.scroll = (this.scroll + (frame.delta * speed) / Math.max(1, used)) % 1;
    this.material.uniforms.uScroll.value = this.scroll;
    this.material.uniforms.uLed.value.copy(this.blend.get(this.colorKey));
    this.material.uniforms.uBright.value = 0.9 + 0.2 * frame.audio;
  }
  dispose() {
    this.texture.dispose();
    this.geometries.forEach((geometry) => geometry.dispose());
  }
}
export { MachiLedStrip };
