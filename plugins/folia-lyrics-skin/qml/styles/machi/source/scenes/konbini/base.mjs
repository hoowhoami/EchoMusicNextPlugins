// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/konbini/base.ts
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
import { BASE, LEVEL, ROAD } from './layout.mjs';
import { buildMachiPlinth, machiSurface as surface } from '../../engine/geometry/plinth.mjs';
import { boxSpan, group, mesh, roundedBox } from '../../engine/geometry/shapes.mjs';
const buildLots = (materials) => {
  const h = BASE.half;
  const slabs = [
    [-h, ROAD.inner, -h, ROAD.inner],
    [ROAD.outer, h, -h, ROAD.inner],
    [-h, ROAD.inner, ROAD.outer, h],
    [ROAD.outer, h, ROAD.outer, h],
  ];
  const concrete = materials.toon('concrete');
  const curb = materials.toon('curb');
  const parts = [];
  slabs.forEach(([x0, x1, z0, z1], index) => {
    parts.push(
      boxSpan(concrete, x0 + 2e-3, x1 - 2e-3, LEVEL.road, LEVEL.lot - 4e-3, z0 + 2e-3, z1 - 2e-3, {
        radius: 0.01,
        name: `Lot/slab${index}`,
      }),
    );
  });
  const c = ROAD.curbWidth;
  const curbTop = LEVEL.lot + 0.012;
  const curbs = [
    [-h, ROAD.inner, ROAD.inner - c, ROAD.inner],
    [ROAD.inner - c, ROAD.inner, -h, ROAD.inner],
    [ROAD.outer, h, ROAD.inner - c, ROAD.inner],
    [ROAD.outer, ROAD.outer + c, -h, ROAD.inner],
    [-h, ROAD.inner, ROAD.outer, ROAD.outer + c],
    [ROAD.inner - c, ROAD.inner, ROAD.outer, h],
    [ROAD.outer, h, ROAD.outer, ROAD.outer + c],
    [ROAD.outer, ROAD.outer + c, ROAD.outer, h],
  ];
  curbs.forEach(([x0, x1, z0, z1], index) => {
    parts.push(
      boxSpan(curb, x0, x1, LEVEL.road, curbTop, z0, z1, {
        radius: 0.02,
        name: `Lot/curb${index}`,
      }),
    );
  });
  return group('Base/Lots', ...parts);
};
const buildRoadPaint = (materials) => {
  const h = BASE.half;
  const bars = [];
  const crossA = { x0: 0.15, x1: 1.95 };
  for (let z = ROAD.inner + 0.42; z < ROAD.outer - 0.3; z += 0.8) {
    bars.push({ x: (crossA.x0 + crossA.x1) / 2, z: z + 0.2, w: crossA.x1 - crossA.x0, d: 0.4 });
  }
  const crossB = { z0: -0.95, z1: 0.85 };
  for (let x = ROAD.inner + 0.42; x < ROAD.outer - 0.3; x += 0.8) {
    bars.push({ x: x + 0.2, z: (crossB.z0 + crossB.z1) / 2, w: 0.4, d: crossB.z1 - crossB.z0 });
  }
  const inset = ROAD.edgeLineInset;
  const lineWidth = 0.1;
  const frontLineSpans = [
    [-h, crossA.x0 - 0.3],
    [crossA.x1 + 0.3, ROAD.inner - 0.1],
  ];
  frontLineSpans.forEach(([x0, x1]) => {
    bars.push({ x: (x0 + x1) / 2, z: ROAD.inner + inset, w: x1 - x0, d: lineWidth });
    bars.push({ x: (x0 + x1) / 2, z: ROAD.outer - inset, w: x1 - x0, d: lineWidth });
  });
  const rightLineSpans = [
    [-h, crossB.z0 - 0.3],
    [crossB.z1 + 0.3, ROAD.inner - 0.1],
  ];
  rightLineSpans.forEach(([z0, z1]) => {
    bars.push({ x: ROAD.inner + inset, z: (z0 + z1) / 2, w: lineWidth, d: z1 - z0 });
    bars.push({ x: ROAD.outer - inset, z: (z0 + z1) / 2, w: lineWidth, d: z1 - z0 });
  });
  bars.push({
    x: crossA.x0 - 0.45,
    z: (ROAD.inner + ROAD.outer) / 2 + 0.85,
    w: 0.3,
    d: (ROAD.outer - ROAD.inner) / 2 - 0.2,
  });
  bars.push({
    x: (ROAD.inner + ROAD.outer) / 2 - 0.85,
    z: crossB.z0 - 0.45,
    w: (ROAD.outer - ROAD.inner) / 2 - 0.2,
    d: 0.3,
  });
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const paint = new THREE.InstancedMesh(geometry, materials.toon('roadPaint'), bars.length);
  paint.name = 'Base/RoadPaint';
  paint.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  bars.forEach((bar, index) => {
    matrix.makeScale(bar.w, 1, bar.d);
    matrix.setPosition(bar.x, LEVEL.road + 6e-3, bar.z);
    paint.setMatrixAt(index, matrix);
  });
  return paint;
};
const buildRoadFixtures = (materials) => {
  const darkMetal = materials.toon('darkMetal');
  const parts = [];
  const manhole = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 24), darkMetal, {
    name: 'Manhole',
    castShadow: false,
  });
  manhole.position.set(-2.4, LEVEL.road + 0.01, (ROAD.inner + ROAD.outer) / 2 + 0.3);
  parts.push(manhole);
  const grateGeometry = roundedBox(0.7, 0.012, 0.22, 4e-3);
  const grates = new THREE.InstancedMesh(grateGeometry, darkMetal, 14);
  grates.name = 'Grates';
  grates.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  let count = 0;
  for (let x = -5.4; x < ROAD.inner - 0.6 && count < 7; x += 1.1, count += 1) {
    matrix.makeTranslation(x, LEVEL.road + 6e-3, ROAD.inner + 0.13);
    grates.setMatrixAt(count, matrix);
  }
  for (let z = -5.4; z < ROAD.inner - 0.6 && count < 14; z += 1.1, count += 1) {
    matrix.makeRotationY(Math.PI / 2);
    matrix.setPosition(ROAD.inner + 0.13, LEVEL.road + 6e-3, z);
    grates.setMatrixAt(count, matrix);
  }
  grates.count = count;
  parts.push(grates);
  return group('Base/Fixtures', ...parts);
};
const buildKonbiniBase = (materials) => {
  const h = BASE.half;
  const roadSurface = surface(materials.toon('asphalt'), -h, h, -h, h, LEVEL.road, 'Surface/road');
  const lotSurfaces = [
    surface(
      materials.toon('concrete'),
      -h,
      ROAD.inner - ROAD.curbWidth,
      -h,
      ROAD.inner - ROAD.curbWidth,
      LEVEL.lot,
      'Surface/lot',
    ),
    surface(
      materials.toon('concrete'),
      ROAD.outer + ROAD.curbWidth,
      h,
      -h,
      ROAD.inner,
      LEVEL.lot,
      'Surface/farRight',
    ),
    surface(
      materials.toon('concrete'),
      -h,
      ROAD.inner,
      ROAD.outer + ROAD.curbWidth,
      h,
      LEVEL.lot,
      'Surface/farFront',
    ),
    surface(
      materials.toon('concrete'),
      ROAD.outer + ROAD.curbWidth,
      h,
      ROAD.outer + ROAD.curbWidth,
      h,
      LEVEL.lot,
      'Surface/farCorner',
    ),
  ];
  const surfaces = group('Base/Surfaces', roadSurface, ...lotSurfaces);
  surfaces.userData.dynamic = true;
  const base = group(
    'Base',
    buildMachiPlinth(materials),
    buildLots(materials),
    buildRoadPaint(materials),
    buildRoadFixtures(materials),
    surfaces,
  );
  return { group: base, roadSurface, lotSurfaces };
};
export { buildKonbiniBase };
