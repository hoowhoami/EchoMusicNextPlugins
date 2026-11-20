// Stable structural key. Uniform values and object identity never create programs.
export function hashSource(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; ++i)
    value = Math.imul(value ^ text.charCodeAt(i), 16777619) >>> 0;
  return value.toString(16);
}
export function shaderKey(material, geometry, lights, fog, shadows) {
  return hashSource(JSON.stringify(shaderInputs(material, geometry, lights, fog, shadows)));
}
export function shaderInputs(material, geometry, lights, fog, shadows) {
  return [
    material.type,
    material.vertexShader || '',
    material.fragmentShader || '',
    material.type === 'MeshToonMaterial'
      ? material.name.startsWith('machi:wet:')
        ? 'wet'
        : material.customProgramCacheKey() === 'machi-snow'
          ? 'snow'
          : 'plain'
      : 'plain',
    material.defines || {},
    !!material.map,
    !!material.alphaMap,
    !!material.gradientMap,
    !!material.vertexColors,
    material.side,
    !!material.premultipliedAlpha,
    !!material.transparent && material.blending !== 0 && !material.premultipliedAlpha,
    material.alphaTest > 0,
    !!fog,
    !!(fog && fog.isFogExp2),
    !!shadows,
    ...[
      'directional',
      'point',
      'spot',
      'hemi',
      'rectArea',
      'directionalShadowMap',
      'spotShadowMap',
      'pointShadowMap',
    ].map((k) => (lights[k] || []).length),
    Object.keys(geometry.attributes).sort(),
  ];
}
