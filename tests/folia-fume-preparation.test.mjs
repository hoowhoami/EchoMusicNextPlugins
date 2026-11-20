import assert from 'node:assert/strict';
import test from 'node:test';
import * as Native from '../plugins/folia-lyrics-skin/qml/styles/fume/native-measure.mjs';
import * as Pretext from '../plugins/folia-lyrics-skin/qml/styles/fume/pretext.mjs';
import {
  articleContexts,
  blockContexts,
  batches,
  withUpcomingContexts,
  paintInstance,
} from '../plugins/folia-lyrics-skin/qml/styles/fume/frame.mjs';

test('Fume prepares static and printed contexts together without changing paint order', () => {
  const block = {
    id: 'row-1',
    variant: 'body',
    fontPx: 30,
    renderLines: [
      { text: '山河月光', segments: [{ text: '山河' }, { text: '月光' }] },
      { text: '山河', segments: [{ text: '山河' }] },
    ],
  };
  const plan = blockContexts(
    block,
    {
      theme: { fontFamily: 'Arial' },
      glowIntensity: 1,
      activeGlowBoost: 0.92,
      passedGlowBase: 0.62,
      minimumDeviceScale: 0.22,
    },
    2,
  );
  assert.equal(plan.size, 3);
  const paint = (key, text) => ({
    key,
    text,
    glyphKey: plan.get(text).key,
    contextGroup: plan.get(text).group,
  });
  const waiting = batches([paint('static', '山河月光')], true);
  const printed = [
    paint('glow0', '山河'),
    paint('glow1', '月光'),
    paint('body0', '山河'),
    paint('body1', '月光'),
  ];
  const active = batches(printed, true);
  assert.deepEqual(active.flat(), printed);
  assert.equal(active[0].contexts, waiting[0].contexts);
  assert.equal(active[0].key, waiting[0].key);
  const snapshot = JSON.stringify(active.map((group) => group.contexts));
  for (let i = 0; i < 120; ++i) {
    const repeated = batches(printed, true);
    assert.equal(JSON.stringify(repeated.map((group) => group.contexts)), snapshot);
    for (let j = 0; j < active.length; ++j) assert.equal(repeated[j].contexts, active[j].contexts);
  }
  const passed = batches([paint('passed', '山河月光')], true);
  assert.equal(passed[0].contexts, waiting[0].contexts);
});

test('newspaper overview packs adjacent paragraphs within native input limits', () => {
  const blocks = Array.from({ length: 80 }, (_, id) => ({
    id: 'line-' + id,
    line: { startTime: id * 4 },
    variant: 'body',
    fontPx: 24,
    renderLines: [
      {
        text: '山河 ' + id,
        segments: [{ text: '山' }, { text: '河' }, { text: ' ' }, { text: String(id) }],
      },
    ],
  }));
  const plans = articleContexts(blocks, {
    theme: { fontFamily: 'Arial' },
    glowIntensity: 1,
    activeGlowBoost: 0.92,
    passedGlowBase: 0.62,
    minimumDeviceScale: 0.22,
  });
  const commands = blocks.map((block) => {
    const context = plans[block.id].get(block.renderLines[0].text);
    return { key: block.id + ':static', contextGroup: { ...context.group }, glyphKey: context.key };
  });
  const groups = batches(commands, true);
  assert.ok(groups.length < 32);
  assert.deepEqual(groups.flat(), commands);
  for (const group of groups) {
    assert.ok(group.contexts.length <= 128);
    assert.ok(group.contexts.reduce((sum, value) => sum + value.text.length, 0) <= 8192);
  }
  assert.ok(plans['line-0'].has(' '));
  const visible = batches(commands.slice(0, 1), true);
  const warm = withUpcomingContexts(visible, blocks, plans, 240);
  assert.equal(warm[0], visible[0]);
  assert.ok(warm.slice(1).every((group) => group.prefetch && group.length === 0));
  assert.ok(warm.length > visible.length && warm.length <= 32);
});

test('Fume paint identity does not embed long lyrics or collide across source layers', () => {
  const command = { key: 'line:' + '山'.repeat(8192), layer: 'body', x: 123.125, y: -456.75 };
  const id = paintInstance(command, 0);
  assert.ok(id.length < 128);
  assert.equal(paintInstance({ ...command, key: 'changed text' }, 0), id);
  assert.notEqual(paintInstance({ ...command, layer: 'line-glow' }, 0), id);
  assert.notEqual(paintInstance(command, 1), id);
});

test('Fume reuses text analysis across font sizes while keeping exact metrics and invalidation', () => {
  const text = '山河 月光';
  const pieces = [
    { segment: '山河', index: 0, isWordLike: true },
    { segment: ' ', index: 2, isWordLike: false },
    { segment: '月光', index: 3, isWordLike: true },
  ];
  Native.configure({
    pieces: [{ text, pieces }],
    evaluator: (font, value) => Number(/ ([\d.]+)px /.exec(font)[1]) * value.length,
  });
  Pretext.clearCache();
  let calls = 0;
  const original = Native.portableWordSegmenter.segment;
  Native.portableWordSegmenter.segment = function (value) {
    ++calls;
    return original(value);
  };
  try {
    const small = Pretext.prepareWithSegments(text, '640 20px "sans"', { whiteSpace: 'pre-wrap' });
    const firstCalls = calls;
    assert.ok(firstCalls > 0);
    const large = Pretext.prepareWithSegments(text, '640 30px "sans"', { whiteSpace: 'pre-wrap' });
    assert.equal(calls, firstCalls);
    assert.equal(Pretext.measureNaturalWidth(large), Pretext.measureNaturalWidth(small) * 1.5);
    Pretext.clearCache();
    const uncached = Pretext.prepareWithSegments(text, '640 30px "sans"', {
      whiteSpace: 'pre-wrap',
    });
    assert.deepEqual(large, uncached);
    assert.ok(calls > firstCalls);
  } finally {
    Native.portableWordSegmenter.segment = original;
    Pretext.clearCache();
    Native.configure({ pieces: [] });
  }
});

test('font-independent caches preserve RTL, CJK, emoji and combining layouts across exact font changes', () => {
  const texts = [
    'שלום עולם 12 office ffi',
    'السَّلَامُ عَلَيْكُم 12-34',
    'á 👨‍👩‍👧‍👦 🇨🇳 १२३.४५',
    '日本語（句読点）と月光。',
    '__proto__ constructor',
  ];
  const segmenter = new Intl.Segmenter('und', { granularity: 'word' });
  for (const text of texts) {
    Native.configure({
      pieces: [{ text, pieces: Array.from(segmenter.segment(text)) }],
      evaluator: (font, value) => Number(/ ([\d.]+)px /.exec(font)[1]) * [...value].length * 0.61,
    });
    Pretext.clearCache();
    const fonts = [20, 25.375, 48, 37.125].map((size) => `640 ${size}px "sans"`);
    const cached = fonts.map((font) =>
      Pretext.prepareWithSegments(text, font, { whiteSpace: 'pre-wrap' }),
    );
    for (let i = 0; i < fonts.length; ++i) {
      Pretext.clearCache();
      const independent = Pretext.prepareWithSegments(text, fonts[i], { whiteSpace: 'pre-wrap' });
      assert.deepEqual(cached[i], independent);
      for (const width of [30, 97.5, 400])
        assert.deepEqual(
          Pretext.layoutWithLines(cached[i], width, 24),
          Pretext.layoutWithLines(independent, width, 24),
        );
    }
  }
  Pretext.clearCache();
  Native.configure({ pieces: [] });
  Native.clearGraphemeCache();
});

test('an exact zero width is reused rather than rediscovered as missing', () => {
  const font = '640 20px "sans"',
    text = '\u200b';
  Native.configure({
    pieces: [],
    discovery: true,
    measurements: [{ key: Native.metricKey(font, text), width: 0 }],
  });
  Native.getMeasureContext().font = font;
  assert.equal(Native.getMeasureContext().measureText(text).width, 0);
  assert.deepEqual(Native.pendingMeasurements(), []);
  Native.configure({ pieces: [] });
});

test('retained Fume paints keep native pose identity through repeated batching', async () => {
  const { batches } = await import('../plugins/folia-lyrics-skin/qml/styles/fume/frame.mjs');
  const commands = Array.from({ length: 33 }, (_, i) =>
    Object.freeze({
      key: `waiting-${i}`,
      text: '山河 月光',
      size: 40,
      weight: 600,
      maximumShadowBlur: 20,
      minimumDeviceScale: 1,
      retainedPose: true,
      style: Object.freeze({ fill: 'white', alpha: 1, shadow: 'white', blur: 20 }),
    }),
  );
  const first = batches(commands, true);
  const originalValues = JSON.parse(JSON.stringify(first));
  for (let frame = 0; frame < 120; ++frame) {
    const next = batches(commands, true);
    assert.deepEqual(next, originalValues);
    for (let group = 0; group < next.length; ++group)
      for (let index = 0; index < next[group].length; ++index)
        assert.equal(next[group][index], first[group][index]);
  }
  assert.deepEqual(
    first.map((group) => group.length),
    [16, 16, 1],
  );
  assert.equal(commands[0].maxHaloRadius, undefined);
});

test('Fume halo budget changes invalidate retained views without mutating prior poses', async () => {
  const { batches } = await import('../plugins/folia-lyrics-skin/qml/styles/fume/frame.mjs');
  const source = Object.freeze({
    key: 'passed',
    text: '月光',
    size: 40,
    weight: 600,
    maximumShadowBlur: 20,
    minimumDeviceScale: 1,
    retainedPose: true,
  });
  const glowing = batches([source], true)[0][0];
  const plain = batches([source], false)[0][0];
  assert.notEqual(plain, glowing);
  assert.equal(glowing.maxHaloRadius, 40);
  assert.equal(plain.maxHaloRadius, 0);
  assert.equal(batches([source], false)[0][0], plain);
  assert.deepEqual(batches([source], true)[0][0], glowing);
  const replacement = { ...source, x: 90 };
  const moved = batches([replacement], true)[0][0];
  assert.notEqual(moved, glowing);
  assert.equal(moved.x, 90);
  assert.equal(glowing.x, undefined);
});
