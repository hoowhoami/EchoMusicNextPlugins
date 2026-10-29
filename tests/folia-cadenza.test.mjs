import { foliaPath } from './folia-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const directory = path.resolve('plugins/folia-lyrics-skin/qml/styles/cadenza');
let api = null;
try {
  api = await import(pathToFileURL(path.join(directory, 'prepare.mjs')));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
const line = {
  fullText: 'under the brightest sky',
  startTime: 2,
  endTime: 6,
  words: [
    ['under', 2, 3],
    ['the', 3, 3.5],
    ['brightest', 3.5, 5],
    ['sky', 5, 6],
  ].map(([text, startTime, endTime]) => ({ text, startTime, endTime })),
};
const context = {
  showText: true,
  viewport: { width: 900, height: 700 },
  theme: {
    fontFamily: 'Menlo',
    fontWeight: 700,
    animationIntensity: 'normal',
    accentColor: '#00ff00',
    wordColors: [],
  },
  tuning: {
    fontScale: 1.12,
    widthRatio: 0.72,
    motionAmount: 1,
    glowIntensity: 1,
    beamIntensity: 0,
  },
};
function available() {
  assert.ok(api, 'Cadenza source/pretext preparation API is missing');
}
const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
function pieces(text) {
  return Array.from(segmenter.segment(text), ({ segment, index, isWordLike }) => ({
    segment,
    index,
    isWordLike,
  }));
}
// Widths here are an explicit deterministic test font, not runtime estimation.
function testWidth(text) {
  return Array.from(text).reduce(
    (width, c) => width + (c === ' ' ? 12 : c.codePointAt(0) > 0x2e00 ? 44 : 26),
    0,
  );
}
function prepare(value = line, settings = context) {
  available();
  const plan = api.discover(value, settings, pieces(api.normalize(value.fullText)));
  const measurements = plan.texts.map((text) => ({ text, width: testWidth(text) }));
  return api.complete(value, settings, pieces(api.normalize(value.fullText)), measurements);
}
test('Cadenza uses real wrapped fragments and one centered intact hero', () => {
  const result = prepare();
  assert.equal(result.fontPx, 64.512);
  assert.ok(result.layout.lines.length >= 2);
  assert.equal(result.placements.filter((value) => value.emphasis > 1).length, 1);
  const hero = result.placements.find((value) => value.emphasis > 1);
  assert.equal(hero.text, 'brightest');
  assert.ok(result.placements.some((value) => Math.abs(value.y - hero.y) > 30));
});
test('Cadenza measurement discovery is exact, strict and never publishes provisional layout', () => {
  available();
  const p = pieces(line.fullText);
  const plan = api.discover(line, context, p);
  assert.equal('placements' in plan, false);
  assert.ok(plan.texts.includes('brightest'));
  assert.throws(() => api.complete(line, context, p, []), /Missing native measurement/);
  assert.throws(() => api.discover(line, context, []), /ICU/);
});
test('Cadenza micro line remains active to renderEnd and does not create many hero fragments', () => {
  const tiny = {
    ...line,
    fullText: 'longwordlongwordlongword',
    words: [{ text: 'longwordlongwordlongword', startTime: 2, endTime: 2.03 }],
    endTime: 2.03,
    renderHints: {
      rawDuration: 0.03,
      lineTransitionMode: 'none',
      wordRevealMode: 'instant',
      renderEndTime: 2.067,
    },
  };
  const result = prepare(tiny, { ...context, viewport: { width: 300, height: 500 } });
  assert.ok(result.layout.lines.length > 1);
  assert.equal(result.placements.filter((p) => p.emphasis > 1).length, 0);
  assert.deepEqual(
    result.placements.map((p) => p.fragmentStartInWord),
    result.placements.map((p, i, all) => all.slice(0, i).reduce((n, s) => n + s.text.length, 0)),
  );
});
test('Cadenza raw runtime is ES2016 without Intl, Unicode properties or browser globals', async () => {
  available();
  const { parse } = await import('acorn');
  for (const name of [
    'prepare.mjs',
    'pretext.mjs',
    'envelopes.mjs',
    'placements.mjs',
    'fragments.mjs',
    'prepared-state.mjs',
  ]) {
    const code = await readFile(path.join(directory, name), 'utf8');
    parse(code, { ecmaVersion: 2016, sourceType: 'module' });
    assert.doesNotMatch(code, /new Intl|\\p\{|\bwindow\.|\bdocument\./);
  }
});

let oracle;
async function sourceOracle() {
  if (oracle) return oracle;
  const { build } = await import('esbuild');
  const ref = foliaPath();
  const visualizer = await readFile(
    path.join(ref, 'src/components/visualizer/cadenza/VisualizerCadenza.tsx'),
    'utf8',
  );
  const a = visualizer.indexOf('const progress = getWordProgress(');
  const b =
    visualizer.indexOf('stateMap.set(placement.id, animatedState);', a) +
    'stateMap.set(placement.id, animatedState);'.length;
  const frame = visualizer.slice(a, b);
  const frameExport = `
    import {clamp,mix,getWordProgress,getClassicBodyMix,getClassicGlowEnvelope,getClassicPassedDrift,ACTIVE_PULSE_FREQUENCY} from './src/components/visualizer/cadenza/cadenzaEnvelopes.ts';
    export function stepSource(held,placement,placementIndex,lineTiming,options){
      const {time,width,height}=options; const dt=clamp(options.dt,1/240,.05);
      const theme={animationIntensity:options.animationIntensity}; const tuning={motionAmount:options.motionAmount};
      const wordRevealMode=lineTiming.wordRevealMode, isInstantWordReveal=wordRevealMode==='instant';
      const status=options.status; const motionEnergy=clamp(options.energy,0,1)*tuning.motionAmount;
      const focusY=height*.42+Math.sin(time*2.3)*(3+motionEnergy*8);
      const animatedPlacementRef={current:new Map(held?[[placement.id,{...held}]]:[])};
      ${frame}
      return animatedState;
    }
  `;
  const result = await build({
    stdin: {
      contents:
        "export * from './src/components/visualizer/cadenza/cadenzaEnvelopes.ts'; export {buildPreparedState} from './src/components/visualizer/cadenza/cadenzaPreparedState.ts';" +
        frameExport,
      resolveDir: ref,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'es2022',
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent: 'Chrome/145.0', vendor: 'Google Inc.' },
  });
  globalThis.OffscreenCanvas = class {
    getContext() {
      return { font: '', measureText: (text) => ({ width: testWidth(text) }) };
    }
  };
  oracle = await import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  );
  return oracle;
}
test('Cadenza actual a8da source oracle preserves pretext CJK, Arabic, numeric, emoji and wrapped-word geometry', async () => {
  const source = await sourceOracle();
  for (const text of [
    'under the brightest sky',
    '夜空中最亮的星請照亮我前行的路',
    'hello no-no test! 123,456.78 USD',
    'العربية لغة جميلة جدا',
    '👩🏽‍🚀 á 👨‍👩‍👧‍👦 🏳️‍🌈 office',
    'a'.repeat(110),
    'a\t  b\r\nc',
  ])
    for (const width of [300, 900])
      for (const intensity of ['calm', 'normal', 'chaotic']) {
        const words = Array.from(
          new Intl.Segmenter('en', { granularity: 'word' }).segment(text),
          (p) => ({ text: p.segment, startTime: 2, endTime: 4 }),
        );
        const value = { fullText: text, startTime: 2, endTime: 4, words };
        const options = {
          ...context,
          viewport: { width, height: 700 },
          theme: { ...context.theme, animationIntensity: intensity },
        };
        const result = prepare(value, options);
        const expected = source.buildPreparedState(value, options);
        assert.deepEqual(
          JSON.parse(JSON.stringify(result)),
          JSON.parse(JSON.stringify(expected)),
          text + ' ' + width + ' ' + intensity,
        );
      }
});
test('Cadenza timing and three 40px shadows preserve actual source envelopes', async () => {
  const source = await sourceOracle();
  const own = await import(pathToFileURL(path.join(directory, 'envelopes.mjs')));
  for (const mode of ['normal', 'fast', 'instant']) {
    const value = {
      ...line,
      renderHints: {
        wordRevealMode: mode,
        lineTransitionMode: mode === 'instant' ? 'none' : mode === 'fast' ? 'fast' : 'normal',
        rawDuration: 4,
        renderEndTime: 6.4,
      },
    };
    const timing = source.resolveLineRenderTiming(value);
    assert.deepEqual(own.resolveLineRenderTiming(value), timing);
    for (let t = 1.8; t < 7.1; t += 0.031) {
      assert.deepEqual(
        own.getClassicLineEnvelope(t, value, timing),
        source.getClassicLineEnvelope(t, value, timing),
      );
      for (const word of value.words)
        for (const name of ['getWordStatus', 'getClassicGlowEnvelope', 'getClassicBodyMix'])
          assert.equal(own[name](t, timing, word), source[name](t, timing, word));
    }
  }
  assert.equal(own.buildDomTextShadow('#10f', 1.6, 20), source.buildDomTextShadow('#10f', 1.6, 20));
});
test('Cadenza property helpers match every Unicode17 codepoint without property regex at runtime', async () => {
  const { property } = await import(pathToFileURL(path.join(directory, 'unicode-properties.mjs')));
  const names = [
    'Arabic',
    'Emoji_Presentation',
    'Emoji_Modifier',
    'Extended_Pictographic',
    'Regional_Indicator',
  ];
  const regex = names.map(
    (name) => new RegExp('\\p{' + (name === 'Arabic' ? 'Script=Arabic' : name) + '}', 'u'),
  );
  for (let cp = 0; cp <= 0x10ffff; cp++)
    for (let n = 0; n < names.length; n++)
      assert.equal(
        property(cp, names[n]),
        regex[n].test(String.fromCodePoint(cp)),
        names[n] + ' U+' + cp.toString(16),
      );
});
test('Cadenza paused presentation still converges while lyric phases use sole supplied time', async () => {
  let motion = null;
  try {
    motion = await import(pathToFileURL(path.join(directory, 'motion.mjs')));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.ok(motion, 'Cadenza source frame interpolation is missing');
  const layout = prepare();
  const env = await import(pathToFileURL(path.join(directory, 'envelopes.mjs')));
  const p = layout.placements[0];
  const timing = env.resolveLineRenderTiming(line);
  const options = {
    time: 4,
    width: 900,
    height: 700,
    motionAmount: 1,
    animationIntensity: 'normal',
    energy: 0,
    dt: 1 / 60,
    motionEnabled: true,
  };
  let frame = motion.stepPlacement(null, p, 0, timing, options);
  assert.ok(frame.bodyAlpha > 0 && frame.bodyAlpha < 1);
  for (let i = 0; i < 100; i++) frame = motion.stepPlacement(frame, p, 0, timing, options);
  assert.ok(frame.bodyAlpha > 0.999);
  assert.equal(frame.status, env.getWordStatus(4, timing, p.word));
  const instant = motion.stepPlacement(null, p, 0, timing, { ...options, motionEnabled: false });
  assert.equal(instant.bodyAlpha, 1);
  assert.equal(instant.blur, 0);
  const halos = motion.halos('#00ff00', 1.6);
  assert.deepEqual(
    halos.map((h) => h.radius),
    [20, 20, 20],
  );
  assert.deepEqual(
    halos.map((h) => h.opacity),
    [0.98, 0.92, 0.35],
  );
});

test('Cadenza all eight frame channels match the actual source draw-loop oracle through paused seek retargets', async () => {
  const source = await sourceOracle();
  const motion = await import(pathToFileURL(path.join(directory, 'motion.mjs')));
  const layout = prepare();
  const timing = source.resolveLineRenderTiming(line);
  for (const intensity of ['calm', 'normal', 'chaotic'])
    for (const p of layout.placements) {
      let own = null,
        expected = null;
      for (let i = 0; i < 120; i++) {
        const time = i < 40 ? 3.8 : i < 80 ? 5.1 : 2.5;
        const options = {
          time,
          width: 900,
          height: 700,
          energy: (i % 7) / 6,
          motionAmount: 1.3,
          animationIntensity: intensity,
          dt: i === 0 ? 1 / 60 : [0.008, 0.05, 0.1, 0, 0.002][i % 5],
          motionEnabled: true,
          status: source.getWordStatus(time, timing, p.word),
        };
        own = motion.stepPlacement(own, p, 2, timing, options);
        expected = source.stepSource(expected, p, 2, timing, options);
        for (const key of [
          'x',
          'y',
          'rotation',
          'scale',
          'bodyAlpha',
          'blur',
          'activeMix',
          'glowAlpha',
        ])
          assert.equal(own[key], expected[key], key + ' ' + intensity + ' ' + i);
      }
    }
});
test('Cadenza entry multiplies mode font scale by shared lyrics font scale and retires beam', async () => {
  const motion = await import(pathToFileURL(path.join(directory, 'motion.mjs')));
  assert.equal(
    motion.settings({ cadenzaFontScale: 1.12, lyricsFontScale: 1.5, cadenzaBeamIntensity: 99 })
      .fontScale,
    1.12 * 1.5,
  );
  assert.equal(motion.settings({ cadenzaBeamIntensity: 99 }).beamIntensity, 0);
});
