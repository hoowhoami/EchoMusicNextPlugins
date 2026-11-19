import assert from 'node:assert/strict';
import test from 'node:test';
import * as Native from '../plugins/folia-lyrics-skin/qml/styles/fume/native-measure.mjs';
import * as Pretext from '../plugins/folia-lyrics-skin/qml/styles/fume/pretext.mjs';

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
