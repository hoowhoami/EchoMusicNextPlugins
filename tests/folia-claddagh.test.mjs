import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ring from '../plugins/folia-lyrics-skin/qml/styles/claddagh/kernel.mjs';

test('Claddagh keeps source indices and ignores unprepared holes in focus/window lookup', () => {
  const ready = [];
  for (const index of [49, 50, 52])
    ready[index] = { line: { sourceIndex: index, startTime: index * 4, endTime: index * 4 + 3 } };
  assert.equal(ring.focusIndex(ready, -1, 199.1), 49);
  assert.equal(ring.focusIndex(ready, -1, 195), -1);
  assert.equal(ring.focusIndex(ready, -1, 1000), 52);
  assert.deepEqual(ring.windowIndices(50, ready.length, ready), [49, 50, 52]);
  delete ready[50];
  assert.equal(ring.focusIndex(ready, 50, 200), 50);
  assert.deepEqual(ring.windowIndices(50, ready.length, ready), [49, 52]);
  assert.deepEqual(ring.windowIndices(0, ready.length, ready), []);
  assert.equal(ring.focusIndex([], 50, 200), 50);
  assert.equal(ring.nextPreparedLine(ready, 49), ready[52].line);
});

test('Claddagh recent completed focus uses raw endTime, independent of render tail hints', () => {
  const ready = [
    { line: { startTime: 0, endTime: 1, renderHints: { renderEndTime: 1.36 } } },
    { line: { startTime: 3, endTime: 4 } },
  ];
  assert.equal(ring.focusIndex(ready, -1, 1.1), 0);
  assert.equal(ring.focusIndex(ready, -1, 1), -1); // Reference runtime uses strict > raw end.
  assert.equal(ring.renderEnd(ready[0].line, ready[1].line), 2.66);
});

test('Claddagh timing metadata distinguishes distant next, confirmed tail and not-ready', () => {
  const line = { startTime: 0, endTime: 4, renderHints: { renderEndTime: 4.3 } };
  assert.equal(typeof ring.resolvedRenderEnd, 'function');
  assert.equal(ring.resolvedRenderEnd(line, 49, { 49: 100 }, null), 99.66);
  assert.equal(ring.resolvedRenderEnd(line, 49, { 49: null }, null), 14);
  assert.equal(ring.resolvedRenderEnd(line, 49, {}, { startTime: 12 }), 4.3);
  assert.equal(ring.resolvedRenderEnd(line, 49, undefined, { startTime: 12 }), 11.66);
  assert.equal(ring.resolvedRenderEnd(line, 49, undefined, null), 4.3);
});

test('Claddagh normalized PCM, 8-bit color and keyword dictionaries preserve actual domains', () => {
  assert.equal(typeof ring.normalizedPower, 'function');
  assert.equal(ring.normalizedPower(0.5), 0.5);
  assert.equal(ring.normalizedPower(255), 1); // Out-of-domain normalized values clamp; no raw-scale guess.
  assert.equal(ring.normalizedPower(NaN), 0);
  assert.equal(ring.mixColor('#000', '#fff', 0.5).r, 128 / 255);
  const ranges = ring.wordColorRanges('constructor __proto__', [
    { word: 'constructor __proto__', color: '#ff0000' },
  ]);
  assert.deepEqual(
    ranges.map((range) => range.color),
    ['#ff0000', '#ff0000'],
  );
});

test('Claddagh whole-scene presentation follows the source .8s cubic rather than playback', () => {
  assert.equal(typeof ring.presentationPose, 'function');
  assert.deepEqual(ring.presentationPose(0, false), {
    opacity: 0,
    scale: 0.96,
    blur: 4,
    finished: false,
  });
  assert.deepEqual(ring.presentationPose(0.8, false), {
    opacity: 1,
    scale: 1,
    blur: 0,
    finished: true,
  });
  assert.deepEqual(ring.presentationPose(0.8, true), {
    opacity: 0,
    scale: 1.04,
    blur: 4,
    finished: true,
  });
  const interrupted = ring.presentationPose(0, true, { opacity: 0.6, scale: 0.98, blur: 2 });
  assert.equal(interrupted.opacity, 0.6);
  assert.equal(interrupted.scale, 0.98);
  // Captured from the actual reference motion-utils 13.3.0 cubicBezier(.16,1,.3,1).
  for (const [elapsed, expected] of [
    [0.08, 0.4944415455829585],
    [0.2, 0.8254750452324515],
    [0.4, 0.9717824361432577],
    [0.6, 0.9976701946143294],
  ])
    assert.ok(Math.abs(ring.presentationPose(elapsed, false).opacity - expected) < 1e-12);
});

test('Claddagh zero-duration gaps borrow time without mutating source', () => {
  const source = [
    { char: 'A', startTime: 0, endTime: 0.2 },
    { char: ' ', startTime: 0.2, endTime: 0.2 },
    { char: 'B', startTime: 0.2, endTime: 0.4 },
  ];
  const copy = structuredClone(source);
  const adjusted = ring.adjustTimeline(source, { startTime: 0, endTime: 0.4 });
  assert.deepEqual(source, copy);
  assert.ok(Math.abs(adjusted[1].endTime - adjusted[1].startTime - 0.06) < 1e-12);
  assert.ok(adjusted[0].endTime - adjusted[0].startTime >= 0.04);
  assert.ok(adjusted[2].endTime - adjusted[2].startTime >= 0.04);
});

test('Claddagh limits arc span, preserves UTF16/cluster mapping and actual advances', () => {
  const timeline = [
    { char: 'A', startTime: 0, endTime: 1 },
    { char: '👩‍🚀', startTime: 1, endTime: 2 },
    { char: 'é', startTime: 2, endTime: 3 },
  ];
  const metric = {
    baseline: 50,
    height: 70,
    graphemes: [
      { start: 0, length: 1, x: 0, advance: 100, clusterStart: 0 },
      { start: 1, length: 5, x: 100, advance: 80, clusterStart: 1 },
      { start: 6, length: 2, x: 180, advance: 10, clusterStart: 6 },
    ],
  };
  const spacing = ring.buildSpacing(timeline, metric, 72, 100, 0.65, 2);
  assert.deepEqual(
    spacing.map((item) => item.start),
    [0, 1, 6],
  );
  assert.deepEqual(
    spacing.map((item) => item.clusterStart),
    [0, 1, 6],
  );
  assert.ok(
    spacing[1].nominalAngle - spacing[0].nominalAngle >
      spacing[2].nominalAngle - spacing[1].nominalAngle,
  );
  const long = ring.buildSpacing(timeline, metric, 72, 1, 0.65, 20);
  assert.ok(long.every((item) => item.scaleFactor <= 1));
  assert.ok(long.at(-1).nominalAngle - long[0].nominalAngle <= 4.25);
});

test('Claddagh line clock interpolates starts and drifts through instrumental tail', () => {
  const spacing = [
    { startTime: 1, endTime: 2, nominalAngle: -1 },
    { startTime: 2, endTime: 3, nominalAngle: 0 },
    { startTime: 3, endTime: 4, nominalAngle: 1 },
  ];
  assert.equal(ring.wordOffset(spacing, 1.5, 10), -0.5);
  assert.equal(ring.wordOffset(spacing, 10, 10), 3);
  assert.ok(ring.wordOffset(spacing, 8, 10) > ring.wordOffset(spacing, 5, 10));
  assert.equal(ring.renderEnd({ startTime: 0, endTime: 4 }, { startTime: 12 }), 11.66);
  assert.equal(ring.renderEnd({ startTime: 0, endTime: 4 }, null), 14);
  assert.equal(ring.shouldHoldReset(12, 0, 4), true);
  assert.equal(ring.shouldHoldReset(12, 0, 0), false);
});

test('Claddagh index window, spring continuity and discontinuous seeks match source', () => {
  assert.deepEqual(ring.windowIndices(3, 10), [2, 3, 4, 5]);
  let state = ring.createSpring(1);
  state = ring.retargetSpring(state, 2, true);
  assert.equal(state.value, Math.PI);
  const one = ring.stepSpring(state, 0.016);
  assert.ok(one.value > Math.PI && one.value < 2 * Math.PI);
  const two = ring.stepSpring(one, 0.016);
  const combined = ring.stepSpring(state, 0.032);
  assert.ok(Math.abs(two.value - combined.value) < 1e-10);
  const seek = ring.retargetSpring(two, 7, true);
  assert.equal(seek.value, 7 * Math.PI);
  assert.equal(seek.velocity, 0);
});

test('Claddagh real ellipse has .09 minor axis and source depth/focus pose', () => {
  const settings = ring.resolveSettings({});
  const base = {
    lineIndex: 0,
    centerIndex: 0,
    lineOffset: 0,
    wordOffset: 0,
    radius: 400,
    width: 1000,
    height: 700,
    fontPx: 72,
    power: 0,
    chorus: false,
    currentLength: 4,
    targetLength: 4,
    time: 0.5,
    settings,
    primary: '#ffffff',
    accent: '#00ff00',
  };
  const front = ring.glyphFrame(
    { nominalAngle: 0, startTime: 0, endTime: 1, scaleFactor: 1, index: 0 },
    base,
  );
  assert.ok(Math.abs(Math.hypot(front.x - 500, front.y - 350) - 36) < 1e-9);
  assert.equal(front.depth, 1);
  assert.equal(front.focus, 1);
  assert.ok(Math.abs(front.scale - 1.98) < 1e-12);
  assert.equal(front.blur, 0);
  const back = ring.glyphFrame(
    { nominalAngle: Math.PI, startTime: 0, endTime: 1, scaleFactor: 1, index: 1 },
    base,
  );
  assert.equal(back.depth, 0);
  assert.equal(back.blur, 8);
  assert.equal(back.scale, 0.22);
  assert.ok(back.opacity < front.opacity);
});

test('Claddagh real chorus halo radii retain large source bloom and exact fade', () => {
  const params = {
    lineIndex: 0,
    centerIndex: 0,
    lineOffset: 0,
    wordOffset: 0,
    radius: 400,
    width: 1000,
    height: 700,
    fontPx: 72,
    power: 1,
    chorus: true,
    currentLength: 4,
    targetLength: 4,
    time: 0.000001,
    settings: ring.resolveSettings({}),
    primary: '#ffffff',
    accent: '#00ff00',
  };
  const frame = ring.glyphFrame(
    { nominalAngle: 0, startTime: 0, endTime: 1, scaleFactor: 1, index: 0 },
    params,
  );
  assert.equal(frame.halos.length, 3);
  assert.ok(frame.halos[2].radius > 158 && frame.halos[2].radius <= 158.4);
  assert.ok(Math.abs(frame.halos[0].radius / frame.halos[1].radius - 0.35) < 1e-12);
  assert.ok(Math.abs(frame.halos[2].radius / frame.halos[1].radius - 1.6) < 1e-12);
});

test('Claddagh center-pivot CSS poses compensate the native baseline pivot', () => {
  const frame = { x: 500, y: 350, scale: 1.98, rotation: -38 };
  const item = { nativeX: 43, baseline: 62, height: 84 };
  const pose = ring.nativePose(frame, item);
  const angle = (frame.rotation * Math.PI) / 180;
  const dy = (item.height / 2 - item.baseline) * frame.scale;
  const centerX = item.nativeX + pose.x - Math.sin(angle) * dy;
  const centerY = item.baseline + pose.y + Math.cos(angle) * dy;
  assert.ok(Math.abs(centerX - frame.x) < 1e-9);
  assert.ok(Math.abs(centerY - frame.y) < 1e-9);
});

test('Claddagh keyword ranges preserve source CJK phrase priority and Latin word boundaries', () => {
  const ranges = ring.wordColorRanges('海边的海海边 OFFICE official', [
    { word: '海', color: '#ff0000' },
    { word: '海边', color: '#00ff00' },
    { word: 'office', color: '#0000ff' },
  ]);
  assert.deepEqual(
    ranges.map((item) => [item.start, item.end]),
    [
      [0, 2],
      [3, 4],
      [4, 6],
      [7, 13],
    ],
  );
  assert.deepEqual(
    ranges.map((item) => item.color),
    ['#00ff00', '#ff0000', '#00ff00', '#0000ff'],
  );
});
