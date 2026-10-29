// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty,
  __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
      : (obj[key] = value),
  __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  };
import { DEFAULT_DIORAMA_TUNING } from './defaults.mjs';
const DIORAMA_STEP_DISTANCE = 8,
  DIORAMA_MAX_YAW = 0.5,
  DIORAMA_MAX_PITCH = 0.32,
  DIORAMA_HERO_DISTANCE = 5.2,
  DIORAMA_CAMERA_LIFT = 0.5,
  DIORAMA_SAFE_FRAME_FRACTION = 0.92,
  DIORAMA_SWAY_AMP = 0.4,
  DIORAMA_LIFT_AMP = 0.4,
  DIORAMA_DIST_AMP = 0.5,
  DIORAMA_SNAP_DISTANCE = 24,
  DIORAMA_TEXT_OFFSET_R = 1.8,
  DIORAMA_TEXT_OFFSET_U = 1.2,
  DIORAMA_TEXT_ROLL = 0.2,
  DIORAMA_TEXT_YAW = 0.16,
  DIORAMA_TEXT_LOOK = 1.1,
  DIORAMA_SHAPE_FADE_IN_START = 20,
  DIORAMA_SHAPE_FADE_IN_END = 27,
  DIORAMA_SHAPE_DISSOLVE_START = 3,
  DIORAMA_SHAPE_DISSOLVE_END = 1.2,
  DEG_TO_RAD = Math.PI / 180,
  clamp01 = (value) => Math.min(1, Math.max(0, value)),
  clamp = (value, min, max) => Math.min(max, Math.max(min, value)),
  vsub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  vcross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  vnorm = (a) => {
    const len = Math.hypot(a.x, a.y, a.z) || 1;
    return { x: a.x / len, y: a.y / len, z: a.z / len };
  },
  vadd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  seededUnit = (seed) => {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  },
  hashSeed = (seed) => {
    if (typeof seed == 'number') return seed;
    if (!seed) return 1;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 1e5;
    return hash || 1;
  },
  smoothDamp = (current, target, velocity, smoothTime, deltaSeconds) => {
    const omega = 2 / Math.max(1e-4, smoothTime),
      x = omega * deltaSeconds,
      exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x),
      change = current - target,
      temp = (velocity + omega * change) * deltaSeconds,
      newVelocity = (velocity - omega * temp) * exp;
    return { value: target + (change + temp) * exp, velocity: newVelocity };
  },
  frameHalfWidth = (distance, verticalFovDeg, aspect) =>
    distance * Math.tan((verticalFovDeg * DEG_TO_RAD) / 2) * aspect,
  DIORAMA_SUB_MODE_PRESETS = {
    normal: { move: 1, drift: 0.62, smooth: 0.42, audio: 1, weave: 1 },
    calm: { move: 0.6, drift: 0.4, smooth: 0.56, audio: 0.5, weave: 0.5 },
    chaotic: { move: 1.35, drift: 0.85, smooth: 0.33, audio: 1.35, weave: 1.35 },
  },
  resolveDioramaMotionParams = (tuning, themeIntensity) => {
    const t = tuning != null ? tuning : DEFAULT_DIORAMA_TUNING,
      mode =
        themeIntensity === 'calm' ? 'calm' : themeIntensity === 'chaotic' ? 'chaotic' : 'normal',
      preset = DIORAMA_SUB_MODE_PRESETS[mode],
      motion = clamp(t.motionAmount, 0.4, 1.6),
      speed = clamp(t.cameraSpeed, 0.55, 1.85),
      audio = clamp(t.audioReactivity, 0, 1.5);
    return {
      moveScale: preset.move * motion,
      driftScale: preset.drift * motion,
      smoothTime: preset.smooth / speed,
      audioLevel: preset.audio * audio,
      weaveScale: preset.weave * motion,
      subMode: mode,
    };
  },
  WORLD_UP = { x: 0, y: 1, z: 0 },
  DEFAULT_FRAME = {
    position: { x: 0, y: 0, z: 0 },
    forward: { x: 0, y: 0, z: -1 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
  },
  buildDioramaPath = (count, seed) => {
    const base = hashSeed(seed),
      n = Math.max(count, 1),
      positions = [];
    let pos = { x: 0, y: 0, z: 0 };
    for (let i = 0; i <= n; i += 1) {
      positions.push(__spreadValues({}, pos));
      const yaw =
          DIORAMA_MAX_YAW *
          (Math.sin(i * 0.23 + base * 0.017) * 0.62 +
            Math.sin(i * 0.11 + base * 0.041 + 1.3) * 0.38),
        pitch = DIORAMA_MAX_PITCH * Math.sin(i * 0.17 + base * 0.029 + 0.7),
        cp = Math.cos(pitch),
        dir = { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp };
      pos = {
        x: pos.x + dir.x * DIORAMA_STEP_DISTANCE,
        y: pos.y + dir.y * DIORAMA_STEP_DISTANCE,
        z: pos.z + dir.z * DIORAMA_STEP_DISTANCE,
      };
    }
    const frames = [];
    for (let i = 0; i < n; i += 1) {
      const forward = vnorm(vsub(positions[i + 1], positions[i])),
        right = vnorm(vcross(forward, WORLD_UP)),
        up = vnorm(vcross(right, forward));
      frames.push({ position: positions[i], forward, right, up });
    }
    return frames;
  },
  getFrame = (frames, index) => {
    var _a;
    if (frames.length === 0) return DEFAULT_FRAME;
    const i = Math.min(Math.max(index, 0), frames.length - 1);
    return (_a = frames[i]) != null ? _a : DEFAULT_FRAME;
  },
  translateFrames = (frames, offset) =>
    frames.map((f) => ({
      position: vadd(f.position, offset),
      forward: f.forward,
      right: f.right,
      up: f.up,
    })),
  composeLocal = (frame, right, up, depth) => ({
    x: frame.position.x + frame.right.x * right + frame.up.x * up + frame.forward.x * depth,
    y: frame.position.y + frame.right.y * right + frame.up.y * up + frame.forward.y * depth,
    z: frame.position.z + frame.right.z * right + frame.up.z * up + frame.forward.z * depth,
  }),
  resolveReadHeadTruck = (wordProgress, trackWidth, visibleHalfWidth) => {
    if (trackWidth <= 0) return 0;
    const wordOffset = (clamp01(wordProgress) - 0.5) * trackWidth,
      allowed = Math.max(Math.abs(visibleHalfWidth - trackWidth / 2), 1e-3);
    return allowed * Math.tanh(wordOffset / allowed);
  },
  getDioramaTextPlacement = (lineIndex, seed, weave = 1) => {
    const base = hashSeed(seed),
      i = Math.max(lineIndex, 0),
      jitterR = (seededUnit(base + i * 11 + 2) - 0.5) * 0.6,
      jitterU = (seededUnit(base + i * 11 + 4) - 0.5) * 0.6,
      wanderR = Math.sin(i * 0.47 + base * 0.019) * 0.7 + jitterR,
      wanderU = Math.sin(i * 0.29 + base * 0.027 + 0.9) * 0.7 + jitterU;
    return {
      offsetR: wanderR * DIORAMA_TEXT_OFFSET_R * weave,
      offsetU: wanderU * DIORAMA_TEXT_OFFSET_U * weave,
      scale: 0.82 + seededUnit(base + i * 11 + 5) * 0.46,
      roll: (seededUnit(base + i * 11 + 6) - 0.5) * 2 * DIORAMA_TEXT_ROLL * weave,
      yaw: (seededUnit(base + i * 11 + 7) - 0.5) * 2 * DIORAMA_TEXT_YAW * weave,
      lookR: (seededUnit(base + i * 11 + 8) - 0.5) * 2 * DIORAMA_TEXT_LOOK * weave,
    };
  },
  SHOT_KINDS = [
    'pushIn',
    'pullBack',
    'orbit',
    'track',
    'crane',
    'hold',
    'swell',
    'spiral',
    'pendulum',
    'flyby',
    'arc',
    'float',
    'glide',
  ],
  easeInOut = (p) => {
    const c = clamp01(p);
    return c * c * (3 - 2 * c);
  },
  CHORUS_PART = /chorus|hook|refrain|drop/i,
  getShotDir = (lineIndex, seed) => (seededUnit(hashSeed(seed) + lineIndex * 7 + 3) < 0.5 ? -1 : 1),
  getLineNoteProfile = (line) => {
    var _a;
    let maxNote = 0,
      sum = 0,
      noteCount = 0;
    for (const word of (_a = line == null ? void 0 : line.words) != null ? _a : []) {
      const d = word.endTime - word.startTime;
      d > 0 && ((maxNote = Math.max(maxNote, d)), (sum += d), (noteCount += 1));
    }
    return { maxNote, avgNote: noteCount > 0 ? sum / noteCount : 0, noteCount };
  },
  computeShotWeights = (lineIndex, lines, subMode = 'normal') => {
    var _a, _b, _c, _d, _e;
    const line = lines[lineIndex],
      prev = lineIndex > 0 ? lines[lineIndex - 1] : void 0,
      wordCount =
        (_b = (_a = line == null ? void 0 : line.words) == null ? void 0 : _a.length) != null
          ? _b
          : 0,
      isChorus =
        !!(line != null && line.isChorus) ||
        CHORUS_PART.test((_c = line == null ? void 0 : line.songPart) != null ? _c : ''),
      sectionStart =
        !!line &&
        !!prev &&
        (line.blockIndex !== prev.blockIndex ||
          ((_d = line.songPart) != null ? _d : '') !== ((_e = prev.songPart) != null ? _e : '')),
      { maxNote, avgNote, noteCount } = getLineNoteProfile(line),
      hasLongNote = maxNote >= 1.3,
      staccato = noteCount >= 4 && avgNote > 0 && avgNote <= 0.34,
      w = {
        pushIn: 1,
        pullBack: 1,
        orbit: 1,
        track: 1,
        crane: 1,
        hold: 1,
        swell: 0.85,
        spiral: 0.9,
        pendulum: 1,
        flyby: 0.9,
        arc: 1,
        float: 0.9,
        glide: 1,
      };
    return (
      isChorus
        ? ((w.orbit += 2.4),
          (w.pushIn += 1.8),
          (w.spiral += 1.2),
          (w.crane += 0.8),
          (w.flyby += 0.6),
          (w.arc += 1),
          (w.glide += 0.6),
          (w.hold -= 0.6),
          (w.track -= 0.2))
        : ((w.track += 1.1),
          (w.crane += 0.9),
          (w.hold += 0.9),
          (w.pendulum += 0.8),
          (w.float += 0.8),
          (w.glide += 0.6),
          (w.arc += 0.4)),
      wordCount >= 8
        ? ((w.track += 1.6), (w.pullBack += 1), (w.orbit -= 0.4), (w.pushIn -= 0.3))
        : wordCount <= 3 &&
          ((w.pushIn += 1.4), (w.orbit += 0.9), (w.hold += 0.5), (w.track -= 0.8)),
      sectionStart && ((w.pullBack += 2.2), (w.crane += 1.4), (w.glide += 1), (w.pushIn -= 0.4)),
      hasLongNote &&
        ((w.swell += 2.4),
        (w.spiral += 1),
        (w.float += 1.2),
        (w.pendulum += 0.6),
        (w.orbit += 0.8),
        (w.arc += 0.6),
        (w.hold += 0.3),
        (w.track -= 0.5)),
      staccato &&
        ((w.track += 1.4),
        (w.flyby += 1.5),
        (w.pushIn += 0.8),
        (w.swell -= 1.6),
        (w.hold -= 0.8),
        (w.crane -= 0.4)),
      subMode === 'calm'
        ? ((w.hold += 1.4),
          (w.float += 1.3),
          (w.swell += 0.9),
          (w.glide += 0.8),
          (w.arc += 0.5),
          (w.crane += 0.4),
          (w.orbit *= 0.4),
          (w.spiral *= 0.35),
          (w.flyby *= 0.3),
          (w.pendulum *= 0.5),
          (w.pushIn *= 0.7))
        : subMode === 'chaotic' &&
          ((w.orbit += 1.3),
          (w.spiral += 1.3),
          (w.flyby += 1.2),
          (w.pendulum += 1),
          (w.pushIn += 0.8),
          (w.arc += 0.6),
          (w.crane += 0.4),
          (w.hold *= 0.35),
          (w.float *= 0.55),
          (w.swell *= 0.7)),
      SHOT_KINDS.forEach((key) => {
        w[key] = Math.max(0.05, w[key]);
      }),
      w
    );
  },
  weightedPickShot = (weights, u) => {
    const total = SHOT_KINDS.reduce((sum, k) => sum + weights[k], 0);
    let acc = clamp01(u) * total;
    for (const k of SHOT_KINDS) if (((acc -= weights[k]), acc <= 0)) return k;
    return 'hold';
  },
  basePickShot = (lineIndex, lines, seed, subMode = 'normal') => {
    if (!lines[lineIndex]) return 'hold';
    const u = seededUnit(hashSeed(seed) + lineIndex * 101 + 7);
    return weightedPickShot(computeShotWeights(lineIndex, lines, subMode), u);
  },
  getDioramaShot = (lineIndex, lines, seed, subMode = 'normal') => {
    const pick = basePickShot(lineIndex, lines, seed, subMode),
      prev1 = lineIndex > 0 ? basePickShot(lineIndex - 1, lines, seed, subMode) : null,
      prev2 = lineIndex > 1 ? basePickShot(lineIndex - 2, lines, seed, subMode) : null;
    if (pick === prev1 || pick === prev2) {
      const others = SHOT_KINDS.filter((k) => k !== pick && k !== prev1 && k !== prev2),
        pool = others.length > 0 ? others : SHOT_KINDS.filter((k) => k !== pick),
        alt = seededUnit(hashSeed(seed) + lineIndex * 53 + 19);
      return pool[Math.floor(clamp01(alt) * pool.length) % pool.length];
    }
    return pick;
  },
  resolveShotOffset = (kind, ctx) => {
    const { hero, lift, seed, lineIndex } = ctx,
      e = easeInOut(ctx.progress),
      dir = getShotDir(lineIndex, seed);
    let right = 0,
      up = lift,
      back = hero;
    switch (kind) {
      case 'pushIn':
        ((back = hero * (1.5 - 0.8 * e)), (up = lift * (1.2 - 0.5 * e) + 0.15));
        break;
      case 'pullBack':
        ((back = hero * (0.85 + 1.15 * e)), (up = lift + 1.7 * e));
        break;
      case 'orbit': {
        const theta = dir * 0.55 * (2 * e - 1);
        ((right = hero * Math.sin(theta)), (back = hero * Math.cos(theta)), (up = lift + 0.4));
        break;
      }
      case 'track':
        ((right = dir * hero * 0.34 * Math.sin(Math.PI * clamp01(ctx.wordProgress))),
          (back = hero * 1.06),
          (up = lift + 0.12));
        break;
      case 'crane': {
        const from = dir > 0 ? -1.5 : 2.4,
          to = dir > 0 ? 2.4 : -1.4;
        ((up = from + (to - from) * e), (back = hero * 1.05));
        break;
      }
      case 'swell': {
        const theta = dir * 0.4 * e;
        ((right = hero * Math.sin(theta) * 1.1),
          (back = hero * (1 + 0.35 * e)),
          (up = lift + 1.2 * e + 0.3));
        break;
      }
      case 'spiral': {
        const theta = dir * 0.7 * (2 * e - 1);
        ((right = hero * Math.sin(theta) * 0.85),
          (back = hero * (1.05 - 0.1 * e)),
          (up = lift - 0.8 + 2.4 * e));
        break;
      }
      case 'pendulum': {
        ((right = dir * hero * 0.45 * (2 * e - 1)),
          (up = lift + 0.9 - 0.9 * Math.sin(Math.PI * e)),
          (back = hero * 1.02));
        break;
      }
      case 'flyby': {
        ((right = dir * hero * (0.7 - 1.4 * e)),
          (back = hero * (0.78 + 0.12 * Math.sin(Math.PI * e))),
          (up = lift + 0.05));
        break;
      }
      case 'arc': {
        const theta = dir * 0.5 * Math.sin(Math.PI * e);
        ((right = hero * Math.sin(theta) * 1.3),
          (back = hero * (1.05 + 0.12 * (1 - Math.cos(theta)))),
          (up = lift + 0.5 * Math.sin(Math.PI * e)));
        break;
      }
      case 'float': {
        ((right = dir * hero * 0.16 * Math.sin(e * Math.PI * 2)),
          (up = lift + 0.6 + 0.5 * Math.sin(e * Math.PI * 2 + 1)),
          (back = hero * (1.05 + 0.06 * Math.sin(e * Math.PI))));
        break;
      }
      case 'glide': {
        ((right = dir * hero * 0.22 * e), (up = lift + 1.4 * e), (back = hero * (1.15 - 0.25 * e)));
        break;
      }
      default:
        ((up = lift + 0.3 * Math.sin(ctx.progress * Math.PI)), (back = hero));
        break;
    }
    const m = ctx.moveScale;
    return {
      right: right * m,
      up: lift + (up - lift) * m,
      back: hero + (back - hero) * m,
    };
  },
  HOLD_SETTLE_DELAY = 3,
  HOLD_SETTLE_EASE = 5,
  resolveHoldSettle = (secondsHeld) => {
    const t = clamp01((secondsHeld - HOLD_SETTLE_DELAY) / HOLD_SETTLE_EASE);
    return 1 - t * t * (3 - 2 * t);
  },
  resolveCameraDrift = (time, seed, scale) => {
    const ph = hashSeed(seed) * 0.017;
    return {
      swayX:
        (Math.sin(time * 0.11 + ph) * 0.6 + Math.sin(time * 0.047 + ph * 1.7) * 0.4) *
        DIORAMA_SWAY_AMP *
        scale,
      swayY: Math.sin(time * 0.09 + ph * 0.7) * DIORAMA_SWAY_AMP * 0.5 * scale,
      lift:
        (Math.sin(time * 0.13 + ph * 1.3) * 0.6 + Math.sin(time * 0.061 + ph * 2.1) * 0.4) *
        DIORAMA_LIFT_AMP *
        scale,
      dist: Math.sin(time * 0.05 + ph * 1.1) * DIORAMA_DIST_AMP * scale,
    };
  },
  DIORAMA_PARTICLE_AUDIO_SCALE_MAX = 1.44,
  getSpecClearanceRadius = (spec) => {
    const familyRadius =
      spec.kind === 'box' ? 0.5 : spec.kind === 'sphere' ? 0.74 : spec.kind === 'cone' ? 0.68 : 0.9;
    return spec.scale * Math.max(familyRadius, spec.stretchY * 0.55);
  },
  separateSpecs = (specs) => {
    for (let iter = 0; iter < 6; iter += 1)
      for (let a = 0; a < specs.length; a += 1)
        for (let b = a + 1; b < specs.length; b += 1) {
          const A = specs[a],
            B = specs[b],
            minDist = (getSpecClearanceRadius(A) + getSpecClearanceRadius(B)) * 1.3;
          let dr = B.r - A.r,
            du = B.u - A.u,
            dd = B.d - A.d,
            dist = Math.hypot(dr, du, dd);
          if (dist >= minDist) continue;
          dist < 1e-3 && ((dr = 1), (du = 0.5), (dd = 0.25), (dist = Math.hypot(dr, du, dd)));
          const push = (minDist - dist) / 2 / dist;
          ((A.r -= dr * push),
            (A.u -= du * push),
            (A.d -= dd * push),
            (B.r += dr * push),
            (B.u += du * push),
            (B.d += dd * push));
        }
    specs.forEach((s) => {
      s.d = Math.max(s.d, 1);
    });
  },
  TEXT_CLEAR_LATERAL = 5.2,
  TEXT_CLEAR_VERTICAL = 1.4,
  enforceTextClearance = (specs) => {
    specs.forEach((s, i) => {
      const radius = getSpecClearanceRadius(s) * DIORAMA_PARTICLE_AUDIO_SCALE_MAX;
      if (
        Math.abs(s.u) - radius < TEXT_CLEAR_VERTICAL &&
        Math.abs(s.r) - radius < TEXT_CLEAR_LATERAL
      ) {
        const side = s.r === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(s.r);
        s.r = side * (TEXT_CLEAR_LATERAL + radius + 0.35);
      }
    });
  },
  enforceRailClearance = (specs) => {
    specs.forEach((s, i) => {
      const minimum = 2.8 + getSpecClearanceRadius(s) * DIORAMA_PARTICLE_AUDIO_SCALE_MAX,
        distance = Math.hypot(s.r, s.u);
      if (distance >= minimum) return;
      const fallbackAngle = (i % 2 === 0 ? 1 : -1) * Math.PI * 0.16,
        directionR = distance > 1e-3 ? s.r / distance : Math.cos(fallbackAngle),
        directionU = distance > 1e-3 ? s.u / distance : Math.sin(fallbackAngle);
      ((s.r = directionR * minimum), (s.u = directionU * minimum));
    });
  },
  buildFormation = (lineIndex, seed, shot, frame, placement, volumeScale = 1) => {
    const salt = hashSeed(seed) + lineIndex * 97,
      rnd = (k) => seededUnit(salt + k),
      dir = getShotDir(lineIndex, seed),
      specs = [],
      safeVolumeScale = Math.min(1.6, Math.max(0.65, volumeScale)),
      add = (kind, r, u, d, scale, stretchY = 1, colorSlot) => {
        specs.push({
          kind,
          r,
          u,
          d,
          scale: scale * safeVolumeScale,
          stretchY,
          upright: stretchY > 1.2,
          colorSlot,
        });
      },
      addPair = (kind, lateral, u, d, scale, stretchY = 1, colorSlot = 0) => {
        (add(kind, -Math.abs(lateral), u, d, scale, stretchY, colorSlot),
          add(kind, Math.abs(lateral), u, d, scale, stretchY, colorSlot));
      };
    switch (shot) {
      case 'orbit': {
        const radius = 4.4 + rnd(1) * 0.6;
        for (let j = 0; j < 6; j += 1) {
          const a = (j / 6) * Math.PI * 2 + rnd(2) * 0.6;
          add(
            j === 0 ? 'torus' : 'sphere',
            Math.cos(a) * radius,
            Math.sin(a) * radius,
            0.6 + rnd(10 + j) * 1.4,
            0.42 + rnd(20 + j) * 0.32
          );
        }
        break;
      }
      case 'pushIn': {
        const gate = 4.3 + rnd(1) * 0.5;
        [-1, 1].forEach((side, idx) => {
          (add(
            'box',
            side * gate,
            -0.6,
            0.5 + rnd(idx) * 0.5,
            0.55 + rnd(2 + idx) * 0.2,
            2.8 + rnd(6 + idx) * 0.8
          ),
            add(
              'box',
              side * (gate + 1.6),
              0.6,
              4.5 + rnd(3 + idx) * 2,
              0.7 + rnd(4 + idx) * 0.3,
              3.4
            ));
        });
        break;
      }
      case 'track': {
        for (let si = 0; si < 2; si += 1) {
          const side = si === 0 ? -1 : 1;
          for (let j = 0; j < 3; j += 1)
            add(
              'box',
              side * (4.2 + rnd(si * 5 + j) * 0.4),
              -0.4 + (rnd(si * 7 + j) - 0.5) * 0.6,
              0.5 + j * 2.4,
              0.5 + rnd(si * 3 + j) * 0.15,
              2.6 + rnd(si + j) * 0.6
            );
        }
        break;
      }
      case 'crane': {
        const radius = 3.6 + rnd(1) * 0.5;
        for (let j = 0; j < 5; j += 1) {
          const a = Math.PI * (0.15 + 0.7 * (j / 4));
          add(
            'box',
            Math.cos(a) * radius,
            Math.abs(Math.sin(a)) * radius + 1.2,
            0.6 + rnd(30 + j) * 0.8,
            0.45 + rnd(40 + j) * 0.25,
            1.4
          );
        }
        break;
      }
      case 'swell': {
        const lat = 4.2 + rnd(2) * 0.5;
        for (let j = 0; j < 2; j += 1)
          addPair('box', lat, -1.5 + j * 2.1, 1 + j * 1.2, 0.48 - j * 0.06, 1.45, j % 2);
        addPair('sphere', lat, 2.65, 3.4, 0.5, 1, 0);
        break;
      }
      case 'spiral': {
        for (let j = 0; j < 7; j += 1) {
          const frac = j / 6,
            a = dir * frac * Math.PI * 2.2 + rnd(1) * 0.5;
          add(
            'sphere',
            Math.cos(a) * 4.3,
            -2.2 + frac * 5.2,
            0.5 + frac * 2.2,
            0.32 + rnd(20 + j) * 0.2
          );
        }
        break;
      }
      case 'pendulum': {
        for (let j = 0; j < 4; j += 1)
          add(
            'box',
            -3.9 + j * 2.6 + (rnd(j) - 0.5) * 0.5,
            3 + rnd(j * 2) * 1.2,
            0.5 + rnd(j * 3) * 1.2,
            0.3 + rnd(j * 4) * 0.12,
            2.2 + rnd(j * 5) * 0.8
          );
        break;
      }
      case 'flyby': {
        for (let j = 0; j < 3; j += 1)
          addPair(
            'box',
            4.25 + rnd(j) * 0.25,
            -0.45 + j * 0.45,
            1 + j * 2.1,
            0.42 + rnd(j * 3) * 0.1,
            2.2,
            j % 2
          );
        break;
      }
      case 'pullBack': {
        addPair('sphere', 5.8 + rnd(9) * 0.5, 1.25, 6.8 + rnd(11), 1.25 + rnd(12) * 0.25, 1, 0);
        for (let j = 0; j < 2; j += 1)
          addPair(
            j === 0 ? 'box' : 'cone',
            4.4 + j * 1.15,
            -1.4 + j * 2.2,
            2.2 + j * 2.1,
            0.58 + rnd(j * 4) * 0.18,
            j === 0 ? 1.5 : 1,
            1
          );
        break;
      }
      case 'arc': {
        const radius = 5.2 + rnd(1) * 0.6;
        for (let j = 0; j < 5; j += 1) {
          const a = (-0.5 + j / 4) * 1.5 * dir;
          add(
            j === Math.floor(5 / 2) ? 'torus' : 'sphere',
            Math.sin(a) * radius,
            0.3 + Math.cos(a) * 0.7,
            1 + rnd(20 + j) * 1.6,
            0.45 + rnd(30 + j) * 0.32
          );
        }
        break;
      }
      case 'float': {
        for (let j = 0; j < 3; j += 1)
          addPair(
            'sphere',
            4.1 + j * 0.85,
            -1.2 + j * 1.35,
            1.2 + j * 1.55,
            0.42 + rnd(j * 4) * 0.22,
            1,
            j % 2
          );
        break;
      }
      case 'glide': {
        for (let j = 0; j < 3; j += 1)
          addPair(
            'box',
            4.25 + rnd(j) * 0.3,
            -1.5 + j * 1.7,
            1 + j * 1.7,
            0.46 + rnd(j * 2) * 0.12,
            1.85,
            j % 2
          );
        break;
      }
      default: {
        (addPair('torus', 5.6, 1.55, 7.2 + rnd(1), 1.05 + rnd(2) * 0.2, 1, 0),
          addPair('sphere', 4.45, -1.1, 2.1 + rnd(4), 0.58 + rnd(5) * 0.16, 1, 1));
        break;
      }
    }
    return (
      enforceRailClearance(specs),
      enforceTextClearance(specs),
      separateSpecs(specs),
      enforceRailClearance(specs),
      enforceTextClearance(specs),
      specs.map((s, j) => {
        var _a;
        return {
          kind: s.kind,
          position: composeLocal(frame, placement.offsetR + s.r, placement.offsetU + s.u, s.d),
          scale: s.scale,
          stretchY: s.stretchY,
          upright: s.upright,
          spinSpeed: 0.04 + rnd(j * 13 + 5) * 0.1,
          colorSlot: (_a = s.colorSlot) != null ? _a : j % 2,
          layer: s.d > 3.5 ? 'far' : 'near',
        };
      })
    );
  },
  resolveShapeLifeOpacity = (distanceToCamera) => {
    const farT = clamp01(
        (DIORAMA_SHAPE_FADE_IN_END - distanceToCamera) /
          (DIORAMA_SHAPE_FADE_IN_END - DIORAMA_SHAPE_FADE_IN_START)
      ),
      nearT = clamp01(
        (distanceToCamera - DIORAMA_SHAPE_DISSOLVE_END) /
          (DIORAMA_SHAPE_DISSOLVE_START - DIORAMA_SHAPE_DISSOLVE_END)
      ),
      farS = farT * farT * (3 - 2 * farT),
      nearS = nearT * nearT * (3 - 2 * nearT);
    return farS * nearS;
  };
export {
  DIORAMA_CAMERA_LIFT,
  DIORAMA_DIST_AMP,
  DIORAMA_HERO_DISTANCE,
  DIORAMA_LIFT_AMP,
  DIORAMA_MAX_PITCH,
  DIORAMA_MAX_YAW,
  DIORAMA_PARTICLE_AUDIO_SCALE_MAX,
  DIORAMA_SAFE_FRAME_FRACTION,
  DIORAMA_SHAPE_DISSOLVE_END,
  DIORAMA_SHAPE_DISSOLVE_START,
  DIORAMA_SHAPE_FADE_IN_END,
  DIORAMA_SHAPE_FADE_IN_START,
  DIORAMA_SNAP_DISTANCE,
  DIORAMA_STEP_DISTANCE,
  DIORAMA_SWAY_AMP,
  DIORAMA_TEXT_LOOK,
  DIORAMA_TEXT_OFFSET_R,
  DIORAMA_TEXT_OFFSET_U,
  DIORAMA_TEXT_ROLL,
  DIORAMA_TEXT_YAW,
  buildDioramaPath,
  buildFormation,
  composeLocal,
  frameHalfWidth,
  getDioramaShot,
  getDioramaTextPlacement,
  getFrame,
  hashSeed,
  resolveCameraDrift,
  resolveDioramaMotionParams,
  resolveHoldSettle,
  resolveReadHeadTruck,
  resolveShapeLifeOpacity,
  resolveShotOffset,
  seededUnit,
  smoothDamp,
  translateFrames,
};
