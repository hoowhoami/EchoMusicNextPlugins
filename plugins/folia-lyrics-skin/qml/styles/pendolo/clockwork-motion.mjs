// Derived from Folia a8da4437 (AGPL-3.0-only). See pendolo-reference.md.
const createPendoloClockworkMotionState = () => ({
  phase: 0,
  smoothedBass: 0.15,
  secondGearElapsed: 0,
  secondGearStep: 0,
  secondGearAngle: 0,
  secondGearVelocity: 0,
  balanceDirection: 1,
  balanceAmplitude: 0,
  balanceAngle: 0,
  balanceVelocity: 0,
  transBeatTarget: 0,
  transBeatAngle: 0,
  transBeatVelocity: 0,
});
const TRANS_TEETH = 24;
const SECOND_TEETH = 15;
const BEAT_GEAR_STIFFNESS = 260;
const BEAT_GEAR_DAMPING = 19;
const SWING_BASE = 0.25;
const SWING_GAIN = 0.6;
const SWING_STIFFNESS = 140;
const SWING_DAMPING = 9;
const normalizePendoloBass = (value) => {
  const norm = value > 1 ? value / 255 : value;
  return Math.max(0, Math.min(1, norm));
};
const stepPendoloClockworkMotion = (state, dt, rawBass, paused, profile, beat) => {
  const clampedBass = normalizePendoloBass(rawBass);
  state.smoothedBass +=
    (clampedBass - state.smoothedBass) * Math.min(0.24, 0.12 * profile.bassResponseMultiplier);
  const bass = state.smoothedBass;
  if (!paused) {
    state.phase +=
      dt * (2.8 + bass * 3.5 * profile.bassResponseMultiplier) * profile.balanceSpeedMultiplier;
    if (beat) {
      if (beat.downbeats > 0) {
        state.transBeatTarget += Math.PI * 2;
        state.secondGearStep -= SECOND_TEETH;
      } else if (beat.beats > 0) {
        state.transBeatTarget += (Math.PI * 2) / TRANS_TEETH;
        state.secondGearStep -= 1;
      }
      const secondTarget = state.secondGearStep * ((Math.PI * 2) / SECOND_TEETH);
      const damping = Math.exp(-BEAT_GEAR_DAMPING * dt);
      state.secondGearVelocity += (secondTarget - state.secondGearAngle) * BEAT_GEAR_STIFFNESS * dt;
      state.secondGearVelocity *= damping;
      state.secondGearAngle += state.secondGearVelocity * dt;
      state.transBeatVelocity +=
        (state.transBeatTarget - state.transBeatAngle) * BEAT_GEAR_STIFFNESS * dt;
      state.transBeatVelocity *= damping;
      state.transBeatAngle += state.transBeatVelocity * dt;
      if (beat.beats > 0 || beat.downbeats > 0) {
        state.balanceDirection = -state.balanceDirection;
        const gain = beat.downbeats > 0 ? beat.downbeatGain : beat.beatGain;
        state.balanceAmplitude =
          (SWING_BASE + SWING_GAIN * Math.min(1, gain)) * profile.balanceAmplitudeMultiplier;
      }
      const target = state.balanceDirection * state.balanceAmplitude;
      state.balanceVelocity += (target - state.balanceAngle) * SWING_STIFFNESS * dt;
      state.balanceVelocity *= Math.exp(-SWING_DAMPING * dt);
      state.balanceAngle += state.balanceVelocity * dt;
    } else {
      state.secondGearElapsed += dt;
      const completedSteps = Math.floor(state.secondGearElapsed);
      if (completedSteps > 0) {
        state.secondGearStep += completedSteps;
        state.secondGearElapsed -= completedSteps;
      }
      const secondGearTarget = state.secondGearStep * ((Math.PI * 2) / 15);
      const displacement = secondGearTarget - state.secondGearAngle;
      state.secondGearVelocity += displacement * 92 * profile.escapementSpringMultiplier * dt;
      state.secondGearVelocity *= Math.exp(-13 * profile.escapementDampingMultiplier * dt);
      state.secondGearAngle += state.secondGearVelocity * dt;
    }
  }
  const bassOscillation = beat
    ? state.balanceAngle
    : Math.sin(state.phase) *
      (0.15 + bass * 0.7 * profile.bassResponseMultiplier) *
      profile.balanceAmplitudeMultiplier;
  return {
    bass,
    bassOscillation,
    secondGearAngle: state.secondGearAngle,
    transBeatAngle: beat ? state.transBeatAngle : 0,
    phase: state.phase,
  };
};
export { createPendoloClockworkMotionState, normalizePendoloBass, stepPendoloClockworkMotion };
