var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// plugins/spectrum-visualizer/src/entry.ts
import { awaitOperation } from "echo:plugin-sdk";

// plugins/spectrum-visualizer/src/config.ts
var DEFAULT_SETTINGS = {
  enabled: true,
  showPlayerBar: false,
  showMiniPlayer: false,
  showLyricControls: true,
  showBackdrop: false,
  fps: 15,
  binCount: 64,
  fftSize: 1024,
  smoothing: 72,
  scale: "log",
  mode: "bars",
  palette: "theme",
  fill: 84,
  opacity: 56,
  lyricHeight: 82,
  mistIntensity: 78,
  mistSoftness: 72,
  mistMotion: 42,
  centeredBarWidth: 2,
  hdrHighlights: false,
  hdrIntensity: 45
};
var clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
var normalizeSettings = (value) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q;
  const source = value && typeof value === "object" ? value : {};
  const fps = Math.round(Number((_a = source.fps) != null ? _a : DEFAULT_SETTINGS.fps));
  const binCount = Math.round(Number((_b = source.binCount) != null ? _b : DEFAULT_SETTINGS.binCount));
  const fftSize = Math.round(Number((_c = source.fftSize) != null ? _c : DEFAULT_SETTINGS.fftSize));
  return __spreadProps(__spreadValues(__spreadValues({}, DEFAULT_SETTINGS), source), {
    hdrHighlights: source.hdrHighlights === true,
    hdrIntensity: clamp((_d = source.hdrIntensity) != null ? _d : DEFAULT_SETTINGS.hdrIntensity, 0, 100),
    enabled: (_e = source.enabled) != null ? _e : DEFAULT_SETTINGS.enabled,
    showPlayerBar: (_f = source.showPlayerBar) != null ? _f : DEFAULT_SETTINGS.showPlayerBar,
    showMiniPlayer: (_g = source.showMiniPlayer) != null ? _g : DEFAULT_SETTINGS.showMiniPlayer,
    showLyricControls: (_h = source.showLyricControls) != null ? _h : DEFAULT_SETTINGS.showLyricControls,
    showBackdrop: (_i = source.showBackdrop) != null ? _i : DEFAULT_SETTINGS.showBackdrop,
    fps: [15, 24, 30].includes(fps) ? fps : DEFAULT_SETTINGS.fps,
    binCount: [32, 64, 96, 128].includes(binCount) ? binCount : DEFAULT_SETTINGS.binCount,
    fftSize: [1024, 2048, 4096, 8192].includes(fftSize) ? fftSize : DEFAULT_SETTINGS.fftSize,
    smoothing: clamp((_j = source.smoothing) != null ? _j : DEFAULT_SETTINGS.smoothing, 0, 95),
    scale: ["log", "mel", "linear"].includes(String(source.scale)) ? String(source.scale) : DEFAULT_SETTINGS.scale,
    mode: ["bars", "wave", "hybrid", "mist", "centered"].includes(String(source.mode)) ? String(source.mode) : DEFAULT_SETTINGS.mode,
    palette: ["theme", "aurora", "ember", "ice", "mono"].includes(String(source.palette)) ? String(source.palette) : DEFAULT_SETTINGS.palette,
    fill: clamp((_k = source.fill) != null ? _k : DEFAULT_SETTINGS.fill, 35, 100),
    opacity: clamp((_l = source.opacity) != null ? _l : DEFAULT_SETTINGS.opacity, 18, 92),
    lyricHeight: clamp((_m = source.lyricHeight) != null ? _m : DEFAULT_SETTINGS.lyricHeight, 48, 150),
    mistIntensity: clamp((_n = source.mistIntensity) != null ? _n : DEFAULT_SETTINGS.mistIntensity, 35, 100),
    mistSoftness: clamp((_o = source.mistSoftness) != null ? _o : DEFAULT_SETTINGS.mistSoftness, 20, 100),
    mistMotion: clamp((_p = source.mistMotion) != null ? _p : DEFAULT_SETTINGS.mistMotion, 0, 100),
    centeredBarWidth: clamp((_q = source.centeredBarWidth) != null ? _q : DEFAULT_SETTINGS.centeredBarWidth, 1, 8)
  });
};

// plugins/spectrum-visualizer/src/drawing.js
var PALETTES = {
  theme: ["#0071e3", "#5ac8fa", "#7c6cff"],
  aurora: ["#42f5b3", "#35b7ff", "#a86dff"],
  ember: ["#ffe08a", "#ff8f4a", "#ff4d7d"],
  ice: ["#e9fbff", "#8ee7ff", "#6d8dff"],
  mono: ["#f7fbff", "#b8c4d6", "#6b7280"]
};
var clamp2 = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
var makeGradient = (context, width, height, palette2) => {
  const colors = Array.isArray(palette2) ? palette2 : PALETTES[palette2] || PALETTES.theme;
  const gradient = context.createLinearGradient(0, height, width, 0);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.52, colors[1]);
  gradient.addColorStop(1, colors[2]);
  return gradient;
};
var appendRoundRect = (context, x, y, width, height, radius) => {
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
var drawBackdrop = (context, width, height, settings, energy, kind, colors) => {
  context.save();
  context.globalAlpha = (kind === "lyric" ? 0.18 : 0.24) + energy * 0.14;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, "rgba(10, 15, 28, 0.12)");
  gradient.addColorStop(1, colors[2]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
};
var drawBars = (context, width, height, frame, settings, kind, colors) => {
  const bins = (frame == null ? void 0 : frame.bins) || [];
  const count = Math.max(1, bins.length);
  const fillHeight = height * (settings.fill / 100);
  const bottom = kind === "lyric" ? height - 4 : height - 8;
  const top = Math.max(kind === "lyric" ? 8 : 10, bottom - fillHeight);
  const slot = width / count;
  const gap = Math.max(1.1, Math.min(4, slot * 0.22));
  const radius = Math.min(5, Math.max(2, slot * 0.24));
  const gradient = makeGradient(context, width, height, colors);
  context.save();
  context.shadowColor = "rgba(80, 220, 255, 0.14)";
  context.shadowBlur = count > 128 ? 0 : kind === "mini" ? 6 : 8;
  context.fillStyle = gradient;
  context.beginPath();
  for (let index = 0; index < count; index += 1) {
    const value = Math.pow(clamp2(bins[index] || 0, 0, 1), 1.35);
    const barHeight = Math.max(2, value * (bottom - top));
    const x = index * slot + gap * 0.5;
    const y = bottom - barHeight;
    const barWidth = Math.max(2, slot - gap);
    appendRoundRect(context, x, y, barWidth, barHeight, radius);
  }
  context.fill();
  context.restore();
};
var buildCenteredProfile = (bins, barCount) => {
  const count = Math.round(clamp2(barCount, 2, 512));
  const source = Array.from(bins || [], (value) => clamp2(value, 0, 1));
  if (!source.length) return Array.from({ length: count }, () => 0);
  const sampleAt = (position) => {
    const bounded = clamp2(position, 0, source.length - 1);
    const lower = Math.floor(bounded);
    const upper = Math.min(source.length - 1, lower + 1);
    const fraction = bounded - lower;
    return source[lower] + (source[upper] - source[lower]) * fraction;
  };
  return Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const frequencyPosition = Math.abs(progress * 2 - 1) * (source.length - 1);
    return clamp2(
      (sampleAt(frequencyPosition - 0.65) + sampleAt(frequencyPosition) * 2 + sampleAt(frequencyPosition + 0.65)) / 4,
      0,
      1
    );
  });
};
var getCenteredBarLayout = (width, requestedBarWidth = 2, gap = 3) => {
  const barWidth = clamp2(requestedBarWidth, 1, 8);
  const safeGap = clamp2(gap, 1, 8);
  const count = Math.min(512, Math.max(2, Math.floor(Math.max(0, width) / (barWidth + safeGap))));
  const slotWidth = Math.max(0, width) / count;
  return {
    count,
    slotWidth,
    barWidth: Math.min(barWidth, Math.max(1, slotWidth - 1))
  };
};
var updateCenteredDisplay = (previous, target, attack = 0.4, decay = 0.88) => target.map((value, index) => {
  var _a;
  const current = clamp2((_a = previous == null ? void 0 : previous[index]) != null ? _a : 0, 0, 1);
  return value > current ? current + (value - current) * attack : current * decay + value * (1 - decay);
});
var drawCentered = (entry, width, height, frame, settings, colors) => {
  const { count, slotWidth, barWidth } = getCenteredBarLayout(width, settings.centeredBarWidth);
  const target = buildCenteredProfile(frame == null ? void 0 : frame.bins, count);
  entry.centeredDisplay = updateCenteredDisplay(entry.centeredDisplay, target);
  const bottom = entry.kind === "lyric" ? height - 4 : height - 8;
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
var drawWave = (context, width, height, frame, settings, alpha = 0.86, colors = PALETTES.theme) => {
  const waveform = (frame == null ? void 0 : frame.waveform) || [];
  if (!waveform.length) return;
  const center = height * 0.5;
  const amplitude = height * 0.25 * (settings.fill / 100);
  context.save();
  context.globalAlpha = alpha;
  context.lineWidth = 2;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.shadowColor = colors[1];
  context.shadowBlur = 16;
  context.strokeStyle = makeGradient(context, width, height, colors);
  context.beginPath();
  waveform.forEach((sample, index) => {
    const x = index / Math.max(1, waveform.length - 1) * width;
    const y = center + clamp2(sample, -1, 1) * amplitude;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();
};
var buildMistProfile = (bins, pointCount = 28) => {
  const count = Math.round(clamp2(pointCount, 8, 64));
  const source = Array.from(bins || [], (value) => clamp2(value, 0, 1));
  if (!source.length) return Array.from({ length: count }, () => 0);
  const profile = Array.from({ length: count }, (_, index) => {
    const center = index / Math.max(1, count - 1) * (source.length - 1);
    const radius = Math.max(1, source.length / count * 1.8);
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
    return clamp2(previous * 0.2 + value * 0.6 + next * 0.2, 0, 1);
  });
};
var appendMistPath = (context, profile, width, baseline, fillHeight, layer, phase, motion, idle) => {
  const padding = Math.max(18, width * 0.035);
  const span = width + padding * 2;
  const points = profile.map((value, index) => {
    const progress = index / Math.max(1, profile.length - 1);
    const x = -padding + progress * span;
    const drift = Math.sin(progress * Math.PI * (2.4 + layer.index * 0.35) + phase + layer.phase) * (0.018 + motion * 0.035);
    const ambient = idle ? 0.075 : 0.025;
    const level = ambient + value * layer.scale + drift;
    return { x, y: baseline - fillHeight * clamp2(level, 0.02, 1) };
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
var getMistRenderLayers = (settings, energy = 0) => {
  const intensity = clamp2(settings.mistIntensity, 35, 100) / 100;
  const softness = clamp2(settings.mistSoftness, 20, 100) / 100;
  const signal = clamp2(energy, 0, 1);
  return [
    { index: 0, scale: 0.58, alpha: 0.48, phase: 0.3, blur: 1.05 },
    { index: 1, scale: 0.78, alpha: 0.36, phase: 2.2, blur: 0.72 },
    { index: 2, scale: 0.98, alpha: 0.28, phase: 4.4, blur: 0.42 }
  ].map((layer) => __spreadProps(__spreadValues({}, layer), {
    alpha: (layer.alpha + signal * 0.12) * intensity,
    blur: Math.round((3 + softness * 11) * layer.blur)
  }));
};
var drawIdle = (context, width, height, settings, time, colors) => {
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
function paint(context, width, height, frame, settings, kind, colors, time, display) {
  context.clearRect(0, 0, width, height);
  if (settings.showBackdrop)
    drawBackdrop(context, width, height, settings, (frame == null ? void 0 : frame.rms) || 0, kind, colors);
  if (settings.mode === "centered")
    drawCentered(
      { context, kind, centeredDisplay: display.values },
      width,
      height,
      frame,
      settings,
      colors
    );
  else if (frame && frame.state !== "idle") {
    if (settings.mode === "wave") drawWave(context, width, height, frame, settings, 0.9, colors);
    else if (settings.mode === "hybrid") {
      drawWave(context, width, height, frame, settings, 0.38, colors);
      drawBars(context, width, height, frame, settings, kind, colors);
    } else drawBars(context, width, height, frame, settings, kind, colors);
  } else drawIdle(context, width, height, settings, time, colors);
}
function centered(context, width, height, frame, settings, kind, colors, display) {
  if (settings.showBackdrop)
    drawBackdrop(context, width, height, settings, (frame == null ? void 0 : frame.rms) || 0, kind, colors);
  const entry = { context, kind, centeredDisplay: display.values };
  drawCentered(entry, width, height, frame, settings, colors);
  display.values = entry.centeredDisplay;
  context.save();
  context.globalCompositeOperation = "destination-in";
  const mask = context.createLinearGradient(0, 0, width, 0);
  for (const [at, alpha] of [
    [0, 0],
    [0.05, 0.6],
    [0.12, 1],
    [0.88, 1],
    [0.95, 0.6],
    [1, 0]
  ])
    mask.addColorStop(at, "rgba(0,0,0," + alpha + ")");
  context.fillStyle = mask;
  context.fillRect(0, 0, width, height);
  context.restore();
}
function mist(context, width, height, frame, settings, kind, colors, time, index) {
  context.clearRect(0, 0, width, height);
  const profile = buildMistProfile(frame == null ? void 0 : frame.bins, Math.round(clamp2(width / 18, 18, 44)));
  const layer = getMistRenderLayers(settings, (frame == null ? void 0 : frame.rms) || 0)[index];
  const baseline = kind === "lyric" ? height + 4 : height + 8;
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
    height * settings.fill / 100,
    layer,
    time / 1e3 * motion * 0.9,
    motion,
    !frame || frame.state === "idle"
  );
  context.fill();
  context.restore();
}
function blurFor(settings, index) {
  return getMistRenderLayers(settings, 0)[index].blur;
}
function palette(name, theme) {
  return name === "theme" ? theme : PALETTES[name] || PALETTES.theme;
}
function backdrop(context, width, height, frame, settings, kind, colors) {
  context.clearRect(0, 0, width, height);
  if (settings.showBackdrop)
    drawBackdrop(context, width, height, settings, (frame == null ? void 0 : frame.rms) || 0, kind, colors);
}

// plugins/spectrum-visualizer/src/scene.js
function scene(width, height, frame, settings, kind, colors, time, display, pass = -1) {
  const commands = [];
  let path = "";
  let state = {
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#ffffff",
    strokeStyle: "#ffffff",
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: "transparent"
  };
  const stack = [];
  const submit = (stroke) => {
    if (state.globalCompositeOperation === "destination-in") return;
    const brush = stroke ? state.strokeStyle : state.fillStyle;
    commands.push({
      path,
      stroke,
      color: typeof brush === "string" ? brush : "#ffffff",
      gradient: typeof brush === "string" ? null : brush,
      alpha: state.globalAlpha,
      lineWidth: state.lineWidth,
      shadowBlur: state.shadowBlur,
      shadowColor: state.shadowColor
    });
  };
  const context = {
    save() {
      stack.push(__spreadValues({}, state));
    },
    restore() {
      state = stack.pop();
    },
    clearRect() {
    },
    beginPath() {
      path = "";
    },
    moveTo(x, y) {
      path += `M${x} ${y}`;
    },
    lineTo(x, y) {
      path += `L${x} ${y}`;
    },
    quadraticCurveTo(cx, cy, x, y) {
      path += `Q${cx} ${cy} ${x} ${y}`;
    },
    closePath() {
      path += "Z";
    },
    fill() {
      submit(false);
    },
    stroke() {
      submit(true);
    },
    fillRect(x, y, w, h) {
      const previous = path;
      path = `M${x} ${y}h${w}v${h}h${-w}Z`;
      submit(false);
      path = previous;
    },
    createLinearGradient(x1, y1, x2, y2) {
      return {
        x1,
        y1,
        x2,
        y2,
        stops: [],
        addColorStop(at, color) {
          this.stops.push({ at, color });
        }
      };
    }
  };
  for (const key of [...Object.keys(state), "lineJoin", "lineCap"])
    Object.defineProperty(context, key, {
      get: () => state[key],
      set: (value) => {
        state[key] = value;
      }
    });
  if (pass >= 0) mist(context, width, height, frame, settings, kind, colors, time, pass);
  else if (pass === -2) backdrop(context, width, height, frame, settings, kind, colors);
  else if (settings.mode === "centered")
    centered(context, width, height, frame, settings, kind, colors, display);
  else paint(context, width, height, frame, settings, kind, colors, time, display);
  return commands;
}

// plugins/spectrum-visualizer/src/entry.ts
var desired = normalizeSettings(DEFAULT_SETTINGS);
var writes = Promise.resolve();
function activate(ctx) {
  return awaitOperation(ctx.io.readValue("settings")).then((value) => {
    desired = normalizeSettings(value);
    if (!ctx.active) return;
    ctx.ui.setState(desired);
    const save = (value2) => {
      desired = normalizeSettings(value2);
      const snapshot = desired;
      const next = writes.then(() => awaitOperation(ctx.io.writeValue("settings", snapshot))).then(() => {
        if (ctx.active) ctx.ui.setState(snapshot);
        return snapshot;
      });
      writes = next.catch(() => void 0);
      return next;
    };
    ctx.registerCommand("settings.get", () => ctx.ui.state);
    ctx.registerCommand("settings.patch", (args) => save(__spreadValues(__spreadValues({}, desired), args)));
    ctx.registerCommand("settings.reset", () => save(normalizeSettings(DEFAULT_SETTINGS)));
    ctx.ui.registerSettings("Settings.qml");
    ctx.ui.registerSurface("playerbar", "playerbar.background", "Layer.qml");
    ctx.ui.registerSurface("mini", "mini.background", "Layer.qml");
    ctx.ui.registerSurface("lyrics", "lyrics.aboveControls", "Layer.qml");
  });
}
function deactivate() {
  writes = Promise.resolve();
}
export {
  DEFAULT_SETTINGS,
  activate,
  backdrop,
  blurFor,
  centered,
  deactivate,
  mist,
  normalizeSettings,
  paint,
  palette,
  scene
};
