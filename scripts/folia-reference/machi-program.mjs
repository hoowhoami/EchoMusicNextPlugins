// Build-time use of Three's pinned shader expansion. No context or renderer is created.
import { WebGLPrograms } from 'three/src/renderers/webgl/WebGLPrograms.js';
import { WebGLProgram } from 'three/src/renderers/webgl/WebGLProgram.js';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib.js';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils.js';
import { LinearSRGBColorSpace, NoToneMapping, PCFShadowMap } from 'three';
export function expandMachiMaterial(material, object, lights, options = {}) {
  const source = [];
  const gl = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    createProgram: () => ({}),
    createShader: (type) => ({ type }),
    shaderSource: (shader, code) => {
      shader.code = code;
      source.push(shader);
    },
    compileShader() {},
    attachShader() {},
    linkProgram() {},
    bindAttribLocation() {},
    deleteShader() {},
    deleteProgram() {},
  };
  const renderer = {
    getContext: () => gl,
    getRenderTarget: () => ({ texture: { colorSpace: LinearSRGBColorSpace } }),
    outputColorSpace: LinearSRGBColorSpace,
    toneMapping: NoToneMapping,
    shadowMap: { enabled: !!options.shadows, type: PCFShadowMap },
    state: { buffers: { depth: { getReversed: () => false } } },
  };
  const capabilities = {
    precision: 'highp',
    logarithmicDepthBuffer: false,
    vertexTextures: true,
    getMaxPrecision: () => 'highp',
  };
  const bindingStates = { releaseStatesOfProgram() {} };
  const programs = WebGLPrograms(
    renderer,
    { get: () => null },
    { has: () => false },
    capabilities,
    bindingStates,
    { numPlanes: 0, numIntersection: 0 },
  );
  const parameters = programs.getParameters(
    material,
    lights,
    options.shadows ? [{}] : [],
    options.scene || {},
    object,
    [],
  );
  const uniforms = parameters.shaderID
    ? UniformsUtils.clone(ShaderLib[parameters.shaderID].uniforms)
    : UniformsUtils.clone(material.uniforms || {});
  parameters.uniforms = uniforms;
  material.onBeforeCompile(parameters, renderer);
  const program = new WebGLProgram(renderer, 'native-build', parameters, bindingStates);
  const result = {
    vertex: source.find((s) => s.type === gl.VERTEX_SHADER).code,
    fragment: source.find((s) => s.type === gl.FRAGMENT_SHADER).code,
    uniforms,
    parameters,
  };
  program.destroy();
  return result;
}
