// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/fx/weather.ts
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
import {
  arrayAt,
  arrayFlatMap,
  arrayFlat,
  trimStart,
  trimEnd,
  fromEntries,
} from '../../../compat.mjs';
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
const RAIN_TOP = 9.5;
const MAX_ROOFS = 4;
const GROUND_GLSL =
  /* glsl */
  `
uniform vec4 uRoofs[${MAX_ROOFS}];
uniform float uRoofY[${MAX_ROOFS}];
uniform float uGroundY;
uniform float uHalf;
float kGround(vec2 p) {
    float ground = uGroundY;
    for (int i = 0; i < ${MAX_ROOFS}; i++) {
        vec4 r = uRoofs[i];
        if (p.x > r.x && p.x < r.z && p.y > r.y && p.y < r.w) ground = max(ground, uRoofY[i]);
    }
    return ground;
}
float kHash1(float n) { return fract(sin(n) * 43758.5453123); }
`;
const RAIN_VERTEX =
  /* glsl */
  `
uniform float uTime;
uniform vec2 uWind;
uniform float uLength;
uniform float uSpeed;
uniform float uDensity;
uniform vec4 uGlints[3];
attribute vec4 aSeed;
attribute float aEnd;
varying float vAlpha;
varying float vGlint;
${GROUND_GLSL}
void main() {
    vec2 base = aSeed.xy;
    float ground = kGround(base);
    float fall = ${RAIN_TOP.toFixed(2)} - ground;
    float speed = uSpeed * (0.85 + 0.3 * aSeed.w);
    float y = ${RAIN_TOP.toFixed(2)} - mod(uTime * speed + aSeed.z * fall, fall);
    float drop = ${RAIN_TOP.toFixed(2)} - y;
    vec3 head = vec3(base.x + uWind.x * drop, y, base.y + uWind.y * drop);
    vec3 dir = normalize(vec3(-uWind.x, 1.0, -uWind.y));
    vec3 position = head + dir * uLength * aEnd * (0.75 + 0.5 * aSeed.w);
    position.y = max(position.y, ground);
    float inside = step(abs(head.x), uHalf + 0.1) * step(abs(head.z), uHalf + 0.1);
    float visible = step(aSeed.w, uDensity);
    vAlpha = (1.0 - aEnd * 0.85) * inside * visible * smoothstep(0.0, 0.6, y - ground);
    // \u843D\u8FDB\u706F\u5149\u91CC\u7684\u96E8\u4E1D\u88AB\u7167\u4EAE\uFF08\u573A\u666F\u7ED9\u7684\u51E0\u5904\u706F\uFF09\u3002
    vGlint = 0.0;
    for (int i = 0; i < 3; i++) {
        vec3 d = head - uGlints[i].xyz;
        vGlint += exp(-dot(d, d) / (uGlints[i].w * uGlints[i].w));
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const RAIN_FRAGMENT =
  /* glsl */
  `
uniform vec3 uColor;
uniform vec3 uGlintColor;
uniform float uOpacity;
varying float vAlpha;
varying float vGlint;
void main() {
    float glint = min(1.0, vGlint);
    vec3 color = mix(uColor, uGlintColor, glint) * (1.0 + 2.2 * glint);
    gl_FragColor = vec4(color * vAlpha * uOpacity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
const SPLASH_VERTEX =
  /* glsl */
  `
uniform float uTime;
uniform float uRate;
uniform float uDensity;
attribute vec4 aSeed;
varying vec2 vUv;
varying float vLife;
${GROUND_GLSL}
void main() {
    float cycle = uTime * uRate * (0.8 + 0.4 * aSeed.w) + aSeed.z;
    float index = floor(cycle);
    float life = fract(cycle);
    vec2 p = vec2(kHash1(index * 12.9898 + aSeed.x * 78.233), kHash1(index * 39.346 + aSeed.y * 11.135)) * 2.0 - 1.0;
    p *= uHalf - 0.05;
    float ground = kGround(p);
    float visible = step(aSeed.w, uDensity);
    float size = (0.06 + 0.24 * life) * visible;
    vUv = uv;
    vLife = life;
    vec3 local = vec3(position.x * size, 0.0, position.y * size);
    vec4 world = modelMatrix * vec4(local + vec3(p.x, ground + 0.012, p.y), 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
}
`;
const SPLASH_FRAGMENT =
  /* glsl */
  `
uniform vec3 uColor;
varying vec2 vUv;
varying float vLife;
void main() {
    float d = length(vUv - 0.5) * 2.0;
    float ring = smoothstep(0.62, 0.86, d) * (1.0 - smoothstep(0.86, 1.0, d));
    float alpha = ring * (1.0 - vLife) * 1.1;
    gl_FragColor = vec4(uColor * alpha, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
const DRIP_VERTEX =
  /* glsl */
  `
uniform float uTime;
attribute vec4 aDrip; // x, z, \u8D77\u70B9\u9AD8\u5EA6, \u843D\u70B9\u9AD8\u5EA6
attribute vec2 aTiming; // \u5468\u671F, \u76F8\u4F4D
varying vec2 vUv;
varying float vMode;
varying float vFade;
void main() {
    float height = aDrip.z - aDrip.w;
    float fallTime = sqrt(2.0 * height / 9.8);
    float splashTime = 0.28;
    float t = mod(uTime + aTiming.y * aTiming.x, aTiming.x);
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 world;
    if (t < fallTime) {
        // \u4E0B\u843D\uFF1A\u8D8A\u843D\u8D8A\u62C9\u957F\u7684\u6C34\u6EF4\uFF0C\u671D\u955C\u5934\u7684\u5C0F\u7AD6\u6761\u3002
        float y = aDrip.z - 0.5 * 9.8 * t * t;
        float stretch = 0.03 + 0.05 * (t / fallTime);
        world = vec3(aDrip.x, y, aDrip.y) + right * position.x * 0.026 + vec3(0.0, 1.0, 0.0) * position.y * stretch;
        vMode = 0.0;
        vFade = 1.0;
    } else if (t < fallTime + splashTime) {
        // \u6E85\u5F00\uFF1A\u5730\u4E0A\u4E00\u4E2A\u6269\u6563\u7684\u6241\u5706\u73AF\u3002
        float s = (t - fallTime) / splashTime;
        world = vec3(aDrip.x + position.x * (0.05 + 0.16 * s), aDrip.w + 0.014, aDrip.y + position.y * (0.05 + 0.16 * s));
        vMode = 1.0;
        vFade = 1.0 - s;
    } else {
        world = vec3(0.0, -50.0, 0.0);
        vMode = 0.0;
        vFade = 0.0;
    }
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;
const SNOW_VERTEX =
  /* glsl */
  `
uniform float uTime;
uniform vec2 uWind;
uniform float uDensity;
uniform float uPixelsPerUnit;
uniform vec4 uGlints[3];
attribute vec4 aSeed;
varying float vAlpha;
varying float vGlint;
${GROUND_GLSL}
void main() {
    vec2 base = aSeed.xy;
    float ground = kGround(base);
    float fall = ${RAIN_TOP.toFixed(2)} - ground;
    float speed = 0.75 + 0.45 * aSeed.w;
    float y = ${RAIN_TOP.toFixed(2)} - mod(uTime * speed + aSeed.z * fall, fall);
    float drop = ${RAIN_TOP.toFixed(2)} - y;
    // \u5DE6\u53F3\u98D8\uFF1A\u4E24\u5C42\u4E0D\u540C\u5468\u671F\u7684\u6446\uFF0C\u52A0\u4E0A\u98CE\u3002
    float sway = sin(uTime * 1.1 + aSeed.z * 40.0) * 0.22 + sin(uTime * 2.3 + aSeed.w * 23.0) * 0.08;
    vec3 position = vec3(base.x + uWind.x * drop * 0.6 + sway, y, base.y + uWind.y * drop * 0.6 + sway * 0.6);
    float inside = step(abs(position.x), uHalf + 0.1) * step(abs(position.z), uHalf + 0.1);
    float visible = step(aSeed.w, uDensity);
    vAlpha = inside * visible * smoothstep(0.0, 0.35, y - ground);
    vGlint = 0.0;
    for (int i = 0; i < 3; i++) {
        vec3 d = position - uGlints[i].xyz;
        vGlint += exp(-dot(d, d) / (uGlints[i].w * uGlints[i].w));
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (0.05 + 0.06 * aSeed.w) * uPixelsPerUnit * visible;
}
`;
const SNOW_FRAGMENT =
  /* glsl */
  `
uniform vec3 uColor;
uniform vec3 uGlintColor;
varying float vAlpha;
varying float vGlint;
void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float alpha = (1.0 - smoothstep(0.35, 1.0, d)) * vAlpha;
    if (alpha < 0.01) discard;
    vec3 color = mix(uColor, uGlintColor, min(1.0, vGlint) * 0.6);
    gl_FragColor = vec4(color, alpha * 0.9);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
const DRIP_FRAGMENT =
  /* glsl */
  `
uniform vec3 uColor;
uniform float uAmount;
varying vec2 vUv;
varying float vMode;
varying float vFade;
void main() {
    vec2 c = vUv - 0.5;
    float alpha;
    if (vMode < 0.5) {
        alpha = 1.0 - smoothstep(0.3, 0.5, length(c * vec2(1.0, 0.55)));
    } else {
        float d = length(c) * 2.0;
        alpha = smoothstep(0.6, 0.85, d) * (1.0 - smoothstep(0.85, 1.0, d)) * 0.8;
    }
    gl_FragColor = vec4(uColor * alpha * vFade * 1.3 * uAmount, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
const additive = (material) => {
  material.transparent = true;
  material.depthWrite = false;
  material.blending = THREE.AdditiveBlending;
  return material;
};
class MachiWeather {
  constructor(materials, blend, layout, counts) {
    __publicField(this, 'blend', blend);
    __publicField(this, 'group', new THREE.Group());
    __publicField(this, 'rainMaterial');
    __publicField(this, 'splashMaterial');
    __publicField(this, 'dripMaterial');
    __publicField(this, 'snowMaterial');
    __publicField(this, 'rain');
    __publicField(this, 'splashes');
    __publicField(this, 'drips');
    __publicField(this, 'snow');
    __publicField(this, 'geometries', []);
    __publicField(this, 'glintRadii');
    this.group.name = 'Weather';
    const roofs = Array.from({ length: MAX_ROOFS }, (_, index) => layout.roofs[index]);
    const shared = {
      uRoofs: {
        value: roofs.map((roof) =>
          roof
            ? new THREE.Vector4(roof.x0, roof.z0, roof.x1, roof.z1)
            : new THREE.Vector4(0, 0, 0, 0),
        ),
      },
      uRoofY: {
        value: roofs.map((roof) => {
          var _a;
          return (_a = roof == null ? void 0 : roof.y) != null ? _a : -100;
        }),
      },
      uGroundY: { value: layout.groundY },
      uHalf: { value: layout.half },
    };
    const HALF = layout.half;
    const glints = layout.glints;
    this.glintRadii = [0, 1, 2].map((index) => {
      var _a, _b;
      return (_b = (_a = glints[index]) == null ? void 0 : _a.radius) != null ? _b : 1e-3;
    });
    const wind = new THREE.Vector2(
      Math.sin(layout.windYaw),
      Math.cos(layout.windYaw),
    ).multiplyScalar(layout.windSlant);
    const rainGeometry = new THREE.BufferGeometry();
    const seeds = new Float32Array(counts.rain * 2 * 4);
    const ends = new Float32Array(counts.rain * 2);
    const positions = new Float32Array(counts.rain * 2 * 3);
    for (let index = 0; index < counts.rain; index += 1) {
      const seed = [
        (Math.random() * 2 - 1) * (HALF + 0.6),
        (Math.random() * 2 - 1) * (HALF + 0.6),
        Math.random(),
        Math.random(),
      ];
      for (let end = 0; end < 2; end += 1) {
        seeds.set(seed, (index * 2 + end) * 4);
        ends[index * 2 + end] = end;
      }
    }
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    rainGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    rainGeometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
    rainGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, RAIN_TOP / 2, 0), 14);
    this.rainMaterial = materials.track(
      additive(
        new THREE.ShaderMaterial({
          vertexShader: RAIN_VERTEX,
          fragmentShader: RAIN_FRAGMENT,
          uniforms: __spreadProps(__spreadValues({}, shared), {
            uTime: { value: 0 },
            uWind: { value: wind },
            uLength: { value: 0.42 },
            uSpeed: { value: 11 },
            uDensity: { value: 0.8 },
            uColor: { value: new THREE.Color() },
            uGlintColor: { value: new THREE.Color() },
            uGlints: {
              value: [0, 1, 2].map((index) => {
                const glint = glints[index];
                return glint
                  ? new THREE.Vector4(
                      glint.position.x,
                      glint.position.y,
                      glint.position.z,
                      glint.radius,
                    )
                  : new THREE.Vector4(0, -100, 0, 1e-3);
              }),
            },
            uOpacity: { value: 0.3 },
          }),
        }),
      ),
    );
    const rain = new THREE.LineSegments(rainGeometry, this.rainMaterial);
    rain.name = 'Weather/rain';
    rain.frustumCulled = false;
    rain.renderOrder = 5;
    this.rain = rain;
    const splashGeometry = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    splashGeometry.index = quad.index;
    splashGeometry.setAttribute('position', quad.getAttribute('position'));
    splashGeometry.setAttribute('uv', quad.getAttribute('uv'));
    const splashSeeds = new Float32Array(counts.splash * 4);
    for (let index = 0; index < counts.splash; index += 1) {
      splashSeeds.set([Math.random(), Math.random(), Math.random() * 10, Math.random()], index * 4);
    }
    splashGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(splashSeeds, 4));
    splashGeometry.instanceCount = counts.splash;
    this.splashMaterial = materials.track(
      additive(
        new THREE.ShaderMaterial({
          vertexShader: SPLASH_VERTEX,
          fragmentShader: SPLASH_FRAGMENT,
          uniforms: __spreadProps(__spreadValues({}, shared), {
            uTime: { value: 0 },
            uRate: { value: 1.6 },
            uDensity: { value: 0.8 },
            uColor: { value: new THREE.Color() },
          }),
        }),
      ),
    );
    const splashes = new THREE.Mesh(splashGeometry, this.splashMaterial);
    splashes.name = 'Weather/splashes';
    splashes.frustumCulled = false;
    splashes.renderOrder = 4;
    this.splashes = splashes;
    const drips = layout.drips.map((drip) => [drip.x, drip.z, drip.from, drip.to]);
    const timings = layout.drips.map((drip) => [drip.period, drip.phase]);
    const dripGeometry = new THREE.InstancedBufferGeometry();
    dripGeometry.index = quad.index;
    dripGeometry.setAttribute('position', quad.getAttribute('position'));
    dripGeometry.setAttribute('uv', quad.getAttribute('uv'));
    dripGeometry.setAttribute(
      'aDrip',
      new THREE.InstancedBufferAttribute(new Float32Array(arrayFlat(drips)), 4),
    );
    dripGeometry.setAttribute(
      'aTiming',
      new THREE.InstancedBufferAttribute(new Float32Array(arrayFlat(timings)), 2),
    );
    dripGeometry.instanceCount = drips.length;
    this.dripMaterial = materials.track(
      additive(
        new THREE.ShaderMaterial({
          vertexShader: DRIP_VERTEX,
          fragmentShader: DRIP_FRAGMENT,
          uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color() },
            uAmount: { value: 1 },
          },
        }),
      ),
    );
    this.dripMaterial.side = THREE.DoubleSide;
    const dripMesh = new THREE.Mesh(dripGeometry, this.dripMaterial);
    dripMesh.name = 'Weather/drips';
    dripMesh.frustumCulled = false;
    dripMesh.renderOrder = 5;
    this.drips = dripMesh;
    const snowGeometry = new THREE.BufferGeometry();
    const snowSeeds = new Float32Array(counts.snow * 4);
    for (let index = 0; index < counts.snow; index += 1) {
      snowSeeds.set(
        [
          (Math.random() * 2 - 1) * (HALF + 0.6),
          (Math.random() * 2 - 1) * (HALF + 0.6),
          Math.random(),
          Math.random(),
        ],
        index * 4,
      );
    }
    snowGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(counts.snow * 3), 3),
    );
    snowGeometry.setAttribute('aSeed', new THREE.BufferAttribute(snowSeeds, 4));
    this.snowMaterial = materials.track(
      new THREE.ShaderMaterial({
        vertexShader: SNOW_VERTEX,
        fragmentShader: SNOW_FRAGMENT,
        uniforms: __spreadProps(__spreadValues({}, shared), {
          uTime: { value: 0 },
          uWind: { value: wind },
          uDensity: { value: 0.8 },
          uPixelsPerUnit: { value: 60 },
          uColor: { value: new THREE.Color() },
          uGlintColor: { value: new THREE.Color() },
          uGlints: this.rainMaterial.uniforms.uGlints,
        }),
        transparent: true,
        depthWrite: false,
      }),
    );
    const snow = new THREE.Points(snowGeometry, this.snowMaterial);
    snow.name = 'Weather/snow';
    snow.frustumCulled = false;
    snow.renderOrder = 5;
    this.snow = snow;
    this.geometries.push(rainGeometry, splashGeometry, dripGeometry, snowGeometry, quad);
    this.group.add(rain, splashes, dripMesh, snow);
    this.syncColors();
  }
  syncColors() {
    const rain = this.blend.get('skyBottom').clone().lerp(new THREE.Color(14674431), 0.72);
    this.rainMaterial.uniforms.uColor.value.copy(rain);
    this.rainMaterial.uniforms.uGlintColor.value
      .copy(this.blend.get('streetLight'))
      .lerp(this.blend.get('interiorLight'), 0.4);
    this.splashMaterial.uniforms.uColor.value.copy(rain).multiplyScalar(0.8);
    this.dripMaterial.uniforms.uColor.value.copy(rain).lerp(this.blend.get('interiorLight'), 0.25);
    this.snowMaterial.uniforms.uColor.value.set(16054268).lerp(this.blend.get('hemiSky'), 0.18);
    this.snowMaterial.uniforms.uGlintColor.value.copy(this.blend.get('streetLight'));
  }
  update(frame) {
    const rain = Math.min(1, frame.rain);
    const density = Math.max(0.15, rain);
    this.rain.visible = rain > 0.01;
    this.splashes.visible = rain > 0.01;
    this.rainMaterial.uniforms.uTime.value = frame.time;
    this.rainMaterial.uniforms.uDensity.value = Math.min(1, rain * 4) * (0.35 + 0.65 * density);
    this.splashMaterial.uniforms.uTime.value = frame.time;
    this.splashMaterial.uniforms.uDensity.value = Math.min(1, rain * 4) * (0.3 + 0.7 * density);
    this.drips.visible = frame.wetness > 0.05;
    this.dripMaterial.uniforms.uTime.value = frame.time;
    this.dripMaterial.uniforms.uAmount.value = Math.min(1, frame.wetness * 1.2);
    const snow = Math.min(1, frame.snow);
    this.snow.visible = snow > 0.01;
    this.snowMaterial.uniforms.uTime.value = frame.time;
    this.snowMaterial.uniforms.uDensity.value = snow * 0.85;
    this.snowMaterial.uniforms.uPixelsPerUnit.value = frame.pixelsPerUnit;
    this.rainMaterial.uniforms.uGlints.value.forEach((glint, index) => {
      glint.w = Math.max(1e-3, this.glintRadii[index] * frame.glint);
    });
  }
  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose());
  }
}
export { MachiWeather };
