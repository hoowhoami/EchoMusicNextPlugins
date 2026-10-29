// Classic's boundary between immutable native shaping and frame-only poses.
// AGPL-3.0-only. Never split ligatures or reshape a grapheme in isolation.
import { buildWordGraphemeTimings } from '../../shared/text/graphemeTiming.mjs';
import { wordUiPose, glyphGlow } from './motion.mjs';

export function buildClusters(word, metric) {
  const timing = buildWordGraphemeTimings(word);
  let cursor = 0;
  const timedRanges = timing.map((item) => {
    const start = cursor;
    cursor += item.char.length;
    return { start, end: cursor, timing: item };
  });
  const groups = [];
  const byStart = {};
  (metric.graphemes || []).forEach((grapheme) => {
    const start = grapheme.clusterStart;
    let group = byStart[start];
    if (!group) {
      group = {
        start,
        end: grapheme.start + grapheme.length,
        left: grapheme.x,
        right: grapheme.x + grapheme.advance,
        total: timing.length,
      };
      byStart[start] = group;
      groups.push(group);
    } else {
      group.end = Math.max(group.end, grapheme.start + grapheme.length);
      group.right = grapheme.x + grapheme.advance;
    }
  });
  groups.forEach((group) => {
    const relevant = timedRanges.filter(
      (range) => range.start < group.end && range.end > group.start
    );
    group.timing = relevant.length
      ? {
          startTime: relevant[0].timing.startTime,
          endTime: relevant[relevant.length - 1].timing.endTime,
        }
      : { startTime: word.startTime, endTime: word.endTime };
    group.anchorX = (group.left + group.right) / 2;
  });
  return groups;
}
export function transformCluster(cluster, metric, placement, pose) {
  const angle = (pose.rotation * Math.PI) / 180;
  const cosine = Math.cos(angle) * pose.scale;
  const sine = Math.sin(angle) * pose.scale;
  const dx = cluster.anchorX - metric.width / 2;
  const dy = metric.baseline - metric.height / 2;
  return {
    key: metric.key,
    start: cluster.start,
    x: placement.x + pose.x + cosine * dx - sine * dy - dx,
    y: placement.y + pose.y + sine * dx + cosine * dy - dy,
    scale: pose.scale,
    rotation: pose.rotation,
  };
}
// Motion mixes squared RGB channels, then returns to display space.
export function mixColor(from, to, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const channel = (a, b) =>
    Math.round(Math.sqrt(Math.max(0, a * a + (b * b - a * a) * p)) * 255) / 255;
  return {
    r: channel(from.r, to.r),
    g: channel(from.g, to.g),
    b: channel(from.b, to.b),
    a: from.a + (to.a - from.a) * p,
  };
}
export function framePoses(
  words,
  metrics,
  clusters,
  placements,
  configs,
  time,
  profile,
  mountedAt,
  settings,
  primaryColor,
  activeColors,
  lineBlur,
  enabled,
  colorValue,
  transitions,
  presentationSeconds
) {
  const poses = [];
  words.forEach((word, index) => {
    if (
      !metrics[index] ||
      !placements[index] ||
      !configs[index] ||
      !clusters[index] ||
      !activeColors[index]
    )
      return;
    const body = wordUiPose(
      word,
      configs[index],
      time,
      profile,
      mountedAt,
      settings,
      enabled,
      transitions && transitions[index],
      presentationSeconds
    );
    const tint = mixColor(primaryColor, activeColors[index], body.bodyMix);
    clusters[index].forEach((cluster) => {
      const pose = transformCluster(cluster, metrics[index], placements[index], body);
      pose.opacity = body.opacity;
      pose.color = colorValue(tint);
      pose.blur = Math.sqrt(body.blur * body.blur + lineBlur * lineBlur);
      const glow = enabled
        ? glyphGlow(cluster.timing, word, cluster.total, time, profile, mountedAt)
        : { inner: 0, outer: 0, opacity: 0 };
      // A parent CSS blur also blurs each shadow. Native masks interpolate the full logical radii.
      pose.halos =
        glow.opacity > 0
          ? [
              {
                radius: Math.sqrt(Math.pow(glow.inner * glow.opacity, 2) + lineBlur * lineBlur),
                opacity: glow.opacity,
                color: activeColors[index],
              },
              {
                radius: Math.sqrt(Math.pow(glow.outer * glow.opacity, 2) + lineBlur * lineBlur),
                opacity: glow.opacity,
                color: activeColors[index],
              },
            ]
          : [];
      poses.push(pose);
    });
  });
  return poses;
}
