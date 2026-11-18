// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/materials.ts
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
import { injectMachiSheen, MACHI_GLOSS, machiGlossFor } from './sheen.mjs';
import { injectMachiSnow } from './snow.mjs';
const flattenMachiPalette = (palette) => {
  const flat = {};
  Object.keys(palette).forEach((key) => {
    const value = palette[key];
    if (typeof value === 'string') flat[key] = value;
  });
  palette.brand.forEach((color, index) => {
    flat[`brand${index}`] = color;
  });
  palette.products.forEach((color, index) => {
    flat[`product${index}`] = color;
  });
  Object.entries(palette.art).forEach(([key, color]) => {
    flat[key] = color;
  });
  return flat;
};
class MachiColorBlend {
  constructor(palette) {
    __publicField(this, 'current', /* @__PURE__ */ new Map());
    __publicField(this, 'target', /* @__PURE__ */ new Map());
    __publicField(this, 'settled', true);
    /** 由环境推出来的颜色（天空、天光随时间与天气变）盖在调色板的同名键上；raw 读调色板本身的值。 */
    __publicField(this, 'derived', /* @__PURE__ */ new Map());
    Object.entries(flattenMachiPalette(palette)).forEach(([key, value]) => {
      this.current.set(key, new THREE.Color(value));
      this.target.set(key, new THREE.Color(value));
    });
  }
  /** 新目标（换主题、换歌、换场景）。新出现的键（换了场景）直接取目标色，不从别处插值过来。 */
  setTarget(palette, immediate = false) {
    Object.entries(flattenMachiPalette(palette)).forEach(([key, value]) => {
      var _a;
      const target = (_a = this.target.get(key)) != null ? _a : new THREE.Color();
      target.set(value);
      this.target.set(key, target);
      if (immediate || !this.current.has(key)) this.current.set(key, target.clone());
    });
    this.settled = immediate;
  }
  /** 推进插值；返回这一步颜色有没有变。 */
  step(deltaSeconds, rate = 2.4) {
    if (this.settled) return false;
    const k = 1 - Math.exp(-rate * deltaSeconds);
    let moving = false;
    this.current.forEach((color, key) => {
      const target = this.target.get(key);
      color.lerp(target, k);
      if (
        Math.abs(color.r - target.r) + Math.abs(color.g - target.g) + Math.abs(color.b - target.b) >
        2e-3
      )
        moving = true;
      else color.copy(target);
    });
    this.settled = !moving;
    return true;
  }
  setDerived(key, color) {
    const held = this.derived.get(key);
    if (held) held.copy(color);
    else this.derived.set(key, color.clone());
  }
  raw(key) {
    var _a;
    return (_a = this.current.get(key)) != null ? _a : this.current.get('concrete');
  }
  get(key) {
    var _a;
    return (_a = this.derived.get(key)) != null ? _a : this.raw(key);
  }
}
const createToonGradient = () => {
  const data = new Uint8Array([86, 146, 206, 255]);
  const texture = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
};
class MachiMaterials {
  /** prefix 是材质名前缀：场景的材质带场景 id，调试时看得出是谁的。 */
  constructor(blend, snow, prefix = 'machi') {
    __publicField(this, 'blend', blend);
    __publicField(this, 'snow', snow);
    __publicField(this, 'prefix', prefix);
    __publicField(this, 'gradient', createToonGradient());
    __publicField(this, 'toons', /* @__PURE__ */ new Map());
    __publicField(this, 'glows', /* @__PURE__ */ new Map());
    __publicField(this, 'glowSpecs', /* @__PURE__ */ new Map());
    __publicField(this, 'glowLevels', /* @__PURE__ */ new Map());
    /** 透明落地玻璃：不写深度，透过它能看到（也能描到）里面。 */
    __publicField(this, 'glass');
    /** 商品、瓶子、车身这类实例件：白底，颜色走 InstancedMesh 的实例色。 */
    __publicField(this, 'product');
    __publicField(this, 'extra', []);
    this.glass = new THREE.MeshToonMaterial({
      color: blend.get('glass'),
      gradientMap: this.gradient,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    this.glass.name = `${prefix}:glass`;
    this.snowy(this.glass, MACHI_GLOSS.glass);
    this.product = this.snowy(
      new THREE.MeshToonMaterial({ color: 16777215, gradientMap: this.gradient }),
      MACHI_GLOSS.metal,
    );
    this.product.name = `${prefix}:product`;
  }
  /** 给卡通材质注入积雪与高光（外面另建的卡通材质也可以用，比如车身）。gloss 只是 uniform，不分着色器程序。 */
  snowy(material, gloss = MACHI_GLOSS.matte) {
    material.onBeforeCompile = (shader) => {
      injectMachiSnow(shader, this.snow);
      injectMachiSheen(shader, this.snow, gloss);
    };
    material.customProgramCacheKey = () => 'machi-snow';
    return material;
  }
  /** 按调色板颜色键上色的卡通材质（'white' 是纯白，不跟主题走）。 */
  toon(key) {
    let material = this.toons.get(key);
    if (!material) {
      material = this.snowy(
        new THREE.MeshToonMaterial({
          color: key === 'white' ? 16777215 : this.blend.get(key),
          gradientMap: this.gradient,
        }),
        machiGlossFor(key),
      );
      material.name = `${this.prefix}:${key}`;
      this.toons.set(key, material);
    }
    return material;
  }
  /** 场景登记自己的自发光件规格（建几何之前）。 */
  defineGlows(specs) {
    Object.entries(specs).forEach(([role, spec]) => this.glowSpecs.set(role, spec));
  }
  glow(role) {
    let material = this.glows.get(role);
    if (!material) {
      if (!this.glowSpecs.has(role)) throw new Error(`[Machi] glow role "${role}" is not defined`);
      material = new THREE.MeshBasicMaterial({ color: 16777215 });
      material.name = `machi:glow:${role}`;
      this.glows.set(role, material);
      this.syncGlow(role, material);
    }
    return material;
  }
  /** 自发光件的亮度调制（闪烁、副歌加亮），1 是常态。 */
  setGlowLevel(role, level) {
    if (this.glowLevels.get(role) === level) return;
    this.glowLevels.set(role, level);
    const material = this.glows.get(role);
    if (material) this.syncGlow(role, material);
  }
  /** 外面另建的材质（招牌、天气）交给这里一起销毁。 */
  track(material) {
    this.extra.push(material);
    return material;
  }
  syncGlow(role, material) {
    var _a;
    const spec = this.glowSpecs.get(role);
    material.color
      .copy(this.blend.get(spec.key))
      .multiplyScalar(spec.level * ((_a = this.glowLevels.get(role)) != null ? _a : 1));
  }
  /** 插值后的颜色写回所有材质。 */
  syncColors() {
    this.toons.forEach((material, key) => {
      if (key !== 'white') material.color.copy(this.blend.get(key));
    });
    this.glass.color.copy(this.blend.get('glass'));
    this.glows.forEach((material, role) => this.syncGlow(role, material));
  }
  dispose() {
    this.toons.forEach((material) => material.dispose());
    this.glows.forEach((material) => material.dispose());
    this.glass.dispose();
    this.product.dispose();
    this.extra.forEach((material) => material.dispose());
    this.gradient.dispose();
  }
}
export { MachiColorBlend, MachiMaterials, flattenMachiPalette };
