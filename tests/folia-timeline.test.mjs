import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTimelineIndex,
  timelineState,
} from '../plugins/folia-lyrics-skin/qml/shared/timelineIndex.mjs';

test('active selection matches Folia latest still-active line through gaps, overlap, micro and reverse seek', () => {
  const lines = [
    { startTime: 0, endTime: 100, words: [] },
    { startTime: 1, endTime: 1.2, words: [] },
    { startTime: 2, endTime: 2.02, words: [] },
    { startTime: 110, endTime: 111, words: [] },
  ];
  const index = buildTimelineIndex(lines);
  assert.equal(timelineState(index, 1.1).activeIndex, 1);
  assert.equal(timelineState(index, 1.7).activeIndex, 0);
  assert.equal(timelineState(index, 2.05).activeIndex, 2);
  assert.equal(timelineState(index, 2.1).activeIndex, 0);
  assert.equal(timelineState(index, 102).activeIndex, -1);
  assert.equal(timelineState(index, 102).recentIndex, 2);
  assert.equal(timelineState(index, -1).recentIndex, -1);
  assert.equal(timelineState(index, 1.1).activeIndex, 1);
  assert.deepEqual(timelineState(index, 1.1).nextIndices, [2, 3]);
});

test('filtered lines never enter presentation and source indices remain stable', () => {
  const index = buildTimelineIndex([
    { sourceIndex: 0, startTime: 0, endTime: 2, words: [] },
    { sourceIndex: 1, startTime: 0.5, endTime: 3, words: [], filtered: true },
    { sourceIndex: 2, startTime: 1, endTime: 4, words: [] },
  ]);
  assert.equal(timelineState(index, 0.7).activeIndex, 0);
  assert.deepEqual(timelineState(index, 0.7).nextIndices, [2]);
  assert.equal(timelineState(index, 2).activeIndex, 2);
  assert.deepEqual(index.nextStartBySourceIndex, { 0: 1, 2: null });
});

test('next start metadata distinguishes a distant filtered successor from the confirmed final line', () => {
  const index = buildTimelineIndex([
    { sourceIndex: 4, startTime: 0, endTime: 1, words: [] },
    ...Array.from({ length: 40 }, (_, i) => ({
      sourceIndex: i + 5,
      startTime: 2,
      endTime: 3,
      words: [],
      filtered: true,
    })),
    { sourceIndex: 45, startTime: 100, endTime: 102, words: [] },
  ]);
  assert.equal(index.nextStartBySourceIndex[4], 100);
  assert.equal(index.nextStartBySourceIndex[45], null);
  assert.equal(index.nextStartBySourceIndex[8], undefined);
});

test('compact track metadata preserves raw and render timing, Unicode scalar counts and missing agents', () => {
  const source = [
    { sourceIndex: 3, fullText: '海👩🏽‍🚀', startTime: 1, endTime: 1.02, words: [] },
    { sourceIndex: 5, fullText: '......', startTime: 2, endTime: 5, words: [], agentId: 'duet' },
    { sourceIndex: 8, fullText: '海 \t\u00a0👩🏽‍🚀', startTime: 6, endTime: 7, words: [] },
  ];
  const index = buildTimelineIndex(source);
  const first = index.metadataBySourceIndex[3];
  assert.equal(first.sourceIndex, 3);
  assert.equal(first.codepointCount, 5);
  assert.equal(first.compactCodepointCount, 5);
  assert.equal(first.endTime, 1.02);
  assert.equal(first.renderEndTime, 1.067);
  assert.equal(first.timingClass, 'micro');
  assert.equal(Object.hasOwn(first, 'agentId'), false);
  assert.equal(Object.hasOwn(first, 'fullText'), false);
  assert.equal(index.lineMetadata[1].isInterlude, true);
  assert.equal(index.lineMetadata[1].agentId, 'duet');
  assert.equal(index.metadataBySourceIndex[8].compactCodepointCount, 5);
  assert.equal(index.metadataBySourceIndex[8].codepointCount, 8);
  assert.equal(source[0].fullText, '海👩🏽‍🚀');
});

test('timing tree agrees with the exact source reverse scan on large overlapping tracks', () => {
  const lines = Array.from({ length: 20000 }, (_, sourceIndex) => ({
    sourceIndex,
    startTime: sourceIndex * 0.2,
    endTime: sourceIndex * 0.2 + (sourceIndex % 127 === 0 ? 200 : 0.03),
    words: [],
  }));
  const index = buildTimelineIndex(lines);
  for (let query = 0; query < 1000; ++query) {
    const time = ((query * 7919) % 42000) / 10;
    let expected = -1;
    for (let i = lines.length - 1; i >= 0; --i) {
      if (time >= lines[i].startTime && time <= index.ends[i]) {
        expected = i;
        break;
      }
    }
    assert.equal(timelineState(index, time).activeIndex, expected, `time ${time}`);
  }
});
