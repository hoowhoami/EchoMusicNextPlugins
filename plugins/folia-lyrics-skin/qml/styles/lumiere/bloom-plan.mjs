// Calls the unchanged Folia bloom program; only records its native pass graph.
import { createLumiereBackend } from './backend.mjs';
import { createBloomFilter } from './source/light/bloomFilter.mjs';
const copy = (value) => JSON.parse(JSON.stringify(value));
export function createLumiereBloomPlan(width, height, resolution, options, registeredScreens = []) {
  if (
    ![width, height, resolution].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    resolution <= 0
  )
    throw new Error('Invalid Lumiere bloom extent');
  const pixi = createLumiereBackend({ registeredScreens }),
    input = pixi.TexturePool.getOptimalTexture(width, height, resolution),
    textures = [input],
    output = { root: true },
    passes = [];
  const index = (texture) => {
    let found = textures.indexOf(texture);
    if (found < 0) {
      found = textures.length;
      textures.push(texture);
    }
    return found;
  };
  const filter = createBloomFilter(pixi, options);
  try {
    filter.apply(
      {
        applyFilter(pass, from, to, clear) {
          const group = Object.keys(pass.resources)
              .map((key) => pass.resources[key])
              .find((value) => value && value.uniforms),
            uniforms = {};
          if (group)
            for (const key of Object.keys(group.uniforms)) uniforms[key] = [...group.uniforms[key]];
          const inputIndex = index(from),
            outputIndex = to === output ? -1 : index(to),
            add = pass.resources.uAdd;
          passes.push({
            kind: pass.glProgram.name.replace('lumiere-bloom-', ''),
            input: inputIndex,
            output: outputIndex,
            add: add ? index(textures.find((texture) => texture.source === add)) : null,
            clear,
            blendMode: pass.blendMode,
            uniforms,
          });
        },
      },
      input,
      output,
      true
    );
  } finally {
    filter.destroy();
  }
  const result = textures.map((texture) => ({
    width: texture.frame.width,
    height: texture.frame.height,
    pixelWidth: texture.source.pixelWidth,
    pixelHeight: texture.source.pixelHeight,
    resolution: texture.source.resolution,
    sourceWidth: texture.source.width,
    sourceHeight: texture.source.height,
  }));
  let cacheBytes = 0;
  for (const texture of result) {
    if (texture.pixelWidth > 8192 || texture.pixelHeight > 8192)
      throw new Error('Lumiere bloom texture dimension budget exceeded');
    cacheBytes += texture.pixelWidth * texture.pixelHeight * 4;
  }
  if (cacheBytes > 128 * 1024 * 1024) throw new Error('Lumiere bloom target budget exceeded');
  return {
    textures: result,
    passes,
    cacheBytes,
    width,
    height,
    resolution,
    options: copy(options),
  };
}
