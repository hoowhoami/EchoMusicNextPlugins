// Data-only resource adapter for the unchanged source light-field update/Float32 packing.
import { createLightField } from './source/light/lightFieldShader.mjs';
class Geometry {
  constructor(value) {
    this.attributes = value.attributes;
  }
  destroy() {}
}
class UniformGroup {
  constructor(value) {
    this.uniforms = {};
    for (const key of Object.keys(value)) this.uniforms[key] = value[key].value;
  }
  update() {}
}
class Shader {
  constructor(value) {
    this.resources = value.resources;
    this.glProgram = value.glProgram;
  }
  destroy() {}
}
class Mesh {
  constructor(value) {
    this.geometry = value.geometry;
    this.shader = value.shader;
  }
  destroy() {}
}
const backend = { Geometry, UniformGroup, Shader, Mesh, GlProgram: { from: (value) => value } };
export function createNativeLightField(width, height, margin = 0) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error('Invalid Lumiere viewport');
  const field = createLightField(backend, width, height, margin);
  let disposed = false;
  return {
    update(frame) {
      if (disposed) throw new Error('Lumiere light field is disposed');
      field.update(frame);
      const result = {};
      const uniforms = field.view.shader.resources.lightUniforms.uniforms;
      for (const key of Object.keys(uniforms)) result[key] = Array.from(uniforms[key]);
      return result;
    },
    destroy() {
      if (!disposed) {
        disposed = true;
        field.destroy();
      }
    },
  };
}
