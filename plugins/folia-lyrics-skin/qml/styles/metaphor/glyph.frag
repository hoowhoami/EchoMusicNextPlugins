#version 440
// Derived from Folia 8006b40f (AGPL-3.0-only). Original field/develop expressions retained.
layout(std140,binding=0) uniform buf {mat4 qt_Matrix; float qt_Opacity; vec2 viewport; vec4 camera; float uTime; float uMelt; float uPop; float uReveal; float uShakeTime; float uWobble; float uOutputTint; float uEnabled;};
layout(binding=1) uniform sampler2D uAtlas;
layout(location=0) out vec4 fragColor;
vec4 fieldColor,tintColor;
#define gl_FragColor fieldColor
#define outTint tintColor

layout(location=0) in vec2 vUv;
layout(location=1) in vec2 vTime;
layout(location=2) in vec3 vMeta;
layout(location=3) in vec2 vWorld;
layout(location=4) in vec2 vQuad;
layout(location=5) in vec3 vTint;
// 注记的字比线细，抖得比线小一点，不然笔画会断
const float NOTE_SHAKE = 0.6;
// 注记周围那圈网点往外探多远（世界单位）。字本身的那团模糊在画面上只有一两个像素，比一颗网点还小，得往外多取几下
const float NOTE_FRINGE = 0.05;

void sourceMain() {
    // 注记（结束时间是个很大的负数）和线稿是同一支笔写的：用线稿那张世界位移场把取样位置推歪（和 METAPHOR_SHAPE_FRAGMENT 里的是同一个式子）。
    float note = step(vTime.y, -10000.0);
    vec2 w = vWorld;
    vec2 shake = vec2(sin(w.y * 1.7 + uShakeTime * 0.35) + sin(w.x * 0.9 - uShakeTime * 0.2), sin(w.x * 1.3 - uShakeTime * 0.3) + sin(w.y * 1.1 + uShakeTime * 0.25)) * 0.5
        + 0.32 * vec2(sin(w.y * 7.1 + w.x * 2.3 + uShakeTime * 0.6), sin(w.x * 6.3 - w.y * 1.9 - uShakeTime * 0.5))
        + 0.12 * vec2(sin(w.y * 37.0 + w.x * 17.0) + sin(w.x * 53.0), sin(w.x * 41.0 - w.y * 13.0) + sin(w.y * 59.0));
    shake *= uWobble * NOTE_SHAKE * note;
    // 世界里的位移换成贴图坐标的位移：用屏幕上相邻像素的差解出来，字转了角度也对
    vec2 wx = dFdx(vWorld);
    vec2 wy = dFdy(vWorld);
    float det = wx.x * wy.y - wx.y * wy.x;
    float inv = abs(det) > 1e-12 ? 1.0 / det : 0.0;
    vec2 ux = dFdx(vUv);
    vec2 uy = dFdy(vUv);
    vec2 qx = dFdx(vQuad);
    vec2 qy = dFdy(vQuad);
    vec2 step2 = vec2(shake.x * wy.y - shake.y * wy.x, shake.y * wx.x - shake.x * wx.y) * inv;
    vec2 uv = vUv + ux * step2.x + uy * step2.y;
    vec2 s = texture(uAtlas, uv).rg;
    float fringe = 0.0;
    if (note > 0.5) {
        // 绕一圈取六下宽通道，取最浓的：字周围就有了和线两边一样宽的一圈。探出这一格的不算（那边是图集里别的字）
        for (int i = 0; i < 6; i++) {
            float a = float(i) * 1.0472 + 0.3;
            vec2 o = vec2(cos(a), sin(a)) * NOTE_FRINGE;
            vec2 k = vec2(o.x * wy.y - o.y * wy.x, o.y * wx.x - o.x * wx.y) * inv;
            vec2 q = vQuad + qx * k.x + qy * k.y;
            float inside = step(max(abs(q.x), abs(q.y)), 1.0);
            fringe = max(fringe, textureLod(uAtlas, uv + ux * k.x + uy * k.y, 0.0).g * inside);
        }
    }
    float dt = uTime - vTime.x;
    float on = step(0.0, dt);
    float age = max(dt, 0.0);
    // 墨凝出来：先是一团（宽通道），很快收紧成字形（紧通道）
    float set = on * (1.0 - exp(-age * 4.5));
    float bulge = on * exp(-age * 1.5);
    float keep = 1.0 - uMelt;
    float ink = s.r * set * keep * keep + s.g * (bulge * 1.25 + 0.3 * set + 0.9 * uMelt * set) * keep;
    // 没唱到的字只是一层网点的影子；唱过的字周围留一圈网点
    float tone = (s.r * (1.0 - set) * 0.85 + s.g * (0.3 + 0.45 * set)) * uReveal * keep;
    // 注记到时候直接出现：细的墨字，没有那一团；字周围留一圈淡的网点，和线两边的毛边是一回事
    ink = mix(ink, s.r * on * keep * keep * 1.12, note);
    tone = mix(tone, min(0.55, max(s.g, fringe) * 1.6) * on * keep, note);
    gl_FragColor = vec4(ink * (1.0 - vMeta.y), tone, ink * vMeta.y, 1.0);
    outTint = vec4(vTint * (ink * vMeta.y), ink * vMeta.y);
}

void main(){sourceMain();fragColor=(uOutputTint>.5?tintColor:fieldColor)*qt_Opacity*uEnabled;}
