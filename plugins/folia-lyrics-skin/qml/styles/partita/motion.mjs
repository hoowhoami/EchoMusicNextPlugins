// Folia a8da4437 PartitaChunk.tsx. GlowWord kernels stay shared with Classic.
import * as Glow from '../classic/motion.mjs';
export function profile(line) {
  return Glow.renderProfile(line);
}
export function chunkState(words, time, renderProfile) {
  if (!words.length) return 'waiting';
  const start = words[0].startTime - renderProfile.wordLookahead;
  const end = Glow.activeEnd(words[words.length - 1], renderProfile);
  return time >= start && time <= end ? 'active' : time > end ? 'passed' : 'waiting';
}
export function chunkPose(state, config, clock, transition, right) {
  const waiting = {
    opacity: 0,
    scale: 0.85,
    x: config.x + (right ? 40 : -40),
    y: config.y,
    rotation: config.rotate,
  };
  const visible = { opacity: 1, scale: 1, x: config.x, y: config.y, rotation: config.rotate };
  const target = state === 'waiting' ? waiting : visible;
  if (!transition) return target;
  const origin = transition.origin || waiting;
  const age = Math.max(0, clock - transition.at);
  const result = {};
  for (const key of ['opacity', 'scale', 'x', 'y', 'rotation']) {
    if (state === 'active' && key !== 'opacity')
      result[key] = Glow.springValue(origin[key], target[key], age);
    else {
      const progress = state === 'active' ? Glow.easeInOut(age / 0.1) : Glow.easeOut(age / 0.4);
      result[key] = origin[key] + (target[key] - origin[key]) * progress;
    }
  }
  return result;
}
export function guidePose(state, clock, changedAt) {
  const progress = Glow.easeOut(Math.max(0, clock - changedAt) / 0.4);
  return {
    opacity: state === 'waiting' ? 1 - progress : progress,
    scale: state === 'waiting' ? 1 - progress : progress,
    color:
      state === 'active'
        ? 'active'
        : state === 'passed'
          ? 'rgba(255,255,255,0.22)'
          : 'rgba(255,255,255,0.14)',
  };
}
export function motionSettings(settings) {
  return Object.assign({}, settings, {
    classicEnableWordRotation: true,
    classicBreathingFloatMultiplier: 1,
    classicUseLegacyLayout: false,
  });
}
export function breathing(clock, settings) {
  return Glow.breathingPose(clock, motionSettings(settings));
}
