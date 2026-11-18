// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaDrizzleRide.ts
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { NebbiaDrumBumps } from './nebbiaDrumBumps.mjs';
import { getDrumHits } from '../excluded-analysis.mjs';
import { getVocalEnvelope } from '../excluded-analysis.mjs';
import { BEAT_EFFECT_IDS, beatEffectPartId } from './_shared/services/beatFx/beatEffects.mjs';
import {
  getBeatEffectStrength,
  getBeatFxHeard,
  isBeatEffectPlaying,
} from '../excluded-analysis.mjs';
const DRIZZLE_RIDE = BEAT_EFFECT_IDS.nebbiaDrizzleRide;
const DRIZZLE_RIDE_RAIN = beatEffectPartId(DRIZZLE_RIDE, 'rain');
const DRIZZLE_RIDE_BUMP = beatEffectPartId(DRIZZLE_RIDE, 'bump');
class NebbiaDrizzleRide {
  constructor() {
    __publicField(this, 'drumBumps', new NebbiaDrumBumps());
    /** 雨点正在跟的人声轨包络，没有时 null、退回频段。 */
    __publicField(this, 'env', null);
    /** 雨点强度：乘小雨点密度和大雨点大小。 */
    __publicField(this, 'rain', 1);
  }
  /**
   * 开一帧的玻璃运动并读这一帧的效果：这首有鼓点就由底鼓颠（没鼓、没分析完的照旧随机颠），强度乘颠簸幅度
   * `bump`；`env`、`rain` 随后读。`bumps` 为 false（水族箱里车不颠）时只读雨点那份。
   */
  step(motion, now, T, frozen, bump, bumps = true) {
    const on = isBeatEffectPlaying(DRIZZLE_RIDE);
    const key = on ? getBeatFxHeard().key : null;
    const drums = on && bumps ? getDrumHits(key) : null;
    motion.beginFrame(now, frozen, bumps && !drums);
    if (drums && !frozen) {
      const jolt = this.drumBumps.step(drums, key, T);
      const strength = getBeatEffectStrength(DRIZZLE_RIDE_BUMP);
      if (jolt > 0 && strength > 0 && bump > 0) motion.trigger(now, jolt * strength);
    } else if (!drums) {
      this.drumBumps.reset();
    }
    this.rain = on ? getBeatEffectStrength(DRIZZLE_RIDE_RAIN) : 1;
    this.env = on ? getVocalEnvelope(key) : null;
  }
}
export { NebbiaDrizzleRide };
