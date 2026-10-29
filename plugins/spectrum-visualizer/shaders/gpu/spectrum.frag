#version 440
layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 fragColor;
layout(binding = 2) uniform sampler2D profile;
layout(std140, binding = 0) uniform Frame {
  vec4 viewport;
  vec4 outputInfo;
  mat4 correction;
}
frame;
layout(std140, binding = 1) uniform Params {
  vec4 info;
  vec4 options;
  vec4 mist;
  vec4 paint;
  vec4 color0;
  vec4 color1;
  vec4 color2;
  vec4 signalInfo;
  vec4 bins[128];
}
params;
float binAt(float position) {
  float p = clamp(position, 0.0, max(0.0, params.info.z - 1.0));
  int a = int(floor(p));
  int b = min(int(params.info.z) - 1, a + 1);
  return mix(params.bins[a / 4][a % 4], params.bins[b / 4][b % 4], fract(p));
}
vec3 linearColor(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
             greaterThan(c, vec3(0.04045)));
}
vec3 gradient(float t) {
  return t < 0.52
             ? mix(params.color0.rgb, params.color1.rgb, t / 0.52)
             : mix(params.color1.rgb, params.color2.rgb, (t - 0.52) / 0.48);
}
vec4 over(vec4 a, vec4 b) { return a + b * (1.0 - a.a); }
float roundBox(vec2 p, vec2 halfSize, float radius) {
  radius = min(radius, min(halfSize.x, halfSize.y));
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}
float edge(float distance) { return 1.0 - smoothstep(-0.6, 0.6, distance); }
float mistValue(int i, int count) {
  return texelFetch(profile, ivec2(clamp(i, 0, count - 1), 0), 0).g;
}
float cloudHeight(float x, int layer, float time) {
  float padding = max(18.0, params.info.x * 0.035),
        span = params.info.x + 2.0 * padding;
  int count = int(round(clamp(params.info.x / 18.0, 18.0, 44.0)));
  float position =
      clamp((x + padding) / span * float(count - 1), 0.0, float(count - 1));
  int i = int(floor(position + 0.5));
  // Quadratic midpoint interpolation matches the source's connected curves.
  float a = mistValue(i - 1, count), b = mistValue(i, count),
        c = mistValue(i + 1, count), t = position - float(i) + 0.5;
  float value = mix(mix((a + b) * 0.5, b, t), mix(b, (b + c) * 0.5, t), t);
  float phase = float(layer) == 0.0 ? 0.3 : layer == 1 ? 2.2 : 4.4;
  float motion = params.mist.w > 0.5 ? 0.0 : params.mist.z;
  float progress = (x + padding) / span;
  float drift = sin(progress * 3.14159265 * (2.4 + float(layer) * 0.35) +
                    time * motion * 0.9 + phase) *
                (0.018 + motion * 0.035);
  float scale = layer == 0 ? 0.58 : layer == 1 ? 0.78 : 0.98;
  float level =
      (params.options.w > 0.5 ? 0.025 : 0.075) + value * scale + drift;
  return params.info.y + (params.options.z > 1.5 ? 4.0 : 8.0) -
         params.info.y * params.options.y * clamp(level, 0.02, 1.0);
}
void main() {
  vec2 p = uv * params.info.xy;
  float time = frame.viewport.w;
  float bottom = params.info.y - (params.options.z > 1.5 ? 4.0 : 8.0);
  vec3 color = gradient(
      clamp((p.x / params.info.x + 1.0 - p.y / params.info.y) * 0.5, 0.0, 1.0));
  vec4 result = vec4(0);
  if (params.paint.x > 0.5) {
    float t = (uv.x + uv.y) * 0.5;
    float alpha =
        (params.options.z > 1.5 ? 0.18 : 0.24) + params.signalInfo.y * 0.14;
    vec4 bg = t < 0.5 ? mix(vec4(params.color0.rgb, 1),
                            vec4(0.039, 0.059, 0.11, 0.12), t * 2.0)
                      : mix(vec4(0.039, 0.059, 0.11, 0.12),
                            vec4(params.color2.rgb, 1), (t - 0.5) * 2.0);
    result = vec4(bg.rgb * bg.a * alpha, bg.a * alpha);
  }
  int mode = int(params.options.x);
  if (mode == 3) {
    vec3 screen = vec3(0);
    float alpha = 0.0;
    for (int layer = 0; layer < 3; ++layer) {
      float y = cloudHeight(p.x, layer, time);
      float blurScale = layer == 0 ? 1.05 : layer == 1 ? 0.72 : 0.42;
      float blur = round((3.0 + params.mist.y * 11.0) * blurScale);
      float slope = dFdx(y) / max(dFdx(p.x), 0.001);
      float distance = (y - p.y) / sqrt(1.0 + slope * slope);
      float coverage = 0.5 - 0.5 * tanh(distance / max(blur * 0.8, 0.5));
      float a = (layer == 0   ? 0.48
                 : layer == 1 ? 0.36
                              : 0.28) +
                params.signalInfo.y * 0.12;
      a *= params.mist.x * coverage;
      vec3 c0 = layer == 0   ? params.color0.rgb
                : layer == 1 ? params.color1.rgb
                             : params.color2.rgb;
      vec3 c1 = layer == 0   ? params.color1.rgb
                : layer == 1 ? params.color2.rgb
                             : params.color0.rgb;
      vec3 c2 = layer == 0   ? params.color2.rgb
                : layer == 1 ? params.color0.rgb
                             : params.color1.rgb;
      float t = clamp((p.x / params.info.x + 1.0 - p.y / params.info.y) * 0.5,
                      0.0, 1.0);
      vec3 c = t < 0.5 ? mix(c0, c1, t * 2.0) : mix(c1, c2, t * 2.0 - 1.0);
      screen = 1.0 - (1.0 - screen) * (1.0 - c * a);
      alpha = 1.0 - (1.0 - alpha) * (1.0 - a);
    }
    result = over(vec4(screen, alpha), result);
  } else if (mode == 4) {
    int count =
        min(512, max(2, int(floor(params.info.x /
                                  (clamp(params.paint.y, 1.0, 8.0) + 3.0)))));
    float slot = params.info.x / float(count);
    int i = clamp(int(p.x / slot), 0, count - 1);
    float width = min(params.paint.y, max(1.0, slot - 1.0));
    float height = texelFetch(profile, ivec2(i, 0), 0).r * params.info.y *
                   params.options.y;
    float a = height <= 0.5 ? 0.0
                            : edge(roundBox(p - vec2((float(i) + 0.5) * slot,
                                                     bottom - height * 0.5),
                                            vec2(width, height) * 0.5, 2.0)) *
                                  0.65;
    float x = uv.x;
    float mask = x < 0.05   ? mix(0.0, 0.6, x / 0.05)
                 : x < 0.12 ? mix(0.6, 1.0, (x - 0.05) / 0.07)
                 : x > 0.95 ? mix(0.6, 0.0, (x - 0.95) / 0.05)
                 : x > 0.88 ? mix(1.0, 0.6, (x - 0.88) / 0.07)
                            : 1.0;
    result = over(vec4(params.color0.rgb * a, a), result) * mask;
  } else if (params.options.w < 0.5) {
    float count = min(params.info.z, 48.0),
          slot = params.info.x / max(1.0, count);
    float i = floor(p.x / slot);
    float h = 2.0 + (0.5 + 0.5 * sin(time * 1000.0 / 700.0 + i * 0.36)) * 7.0;
    float a = edge(roundBox(
                  p - vec2((i + 0.5) * slot, params.info.y - 12.0 - h * 0.5),
                  vec2(slot * 0.56, h) * 0.5, 2.0)) *
              0.2;
    result = over(vec4(params.color1.rgb * a, a), result);
  } else {
    if ((mode == 1 || mode == 2) && params.info.w > 1.0) {
      int column = clamp(int(uv.x * min(frame.viewport.x, 4096.0)), 0, 4095);
      vec2 bounds = texelFetch(profile, ivec2(column, 0), 0).ba;
      vec2 ys = params.info.y * 0.5 +
                bounds * params.info.y * 0.25 * params.options.y;
      float distance = max(ys.x - p.y, p.y - ys.y);
      float line = edge(distance - 1.0),
            glow = exp(-distance * distance / 100.0) * 0.35;
      float a = (line + glow * (1.0 - line)) * (mode == 2 ? 0.38 : 0.9);
      result = over(vec4(color * a, a), result);
    }
    if (mode == 0 || mode == 2) {
      float count = max(1.0, params.info.z), slot = params.info.x / count;
      int i = clamp(int(p.x / slot), 0, int(count) - 1);
      float gap = clamp(slot * 0.22, 1.1, 4.0), width = max(2.0, slot - gap);
      float top = max(params.options.z > 1.5 ? 8.0 : 10.0,
                      bottom - params.info.y * params.options.y);
      float h = max(2.0, pow(clamp(binAt(float(i)), 0.0, 1.0), 1.35) *
                             (bottom - top));
      float distance = roundBox(
          p - vec2(float(i) * slot + gap * 0.5 + width * 0.5, bottom - h * 0.5),
          vec2(width, h) * 0.5, clamp(slot * 0.24, 2.0, 5.0));
      float a = edge(distance);
      float glow =
          count > 128.0
              ? 0.0
              : exp(-max(0.0, distance) * max(0.0, distance) /
                    (params.options.z > 0.5 && params.options.z < 1.5 ? 12.0
                                                                      : 20.0)) *
                    0.14 * (1.0 - a);
      result = over(vec4(color * a + vec3(0.314, 0.863, 1.0) * glow, a + glow),
                    result);
    }
  }
  float alpha = clamp(result.a, 0.0, 1.0);
  vec3 rgb = linearColor(clamp(result.rgb / max(alpha, 0.00001), 0.0, 1.0));
  if (params.paint.z > 0.5 && params.paint.w > 0.0 && alpha > 0.0001) {
    float highlight = 0.0;
    if (mode == 0 || mode == 2) {
      float count = max(1.0, params.info.z), slot = params.info.x / count;
      int i = clamp(int(p.x / slot), 0, int(count) - 1);
      float level = clamp(binAt(float(i)), 0.0, 1.0);
      float top = max(params.options.z > 1.5 ? 8.0 : 10.0,
                      bottom - params.info.y * params.options.y);
      float h = max(2.0, pow(level, 1.35) * (bottom - top));
      float d = p.y - (bottom - h);
      highlight = exp(-d * d / 12.0) * smoothstep(0.02, 0.3, level);
    }
    if (mode == 4) {
      int count =
          min(512, max(2, int(floor(params.info.x /
                                    (clamp(params.paint.y, 1.0, 8.0) + 3.0)))));
      int i = clamp(int(uv.x * float(count)), 0, count - 1);
      float level = texelFetch(profile, ivec2(i, 0), 0).r;
      float d = p.y - (bottom - level * params.info.y * params.options.y);
      highlight = exp(-d * d / 12.0) * smoothstep(0.02, 0.3, level);
    }
    if (mode == 1 || mode == 2) {
      int i = clamp(int(uv.x * min(frame.viewport.x, 4096.0)), 0, 4095);
      vec2 levels = texelFetch(profile, ivec2(i, 0), 0).ba;
      vec2 ys = params.info.y * 0.5 +
                levels * params.info.y * 0.25 * params.options.y;
      float d = max(0.0, max(ys.x - p.y, p.y - ys.y));
      highlight =
          max(highlight,
              exp(-d * d / 9.0) *
                  smoothstep(0.002, 0.1, max(abs(levels.x), abs(levels.y))));
    }
    if (mode == 3) {
      int count = int(round(clamp(params.info.x / 18.0, 18.0, 44.0)));
      float level = mistValue(int(uv.x * float(count - 1)), count);
      for (int layer = 0; layer < 3; ++layer) {
        float d = p.y - cloudHeight(p.x, layer, time);
        highlight =
            max(highlight, exp(-d * d / 64.0) * smoothstep(0.02, 0.3, level));
      }
    }
    rgb *= 1.0 + params.paint.w * highlight * 5.0;
  }
  fragColor = vec4(rgb * alpha, alpha);
}
