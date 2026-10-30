// Paper sources are encoded premultiplied sRGB. EchoGpuSurface accepts linear premultiplied RGBA.
// Its SDR output pass encodes back to RGBA8, preserving the original Quick source sampling space.
vec3 srgbToLinear(vec3 c){
 return mix(c/12.92,pow((c+vec3(.055))/1.055,vec3(2.4)),step(vec3(.04045),c));
}
vec4 sourceToLinear(vec4 color){
 vec3 straight=color.a>0.?color.rgb/color.a:vec3(0.);
 return vec4(srgbToLinear(straight)*color.a,color.a);
}
