// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const clamp01 = (value) => Math.min(1, Math.max(0, value)),
  cubicCoordinate = (point1, point2, time) => {
    const inverse = 1 - time;
    return (
      3 * inverse * inverse * time * point1 +
      3 * inverse * time * time * point2 +
      time * time * time
    );
  },
  resolveCubicBezier = (x1, y1, x2, y2, value) => {
    const target = clamp01(value);
    if (target === 0 || target === 1) return target;
    let low = 0,
      high = 1,
      parameter = target;
    for (let iteration = 0; iteration < 12; iteration += 1)
      (cubicCoordinate(x1, x2, parameter) < target ? (low = parameter) : (high = parameter),
        (parameter = (low + high) / 2));
    return cubicCoordinate(y1, y2, parameter);
  },
  easeSonnetInOut = (value) => resolveCubicBezier(0.65, 0, 0.35, 1, value),
  easeSonnetEnter = (value) => resolveCubicBezier(0.22, 1, 0.36, 1, value),
  resolveSonnetAnimationScale = (theme) =>
    theme.animationIntensity === 'calm' ? 0.65 : theme.animationIntensity === 'chaotic' ? 1.35 : 1,
  easeSonnetExpoOut = (value) => (value === 1 ? 1 : 1 - Math.pow(2, -10 * value)),
  easeSonnetElasticOut = (value) =>
    Math.pow(2, -10 * value) * Math.sin(((value - 0.075) * (2 * Math.PI)) / 0.3) + 1,
  resolveShotProgress = (shot, time) =>
    clamp01((time - shot.startTime) / Math.max(shot.endTime - shot.startTime, 1e-3)),
  resolveSegmentProgress = (startTime, endTime, time) =>
    easeSonnetExpoOut(clamp01((time - startTime) / Math.max(endTime - startTime, 0.08))),
  resolveSonnetSegmentDepth = (role, random = Math.random) =>
    role !== 'decoration' ? 0 : random() > 0.5 ? 0.5 + random() * 0.8 : -0.5 - random() * 0.8,
  resolveSonnetSegmentNormalOffset = (role, layoutDirection, rotation, fontSize, randomValue) => {
    if (role !== 'support') return { x: 0, y: 0 };
    const distance = (Math.min(1, Math.max(0, randomValue)) * 2 - 1) * fontSize * 0.3,
      normalAngle = rotation + (layoutDirection === 'vertical' ? 0 : Math.PI / 2);
    return {
      x: Math.cos(normalAngle) * distance,
      y: Math.sin(normalAngle) * distance,
    };
  },
  SONNET_CAMERA_SMOOTHING_SAMPLES = [
    { offset: -1, weight: 1 },
    { offset: -0.5, weight: 4 },
    { offset: 0, weight: 6 },
    { offset: 0.5, weight: 4 },
    { offset: 1, weight: 1 },
  ],
  resolveSonnetSmoothedCameraFocus = (
    time,
    startTime,
    endTime,
    sampleFocus,
    smoothingWindow = 0.12,
    maxBlendDistance = 96
  ) => {
    const safeStart = Math.min(startTime, endTime),
      safeEnd = Math.max(startTime, endTime),
      radius = Math.max(0, smoothingWindow);
    if (radius === 0 || safeStart === safeEnd)
      return sampleFocus(Math.min(safeEnd, Math.max(safeStart, time)));
    const samples = SONNET_CAMERA_SMOOTHING_SAMPLES.map(({ offset, weight }) => {
        const sampleTime = Math.min(safeEnd, Math.max(safeStart, time + offset * radius));
        return { point: sampleFocus(sampleTime), weight };
      }),
      center = samples[2].point,
      maxDistanceSquared = Math.max(0, maxBlendDistance) ** 2;
    let x = 0,
      y = 0,
      totalWeight = 0;
    return (
      samples.forEach(({ point, weight }) => {
        (point.x - center.x) ** 2 + (point.y - center.y) ** 2 > maxDistanceSquared ||
          ((x += point.x * weight), (y += point.y * weight), (totalWeight += weight));
      }),
      { x: x / totalWeight, y: y / totalWeight }
    );
  },
  resolveSonnetFocusWeights = (ranges, time, sigma = 0.35) => {
    if (ranges.length === 0) return [];
    const safeSigma = Math.max(1e-3, sigma),
      logWeights = ranges.map((range) => {
        const startTime = Math.min(range.startTime, range.endTime),
          endTime = Math.max(range.startTime, range.endTime),
          distance = time < startTime ? startTime - time : time > endTime ? time - endTime : 0;
        return -(distance * distance) / (2 * safeSigma * safeSigma);
      }),
      maxLogWeight = Math.max(...logWeights),
      weights = logWeights.map((weight) => Math.exp(weight - maxLogWeight)),
      totalWeight = weights.reduce((total, weight) => total + weight, 0);
    return weights.map((weight) => weight / totalWeight);
  },
  resolveShotPathProgress = (kind, progress) => {
    const linear = clamp01(progress);
    if (
      kind === 'tracking-ribbon' ||
      kind === 'fragment-collage' ||
      kind === 'quiet-tableau' ||
      kind === 'poster-blocks'
    )
      return linear * 0.55 + easeSonnetInOut(linear) * 0.45;
    if (linear < 0.18) return easeSonnetExpoOut(linear / 0.18) * 0.22;
    if (linear < 0.78) return 0.22 + ((linear - 0.18) / 0.6) * 0.56;
    const settle = (linear - 0.78) / 0.22;
    return 0.78 + (1 - (1 - settle) * (1 - settle)) * 0.22;
  },
  resolveShotMotionFrame = (kind, progress) => {
    const linear = clamp01(progress),
      eased = resolveShotPathProgress(kind, linear);
    return {
      'editorial-column': {
        x: -0.055 + eased * 0.095,
        y: 0.025 - eased * 0.04,
        scale: 0.98 + eased * 0.07,
        rotation: -6e-3 + eased * 0.01,
      },
      'type-impact': {
        x: -0.035 + eased * 0.07,
        y: 0.018 - eased * 0.028,
        scale: 1 + (1 - easeSonnetExpoOut(Math.min(linear / 0.18, 1))) * 0.22 + eased * 0.08,
        rotation: -0.01 + eased * 0.016,
      },
      'fragment-collage': {
        x: -0.045 + eased * 0.085,
        y: 0.028 - Math.sin(eased * Math.PI) * 0.055,
        scale: 0.97 + eased * 0.09,
        rotation: -0.014 + eased * 0.028,
      },
      'tracking-ribbon': {
        x: -0.16 + eased * 0.28,
        y: 0.05 - eased * 0.085,
        scale: 0.98 + eased * 0.07,
        rotation: 8e-3 - eased * 0.014,
      },
      'mask-reveal': {
        x: 0.035 - eased * 0.065,
        y: 0.1 - eased * 0.135,
        scale: 0.96 + eased * 0.12,
        rotation: -6e-3 + eased * 9e-3,
      },
      'poster-blocks': {
        x: -0.012 + eased * 0.024,
        y: 8e-3 - eased * 0.016,
        scale: 0.99 + eased * 0.025,
        rotation: -15e-4 + eased * 3e-3,
      },
      'quiet-tableau': {
        x: -0.022 + eased * 0.04,
        y: 0.014 - eased * 0.025,
        scale: 1 + eased * 0.028,
        rotation: -2e-3 + eased * 3e-3,
      },
    }[kind];
  },
  SONNET_CAMERA_BREATH_MAX_OFFSET = 6e-3,
  SONNET_CAMERA_BREATH_MAX_SCALE = 2e-3,
  SONNET_CAMERA_BREATH_MAX_ROTATION = 15e-4,
  resolveSonnetCameraBreath = (time, phase = 0) => {
    const tau = time * Math.PI * 2;
    return {
      x:
        (Math.sin(tau * 0.13 + phase) * 0.65 + Math.sin(tau * 0.31 + phase * 1.7) * 0.35) *
        SONNET_CAMERA_BREATH_MAX_OFFSET,
      y:
        (Math.cos(tau * 0.11 + phase * 2.3) * 0.65 + Math.sin(tau * 0.29 + phase * 0.9) * 0.35) *
        SONNET_CAMERA_BREATH_MAX_OFFSET,
      scale: Math.sin(tau * 0.09 + phase * 1.3) * SONNET_CAMERA_BREATH_MAX_SCALE,
      rotation: Math.sin(tau * 0.07 + phase * 2.9) * SONNET_CAMERA_BREATH_MAX_ROTATION,
    };
  },
  resolveSonnetBreathWeight = (time, revealDoneTime, rampDuration = 1.2) =>
    rampDuration <= 0
      ? time >= revealDoneTime
        ? 1
        : 0
      : easeSonnetInOut(clamp01((time - revealDoneTime) / rampDuration)),
  resolveTimelineShake = (time, intensity) => {
    if (intensity <= 0) return { x: 0, y: 0, rotation: 0 };
    const shakeX = Math.sin(time * 123.456) * Math.cos(time * 789.123),
      shakeY = Math.cos(time * 345.678) * Math.sin(time * 901.234),
      shakeRot = Math.sin(time * 567.89);
    return {
      x: shakeX * 0.02 * intensity,
      y: shakeY * 0.02 * intensity,
      rotation: shakeRot * 5e-3 * intensity,
    };
  };
export {
  SONNET_CAMERA_BREATH_MAX_OFFSET,
  SONNET_CAMERA_BREATH_MAX_ROTATION,
  SONNET_CAMERA_BREATH_MAX_SCALE,
  clamp01,
  easeSonnetElasticOut,
  easeSonnetEnter,
  easeSonnetExpoOut,
  easeSonnetInOut,
  resolveCubicBezier,
  resolveSegmentProgress,
  resolveShotMotionFrame,
  resolveShotPathProgress,
  resolveShotProgress,
  resolveSonnetAnimationScale,
  resolveSonnetBreathWeight,
  resolveSonnetCameraBreath,
  resolveSonnetFocusWeights,
  resolveSonnetSegmentDepth,
  resolveSonnetSegmentNormalOffset,
  resolveSonnetSmoothedCameraFocus,
  resolveTimelineShake,
};
