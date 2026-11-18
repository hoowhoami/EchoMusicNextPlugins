#version 440
// Folia/Three pinned source math; see package notices.
struct LuminanceData {
   float m, n, e, s, w;
   float ne, nw, se, sw;
   float highest, lowest, contrast;
  };
struct EdgeData {
   bool isHorizontal;
   float pixelStep;
   float oppositeLuminance, gradient;
  };
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
vec4 nativeFragCoord(){return vec4(gl_FragCoord.x,mix(nativeTarget.y-gl_FragCoord.y,gl_FragCoord.y,max(nativeOutput.w,nativeTarget.z)),gl_FragCoord.zw); }
layout(location=0) out vec4 pc_fragColor;

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



vec4 LinearTransferOETF( in vec4 value ) {
 return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
 return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
 return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 linearToOutputTexel( vec4 value ) {
 return LinearTransferOETF( vec4( value.rgb * mat3( 1.0000,-0.0000,-0.0000,-0.0000,1.0000,0.0000,0.0000,0.0000,1.0000 ), value.a ) );
}
float luminance( const in vec3 rgb ) {
 const vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
 return dot( weights, rgb );
}
  
  
  layout(location=0) in vec2 vUv;
  const float edgeSteps[6] = float[6]( 1.0, 1.5, 2.0, 2.0, 2.0, 4.0 );
  float _ContrastThreshold = 0.0312;
  float _RelativeThreshold = 0.063;
  float _SubpixelBlending = 1.0;
  vec4 Sample( sampler2D tex2D, vec2 uv ) {
   return texture( tex2D, uv );
  }
  float SampleLuminance( sampler2D tex2D, vec2 uv ) {
   return dot( Sample( tex2D, uv ).rgb, vec3( 0.3, 0.59, 0.11 ) );
  }
  float SampleLuminance( sampler2D tex2D, vec2 texSize, vec2 uv, float uOffset, float vOffset ) {
   uv += texSize * vec2(uOffset, vOffset);
   return SampleLuminance(tex2D, uv);
  }
  
  LuminanceData SampleLuminanceNeighborhood( sampler2D tex2D, vec2 texSize, vec2 uv ) {
   LuminanceData l;
   l.m = SampleLuminance( tex2D, uv );
   l.n = SampleLuminance( tex2D, texSize, uv, 0.0, 1.0 );
   l.e = SampleLuminance( tex2D, texSize, uv, 1.0, 0.0 );
   l.s = SampleLuminance( tex2D, texSize, uv, 0.0, -1.0 );
   l.w = SampleLuminance( tex2D, texSize, uv, -1.0, 0.0 );
   l.ne = SampleLuminance( tex2D, texSize, uv, 1.0, 1.0 );
   l.nw = SampleLuminance( tex2D, texSize, uv, -1.0, 1.0 );
   l.se = SampleLuminance( tex2D, texSize, uv, 1.0, -1.0 );
   l.sw = SampleLuminance( tex2D, texSize, uv, -1.0, -1.0 );
   l.highest = max( max( max( max( l.n, l.e ), l.s ), l.w ), l.m );
   l.lowest = min( min( min( min( l.n, l.e ), l.s ), l.w ), l.m );
   l.contrast = l.highest - l.lowest;
   return l;
  }
  bool ShouldSkipPixel( LuminanceData l ) {
   float threshold = max( _ContrastThreshold, _RelativeThreshold * l.highest );
   return l.contrast < threshold;
  }
  float DeterminePixelBlendFactor( LuminanceData l ) {
   float f = 2.0 * ( l.n + l.e + l.s + l.w );
   f += l.ne + l.nw + l.se + l.sw;
   f *= 1.0 / 12.0;
   f = abs( f - l.m );
   f = clamp( f / l.contrast, 0.0, 1.0 );
   float blendFactor = smoothstep( 0.0, 1.0, f );
   return blendFactor * blendFactor * _SubpixelBlending;
  }
  
  EdgeData DetermineEdge( vec2 texSize, LuminanceData l ) {
   EdgeData e;
   float horizontal =
    abs( l.n + l.s - 2.0 * l.m ) * 2.0 +
    abs( l.ne + l.se - 2.0 * l.e ) +
    abs( l.nw + l.sw - 2.0 * l.w );
   float vertical =
    abs( l.e + l.w - 2.0 * l.m ) * 2.0 +
    abs( l.ne + l.nw - 2.0 * l.n ) +
    abs( l.se + l.sw - 2.0 * l.s );
   e.isHorizontal = horizontal >= vertical;
   float pLuminance = e.isHorizontal ? l.n : l.e;
   float nLuminance = e.isHorizontal ? l.s : l.w;
   float pGradient = abs( pLuminance - l.m );
   float nGradient = abs( nLuminance - l.m );
   e.pixelStep = e.isHorizontal ? texSize.y : texSize.x;
   if (pGradient < nGradient) {
    e.pixelStep = -e.pixelStep;
    e.oppositeLuminance = nLuminance;
    e.gradient = nGradient;
   } else {
    e.oppositeLuminance = pLuminance;
    e.gradient = pGradient;
   }
   return e;
  }
  float DetermineEdgeBlendFactor( sampler2D tex2D, vec2 texSize, LuminanceData l, EdgeData e, vec2 uv ) {
   vec2 uvEdge = uv;
   vec2 edgeStep;
   if (e.isHorizontal) {
    uvEdge.y += e.pixelStep * 0.5;
    edgeStep = vec2( texSize.x, 0.0 );
   } else {
    uvEdge.x += e.pixelStep * 0.5;
    edgeStep = vec2( 0.0, texSize.y );
   }
   float edgeLuminance = ( l.m + e.oppositeLuminance ) * 0.5;
   float gradientThreshold = e.gradient * 0.25;
   vec2 puv = uvEdge + edgeStep * edgeSteps[0];
   float pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
   bool pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;
   for ( int i = 1; i < 6 && !pAtEnd; i++ ) {
    puv += edgeStep * edgeSteps[i];
    pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
    pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;
   }
   if ( !pAtEnd ) {
    puv += edgeStep * 8.0;
   }
   vec2 nuv = uvEdge - edgeStep * edgeSteps[0];
   float nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
   bool nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;
   for ( int i = 1; i < 6 && !nAtEnd; i++ ) {
    nuv -= edgeStep * edgeSteps[i];
    nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
    nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;
   }
   if ( !nAtEnd ) {
    nuv -= edgeStep * 8.0;
   }
   float pDistance, nDistance;
   if ( e.isHorizontal ) {
    pDistance = puv.x - uv.x;
    nDistance = uv.x - nuv.x;
   } else {
    pDistance = puv.y - uv.y;
    nDistance = uv.y - nuv.y;
   }
   float shortestDistance;
   bool deltaSign;
   if ( pDistance <= nDistance ) {
    shortestDistance = pDistance;
    deltaSign = pLuminanceDelta >= 0.0;
   } else {
    shortestDistance = nDistance;
    deltaSign = nLuminanceDelta >= 0.0;
   }
   if ( deltaSign == ( l.m - edgeLuminance >= 0.0 ) ) {
    return 0.0;
   }
   return 0.5 - shortestDistance / ( pDistance + nDistance );
  }
  vec4 ApplyFXAA( sampler2D tex2D, vec2 texSize, vec2 uv ) {
   LuminanceData luminance = SampleLuminanceNeighborhood( tex2D, texSize, uv );
   if ( ShouldSkipPixel( luminance ) ) {
    return Sample( tex2D, uv );
   }
   float pixelBlend = DeterminePixelBlendFactor( luminance );
   EdgeData edge = DetermineEdge( texSize, luminance );
   float edgeBlend = DetermineEdgeBlendFactor( tex2D, texSize, luminance, edge, uv );
   float finalBlend = max( pixelBlend, edgeBlend );
   if (edge.isHorizontal) {
    uv.y += edge.pixelStep * finalBlend;
   } else {
    uv.x += edge.pixelStep * finalBlend;
   }
   return Sample( tex2D, uv );
  }
  void main() {
   pc_fragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );
  }
