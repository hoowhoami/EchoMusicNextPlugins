// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import {
  clamp01,
  easeTemperaEnter,
  easeTemperaInOut,
  easeTemperaSoftBack,
  resolveCubicBezier,
} from './temperaMotionEasing.mjs';
import { resolveTemperaEnterFrame } from './temperaEnterStyles.mjs';
const CURRENT_EMPHASIS = 0.05;
const EMPHASIS_DECAY = 0.26;
const ECHO_ALPHA = 0.5;
const MAX_REVEAL_WINDOW = 1.35;
const RELEASE_TRACKING = 0.055;
const resolveTemperaGlyphMotion = (glyph, time, motion) => {
  const window = Math.max(glyph.settleTime - glyph.startTime, 0.08);
  const linear = clamp01((time - glyph.startTime) / window);
  const travel = 1 - easeTemperaEnter(linear);
  const entrance = resolveTemperaEnterFrame(glyph.enterStyle, glyph, travel, linear);
  const reveal = clamp01((time - glyph.startTime) / Math.min(window, MAX_REVEAL_WINDOW));
  const alpha = easeTemperaInOut(clamp01(reveal * 2.4));
  const sungWindow = glyph.endTime - glyph.startTime;
  const attack = Math.min(0.12, sungWindow * 0.5);
  const emphasis =
    sungWindow <= 0
      ? 0
      : easeTemperaInOut(clamp01((time - glyph.startTime) / Math.max(attack, 0.02))) *
        (1 - easeTemperaInOut(clamp01((time - glyph.endTime) / EMPHASIS_DECAY)));
  const releaseStart = Math.max(glyph.endTime, glyph.settleTime);
  const release = easeTemperaInOut(
    clamp01((time - releaseStart) / Math.max(glyph.releaseTime - releaseStart, 1e-3))
  );
  const spread = release * clamp01(motion) * RELEASE_TRACKING;
  const driftX = glyph.trackingX * spread;
  const driftY = glyph.trackingY * spread;
  const amount = clamp01(motion);
  const swell = emphasis * CURRENT_EMPHASIS * amount;
  return {
    visible: time >= glyph.startTime,
    alpha,
    x: entrance.x * motion + driftX,
    y: entrance.y * motion + driftY,
    rotation: glyph.rotation + entrance.rotation * motion,
    scaleX: entrance.scaleX + (1 - entrance.scaleX) * (1 - amount) + swell,
    scaleY: entrance.scaleY + (1 - entrance.scaleY) * (1 - amount) + swell,
    echoX: entrance.x * motion,
    echoY: entrance.y * motion,
    echoAlpha: entrance.echo * (1 - easeTemperaEnter(reveal)) * ECHO_ALPHA * amount,
  };
};
const resolveShotPacedDuration = (shotDuration, fraction, minSeconds, maxSeconds) =>
  Math.min(maxSeconds, Math.max(minSeconds, shotDuration * fraction));
export {
  clamp01,
  easeTemperaEnter,
  easeTemperaInOut,
  easeTemperaSoftBack,
  resolveCubicBezier,
  resolveShotPacedDuration,
  resolveTemperaGlyphMotion,
};
