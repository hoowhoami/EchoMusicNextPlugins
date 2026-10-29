// Folia a8da4437 Cappella semantics, AGPL-3.0-only. Native shaping stays caller-owned.
export { buildMessages } from './messages.mjs';
export { getCappellaIntensityConfig as intensity } from './intensity.mjs';

export const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export function settings(input) {
  const value = input || {};
  return {
    showText: value.showText === undefined || Boolean(value.showText),
    showEmoMessages:
      value.cappellaShowEmoMessages === undefined || Boolean(value.cappellaShowEmoMessages),
    avatarSource:
      ['builtin', 'color', 'cover', 'custom'].indexOf(value.cappellaAvatarSource) >= 0
        ? value.cappellaAvatarSource
        : 'cover',
    emojiPackSource: value.cappellaEmojiPackSource === 'custom' ? 'custom' : 'builtin',
    fontSize: clamp(
      18 * (Number.isFinite(value.lyricsFontScale) ? value.lyricsFontScale : 1),
      15,
      26
    ),
  };
}
export function panel(width) {
  const maxPanelWidth = Math.min(Math.max(width - 32, 1), 896);
  return {
    width: maxPanelWidth,
    ratio: width >= 640 ? 0.68 : 0.78,
    maxTextWidth: Math.max(96, Math.floor(maxPanelWidth * (width >= 640 ? 0.68 : 0.78) - 56)),
    top: width >= 1024 ? 80 : width >= 640 ? 64 : 48,
  };
}

// Range-min tree keeps time selection bounded even for a long song and overlapping reactions.
// Traversal is in source order, rather than sorting reactions by their activation time.
export function eligibilityIndex(messages) {
  let size = 1;
  while (size < messages.length) size *= 2;
  const tree = new Array(size * 2).fill(Infinity);
  messages.forEach((message, index) => {
    tree[size + index] =
      message.kind === 'title'
        ? -Infinity
        : message.kind === 'emo'
          ? message.activationStartTime
          : message.line.startTime;
  });
  for (let i = size - 1; i > 0; --i) tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]);
  return { size, tree };
}
export function visibleCandidates(messages, index, time, limit) {
  const result = [];
  function visit(node, first, last) {
    if (result.length >= limit || index.tree[node] > time) return;
    if (last - first === 1) {
      if (first < messages.length) result.push(messages[first]);
      return;
    }
    const mid = (first + last) / 2;
    visit(2 * node + 1, mid, last);
    visit(2 * node, first, mid);
  }
  if (messages.length && index) visit(1, 0, index.size);
  return result.reverse();
}
export function fitMessages(candidates, height, measuredHeight) {
  const result = [];
  let accumulated = 0;
  const usable = Math.max(200, height - 240);
  for (let i = candidates.length - 1; i >= 0 && result.length < 20; --i) {
    const amount = measuredHeight(candidates[i]);
    if (accumulated + amount > usable && result.length >= 2) break;
    accumulated += amount;
    result.unshift(candidates[i]);
  }
  return result;
}
export function timedState(message, time, currentIndex) {
  return message.kind === 'title'
    ? { active: false, passed: false }
    : message.kind === 'emo'
      ? {
          active: time >= message.activationStartTime && time < message.activationEndTime,
          passed: time >= message.activationEndTime,
        }
      : { active: message.lineIndex === currentIndex, passed: message.lineIndex < currentIndex };
}
export function preheatIndex(metadata, time) {
  let low = 0,
    high = metadata.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (metadata[mid].startTime < time + 0.18) low = mid + 1;
    else high = mid;
  }
  return low < metadata.length && metadata[low].startTime - time <= 1.1
    ? metadata[low].sourceIndex
    : -1;
}
export function countAt(times, time) {
  let low = 0,
    high = times.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (times[mid] <= time) low = mid + 1;
    else high = mid;
  }
  return low;
}
export function revealPlan(prepared) {
  const timeline = prepared.timeline || [];
  const revealTimes = timeline.map((t) => t.startTime);
  const fadeMs = timeline.map((t) => Math.max(40, (t.endTime - t.startTime) * 1000));
  return {
    revealTimes,
    fadeMs,
    targetTimes: revealTimes.map((t) => t - 0.2),
    timestampReadyTime: timeline.length
      ? timeline.reduce(
          (end, t, i) =>
            Number.isFinite(t.startTime) ? Math.max(end, t.startTime + fadeMs[i] / 1000) : end,
          prepared.line.startTime
        )
      : prepared.line.endTime,
  };
}
export function clustersFromMetrics(metric) {
  const result = [],
    byStart = {};
  (metric.graphemes || []).forEach((g, index) => {
    let group = byStart[g.clusterStart];
    if (!group) {
      group = {
        start: g.clusterStart,
        end: g.start + g.length,
        left: Math.min(g.x, g.x + g.advance),
        right: Math.max(g.x, g.x + g.advance),
        first: index,
        last: index,
      };
      result.push(group);
      byStart[g.clusterStart] = group;
    } else {
      group.end = Math.max(group.end, g.start + g.length);
      group.left = Math.min(group.left, g.x, g.x + g.advance);
      group.right = Math.max(group.right, g.x, g.x + g.advance);
      group.last = index;
    }
  });
  return result.map((g) =>
    Object.assign(g, { advance: g.right - g.left, anchor: (g.left + g.right) / 2 })
  );
}

export function updateReveals(previous, clusters, plan, time, uiTime) {
  return clusters.map((cluster, index) => {
    // A native ligature is indivisible; its first EGC opens it, its last EGC sets fade length.
    const visible = cluster.first < countAt(plan.revealTimes, time);
    const old = previous[index];
    return {
      visible,
      born: visible && old && old.visible ? old.born : uiTime,
      duration:
        Math.max.apply(null, plan.fadeMs.slice(cluster.first, cluster.last + 1).concat([40])) /
        1000,
    };
  });
}
export function easeOut(n) {
  // CSS ease-out cubic-bezier(0,0,.58,1), solved rather than substituted with a power curve.
  n = clamp(n, 0, 1);
  if (n === 0 || n === 1) return n;
  let low = 0,
    high = 1,
    t = n;
  for (let i = 0; i < 20; i++) {
    t = (low + high) / 2;
    const x = 3 * (1 - t) * t * t * 0.58 + t * t * t;
    if (x < n) low = t;
    else high = t;
  }
  return 3 * (1 - t) * t * t + t * t * t;
}
export function clusterOpacity(state, uiTime) {
  if (!state || !state.visible) return 0;
  if (uiTime - state.born >= state.duration) return 1;
  return easeOut((uiTime - state.born) / state.duration);
}
export function rowPose(elapsed, exiting, config) {
  const duration = exiting ? config.rowExitDuration : config.rowEnterDuration;
  const p = clamp(elapsed / duration, 0, 1),
    e = exiting ? 1 - easeOut(1 - p) : easeOut(p);
  if (p === 1)
    return {
      opacity: exiting ? 0 : 1,
      y: exiting ? config.rowExitY : 0,
      scale: exiting ? config.rowExitScale : 1,
      finished: true,
    };
  return {
    opacity: exiting ? 1 - e : e,
    y: exiting ? config.rowExitY * e : config.rowEnterY * (1 - e),
    scale: exiting
      ? 1 + (config.rowExitScale - 1) * e
      : config.rowEnterScale + (1 - config.rowEnterScale) * e,
    finished: false,
  };
}
export function stepSpring(state, config, seconds) {
  let value = state.value,
    velocity = state.velocity,
    remaining = clamp(seconds, 0, 0.1);
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 240);
    velocity +=
      ((-config.stiffness * (value - state.target) - config.damping * velocity) / config.mass) * dt;
    value += velocity * dt;
    remaining -= dt;
  }
  if (Math.abs(value - state.target) < 0.00001 && Math.abs(velocity) < 0.00001) {
    value = state.target;
    velocity = 0;
  }
  return { value, velocity, target: state.target };
}
export function mix(from, to, amount, alpha) {
  const channel = (a, b) => Math.round((a + (b - a) * clamp(amount, 0, 1)) * 255) / 255;
  return {
    r: channel(from.r, to.r),
    g: channel(from.g, to.g),
    b: channel(from.b, to.b),
    a: clamp(alpha, 0, 1),
  };
}
export function bubbleColors(message, primary, secondary, accent, background) {
  const amount = 0.18 + ((message.avatarIndex % 9) / 8) * 0.62;
  return message.side === 'right'
    ? {
        background: mix(accent, primary, 0.18, 0.94),
        border: mix(accent, primary, 0.34, 0.3),
        text: background,
      }
    : {
        background: mix(secondary, accent, amount, 1),
        border: mix(secondary, accent, Math.min(amount + 0.18, 1), 0.26),
        text: primary,
      };
}
export function timestamp(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds),
    rest = String(total % 60);
  return Math.floor(total / 60) + ':' + (rest.length < 2 ? '0' : '') + rest;
}
export function hash(input) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i++) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
export function pickAvatar(avatars, index, side, seed) {
  if (!avatars.length) return null;
  const right =
    hash(String(seed === undefined ? 'cappella' : seed) + '|right|' + avatars.length) %
    avatars.length;
  if (side === 'right' || avatars.length === 1) return avatars[right];
  const pool = avatars.filter((_, i) => i !== right);
  const offset =
    hash(String(seed === undefined ? 'cappella' : seed) + '|left|' + pool.length) % pool.length;
  return pool[Math.abs(Math.trunc(index + offset)) % pool.length];
}
export function avatarCrop(index) {
  const safe = ((index % 9) + 9) % 9;
  return { column: safe % 3, row: Math.floor(safe / 3) };
}
