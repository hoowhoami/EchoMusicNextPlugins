#version 440
// Derived from Folia 8006b40f (AGPL-3.0-only). Original field/develop expressions retained.
layout(std140,binding=0) uniform buf {mat4 qt_Matrix; float qt_Opacity; vec2 viewport; vec4 camera; float uTime; float uWobble; vec3 uAccent; float uOutputTint; float uEnabled; float uCount;};

layout(location=0) out vec4 fragColor;
vec4 fieldColor,tintColor;
#define gl_FragColor fieldColor
#define outTint tintColor

layout(location=0) in vec2 vL;
layout(location=1) in vec2 vWorld;
layout(location=2) in vec2 vTurn;
layout(location=3) in vec3 vMix;
layout(location=4) in float vShape;
layout(location=5) in float vParam;
layout(location=6) in vec2 vScale;

// 线稿的线的半宽（世界单位），和 metaphorFigures.ts 的 STROKE 一致
const float STROKE = 0.016;
// 线两边那圈网点有多宽
const float FRINGE = 0.11;

void sourceMain() {
    // 手抖：整个世界共用一张位移场（大的慢慢晃、中的、细碎的三层），同一个地方的线和点挪得一样，接头不会散开。
    // 细碎的那层不随时间动：它是纸的毛糙，线的边缘靠它变毛。
    vec2 w = vWorld;
    vec2 shake = vec2(sin(w.y * 1.7 + uTime * 0.35) + sin(w.x * 0.9 - uTime * 0.2), sin(w.x * 1.3 - uTime * 0.3) + sin(w.y * 1.1 + uTime * 0.25)) * 0.5
        + 0.32 * vec2(sin(w.y * 7.1 + w.x * 2.3 + uTime * 0.6), sin(w.x * 6.3 - w.y * 1.9 - uTime * 0.5))
        + 0.12 * vec2(sin(w.y * 37.0 + w.x * 17.0) + sin(w.x * 53.0), sin(w.x * 41.0 - w.y * 13.0) + sin(w.y * 59.0));
    shake *= uWobble;
    // 位移场是世界方向的，转回这一格自己的方向
    vec2 L = vL + vec2(shake.x * vTurn.x + shake.y * vTurn.y, shake.y * vTurn.x - shake.x * vTurn.y);
    float inked = min(1.0, vMix.x + vMix.z);
    float core;
    float halo;
    if (vShape < 0.5) {
        // 融球：中间高、边上平滑落到 0，几个挨近了相加就连成一片
        vec2 q = L / vScale;
        float k = max(0.0, 1.0 - dot(q, q));
        core = k * k * k * 1.45;
        halo = k * k * 0.55;
        gl_FragColor = vec4(core * vMix.x, k * k * vMix.y * 0.6 + halo * (vMix.x + vMix.z), core * vMix.z, 1.0);
        outTint = vec4(uAccent * (core * vMix.z), core * vMix.z);
        return;
    }
    if (vShape < 1.5) {
        // 圆环：一道细的环带
        float band = abs(length(L / vScale) - 0.88);
        core = 1.0 - smoothstep(0.012, 0.03, band);
        halo = 1.0 - smoothstep(0.02, 0.12, band);
        gl_FragColor = vec4(core * vMix.x, core * vMix.y + halo * 0.35, core * vMix.z, 1.0);
        outTint = vec4(uAccent * (core * vMix.z), core * vMix.z);
        return;
    }
    // 细线、圆弧、波浪线：先算到线的中心有多远（d）和线的半宽（reach）
    float d;
    float reach = STROKE;
    float cut = 1.0;
    if (vShape < 2.5) {
        // 细线（也是版面里的色带）：一个长方形；param 大于 0 时切成那么多段虚线
        reach = vScale.y;
        d = max(abs(L.y), abs(L.x) - vScale.x + reach);
        if (vParam > 0.5) cut = step(fract((L.x / vScale.x * 0.5 + 0.5) * vParam + 0.25), 0.55);
    } else if (vShape < 3.5) {
        // 圆弧：线宽按世界单位算，不跟着半径变粗；只画转角两边 param × π 以内的那一段
        reach = STROKE * vScale.y;
        d = abs(length(L) - 0.9 * vScale.x);
        cut = step(abs(atan(L.y, L.x)), vParam * 3.14159 + 0.001);
    } else {
        // 波浪线：param 个半波，两头都落在零点上；到曲线的距离按斜率折算
        float phase = 1.5708 * vParam * (L.x / vScale.x + 1.0);
        float amp = vScale.y * 0.75;
        float slope = amp * cos(phase) * 1.5708 * vParam / vScale.x;
        d = abs(L.y - amp * sin(phase)) / sqrt(1.0 + slope * slope);
        cut = step(abs(L.x), vScale.x);
    }
    // 线的边是一道缓坡，不是一刀切：显影时阈值被噪点搅过，缓坡上切出来的边才是毛的
    float soft = min(reach, STROKE);
    core = (1.0 - smoothstep(reach - soft * 0.8, reach + soft * 1.4, d)) * cut;
    // 墨线两边一圈网点：线不是干干净净浮在纸上的
    halo = (1.0 - smoothstep(reach, reach + FRINGE, d)) * cut * max(inked * 0.55, vMix.y * 0.4);
    gl_FragColor = vec4(core * vMix.x, core * vMix.y + halo, core * vMix.z, 1.0);
    outTint = vec4(uAccent * (core * vMix.z), core * vMix.z);
}

void main(){sourceMain();fragColor=(uOutputTint>.5?tintColor:fieldColor)*qt_Opacity*uEnabled;}
