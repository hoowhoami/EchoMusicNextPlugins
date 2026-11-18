// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { MAX_BEAMS, WAVE_MODE_ID } from './rig.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (105 ^ lumiereScaleMask) +
  Math.imul(97 ^ lumiereScaleMask, 3137093123 ^ lumiereScaleMask) -
  ((105 ^ lumiereScaleMask) + Math.imul(97 ^ lumiereScaleMask, 3137093123 ^ lumiereScaleMask));
const vertex = `
in vec2 aPosition;
out vec2 vPos;
out float vAlpha;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;

void main(void) {
    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
    vPos = aPosition;
    vAlpha = uColor.a * uWorldColorAlpha.a;
}
`;
const fragment = `
precision highp float;
in vec2 vPos;
in float vAlpha;
out vec4 finalColor;

#define MAX_BEAMS ${MAX_BEAMS}

uniform vec4 uBeamA[MAX_BEAMS]; // ox, oy, dx, dy
uniform vec4 uBeamB[MAX_BEAMS]; // halfWidth, tanSpread, softness, length
uniform vec4 uBeamC[MAX_BEAMS]; // intensity, streaks, streakFreq, streakPhase
uniform vec4 uBeamD[MAX_BEAMS]; // r, g, b, core
uniform vec4 uBeamE[MAX_BEAMS]; // \u7A97\u5F71\uFF1Apattern, frequency, duty, phase
uniform vec4 uBeamF[MAX_BEAMS]; // \u8272\u6563, \u5C04\u7A0B, 0, 0
uniform vec4 uFrame;            // width, height, time, beamCount
uniform vec4 uFogA;             // density, tyndallBase, scale, warp
uniform vec4 uFogB;             // driftX, driftY, ambient, octaves
uniform vec3 uFogColor;
uniform vec4 uGlare;            // x, y, radius, intensity
uniform vec4 uGlareB;           // streak, 0, 0, 0
uniform vec3 uGlareColor;
uniform vec4 uDark;             // \u6697\u573A\u5E95\uFF1A\u9884\u4E58\u989C\u8272 rgb\u3001alpha
uniform vec4 uCaustic;          // \u7126\u6563\uFF1Ascale, speed, inBeam, enabled
uniform vec4 uCausticFloor;     // \u6C60\u5E95\uFF1Acx, cy, rx, ry\uFF08\u9AD8\u5EA6\u5355\u4F4D\uFF09
uniform vec4 uCausticB;         // \u6C60\u5E95\u4EAE\u5EA6, 0, 0, 0
uniform vec4 uWave;             // \u5E72\u6D89\uFF1Amode, frequency, speed, strength
uniform vec4 uWaveB;            // cx, cy, radius, separation\uFF08\u9AD8\u5EA6\u5355\u4F4D\uFF09
uniform vec4 uShield;           // \u6587\u5B57\u533A\uFF1Acx, cy, rx, ry\uFF08\u9AD8\u5EA6\u5355\u4F4D\uFF09
uniform vec4 uShieldB;          // x\uFF1A\u6587\u5B57\u533A\u91CC\u6761\u7EB9\u538B\u6697\u591A\u5C11

float hash11(float x) {
    float p = fract(x * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float valueNoise1(float x) {
    float i = floor(x);
    float f = x - i;
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash11(i), hash11(i + 1.0), u);
}

float valueNoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = p - i;
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, float octaves) {
    float sum = 0.0;
    float amp = 0.5;
    float norm = 0.0;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 6; i++) {
        if (float(i) >= octaves) break;
        sum += amp * valueNoise2(p);
        norm += amp;
        p = rot * p * 2.03 + vec2(17.1, 9.2);
        amp *= 0.5;
    }
    return sum / max(norm, 1e-4);
}

float fog(vec2 p, float t) {
    vec2 drift = uFogB.xy * t;
    vec2 q = (p - drift) * uFogA.z;
    float octaves = uFogB.w;
    vec2 w = vec2(
        fbm(q + vec2(0.0, t * 0.07), 3.0),
        fbm(q + vec2(5.2, 1.3) - vec2(t * 0.05, 0.0), 3.0)
    );
    float n = fbm(q + uFogA.w * (w - 0.5) * 2.0, octaves);
    // \u62C9\u5F00\u5BF9\u6BD4\uFF1A\u70DF\u662F\u4E00\u7F15\u4E00\u7F15\u7684\uFF0C\u4E0D\u662F\u5747\u5300\u7684\u7070\u3002
    return smoothstep(0.28, 0.82, n);
}

// \u900F\u5149\u6761\uFF1Afract(x) \u843D\u5728 [0, duty) \u91CC\u4E3A 1\uFF0C\u8FB9\u7F18\u67D4\u5316\uFF08\u4E0E rig.ts \u7684 band \u76F8\u540C\uFF09\u3002
float band(float x, float duty) {
    float f = fract(x);
    return min(1.0, 1.0 - smoothstep(duty - 0.06, duty + 0.06, f) + smoothstep(0.94, 1.0, f));
}

// \u7A97\u5F71\u56FE\u6837\uFF1Au \u4E3A\u622A\u9762\u6A2A\u5411\u4F4D\u7F6E -1..1\uFF0Cv \u4E3A\u6CBF\u5149\u675F\u7684\u8DDD\u79BB\u3002
float goboPattern(vec4 E, float u, float v) {
    float pattern = E.x;
    if (pattern < 1.5) return band(u * E.y * 0.5 + E.w, E.z);
    if (pattern < 2.5) return smoothstep(E.z * 0.5, E.z * 0.5 + 0.08, abs(u));
    if (pattern < 3.5) return band(u * E.y * 0.5 + v * E.y * 0.8 + E.w, E.z) * band(u * E.y * 0.5 - v * E.y * 0.8 - E.w, E.z);
    return smoothstep(E.z - 0.12, E.z + 0.12, valueNoise2(vec2(u * E.y, v * E.y * 0.6 + E.w)));
}

// \u7A97\u5F71\uFF08\u4E0E rig.ts \u7684 goboMask \u76F8\u540C\uFF09\uFF1A\u5F71\u5B50\u91CC\u4ECD\u900F\u8FC7 12% \u7684\u6563\u5C04\u5149\u3002
float goboMask(vec4 E, float u, float v) {
    if (E.x < 0.5) return 1.0;
    return 0.12 + 0.88 * goboPattern(E, u, v);
}

// \u6570\u7EC4\u4E0B\u6807\u53EA\u80FD\u7528\u5FAA\u73AF\u53D8\u91CF\uFF08GLSL ES 1.0 \u7684\u9650\u5236\uFF09\uFF0C\u6240\u4EE5\u6309\u5206\u91CF\u4F20\u8FDB\u6765\u3002\u8FD4\u56DE (\u5F3A\u5EA6, \u622A\u9762\u6A2A\u5411\u4F4D\u7F6E -1..1)\u3002
vec2 beamMask(vec4 A, vec4 B, vec4 C, float coreAmount, vec4 E, float reach, vec2 p) {
    vec2 d = p - A.xy;
    float along = dot(d, A.zw);
    if (along <= 0.0) return vec2(0.0);
    float signedPerp = d.x * -A.w + d.y * A.z;
    // \u53D6\u7EDD\u5BF9\u503C\uFF1A\u4F1A\u805A\u7684\u5149\u675F\u8FC7\u4E86\u7126\u70B9\u518D\u6563\u5F00\u3002
    float half_ = abs(B.x + along * B.y) + 1e-4;
    float s = abs(signedPerp) / half_;
    float edge = smoothstep(1.0, 1.0 - max(B.z, 0.02), s);
    if (edge <= 0.0) return vec2(0.0);
    float signedS = s * sign(signedPerp);
    float streak = 1.0 - C.y + C.y * valueNoise1(signedS * C.z + C.w);
    float core = 1.0 - coreAmount + coreAmount * (1.0 - s * s);
    float falloff = exp(-along / max(B.w, 0.001));
    float reachMask = reach > 0.0 ? 1.0 - smoothstep(reach - max(0.04, half_ * 2.5), reach, along) : 1.0;
    float start = smoothstep(0.0, abs(B.x) * 2.0 + 0.01, along);
    return vec2(edge * streak * core * falloff * goboMask(E, signedS, along) * reachMask * start * C.x, signedS);
}

// \u8272\u6563\uFF1A\u622A\u9762\u6A2A\u5411\u4F4D\u7F6E -> \u5149\u8C31\u8272\uFF08\u7EA2\u5728\u4E00\u4FA7\u3001\u7D2B\u5728\u53E6\u4E00\u4FA7\uFF09\u3002
vec3 spectrumColor(float u) {
    float h = clamp(0.5 + 0.5 * u, 0.0, 1.0) * 0.8;
    vec3 k = clamp(abs(fract(vec3(h) + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
    return mix(vec3(1.0), k, 0.85);
}

// \u7126\u6563\uFF08\u6C34\u9762\u7126\u6563\u7684\u7ECF\u5178\u8FED\u4EE3\uFF0C\u53BB\u6389\u53D6\u6A21\uFF0C\u8FDE\u7EED\u4E0D\u63A5\u7F1D\uFF09\u3002
float causticField(vec2 p, float t) {
    vec2 q = p * uCaustic.x * 6.2831853 - 250.0;
    vec2 i = q;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 4; n++) {
        float tt = t * (1.0 - (3.5 / float(n + 1)));
        i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
        c += 1.0 / length(vec2(q.x / (sin(i.x + tt) / inten), q.y / (cos(i.y + tt) / inten)));
    }
    c /= 4.0;
    c = 1.17 - pow(c, 1.4);
    return clamp(pow(abs(c), 8.0), 0.0, 3.0);
}

// \u5E72\u6D89\u4E0E\u884D\u5C04\uFF1A\u5728\u4E00\u5757\u5706\u5F62\u533A\u57DF\u91CC\u53D1\u5149\u7684\u6761\u7EB9\u3002
float wavePattern(vec2 p, float t) {
    vec2 d = p - uWaveB.xy;
    float radius = max(uWaveB.z, 1e-3);
    float r = length(d) / radius;
    float mask = smoothstep(1.0, 0.55, r);
    float mode = uWave.x;
    float f = uWave.y;
    float phase = t * uWave.z;
    float v;
    if (mode < 1.5) {
        v = 0.5 + 0.5 * cos(r * r * f * 6.0 - phase);
    } else if (mode < 2.5) {
        // \u53CC\u7F1D\uFF1A\u6761\u7EB9\u79BB\u4E2D\u5FC3\u8D8A\u8FDC\u8D8A\u5F2F\uFF08\u53CC\u66F2\u7EBF\uFF09\uFF0C\u5305\u7EDC\u662F\u692D\u5706\uFF0C\u4E0D\u662F\u77E9\u5F62\u3002
        float x = d.x / radius;
        float y = d.y / radius;
        float xc = x * (1.0 + 0.35 * y * y);
        v = pow(cos(xc * f * 3.0 - phase * 0.3), 2.0) * exp(-xc * xc * 2.5);
        mask = smoothstep(1.0, 0.25, length(vec2(x * 0.85, y * 1.5)));
    } else if (mode < 3.5) {
        vec2 s1 = vec2(-uWaveB.w * 0.5, 0.0);
        float d1 = length(d - s1);
        float d2 = length(d + s1);
        v = (0.5 + 0.5 * cos((d1 - d2) * f * 20.0)) * (0.5 + 0.5 * cos((d1 + d2) * f * 6.0 - phase));
    } else {
        float x = r * f * 4.0 + 1e-3;
        float sc = sin(x) / x;
        v = min(sc * sc * 4.0, 1.5);
    }
    // \u6587\u5B57\u533A\u91CC\u538B\u6697\uFF0C\u5B57\u538B\u5728\u6761\u7EB9\u4E0A\u8FD8\u8BFB\u5F97\u6E05\u3002
    vec2 q = (p - uShield.xy) / max(uShield.zw, vec2(1e-3));
    float shield = 1.0 - uShieldB.x * smoothstep(1.0, 0.35, length(q));
    return v * mask * shield * uWave.w;
}

void main(void) {
    float H = uFrame.y;
    float t = uFrame.z;
    vec2 p = vPos / H;

    float density = fog(p, t);
    float tyndall = uFogA.y + (1.0 - uFogA.y) * density * uFogA.x;

    float caustic = uCaustic.w > 0.5 ? causticField(p, t * uCaustic.y + 23.0) : 0.0;
    float causticLift = mix(1.0, 0.25 + 1.5 * caustic, uCaustic.w > 0.5 ? uCaustic.z : 0.0);

    vec3 light = vec3(0.0);
    int count = int(uFrame.w + 0.5);
    for (int i = 0; i < MAX_BEAMS; i++) {
        if (i >= count) break;
        vec4 D = uBeamD[i];
        vec2 m = beamMask(uBeamA[i], uBeamB[i], uBeamC[i], D.w, uBeamE[i], uBeamF[i].y, p);
        vec3 color = D.rgb;
        float spectrum = uBeamF[i].x;
        if (spectrum > 0.0) color = mix(color, spectrumColor(m.y) * max(max(color.r, color.g), color.b), spectrum);
        light += color * m.x;
    }
    light *= tyndall * causticLift;

    // \u6C60\u5E95\u7684\u7126\u6563\u5149\u6591\uFF08\u4E0D\u9760\u70DF\uFF0C\u76F4\u63A5\u4EAE\uFF09\u3002
    if (uCaustic.w > 0.5 && uCausticB.x > 0.0) {
        vec2 e = (p - uCausticFloor.xy) / max(uCausticFloor.zw, vec2(1e-3));
        light += uFogColor * caustic * uCausticB.x * smoothstep(1.0, 0.6, length(e));
    }
    // \u5E72\u6D89\u6761\u7EB9\u3002
    if (uWave.x > 0.5) light += uFogColor * wavePattern(p, t);

    // \u5149\u675F\u4E4B\u5916\u7684\u70DF\uFF1A\u5F88\u6DE1\uFF0C\u53EA\u7ED9\u6697\u573A\u4E00\u70B9\u7A7A\u95F4\u611F\u3002
    light += uFogColor * density * uFogB.z;

    // \u5149\u6E90\u7729\u5149\uFF1A\u4EAE\u6838 + \u5927\u534A\u5F84\u67D4\u5149 + \u6A2A\u5411\u62C9\u4E1D\u3002
    if (uGlare.w > 0.0) {
        vec2 g = p - uGlare.xy;
        float r = max(uGlare.z, 1e-3);
        float dist = length(g);
        float glare = exp(-dist / r) * 0.55 + exp(-(dist * dist) / (r * r * 0.03));
        float streak = exp(-abs(g.y) / (r * 0.035)) * exp(-abs(g.x) / (r * 7.0)) * uGlareB.x;
        light += uGlareColor * (glare + streak) * uGlare.w;
    }

    // \u4FDD\u6301\u8272\u76F8\u7684\u538B\u7F29\uFF1A\u6309\u6700\u5927\u901A\u9053\u538B\u5230 0..1\uFF0C\u53EA\u5728\u6781\u4EAE\u5904\u5FAE\u5FAE\u53D1\u767D\uFF08\u9010\u901A\u9053\u538B\u7F29\u4F1A\u628A\u91D1\u8272\u538B\u6210\u767D\u8272\uFF09\u3002
    float peak = max(max(light.r, light.g), light.b);
    float mapped = 1.0 - exp(-peak);
    vec3 c = peak > 1e-5 ? light / peak * mapped : vec3(0.0);
    c = mix(c, vec3(mapped), 0.3 * mapped * mapped * mapped);
    // \u6296\u52A8\uFF0C\u514D\u5F97\u6697\u90E8\u6E10\u53D8\u5728 8 \u4F4D\u89C6\u9891\u91CC\u51FA\u8272\u5E26\uFF08\u6309\u50CF\u7D20\u5750\u6807\uFF0C\u786E\u5B9A\u6027\uFF09\u3002
    c += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
    c = clamp(c, 0.0, 1.0);
    float a = max(max(c.r, c.g), c.b);

    // \u53E0\u5728\u6697\u573A\u5E95\u4E0A\uFF08\u9884\u4E58\u7684 over\uFF09\u3002
    vec3 rgb = c + uDark.rgb * (1.0 - a);
    float alpha = a + uDark.a * (1.0 - a);
    finalColor = vec4(rgb, alpha) * vAlpha;
}
`;
const createLightField = (pixi, width, height, margin = 0) => {
  const x0 = -margin;
  const y0 = -margin;
  const x1 = width + margin;
  const y1 = height + margin;
  const geometry = new pixi.Geometry({
    attributes: {
      aPosition: [x0, y0, x1, y0, x1, y1, x0, y1],
    },
    indexBuffer: [0, 1, 2, 0, 2, 3],
  });
  const uniforms = new pixi.UniformGroup({
    uBeamA: { value: new Float32Array(MAX_BEAMS * 4), type: 'vec4<f32>', size: MAX_BEAMS },
    uBeamB: { value: new Float32Array(MAX_BEAMS * 4), type: 'vec4<f32>', size: MAX_BEAMS },
    uBeamC: { value: new Float32Array(MAX_BEAMS * 4), type: 'vec4<f32>', size: MAX_BEAMS },
    uBeamD: { value: new Float32Array(MAX_BEAMS * 4), type: 'vec4<f32>', size: MAX_BEAMS },
    uBeamE: { value: new Float32Array(MAX_BEAMS * 4), type: 'vec4<f32>', size: MAX_BEAMS },
    uBeamF: { value: new Float32Array(MAX_BEAMS * 4), type: 'vec4<f32>', size: MAX_BEAMS },
    uFrame: { value: new Float32Array([width, height, 0, 0]), type: 'vec4<f32>' },
    uFogA: { value: new Float32Array(4), type: 'vec4<f32>' },
    uFogB: { value: new Float32Array(4), type: 'vec4<f32>' },
    uFogColor: { value: new Float32Array(3), type: 'vec3<f32>' },
    uGlare: { value: new Float32Array(4), type: 'vec4<f32>' },
    uGlareB: { value: new Float32Array(4), type: 'vec4<f32>' },
    uGlareColor: { value: new Float32Array(3), type: 'vec3<f32>' },
    uDark: { value: new Float32Array(4), type: 'vec4<f32>' },
    uCaustic: { value: new Float32Array(4), type: 'vec4<f32>' },
    uCausticFloor: { value: new Float32Array(4), type: 'vec4<f32>' },
    uCausticB: { value: new Float32Array(4), type: 'vec4<f32>' },
    uWave: { value: new Float32Array(4), type: 'vec4<f32>' },
    uWaveB: { value: new Float32Array(4), type: 'vec4<f32>' },
    uShield: { value: new Float32Array(4), type: 'vec4<f32>' },
    uShieldB: { value: new Float32Array(4), type: 'vec4<f32>' },
  });
  const shader = new pixi.Shader({
    glProgram: pixi.GlProgram.from({ vertex, fragment, name: 'lumiere-light-field' }),
    resources: { lightUniforms: uniforms },
  });
  const mesh = new pixi.Mesh({ geometry, shader });
  const u = uniforms.uniforms;
  const update = (frame) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u;
    const { beams, rig, time } = frame;
    const A = u.uBeamA,
      B = u.uBeamB,
      C = u.uBeamC,
      D = u.uBeamD,
      E = u.uBeamE,
      F = u.uBeamF;
    A.fill(0);
    B.fill(0);
    C.fill(0);
    D.fill(0);
    E.fill(0);
    F.fill(0);
    beams.forEach((beam, index) => {
      const o = index * (4 + LUMIERE_NEUTRAL_OFFSET);
      A[o] = beam.ox;
      A[o + 1] = beam.oy;
      A[o + 2] = beam.dx;
      A[o + 3] = beam.dy;
      B[o] = beam.halfWidth;
      B[o + 1] = beam.tanSpread;
      B[o + 2] = beam.softness;
      B[o + 3] = beam.length;
      C[o] = beam.intensity;
      C[o + 1] = beam.streaks;
      C[o + 2] = beam.streakFreq;
      C[o + 3] = beam.streakPhase;
      D[o] = beam.r;
      D[o + 1] = beam.g;
      D[o + 2] = beam.b;
      D[o + 3] = beam.core;
      E[o] = beam.goboPattern;
      E[o + 1] = beam.goboFreq;
      E[o + 2] = beam.goboDuty;
      E[o + 3] = beam.goboPhase;
      F[o] = beam.spectrum;
      F[o + 1] = beam.reach;
    });
    u.uFrame[0] = width;
    u.uFrame[1] = height;
    u.uFrame[2] = time;
    u.uFrame[3] = beams.length;
    const fog = rig.fog;
    u.uFogA[0] = fog.density * frame.fogScale;
    u.uFogA[1] = fog.tyndallBase;
    u.uFogA[2] = fog.scale;
    u.uFogA[3] = fog.warp;
    u.uFogB[0] = fog.driftX;
    u.uFogB[1] = fog.driftY;
    u.uFogB[2] = fog.ambient * frame.fogScale;
    u.uFogB[3] = frame.octaves;
    u.uFogColor[0] = frame.color[0];
    u.uFogColor[1] = frame.color[1];
    u.uFogColor[2] = frame.color[2];
    const glare = rig.glare;
    const aspect = width / height;
    u.uGlare[0] = glare ? glare.x * aspect : 0;
    u.uGlare[1] = glare ? glare.y : 0;
    u.uGlare[2] = glare ? glare.radius : 0;
    u.uGlare[3] = glare ? glare.intensity * frame.glareScale : 0;
    u.uGlareB[0] = glare ? glare.streak : 0;
    u.uGlareColor[0] = frame.color[0];
    u.uGlareColor[1] = frame.color[1];
    u.uGlareColor[2] = frame.color[2];
    u.uDark.set(frame.dark);
    const caustic = rig.caustic;
    u.uCaustic[0] = (_a = caustic == null ? void 0 : caustic.scale) != null ? _a : 0;
    u.uCaustic[1] = (_b = caustic == null ? void 0 : caustic.speed) != null ? _b : 0;
    u.uCaustic[2] = (_c = caustic == null ? void 0 : caustic.inBeam) != null ? _c : 0;
    u.uCaustic[3] = caustic ? 1 : 0;
    u.uCausticFloor[0] =
      ((_e = (_d = caustic == null ? void 0 : caustic.floor) == null ? void 0 : _d.cx) != null
        ? _e
        : 0) * aspect;
    u.uCausticFloor[1] =
      (_g = (_f = caustic == null ? void 0 : caustic.floor) == null ? void 0 : _f.cy) != null
        ? _g
        : 0;
    u.uCausticFloor[2] =
      ((_i = (_h = caustic == null ? void 0 : caustic.floor) == null ? void 0 : _h.rx) != null
        ? _i
        : 0) * aspect;
    u.uCausticFloor[3] =
      (_k = (_j = caustic == null ? void 0 : caustic.floor) == null ? void 0 : _j.ry) != null
        ? _k
        : 0;
    u.uCausticB[0] =
      ((_m = (_l = caustic == null ? void 0 : caustic.floor) == null ? void 0 : _l.strength) != null
        ? _m
        : 0) * frame.glareScale;
    const wave = rig.wave;
    u.uWave[0] = wave ? WAVE_MODE_ID[wave.mode] : 0;
    u.uWave[1] = (_n = wave == null ? void 0 : wave.frequency) != null ? _n : 0;
    u.uWave[2] = (_o = wave == null ? void 0 : wave.speed) != null ? _o : 0;
    u.uWave[3] = ((_p = wave == null ? void 0 : wave.strength) != null ? _p : 0) * frame.glareScale;
    u.uWaveB[0] = ((_q = wave == null ? void 0 : wave.cx) != null ? _q : 0) * aspect;
    u.uWaveB[1] = (_r = wave == null ? void 0 : wave.cy) != null ? _r : 0;
    u.uWaveB[2] = (_s = wave == null ? void 0 : wave.radius) != null ? _s : 0;
    u.uWaveB[3] = (_t = wave == null ? void 0 : wave.separation) != null ? _t : 0;
    const region = frame.textRegion;
    u.uShield[0] = region ? region.cx * aspect : 0;
    u.uShield[1] = region ? region.cy : 0;
    u.uShield[2] = region ? (region.w * aspect) / 2 : 1;
    u.uShield[3] = region ? region.h / 2 : 1;
    u.uShieldB[0] = region && wave ? ((_u = wave.shield) != null ? _u : 0.45) : 0;
    uniforms.update();
  };
  return {
    view: mesh,
    update,
    destroy: () => {
      mesh.destroy();
      geometry.destroy(true);
      shader.destroy();
    },
  };
};
export { createLightField };
