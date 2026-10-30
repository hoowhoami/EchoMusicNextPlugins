import { foliaPath } from './folia-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { withoutBeatAnalysis } from '../scripts/folia-visual-scope.mjs';

const source = foliaPath('src/components/visualizer/sonnet');
const generated = path.resolve('plugins/folia-lyrics-skin/qml/styles/sonnet');
let api;
try {
  api = await import(pathToFileURL(path.join(generated, 'kernel.mjs')));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
const original = await build({
  stdin: {
    contents: [
      'sonnetProgram',
      'sonnetMotion',
      'sonnetTransitions',
      'sonnetGlyphLayout',
      'sonnetPostProcess',
      'sonnetAdditionalShotMg',
      'sonnetSpatialMgGeometry',
      'sonnetBackgroundMgVariants',
      'sonnetTypographyLayout',
      'sonnetSceneBuilder',
      'sonnetShotFrame',
    ]
      .map((name) => `export * from ${JSON.stringify(path.join(source, name + '.ts'))};`)
      .join('\n'),
    resolveDir: source,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  plugins: [
    {
      name: 'only-native-input-bridge',
      setup(builder) {
        builder.onResolve({ filter: /pixi\.js\/advanced-blend-modes/ }, () => ({
          path: 'native-blend',
          namespace: 'empty',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '' }));
        builder.onResolve({ filter: /sonnetIcons$/ }, () => ({
          path: 'source-icon-math',
          namespace: 'icon-source',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'icon-source' }, async () => {
          const raw = await readFile(path.join(source, 'sonnetIcons.ts'), 'utf8');
          return {
            loader: 'ts',
            contents: raw.slice(
              raw.indexOf('export const buildSonnetIconParticleIndices'),
              raw.indexOf('export const buildSonnetIconDataUrl'),
            ),
          };
        });
        // Compile the retained ordinary source branches; no removed analysis
        // imports, functions or callable placeholders enter the QA module.
        builder.onLoad(
          { filter: /(?:sonnetShotFrame|sonnetShotMg|sonnetSceneBuilder)\.ts$/ },
          async (args) => ({
            contents: withoutBeatAnalysis(
              await readFile(args.path, 'utf8'),
              path.basename(args.path, '.ts') + '.mjs',
            ),
            loader: 'ts',
            resolveDir: path.dirname(args.path),
          }),
        );
      },
    },
  ],
});
test('Sonnet all seven actual packing algorithms match source with explicit font measurements', async () => {
  available();
  let layout;
  try {
    layout = await import(pathToFileURL(path.join(generated, 'sonnetTypographyLayout.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(layout, 'Sonnet seven-shot layout has not been ported');
  const native = await import(pathToFileURL(path.join(generated, 'native-measure.mjs')));
  const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
  const measure = (font, text) => {
    const size = Number(/([\d.]+)px/.exec(font)[1]);
    return Array.from(text).reduce(
      (sum, char) => sum + size * (char === ' ' ? 0.3 : char.codePointAt(0) > 0x2e00 ? 1 : 0.6),
      0,
    );
  };
  globalThis.OffscreenCanvas = class {
    getContext() {
      return {
        font: '16px test',
        measureText(text) {
          return { width: measure(this.font, text) };
        },
      };
    }
  };
  native.configure({
    pieces: [],
    measurements: [],
    evaluator: measure,
    pieceEvaluator: (text) => Array.from(segmenter.segment(text)),
  });
  for (const kind of oracle.SONNET_SHOT_KINDS) {
    const lines = [lyric(0, 'under the brightest sky'), lyric(1, '星光，照亮辽阔天空！')].map(
      (line) => oracle.buildSonnetSemanticSegments(line).filter((segment) => segment.text.trim()),
    );
    for (const [width, height] of [
      [1000, 700],
      [420, 900],
    ]) {
      const input = {
        lines,
        shotKind: kind,
        paragraphKind: 'verse',
        width,
        height,
        baseFontSize: 72,
        fontFamily: 'Test Oracle',
        fontWeight: null,
      };
      const actual = layout.resolveSonnetTypographyLayout(input),
        expected = oracle.resolveSonnetTypographyLayout(input);
      assert.deepEqual(actual, expected);
      assert.ok(actual.some((placement) => placement.role === 'hero'));
      assert.ok(
        actual.every((placement) => Number.isFinite(placement.x) && Number.isFinite(placement.y)),
      );
    }
  }
});
test('Sonnet retains all 82 extended MG recipes and eight HUD variants as exact vector command streams', async () => {
  available();
  let geometry;
  try {
    geometry = await import(pathToFileURL(path.join(generated, 'sonnetAdditionalShotMg.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(geometry, 'Sonnet MG geometry has not been ported');
  const background = await import(
    pathToFileURL(path.join(generated, 'sonnetBackgroundMgVariants.mjs'))
  );
  function record(draw, variant, seed, width, height) {
    const commands = [];
    const target = Object.fromEntries(
      [
        'moveTo',
        'lineTo',
        'quadraticCurveTo',
        'bezierCurveTo',
        'arc',
        'circle',
        'rect',
        'stroke',
        'fill',
      ].map((name) => [
        name,
        (...values) => {
          commands.push([name, ...values]);
          return target;
        },
      ]),
    );
    draw({
      target,
      variant,
      seed,
      width,
      height,
      radius: Math.min(width, height),
      primary: 0xfedcba,
      secondary: 0x234567,
    });
    return commands;
  }
  for (const [width, height] of [
    [1000, 700],
    [420, 900],
  ])
    for (let variant = 18; variant < 100; ++variant) {
      const actual = record(
        geometry.drawAdditionalSonnetShotMg,
        variant,
        variant * 257 + 31,
        width,
        height,
      );
      assert.ok(actual.length > 10, 'Missing actual vector recipe ' + variant);
      assert.deepEqual(
        actual,
        record(oracle.drawAdditionalSonnetShotMg, variant, variant * 257 + 31, width, height),
      );
    }
  for (let variant = 0; variant < 8; ++variant)
    assert.deepEqual(
      record(background.drawSonnetBackgroundMgHud, variant, 9281, 1000, 700),
      record(oracle.drawSonnetBackgroundMgHud, variant, 9281, 1000, 700),
    );
});
const oracle = await import(
  'data:text/javascript;base64,' + Buffer.from(original.outputFiles[0].text).toString('base64')
);
function available() {
  assert.ok(api, 'Sonnet source kernels have not been ported');
}
function lyric(index, text, part) {
  const words = Array.from(new Intl.Segmenter('en', { granularity: 'word' }).segment(text));
  return {
    fullText: text,
    startTime: index * 1.4,
    endTime: index * 1.4 + 1.2,
    words: words.map((word, i) => ({
      text: word.segment,
      startTime: index * 1.4 + i / words.length,
      endTime: index * 1.4 + (i + 1) / words.length,
    })),
    autoWordSegments: words.map((word) => word.segment),
    ...(part ? { songPart: part } : {}),
  };
}
test('Sonnet complete paragraph and seven-shot program equals the pinned source', () => {
  available();
  const lines = Array.from({ length: 45 }, (_, i) =>
    lyric(
      i,
      ['under the brightest sky!', '星光，照亮未来！', 'سلام بالعالم', 'one two three four'][i % 4],
      i >= 16 && i < 24 ? 'chorus' : 'verse',
    ),
  );
  for (const seed of ['title:artist', '中英 👩‍🚀', 42]) {
    const actual = api.compileSonnetProgram(lines, seed),
      expected = oracle.compileSonnetProgram(lines, seed);
    assert.deepEqual(actual, expected);
    assert.ok(actual.paragraphs.length > 4);
    const kinds = new Set(actual.paragraphs.flatMap((p) => p.shots.map((s) => s.kind)));
    assert.ok(kinds.size >= 4);
    for (let time = -1; time <= 70; time += 0.137)
      assert.equal(
        api.findSonnetParagraphIndexAtTime(actual, time),
        oracle.findSonnetParagraphIndexAtTime(expected, time),
      );
  }
});
test('Sonnet transitions retain exact absolute-time seek semantics and all effects', () => {
  available();
  for (const kind of ['fast-blur', 'mono-glitch', 'camera-pull'])
    for (const phase of ['enter', 'exit'])
      for (const progress of [-1, 0, 0.01, 0.15, 0.5, 0.86, 0.9, 1, 2])
        assert.deepEqual(
          api.resolveSonnetTransitionEffectFrame(kind, phase, progress, 0x12345678),
          oracle.resolveSonnetTransitionEffectFrame(kind, phase, progress, 0x12345678),
        );
  const shots = [0, 0.2, 2, 5].map((startTime, index) => ({
    id: 's' + index,
    startTime,
    endTime: startTime + 1,
  }));
  for (let time = -1; time < 7; time += 0.031)
    for (let index = 0; index < shots.length; ++index)
      assert.deepEqual(
        api.resolveSonnetShotTransitionFrame(shots, index, time, true, 73),
        oracle.resolveSonnetShotTransitionFrame(shots, index, time, true, 73),
      );
});
test('Sonnet glyph timing and post-process profiles equal source without replacing the effect stack', () => {
  available();
  const segment = oracle.buildSonnetSemanticSegments(lyric(0, 'A👩‍🚀 é سلام'))[0];
  const placement = {
    x: 12,
    y: -30,
    rotation: 0.43,
    enterX: -30,
    enterY: 20,
    role: 'hero',
    vertical: false,
  };
  const measure = (text) => Array.from(text).length * 17; // Explicit test-font oracle only.
  for (const vertical of [false, true])
    assert.deepEqual(
      api.buildSonnetGlyphLayout(segment, { ...placement, vertical }, 48, measure, {
        startTime: 0,
        endTime: 4,
      }),
      oracle.buildSonnetGlyphLayout(segment, { ...placement, vertical }, 48, measure, {
        startTime: 0,
        endTime: 4,
      }),
    );
  for (const animationIntensity of ['calm', 'normal', 'chaotic'])
    for (const enabled of [false, true])
      for (const staticMode of [false, true]) {
        const tuning = {
          ...api.DEFAULTS,
          postProcessEnabled: enabled,
          postProcessGrain: 0.7,
          postProcessContrast: 0.4,
          postProcessLensDistortion: 1.6,
          postProcessLensDispersion: 0.8,
          postProcessRgbShift: 0.7,
          postProcessHalftone: 0.6,
          postProcessVignette: 1.4,
        };
        assert.deepEqual(
          api.resolveSonnetPostProcessProfile({ animationIntensity }, tuning, staticMode),
          oracle.resolveSonnetPostProcessProfile({ animationIntensity }, tuning, staticMode),
        );
      }
});
test('Sonnet native layout discovery never publishes provisional font estimates', async () => {
  available();
  let preparation;
  try {
    preparation = await import(pathToFileURL(path.join(generated, 'prepare.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(preparation, 'Sonnet bounded native scene preparation is missing');
  const paragraph = oracle.compileSonnetProgram(
    [lyric(0, 'under the brightest sky'), lyric(1, '星光，照亮未来！')],
    'font-job',
  ).paragraphs[0];
  const context = {
    width: 900,
    height: 700,
    lyricsFontScale: 1,
    theme: { fontFamily: 'Oracle', fontWeight: null, fontStyle: 'sans' },
  };
  const pieces = new Map(),
    measurements = new Map();
  const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
  let result;
  for (let pass = 0; pass < 16; ++pass) {
    result = preparation.prepare(
      paragraph,
      context,
      [...measurements.values()],
      [...pieces].map(([text, parts]) => ({ text, pieces: parts })),
    );
    if (result.phase === 'complete') break;
    assert.equal(result.phase, 'native');
    assert.equal('shots' in result, false, 'Never expose zero-width discovery placements');
    for (const text of result.segmentations) pieces.set(text, Array.from(segmenter.segment(text)));
    for (const query of result.measurements) {
      const width = Array.from(query.text).reduce(
        (sum, char) =>
          sum + (char === ' ' ? 0.3 : char.codePointAt(0) > 0x2e00 ? 1 : 0.6) * query.size,
        0,
      );
      measurements.set(query.key, {
        key: query.key,
        width,
        advance: width,
        inkLeft: 0,
        inkRight: width,
        height: query.size * 1.2,
        baseline: query.size * 0.9,
        inkTop: -query.size * 0.8,
        inkBottom: query.size * 0.2,
      });
    }
  }
  assert.equal(result.phase, 'complete');
  assert.equal(result.shots.length, paragraph.shots.length);
  assert.ok(result.shots.every((shot) => shot.placements.length > 0));
  assert.throws(() => preparation.prepare(paragraph, context, [], [], false), /Missing native|ICU/);
});
test('Sonnet worker preparation keeps whole-song text private and only three paragraph jobs', async () => {
  let module;
  try {
    module = await import(pathToFileURL(path.join(generated, 'preparation-job.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(module, 'Sonnet worker program preparation is missing');
  const job = new module.ProgramPreparation();
  const lines = Array.from({ length: 25 }, (_, index) => lyric(index, 'actual lyric ' + index));
  job.append(
    lines,
    lines.map((line) =>
      Array.from(new Intl.Segmenter('en', { granularity: 'word' }).segment(line.fullText)),
    ),
  );
  const program = job.compile('bounded');
  assert.deepEqual(
    program.paragraphs.map(({ id, kind, startTime, endTime, shots }) => ({
      id,
      kind,
      startTime,
      endTime,
      shots,
    })),
    oracle
      .compileSonnetProgram(lines, 'bounded')
      .paragraphs.map(({ id, kind, startTime, endTime, shots }) => ({
        id,
        kind,
        startTime,
        endTime,
        shots,
      })),
  );
  assert.ok(!JSON.stringify(program).includes('actual lyric'));
  assert.ok(program.paragraphs.every((paragraph) => !('lines' in paragraph)));
  assert.throws(() => job.begin(-1, {}), /paragraph index/);
  const context = {
    width: 900,
    height: 700,
    lyricsFontScale: 1,
    theme: { fontFamily: 'Oracle', fontWeight: null, fontStyle: 'sans' },
  };
  for (let index = 0; index < Math.min(4, program.paragraphs.length); ++index) {
    let reply = job.begin(index, context);
    for (let round = 0; reply.phase === 'native' && round < 16; ++round) {
      const pieces = reply.segmentations.map((text) => ({
        text,
        pieces: Array.from(new Intl.Segmenter('en', { granularity: 'word' }).segment(text)),
      }));
      const measurements = reply.measurements.map((query) => {
        const width = Array.from(query.text).length * query.size * 0.6;
        return {
          key: query.key,
          width,
          advance: width,
          inkLeft: 0,
          inkRight: width,
          height: query.size * 1.2,
          baseline: query.size * 0.9,
          inkTop: -query.size * 0.8,
          inkBottom: query.size * 0.2,
        };
      });
      reply = job.accept(measurements, pieces);
    }
    assert.equal(reply.phase, 'scene');
    assert.equal(reply.index, index);
    // The source's max-gap split can emit more than six lines; preserve the actual program.
    assert.deepEqual(
      reply.paragraph.lines.map((line) => line.sourceIndex),
      oracle
        .compileSonnetProgram(lines, 'bounded')
        .paragraphs[index].lines.map((line) => line.sourceIndex),
    );
    assert.ok(job.cachedIndices().length <= 3);
  }
  assert.throws(
    () =>
      job.append(
        Array.from({ length: 8193 }, () => lines[0]),
        [],
      ),
    /budget/,
  );
  assert.equal(job.compile('bounded').paragraphs.length, program.paragraphs.length);
});
test('Sonnet Pixi Text bounds use actual ink while pretext uses native advance', async () => {
  let module;
  try {
    module = await import(pathToFileURL(path.join(generated, 'pixi-text-metrics.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(module, 'Sonnet native Pixi metrics callback is missing');
  const native = await import(pathToFileURL(path.join(generated, 'native-measure.mjs')));
  const font = '400 80px Times New Roman';
  native.configure({
    pieces: [],
    measurements: [
      {
        key: native.metricKey(font, 'f'),
        width: 34.75,
        advance: 26.640625,
        inkLeft: 3.078125,
        inkRight: 34.75,
        inkTop: -55,
        inkBottom: 1,
      },
      {
        key: native.metricKey(font, '|ÉqÅM'),
        width: 220,
        advance: 220,
        inkLeft: 0,
        inkRight: 220,
        inkTop: -74,
        inkBottom: 19,
      },
    ],
  });
  const bounds = module.measureSourceText({
    text: 'f',
    style: { fontFamily: 'Times New Roman', fontSize: 80 },
  });
  assert.equal(bounds.width, 31.671875);
  assert.equal(bounds.height, 93);
  assert.equal(bounds.baseline, 74);
  const context = native.getMeasureContext();
  context.font = font;
  assert.equal(context.measureText('f').width, 26.640625);
  const stroke = module.measureSourceText({
    text: 'f',
    style: { fontFamily: 'Times New Roman', fontSize: 80, stroke: { width: 2.5 } },
  });
  assert.equal(stroke.width, 34.171875);
  assert.equal(stroke.height, 95.5);
  assert.equal(stroke.baseline, 75.25);
  native.configure({
    pieces: [],
    measurements: [{ key: native.metricKey(font, 'f'), width: 34.75 }],
  });
  assert.throws(
    () =>
      module.measureSourceText({
        text: 'f',
        style: { fontFamily: 'Times New Roman', fontSize: 80 },
      }),
    /Missing native/,
  );
});
test('Sonnet metadata and credits retain the original Pixi word-wrap decisions', async () => {
  const { createTextMeasurer } = await import(
    pathToFileURL(path.join(generated, 'pixi-text-metrics.mjs'))
  );
  const { wordWrap } = await import(
    pathToFileURL(foliaPath('node_modules/pixi.js/lib/scene/text/canvas/utils/wordWrap.mjs'))
  );
  const segments = (text) =>
    Array.from(
      new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text),
      (part) => part.segment,
    );
  const width = (text) => segments(text).length * 7;
  const measure = createTextMeasurer((font, text) => ({
    advance: width(text),
    inkLeft: 0,
    inkRight: width(text),
    inkTop: -9,
    inkBottom: 3,
  }));
  for (const breakWords of [true, false])
    for (const whiteSpace of ['pre', 'normal', 'pre-line']) {
      const text = 'alpha beta\nwide-word👩‍🚀 é  星光 future';
      const style = {
        fontFamily: 'Oracle',
        fontSize: 12,
        fontWeight: 500,
        wordWrap: true,
        wordWrapWidth: 55,
        letterSpacing: 1.25,
        lineHeight: 14,
        leading: -1,
        breakWords,
        whiteSpace,
      };
      const canvas = {
        getContext: () => ({ font: '', measureText: (text) => ({ width: width(text) }) }),
      };
      const expected = wordWrap(
        text,
        style,
        canvas,
        (text, spacing) => width(text) + (segments(text).length - 1) * spacing,
        (_, enabled) => enabled,
        () => true,
        segments,
      );
      const actual = measure({ text, style });
      assert.deepEqual(actual.lines, expected.split(/\r\n|\r|\n/));
      assert.equal(actual.lineHeight, 13);
      assert.equal(actual.height, 14 + (actual.lines.length - 1) * 13);
    }
});

test('Sonnet Lucide names retain canonical aliases and source absolute stroke palette', async () => {
  let icons;
  try {
    icons = await import(pathToFileURL(path.join(generated, 'icons.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(icons, 'Sonnet native Lucide vector loader is missing');
  assert.deepEqual(icons.resolveNames([' star ', 'STAR', 'StarIcon', 'LucideStar', 'bad', 12]), [
    'Star',
    'StarIcon',
    'LucideStar',
  ]);
  assert.deepEqual(icons.resolveNames([]), ['Flower']);
  const textures = icons.buildTextures(
    {
      lyricsIcons: ['Star', 'Flower'],
      accentColor: '#123456',
      secondaryColor: '#234567',
      primaryColor: '#345678',
    },
    { showOnlyText: false, showBackgroundDecor: true, textureResolution: 1.5 },
  );
  assert.equal(textures.size, 2);
  const [first, second] = [...textures.values()];
  assert.equal(first.width, 192);
  assert.equal(second.width, 224);
  assert.equal(first.paths[0].width * first.vectorScale, 3.5);
  assert.equal(first.paths[0].stroke, '#123456');
  assert.equal(second.paths[0].stroke, '#234567');
  assert.ok(
    first.paths.every(
      (path) =>
        path.path && path.cap === 'round' && path.join === 'round' && path.fill === 'transparent',
    ),
  );
  assert.equal(icons.buildTextures({}, { showOnlyText: true, showBackgroundDecor: true }).size, 0);
  assert.throws(
    () =>
      icons.buildTextures(
        { lyricsIcons: Object.keys(icons).concat(Array(65).fill('Star')) },
        { showOnlyText: false, showBackgroundDecor: true },
      ),
    /budget/,
  );
});

test('Sonnet complete native scene and absolute-time glyph updates equal original builders', async () => {
  const { createSceneGraph, snapshot } = await import(
    pathToFileURL(path.join(generated, 'scene-graph.mjs'))
  );
  const { buildScene } = await import(pathToFileURL(path.join(generated, 'scene-build.mjs')));
  const { updateSonnetShot } = await import(
    pathToFileURL(path.join(generated, 'sonnetShotFrame.mjs'))
  );
  const native = await import(pathToFileURL(path.join(generated, 'native-measure.mjs')));
  const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
  const width = (font, text) => Array.from(text).length * Number(/([\d.]+)px/.exec(font)[1]) * 0.6;
  const provider = (font, text) => {
    const size = Number(/([\d.]+)px/.exec(font)[1]),
      advance = width(font, text);
    return {
      width: advance,
      advance,
      inkLeft: 0,
      inkRight: advance,
      inkTop: -size * 0.8,
      inkBottom: size * 0.2,
    };
  };
  native.configure({
    pieces: [],
    measurements: [],
    evaluator: width,
    pieceEvaluator: (text) => Array.from(segmenter.segment(text)),
  });
  globalThis.OffscreenCanvas = class {
    getContext() {
      return {
        font: '16px Scene Oracle',
        measureText(text) {
          return { width: width(this.font, text) };
        },
      };
    }
  };
  const { createTextMeasurer } = await import(
    pathToFileURL(path.join(generated, 'pixi-text-metrics.mjs'))
  );
  const context = {
    width: 900,
    height: 700,
    lyricsFontScale: 1,
    programSeed: 'full-scene',
    theme: {
      fontFamily: 'Scene Oracle',
      fontStyle: 'sans',
      fontWeight: null,
      primaryColor: '#ffffff',
      secondaryColor: '#999999',
      accentColor: '#ff3030',
      backgroundColor: '#111111',
      animationIntensity: 'normal',
      name: '',
      description: '',
    },
    tuning: { ...api.DEFAULTS, showBackgroundDecor: false, outerFrameMode: 'none' },
  };
  const paragraph = oracle.compileSonnetProgram(
    [lyric(0, 'under sky'), lyric(1, '星光 é office')],
    context.programSeed,
  ).paragraphs[0];
  const random = Math.random;
  Math.random = () => 0.314159;
  try {
    const sceneOracle = await import(
      'data:text/javascript;base64,' +
        Buffer.from(original.outputFiles[0].text).toString('base64') +
        '#full-scene'
    );
    const actual = buildScene(paragraph, context, provider);
    const pixi = createSceneGraph({ measureText: createTextMeasurer(provider) });
    const expected = sceneOracle.buildSonnetScene(pixi, actual.options, new Map(), paragraph);
    const clean = (value) =>
      JSON.parse(
        JSON.stringify(value, (key, data) =>
          ['nativeContext', 'id', 'parent', 'mask'].includes(key) ? undefined : data,
        ),
      );
    assert.deepEqual(clean(snapshot(actual.scene.container)), clean(snapshot(expected.container)));
    assert.ok(snapshot(actual.scene.container).pathCount > 0);
    assert.ok(
      snapshot(actual.scene.container).nodes.some(
        (node) => node.kind === 'text' && node.nativeContext,
      ),
    );
    const input = {
      tuning: actual.options.tuning,
      theme: context.theme,
      mod: () => 1,
    };
    for (const time of [0, 0.25, 1, 2.5, 0.3]) {
      actual.scene.shots.forEach((shot, index) => {
        updateSonnetShot(shot, time, 900, 700, 0, input);
        sceneOracle.updateSonnetShot(expected.shots[index], time, 900, 700, 0, input);
      });
      assert.deepEqual(
        clean(snapshot(actual.scene.container)),
        clean(snapshot(expected.container)),
      );
    }
  } finally {
    Math.random = random;
  }
});

test('Sonnet full scene discovery includes wrapped credits and retains native cluster sharing', async () => {
  const { prepare } = await import(pathToFileURL(path.join(generated, 'prepare.mjs')));
  const { RenderPlan } = await import(pathToFileURL(path.join(generated, 'render-plan.mjs')));
  const { createSceneGraph } = await import(pathToFileURL(path.join(generated, 'scene-graph.mjs')));
  const native = await import(pathToFileURL(path.join(generated, 'native-measure.mjs')));
  const context = {
    width: 900,
    height: 700,
    lyricsFontScale: 1,
    programSeed: 'full-native',
    theme: {
      fontFamily: 'Discovery',
      fontWeight: null,
      fontStyle: 'sans',
      primaryColor: '#fff',
      secondaryColor: '#999',
      accentColor: '#f03',
      backgroundColor: '#000',
      animationIntensity: 'normal',
      name: 'Actual theme',
      description: 'Theme description from the host',
    },
    tuning: { ...api.DEFAULTS, showBackgroundDecor: false },
    metadata: {
      title: 'actual metadata title with multiple words',
      artist: 'actual artist',
      album: 'actual album',
    },
  };
  const paragraph = api.compileSonnetProgram(
    [lyric(0, 'office sky'), lyric(1, '星光照亮未来')],
    'full-native',
  ).paragraphs[0];
  const metrics = new Map(),
    pieces = new Map(),
    segmenter = new Intl.Segmenter('en', { granularity: 'word' });
  let result;
  for (let pass = 0; pass < 24; ++pass) {
    result = prepare(paragraph, context, [...metrics.values()], [...pieces.values()]);
    if (result.phase === 'complete') break;
    assert.equal(result.phase, 'native');
    assert.ok(!('shots' in result));
    for (const text of result.segmentations)
      pieces.set(text, { text, pieces: Array.from(segmenter.segment(text)) });
    for (const query of result.measurements) {
      const advance = Array.from(query.text).length * query.size * 0.6;
      metrics.set(query.key, {
        key: query.key,
        advance,
        width: advance,
        height: query.size,
        baseline: query.size * 0.8,
        inkLeft: 0,
        inkRight: advance,
        inkTop: -query.size * 0.8,
        inkBottom: query.size * 0.2,
      });
    }
  }
  assert.equal(result.phase, 'complete');
  assert.ok(
    [...metrics.values()].some(
      (metric) => JSON.parse(metric.key)[3] === 'actual artist'.toUpperCase(),
    ),
  );
  const provider = (font, text) => ({
    advance: text === 'ffi' ? 60 : 20,
    width: text === 'ffi' ? 60 : 20,
    height: 50,
    baseline: 40,
    inkLeft: 0,
    inkRight: 60,
    inkTop: -40,
    inkBottom: 10,
    graphemes: [0, 1, 2].map((start) => ({
      start,
      length: 1,
      x: start * 20,
      advance: 20,
      y: 0,
      clusterStart: 0,
    })),
  });
  const pixi = createSceneGraph({
    measureText: () => ({
      width: 20,
      height: 50,
      baseline: 40,
      lineHeight: 50,
      lines: ['f'],
      lineWidths: [20],
      maxLineWidth: 20,
    }),
  });
  const root = new pixi.Container();
  for (let index = 0; index < 3; ++index) {
    const node = new pixi.Text({
      text: 'ffi'[index],
      style: { fontSize: 50, fontFamily: 'Discovery', fill: 'white' },
    });
    node.nativeContext = { key: 'whole-ffi', text: 'ffi', start: index, instance: 'display' };
    root.addChild(node);
  }
  const plan = new RenderPlan(root, provider);
  assert.equal(plan.items.length, 1);
  assert.equal(plan.items[0].runs.length, 1);
  assert.equal(plan.frame()[0].poses.length, 1);
  assert.equal(plan.frame()[0].poses[0].start, 0);
  const before = JSON.stringify(plan.items[0].runs);
  root.position.x = 42;
  assert.equal(plan.frame()[0].poses[0].x, 22);
  assert.equal(JSON.stringify(plan.items[0].runs), before);
  assert.notEqual(
    native.metricKey('400 16.1px Discovery', 'x'),
    native.metricKey('400 16.4px Discovery', 'x'),
  );
});

test('Sonnet source song readiness and sixty instrumental staffs retain exact gates', async () => {
  let gate;
  try {
    gate = await import(pathToFileURL(path.join(generated, 'song-handover.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(gate, 'Sonnet original song gate is missing');
  assert.deepEqual(
    gate.decideSongCommit({
      seed: 'new',
      committedSeed: 'old',
      lyricsSignature: 'same',
      committedSignature: 'same',
      isCommittedInstrumental: false,
    }),
    { action: 'watch' },
  );
  assert.deepEqual(
    gate.decideSongCommit({
      seed: 'new',
      committedSeed: 'old',
      lyricsSignature: 'incoming',
      committedSignature: 'outgoing',
      isCommittedInstrumental: false,
    }),
    { action: 'commit', isInstrumental: false },
  );
  for (const state of [
    { sawPlaybackReset: false, playbackTime: 60, elapsedMs: 2999 },
    { sawPlaybackReset: true, playbackTime: 1.999, elapsedMs: 1 },
    { sawPlaybackReset: true, playbackTime: 2, elapsedMs: 1 },
    { sawPlaybackReset: false, playbackTime: 0, elapsedMs: 3000 },
  ])
    assert.equal(
      gate.isInstrumentalConfirmed(state, { instrumentalCommitSeconds: 2, readyGraceMs: 3000 }),
      (state.sawPlaybackReset && state.playbackTime >= 2) || state.elapsedMs >= 3000,
    );
  const { buildInstrumentalLines } = await import(
    pathToFileURL(path.join(generated, 'instrumental.mjs'))
  );
  assert.deepEqual(buildInstrumentalLines(false), []);
  const lines = buildInstrumentalLines(true);
  assert.equal(lines.length, 60);
  assert.deepEqual(lines[59], {
    id: 'virtual-staff-59',
    startTime: 472,
    endTime: 478,
    fullText: '♪',
    words: [],
    isChorus: false,
  });
  assert.deepEqual(
    api.compileSonnetProgram(lines, 'instrumental'),
    oracle.compileSonnetProgram(lines, 'instrumental'),
  );
});

test('Sonnet song cover stages at 35%, commits at 50% and completes on UI time', async () => {
  const { swapFrame, DURATION_MS } = await import(
    pathToFileURL(path.join(generated, 'handover.mjs'))
  );
  assert.equal(DURATION_MS, 560);
  for (const ms of [0, 100, 195.99, 196, 279.99, 280, 400, 559.99, 560, 900]) {
    const frame = swapFrame(1000 + ms, 1000),
      p = ms / 560;
    assert.deepEqual(frame, {
      stage: p >= 0.35,
      commit: p >= 0.5,
      finished: p >= 1,
      alpha: p >= 1 ? 0 : 1 - Math.abs(p * 2 - 1),
    });
  }
  const { SongReadiness } = await import(pathToFileURL(path.join(generated, 'song-state.mjs')));
  const ready = new SongReadiness(),
    lines = [lyric(0, 'real source lyric')];
  assert.equal(ready.consider('old', lines, 0).action, 'commit');
  assert.equal(ready.consider('new', lines, 10).action, 'watch');
  assert.equal(ready.watch(30, 3009).action, 'watch');
  assert.equal(ready.watch(30, 3010).isInstrumental, true);
  assert.equal(
    ready.consider('new', [lyric(0, 'incoming actual lyric')], 3011).isInstrumental,
    false,
  );
});
