#version 440
precision mediump float;
layout(location=0)in vec4 qt_Vertex;layout(location=1)in vec2 qt_MultiTexCoord0;layout(location=0)out vec2 qt_TexCoord0;layout(location=1)out vec2 v_imageUV;layout(std140,binding=0) uniform buf{mat4 qt_Matrix;float qt_Opacity;vec2 u_resolution;float u_pixelRatio;float u_imageAspectRatio;float u_originX;float u_originY;float u_worldWidth;float u_worldHeight;float u_fit;float u_scale;float u_rotation;float u_offsetX;float u_offsetY;vec4 c_colorBack;vec4 c_colorShadow;vec4 c_colorHighlight;float u_size;float u_shadows;float u_angle;float u_stretch;float u_shape;float u_distortion;float u_highlights;float u_distortionShape;float u_shift;float u_blur;float u_edges;float u_marginLeft;float u_marginRight;float u_marginTop;float u_marginBottom;float u_grainMixer;float u_grainOverlay;vec4 c_colorFront;float u_contrast;float u_roughness;float u_fiber;float u_fiberSize;float u_crumples;float u_crumpleSize;float u_folds;float u_foldCount;float u_drops;float u_seed;float u_fade;float u_time;float u_radius;float u_grainSize;float u_grid;bool u_originalColors;bool u_inverted;float u_type;float u_spread;float u_bias;float u_perspective;float u_count;float u_dispersion;float u_dispersionShift;float u_dispersionColor;float u_focusCenter;float u_focusEdges;float u_swirl;float u_noise;float u_noiseFrequency;float u_noiseOffset;float u_lensBulge;float u_lensCircle;float u_imageX;float u_imageY;float u_pxSize;float u_colorSteps;};

void main(){gl_Position=qt_Matrix*qt_Vertex;gl_Position.y=-gl_Position.y;qt_TexCoord0=qt_MultiTexCoord0;vec2 uv=vec2(qt_MultiTexCoord0.x-.5,.5-qt_MultiTexCoord0.y);vec2 boxOrigin=vec2(.5-u_originX,u_originY-.5);float r=u_rotation*3.14159265358979323846/180.;mat2 graphicRotation=mat2(cos(r),sin(r),-sin(r),cos(r));vec2 graphicOffset=vec2(-u_offsetX,u_offsetY);  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}