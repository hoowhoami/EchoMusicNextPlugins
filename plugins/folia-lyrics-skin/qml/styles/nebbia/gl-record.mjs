// Records the original Nebbia GL command stream as bounded data for native RHI replay.
import { programs } from './shaders/registry.mjs';
export function programKey(vs, fs) {
  let a = 2166136261,
    b = 0x9e3779b9;
  const source = vs + '\n' + fs;
  for (let i = 0; i < source.length; ++i) {
    a = Math.imul(a ^ source.charCodeAt(i), 16777619);
    b = Math.imul(b ^ source.charCodeAt(i), 0x85ebca6b);
  }
  return (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16) + '-' + source.length;
}
let nextResourceRevision = 0;
export function createNebbiaGlRecorder(width, height) {
  const pendingResources = new Map();
  const gl = {},
    resources = new Map(),
    events = [],
    commands = [],
    textures = new Map();
  let next = 1,
    unit = 0,
    arrayBuffer = null,
    vao = { attributes: {} },
    framebuffer = null,
    program = null;
  let viewport = [0, 0, width, height],
    scissor = null,
    clear = [0, 0, 0, 0],
    blend = false,
    equation = 0,
    blendFactors = [];
  const constants = [
    'ARRAY_BUFFER',
    'BLEND',
    'CLAMP_TO_EDGE',
    'COLOR_ATTACHMENT0',
    'COLOR_BUFFER_BIT',
    'DYNAMIC_DRAW',
    'FLOAT',
    'FRAMEBUFFER',
    'FRAMEBUFFER_COMPLETE',
    'FUNC_ADD',
    'HALF_FLOAT',
    'LINEAR',
    'LINEAR_MIPMAP_LINEAR',
    'LINK_STATUS',
    'MAX',
    'MAX_TEXTURE_SIZE',
    'ONE',
    'ONE_MINUS_DST_COLOR',
    'ONE_MINUS_SRC_ALPHA',
    'ONE_MINUS_SRC_COLOR',
    'R8',
    'RED',
    'RGBA',
    'RGBA8',
    'RGBA16F',
    'SCISSOR_TEST',
    'STATIC_DRAW',
    'TEXTURE_2D',
    'TEXTURE_MAG_FILTER',
    'TEXTURE_MAX_LEVEL',
    'TEXTURE_MIN_FILTER',
    'TEXTURE_WRAP_S',
    'TEXTURE_WRAP_T',
    'TRIANGLE_STRIP',
    'UNPACK_PREMULTIPLY_ALPHA_WEBGL',
    'UNSIGNED_BYTE',
    'VERTEX_SHADER',
    'FRAGMENT_SHADER',
    'COMPILE_STATUS',
  ];
  constants.forEach((name, i) => (gl[name] = i + 1));
  gl.TEXTURE0 = 1024;
  equation = gl.FUNC_ADD;
  const create = (kind) => {
    const value = { id: 'nebbia-' + kind + '-' + next++, kind };
    resources.set(value.id, value);
    return value;
  };
  const copyData = (value) => (value ? Array.from(value) : null);
  const bytes = (value) =>
    ArrayBuffer.isView(value)
      ? value.byteLength
      : value instanceof ArrayBuffer
        ? value.byteLength
        : Array.isArray(value)
          ? value.length * 4
          : 0;
  function writeBuffer(data, offset = 0) {
    if (!arrayBuffer) throw Error('Nebbia source buffer is not bound');
    const dataBytes = typeof data === 'number' ? data : bytes(data);
    if (!Number.isInteger(dataBytes) || dataBytes < 0 || offset + dataBytes > 16 * 1024 * 1024)
      throw Error('Nebbia buffer budget exceeded');
    if (typeof data === 'number') {
      arrayBuffer.size = data;
      arrayBuffer.values = null;
    } else {
      arrayBuffer.size = Math.max(arrayBuffer.size || 0, offset + dataBytes);
      if (offset === 0 && dataBytes === arrayBuffer.size)
        arrayBuffer.values = new Float32Array(data);
      else {
        // Each draw keeps its own buffer version, including partial updates.
        const next = new Float32Array(Math.ceil(arrayBuffer.size / 4));
        if (arrayBuffer.values) next.set(arrayBuffer.values);
        next.set(data, offset / 4);
        arrayBuffer.values = next;
      }
    }
  }
  function uniform(location, value) {
    if (location)
      location.program.uniforms[location.name] =
        Array.isArray(value) || ArrayBuffer.isView(value) ? Array.from(value) : value;
  }
  Object.assign(gl, {
    createBuffer: () => create('buffer'),
    createTexture: () => create('texture'),
    createFramebuffer: () => create('framebuffer'),
    createVertexArray: () => ({ attributes: {} }),
    createShader: (type) => ({ type }),
    createProgram: () => ({ shaders: [], attributes: {}, uniforms: {} }),
    shaderSource: (shader, source) => (shader.source = source),
    compileShader: () => {},
    attachShader: (p, s) => p.shaders.push(s),
    bindAttribLocation: (p, i, name) => (p.attributes[name] = i),
    linkProgram(p) {
      const vs = p.shaders.find((s) => s.type === gl.VERTEX_SHADER),
        fs = p.shaders.find((s) => s.type === gl.FRAGMENT_SHADER);
      p.key = programKey(vs.source, fs.source);
      if (!programs[p.key]) throw Error('Nebbia shader has no pinned RHI program: ' + p.key);
    },
    getProgramParameter: () => true,
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    getAttachedShaders: (p) => p.shaders,
    getUniformLocation: (p, name) => ({ program: p, name }),
    useProgram: (p) => (program = p),
    uniform1f: uniform,
    uniform1i: uniform,
    uniform2fv: uniform,
    uniform3fv: uniform,
    uniform4fv: uniform,
    uniform2f: (l, a, b) => uniform(l, [a, b]),
    uniform3f: (l, a, b, c) => uniform(l, [a, b, c]),
    uniform3i: (l, a, b, c) => uniform(l, [a, b, c]),
    bindBuffer: (target, value) => (arrayBuffer = value),
    bufferData: (target, data) => writeBuffer(data),
    bufferSubData: (target, offset, data, first = 0, count = data.length - first) =>
      writeBuffer(data.subarray(first, first + count), offset),
    bindVertexArray: (value) => (vao = value || { attributes: {} }),
    enableVertexAttribArray: () => {},
    vertexAttribPointer(location, size, type, normalized, stride, offset) {
      if (type !== gl.FLOAT || normalized) throw Error('Unsupported Nebbia source attribute');
      vao.attributes[location] = {
        buffer: arrayBuffer.id,
        size,
        stride: stride || size * 4,
        offset,
        divisor: 0,
      };
    },
    vertexAttribDivisor(location, divisor) {
      vao.attributes[location].divisor = divisor;
    },
    activeTexture: (value) => (unit = value - gl.TEXTURE0),
    bindTexture: (target, value) => textures.set(unit, value),
    texParameteri(target, key, value) {
      const t = textures.get(unit);
      if (t) {
        t.parameters = t.parameters || {};
        t.parameters[key] = value;
      }
    },
    bindFramebuffer: (target, value) => (framebuffer = value),
    framebufferTexture2D: (target, attachment, type, texture) => {
      framebuffer.texture = texture;
      texture.rendered = true;
    },
    checkFramebufferStatus: () => gl.FRAMEBUFFER_COMPLETE,
    getParameter: (name) => (name === gl.MAX_TEXTURE_SIZE ? 8192 : 0),
    getExtension: (name) => (name === 'EXT_color_buffer_float' ? {} : null),
    isContextLost: () => false,
    pixelStorei: () => {},
    generateMipmap() {
      const t = textures.get(unit);
      if (t) {
        t.mipmaps = true;
        events.push({ type: 'mips', id: t.id });
      }
    },
    viewport: (x, y, w, h) => (viewport = [x, y, w, h]),
    scissor: (x, y, w, h) => (scissor = [x, y, w, h]),
    clearColor: (...rgba) => (clear = rgba),
    clear() {
      commands.push({
        type: 'clear',
        target: framebuffer && framebuffer.texture ? framebuffer.texture.id : 'surface',
        color: clear.slice(),
        viewport: viewport.slice(),
        scissor: scissor && scissor.slice(),
      });
    },
    enable(value) {
      if (value === gl.BLEND) blend = true;
      if (value === gl.SCISSOR_TEST && !scissor) scissor = viewport.slice();
    },
    disable(value) {
      if (value === gl.BLEND) blend = false;
      if (value === gl.SCISSOR_TEST) scissor = null;
    },
    blendEquation: (value) => (equation = value),
    blendFunc: (...value) => (blendFactors = value),
    blendFuncSeparate: (...value) => (blendFactors = value),
    deleteTexture(value) {
      if (value) {
        resources.delete(value.id);
        events.push({ type: 'retire', id: value.id });
      }
    },
    deleteBuffer(value) {
      if (value) {
        resources.delete(value.id);
        events.push({ type: 'retire', id: value.id });
      }
    },
    deleteFramebuffer: () => {},
    deleteVertexArray: () => {},
    deleteShader: () => {},
    deleteProgram: () => {},
  });
  function uploadTexture(args, sub) {
    const texture = textures.get(unit);
    if (!texture) throw Error('Nebbia source texture is not bound');
    let w, h, data, format;
    if (args.length === 9) {
      w = args[3];
      h = args[4];
      data = args[8];
      format = args[2] === gl.RGBA16F ? 'rgba16f' : 'rgba8';
    } else {
      const source = args[args.length - 1];
      w = source.width;
      h = source.height;
      data = source.pixels || source.data;
      format = 'rgba8';
      if (!data && source.commands) {
        texture.width = w;
        texture.height = h;
        texture.format = 'rgba8';
        events.push({
          type: 'canvas',
          id: texture.id,
          width: w,
          height: h,
          commands: JSON.parse(JSON.stringify(source.commands)),
        });
        return;
      }
      if (!data && source.getContext) data = source.getContext('2d').getImageData(0, 0, w, h).data;
      if (!data) throw Error('Nebbia immutable source pixels are not prepared');
    }
    if (
      !Number.isInteger(w) ||
      !Number.isInteger(h) ||
      w < 1 ||
      h < 1 ||
      w > 8192 ||
      h > 8192 ||
      w * h * (format === 'rgba16f' ? 8 : 4) > 64 * 1024 * 1024
    )
      throw Error('Nebbia texture budget exceeded');
    texture.width = w;
    texture.height = h;
    texture.format = format;
    events.push({
      type: 'texture',
      id: texture.id,
      width: w,
      height: h,
      format,
      data: copyData(data),
      sub: !!sub,
    });
  }
  gl.texImage2D = (...args) => uploadTexture(args, false);
  gl.texSubImage2D = (...args) => uploadTexture(args, true);
  function draw(topology, first, count, instances = 1) {
    if (topology !== gl.TRIANGLE_STRIP || !program) throw Error('Unsupported Nebbia source draw');
    let composition = 'none';
    if (blend) {
      if (equation === gl.MAX) composition = 'max';
      else if (
        blendFactors[0] === gl.ONE_MINUS_DST_COLOR &&
        blendFactors[1] === gl.ONE_MINUS_SRC_COLOR
      )
        composition = 'exclusion';
      else if (blendFactors[0] === gl.ONE && blendFactors[1] === gl.ONE) composition = 'add';
      else if (blendFactors[0] === gl.ONE && blendFactors[1] === gl.ONE_MINUS_SRC_ALPHA)
        composition = 'alpha';
      else throw Error('Unknown original Nebbia blend');
    }
    const bound = {};
    for (const u of programs[program.key].samplers) {
      const t = textures.get(program.uniforms[u.name] || 0);
      bound[u.name] = t ? t.id : null;
    }
    const attributes = {};
    for (const location of Object.keys(vao.attributes)) {
      const source = vao.attributes[location],
        buffer = resources.get(source.buffer);
      attributes[location] = Object.assign({}, source, {
        data: buffer && buffer.values ? buffer.values : null,
        sizeBytes: buffer ? buffer.size : 0,
      });
    }
    commands.push({
      type: 'draw',
      program: program.key,
      composition,
      target: framebuffer && framebuffer.texture ? framebuffer.texture.id : 'surface',
      viewport: viewport.slice(),
      scissor: scissor && scissor.slice(),
      uniforms: JSON.parse(JSON.stringify(program.uniforms)),
      textures: bound,
      attributes,
      first,
      count,
      instances,
    });
    if (commands.length > 256) throw Error('Nebbia frame pass budget exceeded');
  }
  gl.drawArrays = draw;
  gl.drawArraysInstanced = draw;
  return {
    gl,
    drain(acknowledged = 0) {
      for (const event of events.splice(0)) {
        if (event.type === 'buffer') continue; // Draw records carry their actual buffer snapshot.
        event.resourceRevision = ++nextResourceRevision;
        pendingResources.set(event.id + (event.type === 'mips' ? ':mips' : ''), event);
      }
      for (const [key, event] of pendingResources)
        if (event.resourceRevision <= acknowledged) pendingResources.delete(key);
      if (pendingResources.size > 1024) throw Error('Nebbia pending resource budget exceeded');
      const result = {
        events: [...pendingResources.values()].sort(
          (a, b) => a.resourceRevision - b.resourceRevision,
        ),
        commands: commands.splice(0),
        resourceRevision: nextResourceRevision,
      };
      for (const event of result.events)
        if (event.type === 'texture' || event.type === 'canvas') {
          const t = resources.get(event.id);
          if (t) event.mipmaps = !!t.mipmaps;
        }
      return result;
    },
    resourceCount: () => resources.size,
  };
}
