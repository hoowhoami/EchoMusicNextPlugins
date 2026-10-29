// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import * as THREE from './three.mjs';
import {
  DEG_TO_RAD,
  GRADIENT_HOLD_SECONDS,
  GRADIENT_TRAIL_SECONDS,
  MIN_FIT_SCALE,
  TARGET_FRAME_WIDTH_FRACTION,
  TEXT_DISSOLVE_END,
  TEXT_DISSOLVE_START,
  TEXT_FADE_IN_END,
  TEXT_FADE_IN_START,
  clamp01,
  smoothstep01,
} from './dioramaSceneConstants.mjs';
const resolveGradientEnergy = (now, unit) => {
    if (now <= unit.startTime) return 0;
    if (now < unit.endTime) {
      const span = Math.max(unit.endTime - unit.startTime, 1e-3);
      return smoothstep01(clamp01((now - unit.startTime) / span));
    }
    const sinceSung = now - unit.endTime;
    return sinceSung <= GRADIENT_HOLD_SECONDS
      ? 1
      : 1 - smoothstep01(clamp01((sinceSung - GRADIENT_HOLD_SECONDS) / GRADIENT_TRAIL_SECONDS));
  },
  resolveDioramaUnitFill = (out, primary, target, progress) =>
    out.copy(primary).lerp(target, clamp01(progress)),
  shouldResetDioramaUnitState = (previousGlobalIndex, globalIndex, unitStateLength, unitCount) =>
    previousGlobalIndex !== globalIndex || unitStateLength !== unitCount,
  resolveTextLife = (distanceToCamera) => {
    const farT = clamp01(
        (TEXT_FADE_IN_END - distanceToCamera) / (TEXT_FADE_IN_END - TEXT_FADE_IN_START)
      ),
      nearT = clamp01(
        (distanceToCamera - TEXT_DISSOLVE_END) / (TEXT_DISSOLVE_START - TEXT_DISSOLVE_END)
      );
    return farT * farT * (3 - 2 * farT) * (nearT * nearT * (3 - 2 * nearT));
  },
  resolveFrameFitScale = (renderedWidth, distance, verticalFovDeg, aspect) => {
    if (renderedWidth <= 0 || distance <= 0) return 1;
    const targetWidth =
      2 *
      distance *
      Math.tan((verticalFovDeg * DEG_TO_RAD) / 2) *
      aspect *
      TARGET_FRAME_WIDTH_FRACTION;
    return Math.min(1, Math.max(MIN_FIT_SCALE, targetWidth / renderedWidth));
  },
  _basisMatrix = new THREE.Matrix4(),
  _basisQuat = new THREE.Quaternion(),
  _tiltQuat = new THREE.Quaternion(),
  _basisRight = new THREE.Vector3(),
  _basisUp = new THREE.Vector3(),
  _basisFwd = new THREE.Vector3(),
  _axisY = new THREE.Vector3(0, 1, 0),
  _axisZ = new THREE.Vector3(0, 0, 1),
  frameQuaternion = (frame, roll = 0, yaw = 0) => (
    _basisRight.set(frame.right.x, frame.right.y, frame.right.z),
    _basisUp.set(frame.up.x, frame.up.y, frame.up.z),
    _basisFwd.set(-frame.forward.x, -frame.forward.y, -frame.forward.z),
    _basisMatrix.makeBasis(_basisRight, _basisUp, _basisFwd),
    _basisQuat.setFromRotationMatrix(_basisMatrix),
    yaw !== 0 && _basisQuat.multiply(_tiltQuat.setFromAxisAngle(_axisY, yaw)),
    roll !== 0 && _basisQuat.multiply(_tiltQuat.setFromAxisAngle(_axisZ, roll)),
    [_basisQuat.x, _basisQuat.y, _basisQuat.z, _basisQuat.w]
  );
export {
  frameQuaternion,
  resolveDioramaUnitFill,
  resolveFrameFitScale,
  resolveGradientEnergy,
  resolveTextLife,
  shouldResetDioramaUnitState,
};
