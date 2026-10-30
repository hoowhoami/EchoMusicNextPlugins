// Original Folia Sora shader, a8da4437, AGPL-3.0-only.
#version 440

layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
mat4 qt_Matrix;
float qt_Opacity;
vec2 u_resolution;
float u_time;
vec4 u_particle_color;
vec4 u_particle_accent_color;
};





layout(location=1) in float v_color_type;
layout(location=2) in float v_intensity_base;

void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float dist = length(pc);
  
  float alpha = smoothstep(0.5, 0.1, dist) * v_intensity_base;
  if (alpha < 0.01) discard;
  
  vec3 baseColor = v_color_type > 0.90 ? u_particle_accent_color.rgb : u_particle_color.rgb;
  
  // Pre-multiplied alpha blending
  fragColor = vec4(baseColor * alpha, alpha)*qt_Opacity;
}
