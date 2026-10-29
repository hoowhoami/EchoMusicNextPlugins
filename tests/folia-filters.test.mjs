import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const base = new URL('../plugins/folia-lyrics-skin/qml/styles/sonnet/filters/', import.meta.url);
async function kernel() {
  const file = new URL('kernel.mjs', base);
  assert.ok(existsSync(file), 'Shared native source filter kernel must exist');
  return import(file);
}
test('Scene filter order and uniforms preserve source profile and seed normalization', async () => {
  const k = await kernel();
  const result = k.postProcessPasses(
    {
      lensDistortion: 0.3,
      lensDispersion: 0.2,
      noise: 0.07,
      contrast: 0.25,
      printEffects: { rgbShift: 0.4, halftone: 0.5, vignette: 0.85 },
    },
    123456,
  );
  assert.deepEqual(result, [
    { kind: 'lens', uDistortion: 0.3, uDispersion: 0.2 },
    { kind: 'noise', uNoise: 0.07, uSeed: 0.3456 },
    { kind: 'contrast', uContrast: 0.25 },
    { kind: 'rgb', uAmount: 0.4 },
    { kind: 'halftone', uAmount: 0.5 },
    { kind: 'vignette', uAmount: 0.85 },
  ]);
  assert.deepEqual(
    k.postProcessPasses(
      {
        lensDistortion: 0,
        lensDispersion: 0,
        noise: 0,
        contrast: 0,
        printEffects: { rgbShift: 0, halftone: 0, vignette: 0 },
      },
      0,
    ),
    [],
  );
});
test('Pixi optimized blur keeps fixed kernel weights and all X rounds before Y', async () => {
  const k = await kernel();
  const passes = k.expandPasses([{ kind: 'blur', strength: 4.6, quality: 2, kernelSize: 5 }]);
  assert.deepEqual(
    passes.map((p) => [p.kind, p.axis]),
    [
      ['blur5', 'x'],
      ['blur5', 'x'],
      ['blur5', 'y'],
      ['blur5', 'y'],
    ],
  );
  assert.equal(passes[0].uStrength, 4.6 / Math.sqrt(1.25));
  assert.equal(passes[1].uStrength, passes[0].uStrength * 0.5);
  assert.equal(passes[2].uStrength, passes[0].uStrength);
  assert.deepEqual(k.blurWeights(5), [0.153388, 0.221461, 0.250301, 0.221461, 0.153388]);
  assert.throws(
    () => k.expandPasses([{ kind: 'blur', strength: 3, quality: 20, kernelSize: 5 }]),
    /quality/,
  );
  assert.throws(() => k.expandPasses([{ kind: 'not-a-real-effect' }]), /Unsupported/);
});
test('Filter allocation uses exact source pool bounds and physical half-texel clamp', async () => {
  const k = await kernel();
  const plan = k.texturePlan(1000, 700, 1.5, 6);
  assert.deepEqual(plan.physicalSize, { width: 2048, height: 2048 });
  assert.deepEqual(plan.inputSize, [2048 / 1.5, 2048 / 1.5, 1.5 / 2048, 1.5 / 2048]);
  assert.deepEqual(plan.frameSize, [1000, 700]);
  assert.deepEqual(plan.uvScale, [1500 / 2048, 1050 / 2048]);
  assert.deepEqual(plan.inputClamp, [0.5 / 2048, 0.5 / 2048, 1499.5 / 2048, 1049.5 / 2048]);
  assert.equal(plan.cacheBytes, 7 * 2048 * 2048 * 4);
  const root = k.texturePlan(1000.3, 700.3, 1, 6, 1.5);
  assert.deepEqual(root.physicalSize, { width: 1024, height: 1024 });
  assert.deepEqual(root.outputPhysicalSize, { width: 1500, height: 1050 });
  assert.deepEqual(root.outputFrameSize, [1000, 700]);
  assert.deepEqual(root.outputUvScale, [1, 1]);
  assert.equal(root.cacheBytes, (6 * 1024 * 1024 + 1500 * 1050) * 4);
  assert.throws(() => k.texturePlan(100, 100, 1, 1, 8), /resolution/);
  assert.throws(() => k.texturePlan(8000, 8000, 4, 6), /budget|texture/i);
});
test('Source shader provenance includes the original bodies and Pixi MIT kernels', async () => {
  await kernel();
  const manifest = JSON.parse(readFileSync(new URL('sources.json', base), 'utf8'));
  assert.equal(manifest.revision, 'a8da4437cf19723555bd75e4685ca20815fe5b82');
  assert.equal(manifest.pixi, '8.21.0');
  for (const kind of [
    'lens',
    'noise',
    'contrast',
    'rgb',
    'halftone',
    'vignette',
    'glitch',
    'blur5',
  ])
    assert.ok(
      existsSync(new URL(kind + '.frag.qsb', base)),
      kind + ' must have a real compiled native shader',
    );
  assert.match(readFileSync(new URL('lens.frag', base), 'utf8'), /0\.84 - clamp\(uDispersion/);
  assert.match(readFileSync(new URL('halftone.frag', base), 'utf8'), /sqrt\(clamp\(value/);
  assert.match(
    readFileSync(new URL('glitch.frag', base), 'utf8'),
    /coarseGate \* uAmount \* 0\.095/,
  );
});

test('Native descriptors and every optimized blur quality match the independent original source', async () => {
  const k = await kernel(),
    original = await import(
      'data:text/javascript;base64,' + Buffer.from(sourceOracleCode).toString('base64')
    );
  class UniformGroup {
    constructor(values) {
      this.uniforms = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value.value]),
      );
    }
  }
  class Filter {
    constructor(options) {
      Object.assign(this, options);
    }
  }
  class NoiseFilter {
    constructor(options) {
      this.kind = 'noise';
      this.options = options;
    }
  }
  class ColorMatrixFilter {
    contrast(amount) {
      this.kind = 'contrast';
      this.amount = amount;
    }
  }
  const pixi = {
    UniformGroup,
    Filter,
    NoiseFilter,
    ColorMatrixFilter,
    GlProgram: { from: (value) => value },
  };
  for (const seed of [0, 31, 123456, -37])
    for (const amount of [0, 0.2, 1]) {
      const a = {
        lensDistortion: amount,
        lensDispersion: amount * 0.5,
        noise: amount * 0.35,
        contrast: amount * 0.5,
        printEffects: { rgbShift: amount, halftone: amount * 0.6, vignette: amount * 1.5 },
      };
      const expected = original.createSonnetPostProcessFilters(pixi, a, seed).map((filter) => {
        if (filter.kind === 'noise')
          return { kind: 'noise', uNoise: filter.options.noise, uSeed: filter.options.seed };
        if (filter.kind === 'contrast') return { kind: 'contrast', uContrast: filter.amount };
        if (filter.glProgram.name === 'sonnet-lens-distortion') {
          const u = filter.resources.lensUniforms.uniforms;
          return { kind: 'lens', uDistortion: u.uDistortion, uDispersion: u.uDispersion };
        }
        const names = {
          'sonnet-print-rgb-shift': 'rgb',
          'sonnet-print-halftone': 'halftone',
          'sonnet-print-vignette': 'vignette',
        };
        return {
          kind: names[filter.glProgram.name],
          uAmount: filter.resources.printUniforms.uniforms.uAmount,
        };
      });
      assert.deepEqual(k.postProcessPasses(a, seed), expected);
    }
  for (const quality of [1, 2, 3, 4, 5, 6, 7, 8])
    for (const strength of [0.2, 4.6, 128]) {
      const passes = k.expandPasses([{ kind: 'blur', quality, strength, kernelSize: 5 }]);
      const first = original.sourceBlurInitial.call({ strength, passes: quality });
      assert.equal(passes[0].uStrength, first);
      for (let i = 0; i < quality; i++) assert.equal(passes[i].uStrength, first * Math.pow(0.5, i));
    }
});
// BEGIN Folia source filter oracle (generated)
const sourceOracleCode =
  'var s=`\nin vec2 aPosition;\nout vec2 vTextureCoord;\n\nuniform vec4 uInputSize;\nuniform vec4 uOutputFrame;\nuniform vec4 uOutputTexture;\n\nvoid main(void) {\n    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;\n    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;\n    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;\n    gl_Position = vec4(position, 0.0, 1.0);\n    vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);\n}\n`;var l=`\nin vec2 vTextureCoord;\nout vec4 finalColor;\n\nuniform sampler2D uTexture;\nuniform highp vec4 uInputSize;\nuniform vec4 uInputClamp;\nuniform highp vec4 uOutputFrame;\nuniform float uDistortion;\nuniform float uDispersion;\n\nvec2 screenToTextureUv(vec2 screenUv) {\n    return screenUv * uOutputFrame.zw * uInputSize.zw;\n}\n\nvec4 sampleInside(vec2 uv) {\n    if (uv.x < uInputClamp.x || uv.y < uInputClamp.y\n        || uv.x > uInputClamp.z || uv.y > uInputClamp.w) {\n        return vec4(0.0);\n    }\n    return texture(uTexture, uv);\n}\n\nvoid main(void) {\n    vec2 screenUv = vTextureCoord * uInputSize.xy / max(uOutputFrame.zw, vec2(1.0));\n    vec2 centered = screenUv - 0.5;\n    float aspect = uOutputFrame.z / max(uOutputFrame.w, 1.0);\n    centered.x *= aspect;\n\n    float radiusSquared = dot(centered, centered);\n    // Keep the low end subtle but leave enough headroom for the broad barrel warp in the\n    // reference look; the UI/store expose this as a 0..2 amount.\n    float curvature = uDistortion * 0.32;\n    float radialScale = 1.0 - curvature * radiusSquared\n        + curvature * 0.16 * radiusSquared * radiusSquared;\n    vec2 lensCentered = centered * radialScale;\n    lensCentered.x /= aspect;\n    vec2 lensUv = lensCentered + 0.5;\n\n    float radius = sqrt(radiusSquared);\n    vec2 radialDirection = radius > 0.0001 ? centered / radius : vec2(0.0);\n    float edgeWeight = smoothstep(0.12, 0.9, radius);\n    vec2 dispersion = radialDirection * uDispersion * 0.012 * edgeWeight;\n    dispersion.x /= aspect;\n\n    vec4 center = sampleInside(screenToTextureUv(lensUv));\n    vec4 redSample = sampleInside(screenToTextureUv(lensUv + dispersion));\n    vec4 blueSample = sampleInside(screenToTextureUv(lensUv - dispersion));\n    float alpha = max(center.a, max(redSample.a, blueSample.a));\n    float coreWeight = 0.84 - clamp(uDispersion, 0.0, 1.0) * 0.18;\n    vec3 core = center.rgb * coreWeight;\n    vec3 separated = vec3(redSample.r, center.g, blueSample.b);\n    // Keep a neutral core for thin MG strokes, then add the displaced channels as colored\n    // fringes. Without this fallback, a one-pixel line can sample transparent red/blue texels\n    // and become an unintended green-only stroke.\n    vec3 color = max(core, separated);\n\n    // Pixi render textures are premultiplied; the max channel values remain premultiplied.\n    finalColor = vec4(color, alpha);\n}\n`,u=(t,e)=>{let o=new t.UniformGroup({uDistortion:{value:e.distortion,type:"f32"},uDispersion:{value:e.dispersion,type:"f32"}});return new t.Filter({glProgram:t.GlProgram.from({vertex:s,fragment:l,name:"sonnet-lens-distortion"}),resources:{lensUniforms:o},antialias:"on"})};var m=`\nin vec2 vTextureCoord;\nout vec4 finalColor;\n\nuniform sampler2D uTexture;\nuniform highp vec4 uInputSize;\nuniform vec4 uInputClamp;\nuniform float uAmount;\n\nvec4 sampleInside(vec2 uv) {\n    if (uv.x < uInputClamp.x || uv.y < uInputClamp.y\n        || uv.x > uInputClamp.z || uv.y > uInputClamp.w) {\n        return vec4(0.0);\n    }\n    return texture(uTexture, uv);\n}\n\nvoid main(void) {\n    vec2 offset = vec2(0.9063, 0.4226) * uAmount * 3.0 * uInputSize.zw;\n    vec4 redSample = sampleInside(vTextureCoord + offset);\n    vec4 center = sampleInside(vTextureCoord);\n    vec4 blueSample = sampleInside(vTextureCoord - offset);\n    float alpha = max(center.a, max(redSample.a, blueSample.a));\n    float coreWeight = 0.84 - clamp(uAmount, 0.0, 1.0) * 0.18;\n    vec3 core = center.rgb * coreWeight;\n    vec3 separated = vec3(redSample.r, center.g, blueSample.b);\n    // Preserve a neutral core for thin strokes so transparent red/blue offset samples cannot\n    // collapse a white MG line into an unintended green-only result.\n    finalColor = vec4(max(core, separated), alpha);\n}\n`,p=`\nin vec2 vTextureCoord;\nout vec4 finalColor;\n\nuniform sampler2D uTexture;\nuniform float uAmount;\n\nfloat dotScreen(vec2 fragCoord, float angle, float value, float cellSize) {\n    float c = cos(angle);\n    float s = sin(angle);\n    vec2 rotated = mat2(c, s, -s, c) * fragCoord;\n    float dist = length(fract(rotated / cellSize) - 0.5) * cellSize;\n    float radius = sqrt(clamp(value, 0.0, 1.0)) * cellSize * 0.62;\n    return 1.0 - smoothstep(radius - 1.2, radius + 1.2, dist);\n}\n\nvoid main(void) {\n    vec4 color = texture(uTexture, vTextureCoord);\n    if (color.a > 0.0) {\n        color.rgb /= color.a;\n    }\n    float cellSize = 5.0;\n    vec3 screened = vec3(\n        dotScreen(gl_FragCoord.xy, radians(15.0), color.r, cellSize),\n        dotScreen(gl_FragCoord.xy, radians(75.0), color.g, cellSize),\n        dotScreen(gl_FragCoord.xy, radians(0.0), color.b, cellSize)\n    );\n    color.rgb = mix(color.rgb, screened, uAmount);\n    color.rgb *= color.a;\n    finalColor = color;\n}\n`,f=`\nin vec2 vTextureCoord;\nout vec4 finalColor;\n\nuniform sampler2D uTexture;\nuniform highp vec4 uInputSize;\nuniform highp vec4 uOutputFrame;\nuniform float uAmount;\n\nvoid main(void) {\n    vec4 color = texture(uTexture, vTextureCoord);\n    // The filtered container uses a viewport-sized filterArea, so this recovers stable\n    // 0..1 viewport coordinates instead of coordinates derived from lyric bounds.\n    vec2 screenUv = vTextureCoord * uInputSize.xy / uOutputFrame.zw;\n    vec2 centered = screenUv - 0.5;\n    centered.x *= uOutputFrame.z / uOutputFrame.w;\n    float vignette = clamp(smoothstep(0.52, 1.08, length(centered)) * uAmount * 0.6, 0.0, 1.0);\n    finalColor = mix(color, vec4(0.0, 0.0, 0.0, 1.0), vignette);\n}\n`,i=(t,e,o,r)=>new t.Filter({glProgram:t.GlProgram.from({vertex:s,fragment:o,name:e}),resources:{printUniforms:new t.UniformGroup({uAmount:{value:r,type:"f32"}})},antialias:"on"}),c=(t,e)=>{let o=[];return e.rgbShift>0&&o.push(i(t,"sonnet-print-rgb-shift",m,e.rgbShift)),e.halftone>0&&o.push(i(t,"sonnet-print-halftone",p,e.halftone)),e.vignette>0&&o.push(i(t,"sonnet-print-vignette",f,e.vignette)),o};var h=(t,e,o)=>{let r=[];if((e.lensDistortion>0||e.lensDispersion>0)&&r.push(u(t,{distortion:e.lensDistortion,dispersion:e.lensDispersion})),e.noise>0){let n=new t.NoiseFilter({noise:e.noise,seed:o%1e4/1e4,antialias:"on"});r.push(n)}if(e.contrast>0){let n=new t.ColorMatrixFilter;n.contrast(e.contrast,!1),n.antialias="on",r.push(n)}let a=c(t,e.printEffects);return a.length>0&&r.push(...a),r};function C(){let t=1,e=.5;for(let o=1;o<this.passes;o++)t+=e*e,e*=.5;return this.strength/Math.sqrt(t)}export{h as createSonnetPostProcessFilters,C as sourceBlurInitial};\n';
// END Folia source filter oracle
test('Pixi8.21 registered screens cap each pool axis before UV and half-texel calculation', async () => {
  const k = await kernel();
  assert.deepEqual(k.optimalTextureSize(1000, 700, 1.5, [{ width: 1500, height: 1050 }]), {
    width: 1500,
    height: 1050,
  });
  const plan = k.texturePlan(1000, 700, 1.5, 6, 1.5, [{ width: 1500, height: 1050 }]);
  assert.deepEqual(plan.physicalSize, { width: 1500, height: 1050 });
  assert.deepEqual(plan.uvScale, [1, 1]);
  assert.deepEqual(plan.inputClamp, [0.5 / 1500, 0.5 / 1050, 1499.5 / 1500, 1049.5 / 1050]);
  assert.equal(plan.cacheBytes, 7 * 1500 * 1050 * 4);
});
test('Pool sizing matches the actual Pixi8.21 TexturePoolClass with multiple registered canvases', async () => {
  const k = await kernel();
  for (const row of poolSourceGoldens)
    assert.deepEqual(
      k.optimalTextureSize(row.width, row.height, row.resolution, row.screens),
      row.expected,
      JSON.stringify(row),
    );
});
// BEGIN Pixi8.21 real pool goldens (generated)
const poolSourceGoldens = [
  {
    width: 1000,
    height: 700,
    resolution: 1.5,
    screens: [],
    expected: { width: 2048, height: 2048 },
  },
  { width: 256, height: 128, resolution: 1.4, screens: [], expected: { width: 512, height: 256 } },
  {
    width: 781,
    height: 850,
    resolution: 1.204705882352941,
    screens: [],
    expected: { width: 1024, height: 1024 },
  },
  {
    width: 20.2,
    height: 300.1,
    resolution: 0.75,
    screens: [],
    expected: { width: 16, height: 256 },
  },
  { width: 1280, height: 720, resolution: 2, screens: [], expected: { width: 4096, height: 2048 } },
  {
    width: 1000,
    height: 700,
    resolution: 1.5,
    screens: [{ width: 1500, height: 1050 }],
    expected: { width: 1500, height: 1050 },
  },
  {
    width: 256,
    height: 128,
    resolution: 1.4,
    screens: [{ width: 1500, height: 1050 }],
    expected: { width: 512, height: 256 },
  },
  {
    width: 781,
    height: 850,
    resolution: 1.204705882352941,
    screens: [{ width: 1500, height: 1050 }],
    expected: { width: 1024, height: 1024 },
  },
  {
    width: 20.2,
    height: 300.1,
    resolution: 0.75,
    screens: [{ width: 1500, height: 1050 }],
    expected: { width: 16, height: 256 },
  },
  {
    width: 1280,
    height: 720,
    resolution: 2,
    screens: [{ width: 1500, height: 1050 }],
    expected: { width: 4096, height: 2048 },
  },
  {
    width: 1000,
    height: 700,
    resolution: 1.5,
    screens: [
      { width: 1920, height: 1080 },
      { width: 750, height: 1200 },
    ],
    expected: { width: 1920, height: 1080 },
  },
  {
    width: 256,
    height: 128,
    resolution: 1.4,
    screens: [
      { width: 1920, height: 1080 },
      { width: 750, height: 1200 },
    ],
    expected: { width: 512, height: 256 },
  },
  {
    width: 781,
    height: 850,
    resolution: 1.204705882352941,
    screens: [
      { width: 1920, height: 1080 },
      { width: 750, height: 1200 },
    ],
    expected: { width: 1024, height: 1024 },
  },
  {
    width: 20.2,
    height: 300.1,
    resolution: 0.75,
    screens: [
      { width: 1920, height: 1080 },
      { width: 750, height: 1200 },
    ],
    expected: { width: 16, height: 256 },
  },
  {
    width: 1280,
    height: 720,
    resolution: 2,
    screens: [
      { width: 1920, height: 1080 },
      { width: 750, height: 1200 },
    ],
    expected: { width: 4096, height: 2048 },
  },
];
// END Pixi8.21 real pool goldens
