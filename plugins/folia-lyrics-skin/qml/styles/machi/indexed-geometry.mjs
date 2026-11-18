// Preserve draw order and attribute seams while sharing vertices across triangles.
import { BufferAttribute } from './three.mjs';
function indexArray(vertices, count) {
  return vertices > 65535 ? new Uint32Array(count) : new Uint16Array(count);
}
export function indexTriangles(geometry) {
  if (geometry.index) return;
  const count = geometry.attributes.position.count,
    indices = indexArray(count, count);
  for (let i = 0; i < count; ++i) indices[i] = i;
  geometry.setIndex(new BufferAttribute(indices, 1));
}
export function mergeIndices(geometries) {
  const vertices = geometries.reduce((sum, g) => sum + g.attributes.position.count, 0);
  const count = geometries.reduce((sum, g) => sum + g.index.count, 0);
  const merged = indexArray(vertices, count);
  let offset = 0,
    cursor = 0;
  for (const geometry of geometries) {
    for (let i = 0; i < geometry.index.count; i++)
      merged[cursor++] = geometry.index.getX(i) + offset;
    offset += geometry.attributes.position.count;
  }
  return new BufferAttribute(merged, 1);
}
