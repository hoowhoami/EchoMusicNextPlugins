// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaGlUtils.ts
const compileShader = (gl, type, src) => {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
};
const startProgram = (gl, vs, fs, attribs) => {
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  for (const [name, index] of Object.entries(attribs)) gl.bindAttribLocation(p, index, name);
  gl.linkProgram(p);
  return p;
};
const checkLinked = (gl, p) => {
  var _a;
  if (gl.getProgramParameter(p, gl.LINK_STATUS)) return;
  const shaderLogs = ((_a = gl.getAttachedShaders(p)) != null ? _a : [])
    .map((s) => gl.getShaderInfoLog(s))
    .filter(Boolean)
    .join('\n');
  throw new Error(
    `Nebbia program: ${gl.getProgramInfoLog(p)}${
      shaderLogs
        ? `
${shaderLogs}`
        : ''
    }`,
  );
};
const makeTex = (gl, unit) => {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { t, unit };
};
export { checkLinked, compileShader, makeTex, startProgram };
