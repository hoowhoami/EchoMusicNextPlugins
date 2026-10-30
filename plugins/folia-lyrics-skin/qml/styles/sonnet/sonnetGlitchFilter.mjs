// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { PIXI_FILTER_VERTEX as vertex } from './filter-vertex.mjs';
const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputClamp;
uniform float uAmount;
uniform float uSeed;

float hash(vec2 value) {
    return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
    float coarseBand = floor(vTextureCoord.y * 26.0);
    float fineBand = floor(vTextureCoord.y * 110.0);
    float coarseNoise = hash(vec2(coarseBand, uSeed));
    float fineNoise = hash(vec2(fineBand + 41.0, uSeed * 1.37));
    float coarseGate = step(0.58, coarseNoise);
    float fineGate = step(0.88, fineNoise);
    float coarseShift = (hash(vec2(coarseBand + 17.0, uSeed)) * 2.0 - 1.0)
        * coarseGate * uAmount * 0.095;
    float fineShift = (hash(vec2(fineBand + 73.0, uSeed)) * 2.0 - 1.0)
        * fineGate * uAmount * 0.035;
    vec2 sampleUv = vec2(vTextureCoord.x + coarseShift + fineShift, vTextureCoord.y);
    vec4 color = texture(uTexture, clamp(sampleUv, uInputClamp.xy, uInputClamp.zw));

    // Brightness tears affect every color channel equally: glitch structure without RGB dispersion.
    float tear = (coarseGate * (coarseNoise - 0.58) + fineGate * 0.12) * uAmount;
    color.rgb *= 1.0 + tear * 0.42;
    finalColor = color;
}
`,
  createSonnetGlitchEffect = (pixi) => {
    const uniforms = new pixi.UniformGroup({
        uAmount: { value: 0, type: 'f32' },
        uSeed: { value: 0, type: 'f32' },
      }),
      filter = new pixi.Filter({
        glProgram: pixi.GlProgram.from({ vertex, fragment, name: 'sonnet-mono-glitch' }),
        resources: { glitchUniforms: uniforms },
        padding: 0,
      });
    return (
      (filter.enabled = !1),
      {
        filter,
        update: (amount, seed) => {
          ((uniforms.uniforms.uAmount = amount), (uniforms.uniforms.uSeed = seed));
        },
      }
    );
  };
export { createSonnetGlitchEffect };
