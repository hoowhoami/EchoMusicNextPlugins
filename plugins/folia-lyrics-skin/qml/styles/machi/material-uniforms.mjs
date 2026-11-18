// Source material hooks describe a program, not individual instances. Reuse their
// uniform references within one frame; draw snapshots still override each value.
export function createFrameUniformReader() {
  const templates = new Map();
  return (material, snapshot = {}) => {
    let uniforms = templates.get(material);
    if (!uniforms) {
      const shader = { uniforms: {}, vertexShader: '', fragmentShader: '' };
      material.onBeforeCompile(shader, {});
      uniforms = shader.uniforms;
      templates.set(material, uniforms);
    }
    const result = {};
    for (const name of Object.keys(uniforms)) result[name] = uniforms[name].value;
    for (const name of Object.keys(material.uniforms || {}))
      result[name] = material.uniforms[name].value;
    for (const name of Object.keys(snapshot)) result[name] = snapshot[name].value;
    return result;
  };
}
