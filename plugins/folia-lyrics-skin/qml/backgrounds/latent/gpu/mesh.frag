#version 440
#extension GL_GOOGLE_include_directive : require
// RHI adaptation of ../mesh.frag; Paper 0.0.80 Apache-2.0, Folia a8da4437 AGPL-3.0-only.
// The algorithm below is retained verbatim; only bindings, entry coordinates and output ABI differ.
#include "parameters.glsl"
#include "color.glsl"
layout(location=0) in vec2 uv;
layout(location=0) out vec4 fragColor;
#define m_TWO_PI 6.28318530718
#define m_PI 3.14159265358979323846


vec2 m_rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}


  float m_hash21(vec2 p) {
    p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }


float m_valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = m_hash21(i);
  float b = m_hash21(i + vec2(1.0, 0.0));
  float c = m_hash21(i + vec2(0.0, 1.0));
  float d = m_hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float m_noise(vec2 n, vec2 seedOffset) {
  return m_valueNoise(n + seedOffset);
}

vec2 m_getPosition(int i, float t) {
  float a = float(i) * .37;
  float b = .6 + fract(float(i) / 3.) * .9;
  float c = .8 + fract(float(i + 1) / 4.);

  float x = sin(t * b + a);
  float y = cos(t * c + a * 1.5);

  return .5 + .5 * vec2(x, y);
}

vec4 m_sample(vec2 v_objectUV) {
  vec2 uv = v_objectUV;
  uv += .5;
  vec2 grainUV = uv * 1000.;

  float grain = m_noise(grainUV, vec2(0.));
  float mixerGrain = .4 * 0. * (grain - .5);

  const float firstFrameOffset = 41.5;
  float t = .5 * (meshTime + firstFrameOffset);

  float radius = smoothstep(0., 1., length(uv - .5));
  float center = 1. - radius;
  for (float i = 1.; i <= 2.; i++) {
    uv.x += distortion * center / i * sin(t + i * .4 * smoothstep(.0, 1., uv.y)) * cos(.2 * t + i * 2.4 * smoothstep(.0, 1., uv.y));
    uv.y += distortion * center / i * cos(t + i * 2. * smoothstep(.0, 1., uv.x));
  }

  vec2 uvRotated = uv;
  uvRotated -= vec2(.5);
  float angle = 3. * swirl * radius;
  uvRotated = m_rotate(uvRotated, -angle);
  uvRotated += vec2(.5);

  vec3 color = vec3(0.);
  float opacity = 0.;
  float totalWeight = 0.;

  for (int i = 0; i < 10; i++) {
    if (i >= int(6.)) break;

    vec2 pos = m_getPosition(i, t) + mixerGrain;
    vec3 colorFraction = meshColor(i).rgb * meshColor(i).a;
    float opacityFraction = meshColor(i).a;

    float dist = length(uvRotated - pos);

    dist = pow(dist, 3.5);
    float weight = 1. / (dist + 1e-3);
    color += colorFraction * weight;
    opacity += opacityFraction * weight;
    totalWeight += weight;
  }

  color /= max(1e-4, totalWeight);
  opacity /= max(1e-4, totalWeight);

  float grainOverlay = m_valueNoise(m_rotate(grainUV, 1.) + vec2(3.));
  grainOverlay = mix(grainOverlay, m_valueNoise(m_rotate(grainUV, 2.) + vec2(-1.)), .5);
  grainOverlay = pow(grainOverlay, 1.3);

  float grainOverlayV = grainOverlay * 2. - 1.;
  vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
  float grainOverlayStrength = .01 * abs(grainOverlayV);
  grainOverlayStrength = pow(grainOverlayStrength, .8);
  color = mix(color, grainOverlayColor, .35 * grainOverlayStrength);

  opacity += .5 * grainOverlayStrength;
  opacity = clamp(opacity, 0., 1.);

  return vec4(color, opacity);
}

void main(){
 vec2 paperUV=vec2(uv.x,1.-uv.y);
 fragColor=sourceToLinear(m_sample((paperUV-.5)*resolution/min(resolution.x,resolution.y)));
}
