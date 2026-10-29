// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import {
  clamp01,
  easeTemperaEnter,
  easeTemperaInOut,
  resolveShotPacedDuration,
} from './temperaMotion.mjs';
import { temperaHash01 } from './temperaRandom.mjs';
import { drawTemperaComposition } from './temperaCompositions.mjs';
const buildTemperaBlocks = (pixi, options) => {
  const container = new pixi.Container();
  const items = [];
  const flowX = Math.cos(options.flowAngle);
  const flowY = Math.sin(options.flowAngle);
  const carry = Math.max(options.width, options.height) * 0.09;
  const add = (node, blockOptions = {}, parent) => {
    var _a, _b, _c, _d, _e, _f, _g;
    items.push({
      node,
      baseX: node.x,
      baseY: node.y,
      baseAlpha: (_a = blockOptions.alpha) != null ? _a : 1,
      enterDX: (_b = blockOptions.enterDX) != null ? _b : 0,
      enterDY: (_c = blockOptions.enterDY) != null ? _c : 0,
      delayFraction: (_d = blockOptions.delay) != null ? _d : 0,
      spanFraction: (_e = blockOptions.span) != null ? _e : 0.45,
      drift: (_f = blockOptions.drift) != null ? _f : false,
      driftPhase: temperaHash01(options.seed, items.length, 173) * Math.PI * 2,
      grow: (_g = blockOptions.grow) != null ? _g : false,
    });
    (parent != null ? parent : container).addChild(node);
  };
  const createGroup = (rotation, x, y) => {
    const group = new pixi.Container();
    group.rotation = rotation;
    group.position.set(x, y);
    container.addChild(group);
    return group;
  };
  const context = {
    pixi,
    kind: options.kind,
    palette: options.palette,
    decor: options.decor,
    width: options.width,
    height: options.height,
    seed: options.seed,
    showDecor: options.showDecor,
    flowAngle: options.flowAngle,
    bleed: carry + Math.max(options.width, options.height) * 0.08,
    // Gradient mode only: a per-shot axis so neighbouring compositions do not all ramp
    // the cover colours the same way.
    gradient: options.palette.gradient
      ? {
          colors: options.palette.gradient,
          angle: temperaHash01(options.seed, 3, 197) * Math.PI * 2,
        }
      : null,
    add,
    createGroup,
  };
  drawTemperaComposition(context);
  let schedulePace = Number.NaN;
  const delays = new Float64Array(items.length);
  const spans = new Float64Array(items.length);
  const resolveSchedule = (paceDuration) => {
    if (paceDuration === schedulePace) return;
    schedulePace = paceDuration;
    const budget = Math.max(0.5, paceDuration);
    items.forEach((item, index) => {
      const rawDelay = resolveShotPacedDuration(paceDuration, item.delayFraction, 0, 1.4);
      const rawSpan = resolveShotPacedDuration(paceDuration, item.spanFraction, 0.7, 2.6);
      const compress = Math.min(1, budget / (rawDelay + rawSpan));
      delays[index] = rawDelay * compress;
      spans[index] = rawSpan * compress;
    });
  };
  const updateTime = (time, shotStart, shotEnd, lyricEnd) => {
    const duration = Math.max(shotEnd - shotStart, 0.2);
    const paceDuration = Math.max((lyricEnd != null ? lyricEnd : shotEnd) - shotStart, 0.2);
    const progress = clamp01((time - shotStart) / duration);
    const creep = easeTemperaInOut(progress) * carry * 0.35;
    resolveSchedule(paceDuration);
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const enter = easeTemperaEnter((time - shotStart - delays[index]) / spans[index]);
      item.node.alpha = item.baseAlpha * enter;
      item.node.visible = enter > 1e-3;
      const behind = (1 - enter) * carry - creep;
      item.node.position.set(
        item.baseX + item.enterDX * (1 - enter) - flowX * behind,
        item.baseY + item.enterDY * (1 - enter) - flowY * behind
      );
      if (item.drift || item.grow) {
        const float = item.drift ? 1 + Math.sin(time * 0.5 + item.driftPhase) * 0.02 : 1;
        item.node.scale.set(item.grow ? Math.max(1e-4, enter) * float : float, float);
        if (item.drift) item.node.rotation = Math.sin(time * 0.33 + item.driftPhase) * 0.012;
      }
    }
  };
  return { container, updateTime };
};
export { buildTemperaBlocks };
