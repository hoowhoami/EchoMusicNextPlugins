#version 440
layout(location=0)in vec4 qt_Vertex;layout(location=1)in vec2 qt_MultiTexCoord0;layout(location=0)out vec2 vPoint;layout(binding=1)uniform sampler2D pointData;
layout(std140,binding=0)uniform buf{mat4 qt_Matrix;float qt_Opacity;mat4 viewMatrix;mat4 projectionMatrix;vec3 cameraPosition;vec2 viewport;float resolution;float pointCount;float uTime;float uCorridor;float uAmplitude;float uMaxSwell;float uWaveNumberMax;float uDetail;float uOffsetGain;float uFlow;float uFormation;float uScatter;float uPulse;float uSpectralCentroid;float uViewportHeight;float uSizeBase;float uSizeGain;float uGlow;float uGlowPass;vec3 uPrimaryColor;vec3 uAccentColor;vec3 uSecondaryColor;vec4 uRippleSource0;vec4 uRippleShape0;
vec4 uRippleSource1;vec4 uRippleShape1;
vec4 uRippleSource2;vec4 uRippleShape2;
vec4 uRippleSource3;vec4 uRippleShape3;
vec4 uRippleSource4;vec4 uRippleShape4;
vec4 uRippleSource5;vec4 uRippleShape5;
vec4 uRippleSource6;vec4 uRippleShape6;
vec4 uRippleSource7;vec4 uRippleShape7;
vec4 uRippleSource8;vec4 uRippleShape8;float metalPointRaster;};vec4 getRippleSource(int i){if(i==0)return uRippleSource0;if(i==1)return uRippleSource1;if(i==2)return uRippleSource2;if(i==3)return uRippleSource3;if(i==4)return uRippleSource4;if(i==5)return uRippleSource5;if(i==6)return uRippleSource6;if(i==7)return uRippleSource7;return uRippleSource8;}
vec4 getRippleShape(int i){if(i==0)return uRippleShape0;if(i==1)return uRippleShape1;if(i==2)return uRippleShape2;if(i==3)return uRippleShape3;if(i==4)return uRippleShape4;if(i==5)return uRippleShape5;if(i==6)return uRippleShape6;if(i==7)return uRippleShape7;return uRippleShape8;}
#define RIPPLE_COUNT 9



   // (uniformScale, yStretch, localRadius = this primitive's own size)


    // corridor: (along the tunnel in radius units, angle around it). clouds: dissolve seed.


      // 0 = formation clouds, 1 = path tunnel
     // displacement per unit of swell, as a FRACTION of the primitive's own radius
      // the DISPLACEMENT that counts as full reach - normalises d. Reading d off
                              // the raw wave instead let a point glow while the amplitude held it
                              // perfectly still (audio response at 0: no motion, full halo).
 // finest wavenumber this buffer's lattice can carry without aliasing
        // 0..1 sustained treble: fine surface texture ON EXISTING CRESTS only
// Ripple sources. Audio writes these and nothing else; the surface motion is autonomous after.
//   clouds:   xyz = origin on the shape's unit sphere
//   corridor: xy  = origin as (along, angle) on the tunnel wall
  // origin, w = birth time
   // x = strength, y = speed, z = packet width, w = wavenumber
    // whole-body sway gain, driven by mid energy
          // how much the corridor's idle breath travels on its own
     // 1 = formed, 0 = fully scattered/dissolved (song-change dissolve)
       // how far points fly out when dissolving
         // gentle whole-body beat scale










layout(location=1)out vec3 vColor;
layout(location=2)out float vAlpha;
layout(location=3)out float vReaction;

float hermite(float value) { return value * value * (3.0 - 2.0 * value); }
float hash11(float n) { return fract(sin(n) * 43758.5453123); }

float resolveLife(float distanceToCamera) {
    float farT = clamp((27.0 - distanceToCamera) / 7.0, 0.0, 1.0);
    float nearT = clamp((distanceToCamera - 1.2) / 1.8, 0.0, 1.0);
    return hermite(farT) * hermite(nearT);
}

/**
 * One ripple's contribution at distance r from its origin - the whole elastic behaviour, in four terms:
 *   dr   = how far this point is from the ring the wave has expanded to (age * speed)
 *   sin  = the crest/trough, so the surface overshoots and rings back (elasticity + inertia)
 *   exp  = the packet's width, then the decay in time and in distance (birth, spread, settle)
 * Every term is a smooth function of r, so neighbouring points - including across a cube's edge or the
 * tunnel's seam - move together as one wavefront. Shared by both modes: only r is measured differently.
 */
float ripplePacket(float r, float age, vec4 shape) {
    float dr = r - age * shape.y;
    float k = min(shape.w, uWaveNumberMax);
    float packet = exp(-(dr * dr) / (shape.z * shape.z)) * sin(dr * k);
    // The age decay has to outlast the wave's own travel, or it dies before it has visibly crossed the
    // surface - and the propagation is the entire point.
    return shape.x * packet * exp(-age * 1.15) * exp(-r * 0.35);
}

/** Clouds: sum of every live ripple, in the shape's own unit space. Each cluster spins the origin by its
 *  own phase, so neighbouring clouds are struck in the same instant but not at the same spot. */
float cloudRipples(vec3 unitPos, float phase) {
    float spin = cos(phase);
    float spun = sin(phase);
    float total = 0.0;
    for (int i = 0; i < RIPPLE_COUNT; i += 1) {
        vec4 source = getRippleSource(i);
        vec4 shape = getRippleShape(i);
        float age = uTime - source.w;
        if (shape.x <= 0.0 || age < 0.0) continue;
        vec3 origin = vec3(
            source.x * spin - source.z * spun,
            source.y,
            source.x * spun + source.z * spin
        );
        total += ripplePacket(distance(unitPos, origin), age, shape);
    }
    return total;
}

/**
 * Offset from a source to this point ON THE TUNNEL WALL, as (along, arc), both in radius units so the
 * result is directly comparable to a cloud's 3D distance and one set of ripple parameters drives both.
 * The angular term is wrapped to [-PI, PI] by atan(sin, cos), which is EXACTLY periodic - that is what
 * makes a ripple cross the seam without noticing it, and lets it spread round the circumference and meet
 * itself on the far side. See the seam note at the top of this file.
 */
vec2 corridorSurfaceDelta(vec2 w, vec2 origin) {
    float dAngle = w.y - origin.y;
    return vec2(w.x - origin.x, atan(sin(dAngle), cos(dAngle)));
}

/** Corridor: the same ripples, measured across the wall - so a hit lifts a contiguous patch of cylinder
 *  that then travels both round the ring and along the tunnel. */
float corridorRipples(vec2 w) {
    float total = 0.0;
    for (int i = 0; i < RIPPLE_COUNT; i += 1) {
        vec4 source = getRippleSource(i);
        vec4 shape = getRippleShape(i);
        float age = uTime - source.w;
        if (shape.x <= 0.0 || age < 0.0) continue;
        total += ripplePacket(length(corridorSurfaceDelta(w, source.xy)), age, shape);
    }
    return total;
}

// A slow continuous breath so a cloud is alive between hits. Still one smooth field of position, so it
// cannot separate anything; deliberately far below the ripples in scale, and excluded from d so it never
// lights the shape up.
float cloudIdle(vec3 unitPos) {
    return 0.11 * sin(unitPos.x * 1.7 + uTime * 0.5) * cos(unitPos.z * 1.4 - uTime * 0.37)
         + 0.06 * sin(unitPos.y * 2.1 - uTime * 0.66);
}

// The corridor's equivalent: a slow region envelope carrying finer travelling waves along the tunnel.
// Every ANGULAR term is an integer harmonic (2.0, 3.0) so it closes on itself after a full turn.
float corridorIdle(vec2 w) {
    float t = uTime * uFlow;
    float region = 0.6 + 0.4 * sin(w.x * 0.42 - t * 0.33);
    float ripple = 0.62 * sin(w.x * 1.25 - t * 1.15)
                 + 0.30 * sin(w.x * 0.8 + w.y * 2.0 - t * 0.8)
                 + 0.08 * sin(w.y * 3.0 + t * 0.5);
    return region * ripple;
}

// Fine surface texture for sustained treble. Products of sines beat together into diagonal components
// above the nominal frequency, so these run at 0.7 of the lattice ceiling to leave that headroom.
float cloudDetail(vec3 p) {
    float k = uWaveNumberMax * 0.7;
    return sin(p.x * k + uTime * 3.1)
         * sin(p.y * k - uTime * 2.6)
         * sin(p.z * k + uTime * 2.2);
}

// Same, on the wall. The angular harmonic is floored to an integer so it closes round the circle.
float corridorDetail(vec2 w) {
    float k = uWaveNumberMax * 0.7;
    float n = max(1.0, floor(k));
    return sin(w.x * k + uTime * 3.1) * sin(w.y * n - uTime * 2.4);
}

void main() {float row=floor(qt_MultiTexCoord0.y*(pointCount*4.0-1.0)+.5);float part=mod(row,4.0);int index=int(min(pointCount-1.0,floor(row/4.0)+(part>2.5?1.0:0.0)));vec2 corner=part<.5?vec2(qt_MultiTexCoord0.x,1.0):part<1.5?vec2(qt_MultiTexCoord0.x,0.0):part<2.5?vec2(1.0,0.0):vec2(0.0,1.0);vPoint=corner;vec4 p0=texelFetch(pointData,ivec2(0,index),0),p1=texelFetch(pointData,ivec2(1,index),0),p2=texelFetch(pointData,ivec2(2,index),0),p3=texelFetch(pointData,ivec2(3,index),0),p4=texelFetch(pointData,ivec2(4,index),0);vec3 position=p0.xyz,aNormal=p1.xyz,aAnchor=p2.xyz,aScale=vec3(p1.w,p2.w,p3.w),aStyle=p3.xyz;float aPhase=p0.w;vec2 aWave=p4.xy;
    float colorSlot = aStyle.y;
    float isFar = aStyle.z;
    vec3 normalDir = normalize(aNormal);
    // How big this primitive actually is, in its own local units. Everything below moves by a fraction
    // of it, never by a world-constant number of units.
    float localRadius = aScale.z;

    // Stretch the base shape FIRST, then displace: scaling AFTER would multiply the displacement by
    // aScale.y too, and a tall pillar's caps would travel ~3.4x further than its sides.
    vec3 basePos = position;
    basePos.y *= aScale.y;

    // ONE scalar swell per mode, then ONE displacement shape for both. Nothing here is per-face.
    // The field is read from the UNSTRETCHED position in the shape's own unit space, so one set of ripple
    // parameters fits every primitive and a 3.4x pillar reads the same wavefront across its width as
    // along its length.
    vec3 unitPos = position / localRadius;
    bool corridor = uCorridor > 0.5;
    float audio = corridor ? corridorRipples(aWave) : cloudRipples(unitPos, aPhase);
    float idle = corridor ? corridorIdle(aWave) : cloudIdle(unitPos);

    // HIGH FREQUENCY. Gated by the swell that is ALREADY there, so sustained treble can only sharpen the
    // texture of a crest that exists - on a still surface the gate is 0 and it cannot manufacture noise.
    // It is a continuous field like everything else, so neighbours share it and it cannot flicker or
    // scatter; and it is deliberately a fraction of the low-frequency travel, so it layers on top of the
    // big swell instead of competing with it.
    float detail = uDetail * smoothstep(0.06, 0.45, abs(audio));
    audio += (corridor ? corridorDetail(aWave) : cloudDetail(unitPos)) * detail * 0.3;

    // Safety net only: several sources peaking together must not throw a point clear of its own body.
    float swell = clamp(audio + idle, -1.6, 1.6) * uAmplitude;
    vec3 displaced = basePos + normalDir * (swell * localRadius);
    // d = how far the music ACTUALLY moved this point, against a fixed full-reach displacement. Two things
    // it must not be: the raw wave (a point held still by a zero amplitude would still glow), or the total
    // swell (the idle breath would light the shape up with no music playing). Both were true before.
    float d = clamp(abs(clamp(audio, -1.6, 1.6) * uAmplitude) / max(uMaxSwell, 0.0001), 0.0, 1.0);

    // Whole-body sway on mid energy (the reference's offsetGain): a RIGID translation of the entire
    // cluster along a FIXED local axis, exactly as the reference does it (newpos.z += ...). Along
    // normalDir it would translate each face in its own direction - a per-face displacement, which is the
    // very thing that splits a cube open. On the corridor aPhase is now ring-constant, so a ring sways as
    // one rigid ring rather than shearing itself open at the seam.
    displaced.z += sin(uTime * 0.6 + aPhase) * 0.12 * uOffsetGain * localRadius;

    // Dissolve: as uFormation falls to 0 the points fly apart into the surroundings (and fade below), so a
    // corridor leaves by dispersing and arrives by gathering back in - never a flat alpha cut.
    float scatter = 1.0 - uFormation;
    if (scatter > 0.001) {
        float r1 = hash11(aPhase * 12.9898 + aWave.x * 78.233);
        float r2 = hash11(aPhase * 39.346 + aWave.y * 11.135 + 3.7);
        float r3 = hash11(r1 * 91.7 + r2 * 47.3);
        vec3 spread = normalize(normalDir * 0.75 + vec3(r1 - 0.5, r2 - 0.5, r3 - 0.5) * 1.6);
        displaced += spread * (scatter * scatter * uScatter * (0.55 + r3 * 0.9));
    }

    displaced *= aScale.x * uPulse;
    vec3 worldPosition = aAnchor + displaced;

    float life = resolveLife(distance(worldPosition, cameraPosition));
    vec4 mvPosition = viewMatrix * vec4(worldPosition, 1.0);

    // The reaching points GROW - in the reference this size gain, not the travel, is what reads as the
    // amplitude. Treble adds a further, smaller, SMOOTH size lift over its (continuous) detail region -
    // never a per-point random scale, which would read as the flicker we must avoid. The glow layer draws
    // the same points as wide soft haloes.
    float glowScale = mix(1.0, 1.9 + uGlow * 1.3, uGlowPass);
    float sizeWorld = (uSizeBase + (pow(d, 3.0) + detail * 0.35) * uSizeGain) * glowScale;
    float projected = sizeWorld * uViewportHeight * projectionMatrix[1][1] * 0.5 / max(-mvPosition.z, 0.1);
    float pointSize = clamp(projected, mix(1.4, 2.0, uGlowPass), mix(26.0, 64.0, uGlowPass));
    vec4 clip=projectionMatrix*mvPosition;vec2 pixel=vec2((clip.x+clip.w)*.5*viewport.x,(clip.w-clip.y)*.5*viewport.y);if(metalPointRaster>.5){vec2 center=(clip.xy/clip.w*.5+.5)*viewport*resolution;vec2 low=center-pointSize*.5;vec2 high=center+pointSize*.5;vec2 origin=floor(low*256.0+.5)/256.0;vec2 span=(floor(high*16.0+.5)-floor(low*16.0+.5))/16.0;vec2 physical=origin+corner*span;pixel=vec2(physical.x,viewport.y*resolution-physical.y)/resolution*clip.w;vPoint=vec2(corner.x,1.0-corner.y);}else{pixel+=(corner-vec2(.5))*vec2(1.0,-1.0)*(pointSize/resolution)*clip.w;}gl_Position=qt_Matrix*vec4(pixel,0.0,clip.w);if(clip.z < -clip.w||clip.z>clip.w||mvPosition.z>=0.0)gl_Position=vec4(2.0,2.0,2.0,1.0);

    // Palette drift through primary/accent/secondary; reaching points re-tint toward the hot accent so
    // active regions read as coloured bands. Treble pushes its detail region further along that shift, so
    // a cymbal colours a continuous patch of surface that travels and fades with the ripple under it.
    float gradientPhase = (
        dot(basePos, vec3(0.2, 0.16, 0.13))
        + aPhase * 0.05
        + colorSlot * 0.5
        + uTime * 0.02
        + uSpectralCentroid * 0.3
    ) * 6.283;
    vec3 wgt = max(vec3(0.0), 0.5 + 0.5 * cos(gradientPhase - vec3(0.0, 2.094, 4.188)));
    wgt *= wgt; wgt /= max(wgt.x + wgt.y + wgt.z, 0.001);
    vec3 baseColor = uPrimaryColor * wgt.x + uAccentColor * wgt.y + uSecondaryColor * wgt.z;
    vec3 hotColor = mix(uAccentColor, uSecondaryColor, smoothstep(0.2, 0.9, uSpectralCentroid));
    float hot = min(1.0, smoothstep(0.1, 0.75, d) * 0.75 + detail * 0.3);
    vColor = mix(baseColor, hotColor, hot) * (0.92 + d * 0.5);

    float layerBase = mix(0.72, 0.5, isFar);
    // Contrast layer: a readable body plus a reach lift, so the geometry is legible even in silence.
    // Glow layer: bound to the DISPLACED region and nothing else. It starts at zero - a point the music is
    // not moving does not glow at all - and rises smoothly with d, which is itself a continuous field, so
    // the halo fades outward from a crest and travels and decays with it instead of blinking.
    float formed = smoothstep(0.0, 0.45, uFormation);
    vAlpha = formed * (uGlowPass > 0.5
        ? life * smoothstep(0.1, 0.8, d) * 1.15
        : life * min(1.0, layerBase + d * 0.28));
    vReaction = d;
}
