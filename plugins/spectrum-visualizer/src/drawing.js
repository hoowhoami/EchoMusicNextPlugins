// Derived from EchoMusicPlugins/spectrum-visualizer, MIT (c) 2026 hoowhoami.
const PALETTES = {
  theme: ['#0071e3', '#5ac8fa', '#7c6cff'],
  aurora: ['#42f5b3', '#35b7ff', '#a86dff'],
  ember: ['#ffe08a', '#ff8f4a', '#ff4d7d'],
  ice: ['#e9fbff', '#8ee7ff', '#6d8dff'],
  mono: ['#f7fbff', '#b8c4d6', '#6b7280'],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const makeGradient = (context, width, height, palette) => {
  const colors = Array.isArray(palette) ? palette : PALETTES[palette] || PALETTES.theme;
  const gradient = context.createLinearGradient(0, height, width, 0);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.52, colors[1]);
  gradient.addColorStop(1, colors[2]);
  return gradient;
};

const appendRoundRect = (context, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
};

const drawBackdrop = (context, width, height, settings, energy, kind, colors) => {
  context.save();
  context.globalAlpha = (kind === 'lyric' ? 0.18 : 0.24) + energy * 0.14;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, 'rgba(10, 15, 28, 0.12)');
  gradient.addColorStop(1, colors[2]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
};

const drawBars = (context, width, height, frame, settings, kind, colors) => {
  const bins = frame?.bins || [];
  const count = Math.max(1, bins.length);
  const fillHeight = height * (settings.fill / 100);
  const bottom = kind === 'lyric' ? height - 4 : height - 8;
  const top = Math.max(kind === 'lyric' ? 8 : 10, bottom - fillHeight);
  const slot = width / count;
  const gap = Math.max(1.1, Math.min(4, slot * 0.22));
  const radius = Math.min(5, Math.max(2, slot * 0.24));
  const gradient = makeGradient(context, width, height, colors);

  context.save();
  context.shadowColor = 'rgba(80, 220, 255, 0.14)';
  context.shadowBlur = count > 128 ? 0 : kind === 'mini' ? 6 : 8;
  context.fillStyle = gradient;
  context.beginPath();

  for (let index = 0; index < count; index += 1) {
    const value = Math.pow(clamp(bins[index] || 0, 0, 1), 1.35);
    const barHeight = Math.max(2, value * (bottom - top));
    const x = index * slot + gap * 0.5;
    const y = bottom - barHeight;
    const barWidth = Math.max(2, slot - gap);
    appendRoundRect(context, x, y, barWidth, barHeight, radius);
  }
  context.fill();

  context.restore();
};

const buildCenteredProfile = (bins, barCount) => {
  const count = Math.round(clamp(barCount, 2, 512));
  const source = Array.from(bins || [], (value) => clamp(value, 0, 1));
  if (!source.length) return Array.from({ length: count }, () => 0);

  const sampleAt = (position) => {
    const bounded = clamp(position, 0, source.length - 1);
    const lower = Math.floor(bounded);
    const upper = Math.min(source.length - 1, lower + 1);
    const fraction = bounded - lower;
    return source[lower] + (source[upper] - source[lower]) * fraction;
  };

  return Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const frequencyPosition = Math.abs(progress * 2 - 1) * (source.length - 1);
    return clamp(
      (sampleAt(frequencyPosition - 0.65) +
        sampleAt(frequencyPosition) * 2 +
        sampleAt(frequencyPosition + 0.65)) /
        4,
      0,
      1,
    );
  });
};

const getCenteredBarLayout = (width, requestedBarWidth = 2, gap = 3) => {
  const barWidth = clamp(requestedBarWidth, 1, 8);
  const safeGap = clamp(gap, 1, 8);
  const count = Math.min(512, Math.max(2, Math.floor(Math.max(0, width) / (barWidth + safeGap))));
  const slotWidth = Math.max(0, width) / count;
  return {
    count,
    slotWidth,
    barWidth: Math.min(barWidth, Math.max(1, slotWidth - 1)),
  };
};

const updateCenteredDisplay = (previous, target, attack = 0.4, decay = 0.88) =>
  target.map((value, index) => {
    const current = clamp(previous?.[index] ?? 0, 0, 1);
    return value > current
      ? current + (value - current) * attack
      : current * decay + value * (1 - decay);
  });

const drawCentered = (entry, width, height, frame, settings, colors) => {
  const { count, slotWidth, barWidth } = getCenteredBarLayout(width, settings.centeredBarWidth);
  const target = buildCenteredProfile(frame?.bins, count);
  entry.centeredDisplay = updateCenteredDisplay(entry.centeredDisplay, target);

  const bottom = entry.kind === 'lyric' ? height - 4 : height - 8;
  const fillHeight = height * (settings.fill / 100);

  entry.context.save();
  entry.context.globalAlpha = 0.65;
  entry.context.fillStyle = colors[0];
  entry.context.beginPath();
  for (let index = 0; index < count; index += 1) {
    const barHeight = entry.centeredDisplay[index] * fillHeight;
    if (barHeight <= 0.5) continue;
    const x = index * slotWidth + (slotWidth - barWidth) * 0.5;
    appendRoundRect(entry.context, x, bottom - barHeight, barWidth, barHeight, 2);
  }
  entry.context.fill();
  entry.context.restore();
};

const drawWave = (
  context,
  width,
  height,
  frame,
  settings,
  alpha = 0.86,
  colors = PALETTES.theme,
) => {
  const waveform = frame?.waveform || [];
  if (!waveform.length) return;
  const center = height * 0.5;
  const amplitude = height * 0.25 * (settings.fill / 100);

  context.save();
  context.globalAlpha = alpha;
  context.lineWidth = 2;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.shadowColor = colors[1];
  context.shadowBlur = 16;
  context.strokeStyle = makeGradient(context, width, height, colors);
  context.beginPath();
  waveform.forEach((sample, index) => {
    const x = (index / Math.max(1, waveform.length - 1)) * width;
    const y = center + clamp(sample, -1, 1) * amplitude;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();
};

const buildMistProfile = (bins, pointCount = 28) => {
  const count = Math.round(clamp(pointCount, 8, 64));
  const source = Array.from(bins || [], (value) => clamp(value, 0, 1));
  if (!source.length) return Array.from({ length: count }, () => 0);

  const profile = Array.from({ length: count }, (_, index) => {
    const center = (index / Math.max(1, count - 1)) * (source.length - 1);
    const radius = Math.max(1, (source.length / count) * 1.8);
    const from = Math.max(0, Math.floor(center - radius));
    const to = Math.min(source.length - 1, Math.ceil(center + radius));
    let weighted = 0;
    let weightTotal = 0;

    for (let sourceIndex = from; sourceIndex <= to; sourceIndex += 1) {
      const distance = Math.abs(sourceIndex - center) / radius;
      const weight = Math.max(0, 1 - distance * 0.72);
      weighted += source[sourceIndex] * weight;
      weightTotal += weight;
    }

    return Math.pow(weighted / Math.max(weightTotal, 1), 0.78);
  });

  return profile.map((value, index) => {
    const previous = profile[Math.max(0, index - 1)];
    const next = profile[Math.min(profile.length - 1, index + 1)];
    return clamp(previous * 0.2 + value * 0.6 + next * 0.2, 0, 1);
  });
};

const appendMistPath = (
  context,
  profile,
  width,
  baseline,
  fillHeight,
  layer,
  phase,
  motion,
  idle,
) => {
  const padding = Math.max(18, width * 0.035);
  const span = width + padding * 2;
  const points = profile.map((value, index) => {
    const progress = index / Math.max(1, profile.length - 1);
    const x = -padding + progress * span;
    const drift =
      Math.sin(progress * Math.PI * (2.4 + layer.index * 0.35) + phase + layer.phase) *
      (0.018 + motion * 0.035);
    const ambient = idle ? 0.075 : 0.025;
    const level = ambient + value * layer.scale + drift;
    return { x, y: baseline - fillHeight * clamp(level, 0.02, 1) };
  });

  context.beginPath();
  context.moveTo(-padding, baseline + padding);
  context.lineTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const midpointX = (previous.x + point.x) * 0.5;
    const midpointY = (previous.y + point.y) * 0.5;
    context.quadraticCurveTo(previous.x, previous.y, midpointX, midpointY);
  }
  const last = points[points.length - 1];
  context.quadraticCurveTo(last.x, last.y, width + padding, last.y);
  context.lineTo(width + padding, baseline + padding);
  context.closePath();
};

const getMistRenderLayers = (settings, energy = 0) => {
  const intensity = clamp(settings.mistIntensity, 35, 100) / 100;
  const softness = clamp(settings.mistSoftness, 20, 100) / 100;
  const signal = clamp(energy, 0, 1);
  return [
    { index: 0, scale: 0.58, alpha: 0.48, phase: 0.3, blur: 1.05 },
    { index: 1, scale: 0.78, alpha: 0.36, phase: 2.2, blur: 0.72 },
    { index: 2, scale: 0.98, alpha: 0.28, phase: 4.4, blur: 0.42 },
  ].map((layer) => ({
    ...layer,
    alpha: (layer.alpha + signal * 0.12) * intensity,
    blur: Math.round((3 + softness * 11) * layer.blur),
  }));
};

const drawMist = (
  context,
  width,
  height,
  frame,
  settings,
  kind,
  time,
  idle = false,
  colors = PALETTES.theme,
) => {
  const pointCount = Math.round(clamp(width / 18, 18, 44));
  const profile = buildMistProfile(idle ? [] : frame?.bins, pointCount);
  const energy = clamp(frame?.rms ?? 0, 0, 1);
  const fillHeight = height * (settings.fill / 100);
  const baseline = kind === 'lyric' ? height + 4 : height + 8;
  const reduceMotion = settings.reducedMotion;
  const motion = reduceMotion ? 0 : settings.mistMotion / 100;
  const phase = (time / 1000) * motion * 0.9;
  const layers = getMistRenderLayers(settings, energy);

  context.save();
  context.globalCompositeOperation = 'screen';
  for (const layer of layers) {
    const gradient = context.createLinearGradient(0, baseline, width, 0);
    gradient.addColorStop(0, colors[layer.index % colors.length]);
    gradient.addColorStop(0.5, colors[(layer.index + 1) % colors.length]);
    gradient.addColorStop(1, colors[(layer.index + 2) % colors.length]);
    context.save();
    context.globalAlpha = layer.alpha;

    context.fillStyle = gradient;
    appendMistPath(context, profile, width, baseline, fillHeight, layer, phase, motion, idle);
    context.fill();
    context.restore();
  }
  context.restore();
};

const drawIdle = (context, width, height, settings, time, colors) => {
  const count = Math.min(settings.binCount, 48);
  const slot = width / count;
  context.save();
  context.globalAlpha = 0.2;
  context.fillStyle = colors[1];
  context.beginPath();
  for (let index = 0; index < count; index += 1) {
    const wave = 0.5 + 0.5 * Math.sin(time / 700 + index * 0.36);
    const barHeight = 2 + wave * 7;
    const x = index * slot + slot * 0.22;
    appendRoundRect(context, x, height - 12 - barHeight, slot * 0.56, barHeight, 2);
  }
  context.fill();
  context.restore();
};

export function paint(context, width, height, frame, settings, kind, colors, time, display) {
  context.clearRect(0, 0, width, height);
  if (settings.showBackdrop)
    drawBackdrop(context, width, height, settings, frame?.rms || 0, kind, colors);
  if (settings.mode === 'centered')
    drawCentered(
      { context, kind, centeredDisplay: display.values },
      width,
      height,
      frame,
      settings,
      colors,
    );
  else if (frame && frame.state !== 'idle') {
    if (settings.mode === 'wave') drawWave(context, width, height, frame, settings, 0.9, colors);
    else if (settings.mode === 'hybrid') {
      drawWave(context, width, height, frame, settings, 0.38, colors);
      drawBars(context, width, height, frame, settings, kind, colors);
    } else drawBars(context, width, height, frame, settings, kind, colors);
  } else drawIdle(context, width, height, settings, time, colors);
}
export function centered(context, width, height, frame, settings, kind, colors, display) {
  if (settings.showBackdrop)
    drawBackdrop(context, width, height, settings, frame?.rms || 0, kind, colors);
  const entry = { context, kind, centeredDisplay: display.values };
  drawCentered(entry, width, height, frame, settings, colors);
  display.values = entry.centeredDisplay;
  context.save();
  context.globalCompositeOperation = 'destination-in';
  const mask = context.createLinearGradient(0, 0, width, 0);
  for (const [at, alpha] of [
    [0, 0],
    [0.05, 0.6],
    [0.12, 1],
    [0.88, 1],
    [0.95, 0.6],
    [1, 0],
  ])
    mask.addColorStop(at, 'rgba(0,0,0,' + alpha + ')');
  context.fillStyle = mask;
  context.fillRect(0, 0, width, height);
  context.restore();
}
export function mist(context, width, height, frame, settings, kind, colors, time, index) {
  context.clearRect(0, 0, width, height);
  const profile = buildMistProfile(frame?.bins, Math.round(clamp(width / 18, 18, 44)));
  const layer = getMistRenderLayers(settings, frame?.rms || 0)[index];
  const baseline = kind === 'lyric' ? height + 4 : height + 8;
  const motion = settings.reducedMotion ? 0 : settings.mistMotion / 100;
  const gradient = context.createLinearGradient(0, baseline, width, 0);
  gradient.addColorStop(0, colors[index % 3]);
  gradient.addColorStop(0.5, colors[(index + 1) % 3]);
  gradient.addColorStop(1, colors[(index + 2) % 3]);
  context.save();
  context.globalAlpha = layer.alpha;
  context.fillStyle = gradient;
  appendMistPath(
    context,
    profile,
    width,
    baseline,
    (height * settings.fill) / 100,
    layer,
    (time / 1000) * motion * 0.9,
    motion,
    !frame || frame.state === 'idle',
  );
  context.fill();
  context.restore();
}
export function blurFor(settings, index) {
  return getMistRenderLayers(settings, 0)[index].blur;
}
export function palette(name, theme) {
  return name === 'theme' ? theme : PALETTES[name] || PALETTES.theme;
}

export function backdrop(context, width, height, frame, settings, kind, colors) {
  context.clearRect(0, 0, width, height);
  if (settings.showBackdrop)
    drawBackdrop(context, width, height, settings, frame?.rms || 0, kind, colors);
}
