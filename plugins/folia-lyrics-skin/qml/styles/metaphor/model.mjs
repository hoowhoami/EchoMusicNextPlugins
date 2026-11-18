// Native scene assembly derived from createMetaphorRuntime.ts, Folia 8006b40f; AGPL-3.0-only.
import {
  buildMetaphorTokens,
  buildMetaphorTextTokens,
  buildMetaphorLayout,
} from './source/metaphorLayout.mjs';
import { createVisualizerRng } from './source/visualizerSeedHash.mjs';
import {
  METAPHOR_EMPTY_STAGE,
  resolveMetaphorPose,
  resolveMetaphorStillPose,
  resolveMetaphorMelt,
  resolveMetaphorReveal,
} from './source/metaphorCamera.mjs';
import {
  findMetaphorCue,
  findMetaphorShot,
  resolveMetaphorCueTime,
} from './source/metaphorProgram.mjs';
import {
  layoutMetaphorNotes,
  planMetaphorBackdrop,
  planMetaphorFigures,
} from './source/metaphorFigures.mjs';
import { resolveMetaphorKeywordColor, resolveMetaphorPalette } from './source/metaphorPalette.mjs';
import { DEFAULT_METAPHOR_TUNING, METAPHOR_LIMITS } from './source/types.mjs';
import {
  prepareWordColorMatchers,
  buildWordColorRangesFromMatchers,
  resolveTokenColorMap,
} from './source/wordColoring.mjs';
import * as Shapes from './source/metaphorShapes.mjs';
export function tuning(settings) {
  const result = Object.assign({}, DEFAULT_METAPHOR_TUNING, { transitions: false });
  for (const key of Object.keys(METAPHOR_LIMITS)) {
    const input = settings['metaphor' + key[0].toUpperCase() + key.slice(1)];
    const limit = METAPHOR_LIMITS[key];
    if (Number.isFinite(input)) result[key] = Math.min(limit.max, Math.max(limit.min, input));
  }
  for (const key of ['negative', 'flip', 'keywordColors']) {
    const input = settings['metaphor' + key[0].toUpperCase() + key.slice(1)];
    if (typeof input === 'boolean') result[key] = input;
  }
  return result;
}
function keywordTints(tokens, theme, enabled) {
  const matchers = prepareWordColorMatchers(theme.wordColors || [], enabled);
  const ranges = buildWordColorRangesFromMatchers(tokens.map((t) => t.text).join(''), matchers);
  let offset = 0;
  const spans = tokens.map((t, index) => {
    const value = {
      key: String(index),
      timed: !t.space,
      startOffset: offset,
      endOffset: offset + t.text.length,
    };
    offset += t.text.length;
    return value;
  });
  const colors = resolveTokenColorMap(spans, ranges);
  return tokens.map((_, index) => colors.get(String(index)) || null);
}
function collisionTimes(cue, layout, rng) {
  if (cue.lineIndex >= 0) {
    const onsets = [...new Set(layout.words.map((w) => w.t0))].sort((a, b) => a - b);
    const first = Math.floor(rng() * Math.min(3, onsets.length));
    return onsets.filter((_, index) => index >= first && (index - first) % 3 === 0).slice(0, 3);
  }
  const result = [],
    end = cue.loop > 0 ? cue.start + cue.loop : cue.end;
  for (
    let at = cue.start + Shapes.METAPHOR_COLLISION_APPROACH;
    at < end - Shapes.METAPHOR_COLLISION_LIFE && result.length < 12;
    at += 5 + rng() * 4
  )
    result.push(at);
  return result;
}
export function buildSet(input, metrics) {
  const { cue, index, seed, tuning, theme, aspect } = input;
  const queries = new Set();
  const measure = (key) => {
    if (!Object.prototype.hasOwnProperty.call(metrics, key)) {
      queries.add(key);
      return 0.75;
    }
    return Math.max(0.2, metrics[key].width / 72);
  };
  const rng = createVisualizerRng(`metaphor:${seed}:${index}`);
  const tokens = input.line
    ? buildMetaphorTokens(input.line)
    : cue.text
      ? buildMetaphorTextTokens(cue.text, cue.start - 10)
      : [];
  const layout = tokens.some((token) => !token.space)
    ? buildMetaphorLayout({
        tokens,
        composition: cue.composition,
        measure,
        rng,
        tints: input.line ? keywordTints(tokens, theme, tuning.keywordColors) : undefined,
      })
    : { composition: 'block', glyphs: [], words: [], bounds: METAPHOR_EMPTY_STAGE };
  const interlude = cue.lineIndex < 0;
  const blobs = Shapes.planMetaphorShapes(layout.bounds, rng, tuning.blobs, interlude);
  const collisions = Shapes.planMetaphorCollisions(
    layout.bounds,
    rng,
    collisionTimes(cue, layout, rng),
    tuning.blobs,
    interlude,
  );
  const backdrop = planMetaphorBackdrop(layout.bounds, rng, tuning.blobs, interlude, {
    index: cue.lineIndex + 1,
    time: cue.singStart,
  });
  const figures = planMetaphorFigures(layout.bounds, rng, tuning.blobs, interlude, aspect);
  const shapes = Shapes.joinMetaphorShapes(backdrop.shapes, blobs, figures.shapes);
  const notes = layoutMetaphorNotes(backdrop.notes.concat(figures.notes), (char) =>
    measure('\u0001' + char),
  );
  const entries = layout.glyphs
    .map((g) => Object.assign({}, g, { key: g.char }))
    .concat(
      notes.map((n) => ({
        key: '\u0001' + n.char,
        x: n.x,
        y: n.y,
        size: n.size,
        rot: n.rot,
        t0: cue.start + n.born,
        t1: -100000,
        accent: false,
        tint: null,
        seed: rng(),
      })),
    );
  if (queries.size) return { queries: [...queries] };
  const keys = [...new Set(entries.map((g) => g.key))];
  if (keys.length > 128) throw new Error('Metaphor atlas exceeds 128 unique glyphs');
  const palette = resolveMetaphorPalette(theme, tuning.flip);
  const data = new Float32Array(Math.max(1, entries.length) * 12);
  entries.forEach((g, index) => {
    const tint = g.tint ? resolveMetaphorKeywordColor(g.tint, palette) : palette.accent;
    data.set(
      [
        g.x,
        g.y,
        g.size,
        g.rot,
        g.t0,
        g.t1,
        g.seed,
        g.accent ? 1 : 0,
        tint[0],
        tint[1],
        tint[2],
        keys.indexOf(g.key),
      ],
      index * 12,
    );
  });
  return { layout, shapes, collisions, entries, keys, glyphData: pack(data), palette, queries: [] };
}
export function pack(data) {
  const words = new Uint16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  // QV4 Function.apply needs an actual Array here; passing a TypedArray
  // produces zero words in the native QML path. Preserve every float bit.
  let result = '';
  for (let offset = 0; offset < words.length; offset += 4096)
    result += String.fromCharCode.apply(
      null,
      Array.prototype.slice.call(words.subarray(offset, offset + 4096)),
    );
  return result;
}
export function frame(model, program, index, time, aspect, tuning, still, audio, showText) {
  const cue = program.cues[index],
    local = resolveMetaphorCueTime(cue, time),
    shot = findMetaphorShot(cue, local);
  const pose = still
    ? resolveMetaphorStillPose(model.layout, aspect)
    : resolveMetaphorPose({
        shot,
        layout: model.layout,
        time: local,
        aspect,
        motion: tuning.cameraMotion,
      });
  const fluidTime = still ? cue.start : time;
  const data = new Float32Array(Shapes.METAPHOR_SHAPE_CAPACITY * Shapes.METAPHOR_SHAPE_STRIDE);
  let count = Shapes.writeMetaphorShapes(
    model.shapes,
    fluidTime,
    still ? 0 : audio,
    tuning.flow,
    data,
    still ? Infinity : time - cue.start,
  );
  if (!still) {
    if (showText) count = Shapes.writeMetaphorPairs(model.layout.glyphs, time, data, count);
    count = Shapes.writeMetaphorCollisions(model.collisions, local, data, count);
  }
  // Preserve the source's fixed-capacity instance texture. Only draw count
  // varies, so moving shapes update a retained GPU allocation each frame.
  const packed = new Float32Array(Shapes.METAPHOR_SHAPE_CAPACITY * 12);
  for (let i = 0; i < count; i++) packed.set(data.subarray(i * 10, i * 10 + 10), i * 12);
  return {
    camera: [pose.x, pose.y, pose.distance, pose.roll],
    shapeData: pack(packed),
    shapeCount: count,
    shapeCapacity: Shapes.METAPHOR_SHAPE_CAPACITY,
    time,
    fluidTime,
    shakeTime: Math.floor(fluidTime * 8) / 8,
    reveal: resolveMetaphorReveal(cue, time),
    melt: resolveMetaphorMelt(cue, time),
    pop: still ? 0 : 1,
    wobble: 0.05 * tuning.flow,
    flow: still ? tuning.flow * 0.5 : tuning.flow * (1 + audio * 0.6),
    grain: tuning.grain,
    dot: 7 * tuning.halftone,
    angle: still ? Math.PI / 6 : shot.screenAngle,
    invert: !still && shot.invert ? 1 : 0,
    seed: still ? 0.37 : shot.seed,
  };
}
export { findMetaphorCue };
