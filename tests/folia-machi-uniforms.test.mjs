import assert from 'node:assert/strict';
import test from 'node:test';
import {
  packUniform,
  createUniformPacket,
} from '../plugins/folia-lyrics-skin/qml/styles/machi/uniform-packet.mjs';
test('native uniform packets preserve matrix, struct, array, integer and frame padding byte for byte', () => {
  assert.equal(new Uint8Array(new Uint32Array([0x04030201]).buffer)[0], 1);
  const bytes = new Uint8Array(512).fill(0xa5),
    expected = bytes.slice();
  const data = createUniformPacket(bytes.buffer, 32, 400),
    reference = new DataView(expected.buffer, 32, 400);
  const field = (name, type, offset, channels = 1, extra = {}) => ({
    name,
    type,
    offset,
    channels,
    count: 1,
    stride: 16,
    ...extra,
  });
  const meta = {
    uniforms: [
      field('matrix', 'mat3', 16, 9, { columns: 3 }),
      field('vectors', 'vec3', 80, 3, { count: 2, array: true }),
      field('lights', 'struct', 128, 1, {
        count: 2,
        array: true,
        stride: 32,
        members: [field('position', 'vec3', 0, 3), field('flag', 'uint', 16)],
      }),
      field('flag', 'bool', 208),
      field('default', 'uint', 224),
    ],
    defaults: { default: 0xffffffff },
  };
  const values = {
    matrix: [1.25, 2, 3, 4, 5, 6, 7, 8, 9],
    vectors: [
      [0.5, 0.25, 0.125],
      [-1, -2, -3],
    ],
    lights: [
      { position: [10, 11, 12], flag: 3 },
      { position: [20, 21, 22], flag: 4 },
    ],
    flag: true,
  };
  const floats = [
    [32, 1.25],
    [36, 2],
    [40, 3],
    [48, 4],
    [52, 5],
    [56, 6],
    [64, 7],
    [68, 8],
    [72, 9],
    [96, 0.5],
    [100, 0.25],
    [104, 0.125],
    [112, -1],
    [116, -2],
    [120, -3],
    [144, 10],
    [148, 11],
    [152, 12],
    [176, 20],
    [180, 21],
    [184, 22],
  ];
  for (const [offset, value] of floats) reference.setFloat32(offset, value, true);
  for (const [offset, value] of [
    [160, 3],
    [192, 4],
    [224, 1],
    [240, -1],
  ])
    reference.setInt32(offset, value, true);
  packUniform(data, 16, meta, values);
  assert.deepEqual(bytes, expected);
  values.flag = false;
  reference.setInt32(224, 0, true);
  packUniform(data, 16, meta, values);
  assert.deepEqual(bytes, expected);
  values.matrix[0] = Infinity;
  assert.throws(() => packUniform(data, 16, meta, values), /nonfinite uniform/);
});
