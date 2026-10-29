#version 440
layout(location=0) in vec4 qt_Vertex;
layout(location=1) in vec2 qt_MultiTexCoord0;
layout(location=0) out vec2 vUv;
layout(location=1) out float vFogDepth;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;mat4 mvp;mat4 modelView;vec2 viewport;vec2 extent;vec3 tint;vec3 fogColor;float alpha;float fogNear;float fogFar;};
void main(){vUv=qt_MultiTexCoord0;vec4 local=vec4((vUv.x-.5)*extent.x,(.5-vUv.y)*extent.y,0,1);vec4 clip=mvp*local;vFogDepth=-(modelView*local).z;vec2 pixel=vec2((clip.x+clip.w)*.5*viewport.x,(clip.w-clip.y)*.5*viewport.y);gl_Position=qt_Matrix*vec4(pixel,0,clip.w);}
