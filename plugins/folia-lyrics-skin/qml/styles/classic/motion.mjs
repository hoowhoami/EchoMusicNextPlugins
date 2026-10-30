// Folia a8da4437: renderHints.ts, glowWordTiming.ts, glowWordVariants.ts, wordGlow.ts.
// AGPL-3.0-only. All time values are seconds; the caller supplies the presentation clock.
import { resolveClassicSettings } from './layout.mjs';
export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
function mix(a, b, progress) {
  return a + (b - a) * progress;
}
function bezier(t, a, b) {
  return (((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t + 3 * a) * t;
}
// Motion's installed default cubic-bezier evaluator uses twelve binary subdivisions.
export function cubicBezier(progress, x1, y1, x2, y2) {
  const value = clamp(progress, 0, 1);
  if (value === 0 || value === 1) return value;
  let low = 0,
    high = 1,
    time = 0,
    difference = 0,
    count = 0;
  do {
    time = low + (high - low) / 2;
    difference = bezier(time, x1, x2) - value;
    if (difference > 0) high = time;
    else low = time;
  } while (Math.abs(difference) > 0.0000001 && ++count < 12);
  return bezier(time, y1, y2);
}
export function easeInOut(progress) {
  return cubicBezier(progress, 0.42, 0, 0.58, 1);
}
export function easeOut(progress) {
  return cubicBezier(progress, 0, 0, 0.58, 1);
}
function defaultEase(progress) {
  return cubicBezier(progress, 0.25, 0.1, 0.35, 1);
}
export function springValue(
  from,
  to,
  elapsed,
  stiffness = 200,
  damping = 20,
  restSpeed,
  initialVelocity = 0
) {
  if (elapsed <= 0 || (from === to && initialVelocity === 0)) return from;
  const frequency = Math.sqrt(stiffness);
  const ratio = damping / (2 * frequency);
  const delta = to - from;
  let value, velocity;
  if (ratio < 1) {
    const angular = frequency * Math.sqrt(1 - ratio * ratio);
    const decay = damping / 2;
    const a = (decay * delta - initialVelocity) / angular;
    const sine = Math.sin(angular * elapsed);
    const cosine = Math.cos(angular * elapsed);
    const envelope = Math.exp(-decay * elapsed);
    value = to - envelope * (a * sine + delta * cosine);
    velocity =
      envelope * ((decay * a + delta * angular) * sine + (decay * delta - a * angular) * cosine);
  } else if (ratio === 1) {
    const coefficient = frequency * delta - initialVelocity;
    const envelope = Math.exp(-frequency * elapsed);
    value = to - envelope * (delta + coefficient * elapsed);
    velocity = envelope * (frequency * coefficient * elapsed + initialVelocity);
  } else {
    const angular = frequency * Math.sqrt(ratio * ratio - 1);
    const decay = damping / 2;
    const coefficient = (decay * delta - initialVelocity) / angular;
    const phase = Math.min(angular * elapsed, 300);
    const sine = Math.sinh(phase);
    const cosine = Math.cosh(phase);
    const envelope = Math.exp(-decay * elapsed);
    value = to - envelope * (coefficient * sine + delta * cosine);
    velocity =
      envelope *
      ((decay * coefficient - delta * angular) * sine +
        (decay * delta - coefficient * angular) * cosine);
  }
  const granular = Math.abs(delta) < 5;
  return Math.abs(velocity) <= (restSpeed || (granular ? 0.01 : 2)) &&
    Math.abs(to - value) <= (granular ? 0.005 : 0.5)
    ? to
    : value;
}
export function renderProfile(line) {
  let hints = line.renderHints;
  if (!hints) {
    const raw = Math.max(line.endTime - line.startTime, 0);
    const micro = raw < 0.1;
    const fast = !micro && raw < 0.18;
    const transition = micro ? 'none' : fast ? 'fast' : 'normal';
    const reveal = micro ? 'instant' : fast ? 'fast' : 'normal';
    const enter = micro
      ? 0
      : fast
        ? clamp(raw * 0.45, 0.045, 0.06)
        : Math.min(0.42, Math.max(0.22, Math.max(raw, 0.12) * 0.34));
    const exit = micro
      ? 0
      : fast
        ? clamp(raw * 0.22, 0.03, 0.04)
        : Math.min(0.32, Math.max(0.18, Math.max(raw, 0.12) * 0.18));
    const words = line.words || [];
    const lastEnd = words.length ? words[words.length - 1].endTime : line.endTime;
    const pass = Math.max(lastEnd, line.startTime) + (micro ? 0 : fast ? 0.03 : 0.06);
    const exitAt = fast
      ? Math.max(line.startTime + enter + 0.01, pass, line.endTime - exit)
      : Math.max(pass, line.endTime - exit);
    hints = {
      rawDuration: raw,
      timingClass: micro ? 'micro' : fast ? 'short' : 'normal',
      renderEndTime: micro
        ? Math.max(line.endTime, line.startTime + 0.067)
        : Math.max(line.endTime, exitAt + exit),
      lineTransitionMode: transition,
      wordRevealMode: reveal,
    };
  }
  return {
    renderHints: hints,
    lineRenderEndTime: hints.renderEndTime,
    lineTransitionMode: hints.lineTransitionMode,
    wordRevealMode: hints.wordRevealMode,
    wordLookahead:
      hints.wordRevealMode === 'instant' ? 0.03 : hints.wordRevealMode === 'fast' ? 0.08 : 0.15,
  };
}
export function activeEnd(word, profile) {
  return profile.wordRevealMode === 'instant'
    ? profile.lineRenderEndTime
    : profile.wordRevealMode === 'fast'
      ? Math.min(profile.lineRenderEndTime, Math.max(word.endTime, word.startTime + 0.12))
      : word.endTime;
}
export function displayDuration(word, profile) {
  return Math.max(
    activeEnd(word, profile) - word.startTime,
    profile.wordRevealMode === 'instant' ? 0.08 : profile.wordRevealMode === 'fast' ? 0.12 : 0.1
  );
}
export function wordState(word, time, profile) {
  const end = activeEnd(word, profile);
  return time >= word.startTime - profile.wordLookahead && time <= end
    ? 'active'
    : time > end
      ? 'passed'
      : 'waiting';
}
function activePose(config, elapsed, duration, reveal, rotationEnabled, origin, velocity) {
  const waiting = {
    opacity: 0,
    scale: 0.5,
    x: config.x + Math.sin(config.y) * 100,
    y: config.y + Math.cos(config.x) * 50,
    rotation: rotationEnabled ? config.rotate + 20 : 0,
    bodyMix: 0,
    blur: 10,
  };
  const from = origin || waiting;
  const initial = velocity || {};
  if (elapsed <= 0) return Object.assign({}, from);
  const blurDuration = reveal === 'instant' ? 0.08 : reveal === 'fast' ? 0.12 : 0.2;
  return {
    opacity: mix(from.opacity, 1, easeOut(elapsed / 0.1)),
    scale: springValue(
      from.scale,
      isNaN(config.scale) ? 1.5 : config.scale * 1.4,
      elapsed,
      200,
      20,
      undefined,
      initial.scale || 0
    ),
    x: springValue(from.x, config.x, elapsed, 200, 20, undefined, initial.x || 0),
    y: springValue(from.y, config.y, elapsed, 200, 20, undefined, initial.y || 0),
    rotation: springValue(
      from.rotation,
      config.rotate,
      elapsed,
      200,
      20,
      undefined,
      initial.rotation || 0
    ),
    bodyMix: clamp(elapsed / duration, 0, 1),
    blur: from.blur * (1 - easeOut(elapsed / blurDuration)),
  };
}
export function wordPose(word, config, time, profile, mountedAt, settings, motionEnabled = true) {
  const tuning = resolveClassicSettings(settings);
  const state = wordState(word, time, profile);
  const began = Math.max(mountedAt, word.startTime - profile.wordLookahead);
  const end = activeEnd(word, profile);
  if (!motionEnabled)
    return {
      state,
      opacity:
        state === 'waiting'
          ? 0
          : state === 'passed'
            ? tuning.animationIntensity === 'chaotic'
              ? 0.9
              : 0.82
            : 1,
      x: config.x,
      y: config.y,
      scale: config.scale,
      rotation: 0,
      blur: 0,
      bodyMix: state === 'active' ? 1 : 0,
    };
  const pose = activePose(
    config,
    state === 'passed' ? end - began : time - began,
    displayDuration(word, profile),
    profile.wordRevealMode,
    tuning.enableWordRotation
  );
  if (state === 'passed') {
    const elapsed = Math.max(0, time - Math.max(mountedAt, end));
    const progress = easeOut(elapsed / 0.5);
    pose.opacity = mix(
      pose.opacity,
      tuning.animationIntensity === 'chaotic' ? 0.9 : 0.82,
      progress
    );
    pose.scale = mix(pose.scale, config.scale || 1, progress);
    pose.x = mix(pose.x, config.x, progress);
    pose.y = mix(pose.y, config.y, progress);
    pose.rotation = mix(
      pose.rotation,
      config.rotate + config.passedRotate,
      clamp(elapsed / 5, 0, 1)
    );
    const colorDuration =
      profile.wordRevealMode === 'instant' ? 0.12 : profile.wordRevealMode === 'fast' ? 0.24 : 0.8;
    const blurDuration =
      profile.wordRevealMode === 'instant' ? 0.12 : profile.wordRevealMode === 'fast' ? 0.2 : 0.5;
    pose.bodyMix *= 1 - easeInOut(elapsed / colorDuration);
    pose.blur *= 1 - easeOut(elapsed / blurDuration);
  }
  pose.state = state;
  return pose;
}
// UI transforms follow a state transition's presentation time. Lyric state and
// highlight phase still come exclusively from the caller's playback time.
export function wordUiPose(
  word,
  config,
  time,
  profile,
  mountedAt,
  settings,
  enabled,
  transition,
  presentationSeconds
) {
  const pose = wordPose(word, config, time, profile, mountedAt, settings, enabled);
  if (!enabled || !transition || transition.state !== pose.state) return pose;
  const elapsed = Math.max(0, presentationSeconds - transition.at);
  if (pose.state === 'active') {
    const visual = activePose(
      config,
      elapsed,
      displayDuration(word, profile),
      profile.wordRevealMode,
      resolveClassicSettings(settings).enableWordRotation,
      transition.origin,
      transition.velocity
    );
    visual.state = pose.state;
    visual.bodyMix = pose.bodyMix;
    return visual;
  }
  const origin = transition.origin;
  if (!origin) return pose;
  if (pose.state === 'waiting') {
    const progress = easeOut(elapsed / 0.4);
    for (const key of ['opacity', 'scale', 'x', 'y', 'rotation', 'blur', 'bodyMix'])
      pose[key] = mix(origin[key], pose[key], progress);
    return pose;
  }
  const progress = easeOut(elapsed / 0.5);
  const tuning = resolveClassicSettings(settings);
  pose.opacity = mix(
    origin.opacity,
    tuning.animationIntensity === 'chaotic' ? 0.9 : 0.82,
    progress
  );
  pose.scale = mix(origin.scale, config.scale || 1, progress);
  pose.x = mix(origin.x, config.x, progress);
  pose.y = mix(origin.y, config.y, progress);
  pose.rotation = mix(
    origin.rotation,
    config.rotate + config.passedRotate,
    clamp(elapsed / 5, 0, 1)
  );
  const reveal = profile.wordRevealMode;
  pose.bodyMix =
    origin.bodyMix *
    (1 - easeInOut(elapsed / (reveal === 'instant' ? 0.12 : reveal === 'fast' ? 0.24 : 0.8)));
  pose.blur =
    origin.blur *
    (1 - easeOut(elapsed / (reveal === 'instant' ? 0.12 : reveal === 'fast' ? 0.2 : 0.5)));
  return pose;
}
// MotionValue measures the last delivered frame and caps its denominator at
// 30ms. Only physical springs consume that velocity; duration-based redirects
// still begin at the current pose. Retain two timestamps, never a frame history.
export function wordTransition(
  state,
  presentationSeconds,
  origin,
  previousPose,
  previousAt,
  previousVelocity
) {
  const elapsed = presentationSeconds - previousAt;
  const velocity = {};
  for (const field of ['scale', 'x', 'y', 'rotation']) {
    const value =
      elapsed > 0 && previousPose
        ? (origin[field] - previousPose[field]) / Math.min(elapsed, 0.03)
        : elapsed === 0 && previousVelocity
          ? previousVelocity[field]
          : 0;
    velocity[field] = Number.isFinite(value) ? value : 0;
  }
  return { state, at: presentationSeconds, origin, velocity };
}
function keyframes(time, values, offsets, duration, easing) {
  const progress = clamp(duration > 0 ? time / duration : 1, 0, 1);
  for (let index = 0; index + 1 < values.length; index++) {
    if (progress <= offsets[index + 1])
      return mix(
        values[index],
        values[index + 1],
        easing((progress - offsets[index]) / (offsets[index + 1] - offsets[index]))
      );
  }
  return values[values.length - 1];
}
export function glyphGlow(timing, word, total, time, profile, mountedAt) {
  const reveal = profile.wordRevealMode;
  const duration = displayDuration(word, profile);
  const began = Math.max(mountedAt, word.startTime - profile.wordLookahead);
  const end = activeEnd(word, profile);
  let inner = 20,
    outer = 40,
    rampDuration = duration,
    delay = 0,
    offsets = [0, 0.9, 1],
    peaks = [0, 1, 1],
    easing = easeInOut;
  if (reveal === 'instant') {
    inner = 14;
    outer = 24;
    rampDuration = Math.min(duration || 0.08, 0.12);
    offsets = [0, 0.35, 1];
    peaks = [0, 1, 0];
    easing = easeOut;
  } else if (reveal === 'fast') {
    inner = 18;
    outer = 32;
    rampDuration = Math.min(Math.max(duration || 0.12, 0.12), 0.2);
    offsets = [0, 0.4, 1];
    peaks = [0, 1, 0];
  } else if (total > 1) {
    const timed =
      timing && typeof timing.startTime === 'number' && typeof timing.endTime === 'number';
    rampDuration =
      (timed ? Math.max(timing.endTime - timing.startTime, 0.001) : duration / total) * 6;
    delay = timed
      ? Math.max(0, timing.startTime - word.startTime)
      : (duration / total) * (timing.index || 0);
    offsets = [0, 0.3, 1];
    peaks = [0, 1, 0];
  }
  const sample = (absolute) =>
    absolute < began + delay || began > end
      ? 0
      : keyframes(absolute - began - delay, peaks, offsets, rampDuration, easing);
  let opacity = sample(Math.min(time, end));
  if (time > end)
    opacity *=
      1 -
      easeOut(
        (time - Math.max(end, mountedAt)) /
          (reveal === 'instant' ? 0.12 : reveal === 'fast' ? 0.22 : 0.9)
      );
  return { inner, outer, opacity: clamp(opacity, 0, 1) };
}
export function linePose(profile, elapsed, leaving, hidden, origin) {
  const mode = profile.lineTransitionMode;
  if (leaving) {
    const held = origin || { opacity: 1, scale: 1, blur: 0 };
    const duration = hidden ? 0.2 : mode === 'none' ? 0.12 : mode === 'fast' ? 0.16 : 0.3;
    const progress =
      hidden || mode === 'none' ? easeOut(elapsed / duration) : easeInOut(elapsed / duration);
    return {
      opacity: mix(held.opacity, 0, progress),
      scale: mix(
        held.scale,
        hidden ? held.scale : mode === 'none' ? 1.02 : mode === 'fast' ? 1.04 : 1.1,
        progress
      ),
      blur: mix(
        held.blur,
        hidden ? held.blur : mode === 'none' ? 6 : mode === 'fast' ? 10 : 20,
        progress
      ),
      finished: elapsed >= duration,
    };
  }
  if (mode === 'none') return { opacity: 1, scale: 1, blur: 0, finished: false };
  if (mode === 'fast') {
    const progress = easeOut(elapsed / 0.16);
    return {
      opacity: mix(0.35, 1, progress),
      scale: mix(0.96, 1, progress),
      blur: 4 * (1 - progress),
      finished: false,
    };
  }
  return {
    opacity: defaultEase(elapsed / 0.3),
    scale: springValue(0.9, 1, elapsed, 550, 30, 10),
    blur: 10 * (1 - defaultEase(elapsed / 0.3)),
    finished: false,
  };
}
export function breathingPose(elapsed, settings) {
  const tuning = resolveClassicSettings(settings);
  const multiplier = tuning.breathingFloatMultiplier;
  if (multiplier <= 0) return { y: 0, scale: 1 };
  const config =
    tuning.animationIntensity === 'calm'
      ? [10, 8.5]
      : tuning.animationIntensity === 'chaotic'
        ? [18, 5.8]
        : [14, 7];
  const distance = config[0] * multiplier;
  const phase = ((elapsed % config[1]) + config[1]) % config[1];
  return {
    y: keyframes(
      phase,
      [0, -distance, 0, distance * 0.45, 0],
      [0, 0.25, 0.5, 0.75, 1],
      config[1],
      easeInOut
    ),
    scale: keyframes(
      phase,
      [1, 1 + 0.01 * multiplier, 1, 1 - 0.005 * multiplier, 1],
      [0, 0.25, 0.5, 0.75, 1],
      config[1],
      easeInOut
    ),
  };
}
