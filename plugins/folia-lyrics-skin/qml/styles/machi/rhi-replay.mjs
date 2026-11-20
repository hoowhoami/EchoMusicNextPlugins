import { packUniform, createUniformPacket } from './uniform-packet.mjs';
// Original frame graph replay through public scoped resources. No host playback state.
import { programs } from './shaders/registry.mjs';
import { unpackBytes } from '../../shared/binary.mjs';
import { nativeSampler } from './sampling.mjs';
const bind = (binding, kind, resource) => ({ binding, kind, resource });
export function createMachiReplay(graphics, shaderPath, width, height) {
  const commandLimit =
    graphics.capabilities && graphics.capabilities.limits
      ? graphics.capabilities.limits.maxCommands || 32
      : 32;
  const owned = new Set(),
    targets = new Map(),
    textures = new Map(),
    geometry = new Map(),
    pipelines = new Map(),
    buffers = new Map(),
    objectTextures = new Map(),
    samplers = new Map();
  let dead = false,
    rowBuffer = null,
    rowCapacity = 0;
  function own(value) {
    if (!value)
      throw Error(
        (graphics.errorMessage || 'Machi GPU resource rejected') +
          '; resources=' +
          graphics.capabilities.logicalResources +
          ', bytes=' +
          graphics.capabilities.logicalBytes,
      );
    owned.add(value);
    return value;
  }
  function retire(value) {
    if (value) {
      owned.delete(value);
      value.dispose();
    }
  }
  function buffer(key, data, usage, grow = false) {
    let value = buffers.get(key);
    const size = Math.max(4, data.byteLength);
    if (value && (value.size < size || (!grow && value.size !== size))) {
      retire(value.resource);
      buffers.delete(key);
      value = null;
    }
    if (!value) {
      const capacity = grow ? 2 ** Math.ceil(Math.log2(size)) : size;
      value = {
        size: capacity,
        resource: own(graphics.createBuffer({ size: capacity, usage: [usage] }, data)),
      };
      buffers.set(key, value);
    } else if (!graphics.writeBuffer(value.resource, data)) throw Error(graphics.errorMessage);
    return value.resource;
  }
  const empty = new Uint8Array([0, 0, 0, 255]).buffer;
  let fallback = null,
    sampler = null;
  function initialize() {
    if (!fallback) {
      fallback = own(graphics.createTexture({ width: 1, height: 1, usage: ['sampled'] }, empty));
      sampler = own(graphics.createSampler({ minFilter: 'linear', magFilter: 'linear' }));
    }
  }
  function pipeline(key, definition) {
    if (!pipelines.has(key)) pipelines.set(key, own(graphics.createRenderPipeline(definition)));
    return pipelines.get(key);
  }
  function samplerFor(texture) {
    const definition = nativeSampler(texture),
      key = JSON.stringify(definition);
    if (!samplers.has(key)) samplers.set(key, own(graphics.createSampler(definition)));
    return samplers.get(key);
  }
  function targetInfo(id) {
    const t = targets.get(id);
    if (!t) throw Error('Machi target missing: ' + id);
    return t;
  }
  function retireTarget(id) {
    const previous = targets.get(id);
    if (!previous) return;
    retire(previous.resource);
    retire(previous.depth);
    textures.delete(id);
    if (previous.depthId) textures.delete(previous.depthId);
    targets.delete(id);
  }
  function ingest(events, canvasSources, surface, extent = { width, height }) {
    initialize();
    if (width !== extent.width || height !== extent.height) {
      retireTarget('surface');
      width = extent.width;
      height = extent.height;
    }
    // Adaptive resizing can replace several targets at once. Return their
    // logical reservations before allocating the replacement graph.
    for (const event of events)
      if (event.kind === 'target' || event.kind === 'retire-target') retireTarget(event.id);
    if (!targets.has('surface')) {
      const resource = own(
        graphics.createTexture({
          width,
          height,
          format: 'rgba8',
          usage: ['sampled', 'render-target'],
        }),
      );
      targets.set('surface', { resource, width, height, samples: 1 });
      textures.set('surface', { resource, width, height });
    }
    const preparation = [];
    for (const event of events) {
      if (event.kind === 'target') {
        retireTarget(event.id);
        const t = {
          width: event.width,
          height: event.height,
          samples: event.samples,
          mipmaps: event.mipmaps,
          depthId: event.depthId,
          sampler: samplerFor(Object.assign({ mipmaps: event.mipmaps }, event.sampling)),
        };
        if (!event.depthOnly) {
          t.resource = own(
            graphics.createTexture({
              width: t.width,
              height: t.height,
              format: event.format,
              mipmaps: event.mipmaps,
              usage: ['sampled', 'render-target'],
            }),
          );
          textures.set(event.id, t);
        }
        if (event.depth) {
          t.depth = own(
            graphics.createTexture({
              width: t.width,
              height: t.height,
              format: 'depth32f',
              usage: ['sampled', 'render-target'],
            }),
          );
          if (event.depthId)
            textures.set(event.depthId, {
              resource: t.depth,
              width: t.width,
              height: t.height,
              sampler: samplerFor(event.depthSampling || {}),
            });
        }
        targets.set(event.id, t);
      } else if (event.kind === 'texture' || event.kind === 'canvas' || event.kind === 'gradient') {
        const previous = textures.get(event.id);
        if (previous && previous.version === event.version) continue;
        const format = event.kind === 'texture' ? event.format : 'rgba16f';
        let t = previous;
        if (!t) {
          t = {
            resource: own(
              graphics.createTexture(
                {
                  width: event.width,
                  height: event.height,
                  format,
                  mipmaps: event.mipmaps,
                  usage: event.kind === 'texture' ? ['sampled'] : ['sampled', 'render-target'],
                },
                event.data ? unpackBytes(event.data) : undefined,
              ),
            ),
            width: event.width,
            height: event.height,
            mipmaps: event.mipmaps,
          };
          textures.set(event.id, t);
        } else if (event.data && !graphics.writeTexture(t.resource, unpackBytes(event.data)))
          throw Error(graphics.errorMessage);
        t.version = event.version;
        t.sampler = samplerFor(event);
        if (event.kind !== 'texture') {
          const key = 'prepare:' + event.id;
          let bindings = [bind(0, 'uniform', 'frame')],
            uniforms;
          if (event.kind === 'gradient') {
            const command = event.commands[event.commands.length - 1],
              style = command.style.fillStyle;
            if (!style || !style.stops || style.stops.length !== 2)
              throw Error('Machi sky gradient source is invalid');
            const colors = style.stops.map((s) => s.color);
            const rgb = (c) => {
              if (!/^#[0-9a-f]{6}$/i.test(c)) throw Error('Machi gradient color invalid');
              return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
            };
            uniforms = new Float32Array([
              ...rgb(colors[0]),
              1,
              ...rgb(colors[1]),
              1,
              event.width,
              event.height,
              event.flipY ? 1 : 0,
              0,
            ]).buffer;
          } else {
            const source = canvasSources.get(event.id);
            if (!source) throw Error('Machi native canvas source is not ready');
            const imported = own(surface.importTextureSource(source));
            const b = bind(2, 'texture', imported.id);
            b.sampler = sampler.id;
            bindings.push(b);
            // Imported handles follow the native provider until this preparation list completes.
            t.imported = imported;
            uniforms = new Float32Array([
              event.width,
              event.height,
              event.flipY ? 1 : 0,
              event.srgb ? 1 : 0,
            ]).buffer;
          }
          const u = buffer(key, uniforms, 'uniform');
          bindings.push(bind(1, 'uniform', u.id));
          const p = pipeline(event.kind, {
            vertexShader: shaderPath + 'prepare.vert.qsb',
            fragmentShader: shaderPath + event.kind + '.frag.qsb',
            topology: 'triangle-strip',
            blend: 'none',
          });
          preparation.push({
            type: 'render',
            pipeline: p.id,
            target: t.resource.id,
            bindings,
            draws: [{ count: 4 }],
          });
        }
        if (event.mipmaps) preparation.push({ type: 'generate-mips', texture: t.resource.id });
      } else if (event.kind === 'geometry') {
        const streams = [],
          attributes = [],
          vertexBuffers = [];
        if (event.vertex) {
          const data = unpackBytes(event.vertex),
            v = buffer(event.id + ':v', data, 'vertex');
          streams.push({ stride: event.arena ? 32 : 48 });
          vertexBuffers.push({ buffer: v.id });
          for (const [location, offset, format] of event.arena
            ? [
                [0, 0, 'float3'],
                [1, 12, 'float3'],
                [2, 24, 'float2'],
              ]
            : [
                [0, 0, 'float3'],
                [1, 12, 'float3'],
                [2, 24, 'float2'],
                [3, 32, 'float3'],
                [4, 44, 'float'],
              ])
            attributes.push({ binding: 0, location, offset, format });
        } else {
          // Locations are resolved per program when constructing the pipeline below.
          for (const [i, s] of event.streams.entries()) {
            const data = unpackBytes(s.data),
              v = buffer(event.id + ':' + s.name, data, 'vertex');
            streams.push({
              stride: s.size * 4,
              stepMode: s.instance ? 'instance' : 'vertex',
              stepRate: s.stepRate || 1,
            });
            vertexBuffers.push({ buffer: v.id });
            attributes.push({ name: s.name, binding: i, size: s.size });
          }
        }
        const index = event.index
          ? buffer(event.id + ':i', unpackBytes(event.index), 'index')
          : null;
        geometry.set(event.id, {
          streams,
          attributes,
          vertexBuffers,
          index,
          count: event.count,
          instances: event.instances,
          standard: !!event.vertex,
          arena: !!event.arena,
        });
      } else if (event.kind === 'retire-target') {
        retireTarget(event.id);
      } else if (event.kind === 'retire-texture') {
        const value = textures.get(event.id);
        if (value) {
          retire(value.resource);
          if (value.imported) retire(value.imported);
          textures.delete(event.id);
        }
        const key = 'prepare:' + event.id,
          uniform = buffers.get(key);
        if (uniform) {
          retire(uniform.resource);
          buffers.delete(key);
        }
      } else if (event.kind === 'retire-geometry') {
        geometry.delete(event.id);
        for (const [key, value] of buffers)
          if (key.startsWith(event.id + ':')) {
            retire(value.resource);
            buffers.delete(key);
          }
      }
    }
    return preparation;
  }
  function frame(recording) {
    initialize();
    const passes = [],
      clears = new Map();
    let index = 0,
      lastTarget = null;
    // Each object texture starts its row indices at zero, so every draw
    // shares one immutable index stream. Uniform ranges share a growing buffer.
    const alignment = (graphics.capabilities.deviceLimits || {}).uniformBufferAlignment || 256;
    const ranges = new Map();
    let uniformBytes = 0,
      indexCount = 0;
    for (const command of recording.passes) {
      if (command.kind !== 'draw') continue;
      const meta = programs[command.key];
      if (!meta) throw Error('Machi shader missing');
      uniformBytes = Math.ceil(uniformBytes / alignment) * alignment;
      ranges.set(command, { offset: uniformBytes, size: meta.bytes });
      uniformBytes += meta.bytes;
      if (meta.drawData) indexCount = Math.max(indexCount, command.objectCount);
    }
    const uniformData = createUniformPacket(new ArrayBuffer(Math.max(4, uniformBytes)));
    for (const command of recording.passes) {
      if (command.kind !== 'draw') continue;
      const meta = programs[command.key],
        t = targetInfo(command.target),
        range = ranges.get(command);
      packUniform(
        uniformData,
        range.offset,
        meta,
        Object.assign({}, command.uniforms, { nativeTarget: [t.width, t.height, 1, 0] }),
      );
    }
    const uniformBuffer = buffer('frame-uniforms', uniformData.buffer, 'uniform', true);
    if (indexCount > rowCapacity) {
      rowCapacity = 2 ** Math.ceil(Math.log2(indexCount));
      const indices = new Float32Array(rowCapacity);
      for (let row = 0; row < rowCapacity; ++row) indices[row] = row;
      rowBuffer = buffer('frame-rows', indices.buffer, 'vertex');
    }
    function finishTarget() {
      if (lastTarget && targetInfo(lastTarget).mipmaps)
        passes.push({ type: 'generate-mips', texture: targetInfo(lastTarget).resource.id });
    }
    for (const command of recording.passes) {
      if (command.kind === 'clear') {
        clears.set(command.target, command);
        continue;
      }
      if (lastTarget !== command.target) {
        finishTarget();
        lastTarget = command.target;
      }
      const t = targetInfo(command.target),
        meta = programs[command.key],
        g = geometry.get(command.geometry);
      if (!meta || !g) throw Error('Machi prepared program/geometry missing');
      const range = ranges.get(command),
        uniformBinding = Object.assign(bind(1, 'uniform', uniformBuffer.id), range);
      const bindings = [bind(0, 'uniform', 'frame'), uniformBinding];
      if (meta.drawData) {
        const data = unpackBytes(command.objects),
          rows = Math.max(1, command.objectCount);
        let objects = objectTextures.get(index);
        if (!objects || objects.rows < rows) {
          if (objects) retire(objects.resource);
          const capacity = 2 ** Math.ceil(Math.log2(rows));
          const pixels = new Uint8Array(capacity * 16 * 16);
          pixels.set(new Uint8Array(data));
          objects = {
            rows: capacity,
            pixels,
            resource: own(
              graphics.createTexture(
                { width: 16, height: capacity, format: 'rgba32f', usage: ['sampled'] },
                pixels.buffer,
              ),
            ),
          };
          objectTextures.set(index, objects);
        } else {
          objects.pixels.set(new Uint8Array(data));
          if (!graphics.writeTexture(objects.resource, objects.pixels.buffer))
            throw Error(graphics.errorMessage);
        }
        const b = bind(2, 'texture', objects.resource.id);
        b.sampler = sampler.id;
        bindings.push(b);
      }
      for (const source of meta.samplers) {
        const id = command.maps[source.name] || command.maps[source.sourceName],
          value = textures.get(id);
        const b = bind(source.binding, 'texture', value ? value.resource.id : fallback.id);
        b.sampler = value && value.sampler ? value.sampler.id : sampler.id;
        bindings.push(b);
      }
      let attributes = g.attributes;
      if (!g.standard) {
        attributes = [];
        for (const a of g.attributes) {
          const location = meta.attributes[a.name];
          if (location === undefined) continue;
          if (a.size === 16)
            for (let c = 0; c < 4; ++c)
              attributes.push({
                binding: a.binding,
                location: location + c,
                offset: c * 16,
                format: 'float4',
                matrixSlice: c,
              });
          else
            attributes.push({
              binding: a.binding,
              location,
              offset: 0,
              format: a.size === 1 ? 'float' : 'float' + a.size,
            });
        }
      }
      let streams = g.streams;
      let drawIndices = null;
      if (g.arena) {
        drawIndices = rowBuffer;
        streams = g.streams.concat([{ stride: 4, stepMode: 'instance' }]);
        attributes = attributes.concat([{ binding: 1, location: 4, offset: 0, format: 'float' }]);
      }
      const layout = { bindings: streams, attributes };
      const key =
        command.key +
        ':' +
        command.topology +
        ':' +
        command.blend +
        ':' +
        command.cull +
        ':' +
        command.depthTest +
        ':' +
        command.depthWrite +
        ':' +
        JSON.stringify(layout);
      const p = pipeline(key, {
        vertexShader: shaderPath + meta.vertexShader + '.qsb',
        fragmentShader: shaderPath + meta.fragmentShader + '.qsb',
        topology: command.topology,
        blend: command.blend,
        cull: command.cull,
        depthTest: command.depthTest,
        depthWrite: command.depthWrite,
        depthCompare: 'less-equal',
        // The native shader flips GL's offscreen Y on downward framebuffers;
        // preserve the original front faces through that reflection.
        frontFace: graphics.capabilities.backend === 'OpenGL' ? 'ccw' : 'cw',
        vertexLayout: layout,
      });
      const clear = clears.get(command.target);
      clears.delete(command.target);
      if (command.background) {
        const source = textures.get(command.background);
        if (!source) throw Error('Machi sky source missing');
        const image = bind(2, 'texture', source.resource.id);
        image.sampler = sampler.id;
        const bg = pipeline('background', {
          vertexShader: shaderPath + 'prepare.vert.qsb',
          fragmentShader: shaderPath + 'background.frag.qsb',
          topology: 'triangle-strip',
          blend: 'none',
        });
        const pass = {
          type: 'render',
          pipeline: bg.id,
          target: t.resource.id,
          bindings: [bind(0, 'uniform', 'frame'), image],
          draws: [{ count: 4 }],
        };
        if (t.depth) pass.depthTarget = { texture: t.depth.id };
        if (t.samples > 1) pass.samples = t.samples;
        if (clear) pass.clear = clear.color;
        passes.push(pass);
      }
      const pass = {
        type: 'render',
        pipeline: p.id,
        bindings,
        loadOp: command.background ? 'load' : clear || command.clear ? 'clear' : 'load',
        draws: [{ count: g.count, instances: g.instances, vertexBuffers: g.vertexBuffers }],
      };
      if (g.arena)
        pass.draws = command.draws.map((draw) => ({
          count: draw.count,
          first: draw.first,
          instances: draw.instances,
          vertexBuffers: [g.vertexBuffers[0], { buffer: drawIndices.id, offset: draw.row * 4 }],
          indexBuffer: g.index.id,
          indexFormat: 'uint32',
        }));
      else if (g.index) {
        pass.draws[0].indexBuffer = g.index.id;
        pass.draws[0].indexFormat = 'uint32';
      }
      if (t.resource) pass.target = t.resource.id;
      else pass.colorTargets = [];
      if (t.depth) pass.depthTarget = { texture: t.depth.id };
      if (t.samples > 1) pass.samples = t.samples;
      if (clear) pass.clear = clear.color;
      passes.push(pass);
      ++index;
    }
    finishTarget();
    const final = targetInfo('surface'),
      b = bind(2, 'texture', final.resource.id);
    b.sampler = sampler.id;
    const p = pipeline('present', {
      vertexShader: shaderPath + 'present.vert.qsb',
      fragmentShader: shaderPath + 'present.frag.qsb',
      topology: 'triangle-strip',
      blend: 'none',
    });
    const present = {
      type: 'render',
      pipeline: p.id,
      bindings: [bind(0, 'uniform', 'frame'), b],
      draws: [{ count: 4 }],
    };
    passes.push(present);
    // Split only after complete same-target sequences. Never resolve and then load MSAA depth.
    const chunks = [];
    let chunk = [],
      run = [];
    function append() {
      if (run.length > commandLimit)
        throw Error('Machi target sequence exceeds native command budget');
      if (chunk.length + run.length > commandLimit) {
        chunks.push(chunk);
        chunk = [];
      }
      chunk.push(...run);
      run = [];
    }
    let previous = null;
    for (const pass of passes) {
      const id = pass.target || (pass.depthTarget && pass.depthTarget.texture) || 'surface';
      if (id !== previous && run.length) append();
      run.push(pass);
      previous = id;
    }
    if (run.length) append();
    if (chunk.length) chunks.push(chunk);
    return { chunks, present };
  }
  return {
    ingest,
    frame,
    finishPreparation() {
      for (const t of textures.values())
        if (t.imported) {
          retire(t.imported);
          delete t.imported;
        }
    },
    destroy() {
      if (dead) return;
      dead = true;
      for (const r of owned) r.dispose();
      owned.clear();
      targets.clear();
      textures.clear();
      geometry.clear();
      pipelines.clear();
      buffers.clear();
      objectTextures.clear();
    },
  };
}
