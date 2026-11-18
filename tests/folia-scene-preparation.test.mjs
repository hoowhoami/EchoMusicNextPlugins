import assert from 'node:assert/strict';
import test from 'node:test';
import { measureArticleBatch } from '../plugins/folia-lyrics-skin/qml/shared/article-measure.mjs';
import { createNativeSceneJob } from '../plugins/folia-lyrics-skin/qml/shared/nativeSceneJob.mjs';
import * as Native from '../plugins/folia-lyrics-skin/qml/styles/lumiere/native-measure.mjs';

test('retained scenes resolve exact font measurements without rebuilding their world', () => {
  let constructed = 0,
    refreshed = 0,
    destroyed = 0;
  const factory = () => {
    ++constructed;
    return {
      frame() {
        const context = Native.getMeasureContext();
        context.font = '600 100px "sans-serif"';
        return { width: context.measureText('山河').width };
      },
      refreshMeasurements() {
        ++refreshed;
      },
      destroy() {
        ++destroyed;
      },
    };
  };
  const job = createNativeSceneJob({ runtime: true, options: {} }, factory, factory);
  const first = job.run();
  assert.equal(first.phase, 'measure');
  assert.equal(destroyed, 0);
  const metrics = first.measurements.map((query) => ({
    ...query,
    advance: 200,
    inkLeft: 0,
    inkRight: 200,
    inkTop: -90,
    inkBottom: 10,
    emAscent: 90,
    emDescent: 10,
  }));
  const final = job.run({ measurements: metrics });
  assert.equal(final.phase, 'frame');
  assert.equal(final.frame.width, 200);
  assert.equal(constructed, 1);
  assert.equal(refreshed, 1);
  assert.equal(destroyed, 0);
  job.destroy();
  assert.equal(destroyed, 1);
  assert.throws(() => job.frame(1), /released/);
});

test('new lyrics can discover metrics across the lifetime of a retained scene', () => {
  const factory = () => ({
    frame(time) {
      const context = Native.getMeasureContext();
      context.font = '600 100px "sans-serif"';
      return { width: context.measureText(`歌词 ${time}`).width };
    },
    refreshMeasurements() {},
    destroy() {},
  });
  const job = createNativeSceneJob({ runtime: true, options: {} }, factory, factory);
  job.run();
  for (let time = 0; time < 80; time++) {
    const discovery = job.frame(time);
    assert.equal(discovery.phase, 'measure');
    const resolved = job.run({
      measurements: discovery.measurements.map((query) => ({
        ...query,
        advance: 200,
        inkLeft: 0,
        inkRight: 200,
        inkTop: -90,
        inkBottom: 10,
        emAscent: 90,
        emDescent: 10,
      })),
    });
    assert.deepEqual(resolved, { phase: 'frame', frame: { width: 200 } });
  }
  job.destroy();
});

test('one ICU round collects every missing text and withholds provisional scenes', () => {
  const texts = ['山河', '月光'];
  const factory = () => ({
    frame: () => texts.map((text) => Native.portableWordSegmenter.segment(text)),
    destroy() {},
  });
  const job = createNativeSceneJob({ runtime: true, options: {} }, factory, factory, true);
  const discovered = job.run();
  assert.equal(discovered.phase, 'measure');
  assert.deepEqual(discovered.texts, texts);
  assert.equal(discovered.frame, undefined);
  const pieces = texts.map((text) => ({
    text,
    pieces: [...text].map((segment, index) => ({ segment, index, isWordLike: true })),
  }));
  const published = job.run({ pieces });
  assert.deepEqual(published, { phase: 'frame', frame: pieces.map((row) => row.pieces) });
  job.destroy();
});

test('article shaping batches publish only the current generation and the requested measurements', () => {
  let reads = 0;
  const item = {
    get metrics() {
      ++reads;
      return this.runs.map(({ key }) => ({
        key,
        advance: 5,
        width: 9,
        inkLeft: 2,
        inkRight: 7,
        inkTop: 1,
        inkBottom: 6,
        baseline: 4,
        height: 8,
      }));
    },
  };
  const queries = Array.from({ length: 65 }, (_, i) => ({
    key: 'q' + i,
    text: '文',
    size: 14,
    weight: 400,
  }));
  const first = measureArticleBatch(item, queries, 0, 3, false);
  assert.equal(first.length, 64);
  assert.deepEqual(first[63], { key: 'q63', width: 5 });
  const [last] = measureArticleBatch(item, queries, 64, 3, true);
  assert.deepEqual(last, {
    key: 'q64',
    width: 9,
    advance: 5,
    inkLeft: 2,
    inkRight: 7,
    inkTop: 1,
    inkBottom: 6,
    height: 8,
    baseline: 4,
  });
  assert.equal(reads, 2);
  assert.throws(
    () => measureArticleBatch({ metrics: [{ key: 'stale', advance: 1 }] }, queries, 64, 4, false),
    /match/,
  );
});
