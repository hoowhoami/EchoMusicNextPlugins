// Folia a8da4437 original post-processing and ordered overlays. AGPL-3.0-only.
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 frameSize;
    float padding;
    float sigma;
    vec4 background;
    vec4 baseFill;
    vec4 primary;
    vec4 accent;
    vec4 washAccent;
    vec4 treatment;
    float streaks;
};
layout(binding=1) uniform sampler2D source;
const vec3 LUMA=vec3(.2126,.7152,.0722);
vec4 round8(vec4 value){return floor(clamp(value,0.,1.)*255.+.5)/255.;}
vec4 premul(vec3 rgb,float a){return vec4(rgb*a,a);}
vec4 over(vec4 fg,vec4 bg){return round8(fg+bg*(1.-fg.a));}
vec4 blur(vec2 point){
    vec2 expanded=vec2(frameSize.x,frameSize.y+2.*padding);
    if(sigma<.001)return texture(source,(point+vec2(0.,padding))/expanded);
    int radius=int(ceil(4.*sigma));
    vec4 total=vec4(0.);
    float weights=0.;
    for(int i=-radius;i<=radius;++i){
        float y=float(i),weight=exp(-.5*y*y/(sigma*sigma));
        total+=texture(source,(point+vec2(0.,padding+y))/expanded)*weight;
        weights+=weight;
    }
    return total/weights;
}
void main(){
    vec2 point=qt_TexCoord0*frameSize;
    vec4 color=over(blur(point),baseFill);
    if(color.a>0.&&(treatment.x>0.||abs(treatment.y-1.)>=.001||treatment.z>0.)){
        vec3 rgb=round8(vec4(color.rgb/color.a,1.)).rgb;
        float luminance=dot(rgb,LUMA);
        rgb=mix(rgb,vec3(luminance),treatment.x);
        if(abs(treatment.y-1.)>=.001){float gray=dot(rgb,LUMA);rgb=vec3(gray)+(rgb-vec3(gray))*treatment.y;}
        if(treatment.z>0.){
            vec3 shadow=dot(background.rgb,LUMA)<=dot(primary.rgb,LUMA)?background.rgb:primary.rgb;
            vec3 highlight=dot(background.rgb,LUMA)<=dot(primary.rgb,LUMA)?primary.rgb:background.rgb;
            vec3 wash=luminance<=.55?mix(shadow,washAccent.rgb,luminance/.55):mix(washAccent.rgb,highlight,(luminance-.55)/.45);
            rgb=mix(rgb,wash,treatment.z);
        }
        color=round8(vec4(round8(vec4(rgb,1.)).rgb*color.a,color.a));
    }
    float strength=treatment.w;
    float diagonal=clamp(dot(point,frameSize)/dot(frameSize,frameSize),0.,1.);
    vec4 stop0=vec4(accent.rgb,.08+strength*.62),stop1=vec4(background.rgb,.16+strength*.58),stop2=vec4(primary.rgb,.06+strength*.36);
    vec4 diagonalColor=diagonal<=.44?mix(stop0,stop1,diagonal/.44):mix(stop1,stop2,(diagonal-.44)/.56);
    color=over(premul(diagonalColor.rgb,diagonalColor.a),color);
    float radial=clamp(length(point-frameSize*vec2(.18,.34))/(frameSize.x*.55),0.,1.);
    color=over(premul(mix(accent.rgb,background.rgb,radial),strength*.42*(1.-radial)),color);
    float veil=clamp((point.x/frameSize.x-.45)/.55,0.,1.);
    color=over(premul(background.rgb,(.18+strength*.38)*veil),color);
    if(streaks>.5){
        for(int i=0;i<18;++i){
            vec2 origin=vec2(mod(float(i*127),frameSize.x),mod(float(i*211),frameSize.y)-40.);
            // Canvas fillRect has area coverage at the fractional bottom edge.
            vec2 lo=max(point-vec2(.5),origin),hi=min(point+vec2(.5),origin+vec2(1.,frameSize.y*.28));
            float coverage=max(0.,hi.x-lo.x)*max(0.,hi.y-lo.y);
            if(coverage>0.)color=over(premul(background.rgb,(.1+strength*.08)*coverage),color);
        }
    }
    fragColor=color*qt_Opacity;
}
