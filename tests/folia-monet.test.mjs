import { foliaPath } from './folia-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
let api = null;
try {
  api = await import(
    pathToFileURL(path.resolve('plugins/folia-lyrics-skin/qml/styles/monet/api.mjs'))
  );
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
function available() {
  assert.ok(api, 'Monet source rail/model implementation is missing');
}
const line = {
  fullText: '山河 á 👩🏽‍🚀!',
  startTime: 1,
  endTime: 5,
  translation: 'mountains and rivers',
  romanization: 'shan he',
  words: [
    { text: '山河', startTime: 1, endTime: 2 },
    { text: 'á', startTime: 2, endTime: 3 },
    { text: '👩🏽‍🚀', startTime: 3, endTime: 5 },
  ],
};
test('Monet preserves complete text around timed tokens and Unicode17 EGC timing', () => {
  available();
  const tokens = api.buildMonetDisplayTokens(line);
  assert.equal(tokens.map((token) => token.text).join(''), line.fullText);
  assert.equal(tokens.filter((token) => token.timed).length, 3);
  assert.deepEqual(api.splitMonetGraphemes('á👩🏽‍🚀'), ['á', '👩🏽‍🚀']);
  assert.equal(api.resolveMonetGlow(1, 1, 2, 5), 0);
  assert.equal(api.resolveMonetGlow(2.18, 1, 2, 5), 1);
});
test('Monet decodes before four-layer portrait handover and keeps actual crossover contract', () => {
  available();
  let layers = [];
  for (let i = 0; i < 9; i++) layers = api.pushMonetPortraitLayer(layers, 'cover' + i, 'k' + i);
  assert.equal(layers.length, 4);
  assert.equal(api.monetPortraitTargetSource(layers), 'cover8');
  assert.equal(api.monetTextShowsIncoming(0.499), false);
  assert.equal(api.monetTextShowsIncoming(0.5), true);
  assert.deepEqual(api.settleMonetPortraitLayers(layers, 'k8'), [layers[3]]);
});
test('Monet raw spectrum and source band fallback retain 72 real drawing samples', () => {
  available();
  assert.equal(typeof api.drawAudioFrame, 'function');
  assert.equal(typeof api.drawStaticBars, 'function');
  assert.equal(api.sampleRawSpectrumProfile(new Uint8Array(1024), 0.4), 0);
  assert.ok(api.sampleRawSpectrumProfile(new Uint8Array(1024).fill(255), 0.8) > 0.8);
  assert.notEqual(
    api.sampleSpectrumProfile([1, 0, 0, 0, 0], 0),
    api.sampleSpectrumProfile([0, 0, 0, 0, 1], 0),
  );
});
import { build } from 'esbuild';
const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
function metric(font, text) {
  const px = Math.round(Number(/([\d.]+)px/.exec(font)[1]));
  return {
    width: Array.from(text).reduce(
      (n, c) => n + px * (c === ' ' ? 0.28 : c.codePointAt(0) > 0x2e00 ? 0.97 : 0.53),
      0,
    ),
    actualBoundingBoxAscent: px * 0.8,
    actualBoundingBoxDescent: text === ' ' ? 0 : px * 0.23,
  };
}
let original;
async function sourceOracle() {
  if (original) return original;
  globalThis.window = { innerWidth: 1280 };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent: 'Chrome/145.0', vendor: 'Google Inc.' },
  });
  globalThis.OffscreenCanvas = class {
    getContext() {
      return {
        font: '600 24px test',
        measureText(text) {
          return metric(this.font, text);
        },
      };
    }
  };
  globalThis.document = {
    body: null,
    createElement() {
      return {
        getContext() {
          return new OffscreenCanvas().getContext();
        },
      };
    },
  };
  const result = await build({
    stdin: {
      contents:
        "export * from './src/components/visualizer/monet/monetLyricsModel.ts';export * from './src/components/visualizer/monet/monetRailLayout.ts';export * from './src/components/visualizer/monet/monetLyricMotion.ts';export * from './src/components/visualizer/monet/monetPortraitCrossfade.ts';",
      resolveDir: foliaPath(),
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  });
  return (original = await import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  ));
}
function pieces(texts) {
  return [...new Set(texts)].map((text) => ({
    text,
    pieces: Array.from(segmenter.segment(text), ({ segment, index, isWordLike }) => ({
      segment,
      index,
      isWordLike,
    })),
  }));
}
function requestedText(line) {
  return [
    line.fullText.replace(/\r\n/g, '\n').replace(/[\r\f]/g, '\n'),
    line.translation || '',
    line.romanization || '',
    ...api
      .buildMonetDisplayTokens(line)
      .map((token) => token.text.replace(/[ \t\n\r\f]+/g, ' ').replace(/^ | $/g, '')),
  ];
}
test('Monet full source rich-inline metrics and both subtitle tracks equal original a8da model', async () => {
  available();
  const source = await sourceOracle();
  for (const text of [
    '山河依旧星光落满夜空',
    'office ffi á 👩🏽‍🚀 العربية',
    'A veryveryveryveryverylongatomicword next',
    'first\nsecond\nthird',
  ]) {
    const sample = { ...line, fullText: text, words: [{ text, startTime: 1, endTime: 5 }] };
    for (const status of ['active', 'passed', 'waiting'])
      for (const maxWidthPx of [180, 320, 680]) {
        const input = {
          line: sample,
          status,
          fontPx: 43.2,
          translationFontPx: 22.1,
          fontStack: 'Menlo',
          translationFontStack: 'Arial',
          fontWeight: 600,
          translationFontWeight: 500,
          secondaryTranslationFontWeight: 400,
          maxWidthPx,
          subtitleContentMode: 'both',
        };
        api.clearMonetMeasurementCaches();
        api.configure({ pieces: pieces(requestedText(sample)), evaluator: metric });
        source.clearMonetMeasurementCaches();
        assert.deepEqual(api.measureMonetLineLayout(input), source.measureMonetLineLayout(input));
      }
  }
});
test('Monet source viewport clamp, line tone, sweep and portrait cancellation remain exact', async () => {
  available();
  const source = await sourceOracle();
  for (const viewport of [400, 1280, 1800, 2200]) {
    window.innerWidth = viewport;
    api.configureViewport(viewport);
    assert.equal(
      api.resolveClampFontPx(1.34, 2.75, 2.28),
      source.resolveClampFontPx(1.34, 2.75, 2.28),
    );
    assert.equal(
      api.resolveMonetLargeScreenScale(viewport),
      source.resolveMonetLargeScreenScale(viewport),
    );
  }
  for (let t = -1; t < 12; t += 0.037) {
    assert.equal(api.resolveMonetGlow(t, 1, 4, 6), source.resolveMonetGlow(t, 1, 4, 6));
    assert.equal(
      api.resolveMonetFillWidth(
        t,
        1,
        4,
        [0, 20, 47],
        [
          { startTime: 1, endTime: 2 },
          { startTime: 3, endTime: 4 },
        ],
      ),
      source.resolveMonetFillWidth(
        t,
        1,
        4,
        [0, 20, 47],
        [
          { startTime: 1, endTime: 2 },
          { startTime: 3, endTime: 4 },
        ],
      ),
    );
  }
  const stack = [
    { key: 'a', src: 'old' },
    { key: 'b', src: 'incoming', handoffFrom: 0.25 },
  ];
  assert.deepEqual(
    api.endMonetPortraitHandoff(stack, 'old'),
    source.endMonetPortraitHandoff(stack, 'old'),
  );
});
test('Monet sparse source windows retain exact current index and request unprepared rows', async () => {
  const kernel = await import(
    pathToFileURL(path.resolve('plugins/folia-lyrics-skin/qml/styles/monet/kernel.mjs'))
  );
  const metadata = [0, 3, 40, 80, 99].map((sourceIndex, i) => ({
    sourceIndex,
    startTime: i * 4,
    endTime: i * 4 + 3,
    renderEndTime: i * 4 + 3.5,
  }));
  const prepared = [];
  prepared[40] = { line: { ...line, startTime: 8, endTime: 11 } };
  const selected = kernel.select(metadata, prepared, 40, 9, null);
  assert.deepEqual(selected.required, [0, 3, 40, 80, 99]);
  assert.equal(selected.entries.find((entry) => entry.index === 40).status, 'active');
  const gap = kernel.select(metadata, prepared, -1, 7.8, null);
  assert.equal(gap.anchor, 2);
  assert.ok(gap.entries.every((entry) => entry.status !== 'active'));
  assert.equal(kernel.settings({ monetPortraitOffsetX: 30 }).portraitOffsetX, 0);
  assert.equal(kernel.settings({ monetPortraitOffsetX: -999 }).portraitOffsetX, -150);
});
test('Monet real layout job stops at missing metrics and preserves original final rail geometry', async () => {
  available();
  const { LayoutJob, requestedTexts } = await import(
      pathToFileURL(path.resolve('plugins/folia-lyrics-skin/qml/styles/monet/layout-job.mjs'))
    ),
    kernel = await import(
      pathToFileURL(path.resolve('plugins/folia-lyrics-skin/qml/styles/monet/kernel.mjs'))
    ),
    source = await sourceOracle();
  for (const width of [760, 1800]) {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      key: String(i),
      index: i * 8,
      position: i,
      offset: i - 2,
      status: i === 2 ? 'active' : i < 2 ? 'passed' : 'waiting',
      line: {
        ...line,
        fullText: '山河 office ' + i,
        words: [
          { text: '山河', startTime: 1, endTime: 2 },
          { text: 'office', startTime: 2, endTime: 4 },
        ],
      },
    }));
    const config = { subtitleContentMode: 'both', monetFontScale: 1.5, lyricsFontScale: 1.2 },
      request = {
        entries,
        width,
        height: 820,
        settings: config,
        primaryColor: '#ffffff',
        pieces: pieces(requestedTexts(entries, config)),
      },
      job = new LayoutJob(request);
    let result = job.step();
    assert.equal(result.phase, 'measure');
    assert.equal(result.entries, undefined);
    let rounds = 0;
    while (result.phase === 'measure') {
      assert.ok(++rounds < 10);
      job.accept(
        result.requests.map((value) => {
          const m = metric(value.weight + ' ' + value.size + 'px role', value.text);
          if (value.inlineBox) {
            assert.ok(m.width <= value.availableWidth, 'controlled one-line box only');
            return {
              key: value.key,
              ...m,
              boxWidth: m.width,
              boxHeight: value.lineHeight,
              lineCount: 1,
              paragraph: true,
            };
          }
          return { key: value.key, ...m, nativeHeight: value.size * 1.2 };
        }),
      );
      result = job.step();
    }
    assert.equal(result.phase, 'complete');
    const g = kernel.composition(width, 820, config),
      t = kernel.settings(config),
      expected = source.buildPositionedEntries(
        entries,
        { width: g.railWidth, height: g.railHeight },
        { primaryColor: '#ffffff' },
        g.fontPx,
        g.inactiveFontPx,
        {
          translationFontPx: g.translationFontPx,
          fontStack: 'body',
          translationFontStack: 'subtitle',
          fontWeight: t.fontWeight,
          translationFontWeight: t.subtitleFontWeight,
          secondaryTranslationFontWeight: t.secondarySubtitleFontWeight,
          subtitleContentMode: t.subtitleContentMode,
        },
        g.glow,
        new Map(),
      );
    for (let i = 0; i < expected.length; i++) {
      assert.deepEqual(result.entries[i].layout, expected[i].layout);
      assert.deepEqual(result.entries[i].tone, expected[i].tone);
      assert.equal(result.entries[i].y, expected[i].y);
      assert.ok(result.entries[i].rows.length > 0);
    }
  }
});

test('Monet inherits source lyric weight into both subtitle tracks before applying design fallbacks', async () => {
  const kernel = await import(
    pathToFileURL(path.resolve('plugins/folia-lyrics-skin/qml/styles/monet/kernel.mjs'))
  );
  let t = kernel.settings({ fontWeight: 300, subtitleFontWeight: 800 });
  assert.equal(t.subtitleFontWeight, 300);
  assert.equal(t.secondarySubtitleFontWeight, 300);
  t = kernel.settings({
    fontWeight: 300,
    subtitleFontWeight: null,
    subtitleFontInheritsLyrics: false,
  });
  assert.equal(t.subtitleFontWeight, 500);
  assert.equal(t.secondarySubtitleFontWeight, 400);
  t = kernel.settings({ fontWeight: null, subtitleFontWeight: 800 });
  assert.equal(t.subtitleFontWeight, 500);
  assert.equal(t.secondarySubtitleFontWeight, 400);
});
let audioSource;
async function sourceAudio() {
  if (audioSource) return audioSource;
  const result = await build({
    entryPoints: [foliaPath('src/components/visualizer/monet/AudioOverlay.tsx')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    jsx: 'transform',
    plugins: [
      {
        name: 'source-canvas-hook',
        setup(builder) {
          builder.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, () => ({
            path: 'react',
            namespace: 'monet-hooks',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'monet-hooks' }, () => ({
            contents:
              'export const jsx=()=>({});export const jsxs=jsx;export const useEffect=callback=>callback();export const useRef=()=>({current:globalThis.__monetCanvas});export default {createElement(){return {};}};',
            loader: 'js',
          }));
        },
      },
    ],
  });
  return (audioSource = await import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  ));
}
function recordingCanvas() {
  let serial = 0;
  const commands = [];
  const ctx = new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'createLinearGradient')
          return (...args) => {
            const id = ++serial;
            commands.push([key, ...args]);
            return {
              id,
              addColorStop(...values) {
                commands.push(['addColorStop', id, ...values]);
              },
            };
          };
        return (...args) => commands.push([key, ...args]);
      },
      set(_target, key, value) {
        commands.push(['set', key, value && typeof value === 'object' ? { id: value.id } : value]);
        return true;
      },
    },
  );
  return {
    commands,
    ctx,
    canvas: {
      width: 0,
      height: 0,
      getContext() {
        return ctx;
      },
      getBoundingClientRect() {
        return { width: 360, height: 40 };
      },
    },
  };
}
test('Monet 72-bar/line Canvas stream equals actual source React draw loop with raw FFT and fallback', async () => {
  available();
  const source = await sourceAudio(),
    oldWindow = globalThis.window,
    oldPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  try {
    globalThis.window = {
      devicePixelRatio: 1,
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame() {
        return 1;
      },
      cancelAnimationFrame() {},
    };
    Object.defineProperty(globalThis, 'performance', {
      configurable: true,
      value: { now: () => 1250 },
    });
    for (const mode of ['bar', 'line'])
      for (const kind of ['raw', 'fallback', 'static']) {
        const expected = recordingCanvas(),
          actual = recordingCanvas(),
          bands = [0.75, 0.5, 0.25, 0.5, 0.125],
          raw =
            kind === 'raw'
              ? Uint8Array.from({ length: 1024 }, (_, i) => i % 256)
              : new Uint8Array(0),
          theme = { primaryColor: '#f0dca0' };
        globalThis.__monetCanvas = expected.canvas;
        source.default({
          audioPower: { get: () => 0.25 * 255 },
          audioBands: Object.assign(
            Object.fromEntries(
              ['bass', 'lowMid', 'mid', 'vocal', 'treble'].map((name, i) => [
                name,
                { get: () => bands[i] * 255 },
              ]),
            ),
            { spectrum: { get: () => raw } },
          ),
          theme,
          mode,
          staticMode: kind === 'static',
        });
        if (kind === 'static') api.drawStaticBars(actual.ctx, 360, 40, theme, mode);
        else api.drawAudioFrame(actual.ctx, 360, 40, theme, mode, 0.25, bands, raw, 1250);
        assert.deepEqual(
          actual.commands,
          expected.commands.filter((command) => command[0] !== 'setTransform'),
        );
      }
  } finally {
    globalThis.window = oldWindow;
    Object.defineProperty(globalThis, 'performance', oldPerformance);
    delete globalThis.__monetCanvas;
  }
});

async function completeMonetLayout(sample, options = {}) {
  const { LayoutJob, requestedTexts } = await import(
    pathToFileURL(path.resolve('plugins/folia-lyrics-skin/qml/styles/monet/layout-job.mjs'))
  );
  const entries = [
    { key: 'pre-wrap', index: 0, position: 0, offset: 0, status: 'active', line: sample },
  ];
  const config = { subtitleContentMode: 'none' };
  const request = {
    entries,
    width: 1200,
    height: 760,
    settings: config,
    primaryColor: '#ffffff',
    pieces: pieces(requestedTexts(entries, config)),
    ...options,
  };
  const job = new LayoutJob(request),
    queries = [];
  let result = job.step(),
    rounds = 0;
  while (result.phase === 'measure') {
    assert.ok(++rounds < 16, 'real layout discovery must remain bounded');
    queries.push(...result.requests);
    job.accept(
      result.requests.map((value) => {
        const m = metric(value.weight + ' ' + value.size + 'px role', value.text);
        return {
          key: value.key,
          ...m,
          nativeHeight: value.size * 1.2,
          ...(value.inlineBox
            ? { boxWidth: m.width, boxHeight: value.lineHeight, lineCount: 1, paragraph: true }
            : {}),
        };
      }),
    );
    result = job.step();
  }
  assert.equal(result.phase, 'complete');
  return { ...result, queries };
}
function separatedMonetWords(fullText) {
  return {
    ...line,
    fullText,
    translation: '',
    romanization: '',
    words: [
      { text: 'A', startTime: 1, endTime: 2 },
      { text: 'B', startTime: 4, endTime: 5 },
    ],
  };
}
test('Monet DOM pre-wrap preserves multiple untimed spaces between original timed boxes', async () => {
  const sample = separatedMonetWords('A   B'),
    original = structuredClone(sample);
  const result = await completeMonetLayout(sample),
    entry = result.entries[0];
  const a = entry.rows
    .flatMap((row) => row.fragments)
    .find((fragment) => fragment.token.timed && fragment.text === 'A');
  const b = entry.rows
    .flatMap((row) => row.fragments)
    .find((fragment) => fragment.token.timed && fragment.text === 'B');
  assert.ok(a && b);
  const space = metric(entry.tone.fontWeight + ' ' + result.geometry.fontPx + 'px body', ' ').width;
  assert.ok(
    Math.abs(b.x - a.x - a.boxWidth - 3 * space) < 1e-6,
    'all three source spaces occupy native-measured advance',
  );
  assert.deepEqual(
    sample,
    original,
    'display adaptation cannot rewrite source text or word timing',
  );
});
test('Monet DOM pre-wrap preserves untimed hard breaks, blank lines and whole BiDi text spans', async () => {
  const sample = separatedMonetWords('A   لا\n\nעברית  B'),
    original = structuredClone(sample);
  const result = await completeMonetLayout(sample),
    entry = result.entries[0];
  assert.equal(entry.rows.length, 3, 'two source hard breaks retain the empty middle line');
  assert.equal(
    entry.rows.map((row) => row.fragments.map((fragment) => fragment.text).join('')).join('\n'),
    sample.fullText,
  );
  assert.equal(entry.rows[1].fragments.length, 0);
  assert.ok(
    result.queries.some((query) => query.text === '   لا'),
    'native measurement retains the entire connected Arabic span',
  );
  assert.ok(
    result.queries.some((query) => query.text === 'עברית  '),
    'native measurement retains the entire Hebrew span and trailing spaces',
  );
  const b = entry.rows[2].fragments.find((fragment) => fragment.text === 'B');
  assert.ok(b.y >= 2 * entry.layout.lineHeightPx);
  assert.deepEqual(sample, original);
});
test('Monet pre-wrap adaptation leaves original rich-inline normal whitespace semantics unchanged', async () => {
  const pretext = await import(
    pathToFileURL(path.resolve('plugins/folia-lyrics-skin/qml/styles/monet/pretext.mjs'))
  );
  api.configure({ pieces: pieces(['A B C']), evaluator: metric });
  const prepared = pretext.prepareRichInline([{ text: 'A  B\nC', font: '600 24px body' }]);
  const rows = [];
  pretext.walkRichInlineLineRanges(prepared, 1000, (range) =>
    rows.push(pretext.materializeRichInlineLineRange(prepared, range)),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].fragments.map((fragment) => fragment.text).join(''), 'A B C');
});
test('Monet pre-wrap retains CRLF/leading blank lines without changing timed inline-box contents', async () => {
  const sample = separatedMonetWords('\r\nA\r\n\r\nB\r\n'),
    original = structuredClone(sample);
  const result = await completeMonetLayout(sample),
    entry = result.entries[0];
  assert.equal(entry.rows.length, 4);
  assert.equal(entry.rows[0].fragments.length, 0);
  assert.equal(entry.rows[2].fragments.length, 0);
  assert.deepEqual(
    entry.rows.flatMap((row) => row.fragments).map((fragment) => fragment.text),
    ['A', 'B'],
  );
  for (const fragment of entry.rows.flatMap((row) => row.fragments)) {
    assert.equal(fragment.paragraph, true);
    assert.equal(fragment.lineCount, 1);
    assert.deepEqual(
      [fragment.token.startTime, fragment.token.endTime],
      fragment.text === 'A' ? [1, 2] : [4, 5],
    );
  }
  assert.deepEqual(sample, original);
});
test('Monet pre-wrap moves an unbroken span to a fresh row before native fallback wrapping', async () => {
  const kernel = await import(
    pathToFileURL(path.resolve('plugins/folia-lyrics-skin/qml/styles/monet/kernel.mjs'))
  );
  const geometry = kernel.composition(760, 760, { subtitleContentMode: 'none' });
  const width = Math.max(180, geometry.railWidth - 2 * geometry.glow - 8);
  const advance = metric('600 ' + geometry.fontPx + 'px body', 'm').width;
  const word = 'm'.repeat(Math.floor(width / advance));
  const result = await completeMonetLayout(separatedMonetWords('A' + word + 'B'), { width: 760 });
  const fragments = result.entries[0].rows.flatMap((row) => row.fragments);
  assert.ok(fragments.some((fragment) => fragment.text === word && fragment.x === 0));
  assert.equal(fragments.filter((fragment) => fragment.token.timed).length, 2);
});
