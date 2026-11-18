#version 440
// Derived from Folia 8006b40f (AGPL-3.0-only). Original field/develop expressions retained.
layout(std140,binding=0) uniform buf {mat4 qt_Matrix; float qt_Opacity; vec2 uRes; float uPixelRatio; float uTime; float uFlow; float uGrain; float uDot; float uAngle; float uFlood; float uInvert; float uSeed; float uSeeThrough; vec3 uPaper; vec3 uInk; vec3 uAccent; vec3 uTone;};
layout(binding=1) uniform sampler2D uField;
layout(binding=2) uniform sampler2D uTint;
layout(location=0) out vec4 fragColor;

layout(location=0) in vec2 vUv;

// 坐标是整像素、数值大：用这个不带 sin 的散列，便宜的那种在大坐标上会排出一列列竖纹
float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
    // CSS 像素：网点、颗粒的大小不跟着屏幕的像素密度变
    vec2 frag = vUv * uRes / uPixelRatio;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(vUv.x * aspect, vUv.y);
    // 流场每秒 8 格，颗粒每秒 6 格
    float tq = floor(uTime * 8.0) / 8.0;
    float beat = floor(uTime * 6.0);

    // 流场：一层大的慢慢推，一层小的抖
    vec2 warp = (vec2(vnoise(p * 3.2 + vec2(0.0, tq * 0.16)), vnoise(p * 3.2 + vec2(17.3, -tq * 0.13))) - 0.5) * 0.024
        + (vec2(vnoise(p * 9.0 + vec2(tq * 0.3, 3.0)), vnoise(p * 9.0 + vec2(31.7, -tq * 0.27))) - 0.5) * 0.007;
    warp *= uFlow;
    warp.x /= aspect;
    vec2 uv = vUv + warp;
    vec4 field = texture(uField, uv);
    // 这一处强调色的墨是什么颜色（关键字各有各的）；没有墨的地方用主题的强调色
    vec4 tint = texture(uTint, uv);
    vec3 accentColor = tint.a > 0.002 ? clamp(tint.rgb / tint.a, 0.0, 1.0) : uAccent;

    // 阈值被噪点搅过：墨的边缘像砂纸上蹭出来的
    float rough = (vnoise(frag * 0.45 + uSeed * 91.0) - 0.5) * 0.16 + (hash(floor(frag * 0.9) + uSeed * 13.0) - 0.5) * 0.08;
    float threshold = 0.5 + rough * uGrain;
    float inkField = field.r + uFlood;
    float inkEdge = max(fwidth(inkField), 0.0001) * 0.75;
    float ink = smoothstep(threshold - inkEdge, threshold + inkEdge, inkField);
    float accentEdge = max(fwidth(field.b), 0.0001) * 0.75;
    float accent = smoothstep(threshold - accentEdge, threshold + accentEdge, field.b);

    // 半调：阈值以下的那圈模糊、没唱到的字、网点云和四角的暗角，都画成大小不一的圆点
    vec2 centered = vUv - 0.5;
    float vignette = smoothstep(0.42, 1.0, length(centered) * 1.3);
    float tone = clamp(field.g * 0.9 + (field.r + field.b) * 0.5 + vignette * 0.3, 0.0, 1.0);
    float ca = cos(uAngle);
    float sa = sin(uAngle);
    vec2 grid = vec2(frag.x * ca - frag.y * sa, frag.x * sa + frag.y * ca) / uDot;
    // 最浓的地方圆点也只是刚好相连，留着格子间的纸，不糊成一片平的灰
    float radius = sqrt(tone) * 0.58;
    float soft = 0.9 / uDot;
    float dots = (1.0 - smoothstep(radius - soft, radius + soft, length(fract(grid) - 0.5))) * step(0.015, tone);

    vec3 paper = mix(uPaper, uInk, uInvert);
    vec3 inkColor = mix(uInk, uPaper, uInvert);
    vec3 color = mix(paper, mix(paper, uTone, 0.82), dots);
    color = mix(color, accentColor, accent);
    // 强调色融球盖着还没唱到的字时：字的网点影子压在它上面，照样看得见
    color = mix(color, mix(accentColor, inkColor, 0.4), dots * accent * smoothstep(0.85, 1.0, field.g));
    // 墨最后画：强调色融球漂到字上时，字压在它上面照样读得出来
    color = mix(color, inkColor, ink);

    // 画面四角的裁切标记：钉在屏幕上，不跟着镜头走
    vec2 edge = min(frag, uRes / uPixelRatio - frag);
    float mark = max(
        step(abs(edge.x - 18.0), 0.75) * step(18.0, edge.y) * step(edge.y, 34.0),
        step(abs(edge.y - 18.0), 0.75) * step(18.0, edge.x) * step(edge.x, 34.0));
    color = mix(color, inkColor, mark * 0.85);

    // 砂纸：细颗粒每格换一次，纸的斑驳不动，再撒一点杂点（纸上是墨色的，墨里是纸色的）
    float fine = hash(floor(frag / 1.4) + beat * 7.13 + uSeed * 3.0);
    float mottle = vnoise(frag * 0.12 + uSeed * 50.0);
    float speck = step(0.988, hash(floor(frag / 2.2) + beat * 3.7 + 0.5));
    color *= 1.0 + ((fine - 0.5) * 0.22 + (mottle - 0.5) * 0.1) * uGrain;
    color = mix(color, mix(inkColor, paper, ink), speck * 0.55 * min(uGrain, 1.5));

    // 播放页透明时纸不画：只留墨、强调色和网点（反相的镜头整个是实的）
    float alpha = mix(1.0, max(max(ink, accent), max(max(dots * 0.82, mark), uInvert)), uSeeThrough);
    fragColor = vec4(clamp(color, 0.0, 1.0) * alpha, alpha) * qt_Opacity;
}
