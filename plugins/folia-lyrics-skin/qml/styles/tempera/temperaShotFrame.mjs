// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { hashTemperaSeed } from './temperaRandom.mjs';
import {
  resolveTemperaBreathWeight,
  resolveTemperaCameraBreath,
  resolveTemperaCameraFrame,
} from './temperaCamera.mjs';
import {
  clamp01,
  easeTemperaEnter,
  easeTemperaInOut,
  resolveShotPacedDuration,
  resolveTemperaGlyphMotion,
} from './temperaMotion.mjs';
const resolveAnimationScale = (theme) =>
  theme.animationIntensity === 'calm' ? 0.65 : theme.animationIntensity === 'chaotic' ? 1.35 : 1;
const resolveShotHandoff = (view) =>
  resolveShotPacedDuration(view.shot.endTime - view.shot.startTime, 0.3, 0.4, 1.1);
const resolveTemperaShotExit = (view, time) =>
  clamp01((time - view.shot.endTime) / resolveShotHandoff(view));
const updateTemperaShot = (view, time, width, height, tuning, theme) => {
  const duration = Math.max(view.shot.endTime - view.shot.startTime, 1e-3);
  const rawProgress = (time - view.shot.startTime) / duration;
  const animationScale = resolveAnimationScale(theme);
  const camera = tuning.cameraIntensity * animationScale;
  const motion = tuning.glyphMotion * animationScale;
  const frame = resolveTemperaCameraFrame(view.shot, rawProgress);
  const breathWeight = resolveTemperaBreathWeight(time, view.revealDoneTime);
  if (breathWeight > 0) {
    const breathPhase = ((hashTemperaSeed(view.shot.id) % 1024) / 1024) * Math.PI * 2;
    const breath = resolveTemperaCameraBreath(time, breathPhase);
    frame.x += breath.x * breathWeight;
    frame.y += breath.y * breathWeight;
    frame.scale += breath.scale * breathWeight;
    frame.rotation += breath.rotation * breathWeight;
  }
  const handoff = resolveShotHandoff(view);
  const span = Math.max(width, height);
  const enter = easeTemperaEnter(clamp01((time - view.shot.startTime) / (handoff * 0.8)));
  const exit = easeTemperaInOut(resolveTemperaShotExit(view, time));
  const travel = exit * span * 0.55 - (1 - enter) * span * 0.32;
  view.container.position.set(
    view.baseX + frame.x * width * camera + Math.cos(view.shot.flowAngle) * travel,
    view.baseY + frame.y * height * camera + Math.sin(view.shot.flowAngle) * travel
  );
  view.container.alpha = 1 - exit;
  view.container.scale.set((1 + (frame.scale - 1) * camera) * (1 - exit * 0.08));
  view.container.rotation = frame.rotation * camera;
  view.blocks.updateTime(time, view.shot.startTime, view.shot.endTime, view.shot.lyricEndTime);
  view.images.updateTime(time, view.shot.startTime, view.shot.endTime, view.shot.lyricEndTime);
  view.glyphs.forEach((glyph) => {
    const frame2 = resolveTemperaGlyphMotion(glyph.motion, time, motion);
    const x = glyph.baseX + frame2.x;
    const y = glyph.baseY + frame2.y;
    glyph.display.alpha = frame2.alpha;
    glyph.display.visible = frame2.visible;
    glyph.display.position.set(x, y);
    glyph.display.scale.set(frame2.scaleX, frame2.scaleY);
    glyph.display.rotation = frame2.rotation;
    if (glyph.shadow) {
      glyph.shadow.alpha = frame2.alpha * 0.34;
      glyph.shadow.visible = frame2.visible;
      glyph.shadow.position.set(x + glyph.shadowDX, y + glyph.shadowDY);
      glyph.shadow.scale.set(frame2.scaleX, frame2.scaleY);
      glyph.shadow.rotation = frame2.rotation;
    }
    const echoVisible = frame2.visible && frame2.echoAlpha > 4e-3;
    glyph.echoes.forEach((echo, index) => {
      echo.visible = echoVisible;
      if (!echoVisible) return;
      const depth = 1 + index * 0.85;
      echo.alpha = frame2.echoAlpha / (index + 1.4);
      echo.position.set(glyph.baseX + frame2.echoX * depth, glyph.baseY + frame2.echoY * depth);
      echo.scale.set(frame2.scaleX, frame2.scaleY);
      echo.rotation = frame2.rotation;
    });
  });
};
export { resolveTemperaShotExit, updateTemperaShot };
