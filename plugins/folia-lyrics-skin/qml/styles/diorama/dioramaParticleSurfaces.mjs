// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
const surfaceCache = /* @__PURE__ */ new Map(),
  TWO_PI = Math.PI * 2,
  BOX_HALF = 0.55,
  CYLINDER_RADIUS = 0.58,
  CYLINDER_HALF_HEIGHT = 0.75,
  TORUS_MAJOR = 0.68,
  TORUS_TUBE = 0.12,
  TETRA_VERTICES = [
    [0, 0.86, 0],
    [-0.81, -0.5, 0.47],
    [0.81, -0.5, 0.47],
    [0, -0.5, -0.94],
  ],
  TETRA_FACES = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 1],
    [1, 3, 2],
  ],
  TETRA_CENTER = [0, -0.16, 0],
  push = (out, p, n) => {
    (out.positions.push(p[0], p[1], p[2]), out.normals.push(n[0], n[1], n[2]));
  },
  unit = (x, y, z) => {
    const length = Math.hypot(x, y, z) || 1;
    return [x / length, y / length, z / length];
  },
  radialNormal = (p, center = [0, 0, 0]) =>
    unit(p[0] - center[0], p[1] - center[1], p[2] - center[2]),
  countBoxShell = (across, tall) =>
    2 * (across * tall + tall * across + across * across) - 4 * (across + tall + across) + 8,
  resolveBoxShell = (budget, stretchY) => {
    let best = [2, 2];
    for (let across = 2; across <= 96; across += 1) {
      const tall = Math.max(2, Math.round(1 + (across - 1) * stretchY));
      if (countBoxShell(across, tall) > budget) break;
      best = [across, tall];
    }
    return best;
  },
  buildBoxSurface = (budget, stretchY, out) => {
    const [across, tall] = resolveBoxShell(budget, stretchY),
      axis = (index, steps) => (index / (steps - 1) - 0.5) * 2 * BOX_HALF;
    out.spacing = (2 * BOX_HALF) / Math.max(1, Math.min(across, tall) - 1);
    for (let iy = 0; iy < tall; iy += 1)
      for (let iz = 0; iz < across; iz += 1)
        for (let ix = 0; ix < across; ix += 1) {
          if (ix > 0 && ix < across - 1 && iy > 0 && iy < tall - 1 && iz > 0 && iz < across - 1)
            continue;
          const p = [axis(ix, across), axis(iy, tall), axis(iz, across)];
          push(out, p, radialNormal(p));
        }
  },
  buildCylinderSurface = (budget, stretchY, out) => {
    const aspect =
        (TWO_PI * CYLINDER_RADIUS) / (2 * CYLINDER_HALF_HEIGHT * Math.max(0.2, stretchY)),
      rows = Math.max(2, Math.round(Math.sqrt(budget / Math.max(0.1, aspect)))),
      columns = Math.max(3, Math.floor(budget / rows));
    out.spacing = Math.max(
      (2 * CYLINDER_HALF_HEIGHT) / (rows - 1),
      (TWO_PI * CYLINDER_RADIUS) / columns
    );
    for (let row = 0; row < rows; row += 1) {
      const y = (row / (rows - 1) - 0.5) * 2 * CYLINDER_HALF_HEIGHT;
      for (let column = 0; column < columns; column += 1) {
        const angle = (column / columns) * TWO_PI,
          cosine = Math.cos(angle),
          sine = Math.sin(angle);
        push(out, [cosine * CYLINDER_RADIUS, y, sine * CYLINDER_RADIUS], [cosine, 0, sine]);
      }
    }
  },
  buildTetrahedronSurface = (budget, out) => {
    let steps = 1;
    for (; TETRA_FACES.length * (((steps + 2) * (steps + 3)) / 2) <= budget;) steps += 1;
    out.spacing =
      Math.hypot(
        TETRA_VERTICES[0][0] - TETRA_VERTICES[1][0],
        TETRA_VERTICES[0][1] - TETRA_VERTICES[1][1],
        TETRA_VERTICES[0][2] - TETRA_VERTICES[1][2]
      ) / steps;
    for (const [first, second, third] of TETRA_FACES) {
      const a = TETRA_VERTICES[first],
        b = TETRA_VERTICES[second],
        c = TETRA_VERTICES[third];
      for (let i = 0; i <= steps; i += 1)
        for (let j = 0; j <= steps - i; j += 1) {
          const wa = i / steps,
            wb = j / steps,
            wc = 1 - wa - wb,
            p = [0, 1, 2].map((axis) => a[axis] * wa + b[axis] * wb + c[axis] * wc);
          push(out, p, radialNormal(p, TETRA_CENTER));
        }
    }
  },
  buildTorusSurface = (budget, out) => {
    const minor = Math.max(4, Math.round(Math.sqrt(budget / 4))),
      major = Math.max(6, Math.floor(budget / minor));
    out.spacing = Math.max(
      (TWO_PI * (TORUS_MAJOR + TORUS_TUBE)) / major,
      (TWO_PI * TORUS_TUBE) / minor
    );
    for (let i = 0; i < major; i += 1) {
      const majorAngle = (i / major) * TWO_PI,
        majorCosine = Math.cos(majorAngle),
        majorSine = Math.sin(majorAngle);
      for (let j = 0; j < minor; j += 1) {
        const minorAngle = (j / minor) * TWO_PI,
          minorCosine = Math.cos(minorAngle),
          minorSine = Math.sin(minorAngle),
          radius = TORUS_MAJOR + TORUS_TUBE * minorCosine;
        push(
          out,
          [radius * majorCosine, TORUS_TUBE * minorSine, radius * majorSine],
          [minorCosine * majorCosine, minorSine, minorCosine * majorSine]
        );
      }
    }
  },
  buildDioramaStructuredSurface = (kind, budget, stretchY = 1) => {
    const stretchKey = Math.round(Math.max(0.2, stretchY) * 4) / 4,
      cacheKey = `${kind}:${budget}:${stretchKey}`,
      cached = surfaceCache.get(cacheKey);
    if (cached) return cached;
    const out = { positions: [], normals: [], spacing: 0 };
    kind === 'box'
      ? buildBoxSurface(budget, stretchKey, out)
      : kind === 'sphere'
        ? buildCylinderSurface(budget, stretchKey, out)
        : kind === 'cone'
          ? buildTetrahedronSurface(budget, out)
          : buildTorusSurface(budget, out);
    const positions = Float32Array.from(out.positions),
      normals = Float32Array.from(out.normals),
      count = positions.length / 3;
    let total = 0;
    for (let index = 0; index < count; index += 1)
      total += Math.hypot(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]);
    const radius = count > 0 ? total / count : 1,
      surface = {
        positions,
        normals,
        radius,
        count,
        spacing: out.spacing / radius,
      };
    return (surfaceCache.set(cacheKey, surface), surface);
  };
function clearDioramaSurfaceCache() {
  surfaceCache.clear();
}
export { buildDioramaStructuredSurface, clearDioramaSurfaceCache };
