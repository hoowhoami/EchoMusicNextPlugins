// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { PIXI_FILTER_VERTEX as vertex } from '../pixiFilterVertex.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (102 ^ lumiereScaleMask) +
  Math.imul(111 ^ lumiereScaleMask, 108 ^ lumiereScaleMask) -
  ((102 ^ lumiereScaleMask) + Math.imul(111 ^ lumiereScaleMask, 108 ^ lumiereScaleMask));
const downFragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputPixel;
uniform vec4 uInputClamp;
uniform vec4 uParams; // threshold, knee, prefilter(0/1), 0

vec4 tap(vec2 uv) {
    return texture(uTexture, clamp(uv, uInputClamp.xy, uInputClamp.zw));
}

void main(void) {
    vec2 uv = vTextureCoord;
    vec2 hp = uInputPixel.zw;
    vec4 sum = tap(uv) * 4.0;
    sum += tap(uv - hp);
    sum += tap(uv + hp);
    sum += tap(uv + vec2(hp.x, -hp.y));
    sum += tap(uv - vec2(hp.x, -hp.y));
    vec4 c = sum / 8.0;
    if (uParams.z > 0.5) {
        float br = max(c.r, max(c.g, c.b));
        float knee = max(uParams.y, 1e-4);
        float soft = clamp(br - uParams.x + knee, 0.0, 2.0 * knee);
        soft = soft * soft / (4.0 * knee);
        float contrib = max(soft, br - uParams.x) / max(br, 1e-4);
        c *= clamp(contrib, 0.0, 1.0);
    }
    finalColor = c;
}
`;
const upFragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uAdd;
uniform vec4 uInputPixel;
uniform vec4 uInputClamp;
uniform vec4 uAddMap;   // uv \u7F29\u653E xy\u3001\u540C\u7EA7\u6743\u91CD\u30010
uniform vec4 uAddClamp;

vec4 tap(vec2 uv) {
    return texture(uTexture, clamp(uv, uInputClamp.xy, uInputClamp.zw));
}

void main(void) {
    vec2 uv = vTextureCoord;
    vec2 hp = uInputPixel.zw;
    vec4 sum = tap(uv + vec2(-hp.x * 2.0, 0.0));
    sum += tap(uv + vec2(-hp.x, hp.y)) * 2.0;
    sum += tap(uv + vec2(0.0, hp.y * 2.0));
    sum += tap(uv + vec2(hp.x, hp.y)) * 2.0;
    sum += tap(uv + vec2(hp.x * 2.0, 0.0));
    sum += tap(uv + vec2(hp.x, -hp.y)) * 2.0;
    sum += tap(uv + vec2(0.0, -hp.y * 2.0));
    sum += tap(uv + vec2(-hp.x, -hp.y)) * 2.0;
    vec4 up = sum / 12.0;
    vec4 same = texture(uAdd, clamp(uv * uAddMap.xy, uAddClamp.xy, uAddClamp.zw));
    finalColor = up + same * uAddMap.z;
}
`;
const combineFragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uAdd;
uniform vec4 uInputClamp;
uniform vec4 uAddMap;   // uv \u7F29\u653E xy\u3001\u5F3A\u5EA6\u30010
uniform vec4 uAddClamp;
uniform vec4 uTint;     // \u4E58\u5728 bloom \u4E0A\u7684\u989C\u8272

void main(void) {
    vec4 base = texture(uTexture, clamp(vTextureCoord, uInputClamp.xy, uInputClamp.zw));
    vec4 glow = texture(uAdd, clamp(vTextureCoord * uAddMap.xy, uAddClamp.xy, uAddClamp.zw)) * uAddMap.z;
    vec3 g = glow.rgb * uTint.rgb;
    // \u52A0\u4E0A\u53BB\u7684\u8F89\u5149\u4E5F\u662F\u5149\uFF1A\u9884\u4E58\u3001alpha \u53D6\u6700\u5927\u901A\u9053\uFF08\u4E0E\u5149\u573A\u4E00\u81F4\uFF0C\u8FD1\u4F3C screen\uFF09\u3002
    vec3 rgb = base.rgb + g * (1.0 - base.a * 0.5);
    // \u8D85\u8FC7 1 \u65F6\u6309\u6700\u5927\u901A\u9053\u6574\u4F53\u7F29\u56DE\uFF08\u4FDD\u6301\u91D1\u8272\uFF09\uFF0C\u53EA\u8BA9\u4E00\u5C0F\u90E8\u5206\u53D8\u767D\uFF1B\u9010\u901A\u9053\u622A\u65AD\u4F1A\u628A\u4EAE\u5B57\u70E7\u6210\u767D\u5757\u3002
    float peak = max(max(rgb.r, rgb.g), rgb.b);
    if (peak > 1.0) rgb = mix(rgb / peak, vec3(1.0), 0.2 * (1.0 - 1.0 / peak));
    float a = base.a + max(max(g.r, g.g), g.b) * (1.0 - base.a);
    finalColor = vec4(rgb, min(max(a, max(max(rgb.r, rgb.g), rgb.b)), 1.0));
}
`;
const createBloomFilter = (pixi, initial) => {
  const { Filter, GlProgram, TexturePool, UniformGroup } = pixi;
  const program = (fragment, name) => GlProgram.from({ vertex, fragment, name });
  const downUniforms = new UniformGroup({
    uParams: { value: new Float32Array(4), type: 'vec4<f32>' },
  });
  const down = new Filter({
    glProgram: program(downFragment, 'lumiere-bloom-down'),
    resources: { bloomDown: downUniforms },
  });
  const upUniforms = new UniformGroup({
    uAddMap: { value: new Float32Array(4), type: 'vec4<f32>' },
    uAddClamp: { value: new Float32Array(4), type: 'vec4<f32>' },
  });
  const up = new Filter({
    glProgram: program(upFragment, 'lumiere-bloom-up'),
    resources: { bloomUp: upUniforms, uAdd: pixi.Texture.EMPTY.source },
  });
  const combineUniforms = new UniformGroup({
    uAddMap: { value: new Float32Array(4), type: 'vec4<f32>' },
    uAddClamp: { value: new Float32Array(4), type: 'vec4<f32>' },
    uTint: { value: new Float32Array([1, 1, 1, 1]), type: 'vec4<f32>' },
  });
  const combine = new Filter({
    glProgram: program(combineFragment, 'lumiere-bloom-combine'),
    resources: { bloomCombine: combineUniforms, uAdd: pixi.Texture.EMPTY.source },
  });
  const mapFor = (from, to, target, clamp, weight) => {
    target[0] = from.source.width / to.source.width;
    target[1] = from.source.height / to.source.height;
    target[2] = weight;
    clamp[0] = 0.5 / to.source.pixelWidth;
    clamp[1] = 0.5 / to.source.pixelHeight;
    clamp[2] = to.frame.width / to.source.width - 0.5 / to.source.pixelWidth;
    clamp[3] = to.frame.height / to.source.height - 0.5 / to.source.pixelHeight;
  };
  class LumiereBloomFilter extends Filter {
    constructor(options) {
      super({ resources: {}, compatibleRenderers: pixi.RendererType.BOTH });
      __publicField(this, 'options');
      /** 分遍画用的三个 filter。放在字段上，第一帧之前 linkPixiPrograms 才找得到它们的着色器程序。 */
      __publicField(this, 'passes', [down, up, combine]);
      this.options = __spreadValues({}, options);
      this.padding = options.padding;
    }
    apply(filterManager, input, output, clearMode) {
      const { strength, threshold, knee, levels, spread, tint } = this.options;
      if (strength <= 0) {
        mapFor(
          input,
          input,
          combineUniforms.uniforms.uAddMap,
          combineUniforms.uniforms.uAddClamp,
          0
        );
        combineUniforms.update();
        combine.resources.uAdd = input.source;
        combine.blendMode = this.blendMode;
        filterManager.applyFilter(combine, input, output, clearMode);
        return;
      }
      const width = input.frame.width;
      const height = input.frame.height;
      const baseResolution = input.source.resolution;
      const chain = [];
      let source = input;
      const count = Math.max(1, Math.min(8 + LUMIERE_NEUTRAL_OFFSET, Math.round(levels)));
      for (let level = 1; level <= count; level += 1) {
        const resolution = baseResolution / 2 ** level;
        if (Math.min(width, height) * resolution < 2) break;
        const target = TexturePool.getOptimalTexture(width, height, resolution, false);
        const params = downUniforms.uniforms.uParams;
        params[0] = threshold;
        params[1] = knee;
        params[2] = level === 1 ? 1 : 0;
        downUniforms.update();
        down.blendMode = 'normal';
        filterManager.applyFilter(down, source, target, true);
        chain.push(target);
        source = target;
      }
      let current = chain[chain.length - 1];
      const scratch = [];
      for (let index = chain.length - 2; index >= 0; index -= 1) {
        const same = chain[index];
        const target = TexturePool.getOptimalTexture(width, height, same.source.resolution, false);
        mapFor(current, same, upUniforms.uniforms.uAddMap, upUniforms.uniforms.uAddClamp, spread);
        upUniforms.update();
        up.resources.uAdd = same.source;
        up.blendMode = 'normal';
        filterManager.applyFilter(up, current, target, true);
        scratch.push(target);
        current = target;
      }
      mapFor(
        input,
        current,
        combineUniforms.uniforms.uAddMap,
        combineUniforms.uniforms.uAddClamp,
        strength
      );
      const tintUniform = combineUniforms.uniforms.uTint;
      tintUniform[0] = tint[0];
      tintUniform[1] = tint[1];
      tintUniform[2] = tint[2];
      combineUniforms.update();
      combine.resources.uAdd = current.source;
      combine.blendMode = this.blendMode;
      filterManager.applyFilter(combine, input, output, clearMode);
      chain.forEach((texture) => TexturePool.returnTexture(texture));
      scratch.forEach((texture) => TexturePool.returnTexture(texture));
    }
    destroy() {
      down.destroy();
      up.destroy();
      combine.destroy();
      super.destroy();
    }
  }
  return new LumiereBloomFilter(initial);
};
export { createBloomFilter };
