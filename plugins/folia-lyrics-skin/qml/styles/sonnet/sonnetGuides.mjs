// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty,
  __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
  },
  __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { isSonnetEmphasisRole } from './sonnetTypographyLayout.mjs';
const colorNumber = (pixi, color) => pixi.Color.shared.setValue(color).toNumber(),
  resolveSonnetGuideCue = (segment, textStartTime = segment.startTime) => {
    const leadDuration = Math.min(
      0.38,
      Math.max(0.2, 0.18 + (segment.endTime - segment.startTime) * 0.1)
    );
    return {
      startTime: textStartTime - leadDuration,
      endTime: textStartTime + 0.65,
    };
  },
  createSonnetGuide = (
    pixi,
    segment,
    placement,
    theme,
    fontSize,
    textStartTime = segment.startTime
  ) => {
    const container = new pixi.Container(),
      graphics = new pixi.Graphics(),
      shapesContainer = new pixi.Container(),
      isHero = isSonnetEmphasisRole(placement.role),
      fallbackDirection = placement.timingPhase < 0.5 ? -1 : 1,
      startX = placement.enterX || fallbackDirection * fontSize * 1.8,
      startY = placement.enterY || -fontSize * 0.9,
      color = colorNumber(pixi, isHero ? theme.accentColor : theme.secondaryColor),
      strokeProps = {
        color,
        width: isHero ? 1.8 : 1,
        alpha: isHero ? 0.82 : 0.55,
      },
      p0 = { x: startX, y: startY },
      p1 = { x: startX * 0.6, y: startY * 0.4 },
      p2 = { x: startX * 0.2, y: startY * 0.1 },
      p3 = { x: 0, y: 0 },
      getBezier = (p_0, p_1, p_2, p_3, t) => {
        const mt = 1 - t;
        return {
          x:
            mt * mt * mt * p_0.x +
            3 * mt * mt * t * p_1.x +
            3 * mt * t * t * p_2.x +
            t * t * t * p_3.x,
          y:
            mt * mt * mt * p_0.y +
            3 * mt * mt * t * p_1.y +
            3 * mt * t * t * p_2.y +
            t * t * t * p_3.y,
        };
      },
      numShapes = isHero ? 6 : 3,
      shapeData = [];
    for (let i = 0; i < numShapes; i++) {
      const shape = new pixi.Graphics(),
        type = Math.floor(Math.random() * 4),
        size = (isHero ? 3 : 1.5) + Math.random() * 3.5,
        sAlpha = isHero ? 0.8 : 0.6;
      (type === 0
        ? shape.circle(0, 0, size).fill({ color, alpha: sAlpha })
        : type === 1
          ? shape.rect(-size, -size, size * 2, size * 2).fill({ color, alpha: sAlpha })
          : type === 2
            ? shape
                .moveTo(-size, 0)
                .lineTo(size, 0)
                .moveTo(0, -size)
                .lineTo(0, size)
                .stroke({ color, width: 2, alpha: sAlpha })
            : shape
                .moveTo(0, -size)
                .lineTo(size, 0)
                .lineTo(0, size)
                .lineTo(-size, 0)
                .fill({ color, alpha: sAlpha }),
        shapesContainer.addChild(shape),
        shapeData.push({
          obj: shape,
          angle: Math.random() * Math.PI * 2,
          speed: (15 + Math.random() * 45) * (isHero ? 1 : 0.7),
          rotSpeed: (Math.random() - 0.5) * 8,
        }));
    }
    const trackingTrails = [];
    if (isHero || Math.random() > 0.4) {
      const d = Math.random() > 0.5 ? 1 : -1,
        yOffset = (Math.random() - 0.5) * fontSize * 0.8;
      trackingTrails.push({
        p0: { x: -d * fontSize * 2.5, y: yOffset + fontSize * 1.5 },
        p1: { x: -d * fontSize * 0.8, y: yOffset - fontSize * 2 },
        p2: { x: d * fontSize * 0.8, y: yOffset + fontSize * 2 },
        p3: { x: d * fontSize * 2.5, y: yOffset - fontSize * 1.5 },
        delay: Math.random() * 0.15,
      });
    }
    if (isHero || Math.random() > 0.6) {
      const d = Math.random() > 0.5 ? 1 : -1;
      trackingTrails.push({
        p0: { x: -fontSize * 2, y: -d * fontSize * 1.8 },
        p1: { x: fontSize * 2, y: d * fontSize * 1.8 },
        p2: { x: -fontSize * 2, y: d * fontSize * 1.8 },
        p3: { x: fontSize * 2, y: -d * fontSize * 1.8 },
        delay: Math.random() * 0.1,
      });
    }
    let rectSpline = null;
    if (Math.random() > 0.4) {
      const length = fontSize * (1.2 + Math.random() * 1.5),
        thickness = (isHero ? 6 : 3) + Math.random() * 8,
        angle = (Math.random() - 0.5) * Math.PI,
        rx = (Math.random() - 0.5) * fontSize * 1.2,
        ry = (Math.random() - 0.5) * fontSize * 1.2;
      rectSpline = {
        p0: { x: rx, y: ry },
        p1: { x: rx + Math.cos(angle) * length, y: ry + Math.sin(angle) * length },
        thickness,
        delay: Math.random() * 0.15,
        duration: 0.25 + Math.random() * 0.2,
      };
    }
    (container.addChild(graphics, shapesContainer),
      container.position.set(placement.x, placement.y),
      (container.alpha = 0));
    const cue = resolveSonnetGuideCue(segment, textStartTime),
      update = (progress) => {
        const drawProgress = Math.min(1, Math.max(0, progress / 0.35)),
          fadeOut = 1 - Math.min(1, Math.max(0, (progress - 0.4) / 0.3));
        if (
          (graphics.context.instructions.length > 0 && graphics.clear(),
          drawProgress > 0 && fadeOut > 0)
        ) {
          let prevP = p0;
          for (let i = 1; i <= 20; i++) {
            const t = (i / 20) * drawProgress,
              p = getBezier(p0, p1, p2, p3, t),
              intensity = Math.pow(i / 20, 2),
              segmentAlpha = Math.min(1, intensity * strokeProps.alpha * fadeOut * 1.6),
              segmentWidth = (isHero ? 2.5 : 1.5) + intensity * (isHero ? 5 : 3);
            (graphics.moveTo(prevP.x, prevP.y),
              graphics.lineTo(p.x, p.y),
              graphics.stroke({ color, width: segmentWidth, alpha: segmentAlpha }),
              (prevP = p));
          }
          const head = getBezier(p0, p1, p2, p3, drawProgress);
          (graphics.circle(head.x, head.y, isHero ? 14 : 9).fill({ color, alpha: 0.5 * fadeOut }),
            graphics
              .circle(head.x, head.y, isHero ? 4.5 : 3)
              .fill({ color: 16777215, alpha: 1 * fadeOut }));
        }
        if (
          (trackingTrails.forEach((trail) => {
            const localProg = (progress - trail.delay) / 0.55;
            if (localProg > -0.15 && fadeOut > 0 && localProg > 0 && localProg < 1.3) {
              const headT = Math.min(1, localProg),
                tailT = Math.max(0, localProg - 0.35);
              if (headT > tailT) {
                let prevP = getBezier(trail.p0, trail.p1, trail.p2, trail.p3, tailT);
                for (let i = 1; i <= 25; i++) {
                  const stepT = tailT + (i / 25) * (headT - tailT),
                    pos = getBezier(trail.p0, trail.p1, trail.p2, trail.p3, stepT),
                    intensity = Math.pow(i / 25, 2),
                    alpha = intensity * strokeProps.alpha * fadeOut * 0.9,
                    width = (isHero ? 2 : 1) + intensity * (isHero ? 5 : 2.5);
                  (graphics.moveTo(prevP.x, prevP.y),
                    graphics.lineTo(pos.x, pos.y),
                    graphics.stroke({ color, width, alpha }),
                    (prevP = pos));
                }
              }
              if (headT > 0 && headT < 1) {
                const headPos = getBezier(trail.p0, trail.p1, trail.p2, trail.p3, headT);
                (graphics
                  .circle(headPos.x, headPos.y, isHero ? 7 : 4)
                  .fill({ color, alpha: 0.9 * fadeOut }),
                  graphics
                    .circle(headPos.x, headPos.y, isHero ? 2.5 : 1.5)
                    .fill({ color: 16777215, alpha: 1 * fadeOut }),
                  graphics
                    .circle(headPos.x, headPos.y, isHero ? 20 : 12)
                    .stroke({ color, width: isHero ? 2 : 1, alpha: 0.4 * fadeOut }));
              }
            }
          }),
          rectSpline)
        ) {
          const localProg = (progress - rectSpline.delay) / rectSpline.duration;
          if (localProg > 0 && localProg < 1.3 && fadeOut > 0) {
            const headT = Math.min(1, Math.max(0, localProg * 1.5)),
              tailT = Math.min(1, Math.max(0, (localProg - 0.3) * 1.5));
            if (headT > tailT) {
              const hx = rectSpline.p0.x + (rectSpline.p1.x - rectSpline.p0.x) * headT,
                hy = rectSpline.p0.y + (rectSpline.p1.y - rectSpline.p0.y) * headT,
                tx = rectSpline.p0.x + (rectSpline.p1.x - rectSpline.p0.x) * tailT,
                ty = rectSpline.p0.y + (rectSpline.p1.y - rectSpline.p0.y) * tailT;
              (graphics.moveTo(tx, ty),
                graphics.lineTo(hx, hy),
                graphics.stroke({
                  color,
                  width: rectSpline.thickness,
                  alpha: strokeProps.alpha * fadeOut * 0.7,
                }),
                graphics.moveTo(tx, ty),
                graphics.lineTo(hx, hy),
                graphics.stroke({
                  color: 16777215,
                  width: rectSpline.thickness * 0.3,
                  alpha: strokeProps.alpha * fadeOut * 0.9,
                }));
            }
          }
        }
        const burstProgress = Math.min(1, Math.max(0, (progress - 0.3) / 0.7));
        shapeData.forEach((s) => {
          const ease = 1 - Math.pow(1 - burstProgress, 3);
          ((s.obj.x = p3.x + Math.cos(s.angle) * s.speed * ease),
            (s.obj.y = p3.y + Math.sin(s.angle) * s.speed * ease),
            (s.obj.rotation = s.rotSpeed * burstProgress),
            (s.obj.alpha = (1 - burstProgress) * (isHero ? 1 : 0.8)),
            s.obj.scale.set(1 - burstProgress * 0.4));
        });
      };
    return __spreadProps(
      __spreadValues(
        {
          container,
        },
        cue
      ),
      {
        maxAlpha: isHero ? 0.95 : 0.7,
        update,
      }
    );
  };
export { createSonnetGuide, resolveSonnetGuideCue };
