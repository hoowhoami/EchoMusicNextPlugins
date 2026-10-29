// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { DIORAMA_PARTICLE_AUDIO_SCALE_MAX } from './cameraPath.mjs';
const isKindVisible = (kind, visibility) =>
    kind === 'box'
      ? visibility.strands
      : kind === 'sphere'
        ? visibility.blobs
        : kind === 'cone'
          ? visibility.ribbons
          : visibility.rings,
  getClusterRadius = (shape) => {
    const familyRadius =
      shape.kind === 'box'
        ? 0.5
        : shape.kind === 'sphere'
          ? 0.74
          : shape.kind === 'cone'
            ? 0.68
            : 0.9;
    return (
      shape.scale * Math.max(familyRadius, shape.stretchY * 0.55) * DIORAMA_PARTICLE_AUDIO_SCALE_MAX
    );
  },
  distanceBetween = (a, b) =>
    Math.hypot(
      a.position.x - b.position.x,
      a.position.y - b.position.y,
      a.position.z - b.position.z
    ),
  DIORAMA_CLUSTER_COLLISION_LINE_SPAN = 2,
  selectVisibleDioramaClusters = (shapes, visibility) => {
    if (!visibility.enabled || visibility.mode !== 'clouds') return [];
    const candidates = shapes.filter((shape) => isKindVisible(shape.kind, visibility));
    return candidates.filter((candidate, index) => {
      const candidateRadius = getClusterRadius(candidate);
      for (let rivalIndex = index - 1; rivalIndex >= 0; rivalIndex -= 1) {
        const rival = candidates[rivalIndex];
        if (candidate.sourceLine - rival.sourceLine > DIORAMA_CLUSTER_COLLISION_LINE_SPAN) break;
        if (rival.sourceLine === candidate.sourceLine) continue;
        const clearance = Math.max(1.8, (getClusterRadius(rival) + candidateRadius) * 1.18);
        if (distanceBetween(rival, candidate) < clearance) return !1;
      }
      return !0;
    });
  };
export { DIORAMA_CLUSTER_COLLISION_LINE_SPAN, selectVisibleDioramaClusters };
