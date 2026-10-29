// A static source triangle scene becomes retained native GPU paths, built only in WorkerScript.
import { buildPendoloClockworkCachedScene, PENDOLO_MESH_STRIDE } from './clockwork-meshes.mjs';
import { buildPendoloClockworkCachedScene as buildVectors } from './clockwork-vectors.mjs';
import { resolvePendoloClockworkAnchors } from './clockwork-scene.mjs';
export function buildNativeScene(input) {
  const source = buildPendoloClockworkCachedScene(input),
    vectors = buildVectors(input),
    parts = source.parts.map((p) => ({ key: p.transformKey, paths: [] }));
  let pathCount = 0,
    pathBytes = 0;
  for (const command of vectors.data) {
    parts[command.part].paths.push(command);
    pathCount++;
    pathBytes += command.path.length * 2;
  }
  if (pathBytes > 8 * 1024 * 1024 || pathCount > 512)
    throw new Error('Pendolo geometry budget exceeded');
  return {
    key: source.key,
    parts,
    vertexCount: source.vertexCount,
    triangleCount: source.vertexCount / 3,
    pathCount,
    pathBytes,
  };
}
export function resolveTransforms(input, motion) {
  if (input.showGearDecor === 'none') return [];
  const a = resolvePendoloClockworkAnchors(input),
    e = motion.escapementAngle,
    p = motion.phase,
    s = motion.secondGearAngle;
  const pose = (x, y, r) => ({ x, y, rotation: (r * 180) / Math.PI });
  const main = (r) => pose(input.centerX, input.centerY, r);
  const result = [main(0), main(e * 0.2), main(e), main(-e * 2.5)];
  for (let i = 0; i < 3; i++) {
    const angle = e * 0.4 + (i * Math.PI * 2) / 3;
    result.push(
      pose(
        input.centerX + a.orbitR * Math.cos(angle),
        input.centerY + a.orbitR * Math.sin(angle),
        -e * 3 + i * 0.5
      ),
      pose(
        input.centerX + a.orbitR * Math.cos(angle),
        input.centerY + a.orbitR * Math.sin(angle),
        0
      )
    );
  }
  result.push(
    pose(a.balanceCx, a.balanceCy, p * 0.1),
    pose(a.balanceCx, a.balanceCy, 0),
    pose(a.balanceCx, a.balanceCy, motion.bassOscillation * 0.6 + p * 0.1 * 0.3),
    pose(a.transCx, a.transCy, -e * 1.4 + (motion.transBeatAngle || 0)),
    pose(a.transCx, a.transCy, 0),
    pose(a.secondGearCx, a.secondGearCy, s),
    pose(a.secondGearCx, a.secondGearCy, -s),
    pose(a.secondGearCx, a.secondGearCy, 0),
    pose(a.idlerCx, a.idlerCy, e * 2.2),
    pose(a.idlerCx, a.idlerCy, 0),
    pose(0, 0, 0)
  );
  return result;
}
