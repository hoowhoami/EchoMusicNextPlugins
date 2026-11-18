#version 440
// Folia a8da4437 AGPL-3.0-only: original light-field formulas.
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 uExtent;vec2 uOrigin;float uPhysicalHeight;vec4 uBeamA0;
vec4 uBeamA1;
vec4 uBeamA2;
vec4 uBeamA3;
vec4 uBeamA4;
vec4 uBeamA5;
vec4 uBeamB0;
vec4 uBeamB1;
vec4 uBeamB2;
vec4 uBeamB3;
vec4 uBeamB4;
vec4 uBeamB5;
vec4 uBeamC0;
vec4 uBeamC1;
vec4 uBeamC2;
vec4 uBeamC3;
vec4 uBeamC4;
vec4 uBeamC5;
vec4 uBeamD0;
vec4 uBeamD1;
vec4 uBeamD2;
vec4 uBeamD3;
vec4 uBeamD4;
vec4 uBeamD5;
vec4 uBeamE0;
vec4 uBeamE1;
vec4 uBeamE2;
vec4 uBeamE3;
vec4 uBeamE4;
vec4 uBeamE5;
vec4 uBeamF0;
vec4 uBeamF1;
vec4 uBeamF2;
vec4 uBeamF3;
vec4 uBeamF4;
vec4 uBeamF5;
vec4 uFrame;
vec4 uFogA;
vec4 uFogB;
vec3 uFogColor;
vec4 uGlare;
vec4 uGlareB;
vec3 uGlareColor;
vec4 uDark;
vec4 uCaustic;
vec4 uCausticFloor;
vec4 uCausticB;
vec4 uWave;
vec4 uWaveB;
vec4 uShield;
vec4 uShieldB;};
#define vPos (qt_TexCoord0*uExtent+uOrigin)
vec2 sourceFragCoord(){return vec2(gl_FragCoord.x,uPhysicalHeight-gl_FragCoord.y);}
vec4 beamA(int index){if(index==0)return uBeamA0;if(index==1)return uBeamA1;if(index==2)return uBeamA2;if(index==3)return uBeamA3;if(index==4)return uBeamA4;return uBeamA5;}
vec4 beamB(int index){if(index==0)return uBeamB0;if(index==1)return uBeamB1;if(index==2)return uBeamB2;if(index==3)return uBeamB3;if(index==4)return uBeamB4;return uBeamB5;}
vec4 beamC(int index){if(index==0)return uBeamC0;if(index==1)return uBeamC1;if(index==2)return uBeamC2;if(index==3)return uBeamC3;if(index==4)return uBeamC4;return uBeamC5;}
vec4 beamD(int index){if(index==0)return uBeamD0;if(index==1)return uBeamD1;if(index==2)return uBeamD2;if(index==3)return uBeamD3;if(index==4)return uBeamD4;return uBeamD5;}
vec4 beamE(int index){if(index==0)return uBeamE0;if(index==1)return uBeamE1;if(index==2)return uBeamE2;if(index==3)return uBeamE3;if(index==4)return uBeamE4;return uBeamE5;}
vec4 beamF(int index){if(index==0)return uBeamF0;if(index==1)return uBeamF1;if(index==2)return uBeamF2;if(index==3)return uBeamF3;if(index==4)return uBeamF4;return uBeamF5;}






#define MAX_BEAMS 6


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
    // 拉开对比：烟是一缕一缕的，不是均匀的灰。
    return smoothstep(0.28, 0.82, n);
}

// 透光条：fract(x) 落在 [0, duty) 里为 1，边缘柔化（与 rig.ts 的 band 相同）。
float band(float x, float duty) {
    float f = fract(x);
    return min(1.0, 1.0 - smoothstep(duty - 0.06, duty + 0.06, f) + smoothstep(0.94, 1.0, f));
}

// 窗影图样：u 为截面横向位置 -1..1，v 为沿光束的距离。
float goboPattern(vec4 E, float u, float v) {
    float pattern = E.x;
    if (pattern < 1.5) return band(u * E.y * 0.5 + E.w, E.z);
    if (pattern < 2.5) return smoothstep(E.z * 0.5, E.z * 0.5 + 0.08, abs(u));
    if (pattern < 3.5) return band(u * E.y * 0.5 + v * E.y * 0.8 + E.w, E.z) * band(u * E.y * 0.5 - v * E.y * 0.8 - E.w, E.z);
    return smoothstep(E.z - 0.12, E.z + 0.12, valueNoise2(vec2(u * E.y, v * E.y * 0.6 + E.w)));
}

// 窗影（与 rig.ts 的 goboMask 相同）：影子里仍透过 12% 的散射光。
float goboMask(vec4 E, float u, float v) {
    if (E.x < 0.5) return 1.0;
    return 0.12 + 0.88 * goboPattern(E, u, v);
}

// 数组下标只能用循环变量（GLSL ES 1.0 的限制），所以按分量传进来。返回 (强度, 截面横向位置 -1..1)。
vec2 beamMask(vec4 A, vec4 B, vec4 C, float coreAmount, vec4 E, float reach, vec2 p) {
    vec2 d = p - A.xy;
    float along = dot(d, A.zw);
    if (along <= 0.0) return vec2(0.0);
    float signedPerp = d.x * -A.w + d.y * A.z;
    // 取绝对值：会聚的光束过了焦点再散开。
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

// 色散：截面横向位置 -> 光谱色（红在一侧、紫在另一侧）。
vec3 spectrumColor(float u) {
    float h = clamp(0.5 + 0.5 * u, 0.0, 1.0) * 0.8;
    vec3 k = clamp(abs(fract(vec3(h) + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
    return mix(vec3(1.0), k, 0.85);
}

// 焦散（水面焦散的经典迭代，去掉取模，连续不接缝）。
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

// 干涉与衍射：在一块圆形区域里发光的条纹。
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
        // 双缝：条纹离中心越远越弯（双曲线），包络是椭圆，不是矩形。
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
    // 文字区里压暗，字压在条纹上还读得清。
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
        vec4 D = beamD(i);
        vec2 m = beamMask(beamA(i), beamB(i), beamC(i), D.w, beamE(i), beamF(i).y, p);
        vec3 color = D.rgb;
        float spectrum = beamF(i).x;
        if (spectrum > 0.0) color = mix(color, spectrumColor(m.y) * max(max(color.r, color.g), color.b), spectrum);
        light += color * m.x;
    }
    light *= tyndall * causticLift;

    // 池底的焦散光斑（不靠烟，直接亮）。
    if (uCaustic.w > 0.5 && uCausticB.x > 0.0) {
        vec2 e = (p - uCausticFloor.xy) / max(uCausticFloor.zw, vec2(1e-3));
        light += uFogColor * caustic * uCausticB.x * smoothstep(1.0, 0.6, length(e));
    }
    // 干涉条纹。
    if (uWave.x > 0.5) light += uFogColor * wavePattern(p, t);

    // 光束之外的烟：很淡，只给暗场一点空间感。
    light += uFogColor * density * uFogB.z;

    // 光源眩光：亮核 + 大半径柔光 + 横向拉丝。
    if (uGlare.w > 0.0) {
        vec2 g = p - uGlare.xy;
        float r = max(uGlare.z, 1e-3);
        float dist = length(g);
        float glare = exp(-dist / r) * 0.55 + exp(-(dist * dist) / (r * r * 0.03));
        float streak = exp(-abs(g.y) / (r * 0.035)) * exp(-abs(g.x) / (r * 7.0)) * uGlareB.x;
        light += uGlareColor * (glare + streak) * uGlare.w;
    }

    // 保持色相的压缩：按最大通道压到 0..1，只在极亮处微微发白（逐通道压缩会把金色压成白色）。
    float peak = max(max(light.r, light.g), light.b);
    float mapped = 1.0 - exp(-peak);
    vec3 c = peak > 1e-5 ? light / peak * mapped : vec3(0.0);
    c = mix(c, vec3(mapped), 0.3 * mapped * mapped * mapped);
    // 抖动，免得暗部渐变在 8 位视频里出色带（按像素坐标，确定性）。
    c += (hash12(sourceFragCoord()) - 0.5) / 255.0;
    c = clamp(c, 0.0, 1.0);
    float a = max(max(c.r, c.g), c.b);

    // 叠在暗场底上（预乘的 over）。
    vec3 rgb = c + uDark.rgb * (1.0 - a);
    float alpha = a + uDark.a * (1.0 - a);
    fragColor = vec4(rgb, alpha) * qt_Opacity;
}
