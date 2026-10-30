// EchoGpuSurface public frame ABI; not the Qt Quick ShaderEffect uniform block.
layout(std140,binding=0) uniform Frame {
 vec4 viewport;
 vec4 outputInfo;
 mat4 correction;
} frame;
