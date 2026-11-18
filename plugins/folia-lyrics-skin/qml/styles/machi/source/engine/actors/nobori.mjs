// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/actors/nobori.ts
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
import { createCanvas, drawIcon, fontSpec } from '../signRaster.mjs';
const FLAG = { width: 0.46, height: 1.5, bottom: 0.62 };
const WAVE_SEGMENTS = 10;
const WAVE_PARS =
  /* glsl */
  `
uniform float uTime;
uniform float uWind;
uniform float uPhase;
`;
const WAVE_VERTEX =
  /* glsl */
  `
// \u5E03\u9762\u6CBF\u672C\u5730 +x \u4ECE\u65D7\u6746\u5F80\u5916\uFF0C\u79BB\u65D7\u6746\u8D8A\u8FDC\u6446\u5E45\u8D8A\u5927\u3002
float kFlagU = clamp(position.x / ${FLAG.width.toFixed(3)}, 0.0, 1.0);
float kWave = sin(position.x * 7.0 - uTime * (3.2 + uWind * 2.0) + uPhase + position.y * 1.3)
    + 0.4 * sin(position.x * 13.0 - uTime * 5.1 + uPhase * 1.7);
transformed.z += kWave * kFlagU * (0.035 + 0.05 * uWind);
transformed.x -= abs(kWave) * kFlagU * 0.012;
`;
const drawVertical = (context, font, text, x, top, bottom, maxWidth) => {
  const chars = Array.from(text.trim() || ' ');
  const latin =
    !/[\u{2e80}-\u{2e99}\u{2e9b}-\u{2ef3}\u{2f00}-\u{2fd5}\u{3005}\u{3007}\u{3021}-\u{3029}\u{3038}-\u{303b}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{f900}-\u{fa6d}\u{fa70}-\u{fad9}\u{16fe2}-\u{16fe3}\u{16ff0}-\u{16ff6}\u{20000}-\u{2a6df}\u{2a700}-\u{2b81d}\u{2b820}-\u{2cead}\u{2ceb0}-\u{2ebe0}\u{2ebf0}-\u{2ee5d}\u{2f800}-\u{2fa1d}\u{30000}-\u{3134a}\u{31350}-\u{33479}\u{3041}-\u{3096}\u{309d}-\u{309f}\u{1b001}-\u{1b11f}\u{1b132}\u{1b150}-\u{1b152}\u{1f200}\u{30a1}-\u{30fa}\u{30fd}-\u{30ff}\u{31f0}-\u{31ff}\u{32d0}-\u{32fe}\u{3300}-\u{3357}\u{ff66}-\u{ff6f}\u{ff71}-\u{ff9d}\u{1aff0}-\u{1aff3}\u{1aff5}-\u{1affb}\u{1affd}-\u{1affe}\u{1b000}\u{1b120}-\u{1b122}\u{1b155}\u{1b164}-\u{1b167}\u{1100}-\u{11ff}\u{302e}-\u{302f}\u{3131}-\u{318e}\u{3200}-\u{321e}\u{3260}-\u{327e}\u{a960}-\u{a97c}\u{ac00}-\u{d7a3}\u{d7b0}-\u{d7c6}\u{d7cb}-\u{d7fb}\u{ffa0}-\u{ffbe}\u{ffc2}-\u{ffc7}\u{ffca}-\u{ffcf}\u{ffd2}-\u{ffd7}\u{ffda}-\u{ffdc}]/u.test(
      text,
    );
  const available = bottom - top;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  if (latin) {
    let px2 = maxWidth * 0.8;
    context.font = fontSpec(font, px2);
    const width = context.measureText(text).width;
    if (width > available) px2 = (px2 * available) / width;
    context.font = fontSpec(font, px2);
    context.save();
    context.translate(x, (top + bottom) / 2);
    context.rotate(Math.PI / 2);
    context.fillText(text, 0, 0);
    context.restore();
    return;
  }
  const px = Math.min(maxWidth * 0.82, available / chars.length / 1.04);
  context.font = fontSpec(font, px);
  const step = px * 1.04;
  const start = top + (available - step * chars.length) / 2 + step / 2;
  chars.forEach((char, index) => context.fillText(char, x, start + index * step));
};
class MachiNobori {
  constructor(materials, spots) {
    __publicField(this, 'group', new THREE.Group());
    __publicField(this, 'flags', []);
    __publicField(this, 'uniforms', { uTime: { value: 0 }, uWind: { value: 0.5 } });
    __publicField(this, 'geometries', []);
    this.group.name = 'Nobori';
    const cloth = new THREE.PlaneGeometry(FLAG.width, FLAG.height, WAVE_SEGMENTS, 4).translate(
      FLAG.width / 2,
      FLAG.height / 2,
      0,
    );
    const pole = new THREE.CylinderGeometry(
      0.018,
      0.022,
      FLAG.bottom + FLAG.height + 0.12,
      6,
    ).translate(0, (FLAG.bottom + FLAG.height + 0.12) / 2, 0);
    const bar = new THREE.CylinderGeometry(0.012, 0.012, FLAG.width + 0.04, 5)
      .rotateZ(Math.PI / 2)
      .translate(FLAG.width / 2, 0, 0);
    const base = new THREE.CylinderGeometry(0.14, 0.16, 0.12, 10).translate(0, 0.06, 0);
    this.geometries.push(cloth, pole, bar, base);
    const poleMaterial = materials.toon('white');
    const baseMaterial = materials.toon('darkMetal');
    spots.forEach((spot, index) => {
      const canvas = createCanvas(128, 416);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      this.flags.push({ canvas, texture });
      const material = materials.track(
        new THREE.MeshToonMaterial({
          map: texture,
          gradientMap: materials.gradient,
          side: THREE.DoubleSide,
        }),
      );
      material.emissive.setScalar(0.18);
      material.emissiveMap = texture;
      const phase = index * 1.9;
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, this.uniforms, { uPhase: { value: phase } });
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
${WAVE_PARS}`,
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
${WAVE_VERTEX}`,
          );
      };
      material.customProgramCacheKey = () => `machi-nobori-${index}`;
      const flag = new THREE.Group();
      flag.name = `Nobori${index}`;
      const clothMesh = new THREE.Mesh(cloth, material);
      clothMesh.position.y = FLAG.bottom;
      clothMesh.castShadow = false;
      const poleMesh = new THREE.Mesh(pole, poleMaterial);
      const barMesh = new THREE.Mesh(bar, poleMaterial);
      barMesh.position.y = FLAG.bottom + FLAG.height + 0.01;
      const baseMesh = new THREE.Mesh(base, baseMaterial);
      flag.add(clothMesh, poleMesh, barMesh, baseMesh);
      flag.position.set(spot.x, spot.y, spot.z);
      flag.rotation.y = spot.rotationY;
      this.group.add(flag);
    });
  }
  /** 换歌 / 换主题时重画所有旗。 */
  paint(paint) {
    this.flags.forEach((flag, index) => {
      const content = paint.faces[index % paint.faces.length];
      const context = flag.canvas.getContext('2d');
      const { width, height } = flag.canvas;
      context.fillStyle = content.background;
      context.fillRect(0, 0, width, height);
      context.fillStyle = 'rgba(255,255,255,0.85)';
      context.fillRect(0, height * 0.03, width, height * 0.012);
      context.fillRect(0, height * 0.955, width, height * 0.012);
      context.fillStyle = 'rgba(0,0,0,0.18)';
      context.fillRect(0, 0, width * 0.08, height);
      context.fillStyle = content.ink;
      let top = height * 0.07;
      if (content.icon) {
        const size = width * 0.62;
        drawIcon(
          context,
          content.icon,
          paint.fallbacks,
          (width - size) / 2 + width * 0.03,
          top,
          size,
          content.ink,
          2.2,
        );
        top += size + height * 0.03;
      }
      drawVertical(context, paint.font, content.text, width * 0.53, top, height * 0.93, width);
      flag.texture.needsUpdate = true;
    });
  }
  update(time, wind) {
    this.uniforms.uTime.value = time;
    this.uniforms.uWind.value = wind;
  }
  dispose() {
    this.flags.forEach((flag) => flag.texture.dispose());
    this.geometries.forEach((geometry) => geometry.dispose());
  }
}
export { MachiNobori };
