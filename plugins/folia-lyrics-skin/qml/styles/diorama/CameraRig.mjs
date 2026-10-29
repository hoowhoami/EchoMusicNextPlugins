// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { useMemo, useRef } from './react.mjs';
import { useFrame } from './react.mjs';
import * as THREE from './three.mjs';
import { buildLineGraphemeTimeline } from '../../shared/text/graphemeTiming.mjs';
import { getLineRenderEndTime } from '../../shared/renderHints.mjs';
import {
  DIORAMA_CAMERA_LIFT,
  DIORAMA_HERO_DISTANCE,
  DIORAMA_SAFE_FRAME_FRACTION,
  DIORAMA_SNAP_DISTANCE,
  frameHalfWidth,
  getDioramaShot,
  getDioramaTextPlacement,
  getFrame,
  resolveCameraDrift,
  resolveHoldSettle,
  resolveReadHeadTruck,
  resolveShotOffset,
  smoothDamp,
} from './cameraPath.mjs';
import { resolveGlobal } from './dioramaSequencer.mjs';
import {
  flightPerp,
  flightSide,
  TRANSITION_AIM_SWEEP,
  TRANSITION_BANK,
  TRANSITION_DURATION,
  transitionEase,
} from './dioramaTransition.mjs';
const UP = new THREE.Vector3(0, 1, 0),
  clamp01 = (value) => Math.min(1, Math.max(0, value)),
  ALIGN_SHOT_CEILING = {
    hold: 0.9,
    pushIn: 0.85,
    track: 0.85,
    swell: 0.8,
    float: 0.78,
    glide: 0.72,
    crane: 0.7,
    pullBack: 0.7,
    arc: 0.62,
    pendulum: 0.6,
    orbit: 0.55,
    spiral: 0.5,
    flyby: 0.5,
  },
  ALIGN_LEAD_IN = 0.6,
  ALIGN_SETTLE = 0.35,
  ALIGN_RELEASE = 1,
  ALIGN_RATE = 1.2,
  ALIGN_TURN_RATE = 2.6,
  FRAME_KEEP_FRACTION = 0.7,
  smoothstep01 = (t) => {
    const c = clamp01(t);
    return c * c * (3 - 2 * c);
  },
  _alignRight = new THREE.Vector3(),
  _alignUp = new THREE.Vector3(),
  _alignFwd = new THREE.Vector3(),
  _alignMatrix = new THREE.Matrix4(),
  _alignQuat = new THREE.Quaternion(),
  _tiltQuat = new THREE.Quaternion(),
  _lookQuat = new THREE.Quaternion(),
  _AXIS_Y = new THREE.Vector3(0, 1, 0),
  _AXIS_Z = new THREE.Vector3(0, 0, 1),
  _viewDir = new THREE.Vector3(),
  _camForward = new THREE.Vector3(),
  _targetQuat = new THREE.Quaternion(),
  _flightTo = new THREE.Vector3(),
  FLIGHT_SMOOTH_TIME = 1.1,
  FLIGHT_ARC_FRAC = 0.16,
  ORIENT_FOLLOW_RATE = 4.2,
  resolveWordProgress = (line, timeline, now) => {
    if (timeline.length === 0) return 0;
    const renderEndTime = getLineRenderEndTime(line);
    if (now >= renderEndTime) return 1;
    if (now <= line.startTime) return 0;
    let revealed = 0;
    for (let i = 0; i < timeline.length; i += 1) {
      const timing = timeline[i];
      if (now >= timing.endTime) revealed = i + 1;
      else if (now >= timing.startTime) {
        const span = Math.max(timing.endTime - timing.startTime, 1e-3);
        revealed = i + clamp01((now - timing.startTime) / span);
        break;
      } else break;
    }
    return revealed / timeline.length;
  },
  CameraRig = ({
    currentTime,
    sequencer,
    globalIndex,
    activeLineWidthRef,
    motion,
    transitionEpoch,
  }) => {
    var _a;
    const flightRef = useRef({
        flying: !1,
        epoch: 0,
        start: 0,
        perp: new THREE.Vector3(),
        side: 1,
        flightLen: 1,
      }),
      posRef = useRef(new THREE.Vector3(0, 0.6, 9)),
      posVelRef = useRef(new THREE.Vector3(0, 0, 0)),
      lookRef = useRef(new THREE.Vector3(0, 0, -10)),
      lookVelRef = useRef(new THREE.Vector3(0, 0, 0)),
      alignRef = useRef(0),
      alignQuatRef = useRef(new THREE.Quaternion()),
      alignQuatInitRef = useRef(!1),
      orientRef = useRef(new THREE.Quaternion()),
      orientInitRef = useRef(!1),
      resolved = useMemo(() => resolveGlobal(sequencer, globalIndex), [sequencer, globalIndex]),
      line = (_a = resolved == null ? void 0 : resolved.line) != null ? _a : null,
      timeline = useMemo(() => (line ? buildLineGraphemeTimeline(line) : []), [line]),
      shotKind = useMemo(
        () =>
          resolved
            ? getDioramaShot(
                resolved.localIndex,
                resolved.segment.lines,
                resolved.segment.seed,
                motion.subMode
              )
            : 'hold',
        [resolved, motion.subMode]
      ),
      placement = useMemo(() => {
        var _a2;
        return getDioramaTextPlacement(
          (_a2 = resolved == null ? void 0 : resolved.localIndex) != null ? _a2 : 0,
          resolved == null ? void 0 : resolved.segment.seed,
          motion.weaveScale
        );
      }, [resolved, motion.weaveScale]);
    return (
      useFrame((state, delta) => {
        var _a2, _b;
        if (!resolved) return;
        const now = currentTime.get(),
          wordProgress = line ? resolveWordProgress(line, timeline, now) : 0;
        let progress = line ? 1 : 0;
        if (line) {
          const span = getLineRenderEndTime(line) - line.startTime;
          progress =
            span > 0 ? clamp01((now - line.startTime) / span) : now >= line.startTime ? 1 : 0;
        }
        const camera = state.camera,
          aspect = camera.isPerspectiveCamera ? camera.aspect : 1,
          fov = camera.isPerspectiveCamera ? camera.fov : 55,
          visibleHalf =
            frameHalfWidth(DIORAMA_HERO_DISTANCE, fov, aspect) * DIORAMA_SAFE_FRAME_FRACTION,
          frame = resolved ? resolved.frame : getFrame([], 0),
          R = frame.right,
          U = frame.up,
          F = frame.forward,
          settle = line ? resolveHoldSettle(now - getLineRenderEndTime(line)) : 1,
          truck =
            resolveReadHeadTruck(wordProgress, activeLineWidthRef.current, visibleHalf) * settle,
          headR = placement.offsetR + truck,
          headU = placement.offsetU,
          baseX = frame.position.x + R.x * headR + U.x * headU,
          baseY = frame.position.y + R.y * headR + U.y * headU,
          baseZ = frame.position.z + R.z * headR + U.z * headU,
          shotSeed = resolved == null ? void 0 : resolved.segment.seed,
          shot = resolveShotOffset(shotKind, {
            progress,
            wordProgress,
            hero: DIORAMA_HERO_DISTANCE,
            lift: DIORAMA_CAMERA_LIFT,
            seed: shotSeed,
            lineIndex: (_a2 = resolved == null ? void 0 : resolved.localIndex) != null ? _a2 : 0,
            moveScale: motion.moveScale * settle,
          }),
          drift = resolveCameraDrift(now, shotSeed, motion.driftScale),
          offRight = shot.right + drift.swayX,
          offUp = shot.up + drift.swayY + drift.lift,
          offBack = shot.back + drift.dist,
          poseX = baseX + R.x * offRight + U.x * offUp - F.x * offBack,
          poseY = baseY + R.y * offRight + U.y * offUp - F.y * offBack,
          poseZ = baseZ + R.z * offRight + U.z * offUp - F.z * offBack,
          flight = flightRef.current;
        if (transitionEpoch !== flight.epoch && transitionEpoch > 0) {
          ((flight.epoch = transitionEpoch),
            (flight.flying = !0),
            (flight.start = state.clock.elapsedTime),
            _flightTo.set(poseX, poseY, poseZ));
          const perp = flightPerp(posRef.current, _flightTo);
          (flight.perp.set(perp.x, perp.y, perp.z),
            (flight.side = flightSide(shotSeed, transitionEpoch)),
            (flight.flightLen = posRef.current.distanceTo(_flightTo)));
        }
        let flying = !1,
          te = 1;
        flight.flying &&
          ((te = (state.clock.elapsedTime - flight.start) / TRANSITION_DURATION),
          te >= 1 ? (flight.flying = !1) : (flying = !0));
        const followSmooth = flying
            ? FLIGHT_SMOOTH_TIME + (motion.smoothTime - FLIGHT_SMOOTH_TIME) * transitionEase(te)
            : motion.smoothTime,
          swayEnv = flying ? Math.sin(Math.PI * te) ** 2 : 0,
          arcMag = swayEnv * flight.flightLen * FLIGHT_ARC_FRAC,
          sweepMag = swayEnv * flight.flightLen * TRANSITION_AIM_SWEEP * flight.side,
          bank = swayEnv * TRANSITION_BANK * flight.side,
          posGap = Math.hypot(
            poseX - posRef.current.x,
            poseY - posRef.current.y,
            poseZ - posRef.current.z
          ),
          snapped = !flying && posGap > DIORAMA_SNAP_DISTANCE;
        if (snapped) (posRef.current.set(poseX, poseY, poseZ), posVelRef.current.set(0, 0, 0));
        else {
          const sx = smoothDamp(posRef.current.x, poseX, posVelRef.current.x, followSmooth, delta),
            sy = smoothDamp(posRef.current.y, poseY, posVelRef.current.y, followSmooth, delta),
            sz = smoothDamp(posRef.current.z, poseZ, posVelRef.current.z, followSmooth, delta);
          (posRef.current.set(sx.value, sy.value, sz.value),
            posVelRef.current.set(sx.velocity, sy.velocity, sz.velocity));
        }
        camera.position.set(
          posRef.current.x + flight.perp.x * arcMag,
          posRef.current.y + flight.perp.y * arcMag + arcMag * 0.5,
          posRef.current.z + flight.perp.z * arcMag
        );
        const lookOff = placement.lookR * settle,
          lookX = baseX + R.x * lookOff + flight.perp.x * sweepMag,
          lookY = baseY + R.y * lookOff + flight.perp.y * sweepMag,
          lookZ = baseZ + R.z * lookOff + flight.perp.z * sweepMag,
          lookGap = Math.hypot(
            lookX - lookRef.current.x,
            lookY - lookRef.current.y,
            lookZ - lookRef.current.z
          );
        if (!flying && lookGap > DIORAMA_SNAP_DISTANCE)
          (lookRef.current.set(lookX, lookY, lookZ), lookVelRef.current.set(0, 0, 0));
        else {
          const lx = smoothDamp(
              lookRef.current.x,
              lookX,
              lookVelRef.current.x,
              followSmooth,
              delta
            ),
            ly = smoothDamp(lookRef.current.y, lookY, lookVelRef.current.y, followSmooth, delta),
            lz = smoothDamp(lookRef.current.z, lookZ, lookVelRef.current.z, followSmooth, delta);
          (lookRef.current.set(lx.value, ly.value, lz.value),
            lookVelRef.current.set(lx.velocity, ly.velocity, lz.velocity));
        }
        (camera.up.copy(UP),
          camera.lookAt(lookRef.current),
          _alignRight.set(R.x, R.y, R.z),
          _alignUp.set(U.x, U.y, U.z),
          _alignFwd.set(-F.x, -F.y, -F.z),
          _alignMatrix.makeBasis(_alignRight, _alignUp, _alignFwd),
          _alignQuat.setFromRotationMatrix(_alignMatrix),
          placement.yaw !== 0 &&
            _alignQuat.multiply(_tiltQuat.setFromAxisAngle(_AXIS_Y, placement.yaw)),
          placement.roll !== 0 &&
            _alignQuat.multiply(_tiltQuat.setFromAxisAngle(_AXIS_Z, placement.roll)),
          snapped || !alignQuatInitRef.current
            ? (alignQuatRef.current.copy(_alignQuat), (alignQuatInitRef.current = !0))
            : alignQuatRef.current.slerp(_alignQuat, 1 - Math.exp(-ALIGN_TURN_RATE * delta)));
        let readTarget = 0;
        if (line) {
          const renderEnd = getLineRenderEndTime(line),
            rampIn = smoothstep01(
              (now - (line.startTime - ALIGN_LEAD_IN)) / (ALIGN_LEAD_IN + ALIGN_SETTLE)
            ),
            rampOut = 1 - smoothstep01((now - renderEnd) / ALIGN_RELEASE);
          readTarget =
            Math.min(rampIn, rampOut) * ((_b = ALIGN_SHOT_CEILING[shotKind]) != null ? _b : 0.7);
        }
        ((alignRef.current +=
          (readTarget - alignRef.current) * (1 - Math.exp(-ALIGN_RATE * delta))),
          _lookQuat.copy(camera.quaternion),
          _targetQuat.copy(_lookQuat).slerp(alignQuatRef.current, alignRef.current),
          _viewDir.subVectors(lookRef.current, camera.position).normalize(),
          _camForward.set(0, 0, -1).applyQuaternion(_targetQuat));
        const offAxisAngle = _camForward.angleTo(_viewDir),
          halfV = THREE.MathUtils.degToRad(fov) / 2,
          halfH = Math.atan(Math.tan(halfV) * aspect),
          maxOffAxis = Math.min(halfV, halfH) * FRAME_KEEP_FRACTION;
        (offAxisAngle > maxOffAxis && _targetQuat.slerp(_lookQuat, 1 - maxOffAxis / offAxisAngle),
          snapped || !orientInitRef.current
            ? (orientRef.current.copy(_targetQuat), (orientInitRef.current = !0))
            : orientRef.current.slerp(_targetQuat, 1 - Math.exp(-ORIENT_FOLLOW_RATE * delta)),
          camera.quaternion.copy(orientRef.current),
          bank !== 0 && camera.rotateZ(bank));
      }),
      null
    );
  };
var stdin_default = CameraRig;
export { stdin_default as default };
