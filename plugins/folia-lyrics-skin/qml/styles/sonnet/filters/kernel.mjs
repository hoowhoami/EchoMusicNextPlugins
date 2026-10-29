// Shared Folia a8da4437 scene filter plan. Source values are never replaced by approximate profiles.
const kinds = ['lens', 'noise', 'contrast', 'rgb', 'halftone', 'vignette', 'glitch', 'copy'];
const kernels = {
  5: [0.153388, 0.221461, 0.250301],
  7: [0.071303, 0.131514, 0.189879, 0.214607],
  9: [0.028532, 0.067234, 0.124009, 0.179044, 0.20236],
  11: [0.0093, 0.028002, 0.065984, 0.121703, 0.175713, 0.198596],
  13: [0.002406, 0.009255, 0.027867, 0.065666, 0.121117, 0.174868, 0.197641],
  15: [0.000489, 0.002403, 0.009246, 0.02784, 0.065602, 0.120999, 0.174697, 0.197448],
};
export function postProcessPasses(amounts, seed) {
  const a = amounts,
    p = a.printEffects,
    result = [];
  if (a.lensDistortion > 0 || a.lensDispersion > 0)
    result.push({ kind: 'lens', uDistortion: a.lensDistortion, uDispersion: a.lensDispersion });
  if (a.noise > 0) result.push({ kind: 'noise', uNoise: a.noise, uSeed: (seed % 10000) / 10000 });
  if (a.contrast > 0) result.push({ kind: 'contrast', uContrast: a.contrast });
  for (const [key, kind] of [
    ['rgbShift', 'rgb'],
    ['halftone', 'halftone'],
    ['vignette', 'vignette'],
  ])
    if (p[key] > 0) result.push({ kind, uAmount: p[key] });
  return result;
}
export function blurWeights(size) {
  const kernel = kernels[size];
  if (!kernel) throw new Error('Unsupported Pixi blur kernel');
  return kernel.concat(kernel.slice(0, -1).reverse());
}
export function expandPasses(passes) {
  if (!Array.isArray(passes) || passes.length > 16)
    throw new Error('Filter chain exceeds descriptor budget');
  const result = [];
  for (const pass of passes) {
    if (!pass || typeof pass !== 'object') throw new Error('Invalid source filter descriptor');
    if (pass.kind === 'blur') {
      const q = pass.quality === undefined ? 2 : pass.quality,
        n = pass.kernelSize === undefined ? 5 : pass.kernelSize,
        s = pass.strength === undefined ? 0 : pass.strength;
      if (!Number.isInteger(q) || q < 1 || q > 8) throw new Error('Pixi blur quality must be 1..8');
      if (!kernels[n]) throw new Error('Unsupported Pixi blur kernel');
      if (!Number.isFinite(s) || Math.abs(s) > 128)
        throw new Error('Pixi blur strength exceeds source budget');
      let variance = 0;
      for (let i = 0; i < q; i++) variance += Math.pow(0.5, 2 * i);
      const initial = s / Math.sqrt(variance);
      for (const axis of ['x', 'y'])
        for (let i = 0; i < q; i++)
          result.push({ kind: 'blur' + n, axis, uStrength: initial * Math.pow(0.5, i) });
    } else {
      if (!kinds.includes(pass.kind)) throw new Error('Unsupported source filter: ' + pass.kind);
      for (const key of Object.keys(pass))
        if (key.startsWith('u') && !Number.isFinite(pass[key]))
          throw new Error('Non-finite source filter uniform ' + key);
      result.push(Object.assign({}, pass));
    }
  }
  if (result.length > 32) throw new Error('Filter chain exceeds 32 native passes');
  return result;
}
export function optimalTextureSize(width, height, resolution, registeredScreens = []) {
  const fw = Math.ceil(width * resolution - 1e-6),
    fh = Math.ceil(height * resolution - 1e-6);
  let pw = Math.pow(2, Math.ceil(Math.log2(Math.max(1, fw)))),
    ph = Math.pow(2, Math.ceil(Math.log2(Math.max(1, fh))));
  for (const screen of registeredScreens) {
    if (
      !screen ||
      !Number.isInteger(screen.width) ||
      !Number.isInteger(screen.height) ||
      screen.width < 1 ||
      screen.height < 1
    )
      throw new Error('Invalid source screen registry');
    if (screen.width >= fw) pw = Math.min(pw, screen.width);
    if (screen.height >= fh) ph = Math.min(ph, screen.height);
  }
  return { width: pw, height: ph };
}
export function texturePlan(
  width,
  height,
  resolution,
  count,
  rootTargetResolution,
  registeredScreens = []
) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(resolution) ||
    resolution < 0.125 ||
    resolution > 4 ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > 32
  )
    throw new Error('Invalid filter texture plan');
  const fw = Math.ceil(width * resolution - 1e-6),
    fh = Math.ceil(height * resolution - 1e-6),
    pool = optimalTextureSize(width, height, resolution, registeredScreens),
    pw = pool.width,
    ph = pool.height,
    rootTarget = count > 0 && rootTargetResolution !== undefined;
  if (
    rootTarget &&
    (!Number.isFinite(rootTargetResolution) ||
      rootTargetResolution < 0.125 ||
      rootTargetResolution > 4)
  )
    throw new Error('Invalid root filter resolution');
  // Pixi TextureSource.resize rounds the actual canvas, whereas filter inputs use ceil+pow2.
  const rw = rootTarget ? Math.max(1, Math.round(width * rootTargetResolution)) : pw,
    rh = rootTarget ? Math.max(1, Math.round(height * rootTargetResolution)) : ph,
    bytes = (count * pw * ph + rw * rh) * 4;
  if (pw > 16384 || ph > 16384 || rw > 16384 || rh > 16384 || bytes > 256 * 1024 * 1024)
    throw new Error('Filter texture budget exceeded (16384px / 256MiB)');
  return {
    physicalSize: { width: pw, height: ph },
    outputPhysicalSize: { width: rw, height: rh },
    outputFrameSize: rootTarget
      ? [rw / rootTargetResolution, rh / rootTargetResolution]
      : [fw / resolution, fh / resolution],
    outputUvScale: rootTarget ? [1, 1] : [fw / pw, fh / ph],
    rootTarget,
    inputSize: [pw / resolution, ph / resolution, resolution / pw, resolution / ph],
    frameSize: [fw / resolution, fh / resolution],
    uvScale: [fw / pw, fh / ph],
    inputClamp: [0.5 / pw, 0.5 / ph, (fw - 0.5) / pw, (fh - 0.5) / ph],
    cacheBytes: bytes,
  };
}
