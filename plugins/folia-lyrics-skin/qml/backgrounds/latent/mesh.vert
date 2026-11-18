#version 440
// Six centres depend only on time. Evaluate the original Paper orbit once per vertex.
layout(location=0) in vec4 qt_Vertex;
layout(location=1) in vec2 qt_MultiTexCoord0;
layout(location=0) out vec2 qt_TexCoord0;
layout(location=1) out vec4 meshPositions01;
layout(location=2) out vec4 meshPositions23;
layout(location=3) out vec4 meshPositions45;
layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix;
 float qt_Opacity;
 vec2 resolution;
 float pixelRatio;
 float ditherTime;
 float meshTime;
 float pixelSize;
 float distortion;
 float swirl;
 float ditherOpacity;
 float ditherScale;
 float meshScale;
 float saturation;
 float brightness;
 float displayMode;
 float overlayOpacity;
 vec4 backgroundColor;
 vec4 ditherBack;
 vec4 ditherFront;
 vec4 mesh0; vec4 mesh1; vec4 mesh2; vec4 mesh3; vec4 mesh4; vec4 mesh5;
};
vec2 m_getPosition(int i, float t) {
  float a = float(i) * .37;
  float b = .6 + fract(float(i) / 3.) * .9;
  float c = .8 + fract(float(i + 1) / 4.);

  float x = sin(t * b + a);
  float y = cos(t * c + a * 1.5);

  return .5 + .5 * vec2(x, y);
}

void main() {
  qt_TexCoord0 = qt_MultiTexCoord0;
  gl_Position = qt_Matrix * qt_Vertex;
  float t = .5 * (meshTime + 41.5);
  meshPositions01 = vec4(m_getPosition(0, t), m_getPosition(1, t));
  meshPositions23 = vec4(m_getPosition(2, t), m_getPosition(3, t));
  meshPositions45 = vec4(m_getPosition(4, t), m_getPosition(5, t));
}
