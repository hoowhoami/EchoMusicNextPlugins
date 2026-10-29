// Derived from Folia a8da4437 Claddagh (AGPL-3.0-only). No rendering or frame-time shaping.
export function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}
const finite = (value, fallback, low, high) =>
  Number.isFinite(Number(value)) ? clamp(Number(value), low, high) : fallback;
export function resolveSettings(values) {
  const v = values || {};
  return {
    focusScaleRatio: finite(v.claddaghFocusScaleRatio, 0.65, 0, 1.5),
    radiusScale: finite(v.claddaghRadiusScale, 1, 0.5, 1.5),
    ellipseTiltDeg: finite(v.claddaghEllipseTiltDeg, 45, 0, 60),
    showAxisLine: typeof v.claddaghShowAxisLine === 'boolean' ? v.claddaghShowAxisLine : true,
    letterSpacingOffset: finite(v.claddaghLetterSpacingOffset, 0, -5, 20),
    lyricsFontScale: finite(v.lyricsFontScale, 1, 0.1, 4),
  };
}
function preparedIndices(prepared) {
  return Object.keys(prepared || {})
    .map(Number)
    .filter(
      (index) => Number.isInteger(index) && index >= 0 && prepared[index] && prepared[index].line
    )
    .sort((a, b) => a - b);
}
export function nextPreparedLine(prepared, index) {
  const next = preparedIndices(prepared).find((candidate) => candidate > index);
  return next === undefined ? null : prepared[next].line;
}
export function windowIndices(index, count, prepared) {
  const result = [];
  for (let i = index - 1; i <= index + 2; i++)
    if (i >= 0 && i < count && (!prepared || (prepared[i] && prepared[i].line))) result.push(i);
  if (!result.length && count && !prepared) result.push(clamp(index, 0, count - 1));
  return result;
}
export function visualLength(text) {
  let length = 0;
  for (let i = 0; i < text.length; i++)
    length += /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(text[i]) ? 1 : 0.5;
  return length;
}
export function adjustTimeline(timeline, line) {
  const adjusted = timeline.map((item) => Object.assign({}, item));
  let i = 0;
  while (i < adjusted.length) {
    if (adjusted[i].startTime !== adjusted[i].endTime) {
      i++;
      continue;
    }
    let j = i;
    while (j < adjusted.length && adjusted[j].startTime === adjusted[j].endTime) j++;
    const count = j - i;
    let start = i > 0 ? adjusted[i - 1].endTime : line.startTime;
    let end = j < adjusted.length ? adjusted[j].startTime : line.endTime;
    const deficit = count * 0.06 - (end - start);
    if (deficit > 0) {
      if (i > 0 && j < adjusted.length) {
        const before = Math.min(
          deficit / 2,
          Math.max(0, adjusted[i - 1].endTime - adjusted[i - 1].startTime - 0.04)
        );
        const after = Math.min(
          deficit - before,
          Math.max(0, adjusted[j].endTime - adjusted[j].startTime - 0.04)
        );
        start -= before;
        end += after;
        adjusted[i - 1].endTime = start;
        adjusted[j].startTime = end;
      } else if (i > 0) {
        start -= Math.min(
          deficit,
          Math.max(0, adjusted[i - 1].endTime - adjusted[i - 1].startTime - 0.04)
        );
        adjusted[i - 1].endTime = start;
      } else if (j < adjusted.length) {
        end += Math.min(deficit, Math.max(0, adjusted[j].endTime - adjusted[j].startTime - 0.04));
        adjusted[j].startTime = end;
      }
    }
    const unit = Math.max(0, end - start) / count;
    for (let k = i; k < j; k++) {
      adjusted[k].startTime = start + unit * (k - i);
      adjusted[k].endTime = start + unit * (k - i + 1);
    }
    i = j;
  }
  return adjusted;
}
export function buildSpacing(timeline, metric, fontPx, radius, focus, extraSpacing) {
  if (!metric || !metric.graphemes || metric.graphemes.length !== timeline.length) return [];
  const offsets = [0];
  let advance = 0;
  for (let i = 0; i < timeline.length; i++) {
    advance += Math.abs(metric.graphemes[i].advance);
    offsets.push(advance + Math.max(0, i) * (fontPx * 0.22 + extraSpacing));
  }
  const spacingScale = Math.max(0.1, (1 + focus) / 1.65);
  const safeRadius = Math.max(radius, fontPx * 2, 1);
  const span = (offsets[offsets.length - 1] * spacingScale) / safeRadius;
  const scaleFactor = span > 4.25 ? 4.25 / span : 1;
  return timeline.map((item, index) => {
    const grapheme = metric.graphemes[index];
    const center = ((offsets[index] + offsets[index + 1]) / 2) * spacingScale;
    return Object.assign({}, item, {
      index,
      start: grapheme.start,
      length: grapheme.length,
      clusterStart: grapheme.clusterStart,
      nativeX: grapheme.x + grapheme.advance / 2,
      nativeStartX: grapheme.x,
      nativeEndX: grapheme.x + grapheme.advance,
      baseline: metric.baseline,
      height: metric.height,
      nominalAngle: (center / safeRadius - span / 2) * scaleFactor,
      scaleFactor,
    });
  });
}
export function clusterSpacing(spacing) {
  const result = [];
  for (let i = 0; i < spacing.length;) {
    const first = spacing[i];
    let j = i + 1;
    while (j < spacing.length && spacing[j].clusterStart === first.clusterStart) j++;
    const last = spacing[j - 1];
    result.push(
      Object.assign({}, first, {
        char: spacing
          .slice(i, j)
          .map((item) => item.char)
          .join(''),
        endTime: last.endTime,
        nominalAngle: (first.nominalAngle + last.nominalAngle) / 2,
        nativeX: (first.nativeStartX + last.nativeEndX) / 2,
        length: last.start + last.length - first.start,
      })
    );
    i = j;
  }
  return result;
}
export function fractionalIndex(items, time, end) {
  if (!items.length) return 0;
  if (items.length === 1)
    return time <= items[0].startTime
      ? 0
      : (time - items[0].startTime) /
          Math.max(0.2, (Number.isFinite(end) ? end : items[0].endTime) - items[0].startTime);
  if (time <= items[0].startTime) return 0;
  const last = items.length - 1;
  if (time >= items[last].startTime) {
    if (Number.isFinite(end) && end > items[last].startTime)
      return last + clamp((time - items[last].startTime) / (end - items[last].startTime), 0, 1) * 2;
    const duration = items[last].endTime - items[last].startTime;
    const gap = items[last].startTime - items[last - 1].startTime;
    return (
      last +
      Math.min(
        (time - items[last].startTime) / (duration > 0 ? duration : gap > 0 ? gap : 0.5),
        1.8
      )
    );
  }
  for (let i = 0; i < last; i++)
    if (time >= items[i].startTime && time < items[i + 1].startTime)
      return i + (time - items[i].startTime) / (items[i + 1].startTime - items[i].startTime);
  return last;
}
export function wordOffset(items, time, end) {
  if (!items.length) return 0;
  const index = fractionalIndex(items, time, end),
    last = items.length - 1;
  if (index <= last) {
    const lower = Math.floor(index);
    return (
      items[lower].nominalAngle +
      (items[Math.min(lower + 1, last)].nominalAngle - items[lower].nominalAngle) * (index - lower)
    );
  }
  return (
    items[last].nominalAngle +
    (items[last].nominalAngle - items[Math.max(0, last - 1)].nominalAngle) * (index - last)
  );
}
export function playbackProgress(items, time, end) {
  if (!items.length) return 0;
  if (items.length === 1)
    return clamp(
      (time - items[0].startTime) /
        Math.max(0.001, (Number.isFinite(end) ? end : items[0].endTime) - items[0].startTime),
      0,
      1
    );
  return clamp(fractionalIndex(items, time, end) / (items.length - 1), 0, 1);
}
export function renderEnd(line, next) {
  return Math.max(
    line.renderHints ? line.renderHints.renderEndTime : line.endTime,
    next ? next.startTime - 0.34 : line.endTime + 10
  );
}
export function resolvedRenderEnd(line, index, nextStarts, preparedNext) {
  const held = Math.max(
    line.endTime,
    line.renderHints ? line.renderHints.renderEndTime : line.endTime
  );
  if (nextStarts !== undefined && nextStarts !== null) {
    const next = nextStarts[index];
    if (next === null) return renderEnd(line, null);
    return Number.isFinite(next) ? renderEnd(line, { startTime: next }) : held;
  }
  return preparedNext ? renderEnd(line, preparedNext) : held;
}
export function normalizedPower(value) {
  return Number.isFinite(value) ? clamp(value, 0, 1) : 0;
}
// motion-utils' cubic-bezier subdivision, as used by the source scene transition.
function presentationEase(progress) {
  if (progress <= 0 || progress >= 1) return clamp(progress, 0, 1);
  const curve = (t, a, b) => (((1 - 3 * b + 3 * a) * t + 3 * b - 6 * a) * t + 3 * a) * t;
  let low = 0,
    high = 1,
    t = 0,
    error = 0,
    iterations = 0;
  do {
    t = low + (high - low) / 2;
    error = curve(t, 0.16, 0.3) - progress;
    if (error > 0) high = t;
    else low = t;
  } while (Math.abs(error) > 0.0000001 && ++iterations < 12);
  return curve(t, 1, 1);
}
export function presentationPose(elapsed, leaving, origin) {
  const start =
    origin || (leaving ? { opacity: 1, scale: 1, blur: 0 } : { opacity: 0, scale: 0.96, blur: 4 });
  const end = leaving ? { opacity: 0, scale: 1.04, blur: 4 } : { opacity: 1, scale: 1, blur: 0 };
  const progress = presentationEase(clamp(elapsed / 0.8, 0, 1));
  const mix = (key) => start[key] + (end[key] - start[key]) * progress;
  return {
    opacity: mix('opacity'),
    scale: mix('scale'),
    blur: mix('blur'),
    finished: elapsed >= 0.8,
  };
}
export function shouldHoldReset(previous, current, center) {
  return center > 0 && current <= 0.5 && current < previous - 0.5;
}
export function createSpring(index) {
  return { value: index * Math.PI, velocity: 0, index, target: index * Math.PI };
}
export function retargetSpring(state, index, animated) {
  if (!animated || Math.abs(index - state.index) > 1) return createSpring(index);
  return { value: state.value, velocity: state.velocity, index, target: index * Math.PI };
}
export function stepSpring(state, dt) {
  const time = clamp(dt, 0, 0.1),
    alpha = 14 / (2 * 0.9),
    omegaSquared = 55 / 0.9;
  const frequency = Math.sqrt(omegaSquared - alpha * alpha);
  const displacement = state.value - state.target;
  const exponential = Math.exp(-alpha * time),
    cosine = Math.cos(frequency * time),
    sine = Math.sin(frequency * time);
  return {
    value:
      state.target +
      exponential *
        (displacement * cosine + ((state.velocity + alpha * displacement) / frequency) * sine),
    velocity:
      exponential *
      (state.velocity * cosine -
        ((alpha * state.velocity + omegaSquared * displacement) / frequency) * sine),
    target: state.target,
    index: state.index,
  };
}
export function lineWordOffset(
  own,
  active,
  lineIndex,
  center,
  lineOffset,
  time,
  ownEnd,
  activeEnd
) {
  let result = wordOffset(own, time, ownEnd);
  if (lineIndex >= center) {
    const diff = Math.abs(lineOffset - lineIndex * Math.PI) / Math.PI;
    const progress = playbackProgress(active, time, activeEnd);
    result +=
      (wordOffset(active, time, activeEnd) * 0.28 +
        Math.PI * 0.52 * (1 - Math.pow(1 - progress, 1.35))) *
      (lineIndex > center ? 1 : clamp(diff, 0, 1));
  }
  return result;
}
function color(value) {
  if (value && typeof value.r === 'number')
    return { r: value.r, g: value.g, b: value.b, a: typeof value.a === 'number' ? value.a : 1 };
  let s = String(value || '#ffffff').replace('#', '');
  if (s.length === 3)
    s = s
      .split('')
      .map((item) => item + item)
      .join('');
  if (!/^[0-9a-f]{6}$/i.test(s)) s = 'ffffff';
  return {
    r: parseInt(s.slice(0, 2), 16) / 255,
    g: parseInt(s.slice(2, 4), 16) / 255,
    b: parseInt(s.slice(4, 6), 16) / 255,
    a: 1,
  };
}
export function mixColor(from, to, mix, alpha) {
  const a = color(from),
    b = color(to);
  return {
    r: Math.round((a.r + (b.r - a.r) * clamp(mix, 0, 1)) * 255) / 255,
    g: Math.round((a.g + (b.g - a.g) * clamp(mix, 0, 1)) * 255) / 255,
    b: Math.round((a.b + (b.b - a.b) * clamp(mix, 0, 1)) * 255) / 255,
    a: typeof alpha === 'number' ? clamp(alpha, 0, 1) : 1,
  };
}
export function glyphFrame(item, p) {
  const power = clamp(p.power, 0, 1),
    settings = p.settings;
  const multiplier = p.intensity === 'calm' ? 0.08 : p.intensity === 'chaotic' ? 0.95 : 0.25;
  const ceiling = p.intensity === 'calm' ? 1.08 : p.intensity === 'chaotic' ? 1.95 : 1.25;
  const radius = p.radius * Math.min(1 + power * multiplier, ceiling);
  const diff = Math.abs(p.lineOffset - p.lineIndex * Math.PI) / Math.PI;
  let lengthFade = 1,
    lengthScale = 1;
  if (p.lineIndex > p.centerIndex && p.currentLength > 10) {
    const combined =
      clamp((p.currentLength - 10) / 8, 0, 1) * clamp((p.targetLength - 5) / 5, 0.4, 1);
    const progress = clamp((diff - 0.4) / 0.5, 0, 1);
    lengthFade = 1 - combined * progress;
    lengthScale = 1 - combined * 0.25 * progress;
  }
  const psi = p.lineIndex * Math.PI + item.nominalAngle - p.lineOffset - p.wordOffset;
  const cosine = Math.cos(psi),
    depth = (cosine + 1) / 2;
  const rawX = Math.sin(psi) * radius * (0.35 + 0.65 * Math.pow(depth, 1.2));
  const rawY =
    cosine * radius * 0.09 +
    (p.chorus ? (item.index % 2 === 0 ? 1 : -1) * p.fontPx * (0.06 + power * 0.12) : 0);
  const angle = (-settings.ellipseTiltDeg * Math.PI) / 180;
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const focus = Math.max(0, 1 - diff) * Math.pow(1 - Math.min(1, Math.abs(psi) / 0.48), 1.8);
  let opacity =
    (0.35 + 0.65 * Math.pow(depth, 1.5) * (0.35 + 0.65 * focus)) *
    (0.68 + 0.32 * Math.pow(depth, 1.9));
  opacity *= clamp(2 - diff, 0, 1);
  if (p.lineIndex < p.centerIndex) opacity *= Math.max(0, 1 - diff);
  opacity *= lengthFade;
  if (p.lineIndex > p.centerIndex)
    opacity *= 0.18 + 0.82 * clamp((p.time - (p.lineStart - 0.34)) / 0.34, 0, 1);
  if (diff > 0.02) {
    const threshold = 1 - 1.2 * clamp((diff - 0.3) / 0.6, 0, 1);
    if (cosine > threshold) opacity *= clamp(1 - (cosine - threshold) / 0.15, 0, 1);
  }
  const tx = Math.cos(psi) * radius,
    ty = -Math.sin(psi) * radius * 0.09;
  let tangent = (Math.atan2(tx * s + ty * c, tx * c - ty * s) * 180) / Math.PI;
  while (tangent > 90) tangent -= 180;
  while (tangent < -90) tangent += 180;
  let progress =
    p.time >= item.endTime
      ? 1
      : p.time > item.startTime
        ? (p.time - item.startTime) / Math.max(0.001, item.endTime - item.startTime)
        : 0;
  let alpha = 0.55,
    targetColor = mixColor(p.primary, p.primary, 0, 0.55),
    flash = 0;
  const highlight = item.charColor || p.accent;
  if (progress >= 1) {
    alpha = 1;
    targetColor = mixColor(highlight, highlight, 0, 1);
  } else if (progress > 0) {
    const amount = Math.min(1, progress * 15);
    alpha = 0.55 + 0.45 * amount;
    targetColor = mixColor(p.primary, highlight, amount, alpha);
    if (progress < 0.4) flash = Math.pow(1 - progress / 0.4, 2) * 0.65;
  }
  const radiusGlow =
    (p.chorus ? (36 + power * 24) * Math.pow(focus, 1.5) : 24 * Math.pow(focus, 2)) * (1 + flash);
  const fade = clamp((radiusGlow - 0.5) / 2, 0, 1);
  const halos = [];
  if (radiusGlow > 0.5 && fade > 0.01) {
    if (p.chorus) {
      halos.push({
        radius: radiusGlow * 0.35,
        opacity: fade,
        color: mixColor(targetColor, p.primary, 0.65, 1),
      });
      halos.push({
        radius: radiusGlow,
        opacity: alpha * fade,
        color: mixColor(targetColor, targetColor, 0, 1),
      });
      halos.push({
        radius: radiusGlow * 1.6,
        opacity: alpha * fade,
        color: mixColor(targetColor, targetColor, 0, 1),
      });
    } else
      halos.push({
        radius: radiusGlow,
        opacity: alpha * fade,
        color: mixColor(targetColor, targetColor, 0, 1),
      });
  }
  return {
    x: p.width / 2 + rawX * c - rawY * s,
    y: p.height / 2 + rawX * s + rawY * c,
    scale:
      (0.22 + 0.98 * Math.pow(depth, 1.5)) *
      (1 + settings.focusScaleRatio * focus) *
      lengthScale *
      item.scaleFactor,
    rotation: clamp(tangent * (0.4 + 0.6 * depth), -38, 38),
    opacity: clamp(opacity, 0, 1),
    blur: 8 * (1 - depth) * (1 - 0.5 * focus),
    color: targetColor,
    halos,
    depth,
    focus,
    glowRadius: radiusGlow,
  };
}
export function focusIndex(prepared, current, time) {
  // A source index remains authoritative while its asynchronous preparation is missing.
  if (Number.isInteger(current) && current >= 0) return current;
  const indices = preparedIndices(prepared);
  for (let i = indices.length - 1; i >= 0; i--) {
    const index = indices[i];
    // Claddagh uses runtime's default recentCompletedLine: strict raw endTime.
    if (time > prepared[index].line.endTime) return index;
  }
  return -1;
}
export function stepAudio(state, target, stiffness, damping, dt) {
  const alpha = damping / 2,
    square = stiffness,
    displacement = state.value - target;
  const delta = alpha * alpha - square,
    t = clamp(dt, 0, 0.1);
  if (delta > 1e-8) {
    const h = Math.sqrt(delta),
      a = -alpha + h,
      b = -alpha - h;
    const first = (state.velocity - b * displacement) / (a - b),
      second = displacement - first;
    return {
      value: target + first * Math.exp(a * t) + second * Math.exp(b * t),
      velocity: first * a * Math.exp(a * t) + second * b * Math.exp(b * t),
    };
  }
  if (Math.abs(delta) <= 1e-8) {
    const coefficient = state.velocity + alpha * displacement,
      decay = Math.exp(-alpha * t);
    return {
      value: target + decay * (displacement + coefficient * t),
      velocity: decay * (coefficient - alpha * (displacement + coefficient * t)),
    };
  }
  const frequency = Math.sqrt(-delta),
    cosine = Math.cos(frequency * t),
    sine = Math.sin(frequency * t),
    decay = Math.exp(-alpha * t);
  return {
    value:
      target +
      decay *
        (displacement * cosine + ((state.velocity + alpha * displacement) / frequency) * sine),
    velocity:
      decay *
      (state.velocity * cosine -
        ((alpha * state.velocity + square * displacement) / frequency) * sine),
  };
}
export function wordColorRanges(text, entries) {
  const ranges = [],
    english = Object.create(null);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i],
      target = entry && typeof entry.word === 'string' ? entry.word.trim() : '';
    if (!target || !entry.color) continue;
    if (/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(target)) {
      let cursor = 0;
      while (cursor < text.length) {
        const start = text.indexOf(target, cursor);
        if (start < 0) break;
        ranges.push({
          start,
          end: start + target.length,
          color: entry.color,
          priority: target.length,
        });
        cursor = start + target.length;
      }
    } else {
      const words = target
        .split(/\s+/)
        .map((word) => word.toLowerCase().replace(/[^\w]/g, ''))
        .filter(Boolean);
      const priority = Math.max.apply(
        Math,
        words.map((word) => word.length)
      );
      words.forEach((word) => {
        if (!english[word] || priority > english[word].priority)
          english[word] = { color: entry.color, priority };
      });
    }
  }
  const regex = /\w+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const selected = english[match[0].toLowerCase()];
    if (selected)
      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
        color: selected.color,
        priority: selected.priority,
      });
  }
  ranges.sort((a, b) => b.priority - a.priority || a.start - b.start || a.end - b.end);
  const selected = [];
  ranges.forEach((range) => {
    if (!selected.some((item) => item.start < range.end && range.start < item.end))
      selected.push(range);
  });
  return selected.sort((a, b) => a.start - b.start || a.end - b.end);
}
export function applyWordColors(spacing, ranges) {
  return spacing.map((item) =>
    Object.assign({}, item, {
      charColor: (
        ranges.find((range) => range.start < item.start + item.length && item.start < range.end) ||
        {}
      ).color,
    })
  );
}

export function nativePose(frame, item) {
  const angle = (frame.rotation * Math.PI) / 180;
  const offset = (item.baseline - item.height / 2) * frame.scale;
  return {
    x: frame.x - item.nativeX - Math.sin(angle) * offset,
    y: frame.y - item.baseline + Math.cos(angle) * offset,
  };
}
