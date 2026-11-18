// node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js
import { BoxGeometry, Vector3 } from '../three.mjs';
var _tempNormal = new Vector3();
function getUv(faceDirVector, normal, uvAxis, projectionAxis, radius, sideLength) {
  const totArcLength = (2 * Math.PI * radius) / 4;
  const centerLength = Math.max(sideLength - 2 * radius, 0);
  const halfArc = Math.PI / 4;
  _tempNormal.copy(normal);
  _tempNormal[projectionAxis] = 0;
  _tempNormal.normalize();
  const arcUvRatio = (0.5 * totArcLength) / (totArcLength + centerLength);
  const arcAngleRatio = 1 - _tempNormal.angleTo(faceDirVector) / halfArc;
  if (Math.sign(_tempNormal[uvAxis]) === 1) {
    return arcAngleRatio * arcUvRatio;
  } else {
    const lenUv = centerLength / (totArcLength + centerLength);
    return lenUv + arcUvRatio + arcUvRatio * (1 - arcAngleRatio);
  }
}
var RoundedBoxGeometry = class _RoundedBoxGeometry extends BoxGeometry {
  /**
   * Constructs a new rounded box geometry.
   *
   * @param {number} [width=1] - The width. That is, the length of the edges parallel to the X axis.
   * @param {number} [height=1] - The height. That is, the length of the edges parallel to the Y axis.
   * @param {number} [depth=1] - The depth. That is, the length of the edges parallel to the Z axis.
   * @param {number} [segments=2] - Number of segments that form the rounded corners.
   * @param {number} [radius=0.1] - The radius of the rounded corners.
   */
  constructor(width = 1, height = 1, depth = 1, segments = 2, radius = 0.1) {
    const totalSegments = segments * 2 + 1;
    radius = Math.min(width / 2, height / 2, depth / 2, radius);
    super(1, 1, 1, totalSegments, totalSegments, totalSegments);
    this.type = 'RoundedBoxGeometry';
    this.parameters = {
      width,
      height,
      depth,
      segments,
      radius,
    };
    if (totalSegments === 1) return;
    // BoxGeometry already separates faces at their normal and UV seams. Its
    // original indices visit exactly the same triangles as toNonIndexed().
    const position = new Vector3();
    const normal = new Vector3();
    const box = new Vector3(width, height, depth).divideScalar(2).subScalar(radius);
    const positions = this.attributes.position.array;
    const normals = this.attributes.normal.array;
    const uvs = this.attributes.uv.array;
    const componentsPerFace = positions.length / 6;
    const faceDirVector = new Vector3();
    const halfSegmentSize = 0.5 / totalSegments;
    for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
      position.fromArray(positions, i);
      normal.copy(position);
      normal.x -= Math.sign(normal.x) * halfSegmentSize;
      normal.y -= Math.sign(normal.y) * halfSegmentSize;
      normal.z -= Math.sign(normal.z) * halfSegmentSize;
      normal.normalize();
      positions[i + 0] = box.x * Math.sign(position.x) + normal.x * radius;
      positions[i + 1] = box.y * Math.sign(position.y) + normal.y * radius;
      positions[i + 2] = box.z * Math.sign(position.z) + normal.z * radius;
      normals[i + 0] = normal.x;
      normals[i + 1] = normal.y;
      normals[i + 2] = normal.z;
      const side = Math.floor(i / componentsPerFace);
      switch (side) {
        case 0:
          faceDirVector.set(1, 0, 0);
          uvs[j + 0] = getUv(faceDirVector, normal, 'z', 'y', radius, depth);
          uvs[j + 1] = 1 - getUv(faceDirVector, normal, 'y', 'z', radius, height);
          break;
        case 1:
          faceDirVector.set(-1, 0, 0);
          uvs[j + 0] = 1 - getUv(faceDirVector, normal, 'z', 'y', radius, depth);
          uvs[j + 1] = 1 - getUv(faceDirVector, normal, 'y', 'z', radius, height);
          break;
        case 2:
          faceDirVector.set(0, 1, 0);
          uvs[j + 0] = 1 - getUv(faceDirVector, normal, 'x', 'z', radius, width);
          uvs[j + 1] = getUv(faceDirVector, normal, 'z', 'x', radius, depth);
          break;
        case 3:
          faceDirVector.set(0, -1, 0);
          uvs[j + 0] = 1 - getUv(faceDirVector, normal, 'x', 'z', radius, width);
          uvs[j + 1] = 1 - getUv(faceDirVector, normal, 'z', 'x', radius, depth);
          break;
        case 4:
          faceDirVector.set(0, 0, 1);
          uvs[j + 0] = 1 - getUv(faceDirVector, normal, 'x', 'y', radius, width);
          uvs[j + 1] = 1 - getUv(faceDirVector, normal, 'y', 'x', radius, height);
          break;
        case 5:
          faceDirVector.set(0, 0, -1);
          uvs[j + 0] = getUv(faceDirVector, normal, 'x', 'y', radius, width);
          uvs[j + 1] = 1 - getUv(faceDirVector, normal, 'y', 'x', radius, height);
          break;
      }
    }
  }
  /**
   * Factory method for creating an instance of this class from the given
   * JSON object.
   *
   * @param {Object} data - A JSON object representing the serialized geometry.
   * @returns {RoundedBoxGeometry} A new instance.
   */
  static fromJSON(data) {
    return new _RoundedBoxGeometry(data.width, data.height, data.depth, data.segments, data.radius);
  }
};
export { RoundedBoxGeometry };
