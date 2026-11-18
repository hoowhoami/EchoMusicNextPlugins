#version 440
// Folia/Three pinned source math; see package notices.

layout(std140,binding=0) uniform NativeFrame {vec4 nativeViewport;vec4 nativeOutput;mat4 nativeCorrection;};
layout(std140,binding=1) uniform NativeUniforms {
mat4 modelMatrix;
mat4 modelViewMatrix;
mat4 projectionMatrix;
mat4 viewMatrix;
mat3 normalMatrix;
vec3 cameraPosition;
bool isOrthographic;
vec2 resolution;
vec4 nativeTarget;
};
layout(binding=2) uniform sampler2D tDiffuse;

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 







layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
  
  layout(location=0) out vec2 vUv;
  layout(location=1) out vec4 vOffset[ 3 ];
  void SMAAEdgeDetectionVS( vec2 texcoord ) {
   vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0, 1.0 );
   vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( 1.0, 0.0, 0.0, -1.0 );
   vOffset[ 2 ] = texcoord.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0, 2.0 );
  }
  void nativeSourceMain() {
   vUv = uv;
   SMAAEdgeDetectionVS( vUv );
   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }

void main(){nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}
