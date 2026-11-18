// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/geometry/shapes.ts
import { createObjectCache, createObjectSet } from '../../../../../shared/objectCache.mjs';
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
import * as THREE from '../../../three.mjs';
import { indexTriangles } from '../../../indexed-geometry.mjs';
import { RoundedBoxGeometry } from '../../../three/RoundedBoxGeometry.mjs';
import { mergeGeometries } from '../../../three/BufferGeometryUtils.mjs';
let activeCache = /* @__PURE__ */ new Map();
const sharedGeometries = /* @__PURE__ */ createObjectSet();
const withGeometryCache = (cache, build) => {
  const previous = activeCache;
  activeCache = cache;
  try {
    return build();
  } finally {
    activeCache = previous;
  }
};
const roundedBox = (width, height, depth, radius = 0.03, segments = 2) => {
  const r = Math.min(radius, width / 2 - 1e-3, height / 2 - 1e-3, depth / 2 - 1e-3);
  const key = `${width.toFixed(3)}:${height.toFixed(3)}:${depth.toFixed(3)}:${r.toFixed(3)}:${segments}`;
  let geometry = activeCache.get(key);
  if (!geometry) {
    geometry =
      r > 4e-3
        ? new RoundedBoxGeometry(width, height, depth, segments, r)
        : new THREE.BoxGeometry(width, height, depth);
    activeCache.set(key, geometry);
    sharedGeometries.add(geometry);
  }
  return geometry;
};
const mesh = (geometry, material, options = {}) => {
  var _a, _b, _c;
  const result = new THREE.Mesh(geometry, material);
  result.name = (_a = options.name) != null ? _a : '';
  result.castShadow = (_b = options.castShadow) != null ? _b : true;
  result.receiveShadow = (_c = options.receiveShadow) != null ? _c : true;
  if (options.dynamic) result.userData.dynamic = true;
  return result;
};
const boxAt = (material, size, at, options = {}) => {
  var _a;
  const [width, height, depth] = size;
  const result = mesh(
    roundedBox(width, height, depth, (_a = options.radius) != null ? _a : 0.03),
    material,
    options,
  );
  result.position.set(at[0], at[1] + height / 2, at[2]);
  if (options.rotationY) result.rotation.y = options.rotationY;
  return result;
};
const boxSpan = (material, x0, x1, y0, y1, z0, z1, options = {}) =>
  boxAt(
    material,
    [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)],
    [(x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2],
    options,
  );
const cylinderAt = (material, radius, height, at, options = {}) => {
  var _a, _b;
  const geometry = new THREE.CylinderGeometry(
    (_a = options.radiusTop) != null ? _a : radius,
    radius,
    height,
    (_b = options.segments) != null ? _b : 12,
  );
  const result = mesh(geometry, material, options);
  result.position.set(at[0], at[1] + height / 2, at[2]);
  return result;
};
const tubeBetween = (material, from, to, radius, options = {}) => {
  var _a;
  const length = from.distanceTo(to);
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    (_a = options.segments) != null ? _a : 8,
  );
  const result = mesh(geometry, material, options);
  result.position.copy(from).add(to).multiplyScalar(0.5);
  result.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    to.clone().sub(from).normalize(),
  );
  return result;
};
const sagWire = (material, from, to, sag, radius = 0.012) => {
  const points = [];
  const steps = 16;
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const point = from.clone().lerp(to, t);
    point.y -= sag * 4 * t * (1 - t);
    points.push(point);
  }
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, radius, 4, false);
  return mesh(geometry, material, { castShadow: false, receiveShadow: false });
};
const group = (name, ...children) => {
  const result = new THREE.Group();
  result.name = name;
  children.forEach((child) => result.add(child));
  return result;
};
const normalizeForMerge = (geometry, matrix) => {
  // Missing normals originally used the expanded triangle's flat normal.
  const result =
    geometry.index && !geometry.attributes.normal ? geometry.toNonIndexed() : geometry.clone();
  result.applyMatrix4(matrix);
  Object.keys(result.attributes).forEach((name) => {
    if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'color')
      result.deleteAttribute(name);
  });
  if (!result.attributes.normal) result.computeVertexNormals();
  if (!result.attributes.uv) {
    const count = result.attributes.position.count;
    result.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  indexTriangles(result);
  result.morphAttributes = {};
  result.clearGroups();
  return result;
};
const bakeStatic = (root) => {
  root.updateMatrixWorld(true);
  root.children.forEach((top) => {
    const inverse = new THREE.Matrix4().copy(top.matrixWorld).invert();
    const buckets = /* @__PURE__ */ new Map();
    const removals = [];
    top.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
      if (object.userData.dynamic || Array.isArray(object.material)) return;
      let ancestor = object.parent;
      while (ancestor && ancestor !== top) {
        if (ancestor.userData.dynamic) return;
        ancestor = ancestor.parent;
      }
      const material = object.material;
      const key = `${material.uuid}:${object.castShadow ? 1 : 0}:${object.receiveShadow ? 1 : 0}:${object.layers.mask}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          material,
          cast: object.castShadow,
          receive: object.receiveShadow,
          layers: object.layers.mask,
          parts: [],
        };
        buckets.set(key, bucket);
      }
      const local = new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld);
      bucket.parts.push(normalizeForMerge(object.geometry, local));
      removals.push(object);
    });
    buckets.forEach((bucket) => {
      if (bucket.parts.length < 2) {
        bucket.parts.forEach((part) => part.dispose());
        return;
      }
      if (bucket.parts.some((part) => part.attributes.color)) {
        bucket.parts.forEach((part) => {
          if (part.attributes.color) return;
          const count = part.attributes.position.count;
          part.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3),
          );
        });
      }
      const merged = mergeGeometries(bucket.parts, false);
      bucket.parts.forEach((part) => part.dispose());
      if (!merged) return;
      const result = new THREE.Mesh(merged, bucket.material);
      result.name = `${top.name}:${bucket.material.name || 'merged'}`;
      result.castShadow = bucket.cast;
      result.receiveShadow = bucket.receive;
      result.layers.mask = bucket.layers;
      result.matrixAutoUpdate = false;
      top.add(result);
    });
    removals.forEach((object) => {
      const key = `${object.material.uuid}:${object.castShadow ? 1 : 0}:${object.receiveShadow ? 1 : 0}:${object.layers.mask}`;
      const bucket = buckets.get(key);
      if (!bucket || bucket.parts.length < 2) return;
      object.removeFromParent();
      if (!sharedGeometries.has(object.geometry)) object.geometry.dispose();
    });
  });
};
export {
  bakeStatic,
  boxAt,
  boxSpan,
  cylinderAt,
  group,
  mesh,
  roundedBox,
  sagWire,
  tubeBetween,
  withGeometryCache,
};
