// Copyright (c) 2026 chthollyphile. Derived from Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935; AGPL-3.0-only.
// Source: src/components/visualizer/metaphor/metaphorCamera.ts
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { METAPHOR_TAIL } from './metaphorProgram.mjs';
const METAPHOR_FOV = 30;
const METAPHOR_EMPTY_STAGE = { x0: -4.5, y0: -2.6, x1: 4.5, y1: 2.6 };
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const easeOutCubic = (u) => 1 - (1 - u) ** 3;
const rectFocus = (rect) => ({
  x: (rect.x0 + rect.x1) / 2,
  y: (rect.y0 + rect.y1) / 2,
  width: Math.max(1.6, rect.x1 - rect.x0),
  height: Math.max(1.2, rect.y1 - rect.y0),
});
const wordIndexAt = (layout, time) => {
  let found = 0;
  let latest = Number.NEGATIVE_INFINITY;
  layout.words.forEach((word, index) => {
    if (word.t0 <= time && word.t0 >= latest) {
      latest = word.t0;
      found = index;
    }
  });
  return found;
};
const emptyFocus = (bounds, seed) => {
  const width = bounds.x1 - bounds.x0;
  const height = bounds.y1 - bounds.y0;
  return {
    x: bounds.x0 + width * (0.2 + 0.6 * seed),
    y: bounds.y0 + height * (0.2 + 0.6 * ((seed * 7.31) % 1)),
    width: width * 0.3,
    height: height * 0.3,
  };
};
const wordFocus = (layout, time, seed) =>
  layout.words.length === 0
    ? emptyFocus(layout.bounds, seed)
    : rectFocus(layout.words[wordIndexAt(layout, time)]);
const glyphAt = (layout, time) => {
  let found = layout.glyphs[0];
  for (const glyph of layout.glyphs) {
    if (glyph.t0 <= time && glyph.t0 >= found.t0) found = glyph;
  }
  return found;
};
const glyphFocus = (layout, time, seed) => {
  if (layout.glyphs.length === 0) return emptyFocus(layout.bounds, seed);
  const found = glyphAt(layout, time);
  return { x: found.x, y: found.y, width: found.size * 0.9, height: found.size * 0.9 };
};
const macroWord = (layout, shot) =>
  layout.glyphs.length === 0 ? -1 : glyphAt(layout, shot.start).word;
const macroFollowWord = (layout, shot, time) => {
  const anchor = macroWord(layout, shot);
  if (anchor < 0) return -1;
  const current = wordIndexAt(layout, time);
  return current !== anchor && layout.words[current].t0 > layout.words[anchor].t0 ? current : -1;
};
const fitDistance = (focus, margin, aspect) =>
  (Math.max(focus.height / 2, focus.width / (2 * Math.max(0.2, aspect))) * margin) /
  Math.tan((METAPHOR_FOV * Math.PI) / 360);
const stepAt = (shot, layout, time, steps) => {
  const onsets = [...new Set(layout.words.map((word) => word.t0))]
    .filter((onset) => onset > shot.start + 0.3 && onset < shot.end - 0.3)
    .sort((a, b) => a - b);
  const times = [];
  if (onsets.length >= steps) {
    for (let index = 0; index < steps; index += 1)
      times.push(onsets[Math.floor((index * onsets.length) / steps)]);
  } else {
    for (let index = 1; index <= steps; index += 1)
      times.push(shot.start + ((shot.end - shot.start) * index) / (steps + 1));
  }
  return times.filter((at) => at <= time).length;
};
const wobble = (time, phase) =>
  Math.sin(time * 0.23 + phase) * 0.6 + Math.sin(time * 0.37 + phase * 2.3) * 0.4;
const WIDE_MARGIN = 1.1;
const PULLBACK_STEPS = 3;
const PUSHIN_STEPS = 3;
const MACRO_MARGIN = 0.8;
const CLOSE_MARGIN = 1.3;
const MACRO_FOLLOW_ROLL = 0.12;
const PUSHIN_BEAT = 0.16;
const plannedPose = ({ shot, layout, time, aspect, motion }) => {
  const u = clamp01((time - shot.start) / Math.max(1e-3, shot.end - shot.start));
  const creep = 1 - 0.035 * motion * u;
  const whole = rectFocus(layout.bounds);
  let focus = whole;
  let distance;
  let { roll } = shot;
  switch (shot.kind) {
    case 'wide':
      distance = fitDistance(whole, WIDE_MARGIN, aspect) * creep;
      break;
    case 'close':
      focus = wordFocus(layout, shot.start, shot.seed);
      distance = fitDistance(focus, CLOSE_MARGIN, aspect) * creep;
      break;
    case 'follow':
      focus = wordFocus(layout, time, shot.seed);
      distance = fitDistance(focus, 1.45, aspect);
      break;
    case 'macro': {
      const following = macroFollowWord(layout, shot, time);
      if (following >= 0) {
        focus = rectFocus(layout.words[following]);
        distance = fitDistance(focus, CLOSE_MARGIN, aspect) * creep;
        roll *= MACRO_FOLLOW_ROLL;
        break;
      }
      focus = glyphFocus(layout, shot.start, shot.seed);
      distance = fitDistance(focus, MACRO_MARGIN, aspect) * creep;
      roll += 0.03 * motion * (u - 0.5);
      break;
    }
    case 'dutch':
      distance = fitDistance(whole, 1.1, aspect) * creep;
      break;
    case 'void':
      distance = fitDistance(whole, 1.85, aspect) * (2 - creep);
      break;
    case 'pullback': {
      const near = wordFocus(layout, shot.start, shot.seed);
      const out = stepAt(shot, layout, time, PULLBACK_STEPS) / PULLBACK_STEPS;
      focus = {
        x: lerp(near.x, whole.x, out),
        y: lerp(near.y, whole.y, out),
        width: whole.width,
        height: whole.height,
      };
      distance = lerp(fitDistance(near, 1.15, aspect), fitDistance(whole, 1.4, aspect), out);
      break;
    }
    case 'pushin': {
      const near = wordFocus(layout, shot.start, shot.seed);
      const into =
        Math.min(PUSHIN_STEPS, Math.floor(Math.max(0, time - shot.start) / PUSHIN_BEAT)) /
        PUSHIN_STEPS;
      focus = {
        x: lerp(whole.x, near.x, into),
        y: lerp(whole.y, near.y, into),
        width: near.width,
        height: near.height,
      };
      distance =
        lerp(fitDistance(whole, 3.2, aspect), fitDistance(near, 1.3, aspect), into) * creep;
      break;
    }
  }
  const visible = 2 * distance * Math.tan((METAPHOR_FOV * Math.PI) / 360);
  const phase = shot.seed * 40;
  const drift = 8e-3 * motion * visible;
  return {
    x: focus.x - shot.offsetX * visible + wobble(time, phase) * drift,
    y: focus.y - shot.offsetY * visible + wobble(time, phase + 11) * drift,
    distance,
    roll: roll + wobble(time, phase + 23) * 4e-3 * motion,
    fov: METAPHOR_FOV,
  };
};
const KEEP_OUT = 0.97;
const KEEP_IN = 0.9;
const MIN_SUNG = 0.3;
const sungUnitAt = (units, at) => {
  let found = null;
  for (const unit of units) {
    if (unit.t0 <= at && (!found || unit.t0 >= found.t0)) found = unit;
  }
  return found && at < Math.max(found.t1, found.t0 + MIN_SUNG) ? found : null;
};
const frame = (pose, rect, aspect, inner) => {
  const halfHeight = pose.distance * Math.tan((pose.fov * Math.PI) / 360);
  const half = [halfHeight * aspect * inner, halfHeight * inner];
  const cos = Math.cos(pose.roll);
  const sin = Math.sin(pose.roll);
  const low = [Infinity, Infinity];
  const high = [-Infinity, -Infinity];
  for (const x of [rect.x0, rect.x1]) {
    for (const y of [rect.y0, rect.y1]) {
      const dx = x - pose.x;
      const dy = y - pose.y;
      const along = [dx * cos + dy * sin, -dx * sin + dy * cos];
      for (const axis of [0, 1]) {
        low[axis] = Math.min(low[axis], along[axis]);
        high[axis] = Math.max(high[axis], along[axis]);
      }
    }
  }
  return { half, low, high };
};
const fitShift = (pose, unit, aspect, inner, out) => {
  const { half, low, high } = frame(pose, unit, aspect, inner);
  const shift = [0, 0];
  for (const axis of [0, 1]) {
    const size = high[axis] - low[axis];
    const full = half[axis] / inner;
    if (size > 2 * full) {
      const room = half[axis] * 0.5;
      const center = (low[axis] + high[axis]) / 2;
      shift[axis] = center > room ? center - room : center < -room ? center + room : 0;
    } else {
      const limit = Math.max(half[axis], size / 2);
      shift[axis] =
        high[axis] > limit ? high[axis] - limit : low[axis] < -limit ? low[axis] + limit : 0;
    }
  }
  out.x = shift[0];
  out.y = shift[1];
  return out;
};
const checkpoints = (shot, units) => {
  const times = units.map((unit) => unit.t0);
  if (shot.kind === 'pullback') {
    for (let step = 1; step <= PULLBACK_STEPS; step += 1) {
      times.push(shot.start + ((shot.end - shot.start) * step) / (PULLBACK_STEPS + 1));
    }
  }
  if (shot.kind === 'pushin') times.push(shot.start + PUSHIN_STEPS * PUSHIN_BEAT);
  const after = [...new Set(times)].filter((at) => at > shot.start).sort((a, b) => a - b);
  return [shot.start, ...after];
};
const trackFor = (input) => {
  const { shot, layout, time, aspect, motion } = input;
  const track = layout.__foliaMetaphorTrack;
  if (
    track &&
    track.shot === shot &&
    track.aspect === aspect &&
    track.motion === motion &&
    time >= (track.next > 0 ? track.times[track.next - 1] : shot.start)
  )
    return track;
  const units = layout.words;
  const anchor = shot.kind === 'macro' ? macroWord(layout, shot) : -1;
  const fresh = {
    shot,
    aspect,
    motion,
    units,
    skip: anchor >= 0 ? units[anchor] : null,
    times: checkpoints(shot, units),
    next: 0,
    still: null,
    shiftX: 0,
    shiftY: 0,
  };
  Object.defineProperty(layout, '__foliaMetaphorTrack', {
    value: fresh,
    writable: true,
    configurable: true,
  });
  return fresh;
};
const shiftPose = (pose, shiftX, shiftY) => {
  if (shiftX === 0 && shiftY === 0) return pose;
  const cos = Math.cos(pose.roll);
  const sin = Math.sin(pose.roll);
  return __spreadProps(__spreadValues({}, pose), {
    x: pose.x + shiftX * cos - shiftY * sin,
    y: pose.y + shiftX * sin + shiftY * cos,
  });
};
const outside = (pose, unit, aspect, out) => {
  fitShift(pose, unit, aspect, KEEP_OUT, out);
  return out.x !== 0 || out.y !== 0;
};
const need = { x: 0, y: 0 };
const advance = (track, input) => {
  var _a;
  const { shot, aspect } = input;
  const at = track.times[track.next];
  track.next += 1;
  const still = plannedPose(__spreadProps(__spreadValues({}, input), { time: at, motion: 0 }));
  const previous = track.still;
  track.still = still;
  if (
    previous &&
    (still.x !== previous.x || still.y !== previous.y || still.distance !== previous.distance)
  ) {
    track.shiftX = 0;
    track.shiftY = 0;
  }
  const unit = sungUnitAt(track.units, at);
  if (!unit || unit === track.skip) return;
  const planned = plannedPose(__spreadProps(__spreadValues({}, input), { time: at }));
  const until =
    Math.min(
      (_a = track.times[track.next]) != null ? _a : shot.end,
      Math.max(unit.t1, unit.t0 + MIN_SUNG),
      shot.end,
    ) - 1e-3;
  const later =
    until > at ? plannedPose(__spreadProps(__spreadValues({}, input), { time: until })) : planned;
  if (
    !outside(shiftPose(planned, track.shiftX, track.shiftY), unit, aspect, need) &&
    !outside(shiftPose(later, track.shiftX, track.shiftY), unit, aspect, need)
  )
    return;
  fitShift(planned, unit, aspect, KEEP_IN, need);
  if (outside(shiftPose(later, need.x, need.y), unit, aspect, { x: 0, y: 0 }))
    fitShift(later, unit, aspect, KEEP_IN, need);
  track.shiftX = need.x;
  track.shiftY = need.y;
};
const resolveMetaphorPose = (input) => {
  const pose = plannedPose(input);
  const { shot, layout, time } = input;
  if (time < shot.start || (layout.words.length === 0 && layout.glyphs.length === 0)) return pose;
  const track = trackFor(input);
  while (track.next < track.times.length && track.times[track.next] <= time) advance(track, input);
  return shiftPose(pose, track.shiftX, track.shiftY);
};
const resolveMetaphorStillPose = (layout, aspect) => {
  const whole = rectFocus(layout.bounds);
  return {
    x: whole.x,
    y: whole.y,
    distance: fitDistance(whole, WIDE_MARGIN, aspect),
    roll: 0,
    fov: METAPHOR_FOV,
  };
};
const FLOOD_IN = 0.7;
const FLOOD_OUT = 0.9;
const resolveMetaphorTransitionFx = (program, cueIndex, time, out) => {
  out.flood = 0;
  const cue = program.cues[cueIndex];
  const since = time - cue.start;
  if (since >= 0 && cue.transition === 'flood' && since < FLOOD_OUT)
    out.flood = 1.15 * (1 - easeOutCubic(since / FLOOD_OUT));
  if (cueIndex + 1 < program.cues.length) {
    const next = program.cues[cueIndex + 1];
    const until = next.start - time;
    if (next.transition === 'flood' && until < FLOOD_IN)
      out.flood = Math.max(out.flood, 1.15 * (1 - until / FLOOD_IN) ** 2);
  }
  return out;
};
const resolveMetaphorReveal = (cue, time) =>
  clamp01((time - cue.start) / 0.5 + (cue.lineIndex < 0 ? 1 : 0));
const resolveMetaphorMelt = (cue, time) => {
  if (cue.lineIndex < 0 || cue.end - cue.singEnd < METAPHOR_TAIL * 0.6) return 0;
  const from = Math.max(cue.singEnd + 0.3, cue.end - 1.5);
  return clamp01((time - from) / Math.max(0.05, cue.end - from));
};
export {
  METAPHOR_EMPTY_STAGE,
  METAPHOR_FOV,
  resolveMetaphorMelt,
  resolveMetaphorPose,
  resolveMetaphorReveal,
  resolveMetaphorStillPose,
  resolveMetaphorTransitionFx,
};
