// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/actors/traffic.ts
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
import { roundedBox } from '../geometry/shapes.mjs';
import { MACHI_REFLECT_LAYER } from '../fx/reflection.mjs';
import { MACHI_GLOSS } from '../sheen.mjs';
import { resolveMachiCar } from './schedules.mjs';
const WHEEL_RADIUS = 0.27;
const MACHI_TRAFFIC_CAR = { length: 3.3, width: 1.46 };
const CAR_COLORS = ['#e8eaee', '#aeb5bf', '#25292f', '#22385f', '#b8322e', '#f0c23a'];
const TAXI_INDEX = CAR_COLORS.length - 1;
const createBaseClippingPlanes = (half = 6) => [
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), half),
  new THREE.Plane(new THREE.Vector3(1, 0, 0), half),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), half),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), half),
];
const clipToBase = (material, planes) => {
  const uniform = {
    value: planes.map(
      (plane) => new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant),
    ),
  };
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.uMachiBaseClip = uniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMachiBaseClip;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvMachiBaseClip = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vMachiBaseClip;
uniform vec4 uMachiBaseClip[${planes.length}];`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
for (int i = 0; i < ${planes.length}; i++) {
    if (dot(uMachiBaseClip[i].xyz, vMachiBaseClip) + uMachiBaseClip[i].w < 0.0) discard;
}`,
      );
  };
  material.customProgramCacheKey = () => `${previousKey.call(material)}:machi-base-clip`;
  return material;
};
const createSoftEllipseTexture = (forward = false) => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = ((x + 0.5) / size) * 2 - 1;
      const v = ((y + 0.5) / size) * 2 - 1;
      const d = Math.hypot(u, v);
      const bias = forward ? 0.45 + 0.55 * (1 - (u + 1) / 2) : 1;
      const value = Math.round(255 * Math.max(0, 1 - d) ** 1.6 * bias);
      const index = (y * size + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = forward ? 255 : value;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
};
class MachiTraffic {
  constructor(materials, blend, clipping, lanes, roadY) {
    __publicField(this, 'blend', blend);
    __publicField(this, 'lanes', lanes);
    __publicField(this, 'roadY', roadY);
    __publicField(this, 'group', new THREE.Group());
    __publicField(this, 'car', new THREE.Group());
    __publicField(this, 'body');
    __publicField(this, 'taxiLamp');
    __publicField(this, 'wheels', []);
    __publicField(this, 'headlight');
    __publicField(this, 'taillight');
    __publicField(this, 'pool');
    __publicField(this, 'textures', []);
    __publicField(this, 'geometries', []);
    __publicField(this, 'colorIndex', -1);
    /** 这一帧路上有没有车（暂停时补帧、阴影都不用管它）。 */
    __publicField(this, 'active', false);
    this.group.name = 'Traffic';
    const clip = (material) => materials.track(clipToBase(material, clipping));
    this.body = clip(
      materials.snowy(
        new THREE.MeshToonMaterial({ color: CAR_COLORS[0], gradientMap: materials.gradient }),
        MACHI_GLOSS.paint,
      ),
    );
    const glass = clip(
      materials.snowy(
        new THREE.MeshToonMaterial({ color: '#1a2130', gradientMap: materials.gradient }),
        MACHI_GLOSS.glass,
      ),
    );
    const rubber = clip(
      materials.snowy(
        new THREE.MeshToonMaterial({ color: '#15171c', gradientMap: materials.gradient }),
      ),
    );
    this.headlight = clip(new THREE.MeshBasicMaterial({ color: 16777215 }));
    this.taillight = clip(new THREE.MeshBasicMaterial({ color: 16777215 }));
    const lampMaterial = clip(
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.6) }),
    );
    const shadowTexture = createSoftEllipseTexture();
    const poolTexture = createSoftEllipseTexture(true);
    this.textures.push(shadowTexture, poolTexture);
    const shadow = clip(
      new THREE.MeshBasicMaterial({
        color: 0,
        alphaMap: shadowTexture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    this.pool = clip(
      new THREE.MeshBasicMaterial({
        map: poolTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const part = (geometry, material, x, y, z, name) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.name = name;
      this.car.add(mesh);
      return mesh;
    };
    part(
      roundedBox(MACHI_TRAFFIC_CAR.length, 0.56, MACHI_TRAFFIC_CAR.width, 0.15),
      this.body,
      0,
      0.5,
      0,
      'Body',
    );
    part(roundedBox(1.92, 0.5, 1.32, 0.13), glass, -0.22, 1.02, 0, 'Cabin');
    part(roundedBox(1.78, 0.08, 1.36, 0.04), this.body, -0.22, 1.3, 0, 'Roof');
    this.taxiLamp = part(
      roundedBox(0.36, 0.14, 0.2, 0.03),
      lampMaterial,
      -0.2,
      1.41,
      0,
      'TaxiLamp',
    );
    [-1, 1].forEach((side) => {
      const head = part(
        roundedBox(0.06, 0.13, 0.32, 0.02),
        this.headlight,
        1.64,
        0.6,
        side * 0.48,
        'Headlight',
      );
      const tail = part(
        roundedBox(0.06, 0.12, 0.26, 0.02),
        this.taillight,
        -1.64,
        0.64,
        side * 0.52,
        'Taillight',
      );
      head.layers.enable(MACHI_REFLECT_LAYER);
      tail.layers.enable(MACHI_REFLECT_LAYER);
    });
    const wheelGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.2, 14);
    wheelGeometry.rotateX(Math.PI / 2);
    this.geometries.push(wheelGeometry);
    [
      [1.05, 0.66],
      [1.05, -0.66],
      [-1.05, 0.66],
      [-1.05, -0.66],
    ].forEach(([x, z]) => {
      this.wheels.push(part(wheelGeometry, rubber, x, WHEEL_RADIUS, z, 'Wheel'));
    });
    const shadowGeometry = new THREE.PlaneGeometry(3.7, 1.9);
    shadowGeometry.rotateX(-Math.PI / 2);
    const poolGeometry = new THREE.PlaneGeometry(3.6, 2.4);
    poolGeometry.rotateX(-Math.PI / 2);
    this.geometries.push(shadowGeometry, poolGeometry);
    const shadowMesh = part(shadowGeometry, shadow, 0, 4e-3, 0, 'Shadow');
    shadowMesh.renderOrder = 1;
    const poolMesh = part(poolGeometry, this.pool, 3.4, 8e-3, 0, 'HeadlightPool');
    poolMesh.renderOrder = 1;
    this.car.children.forEach((child) => {
      child.castShadow = false;
      child.receiveShadow = false;
    });
    this.car.visible = false;
    this.group.add(this.car);
    this.syncColors();
  }
  syncColors() {
    this.headlight.color.copy(this.blend.get('streetLight')).multiplyScalar(3.2);
    this.taillight.color.copy(this.blend.get('stopRed')).multiplyScalar(2.6);
    this.pool.color.copy(this.blend.get('streetLight')).multiplyScalar(0.3);
  }
  /** 按氛围时间摆车；没有车时藏起来。 */
  update(time, seed, chance) {
    const pass = resolveMachiCar(time, seed, this.lanes, chance);
    this.active = !!pass;
    this.car.visible = !!pass;
    if (!pass) return;
    const lane = this.lanes[pass.lane];
    const dx = lane.to[0] - lane.from[0];
    const dz = lane.to[1] - lane.from[1];
    const length = Math.hypot(dx, dz);
    const t = pass.distance / length;
    this.car.position.set(lane.from[0] + dx * t, this.roadY, lane.from[1] + dz * t);
    this.car.rotation.y = Math.atan2(-dz, dx);
    this.wheels.forEach((wheel) => {
      wheel.rotation.z = -pass.distance / WHEEL_RADIUS;
    });
    const colorIndex = pass.colorIndex % CAR_COLORS.length;
    if (colorIndex !== this.colorIndex) {
      this.colorIndex = colorIndex;
      this.body.color.set(CAR_COLORS[colorIndex]);
      this.taxiLamp.visible = colorIndex === TAXI_INDEX;
    }
  }
  dispose() {
    this.textures.forEach((texture) => texture.dispose());
    this.geometries.forEach((geometry) => geometry.dispose());
  }
}
export { MACHI_TRAFFIC_CAR, MachiTraffic, createBaseClippingPlanes, createSoftEllipseTexture };
