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
