import { unpackBytes } from '../../shared/binary.mjs';
// Replay the original GL data stream through public, scoped native resources.
import { programs } from './shaders/registry.mjs';
const bind = (binding, kind, resource) => ({ binding, kind, resource });
const packedFloat = (values) => new Float32Array(values).buffer;
function half(value) {
  const float = new Float32Array([value]),
    bits = new Uint32Array(float.buffer)[0],
    sign = (bits >>> 16) & 0x8000;
  let exponent = ((bits >>> 23) & 255) - 127 + 15,
    mantissa = bits & 0x7fffff;
  if (exponent <= 0) {
    if (exponent < -10) return sign;
    mantissa = (mantissa | 0x800000) >>> (1 - exponent);
    return sign | ((mantissa + 0x1000) >>> 13);
  }
  if (exponent >= 31) return sign | 0x7bff;
  const rounded = mantissa + 0x1000;
  if (rounded & 0x800000) {
    ++exponent;
    mantissa = 0;
  } else mantissa = rounded;
  return sign | (exponent << 10) | (mantissa >>> 13);
}
export function createNebbiaReplay(graphics, shaderPath, width, height) {
  const owned = new Set(),
    textures = new Map(),
    buffers = new Map(),
    uniforms = new Map(),
    pipelines = new Map();
  let dead = false;
  function own(value) {
    if (!value) throw Error(graphics.errorMessage || 'Nebbia native GPU resource rejected');
    owned.add(value);
    return value;
  }
  const sampler = own(graphics.createSampler({ minFilter: 'linear', magFilter: 'linear' }));
  const mipSampler = own(
    graphics.createSampler({ minFilter: 'linear', magFilter: 'linear', mipFilter: 'linear' }),
  );
  const target = own(
    graphics.createTexture({ width, height, format: 'rgba8', usage: ['render-target', 'sampled'] }),
  );
  const fallback = own(
    graphics.createTexture(
      { width: 1, height: 1, usage: ['sampled'] },
      new Uint8Array([0, 0, 0, 0]).buffer,
    ),
  );
  const finalUniform = own(
    graphics.createBuffer({ size: 16, usage: ['uniform'] }, packedFloat([width, height, 0, 0])),
  );
  function retire(value) {
    if (!value) return;
    owned.delete(value);
    value.dispose();
  }
  function buffer(key, size, data, usage = 'vertex') {
    let value = buffers.get(key);
    size = Math.max(4, Math.pow(2, Math.ceil(Math.log2(Math.max(4, size)))));
    if (!value || value.size < size) {
      if (value) retire(value.resource);
      value = { resource: own(graphics.createBuffer({ size, usage: [usage] }, data)), size };
      buffers.set(key, value);
    } else if (data && !graphics.writeBuffer(value.resource, data))
      throw Error('Nebbia buffer upload rejected');
    return value.resource;
  }
  function pipeline(key, definition) {
    if (!pipelines.has(key)) pipelines.set(key, own(graphics.createRenderPipeline(definition)));
    return pipelines.get(key);
  }
  const clearPipe = pipeline('clear', {
    vertexShader: shaderPath + 'native.vert.qsb',
    fragmentShader: shaderPath + 'clear.frag.qsb',
    topology: 'triangle-strip',
    blend: 'alpha',
  });
  const presentPipe = pipeline('present', {
    vertexShader: shaderPath + 'native.vert.qsb',
    fragmentShader: shaderPath + 'present.frag.qsb',
    topology: 'triangle-strip',
    blend: 'none',
  });
  function targetInfo(id) {
    if (id === 'surface') return { resource: target, width, height };
    const value = textures.get(id);
    if (!value) throw Error('Nebbia target missing: ' + id);
    return value;
  }
  function uniform(command, meta, index) {
    const bytes = new ArrayBuffer(meta.bytes),
      data = new DataView(bytes),
      values = Object.assign({}, command.uniforms);
    const extent = targetInfo(command.target);
    values.uNativeTarget = [extent.width, extent.height, command.target === 'surface' ? 0 : 1, 0];
    for (const u of meta.uniforms) {
      const v = values[u.name] === undefined ? 0 : values[u.name],
        flat = Array.isArray(v) ? v : [v];
      for (let row = 0; row < u.count; ++row)
        for (let channel = 0; channel < u.channels; ++channel) {
          const value = flat[row * u.channels + channel] || 0,
            offset = u.offset + row * u.stride + channel * 4;
          if (!Number.isFinite(value)) throw Error('Non-finite Nebbia shader uniform');
          if (u.type === 'int' || u.type === 'bool' || u.type.startsWith('ivec'))
            data.setInt32(offset, value, true);
          else data.setFloat32(offset, value, true);
        }
    }
    let value = uniforms.get(index);
    if (!value || value.bytes < meta.bytes) {
      if (value) retire(value.resource);
      value = {
        resource: own(graphics.createBuffer({ size: meta.bytes, usage: ['uniform'] }, bytes)),
        bytes: meta.bytes,
      };
      uniforms.set(index, value);
    } else if (!graphics.writeBuffer(value.resource, bytes))
      throw Error('Nebbia uniform update rejected');
    return value.resource;
  }
  function applyTexture(event) {
    const previous = textures.get(event.id);
    if (event.resourceRevision && previous?.resourceRevision === event.resourceRevision)
      return false;

    let resource = previous && previous.resource;
    if (
      !previous ||
      previous.width !== event.width ||
      previous.height !== event.height ||
      previous.format !== (event.format || 'rgba8')
    ) {
      retire(resource);
      resource = own(
        graphics.createTexture({
          width: event.width,
          height: event.height,
          format: event.format || 'rgba8',
          usage: ['sampled', 'render-target'],
          mipmaps: !!event.mipmaps,
        }),
      );
    }
    if (event.data || event.packedBytes) {
      let values = event.packedBytes ? new Uint8Array(unpackBytes(event.packedBytes)) : event.data;
      if (values.length === event.width * event.height) {
        const rgba = new Uint8Array(values.length * 4);
        for (let i = 0; i < values.length; ++i) {
          rgba[i * 4] = values[i];
          rgba[i * 4 + 3] = 255;
        }
        values = rgba;
      }
      const bytes =
        event.format === 'rgba16f'
          ? new Uint16Array(values.map(half)).buffer
          : new Uint8Array(values).buffer;
      if (!graphics.writeTexture(resource, bytes))
        throw Error('Nebbia immutable texture update rejected');
    }
    textures.set(event.id, {
      resource,
      width: event.width,
      height: event.height,
      format: event.format || 'rgba8',
      mipmaps: !!event.mipmaps,
      resourceRevision: event.resourceRevision,
    });
    return true;
  }
  return {
    frame(recording) {
      if (dead) throw Error('Nebbia native replay retired');
      const updatedCanvases = new Set();
      for (const event of recording.events) {
        if (event.type === 'texture' || event.type === 'canvas') {
          if (applyTexture(event) && event.type === 'canvas') updatedCanvases.add(event);
        } else if (event.type === 'retire') {
          const value = textures.get(event.id);
          if (value) {
            retire(value.resource);
            textures.delete(event.id);
          }
        }
      }
      const passes = [],
        pendingClears = new Map();
      let drawIndex = 0;
      for (const event of recording.events)
        if (updatedCanvases.has(event)) {
          const instances = [];
          for (const command of event.commands) {
            if (command.kind === 'clear' || command.kind === 'rect') continue;
            const s = command.style,
              gradient = s.fillStyle;
            if (
              command.kind !== 'path' ||
              command.stroke ||
              !gradient ||
              gradient.type !== 'radial' ||
              s.globalCompositeOperation !== 'lighten'
            )
              throw Error('Unknown original Nebbia breath command');
            const m = s.matrix,
              stops = gradient.stops;
            if (m[1] !== 0 || m[3] !== 0 || stops.length !== 4)
              throw Error('Unknown original Nebbia breath gradient');
            const color = (position) => {
              const value = /rgb\((\d+),(\d+),(\d+)\)/.exec(stops[position].color);
              if (!value) throw Error('Invalid breath color');
              return value.slice(1).map(Number);
            };
            const c = color(0),
              b = color(1);
            instances.push(m[2], m[5], m[0], m[4], c[0] / 255, b[0] / 255, c[1] / 255, c[2] / 255);
          }
          const value = targetInfo(event.id),
            data = instances.length ? instances : [0, 0, 1, 1, 0, 0, 0, 0];
          const vertices = buffer('breath:' + event.id, data.length * 4, packedFloat(data));
          const u = buffer(
            'breath-size:' + event.id,
            16,
            packedFloat([event.width, event.height, 0, 0]),
            'uniform',
          );
          const p = pipeline('breath', {
            vertexShader: shaderPath + 'breath.vert.qsb',
            fragmentShader: shaderPath + 'breath.frag.qsb',
            blend: 'max',
            topology: 'triangle-strip',
            vertexLayout: {
              bindings: [{ stride: 32, stepMode: 'instance' }],
              attributes: [
                { binding: 0, location: 0, offset: 0, format: 'float4' },
                { binding: 0, location: 1, offset: 16, format: 'float4' },
              ],
            },
          });
          passes.push({
            type: 'render',
            pipeline: p.id,
            target: value.resource.id,
            clear: [0, 0, 0, 0],
            bindings: [bind(0, 'uniform', 'frame'), bind(1, 'uniform', u.id)],
            draws: [
              { count: 4, instances: Math.max(1, instances.length / 8), vertexBuffer: vertices.id },
            ],
          });
        }
      function flushClear(id) {
        const clear = pendingClears.get(id);
        if (!clear) return;
        pendingClears.delete(id);
        passes.push({
          type: 'render',
          pipeline: clearPipe.id,
          target: targetInfo(id).resource.id,
          clear: clear.color,
          bindings: [bind(0, 'uniform', 'frame')],
          draws: [{ count: 4 }],
        });
      }
      for (const command of recording.commands) {
        if (command.type === 'clear') {
          pendingClears.set(command.target, command);
          continue;
        }
        if (command.count < 1 || command.instances < 1) continue;
        for (const name of Object.keys(command.textures)) flushClear(command.textures[name]);
        const meta = programs[command.program];
        if (!meta) throw Error('Nebbia native shader metadata missing');
        const bindings = [
          bind(0, 'uniform', 'frame'),
          bind(1, 'uniform', uniform(command, meta, drawIndex).id),
        ];
        for (const source of meta.samplers) {
          const value = textures.get(command.textures[source.name]);
          const b = bind(source.binding, 'texture', value ? value.resource.id : fallback.id);
          b.sampler = (value && value.mipmaps ? mipSampler : sampler).id;
          bindings.push(b);
        }
        const streams = [],
          attributes = [],
          vertexBuffers = [],
          byBuffer = new Map();
        for (const location of Object.keys(command.attributes)
          .map(Number)
          .sort((a, b) => a - b)) {
          const a = command.attributes[location];
          let binding = byBuffer.get(a.buffer);
          if (binding === undefined) {
            binding = streams.length;
            byBuffer.set(a.buffer, binding);
            streams.push({
              stride: a.stride,
              stepMode: a.divisor ? 'instance' : 'vertex',
              stepRate: a.divisor || 1,
            });
            const resource = buffer(
              drawIndex + ':' + a.buffer,
              a.sizeBytes,
              a.dataKey
                ? unpackBytes(recording.buffers[a.dataKey])
                : a.data
                  ? packedFloat(a.data)
                  : null,
            );
            vertexBuffers.push({ buffer: resource.id });
          }
          attributes.push({
            binding,
            location,
            offset: a.offset,
            format: a.size === 1 ? 'float' : 'float' + a.size,
          });
        }
        const layout = { bindings: streams, attributes };
        const key = command.program + ':' + command.composition + ':' + JSON.stringify(layout);
        const p = pipeline(key, {
          vertexShader: shaderPath + meta.name + '.vert.qsb',
          fragmentShader: shaderPath + meta.name + '.frag.qsb',
          topology: 'triangle-strip',
          blend: command.composition,
          vertexLayout: layout,
        });
        const clear = pendingClears.get(command.target),
          targetValue = targetInfo(command.target);
        pendingClears.delete(command.target);
        const pass = {
          type: 'render',
          pipeline: p.id,
          target: targetValue.resource.id,
          loadOp: clear ? 'clear' : 'load',
          bindings,
          draws: [
            {
              count: command.count,
              instances: command.instances,
              first: command.first,
              vertexBuffers,
            },
          ],
        };
        if (clear) pass.clear = clear.color;
        // All offscreen data uses GL row order; replay preserves source viewport/scissor.
        pass.viewport = command.viewport;
        if (command.scissor) pass.scissor = command.scissor;
        passes.push(pass);
        ++drawIndex;
      }
      for (const [id, clear] of pendingClears) {
        passes.push({
          type: 'render',
          pipeline: clearPipe.id,
          target: targetInfo(id).resource.id,
          clear: clear.color,
          bindings: [bind(0, 'uniform', 'frame')],
          draws: [{ count: 4 }],
        });
      }
      const mips = [];
      for (const event of recording.events)
        if (event.type === 'mips') {
          const value = textures.get(event.id);
          if (value && value.mipmaps)
            mips.push({ type: 'generate-mips', texture: value.resource.id });
        }
      const source = bind(2, 'texture', target.id);
      source.sampler = sampler.id;
      passes.push({
        type: 'render',
        pipeline: presentPipe.id,
        bindings: [bind(0, 'uniform', 'frame'), bind(1, 'uniform', finalUniform.id), source],
        draws: [{ count: 4 }],
      });
      if (passes.length > 32)
        throw Error('Nebbia native frame exceeds 32 passes: ' + passes.length);
      return { passes, mips };
    },
    destroy() {
      if (dead) return;
      dead = true;
      for (const value of owned) value.dispose();
      owned.clear();
      textures.clear();
      buffers.clear();
      uniforms.clear();
      pipelines.clear();
    },
  };
}
