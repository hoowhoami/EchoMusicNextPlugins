// Data adapter for original scene/post scheduling. It never creates a WebGL context.
import {
  Color,
  Frustum,
  Matrix4,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  DepthTexture,
  MeshDepthMaterial,
  BasicDepthPacking,
  BackSide,
  DoubleSide,
} from './three.mjs';
import { WebGLLights } from './three-lights.mjs';
import { createInputSurface } from './input-surface.mjs';
let dimensions = { width: 640, height: 480, pixelRatio: 1 };
export function configureRendererEnvironment(value) {
  dimensions = Object.assign({}, dimensions, value);
}
function cloneUniform(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value.isTexture) return value;
  if (
    value.isColor ||
    value.isVector2 ||
    value.isVector3 ||
    value.isVector4 ||
    value.isMatrix3 ||
    value.isMatrix4
  )
    return value.clone();
  if (Array.isArray(value)) return value.map(cloneUniform);
  if (ArrayBuffer.isView(value)) return value.slice();
  const result = {};
  for (const key of Object.keys(value)) result[key] = cloneUniform(value[key]);
  return result;
}
export class NativeRenderer {
  constructor() {
    this.width = dimensions.width;
    this.height = dimensions.height;
    this.pixelRatio = dimensions.pixelRatio;
    this.target = null;
    this.color = new Color(0);
    this.alpha = 0;
    this.commands = [];
    this.frustumCulling = true;
    this.frustum = new Frustum();
    this.projectionView = new Matrix4();
    this.nativeLights = WebGLLights({ has: () => false });
    this.shadowMaterials = new Map();
    this.domElement = createInputSurface(this.width, this.height, this.pixelRatio);
    this.shadowMap = { enabled: true, type: 0, autoUpdate: false, needsUpdate: true };
    this.debug = { checkShaderErrors: false };
    this.capabilities = { maxSamples: 4, getMaxAnisotropy: () => 1 };
    this.state = { buffers: { depth: { getReversed: () => false } } };
    this.info = {
      autoReset: false,
      programs: [],
      render: { calls: 0, triangles: 0 },
      reset: () => {
        this.info.render.calls = 0;
        this.info.render.triangles = 0;
      },
    };
    this.autoClear = true;
    this.autoClearColor = true;
    this.autoClearDepth = true;
    this.autoClearStencil = false;
    this.outputColorSpace = 'srgb';
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
  }
  setPixelRatio(value) {
    this.pixelRatio = value;
    this.setSize(this.width, this.height);
  }
  getPixelRatio() {
    return this.pixelRatio;
  }
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.domElement.clientWidth = width;
    this.domElement.clientHeight = height;
    this.domElement.width = Math.floor(width * this.pixelRatio);
    this.domElement.height = Math.floor(height * this.pixelRatio);
  }
  getSize(out) {
    return out.set(this.width, this.height);
  }
  getDrawingBufferSize(out) {
    return out.set(this.domElement.width, this.domElement.height);
  }
  setRenderTarget(value) {
    this.target = value;
  }
  getRenderTarget() {
    return this.target;
  }
  setClearColor(color, alpha = this.alpha) {
    this.color.set(color);
    this.alpha = alpha;
  }
  getClearColor(out) {
    return out.copy(this.color);
  }
  getClearAlpha() {
    return this.alpha;
  }
  setClearAlpha(value) {
    this.alpha = value;
  }
  clear(color = true, depth = true) {
    this.commands.push({
      type: 'clear',
      target: this.target,
      color: this.color.clone(),
      alpha: this.alpha,
      clearColor: color,
      depth,
    });
  }
  clearDepth() {
    this.clear(false, true);
  }
  getContext() {
    return {
      MAX_SAMPLES: 36183,
      getParameter: () => 4,
      getExtension: () => null,
      getContextAttributes: () => ({ alpha: true }),
    };
  }
  compile() {
    return null;
  }
  compileAsync() {
    return Promise.resolve();
  }
  render(scene, camera) {
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(
      this.projectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    const meshes = [],
      lights = [];
    scene.traverseVisible((object) => {
      if (!object.layers.test(camera.layers)) return;
      if (object.isLight) {
        lights.push(object);
        return;
      }
      if (!object.isMesh && !object.isLine && !object.isPoints) return;
      if (this.frustumCulling && object.frustumCulled && !this.frustum.intersectsObject(object))
        return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || !material.visible) continue;
        meshes.push({
          object,
          geometry: object.geometry,
          material,
          matrix: object.matrixWorld.clone(),
          uniforms: cloneUniform(material.uniforms || {}),
        });
        ++this.info.render.calls;
      }
    });
    // Match Three's opaque/transparent ordering before forming consecutive batches.
    for (const mesh of meshes)
      mesh.depth = new Vector3()
        .setFromMatrixPosition(mesh.matrix)
        .applyMatrix4(camera.matrixWorldInverse).z;
    meshes.sort(
      (a, b) =>
        Number(!!a.material.transparent) - Number(!!b.material.transparent) ||
        a.object.renderOrder - b.object.renderOrder ||
        (a.material.transparent
          ? a.depth - b.depth
          : a.material.id - b.material.id || b.depth - a.depth) ||
        a.object.id - b.object.id,
    );
    // Three's original shadow cameras/matrices and lighting state, with public native targets.
    for (const light of lights) {
      if (!light.castShadow || !this.shadowMap.enabled) continue;
      const shadow = light.shadow;
      if (!shadow.map) {
        shadow.map = new WebGLRenderTarget(shadow.mapSize.x, shadow.mapSize.y, {
          depthTexture: new DepthTexture(shadow.mapSize.x, shadow.mapSize.y),
        });
        shadow.map.texture.name = 'machi:shadow';
        shadow.map.depthTexture.name = 'machi:shadow-depth';
        shadow.needsUpdate = true;
      }
      if (shadow.needsUpdate || this.shadowMap.needsUpdate || this.shadowMap.autoUpdate) {
        shadow.updateMatrices(light);
        const shadowMeshes = [];
        scene.traverseVisible((object) => {
          if (!object.isMesh || !object.castShadow || !object.layers.test(camera.layers)) return;
          if (
            this.frustumCulling &&
            object.frustumCulled &&
            !shadow.getFrustum().intersectsObject(object)
          )
            return;
          for (const source of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            if (!source || !source.visible) continue;
            const side =
              source.shadowSide === null
                ? source.side === DoubleSide
                  ? DoubleSide
                  : BackSide
                : source.shadowSide;
            if (!this.shadowMaterials.has(side))
              this.shadowMaterials.set(
                side,
                new MeshDepthMaterial({ depthPacking: BasicDepthPacking, side }),
              );
            shadowMeshes.push({
              object,
              geometry: object.geometry,
              material: this.shadowMaterials.get(side),
              matrix: object.matrixWorld.clone(),
              uniforms: {},
            });
          }
        });
        this.commands.push({
          type: 'render',
          target: shadow.map,
          depthOnly: true,
          meshes: shadowMeshes,
          lights: [],
          lightState: {},
          camera: {
            projectionMatrix: shadow.camera.projectionMatrix.clone(),
            matrixWorld: shadow.camera.matrixWorld.clone(),
            matrixWorldInverse: shadow.camera.matrixWorldInverse.clone(),
            near: shadow.camera.near,
            far: shadow.camera.far,
            isOrthographicCamera: shadow.camera.isOrthographicCamera,
          },
          clear: true,
        });
        shadow.needsUpdate = false;
      }
    }
    this.shadowMap.needsUpdate = false;
    this.nativeLights.setup(lights);
    this.nativeLights.setupView(lights, camera);
    this.commands.push({
      type: 'render',
      target: this.target,
      meshes,
      lights,
      lightState: cloneUniform(this.nativeLights.state),
      camera: {
        projectionMatrix: camera.projectionMatrix.clone(),
        matrixWorld: camera.matrixWorld.clone(),
        matrixWorldInverse: camera.matrixWorldInverse.clone(),
        near: camera.near,
        far: camera.far,
        isOrthographicCamera: camera.isOrthographicCamera,
      },
      fog: scene.fog,
      toneMappingExposure: this.toneMappingExposure,
      background: scene.background,
      clear: this.autoClear,
    });
  }
  drain() {
    const result = this.commands;
    this.commands = [];
    return result;
  }
  forceContextLoss() {
    this.commands = [];
  }
  dispose() {
    this.commands = [];
  }
}
