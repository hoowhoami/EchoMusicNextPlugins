// Native frame/object packets already use little-endian Float32 storage.
// Keep the reflected std140 layout, including matrix/struct padding, unchanged.
export function createUniformPacket(
  buffer,
  byteOffset = 0,
  byteLength = buffer.byteLength - byteOffset,
) {
  return {
    buffer,
    floats: new Float32Array(buffer, byteOffset, byteLength / 4),
    integers: new Int32Array(buffer, byteOffset, byteLength / 4),
  };
}
export function packUniform(views, base, meta, values) {
  function write(shape, value, offset) {
    if (shape.members) {
      for (const field of shape.members) {
        const v = value && value[field.name];
        for (let i = 0; i < field.count; ++i)
          write(field, field.array ? (v || [])[i] : v, offset + field.offset + i * field.stride);
      }
      return;
    }
    const v = Array.isArray(value) ? value : [value || 0];
    const destination = /^(?:bool|int|ivec|bvec|uint|uvec)/.test(shape.type)
      ? views.integers
      : views.floats;
    for (let c = 0; c < (shape.channels || 1); ++c) {
      const off =
        offset +
        (shape.columns ? Math.floor(c / shape.columns) * 16 + (c % shape.columns) * 4 : c * 4);
      const n = Number(v[c] || 0);
      if (!Number.isFinite(n))
        throw Error(
          'Machi nonfinite uniform ' +
            shape.name +
            '[' +
            c +
            '] ' +
            JSON.stringify(v).slice(0, 160),
        );
      destination[off / 4] = n;
    }
  }
  for (const u of meta.uniforms) {
    const v = values[u.name] === undefined ? meta.defaults[u.name] : values[u.name];
    for (let i = 0; i < u.count; ++i)
      write(u, u.array ? (v || [])[i] : v, base + u.offset + i * u.stride);
  }
}
