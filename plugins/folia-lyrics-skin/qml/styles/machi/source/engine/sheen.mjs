// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/sheen.ts
import * as THREE from '../../three.mjs';
const MACHI_GLOSS = {
  /** 墙、木头、布：湿了才有一点。 */
  matte: [0, 0.16],
  /** 车漆、贩卖机、点唱机的烤漆。 */
  paint: [0.3, 0.65],
  glass: [0.45, 0.8],
  chrome: [0.5, 0.85],
  metal: [0.16, 0.42],
  /** 路面、白线、屋面：干的时候几乎没有，湿了最亮。 */
  ground: [0.03, 0.85],
};
const PAINT_KEYS =
  /^(car|taxiBody|truckCab|truckBox|vendingBody|pumpBody|fridgeBody|jukebox|bike|scooter|stool)/;
const GLASS_KEYS = /(glass|Glass|windowDark)/;
const CHROME_KEYS = /^(chrome|mirrorPole)/;
const METAL_KEYS =
  /^(metal|darkMetal|pole|motelPole|antenna|tank|canopyColumn|acUnit|ac$|pipe|wire|signBox|screenFrame|cage|drain)/;
const GROUND_KEYS = /^(asphalt|roadPaint|curb|roofTar|roof$|canopyTop|slab)/;
const machiGlossFor = (key) => {
  if (PAINT_KEYS.test(key)) return MACHI_GLOSS.paint;
  if (GLASS_KEYS.test(key)) return MACHI_GLOSS.glass;
  if (CHROME_KEYS.test(key)) return MACHI_GLOSS.chrome;
  if (METAL_KEYS.test(key)) return MACHI_GLOSS.metal;
  if (GROUND_KEYS.test(key)) return MACHI_GLOSS.ground;
  return MACHI_GLOSS.matte;
};
const PARS =
  /* glsl */
  `
uniform vec2 uMachiGloss;
uniform float uMachiWet;
// \u70B9\u5149\u3001\u805A\u5149\u5728\u524D\uFF0C\u5E73\u884C\u5149\u5728\u540E\uFF1A\u8FDB\u5E73\u884C\u5149\u90A3\u6BB5\u4E4B\u524D\u6539\u6210 0\uFF08\u89C1\u4E0B\u9762\u5BF9 lights_fragment_begin \u7684\u6539\u52A8\uFF09\u3002
float machiLocalLight = 1.0;
void RE_Direct_Machi( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
    RE_Direct_Toon( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    float wet = uMachiWet * (1.0 - machiSheltered(vMachiWorld));
    float gloss = mix(uMachiGloss.x, uMachiGloss.y, wet);
    if (gloss > 0.001) {
        vec3 halfDir = normalize(directLight.direction + geometryViewDir);
        float nh = saturate(dot(geometryNormal, halfDir));
        // \u8D8A\u6E7F\u8D8A\u4EAE\u3001\u8D8A\u96C6\u4E2D\u3002\u706F\u79BB\u5F97\u5F88\u8FD1\u65F6\u5149\u5F88\u5F3A\uFF0C\u9AD8\u5149\u6309\u4EAE\u5EA6\u538B\u4E00\u538B\uFF0C\u4E0D\u81F3\u4E8E\u4E00\u7247\u6B7B\u767D\u3002
        float soft = pow(nh, mix(14.0, 40.0, wet)) * 0.4;
        float core = smoothstep(mix(0.955, 0.975, wet), mix(0.968, 0.985, wet), nh) * machiLocalLight;
        vec3 color = directLight.color / (1.0 + dot(directLight.color, vec3(0.3333)) * 0.8);
        reflectedLight.directDiffuse += color * gloss * (soft * mix(0.5, 1.0, machiLocalLight) + core);
    }
}
#undef RE_Direct
#define RE_Direct RE_Direct_Machi
`;
const DIRECTIONAL = '#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )';
const injectMachiSheen = (shader, uniforms, gloss) => {
  shader.uniforms.uMachiWet = uniforms.uMachiWet;
  shader.uniforms.uMachiGloss = { value: new THREE.Vector2(gloss[0], gloss[1]) };
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <lights_toon_pars_fragment>',
      `#include <lights_toon_pars_fragment>
${PARS}`,
    )
    .replace(
      '#include <lights_fragment_begin>',
      THREE.ShaderChunk.lights_fragment_begin.replace(
        DIRECTIONAL,
        `machiLocalLight = 0.0;
${DIRECTIONAL}`,
      ),
    );
};
export { MACHI_GLOSS, injectMachiSheen, machiGlossFor };
