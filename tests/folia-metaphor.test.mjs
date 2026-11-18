import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileMetaphorProgram,
  findMetaphorCue,
  findMetaphorShot,
  resolveMetaphorCueTime,
} from '../plugins/folia-lyrics-skin/qml/styles/metaphor/source/metaphorProgram.mjs';
import {
  buildMetaphorLayout,
  buildMetaphorTokens,
} from '../plugins/folia-lyrics-skin/qml/styles/metaphor/source/metaphorLayout.mjs';
import {
  resolveMetaphorPose,
  resolveMetaphorStillPose,
} from '../plugins/folia-lyrics-skin/qml/styles/metaphor/source/metaphorCamera.mjs';
import * as shapes from '../plugins/folia-lyrics-skin/qml/styles/metaphor/source/metaphorShapes.mjs';
import {
  planMetaphorFigures,
  planMetaphorBackdrop,
} from '../plugins/folia-lyrics-skin/qml/styles/metaphor/source/metaphorFigures.mjs';
import { createVisualizerRng } from '../plugins/folia-lyrics-skin/qml/styles/metaphor/source/visualizerSeedHash.mjs';
const line = {
  fullText: '晚风 star',
  startTime: 1,
  endTime: 5,
  words: [
    { text: '晚', startTime: 1, endTime: 2 },
    { text: '风', startTime: 2, endTime: 3 },
    { text: ' ', startTime: 3, endTime: 3 },
    { text: 'star', startTime: 3, endTime: 5 },
  ],
  autoWordSegments: ['晚风', ' ', 'star'],
};
const options = {
  seed: 'authored',
  title: '原生',
  cutPace: 1,
  negative: true,
  transitions: false,
  intensity: 'normal',
};
test('Metaphor program preserves source indices and deterministic cue/shot selection across seeks', () => {
  const lines = [
    line,
    {
      ...line,
      startTime: 9,
      endTime: 13,
      words: line.words.map((w) => ({ ...w, startTime: w.startTime + 8, endTime: w.endTime + 8 })),
    },
  ];
  const program = compileMetaphorProgram(lines, options);
  assert.deepEqual(program, compileMetaphorProgram(lines, options));
  assert.ok(program.cues.some((c) => c.lineIndex === 0));
  assert.ok(program.cues.some((c) => c.lineIndex === 1));
  for (const time of [0, 1, 4.999, 9, 12, 720, 72000, 4, 1]) {
    const cue = program.cues[findMetaphorCue(program, time)];
    const local = resolveMetaphorCueTime(cue, time);
    const shot = findMetaphorShot(cue, local);
    assert.ok(shot && shot.end > shot.start);
    assert.equal(cue.transition, 'cut');
  }
});
for (const composition of ['block', 'stair', 'hero', 'column', 'scatter', 'justify'])
  test(`Metaphor ${composition} keeps timing and finite camera/geometry`, () => {
    const tokens = buildMetaphorTokens(line);
    assert.equal(
      tokens
        .flatMap((t) => t.chars)
        .map((c) => c.char)
        .join(''),
      line.fullText,
    );
    const layout = buildMetaphorLayout({
      tokens,
      composition,
      measure: () => 0.75,
      rng: createVisualizerRng('layout'),
    });
    assert.equal(layout.glyphs.length, 6);
    assert.ok(
      layout.glyphs.every((g) => Number.isFinite(g.x) && Number.isFinite(g.y) && g.t1 >= g.t0),
    );
    const cue = compileMetaphorProgram([line], options).cues.find((c) => c.lineIndex === 0);
    for (const aspect of [0.5, 1, 2.5])
      for (const motion of [0, 1, 2])
        for (const time of [1, 2, 4.9]) {
          const pose = resolveMetaphorPose({
            shot: findMetaphorShot(cue, time),
            layout,
            time,
            aspect,
            motion,
          });
          assert.ok(Object.values(pose).every(Number.isFinite));
          assert.ok(pose.distance > 0);
          assert.ok(resolveMetaphorStillPose(layout, aspect).distance > 0);
        }
    const rng = createVisualizerRng('figures');
    const planned = shapes.joinMetaphorShapes(
      planMetaphorBackdrop(layout.bounds, rng, 2, false, { index: 1, time: 1 }).shapes,
      shapes.planMetaphorShapes(layout.bounds, rng, 2, false),
      planMetaphorFigures(layout.bounds, rng, 2, false, 1.6).shapes,
    );
    const collisions = shapes.planMetaphorCollisions(layout.bounds, rng, [1, 3], 2, false);
    for (const time of [-1, 0, 1, 2, 5, 20]) {
      const data = new Float32Array(shapes.METAPHOR_SHAPE_CAPACITY * shapes.METAPHOR_SHAPE_STRIDE);
      let count = shapes.writeMetaphorShapes(planned, time, 0.5, 2, data, 10);
      count = shapes.writeMetaphorPairs(layout.glyphs, time, data, count);
      count = shapes.writeMetaphorCollisions(collisions, time, data, count);
      assert.ok(count <= shapes.METAPHOR_SHAPE_CAPACITY);
      assert.ok(data.every(Number.isFinite));
    }
  });
test('Metaphor Unicode 17 lyric classification retains non-Latin letters and numbers', () => {
  for (const text of ['晚風', 'עברית', 'العربية', 'ภาษาไทย', '𠀀', '𝟘']) {
    const candidate = { ...line, fullText: text };
    assert.ok(
      compileMetaphorProgram([candidate], options).cues.some((cue) => cue.lineIndex === 0),
      text,
    );
  }
  for (const text of ['😀', '。。。', '   ']) {
    assert.ok(
      compileMetaphorProgram([{ ...line, fullText: text }], options).cues.every(
        (cue) => cue.lineIndex === -1,
      ),
      text,
    );
  }
});
test('Metaphor actual worker compile protocol forwards options without browser state', async () => {
  const result = [];
  const prior = globalThis.WorkerScript;
  globalThis.WorkerScript = { sendMessage: (value) => result.push(value) };
  try {
    await import('../plugins/folia-lyrics-skin/qml/styles/metaphor/worker.mjs');
    globalThis.WorkerScript.onMessage({
      phase: 'compile',
      request: 7,
      trackRevision: 'fixture',
      seed: 'authored',
      lines: [line],
      options,
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].error, undefined);
    const reply = JSON.parse(result[0].payload);
    assert.equal(reply.phase, 'program');
    assert.ok(reply.program.cues.some((c) => c.lineIndex === 0));
    assert.deepEqual(reply.lines, [line]);
  } finally {
    globalThis.WorkerScript = prior;
  }
});
