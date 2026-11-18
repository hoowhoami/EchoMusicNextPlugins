// Bounded data encoding for the original scene. Geometry is sent once; poses stay small.
import {
  Matrix3,
  Matrix4,
  Vector3,
  Color,
  RedFormat,
  RGBFormat,
  RGBAFormat,
  FloatType,
  HalfFloatType,
  AdditiveBlending,
  DoubleSide,
  BackSide,
} from './three.mjs';
import { shaderKey, hashSource } from './shader-key.mjs';
import { programs } from './shaders/registry.mjs';
import { packBytes } from '../../shared/binary.mjs';
import { createFrameUniformReader } from './material-uniforms.mjs';
const values = (v) =>
  v && typeof v === 'object'
    ? v.isTexture
      ? { texture: v.uuid }
      : v.toArray
        ? v.toArray()
        : Array.isArray(v) || ArrayBuffer.isView(v)
          ? Array.from(v, values)
          : Object.keys(v).reduce((o, k) => ((o[k] = values(v[k])), o), {})
    : v;
const packed = (v) =>
  packBytes(
    v.byteOffset === 0 && v.byteLength === v.buffer.byteLength
      ? v.buffer
      : v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength),
  );
const sampling = (t) => ({
  minFilter: t.minFilter,
  magFilter: t.magFilter,
  wrapS: t.wrapS,
  wrapT: t.wrapT,
});
export function createMachiFrameEncoder() {
  const geometryCache = new Map(),
    textures = new Map(),
    textureOwners = new Map(),
    retiredTextures = new Set(),
    targets = new Map();
  let serial = 0,
    wantedTargets = new Set(),
    arena = null;
  const arenaSources = new Map();
  function target(value, depthOnly, events) {
    if (!value) return 'surface';
    const id = value.texture.uuid;
    wantedTargets.add(id);
    const entry = {
      id,
      width: value.width,
      height: value.height,
      format: value.texture.type === HalfFloatType ? 'rgba16f' : 'rgba8',
      samples: value.samples || 1,
      depth: !!value.depthBuffer,
      depthOnly: !!depthOnly,
      mipmaps: !!value.texture.generateMipmaps,
      depthId: value.depthTexture ? value.depthTexture.uuid : null,
      sampling: sampling(value.texture),
      depthSampling: value.depthTexture ? sampling(value.depthTexture) : null,
    };
    const previous = targets.get(id);
    if (!previous || JSON.stringify(previous) !== JSON.stringify(entry)) {
      targets.set(id, entry);
      events.push({ kind: 'target', ...entry });
    }
    return id;
  }
  function texture(value, events) {
    if (!value || !value.isTexture) return null;
    const id = value.uuid,
      previous = textures.get(id);
    // Dry scenes still bind their reflection target with zero contribution.
    // Register its real owner even when no render command touches it this frame.
    if (value.renderTarget)
      target(value.renderTarget, value.renderTarget.texture.name === 'machi:shadow', events);
    if (targets.has(id) || [...targets.values()].some((t) => t.depthId === id)) return id;
    if (!textureOwners.has(id)) {
      const retire = () => {
        value.removeEventListener('dispose', retire);
        textureOwners.delete(id);
        textures.delete(id);
        retiredTextures.add(id);
      };
      textureOwners.set(id, { value, retire });
      value.addEventListener('dispose', retire);
    }
    if (previous?.version === value.version) return id;
    const image = value.image;
    if (!image) throw Error('Machi texture has no source: ' + value.name);
    const event = {
      kind: 'texture',
      id,
      width: image.width,
      height: image.height,
      version: value.version,
      flipY: !!value.flipY,
      srgb: value.colorSpace === 'srgb',
      mipmaps: !!value.generateMipmaps,
      wrapS: value.wrapS,
      wrapT: value.wrapT,
      minFilter: value.minFilter,
      magFilter: value.magFilter,
    };
    let canvasKey;
    if (image.commands) {
      // The source sky fully repaints an opaque gradient; retain its current fill only.
      if (image.width === 4 && image.height === 256 && image.commands.length)
        image.commands = image.commands.slice(-1);
      event.kind = image.width === 4 && image.height === 256 ? 'gradient' : 'canvas';
      // Exact font discovery can repaint the static signs while resolving a
      // new lyric. Keep the uploaded atlas when its complete draw list and
      // texture parameters are unchanged.
      canvasKey = JSON.stringify({ ...event, version: 0, commands: image.commands });
      if (previous?.canvasKey === canvasKey) {
        previous.version = value.version;
        return id;
      }
      event.commands = JSON.parse(canvasKey).commands;
    } else {
      const data = image.data || image.pixels;
      if (!data)
        throw Error(
          'Machi source image pixels are missing: ' +
            JSON.stringify({
              name: value.name,
              id,
              depth: !!value.isDepthTexture,
              target: !!value.isRenderTargetTexture,
              width: image.width,
              height: image.height,
              src: String(image.src || '').slice(0, 80),
            }),
        );
      const components = value.format === RedFormat ? 1 : value.format === RGBFormat ? 3 : 4;
      const result =
        value.type === FloatType
          ? new Float32Array(image.width * image.height * 4)
          : value.type === HalfFloatType
            ? new Uint16Array(image.width * image.height * 4)
            : new Uint8Array(image.width * image.height * 4);
      const one = value.type === HalfFloatType ? 0x3c00 : value.type === FloatType ? 1 : 255;
      for (let i = 0; i < image.width * image.height; ++i) {
        for (let c = 0; c < Math.min(components, 4); ++c)
          result[i * 4 + c] = data[i * components + c];
        if (components < 4) result[i * 4 + 3] = one;
      }
      event.format =
        value.type === FloatType ? 'rgba32f' : value.type === HalfFloatType ? 'rgba16f' : 'rgba8';
      event.data = packed(result);
    }
    textures.set(id, { version: value.version, canvasKey });
    events.push(event);
    return id;
  }
  function encode(commands) {
    const readMaterialUniforms = createFrameUniformReader(),
      geometryLayouts = new Map();
    const model = new Matrix4(),
      instance = new Matrix4(),
      modelView = new Matrix4(),
      normal = new Matrix3(),
      color = new Color(),
      instanceColor = new Color();
    const events = [...retiredTextures].map((id) => ({ kind: 'retire-texture', id })),
      passes = [],
      aliveGeometry = new Set();
    retiredTextures.clear();
    wantedTargets = new Set();
    // One immutable geometry arena is shared by main, reflection and shadow passes.
    let newGeometry = false;
    for (const command of commands)
      for (const mesh of command.meshes || [])
        if (!mesh.material.isShaderMaterial && !arenaSources.has(mesh.geometry.id)) {
          arenaSources.set(mesh.geometry.id, mesh.geometry);
          newGeometry = true;
        }
    if (
      commands.some((c) =>
        (c.meshes || []).some((m) => !m.material.isShaderMaterial && m.material.vertexColors),
      )
    )
      throw Error('Machi source vertex-color layout changed');
    if (newGeometry) {
      arena = makeArena([...arenaSources.values()]);
      const { ranges, ...upload } = arena;
      events.push({ kind: 'geometry', ...upload });
      arena = { id: arena.id, ranges, topology: arena.topology };
    }
    // Target definitions precede uniforms which sample them.
    for (const command of commands) target(command.target, command.depthOnly, events);
    for (const command of commands) {
      const id = target(command.target, command.depthOnly, events);
      if (command.type === 'clear') {
        passes.push({
          kind: 'clear',
          target: id,
          color: [...command.color.toArray(), command.alpha],
          depth: command.depth,
          clearColor: command.clearColor,
        });
        continue;
      }
      const lights = command.lightState || {};
      const groups = [],
        opaque = new Map(),
        programKeys = new Map();
      for (const mesh of command.meshes) {
        const m = mesh.material,
          g = mesh.geometry,
          drawData = !m.isShaderMaterial;
        const shadows = !command.depthOnly && command.lights.some((l) => l.castShadow);
        let layout = geometryLayouts.get(g);
        if (!layout) {
          layout = Object.keys(g.attributes).sort().join(',');
          geometryLayouts.set(g, layout);
        }
        const programIdentity = m.id + ':' + layout;
        let key = programKeys.get(programIdentity);
        if (key === undefined) {
          key = shaderKey(m, g, lights, command.fog, shadows);
          programKeys.set(programIdentity, key);
        }
        const meta = programs[key];
        if (!meta) throw Error('Machi native material variant missing: ' + key + ' ' + m.name);
        const custom = readMaterialUniforms(m, mesh.uniforms),
          maps = {};
        for (const name of Object.keys(custom))
          if (custom[name] && custom[name].isTexture) maps[name] = texture(custom[name], events);
        for (const name of ['map', 'alphaMap', 'gradientMap'])
          if (m[name]) maps[name] = texture(m[name], events);
        const variant =
          key +
          ':' +
          JSON.stringify(maps) +
          ':' +
          m.side +
          ':' +
          !!m.transparent +
          ':' +
          (custom.uPuddleBias || 0);
        let group =
          drawData && !m.transparent
            ? opaque.get(variant)
            : drawData && groups.length && groups[groups.length - 1].variant === variant
              ? groups[groups.length - 1]
              : null;
        if (!group) {
          group = { key, meta, variant, meshes: [], material: m, custom, maps };
          groups.push(group);
          if (drawData && !m.transparent) opaque.set(variant, group);
        }
        group.meshes.push(mesh);
      }
      // Opaque draws use depth; transparent/source ShaderMaterial draws retain painter order.
      groups.sort((a, b) => Number(!!a.material.transparent) - Number(!!b.material.transparent));
      let clear = command.clear;
      for (const group of groups) {
        const m = group.material,
          meta = group.meta;
        const u = Object.assign({}, group.custom, {
          projectionMatrix: command.camera.projectionMatrix,
          viewMatrix: command.camera.matrixWorldInverse,
          cameraPosition: new Vector3().setFromMatrixPosition(command.camera.matrixWorld),
          isOrthographic: !!command.camera.isOrthographicCamera,
          toneMappingExposure: command.toneMappingExposure,
          diffuse: m.color || new Color(1, 1, 1),
          opacity: m.opacity,
          emissive: m.emissive
            ? m.emissive.clone().multiplyScalar(m.emissiveIntensity)
            : new Color(0, 0, 0),
          alphaTest: m.alphaTest || 0,
          ambientLightColor: lights.ambient || [0, 0, 0],
          lightProbe: lights.probe || [],
          directionalLights: lights.directional || [],
          pointLights: lights.point || [],
          spotLights: lights.spot || [],
          hemisphereLights: lights.hemi || [],
          rectAreaLights: lights.rectArea || [],
          directionalLightShadows: lights.directionalShadow || [],
          directionalShadowMap: lights.directionalShadowMap || [],
          directionalShadowMatrix: lights.directionalShadowMatrix || [],
          spotLightShadows: lights.spotShadow || [],
          spotShadowMap: lights.spotShadowMap || [],
          spotLightMatrix: lights.spotLightMatrix || [],
        });
        if (command.fog) {
          u.fogColor = command.fog.color;
          u.fogDensity = command.fog.density;
          u.fogNear = command.fog.near;
          u.fogFar = command.fog.far;
        }
        for (const name of ['map', 'alphaMap', 'gradientMap'])
          if (m[name]) {
            m[name].updateMatrix();
            u[name + 'Transform'] = m[name].matrix;
            u[name] = m[name];
          }
        let geometry,
          draws = null,
          objectCount = 0;
        if (meta.drawData) {
          geometry = arena;
          draws = [];
          for (const mesh of group.meshes) {
            const shape = arena.ranges[mesh.geometry.id],
              instances = mesh.object.isInstancedMesh ? mesh.object.count : 1;
            draws.push({ first: shape.first, count: shape.count, instances, row: objectCount });
            objectCount += instances;
          }
        } else {
          const mesh = group.meshes[0],
            geometryKey =
              String(mesh.geometry.id) + (mesh.object.isInstancedMesh ? ':' + mesh.object.id : '');
          geometry = geometryCache.get(geometryKey);
          if (!geometry) {
            geometry = makeGeometry(group);
            geometry.id = 'geometry-' + ++serial;
            events.push({ kind: 'geometry', ...geometry });
            geometry = { id: geometry.id, topology: geometry.topology };
            geometryCache.set(geometryKey, geometry);
          }
          aliveGeometry.add(geometryKey);
        }
        const objects = meta.drawData ? new Float32Array(objectCount * 64) : null;
        let offset = 0;
        for (const mesh of group.meshes) {
          const count = meta.drawData && mesh.object.isInstancedMesh ? mesh.object.count : 1;
          for (let i = 0; i < count; ++i) {
            model.copy(mesh.matrix);
            if (mesh.object.isInstancedMesh && meta.drawData) {
              mesh.object.getMatrixAt(i, instance);
              model.multiply(instance);
            }
            modelView.multiplyMatrices(command.camera.matrixWorldInverse, model);
            normal.getNormalMatrix(modelView);
            if (!meta.drawData) {
              u.modelMatrix = model;
              u.modelViewMatrix = modelView;
              u.normalMatrix = normal;
              break;
            }
            if (m.color) color.copy(m.color);
            else color.setRGB(1, 1, 1);
            if (mesh.object.instanceColor) {
              mesh.object.getColorAt(i, instanceColor);
              color.multiply(instanceColor);
            }
            objects.set(model.elements, offset);
            objects.set(modelView.elements, offset + 16);
            for (let c = 0; c < 3; ++c)
              for (let r = 0; r < 3; ++r)
                objects[offset + 32 + c * 4 + r] = normal.elements[c * 3 + r];
            color.toArray(objects, offset + 44);
            objects[offset + 47] = m.opacity;
            if (m.emissive)
              color
                .copy(m.emissive)
                .multiplyScalar(m.emissiveIntensity)
                .toArray(objects, offset + 48);
            if (group.custom.uMachiGloss) group.custom.uMachiGloss.toArray(objects, offset + 52);
            objects[offset + 56] = mesh.object.receiveShadow ? 1 : 0;
            offset += 64;
          }
        }
        // Only reflected uniform fields are consumed by this pipeline. Samplers
        // are bound independently, including the source-name aliases below.
        const uniforms = {},
          maps = { ...group.maps };
        for (const field of meta.uniforms)
          if (u[field.name] !== undefined) uniforms[field.name] = values(u[field.name]);
        for (const sampler of meta.samplers) {
          const name = sampler.sourceName || sampler.name;
          let v = u[name];
          if (sampler.index !== undefined) v = v && v[sampler.index];
          if (v && v.isTexture) maps[sampler.name] = texture(v, events);
        }
        passes.push({
          kind: 'draw',
          target: id,
          depthOnly: !!command.depthOnly,
          clear: !!clear,
          background: clear && command.background ? texture(command.background, events) : null,
          key: group.key,
          geometry: geometry.id,
          draws,
          objects: objects ? packed(objects) : null,
          objectCount,
          uniforms,
          maps,
          topology: geometry.topology,
          blend: m.transparent ? (m.blending === AdditiveBlending ? 'add' : 'alpha') : 'none',
          cull: m.side === DoubleSide ? 'none' : m.side === BackSide ? 'front' : 'back',
          depthTest: !!m.depthTest,
          depthWrite: !!m.depthWrite,
        });
        clear = false;
      }
    }
    // Frustum culling changes visibility, not ownership. Original scene textures
    // remain reusable until their Texture.dispose notification or this job ends.
    for (const [id, entry] of targets)
      if (!wantedTargets.has(id)) {
        events.push({ kind: 'retire-target', id, depthId: entry.depthId });
        targets.delete(id);
      }
    for (const [key, entry] of geometryCache)
      if (!aliveGeometry.has(key)) {
        events.push({ kind: 'retire-geometry', id: entry.id });
        geometryCache.delete(key);
      }
    return { events, passes };
  }
  function makeGeometry(group) {
    const meta = group.meta;
    if (!meta.drawData) {
      const mesh = group.meshes[0],
        g = mesh.geometry,
        streams = [];
      for (const name of Object.keys(g.attributes)) {
        const a = g.attributes[name],
          data = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; ++i)
          for (let c = 0; c < a.itemSize; ++c) data[i * a.itemSize + c] = a.getComponent(i, c);
        streams.push({
          name,
          size: a.itemSize,
          count: a.count,
          instance: !!a.isInstancedBufferAttribute,
          stepRate: a.meshPerAttribute || 1,
          data: packed(data),
        });
      }
      // WebGL supplies constant values for absent attributes. QSB retains
      // declared inputs even when unused, so provide the same values explicitly.
      for (const name of ['normal', 'uv', 'color']) {
        if (g.attributes[name]) continue;
        const size = name === 'uv' ? 2 : 3,
          count = g.attributes.position.count;
        const data = new Float32Array(count * size);
        if (name === 'color') data.fill(1);
        streams.push({ name, size, count, instance: false, stepRate: 1, data: packed(data) });
      }
      if (mesh.object.isInstancedMesh)
        streams.push({
          name: 'instanceMatrix',
          size: 16,
          count: mesh.object.count,
          instance: true,
          stepRate: 1,
          data: packed(mesh.object.instanceMatrix.array),
        });
      return {
        streams,
        index: g.index ? packed(new Uint32Array(g.index.array)) : null,
        count: g.index ? g.index.count : g.attributes.position.count,
        instances: mesh.object.isInstancedMesh
          ? mesh.object.count
          : g.isInstancedBufferGeometry
            ? Math.min(g.instanceCount, ...streams.filter((s) => s.instance).map((s) => s.count))
            : 1,
        topology: mesh.object.isLineSegments
          ? 'lines'
          : mesh.object.isLine
            ? 'line-strip'
            : mesh.object.isPoints
              ? 'points'
              : 'triangles',
      };
    }
    throw Error('Standard Machi geometry must use the shared arena');
  }
  function makeArena(sources) {
    let vertexCount = 0,
      indexCount = 0;
    for (const g of sources) {
      vertexCount += g.attributes.position.count;
      indexCount += Math.min(
        g.index ? g.index.count : g.attributes.position.count,
        g.drawRange.count,
      );
    }
    const vertices = new Float32Array(vertexCount * 8),
      indices = new Uint32Array(indexCount),
      ranges = {};
    let vOffset = 0,
      iOffset = 0;
    for (const g of sources) {
      const p = g.attributes.position,
        n = g.attributes.normal,
        uv = g.attributes.uv,
        c = g.attributes.color;
      for (let i = 0; i < p.count; ++i) {
        const at = (vOffset + i) * 8;
        vertices[at] = p.getX(i);
        vertices[at + 1] = p.getY(i);
        vertices[at + 2] = p.getZ(i);
        vertices[at + 3] = n ? n.getX(i) : 0;
        vertices[at + 4] = n ? n.getY(i) : 0;
        vertices[at + 5] = n ? n.getZ(i) : 1;
        vertices[at + 6] = uv ? uv.getX(i) : 0;
        vertices[at + 7] = uv ? uv.getY(i) : 0;
      }
      const first = iOffset,
        available = g.index ? g.index.count : p.count,
        end = Math.min(available, g.drawRange.start + g.drawRange.count);
      for (let i = g.drawRange.start; i < end; ++i)
        indices[iOffset++] = vOffset + (g.index ? g.index.getX(i) : i);
      ranges[g.id] = { first, count: iOffset - first };
      vOffset += p.count;
    }
    if (vertices.byteLength > 16 * 1024 * 1024 || indices.byteLength > 16 * 1024 * 1024)
      throw Error('Machi geometry arena exceeds native buffer budget');
    return {
      id: 'arena',
      arena: true,
      vertex: packed(vertices),
      index: packed(indices.subarray(0, iOffset)),
      ranges,
      count: iOffset,
      instances: 1,
      topology: 'triangles',
    };
  }

  return {
    encode,
    destroy() {
      geometryCache.clear();
      arenaSources.clear();
      arena = null;
      for (const { value, retire } of textureOwners.values())
        value.removeEventListener('dispose', retire);
      textureOwners.clear();
      retiredTextures.clear();
      textures.clear();
      targets.clear();
    },
  };
}
