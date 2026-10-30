import { foliaPath, foliaURL } from './folia-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
let api;
try {
  api = await import(
    pathToFileURL(path.resolve('plugins/folia-lyrics-skin/qml/styles/lumiere/api.mjs'))
  );
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
let original;
async function source() {
  if (original) return original;
  const output = await build({
    stdin: {
      resolveDir: foliaPath(),
      contents:
        "export * from './src/components/visualizer/lumiere/catalog.ts';export * from './src/components/visualizer/lumiere/lumiereRandom.ts';export * from './src/components/visualizer/lumiere/lumiereProgram.ts';export * from './src/components/visualizer/lumiere/lumiereSceneFrames.ts';export * from './src/components/visualizer/lumiere/lumiereUnitLayout.ts';export * from './src/components/visualizer/lumiere/lumiereAudio.ts';export * from './src/components/visualizer/lumiere/light/rig.ts';export * from './src/components/visualizer/lumiere/lumiereRuntimeTuning.ts';export * from './src/utils/lumiereTuning.ts';export * from './src/components/visualizer/lumiere/text/glyphLine.ts';export * from './src/components/visualizer/lumiere/light/bloomFilter.ts';export * from './src/components/visualizer/lumiere/lumiereSceneEntry.ts';export * from './src/components/visualizer/lumiere/light/sprites.ts';export {LumierePixiRuntime} from './src/components/visualizer/lumiere/createLumierePixiRuntime.ts';export {decideSongCommit,isInstrumentalConfirmed,getLyricsSignature} from './src/components/visualizer/songHandover.ts';",
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
  });
  return (original = await import(
    'data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64')
  ));
}
function available() {
  assert.ok(api, 'Lumiere source compiler/100 rigs are missing');
}
const clone = (value) => JSON.parse(JSON.stringify(value));
function lines() {
  return Array.from({ length: 31 }, (_, i) => {
    const text = i % 3 === 0 ? '山河 星光璀璨!' : 'under the moonlight ' + i;
    return {
      sourceIndex: i * 3,
      fullText: text,
      startTime: 8 + i * 4,
      endTime: 11 + i * 4,
      words: [{ text, startTime: 8 + i * 4, endTime: 11 + i * 4 }],
      autoWordSegments: text.split(/( )/),
      ...(i > 14 && i < 23 ? { isChorus: true, songPart: 'chorus' } : {}),
    };
  });
}
test('Lumiere retains all 100 original rig profiles, deterministic light and line-art geometry', async () => {
  available();
  const expected = await source();
  assert.equal(api.LUMIERE_PROFILES.length, 100);
  assert.deepEqual(api.LUMIERE_KINDS, expected.LUMIERE_KINDS);
  for (let i = 0; i < 100; i++) {
    const a = api.LUMIERE_PROFILES[i],
      b = expected.LUMIERE_PROFILES[i];
    assert.deepEqual(clone(a), clone(b));
    for (const aspect of [0.7, 16 / 9, 3]) {
      assert.deepEqual(
        a.lineArt({ aspect, random: api.createRng('source ' + i) }),
        b.lineArt({ aspect, random: expected.createRng('source ' + i) }),
      );
      const ra = a.light({ aspect, random: api.createRng('rig ' + i) }),
        rb = b.light({ aspect, random: expected.createRng('rig ' + i) });
      assert.deepEqual(ra, rb);
      for (const time of [0, 1.25, 42.7])
        assert.deepEqual(
          api.resolveBeams(ra, time, aspect, {
            intensity: 1.2,
            bass: 0.64,
            color: [1, 0.8, 0.4],
            local: time,
          }),
          expected.resolveBeams(rb, time, aspect, {
            intensity: 1.2,
            bass: 0.64,
            color: [1, 0.8, 0.4],
            local: time,
          }),
        );
    }
  }
});
test('Lumiere full-song and instrumental compilation/seamless shots equal original source', async () => {
  available();
  const expected = await source();
  for (const input of [[], lines()])
    for (const seed of ['山河😀', 0, 'track2'])
      for (const seamless of [false, true]) {
        const a = api.compileLumiereProgram(input, seed, {}, { seamless }),
          b = expected.compileLumiereProgram(input, seed, {}, { seamless });
        assert.deepEqual(a, b);
        for (let time = -1; time < a.duration + 3; time += 0.317)
          for (const motion of [false, true])
            assert.deepEqual(
              api.resolveLumiereSceneFrames(a, time, motion),
              expected.resolveLumiereSceneFrames(b, time, motion),
            );
      }
});
test('Lumiere source normalized audio attack/release and quality mapping remain exact', async () => {
  available();
  const expected = await source();
  for (const dt of [0, 0.016, 0.1, 1])
    for (const from of [0, 0.3, 1])
      for (const to of [0, 0.1, 0.8])
        assert.equal(
          api.smoothLumiereAudioValue(from, to, dt),
          expected.smoothLumiereAudioValue(from, to, dt),
        );
  for (const raw of [
    {},
    { renderQuality: 'low', fogOctaves: 6, moteAmount: 2 },
    { windowNeighbors: 7, darkField: 2, themeColorMix: -1, lightIntensity: Infinity },
  ]) {
    const a = api.normalizeLumiereTuning(raw),
      b = expected.normalizeLumiereTuning(raw);
    assert.deepEqual(a, b);
    assert.deepEqual(
      api.toLumiereSceneTuning(a, { showText: false }),
      expected.toLumiereSceneTuning(b, { showText: false }),
    );
  }
});
test('Lumiere native field adapter exposes actual source uniform packing', async () => {
  available();
  assert.equal(
    typeof api.createNativeLightField,
    'function',
    'source light-field packing bridge missing',
  );
  const field = api.createNativeLightField(640, 480);
  const profile = api.profileOf(''),
    rig = profile.light({ aspect: 4 / 3, random: api.createRng('field') }),
    beams = api.resolveBeams(rig, 2, 4 / 3, {
      intensity: 1,
      bass: 0,
      color: [1, 0.8, 0.4],
      local: 2,
    }),
    uniforms = field.update({
      beams,
      rig,
      time: 2,
      fogScale: 1,
      color: [1, 0.8, 0.4],
      glareScale: 1,
      dark: [0, 0, 0, 0],
      octaves: 5,
      textRegion: profile.region,
    });
  assert.deepEqual(uniforms.uFrame, [640, 480, 2, beams.length]);
  assert.equal(uniforms.uBeamA.length, 24);
  assert.equal(uniforms.uBeamA[0], Math.fround(beams[0].ox));
  assert.equal(uniforms.uBeamD[2], Math.fround(beams[0].b));
  field.destroy();
});
test('Lumiere source glyph Canvas records retain EGC draw order, prefix kerning and real subtexture slices', async () => {
  available();
  assert.equal(
    typeof api.createLumiereBackend,
    'function',
    'retained source Canvas/Texture bridge missing',
  );
  const native = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/native-measure.mjs'),
    canvas = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/canvas.mjs'),
    ported =
      await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/source/text/glyphLine.mjs'),
    original = await source();
  native.configure({
    evaluator: (font, text) => {
      const px = Number(/([\d.]+)px/.exec(font)[1]);
      return {
        width: Array.from(text).reduce(
          (sum, char) =>
            sum + (char === ' ' ? px * 0.28 : char.codePointAt(0) > 0x2e00 ? px * 0.97 : px * 0.53),
          0,
        ),
        actualBoundingBoxAscent: px * 0.8,
        actualBoundingBoxDescent: px * 0.2,
      };
    },
  });
  const previous = globalThis.document;
  globalThis.document = {
    createElement: (kind) => {
      assert.equal(kind, 'canvas');
      return canvas.createCanvas();
    },
  };
  try {
    for (const text of ['office á 👨‍👩‍👧‍👦 العربية 𠮷', 'italic f ffi 字'])
      for (const spacing of [0, 0.04]) {
        const options = {
            text,
            fontPx: 40,
            font: 'body',
            weight: 500,
            resolution: 1.75,
            letterSpacing: spacing,
            outline: spacing === 0 ? 0.012 : undefined,
          },
          a = ported.buildGlyphLine(api.createLumiereBackend(), options),
          b = original.buildGlyphLine(api.createLumiereBackend(), options),
          strip = (line) => ({
            text: line.text,
            fontPx: line.fontPx,
            width: line.width,
            height: line.height,
            glyphs: line.glyphs.map(({ texture, ...glyph }) => glyph),
          });
        assert.deepEqual(strip(a), strip(b));
        assert.deepEqual(
          a.glyphs[0].texture.source.resource.commands,
          b.glyphs[0].texture.source.resource.commands,
        );
        const commands = a.glyphs[0].texture.source.resource.commands;
        assert.equal(
          commands.filter((command) => command.kind === 'text' && !command.stroke).length,
          spacing === 0 ? 1 : a.glyphs.length,
        );
        assert.equal(commands[0].style.textBaseline, 'middle');
        a.destroy();
        b.destroy();
      }
  } finally {
    globalThis.document = previous;
    native.configure({});
  }
});

test('Lumiere bloom executes original down/up/combine passes against actual Pixi screen-aware pool', async () => {
  available();
  assert.equal(
    typeof api.createLumiereBloomPlan,
    'function',
    'source bloom pass planner is missing',
  );
  const expected = await source(),
    { TexturePoolClass } = await import(
      foliaURL('node_modules/pixi.js/lib/rendering/renderers/shared/texture/TexturePool.mjs')
    );
  for (const [width, height, resolution, screens] of [
    [640, 480, 1, [{ width: 640, height: 480 }]],
    [
      641,
      479,
      2,
      [
        { width: 1282, height: 958 },
        { width: 800, height: 600 },
      ],
    ],
    [901, 317, 0.7, [{ width: 901, height: 317 }]],
  ])
    for (const strength of [0, 1.2]) {
      const options = {
          strength,
          threshold: 0.42,
          knee: 0.18,
          levels: 6,
          spread: 0.68,
          padding: 0,
          tint: [1, 0.7, 0.25],
        },
        actual = api.createLumiereBloomPlan(width, height, resolution, options, screens),
        backend = api.createLumiereBackend(),
        pool = new TexturePoolClass();
      screens.forEach((screen, i) => pool.setScreenSize(i, screen.width, screen.height));
      const input = pool.getOptimalTexture(width, height, resolution),
        output = { root: true },
        passes = [];
      backend.TexturePool = pool;
      const filter = expected.createBloomFilter(backend, options),
        meta = (t) => ({
          width: t.frame.width,
          height: t.frame.height,
          pixelWidth: t.source.pixelWidth,
          pixelHeight: t.source.pixelHeight,
          resolution: t.source.resolution,
          sourceWidth: t.source.width,
          sourceHeight: t.source.height,
        }),
        textures = [input],
        index = (t) => {
          let i = textures.indexOf(t);
          if (i < 0) {
            i = textures.length;
            textures.push(t);
          }
          return i;
        };
      filter.apply(
        {
          applyFilter(pass, from, to, clear) {
            const group = Object.values(pass.resources).find((v) => v && v.uniforms),
              add = pass.resources.uAdd;
            passes.push({
              kind: pass.glProgram.name.replace('lumiere-bloom-', ''),
              input: index(from),
              output: to === output ? -1 : index(to),
              add: add ? index(textures.find((t) => t.source === add)) : null,
              clear,
              blendMode: pass.blendMode,
              uniforms: group
                ? Object.fromEntries(
                    Object.entries(group.uniforms).map(([k, v]) => [k, Array.from(v)]),
                  )
                : {},
            });
          },
        },
        input,
        output,
        true,
      );
      assert.deepEqual(actual.passes, passes);
      assert.deepEqual(actual.textures, textures.map(meta));
      assert.ok(actual.cacheBytes > 0);
      filter.destroy();
      pool.clear(true);
    }
});

test('Lumiere complete scene camera/line art/particle/text commands follow source at pause/seek times', async () => {
  available();
  assert.equal(
    typeof api.createNativeLumiereScene,
    'function',
    'source complete-scene bridge missing',
  );
  const expected = await source(),
    native = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/native-measure.mjs'),
    canvas = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/canvas.mjs');
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' }),
    texts = new Set(
      lines()
        .slice(0, 4)
        .flatMap((line) => [
          line.fullText,
          ...line.fullText.match(/\S+|\s+/g),
          ...line.autoWordSegments,
        ]),
    );
  native.configure({
    pieces: [...texts].map((text) => ({ text, pieces: [...segmenter.segment(text)] })),
    evaluator: (font, text) => {
      const px = Number(/([\d.]+)px/.exec(font)[1]);
      return {
        width: Array.from(text).reduce(
          (sum, char) =>
            sum + (char === ' ' ? px * 0.28 : char.codePointAt(0) > 0x2e00 ? px * 0.97 : px * 0.53),
          0,
        ),
        actualBoundingBoxAscent: px * 0.8,
        actualBoundingBoxDescent: px * 0.2,
      };
    },
  });
  const previousSegment = native.portableWordSegmenter.segment;
  native.portableWordSegmenter.segment = (text) => [...segmenter.segment(text)];
  const previous = globalThis.document;
  globalThis.document = { createElement: () => canvas.createCanvas() };
  try {
    const program = api.compileLumiereProgram(
        lines().slice(0, 4),
        'scene-seed',
        {},
        { seamless: false },
      ),
      theme = {
        primaryColor: '#eeeedd',
        secondaryColor: '#9999aa',
        accentColor: '#cc7755',
        wordColors: [{ word: 'moonlight', color: '#ff7799' }],
        lyricsIcons: [],
        fontFamily: 'Arial',
        fontWeight: 500,
        animationIntensity: 1,
      };
    for (const textOnly of [false, true]) {
      const tuning = api.toLumiereSceneTuning(api.normalizeLumiereTuning({ textOnly }), {
          showText: true,
        }),
        quality = {
          bloom: 1,
          textBloom: 1,
          graphicsResolution: null,
          bloomLevelDrop: 0,
          passthrough: null,
        },
        options = {
          width: 640,
          height: 480,
          resolution: 1,
          program,
          theme,
          tuning,
          quality,
          showText: true,
          index: program.paragraphs.findIndex((paragraph) => paragraph.lines.length > 0),
        },
        a = api.createNativeLumiereScene(options),
        pixi = api.createLumiereBackend(),
        sprites = expected.createLightSprites(pixi),
        b = expected.buildLumiereSceneEntry(
          pixi,
          { ...options, sprites, audioAt: () => ({ bass: 0, treble: 0, power: 0 }) },
          options.index,
        );
      for (const time of [0, 8.5, 11, 10, 17, 17]) {
        const layer = { alpha: 0.8, scale: 1.02, blur: time === 11 ? 2 : 0 },
          actual = a.frame(time, layer);
        expected.applyLumiereLayerFrame(pixi, b, layer, 0.5);
        b.unit.update(time);
        const reference = api.snapshotLumiereScene(b.holder),
          canonical = (value) => {
            const ids = new Map(value.nodes.map((v, i) => [v.id, i])),
              sources = new Map(value.textures.map((v, i) => [v.id, i]));
            return {
              ...value,
              nodes: value.nodes.map((v) => ({
                ...v,
                id: ids.get(v.id),
                parent: v.parent === null ? null : ids.get(v.parent),
                ...(v.texture
                  ? { texture: { ...v.texture, source: sources.get(v.texture.source) } }
                  : {}),
              })),
              textures: value.textures.map((v) => ({ ...v, id: sources.get(v.id) })),
            };
          };
        assert.deepEqual(canonical(actual), canonical(reference));
        assert.ok(actual.nodes.length < 5000);
      }
      a.destroy();
      expected.destroyLumiereSceneEntry(b, null);
      sprites.destroy();
    }
  } finally {
    native.portableWordSegmenter.segment = previousSegment;
    globalThis.document = previous;
    native.configure({});
  }
});

test('Lumiere scene preparation never publishes provisional advances and preserves measure rounds', async () => {
  available();
  assert.equal(
    typeof api.createLumiereSceneJob,
    'function',
    'native scene measurement job missing',
  );
  const { Segmenter } = Intl,
    segmenter = new Segmenter(undefined, { granularity: 'word' }),
    input = lines().slice(0, 4),
    program = api.compileLumiereProgram(input, 'rounds', {}, { seamless: false }),
    tuning = api.toLumiereSceneTuning(api.normalizeLumiereTuning({}), { showText: true }),
    options = {
      width: 640,
      height: 480,
      resolution: 1,
      program,
      index: program.paragraphs.findIndex((paragraph) => paragraph.lines.length > 0),
      theme: {
        primaryColor: '#ffffff',
        secondaryColor: '#aaaaaa',
        accentColor: '#ffaa77',
        lyricsIcons: [],
        wordColors: [],
        animationIntensity: 1,
      },
      tuning,
      quality: {
        bloom: 1,
        textBloom: 1,
        graphicsResolution: null,
        bloomLevelDrop: 0,
        passthrough: null,
      },
      showText: true,
    },
    job = api.createLumiereSceneJob({
      options,
      time: 8.5,
      pieces: input.map((line) => ({
        text: line.fullText,
        pieces: [...segmenter.segment(line.fullText)],
      })),
    });
  let result = job.run(),
    rounds = 0,
    total = 0;
  assert.equal(result.phase, 'measure');
  assert.equal(result.frame, undefined);
  while (result.phase === 'measure') {
    assert.ok(++rounds <= 32);
    const measurements = result.measurements.map((query) => {
        total++;
        const px = Math.round(query.size),
          advance = Array.from(query.text).reduce(
            (sum, char) =>
              sum +
              (char === ' ' ? px * 0.28 : char.codePointAt(0) > 0x2e00 ? px * 0.97 : px * 0.53),
            0,
          );
        return {
          key: query.key,
          advance,
          width: advance,
          inkLeft: 0,
          inkRight: advance,
          inkTop: -px * 0.8,
          inkBottom: px * 0.2,
          emAscent: px * 0.78,
          emDescent: px * 0.22,
        };
      }),
      pieces = result.texts.map((text) => ({ text, pieces: [...segmenter.segment(text)] }));
    result = job.run({ measurements, pieces });
  }
  assert.equal(result.phase, 'frame');
  assert.ok(result.frame.nodes.some((node) => node.kind === 'sprite'));
  assert.ok(total > 10);
  assert.ok(rounds >= 2);
  const stable = (value) => ({
    ...value,
    nodes: value.nodes.map(({ geometryRevision, ...node }) => node),
  });
  assert.deepEqual(stable(job.frame(8.5).frame), stable(result.frame));
  job.destroy();
  assert.throws(() => job.frame(9), /released/);
});

test('Lumiere preserves the original runtime cache, source settings flow, pause and two-frame song handover', async () => {
  available();
  assert.equal(
    typeof api.createNativeLumiereRuntime,
    'function',
    'original runtime adapter missing',
  );
  const options = {
    width: 640,
    height: 480,
    resolution: 1,
    program: api.compileLumiereProgram([], 'runtime-A', {}, { seamless: false }),
    seed: 'runtime-A',
    theme: {
      primaryColor: '#fff',
      secondaryColor: '#aaa',
      accentColor: '#fa7',
      backgroundColor: '#123',
      lyricsIcons: [],
      wordColors: [],
      animationIntensity: 1,
    },
    tuning: api.normalizeLumiereTuning({}),
    metadata: {},
    showText: true,
    paused: false,
    motionEnabled: true,
  };
  const runtime = api.createNativeLumiereRuntime(options);
  let frame = runtime.frame(2, { nowMs: 1000, audio: { bass: 0.7, treble: 0.4, power: 0.5 } });
  assert.ok(frame.nodes.some((node) => node.kind === 'light-field'));
  assert.ok(frame.nodes.some((node) => node.kind === 'solid'));
  assert.ok(runtime.cacheState().size >= 1 && runtime.cacheState().size <= 3);
  runtime.setPaused(true);
  frame = runtime.frame(7, { nowMs: 2000 });
  assert.deepEqual(runtime.audioFrame(), { bass: 0, treble: 0, power: 0 });
  const nodes = clone(frame.nodes).map(({ geometryRevision, ...node }) => node);
  assert.deepEqual(
    clone(runtime.frame(7, { nowMs: 3000 }).nodes).map(({ geometryRevision, ...node }) => node),
    nodes,
  );
  runtime.setPaused(false);
  runtime.swapSong({
    ...options,
    seed: 'runtime-B',
    program: api.compileLumiereProgram([], 'runtime-B', {}, { seamless: true }),
  });
  assert.equal(runtime.cacheState().swapping, true);
  runtime.frame(3, { nowMs: 3100 });
  assert.equal(runtime.cacheState().seed, 'runtime-A');
  runtime.frame(3.1, { nowMs: 3200 });
  assert.equal(runtime.cacheState().seed, 'runtime-B');
  assert.equal(runtime.cacheState().swapping, false);
  runtime.destroy();
  assert.throws(() => runtime.frame(0, { nowMs: 4000 }), /released/);
});

test('Lumiere source runtime credits preserve original title/detail word wrap and alphabetic paint', () => {
  available();
  const input = lines().slice(0, 2),
    program = api.compileLumiereProgram(input, 'credits', {}, { seamless: true }),
    time = program.lyricEndTime + 8,
    tuning = api.normalizeLumiereTuning({}),
    options = {
      width: 640,
      height: 480,
      resolution: 1,
      program,
      seed: 'credits',
      theme: {
        primaryColor: '#fff',
        secondaryColor: '#aaa',
        accentColor: '#fa7',
        backgroundColor: '#123',
        lyricsIcons: [],
        wordColors: [],
        animationIntensity: 1,
      },
      tuning,
      metadata: {
        title: '山河 👩🏽‍🚀 office',
        artist: 'the artist office ffi and the stars above'.repeat(2),
        album: 'long album 繁星 '.repeat(3),
      },
      showText: true,
      paused: true,
      motionEnabled: true,
    },
    job = api.createLumiereSceneJob({
      options,
      runtime: true,
      time,
      runtimeFrame: { nowMs: 1000 },
    }),
    segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  let result = job.run(),
    rounds = 0;
  while (result.phase === 'measure') {
    assert.ok(++rounds <= 32);
    const measurements = result.measurements.map((query) => {
        const px = Math.round(query.size),
          advance = Array.from(query.text).reduce(
            (sum, char) =>
              sum +
              (char === ' ' ? px * 0.28 : char.codePointAt(0) > 0x2e00 ? px * 0.97 : px * 0.53),
            0,
          );
        return {
          key: query.key,
          advance,
          width: advance,
          inkLeft: 0,
          inkRight: advance,
          inkTop: -px * 0.8,
          inkBottom: px * 0.2,
          emAscent: px * 0.78,
          emDescent: px * 0.22,
        };
      }),
      pieces = result.texts.map((text) => ({ text, pieces: [...segmenter.segment(text)] }));
    result = job.run({ measurements, pieces });
  }
  assert.equal(result.phase, 'frame');
  const commands = result.frame.textures.flatMap((texture) => texture.commands || []);
  assert.ok(
    commands.some((command) => command.kind === 'text' && command.style.textBaseline === 'middle'),
  );
  assert.ok(
    commands.some(
      (command) => command.kind === 'text' && command.style.textBaseline === 'alphabetic',
    ),
  );
  const alphabetic = commands.filter((command) => command.style.textBaseline === 'alphabetic');
  assert.ok(
    new Set(alphabetic.map((command) => command.y)).size > 2,
    'long details must retain wrapped multiple baselines',
  );
  assert.ok(result.frame.nodes.some((node) => node.kind === 'light-field'));
  job.destroy();
});

test('Lumiere native metric cache preserves fractional source font sizes', async () => {
  let native = null;
  try {
    native = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/native-measure.mjs');
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(native, 'Lumiere fractional native query cache missing');
  assert.notEqual(
    native.metricKey('500 13.44px Arial', 'office'),
    native.metricKey('500 13.49px Arial', 'office'),
  );
  native.configure({ pieces: [], discovery: true });
  const context = native.getMeasureContext();
  context.font = '500 13.44px Arial';
  context.measureText('office');
  assert.equal(native.pendingMeasurements()[0].size, 13.44);
  native.configure({});
});

test('Lumiere Stage maps all flat settings and retains the source song readiness gate', async () => {
  let stage = null;
  try {
    stage = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/stage.mjs');
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(stage, 'Lumiere Stage adapter missing');
  const expected = await source();
  for (const [key, value] of Object.entries(api.normalizeLumiereTuning({}))) {
    const flat = 'lumiere' + key[0].toUpperCase() + key.slice(1);
    assert.equal(stage.tuning({})[key], value);
    const changed = typeof value === 'boolean' ? !value : typeof value === 'number' ? 0 : 'low';
    assert.deepEqual(
      stage.tuning({ [flat]: changed }),
      api.normalizeLumiereTuning({ [key]: changed }),
    );
  }
  for (const seed of ['old', 'new'])
    for (const signature of ['', 'same', 'fresh'])
      for (const instrumental of [false, true]) {
        const input = {
          seed,
          committedSeed: 'old',
          lyricsSignature: signature,
          committedSignature: 'same',
          isCommittedInstrumental: instrumental,
        };
        assert.deepEqual(stage.decideSongCommit(input), expected.decideSongCommit(input));
      }
  for (const sawPlaybackReset of [false, true])
    for (const playbackTime of [0, 1.9, 2, 40])
      for (const elapsedMs of [0, 2999, 3000]) {
        const state = { sawPlaybackReset, playbackTime, elapsedMs },
          limits = { instrumentalCommitSeconds: 2, readyGraceMs: 3000 };
        assert.equal(
          stage.isInstrumentalConfirmed(state, limits),
          expected.isInstrumentalConfirmed(state, limits),
        );
      }
});

test('Lumiere retained runtime frame tree matches the independent original class across pause, seek, tuning and swap', async () => {
  const expected = await source(),
    native = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/native-measure.mjs'),
    canvas = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/canvas.mjs'),
    environment =
      await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/runtime-environment.mjs');
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    performance: globalThis.performance,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };
  globalThis.document = { createElement: () => canvas.createCanvas() };
  globalThis.window = environment.runtimeWindow;
  Object.defineProperty(globalThis, 'performance', {
    value: environment.runtimePerformance,
    configurable: true,
  });
  globalThis.setTimeout = environment.setRuntimeTimeout;
  globalThis.clearTimeout = environment.clearRuntimeTimeout;
  const evaluate = (font, text) => {
    const px = Number(/([\d.]+)px/.exec(font)[1]),
      advance = [...text].reduce(
        (sum, char) =>
          sum + (char === ' ' ? px * 0.28 : char.codePointAt(0) > 0x2e00 ? px * 0.97 : px * 0.53),
        0,
      );
    return {
      width: advance,
      advance,
      inkLeft: 0,
      inkRight: advance,
      inkTop: -px * 0.8,
      inkBottom: px * 0.2,
      actualBoundingBoxAscent: px * 0.8,
      actualBoundingBoxDescent: px * 0.2,
      emAscent: px * 0.78,
      emDescent: px * 0.22,
    };
  };
  native.configure({ evaluator: evaluate });
  const previousSegment = native.portableWordSegmenter.segment,
    segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  native.portableWordSegmenter.segment = (text) => [...segmenter.segment(text)];
  const canonical = (value) => {
    const ids = new Map(value.nodes.map((node, index) => [node.id, index])),
      sources = new Map(value.textures.map((texture, index) => [texture.id, index]));
    return {
      ...value,
      nodes: value.nodes.map(({ geometryRevision, ...node }) => ({
        ...node,
        id: ids.get(node.id),
        parent: node.parent === null ? null : ids.get(node.parent),
        ...(node.texture
          ? { texture: { ...node.texture, source: sources.get(node.texture.source) } }
          : {}),
      })),
      textures: value.textures.map((texture) => ({ ...texture, id: sources.get(texture.id) })),
    };
  };
  let a, b;
  try {
    const { createTextMeasurer } =
        await import('../plugins/folia-lyrics-skin/qml/styles/sonnet/pixi-text-metrics.mjs'),
      program = api.compileLumiereProgram(lines().slice(0, 4), 'class', {}, { seamless: true }),
      options = {
        width: 640,
        height: 480,
        resolution: 1.5,
        program,
        seed: 'class',
        theme: {
          primaryColor: '#ffeedd',
          secondaryColor: '#aaaacc',
          accentColor: '#ff9966',
          backgroundColor: '#111122',
          fontFamily: 'Arial',
          fontWeight: 500,
          wordColors: [],
          lyricsIcons: [],
          animationIntensity: 'chaotic',
        },
        tuning: api.normalizeLumiereTuning({}),
        metadata: {
          title: '山河 office 👩🏽‍🚀',
          artist: 'an artist among the stars',
          album: 'a long album title',
        },
        paused: false,
        motionEnabled: true,
        showText: true,
        measureText: createTextMeasurer(evaluate),
      };
    a = api.createNativeLumiereRuntime(options);
    b = api.createNativeLumiereRuntime(options, expected.LumierePixiRuntime);
    const frames = [
      { time: 8.4, nowMs: 1000, audio: { bass: 0.7, treble: 0.4, power: 0.5 } },
      { time: 10.8, nowMs: 1100 },
      { time: 10.8, nowMs: 1400, paused: true },
      { time: 17, nowMs: 1500 },
      {
        time: 17,
        nowMs: 1800,
        tuning: api.normalizeLumiereTuning({ textOnly: true, bloom: 0, textBloom: 0 }),
      },
      { time: 17, nowMs: 2100 },
      { time: program.lyricEndTime + 8, nowMs: 2200 },
      { time: 9, nowMs: 2300, paused: false, motionEnabled: false },
      {
        time: 4,
        nowMs: 2400,
        song: {
          seed: 'second',
          program: api.compileLumiereProgram([], 'second', {}, { seamless: true }),
          theme: options.theme,
        },
      },
      { time: 4.1, nowMs: 2500 },
      { time: 4.2, nowMs: 2600 },
    ];
    for (const { time, ...frame } of frames) {
      assert.deepEqual(canonical(a.frame(time, frame)), canonical(b.frame(time, frame)));
      assert.deepEqual(a.cacheState(), b.cacheState());
    }
  } finally {
    if (a) a.destroy();
    if (b) b.destroy();
    native.portableWordSegmenter.segment = previousSegment;
    native.configure({});
    Object.assign(globalThis, {
      document: saved.document,
      window: saved.window,
      setTimeout: saved.setTimeout,
      clearTimeout: saved.clearTimeout,
    });
    Object.defineProperty(globalThis, 'performance', {
      value: saved.performance,
      configurable: true,
    });
  }
});

test('Lumiere filter world bounds follow actual Pixi FilterSystem clipping, rounding and padding', async () => {
  const { FilterSystem } = await import(
      pathToFileURL(foliaPath('node_modules/pixi.js/lib/filters/FilterSystem.mjs'))
    ),
    { Bounds } = await import(
      pathToFileURL(foliaPath('node_modules/pixi.js/lib/scene/container/bounds/Bounds.mjs'))
    ),
    system = Object.create(FilterSystem.prototype);
  system.renderer = { type: 1 };
  for (const rootResolution of [1, 1.5, 2])
    for (const input of [
      { x: -13.7, y: 8.3, width: 500.2, height: 333.8 },
      { x: 1.1, y: -51.4, width: 700, height: 640 },
      { x: 800, y: 0, width: 12, height: 20 },
    ])
      for (const descriptor of [
        { kind: 'lumiere-bloom', options: { padding: 15.7 }, resolution: 0.7 },
        { kind: 'blur', strength: 3.6, resolution: 'inherit' },
        { kind: 'copy', resolution: 'inherit' },
      ]) {
        const bounds = new Bounds();
        bounds.addRect(input);
        const filter = {
            enabled: true,
            compatibleRenderers: 1,
            clipToViewport: true,
            antialias: 'inherit',
            resolution: descriptor.resolution,
            padding:
              descriptor.kind === 'blur'
                ? descriptor.strength * 2
                : descriptor.kind === 'copy'
                  ? 0
                  : descriptor.options.padding,
          },
          data = { bounds, filters: [filter], skip: false };
        system._calculateFilterBounds(
          data,
          { width: 640 * rootResolution, height: 480 * rootResolution },
          false,
          rootResolution,
          1,
        );
        const expected = data.skip
          ? null
          : {
              x: bounds.minX,
              y: bounds.minY,
              width: bounds.width,
              height: bounds.height,
              resolution: data.resolution,
            };
        assert.deepEqual(api.filterFrame(input, [descriptor], 640, 480, rootResolution), expected);
      }
});

test('Lumiere native viewport preserves the source minimum Canvas and render-DPR ceiling before CSS scaling', async () => {
  const stage = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/stage.mjs');
  assert.equal(typeof stage.viewport, 'function', 'source minimum Canvas projection missing');
  assert.deepEqual(stage.viewport(640, 480, 2), {
    width: 640,
    height: 480,
    resolution: 2,
    physicalWidth: 1280,
    physicalHeight: 960,
    raster: false,
    rasterBytes: 0,
    error: '',
  });
  const small = stage.viewport(160, 120, 1);
  assert.equal(small.width, 320);
  assert.equal(small.height, 240);
  assert.equal(small.raster, true);
  assert.equal(small.rasterBytes, 320 * 240 * 4);
  const high = stage.viewport(640, 480, 3);
  assert.equal(high.resolution, 2);
  assert.equal(high.raster, true);
  assert.equal(high.rasterBytes, 1280 * 960 * 4);
  assert.match(stage.viewport(9000, 500, 3).error, /viewport/);
});

test('Lumiere theme bridge preserves Qt color channels and source motion labels', async () => {
  const stage = await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/stage.mjs'),
    value = stage.theme(
      { animationIntensity: 'chaotic' },
      'Arial',
      { r: 0.5, g: 0.25, b: 1, a: 0.1 },
      '#aaa',
      '#f80',
      '#111',
    );
  assert.equal(value.primaryColor, 'rgba(128,64,255,0.1)');
  assert.equal(value.animationIntensity, 'chaotic');
});

test('Lumiere deferred native callbacks belong to the actor lifetime', async () => {
  for (const name of ['LumiereProgram', 'LumiereSceneLayout', 'LumiereGlyphTexture']) {
    const qml = await readFile(
      path.resolve('plugins/folia-lyrics-skin/qml/styles/lumiere/' + name + '.qml'),
      'utf8',
    );
    assert.doesNotMatch(
      qml,
      /Qt\.callLater\s*\(/,
      name + ' must cancel deferred callbacks when its context is retired',
    );
  }
});
