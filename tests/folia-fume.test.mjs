import { foliaPath } from './folia-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const directory = path.resolve('plugins/folia-lyrics-skin/qml/styles/fume');
let api = null;
try {
  api = await import(pathToFileURL(path.join(directory, 'api.mjs')));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
function available() {
  assert.ok(api, 'Fume full-article/camera source API is missing');
}
test('Fume retains full-song multicolumn article generator rather than a single current-line model', () => {
  available();
  assert.equal(typeof api.buildArticleLayout, 'function');
  assert.equal(
    typeof api.buildArticleLayout(
      [],
      { width: 1000, height: 700 },
      { fontStyle: 'sans', name: 'test' },
      1,
      { heroScale: 1 },
    ).next,
    'function',
  );
  const generator = api.buildArticleLayout(
    [],
    { width: 1000, height: 700 },
    { fontStyle: 'sans', name: 'test' },
    1,
    { heroScale: 1 },
  );
  assert.deepEqual(generator.next(), { done: true, value: null });
});
test('Fume camera and reveal retain source scale bounds, overview and syllable timing', () => {
  available();
  assert.equal(api.CAMERA_SCALE_MIN, 0.22);
  assert.equal(api.CAMERA_SCALE_MAX, 2.24);
  const state = api.createFumeCameraState();
  assert.equal(state.initialized, false);
  const line = {
    fullText: 'á👩🏽‍🚀',
    startTime: 1,
    endTime: 4,
    words: [
      {
        text: 'á👩🏽‍🚀',
        startTime: 1,
        endTime: 4,
        syllables: [
          { text: 'á', startTime: 1, endTime: 3 },
          { text: '👩🏽‍🚀', startTime: 3, endTime: 4 },
        ],
      },
    ],
  };
  const graphemes = api.splitGraphemes(line.fullText);
  assert.equal(graphemes.length, 2);
  const ranges = api.buildWordRangesFromWords(line, graphemes);
  assert.equal(api.resolvePrintedGraphemeCount(line, ranges, 2, 2), 1);
  assert.equal(api.resolvePrintedGraphemeCount(line, ranges, 2, 3), 2);
});
import { build } from 'esbuild';
test('Fume reserves no halo for source waiting snapshots and bounds each real source paint', async () => {
  const renderer = await import(pathToFileURL(path.join(directory, 'frame.mjs')));
  const block = layout(lines(16), { width: 1100, height: 820 }).chronologicalBlocks[0];
  const theme = { primaryColor: '#eeeeee', accentColor: '#00aaff', wordColors: [] };
  for (const intensity of [0.2, 1, 1.8]) {
    const base = {
      theme,
      glowIntensity: intensity,
      activeGlowBoost: 1.15 * intensity,
      passedGlowBase: 0.95 * intensity,
      showPrintStamp: true,
    };
    const waiting = renderer.recordBlock(block, { ...base, time: -1 }, 4, {
      time: -1,
      theme,
      passedGlowBase: base.passedGlowBase,
      textHoldRatio: 1,
      snapshotScale: 1,
      overviewTextRestoreProgress: 0,
      passedFadeDuration: Infinity,
    });
    assert.ok(waiting.text.length > 0);
    for (const command of waiting.text)
      assert.equal(renderer.haloBudget(command, true), 0, 'source waiting text has no shadow');
    for (const time of [0, 0.1, 0.8, 1.6, 2.8, 3.99, 4.3, 6]) {
      const commands = renderer.recordBlock(block, { ...base, time }, 4).text;
      for (const command of commands) {
        assert.ok(Number.isFinite(command.maximumShadowBlur));
        for (const paint of command.ranges || [command.style]) {
          assert.ok(paint.blur <= command.maximumShadowBlur + 1e-6);
          assert.ok(
            renderer.localShadowSigma(paint.blur, 0.22) <=
              renderer.haloBudget(command, true) + 1e-6,
          );
        }
      }
    }
  }
});
let sourceApi;
function width(font, text) {
  const size = Number(/([\d.]+)px/.exec(font)[1]);
  return Array.from(text).reduce(
    (n, c) => n + size * (c === ' ' ? 0.28 : c.codePointAt(0) > 0x2e00 ? 0.98 : 0.54),
    0,
  );
}
function canvas() {
  return {
    font: '640 16px test',
    measureText(text) {
      return { width: width(this.font, text) };
    },
  };
}
async function sourceOracle() {
  if (sourceApi) return sourceApi;
  const reference = foliaPath();
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent: 'Chrome/145.0', vendor: 'Google Inc.' },
  });
  globalThis.OffscreenCanvas = class {
    getContext() {
      return canvas();
    }
  };
  globalThis.document = {
    body: null,
    createElement() {
      return {
        getContext() {
          return canvas();
        },
      };
    },
  };
  const result = await build({
    stdin: {
      contents:
        "export * from './src/components/visualizer/fume/fumeArticleLayout.ts';export * from './src/components/visualizer/fume/fumeCamera.ts';export * from './src/components/visualizer/fume/fumeCameraStep.ts';export * from './src/components/visualizer/fume/fumeReveal.ts';export * from './src/components/visualizer/fume/fumeBlockFrame.ts';export * from './src/components/visualizer/fume/fumeTextStyle.ts';export * from './src/components/visualizer/fume/fumeCanvasText.ts';export * from './src/components/visualizer/fume/FumeBackground.ts';",
      resolveDir: reference,
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    define: { 'import.meta.env.DEV': 'false' },
  });
  sourceApi = await import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  );
  return sourceApi;
}
const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
test('Fume GPU vector commands retain every original background path, gradient, audio scale and parallax transform', async () => {
  const source = await sourceOracle();
  const own = await import(pathToFileURL(path.join(directory, 'background.mjs')));
  const vector = await import(pathToFileURL(path.join(directory, 'vector.mjs')));
  for (const viewport of [
    { width: 800, height: 400 },
    { width: 400, height: 800 },
  ]) {
    const options = {
      viewport,
      world: { width: viewport.width * 1.8, height: viewport.height * 1.8 },
      seed: 'GPU test 😀',
    };
    const scene = source.buildFumeBackgroundScene(options);
    assert.deepEqual(own.buildFumeBackgroundScene(options), scene);
    for (const time of [0, 1, 19.5])
      for (const level of [0, 127, 255]) {
        const params = {
          scene,
          theme: { accentColor: '#f08855', secondaryColor: '#5588dd' },
          time,
          audioLevels: { bass: level, lowMid: level, mid: level, vocal: level, treble: level },
          objectOpacityMultiplier: 2,
          parallax: { cameraX: 300, cameraY: 180, originX: 400, originY: 200, strength: 0.72 },
        };
        const expected = vector.createRecorder();
        expected.translate(50, -30);
        expected.scale(0.7, 0.7);
        source.drawFumeBackground({ ...params, context: expected });
        const actual = vector.recordBackground(vector.createRecorder(), params, {
          x: 50,
          y: -30,
          scale: 0.7,
        });
        assert.deepEqual(actual, expected.commands);
        assert.equal(actual.length, viewport.width > viewport.height ? 28 : 23);
        assert.ok(actual.every((c) => c.outline.startsWith('M') && c.outline.endsWith('Z')));
        assert.ok(actual.some((c) => c.style.stops && c.style.stops.length === 4));
      }
  }
  const square = vector.strokeOutline(
    {
      points: [
        [-5, -5],
        [5, -5],
        [5, 5],
        [-5, 5],
      ],
      closed: true,
    },
    2,
  );
  assert.equal(square, 'M-6,-6L6,-6L6,6L-6,6ZM-4,4L4,4L4,-4L-4,-4Z');
});
function lines(count) {
  return Array.from({ length: count }, (_, index) => {
    const text = index % 2 === 0 ? '夜空中最亮的星 ' + index : 'under the brightest sky ' + index;
    return {
      fullText: text,
      startTime: index * 4,
      endTime: index * 4 + 3.4,
      isChorus: index % 11 === 0,
      words: [{ text, startTime: index * 4, endTime: index * 4 + 3.4 }],
    };
  });
}
function finish(generator) {
  let result;
  do {
    result = generator.next();
  } while (!result.done);
  return result.value;
}
function layout(input, viewport) {
  available();
  api.clearCache();
  api.clearFumeTextMeasureCaches();
  api.configure({
    pieces: input.map((line) => ({
      text: api.normalize(line.fullText),
      pieces: Array.from(
        segmenter.segment(api.normalize(line.fullText)),
        ({ segment, index, isWordLike }) => ({ segment, index, isWordLike }),
      ),
    })),
    evaluator: width,
  });
  return finish(
    api.buildArticleLayout(
      input,
      viewport,
      { name: 'paper', fontStyle: 'sans', fontFamily: 'Menlo' },
      1,
      { heroScale: 1 },
    ),
  );
}
test('Fume complete article geometry equals original source across all column/density/font attempts', async () => {
  const source = await sourceOracle();
  for (const count of [16, 80])
    for (const viewport of [
      { width: 900, height: 700 },
      { width: 1200, height: 800 },
    ]) {
      const input = lines(count);
      const own = layout(input, viewport);
      const expected = finish(
        source.buildArticleLayout(
          input,
          viewport,
          { name: 'paper', fontStyle: 'sans', fontFamily: 'Menlo' },
          1,
          { heroScale: 1 },
        ),
      );
      assert.deepEqual(own, expected);
      assert.equal(own.blocks.length, count);
      assert.ok(own.blocks.some((block) => block.variant === 'hero'));
      if (count === 80) assert.ok(own.columns > 1);
    }
});
test('Fume actual camera oracle preserves smooth/stepped retarget, seek and whole-article overview', async () => {
  const source = await sourceOracle();
  const viewport = { width: 1200, height: 800 };
  const article = layout(lines(40), viewport);
  for (const mode of ['smooth', 'stepped']) {
    const own = api.createFumeCameraState(),
      expected = source.createFumeCameraState();
    api.syncFumeCameraToArticle(own, article);
    source.syncFumeCameraToArticle(expected, article);
    const overview = source.resolveArticleOverviewCamera(article, viewport);
    for (let i = 0; i < 100; i++) {
      const options = {
        article,
        time: i < 40 ? i * 0.1 : i < 60 ? 110 : 180,
        now: i * 16,
        dt: 1 / 60,
        lineIndex: i < 40 ? Math.floor(i / 10) : i < 60 ? 25 : -1,
        viewport,
        overviewCamera: overview,
        overviewStartTime: 150,
        cameraSpeed: 1.3,
        cameraTrackingMode: mode,
        staticMode: false,
        animationIntensity: 'normal',
      };
      assert.deepEqual(api.stepFumeCamera(own, options), source.stepFumeCamera(expected, options));
      assert.deepEqual(own, expected);
    }
  }
});
test('Fume iterative native measurement preparation yields and never returns provisional article', async () => {
  let jobs = null;
  try {
    jobs = await import(pathToFileURL(path.join(directory, 'prepare-job.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(jobs, 'Fume worker measurement preparation job is missing');
  const input = lines(24),
    viewport = { width: 1000, height: 740 };
  const pieces = input.map((line) => ({
    text: api.normalize(line.fullText),
    pieces: Array.from(
      segmenter.segment(api.normalize(line.fullText)),
      ({ segment, index, isWordLike }) => ({ segment, index, isWordLike }),
    ),
  }));
  const context = {
    viewport,
    theme: { name: 'paper', fontStyle: 'sans', fontFamily: 'Menlo' },
    lyricsFontScale: 1,
    tuning: { heroScale: 1 },
  };
  const job = new jobs.ArticlePreparation(input, context, pieces);
  let result,
    rounds = 0,
    yields = 0;
  for (let step = 0; step < 10000; step++) {
    result = job.step(4);
    if (result.phase === 'continue') {
      yields++;
      continue;
    }
    if (result.phase === 'measure') {
      assert.equal('article' in result, false);
      rounds++;
      job.accept(
        result.requests.map((request) => ({
          key: request.key,
          width: width(request.weight + ' ' + Math.round(request.size) + 'px test', request.text),
        })),
      );
    } else break;
  }
  assert.equal(result.phase, 'complete');
  assert.ok(yields > 20);
  assert.ok(rounds > 0 && rounds <= 32);
  assert.equal(result.article.blocks.length, 24);
  api.clearCache();
  api.clearFumeTextMeasureCaches();
  api.configure({
    pieces,
    evaluator: (font, text) =>
      width(
        font.replace(/([\d.]+)px/, (m, n) => Math.round(Number(n)) + 'px'),
        text,
      ),
  });
  assert.deepEqual(
    result.article,
    finish(
      api.buildArticleLayout(
        input,
        viewport,
        context.theme,
        context.lyricsFontScale,
        context.tuning,
      ),
    ),
  );
});
test('Fume draw recording preserves complete shaping contexts and exposes source EGC style intervals', async () => {
  let renderer = null;
  try {
    renderer = await import(pathToFileURL(path.join(directory, 'frame.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(renderer, 'Fume source Canvas-to-native command recorder missing');
  const article = layout(lines(16), { width: 1000, height: 740 });
  const block = article.chronologicalBlocks[0];
  const commands = renderer.recordBlock(
    block,
    {
      time: 1,
      theme: { primaryColor: '#eeeeee', accentColor: '#00aaff', wordColors: [] },
      glowIntensity: 1,
      activeGlowBoost: 0.92,
      passedGlowBase: 0.62,
      showPrintStamp: true,
    },
    4,
  );
  assert.ok(commands.text.some((command) => command.layer === 'line-glow'));
  assert.ok(commands.text.some((command) => command.ranges && command.ranges.length));
  for (const command of commands.text) {
    assert.ok(command.text.length);
    assert.ok(command.font.includes('px'));
    for (const range of command.ranges || []) assert.ok(range.end > range.start);
  }
});

function canvasRecorder() {
  const calls = [],
    stack = [];
  return {
    calls,
    font: '',
    fillStyle: '',
    shadowBlur: 0,
    shadowColor: 'transparent',
    globalAlpha: 1,
    clipValue: null,
    save() {
      stack.push({
        font: this.font,
        fillStyle: this.fillStyle,
        shadowBlur: this.shadowBlur,
        shadowColor: this.shadowColor,
        globalAlpha: this.globalAlpha,
        clipValue: this.clipValue,
      });
    },
    restore() {
      Object.assign(this, stack.pop());
    },
    beginPath() {},
    rect(...args) {
      this.clipValue = args;
    },
    clip() {},
    fillText(...args) {
      calls.push({
        kind: 'text',
        args,
        font: this.font,
        fill: this.fillStyle,
        blur: this.shadowBlur,
        shadow: this.shadowColor,
        clip: this.clipValue,
      });
    },
    fillRect(...args) {
      calls.push({
        kind: 'rect',
        args,
        fill: this.fillStyle,
        blur: this.shadowBlur,
        shadow: this.shadowColor,
      });
    },
  };
}
test('Fume full original Canvas draw stream equals port at reveal, frontier, stamp, pass and syllable times', async () => {
  const source = await sourceOracle(),
    ownDraw = await import(pathToFileURL(path.join(directory, 'canvas-text.mjs'))),
    article = layout(lines(16), { width: 1000, height: 740 });
  const theme = {
    primaryColor: '#e8e8e8',
    accentColor: '#12aaff',
    fontStyle: 'sans',
    fontFamily: 'Menlo',
    wordColors: [{ word: '夜空', color: '#ff00aa' }],
  };
  for (const block of article.chronologicalBlocks.slice(0, 3))
    for (const t of [-0.1, 0.001, 0.2, 1, 2, 3.4, 4, 6]) {
      const time = block.line.startTime + t,
        timing = api.resolveFumeBlockTiming(block, time, block.line.startTime + 4, 0.6),
        params = {
          time,
          theme,
          glowIntensity: 1.8,
          activeGlowBoost: 2.07,
          passedGlowBase: 1.71,
          showPrintStamp: true,
        };
      const a = canvasRecorder(),
        b = canvasRecorder();
      ownDraw.drawFumeLiveBlock(a, block, timing, params);
      source.drawFumeLiveBlock(b, block, timing, params);
      assert.deepEqual(a.calls, b.calls);
    }
});

test('Fume source-index identity and normalized audio/style contracts remain explicit', async () => {
  const renderer = await import(pathToFileURL(path.join(directory, 'frame.mjs')));
  const input = lines(8).map((line, index) => ({ ...line, sourceIndex: index * 13 }));
  const article = layout(input, { width: 1000, height: 740 });
  assert.deepEqual(
    article.chronologicalBlocks.map((block) => block.sourceLineIndex),
    input.map((line) => line.sourceIndex),
  );
  assert.equal(api.resolveFocusBlock(article, 13, 4).sourceLineIndex, 13);
  assert.ok(api.resolveFocusBlock(article, -1, 12));
  assert.deepEqual(renderer.rgba('rgba(128, 64, 32, 0.25)', 0.4), {
    r: 128 / 255,
    g: 64 / 255,
    b: 32 / 255,
    a: 0.1,
  });
  assert.equal(renderer.rgba('transparent').a, 0);
  assert.equal(renderer.tuning({ fumeHeroScale: 9 }).heroScale, 1.32);
  assert.equal(renderer.tuning({}).disableGeometricBackground, true);
  assert.equal(renderer.haloBudget({ layer: 'line-glow' }, true), 512);
  const command = {
    graphemes: [
      { segment: 'f', index: 0 },
      { segment: 'i', index: 1 },
    ],
    ranges: [
      { start: 0, end: 1, fill: 'red' },
      { start: 1, end: 2, fill: 'blue' },
    ],
  };
  assert.equal(renderer.styleForCluster(command, 0).fill, 'red');
  assert.equal(renderer.styleForCluster(command, 1).fill, 'blue');
  const maxFont = 58 * 1.4 * 1.42 * 1.32,
    maxLocal = ((12 + maxFont * 0.7) * 1.8) / 0.22;
  assert.ok(maxLocal / 2 < 512);
  assert.equal(renderer.localShadowSigma(213, 0.22), 213 / 0.44);
  assert.ok(maxLocal > 160);
});
test('Fume records exact source post-blur clip rectangles including split ffi shaping contexts', async () => {
  const renderer = await import(pathToFileURL(path.join(directory, 'frame.mjs'))),
    draw = await import(pathToFileURL(path.join(directory, 'canvas-text.mjs')));
  const line = {
    fullText: 'office',
    startTime: 0,
    endTime: 4,
    words: [
      { text: 'of', startTime: 0, endTime: 1 },
      { text: 'fice', startTime: 1, endTime: 4 },
    ],
  };
  const block = layout([line], { width: 1000, height: 740 }).blocks[0],
    theme = {
      fontStyle: 'sans',
      fontFamily: 'Menlo',
      primaryColor: '#eeeeee',
      accentColor: '#00ff00',
      wordColors: [
        { word: 'of', color: '#ff0000' },
        { word: 'fice', color: '#0000ff' },
      ],
    },
    params = {
      time: 1.1,
      theme,
      glowIntensity: 1,
      activeGlowBoost: 0.92,
      passedGlowBase: 0.62,
      showPrintStamp: false,
    };
  const recorded = renderer.recordBlock(block, params, null),
    context = canvasRecorder();
  draw.drawFumeLiveBlock(context, block, recorded.timing, params);
  const expected = context.calls
    .filter((call) => call.kind === 'text' && call.clip)
    .map((call) => ({
      text: call.args[0],
      rect: call.clip,
      fill: call.fill,
      blur: call.blur,
      shadow: call.shadow,
    }));
  const actual = [];
  for (const command of recorded.text)
    for (const range of command.ranges || [])
      actual.push({
        text: command.text,
        rect: [
          command.x + range.clipRect.x,
          command.y + range.clipRect.y,
          range.clipRect.width,
          range.clipRect.height,
        ],
        fill: range.fill,
        blur: range.blur,
        shadow: range.shadow,
      });
  assert.deepEqual(actual, expected);
  assert.ok(
    recorded.text.some(
      (command) => command.text === 'office' && command.ranges && command.ranges.length > 1,
    ),
  );
});
test('Fume Canvas text boundary normalizes layout control whitespace without changing UTF16 indices', async () => {
  const native = await import(pathToFileURL(path.join(directory, 'native-measure.mjs')));
  assert.equal(typeof native.canvasText, 'function');
  const source = 'a\tb\nc\rd\fe\vf\u2028g\u2029h';
  assert.equal(native.canvasText(source), 'a b c d e f g h');
  assert.equal(native.canvasText(source).length, source.length);
  let measured;
  native.configure({
    pieces: [],
    evaluator: (font, text) => {
      measured = text;
      return 1;
    },
  });
  native.getMeasureContext().font = '640 32px test';
  native.getMeasureContext().measureText('a\tb');
  assert.equal(measured, 'a b');
  assert.equal(native.metricKey('640 32px test', 'a\tb'), native.metricKey('640 32px test', 'a b'));
});
