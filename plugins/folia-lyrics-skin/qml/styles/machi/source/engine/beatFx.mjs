// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/beatFx.ts
import { createObjectCache, createObjectSet } from '../../../../shared/objectCache.mjs';
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../environment.mjs';
import { DRUM_KICK, DRUM_SNARE } from '../../excluded-analysis.mjs';
import { resolveBeatFxAccentGain } from '../../excluded-analysis.mjs';
const MACHI_NEON_GROUPS = 3;
const MACHI_BEAT = {
  /**
   * 霓虹随拍：每组亮起多久、暗下多久（秒）、亮起时涨多少、别的组跟着暗多少（按与平均的差）；小节第一拍再乘 downbeat。
   */
  neon: { attack: 0.4, fall: 1.5, lift: 0.2, contrast: 0.2, downbeat: 1.2 },
  /** 灯箱跟霓虹那一路的几成。 */
  lightbox: 0.3,
  /** 店里的灯：小节第一拍亮起多久、暗下多久、涨多少。 */
  warm: { attack: 0.6, fall: 2.2, lift: 0.08 },
  /** bloom 跟三组平均涨多少。 */
  bloom: 0.1,
  /**
   * 鼓点涟漪：环走多快（米 / 秒）、活多久（秒）、最多几圈；弱于 floor 的底鼓不算，两圈至少隔 gap 秒（max 圈正好排满 life，
   * 底鼓再密也没有哪圈没走完就被挤掉）。路面湿度在 wet 两个值之间时，环渐渐出来、光斑的一跳渐渐退掉（地面着色器用同一对值）。
   */
  ripple: {
    speed: 6.5,
    life: 1.3,
    max: 4,
    floor: 0.3,
    gap: 0.33,
    thump: 0.55,
    thumpDecay: 0.14,
    wet: [0.1, 0.6],
  },
  /**
   * 大屏闪拍：每处亮起多久、暗下多久（秒）；弱于 floor 的军鼓不算，两处至少隔 gap 秒（max 处正好排满 attack + fall）。
   */
  screen: { attack: 0.25, fall: 1.15, max: 4, floor: 0.4, gap: 0.35 },
  /**
   * 没开智能动感模式时的固定节拍：一拍多久（秒）、一小节几拍；霓虹、大屏按多大的强度跟（大屏的每一处相当于这么响的军鼓）。
   * 大屏落在每小节的第二、四拍（像军鼓的反拍）。
   */
  steady: { period: 0.75, beatsPerBar: 4, neon: 0.8, screen: 0.6 },
};
const createMachiBeatFrame = () => ({
  neonGroups: new Float32Array(MACHI_NEON_GROUPS).fill(1),
  neon: 1,
  warm: 1,
  bloom: 1,
  thump: 0,
  swellAt: new Float32Array(MACHI_BEAT.screen.max).fill(0.5),
  swellAmp: new Float32Array(MACHI_BEAT.screen.max),
});
const resetMachiBeatFrame = (out) => {
  out.neonGroups.fill(1);
  out.neon = 1;
  out.warm = 1;
  out.bloom = 1;
  out.thump = 0;
  out.swellAt.fill(0.5);
  out.swellAmp.fill(0);
  return out;
};
const machiNeonGroup = (beat, group) => beat.neonGroups[group % MACHI_NEON_GROUPS];
const machiLightboxGroup = (beat, group) =>
  1 + MACHI_BEAT.lightbox * (machiNeonGroup(beat, group) - 1);
const machiSwell = (age, attack, fall) => {
  if (age < 0 || age >= attack + fall) return 0;
  if (age < attack) {
    const u2 = age / attack;
    return u2 * u2 * (3 - 2 * u2);
  }
  const u = (age - attack) / fall;
  return 1 - u * u * (3 - 2 * u);
};
const machiRippleWetness = (wetness) => {
  const [from, to] = MACHI_BEAT.ripple.wet;
  const t = Math.min(1, Math.max(0, (wetness - from) / (to - from)));
  return t * t * (3 - 2 * t);
};
const lastAtOrBefore = (count, at, time) => {
  let low = 0;
  let high = count;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (at(middle) <= time) low = middle + 1;
    else high = middle;
  }
  return low - 1;
};
const groupSwells = new Float32Array(MACHI_NEON_GROUPS);
const neonLife = () =>
  Math.max(
    MACHI_BEAT.neon.attack + MACHI_BEAT.neon.fall,
    MACHI_BEAT.warm.attack + MACHI_BEAT.warm.fall,
  );
const addNeonBeat = (index, age, gain, tone, downbeat) => {
  const { neon, warm } = MACHI_BEAT;
  const neonTone = tone ? Math.max(0, 0.4 + 0.9 * (tone.mid + tone.high)) : 1;
  const group = index % MACHI_NEON_GROUPS;
  const swell =
    gain * neonTone * (downbeat ? neon.downbeat : 1) * machiSwell(age, neon.attack, neon.fall);
  groupSwells[group] = Math.max(groupSwells[group], swell);
  if (!downbeat) return 0;
  const warmTone = tone ? Math.max(0, 0.4 + 1.8 * tone.low) : 1;
  return gain * warmTone * machiSwell(age, warm.attack, warm.fall);
};
const writeNeonFrame = (strength, bar, out) => {
  const { neon, warm } = MACHI_BEAT;
  let mean = 0;
  for (let group = 0; group < MACHI_NEON_GROUPS; group += 1) mean += groupSwells[group];
  mean /= MACHI_NEON_GROUPS;
  for (let group = 0; group < MACHI_NEON_GROUPS; group += 1) {
    const swell = groupSwells[group];
    out.neonGroups[group] = Math.max(
      0,
      1 + strength * (neon.lift * swell + neon.contrast * (swell - mean)),
    );
  }
  out.neon = 1 + strength * neon.lift * mean;
  out.warm = 1 + strength * warm.lift * bar;
  out.bloom = 1 + strength * MACHI_BEAT.bloom * mean;
  return out;
};
const resetNeon = (out) => {
  out.neonGroups.fill(1);
  out.neon = 1;
  out.warm = 1;
  out.bloom = 1;
};
const resolveMachiNeonPulse = (events, time, strength, trackScale, out) => {
  resetNeon(out);
  if (!events.length || strength <= 0) return out;
  const life = neonLife();
  groupSwells.fill(0);
  let bar = 0;
  for (
    let index = lastAtOrBefore(events.length, (at) => events[at].t, time);
    index >= 0;
    index -= 1
  ) {
    const event = events[index];
    const age = time - event.t;
    if (age >= life) break;
    const gain = resolveBeatFxAccentGain(event, trackScale);
    if (gain <= 0) continue;
    bar = Math.max(bar, addNeonBeat(index, age, gain, event.tone, event.kind === 'downbeat'));
  }
  return writeNeonFrame(strength, bar, out);
};
const resolveMachiSteadyNeonPulse = (time, strength, out) => {
  resetNeon(out);
  if (strength <= 0 || time < 0) return out;
  const { period, beatsPerBar, neon: scale } = MACHI_BEAT.steady;
  const life = neonLife();
  groupSwells.fill(0);
  let bar = 0;
  for (let index = Math.floor(time / period); index >= 0; index -= 1) {
    const age = time - index * period;
    if (age >= life) break;
    bar = Math.max(bar, addNeonBeat(index, age, 1, void 0, index % beatsPerBar === 0));
  }
  return writeNeonFrame(strength * scale, bar, out);
};
const machiDrumHitsAt = (hits, time) =>
  hits && (hits.until === void 0 || time < hits.until) ? hits : null;
const pickedCache = /* @__PURE__ */ createObjectCache();
const pickedDrumHits = (hits, kind, floor, gap) => {
  let byRule = pickedCache.get(hits);
  if (!byRule) {
    byRule = /* @__PURE__ */ new Map();
    pickedCache.set(hits, byRule);
  }
  const rule = `${kind}:${floor}:${gap}`;
  let picked = byRule.get(rule);
  if (!picked) {
    picked = new Uint8Array(hits.times.length);
    let previous = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < hits.times.length; index += 1) {
      const hitAt = hits.times[index];
      if (hits.kinds[index] !== kind || hits.strengths[index] < floor || hitAt - previous < gap)
        continue;
      previous = hitAt;
      picked[index] = 1;
    }
    byRule.set(rule, picked);
  }
  return picked;
};
const pickDrumHits = (hits, time, kind, floor, gap, life, kept) => {
  const picked = pickedDrumHits(hits, kind, floor, gap);
  const at = (index) => hits.times[index];
  const last = lastAtOrBefore(hits.times.length, at, time);
  let count = 0;
  for (
    let index = lastAtOrBefore(hits.times.length, at, time - life) + 1;
    index <= last;
    index += 1
  ) {
    if (!picked[index]) continue;
    kept[count % kept.length] = index;
    count += 1;
  }
  return count;
};
const keptKicks = new Int32Array(MACHI_BEAT.ripple.max);
const keptSnares = new Int32Array(MACHI_BEAT.screen.max);
const resolveMachiDrumRipples = (hits, time, strength, rings) => {
  const { life, max, floor, gap, thump, thumpDecay } = MACHI_BEAT.ripple;
  for (let slot = 0; slot < max; slot += 1) {
    rings[slot * 2] = -1;
    rings[slot * 2 + 1] = 0;
  }
  if (!hits || strength <= 0) return 0;
  const count = pickDrumHits(hits, time, DRUM_KICK, floor, gap, life, keptKicks);
  let pulse = 0;
  for (let slot = 0; slot < Math.min(count, max); slot += 1) {
    const hit = keptKicks[(count - 1 - slot) % max];
    const age = time - hits.times[hit];
    const amp = strength * hits.strengths[hit];
    rings[slot * 2] = age;
    rings[slot * 2 + 1] = amp;
    pulse = Math.max(pulse, thump * amp * Math.exp(-age / thumpDecay));
  }
  return pulse;
};
const resolveMachiScreenFlash = (hits, time, strength, out) => {
  out.swellAt.fill(0.5);
  out.swellAmp.fill(0);
  if (!hits || strength <= 0) return out;
  const { attack, fall, max, floor, gap } = MACHI_BEAT.screen;
  const count = pickDrumHits(hits, time, DRUM_SNARE, floor, gap, attack + fall, keptSnares);
  for (let slot = 0; slot < Math.min(count, max); slot += 1) {
    const hit = keptSnares[(count - 1 - slot) % max];
    out.swellAt[slot] = machiSwellPlace(hit);
    out.swellAmp[slot] =
      strength * hits.strengths[hit] * machiSwell(time - hits.times[hit], attack, fall);
  }
  return out;
};
const machiSwellPlace = (index) => 0.15 + 0.7 * ((index * 0.618034) % 1);
const resolveMachiSteadyScreenFlash = (time, strength, out) => {
  out.swellAt.fill(0.5);
  out.swellAmp.fill(0);
  if (strength <= 0) return out;
  const { attack, fall, max } = MACHI_BEAT.screen;
  const { period, screen: scale } = MACHI_BEAT.steady;
  const every = period * 2;
  let slot = 0;
  for (let index = Math.floor((time - period) / every); index >= 0 && slot < max; index -= 1) {
    const age = time - (index * every + period);
    if (age >= attack + fall) break;
    out.swellAt[slot] = machiSwellPlace(index);
    out.swellAmp[slot] = strength * scale * machiSwell(age, attack, fall);
    slot += 1;
  }
  return out;
};
export {
  MACHI_BEAT,
  MACHI_NEON_GROUPS,
  createMachiBeatFrame,
  machiDrumHitsAt,
  machiLightboxGroup,
  machiNeonGroup,
  machiRippleWetness,
  machiSwell,
  resetMachiBeatFrame,
  resolveMachiDrumRipples,
  resolveMachiNeonPulse,
  resolveMachiScreenFlash,
  resolveMachiSteadyNeonPulse,
  resolveMachiSteadyScreenFlash,
};
