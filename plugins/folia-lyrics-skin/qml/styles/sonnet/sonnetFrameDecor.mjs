// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { hashSonnetSeed } from './sonnetRandom.mjs';
import { resolveSonnetGlyphMotionDuration } from './sonnetGlyphLayout.mjs';
import { easeSonnetElasticOut, easeSonnetExpoOut, clamp01 } from './sonnetMotion.mjs';
const SONNET_FRAME_DECOR_PROBABILITY = 0.4,
  SONNET_FRAME_DECOR_VARIANTS = 4,
  resolveSonnetFrameDecorSpec = (segment) => {
    const hash = hashSonnetSeed(
      [segment.text, segment.startOffset, segment.endOffset, 'frame-decor'].join(':')
    );
    return {
      applied: (hash & 1023) / 1024 < SONNET_FRAME_DECOR_PROBABILITY,
      variant: (hash >>> 10) % SONNET_FRAME_DECOR_VARIANTS,
    };
  },
  clamp = (value, min, max) => Math.min(max, Math.max(min, value)),
  dimmedColor = (pixi, color, multiplier) => {
    const base = pixi.Color.shared.setValue(color).toNumber(),
      r = Math.round(((base >> 16) & 255) * multiplier),
      g = Math.round(((base >> 8) & 255) * multiplier),
      b = Math.round((base & 255) * multiplier);
    return (r << 16) | (g << 8) | b;
  },
  resolveCorners = ({ halfW, halfH }) => [
    { x: -halfW, y: -halfH, sx: -1, sy: -1 },
    { x: halfW, y: -halfH, sx: 1, sy: -1 },
    { x: halfW, y: halfH, sx: 1, sy: 1 },
    { x: -halfW, y: halfH, sx: -1, sy: 1 },
  ],
  resolveSideEnds = (geometry, corners, side) => {
    const from = corners[side],
      to = corners[(side + 1) % 4],
      insetX = to.x === from.x ? 0 : geometry.cornerGap * (to.x > from.x ? 1 : -1),
      insetY = to.y === from.y ? 0 : geometry.cornerGap * (to.y > from.y ? 1 : -1);
    return {
      startX: from.x + insetX,
      startY: from.y + insetY,
      endX: to.x - insetX,
      endY: to.y - insetY,
    };
  },
  resolveSonnetFrameLocalDimensions = (placement) => {
    const quarterTurns = Math.round(placement.rotation / (Math.PI / 2)),
      snappedRotation = quarterTurns * (Math.PI / 2);
    return Math.abs(placement.rotation - snappedRotation) < 1e-6 && Math.abs(quarterTurns % 2) === 1
      ? { width: placement.measuredHeight, height: placement.measuredWidth }
      : { width: placement.measuredWidth, height: placement.measuredHeight };
  },
  buildSonnetFrameDecor = (pixi, options) => {
    if (options.placement.role === 'decoration') return null;
    const spec = resolveSonnetFrameDecorSpec(options.segment);
    if (!spec.applied) return null;
    const { placement, fontSize } = options,
      pad = clamp(fontSize * 0.22, 8, 20),
      frameDimensions = resolveSonnetFrameLocalDimensions(placement),
      geometry = {
        halfW: frameDimensions.width / 2 + pad,
        halfH: frameDimensions.height / 2 + pad,
        cornerGap: 0,
        pad,
      };
    geometry.cornerGap = clamp(
      Math.min(geometry.halfW, geometry.halfH) * (spec.variant === 1 ? 0.42 : 0.3),
      6,
      30
    );
    const color = dimmedColor(pixi, options.theme.primaryColor, 0.55),
      corners = resolveCorners(geometry),
      container = new pixi.Container();
    (container.position.set(placement.x, placement.y), (container.rotation = placement.rotation));
    const graphics = new pixi.Graphics();
    (container.addChild(graphics), (container.alpha = 0));
    const strokeWidth = clamp(fontSize * 0.03, 1.2, 2.2),
      traceSides = (eased, dashed) => {
        for (let side = 0; side < 4; side++) {
          const sideProgress = clamp01((eased - side * 0.2) / 0.4);
          if (sideProgress <= 0) continue;
          const { startX, startY, endX, endY } = resolveSideEnds(geometry, corners, side),
            tipX = startX + (endX - startX) * sideProgress,
            tipY = startY + (endY - startY) * sideProgress;
          if (!dashed) {
            graphics
              .moveTo(startX, startY)
              .lineTo(tipX, tipY)
              .stroke({ color, width: strokeWidth, alpha: 0.85 });
            continue;
          }
          const sideLength = Math.hypot(endX - startX, endY - startY);
          if (sideLength < 1) continue;
          const ux = (endX - startX) / sideLength,
            uy = (endY - startY) / sideLength,
            dash = clamp(fontSize * 0.14, 5, 8),
            gap = dash * 0.7,
            traced = sideLength * sideProgress;
          for (let offset = 0; offset + dash <= traced + 1e-3; offset += dash + gap)
            graphics
              .moveTo(startX + ux * offset, startY + uy * offset)
              .lineTo(startX + ux * (offset + dash), startY + uy * (offset + dash))
              .stroke({ color, width: strokeWidth, alpha: 0.85 });
        }
      },
      ornamentProgress = (eased, corner) =>
        easeSonnetElasticOut(clamp01((eased - 0.35 - corner * 0.14) / 0.3)),
      drawCornerTicks = (eased) => {
        const arm = clamp(pad * 0.8, 5, 12),
          offset = 3;
        corners.forEach((corner, index) => {
          const op = ornamentProgress(eased, index);
          if (op <= 0.02) return;
          const innerX = corner.x + corner.sx * offset,
            innerY = corner.y + corner.sy * offset;
          graphics
            .moveTo(innerX + corner.sx * arm * op, innerY)
            .lineTo(innerX, innerY)
            .lineTo(innerX, innerY + corner.sy * arm * op)
            .stroke({ color, width: strokeWidth, alpha: 0.9 * Math.min(1, op) });
        });
      },
      drawCornerFlowers = (eased) => {
        const radius = clamp(pad * 0.55, 4, 9);
        corners.forEach((corner, index) => {
          const op = ornamentProgress(eased, index);
          if (op <= 0.02) return;
          const petal = radius * 0.44 * op;
          (graphics.circle(corner.x - radius, corner.y, petal).fill({ color, alpha: 0.8 }),
            graphics.circle(corner.x + radius, corner.y, petal).fill({ color, alpha: 0.8 }),
            graphics.circle(corner.x, corner.y - radius, petal).fill({ color, alpha: 0.8 }),
            graphics.circle(corner.x, corner.y + radius, petal).fill({ color, alpha: 0.8 }),
            graphics
              .circle(corner.x, corner.y, radius * 0.3 * op)
              .fill({ color: 16777215, alpha: 0.5 }));
        });
      },
      drawBrackets = (eased) => {
        const arm = clamp(pad, 6, 14),
          offset = 2.5;
        corners.forEach((corner, index) => {
          const op = ornamentProgress(eased, index);
          if (op <= 0.02) return;
          const innerX = corner.x + corner.sx * offset,
            innerY = corner.y + corner.sy * offset;
          (graphics
            .moveTo(innerX + corner.sx * arm * op, innerY)
            .lineTo(innerX, innerY)
            .lineTo(innerX, innerY + corner.sy * arm * op)
            .stroke({ color, width: strokeWidth * 1.4, alpha: 0.9 }),
            graphics
              .moveTo(innerX + corner.sx * (arm * op + 4), innerY + corner.sy * 4)
              .lineTo(innerX + corner.sx * 4, innerY + corner.sy * 4)
              .lineTo(innerX + corner.sx * 4, innerY + corner.sy * (arm * op + 4))
              .stroke({ color, width: strokeWidth * 0.8, alpha: 0.5 }));
        });
        const diamond = clamp(pad * 0.45, 3.5, 7);
        for (let side = 0; side < 4; side++) {
          const op = ornamentProgress(eased, side);
          if (op <= 0.02) continue;
          const { startX, startY, endX, endY } = resolveSideEnds(geometry, corners, side),
            midX = (startX + endX) / 2,
            midY = (startY + endY) / 2,
            size = diamond * op;
          graphics
            .poly([midX, midY - size, midX + size, midY, midX, midY + size, midX - size, midY])
            .fill({ color, alpha: 0.85 });
        }
      },
      drawCornerTriangles = (eased) => {
        const size = clamp(pad * 0.6, 4, 9),
          offset = 2;
        corners.forEach((corner, index) => {
          const op = ornamentProgress(eased, index);
          if (op <= 0.02) return;
          const diagX = corner.sx / Math.SQRT2,
            diagY = corner.sy / Math.SQRT2,
            perpX = corner.sy / Math.SQRT2,
            perpY = -corner.sx / Math.SQRT2,
            tipX = corner.x + diagX * (offset + size * op),
            tipY = corner.y + diagY * (offset + size * op),
            baseX = corner.x + diagX * offset,
            baseY = corner.y + diagY * offset,
            half = size * 0.7 * op;
          (graphics
            .poly([
              tipX,
              tipY,
              baseX + perpX * half,
              baseY + perpY * half,
              baseX - perpX * half,
              baseY - perpY * half,
            ])
            .fill({ color, alpha: 0.85 }),
            graphics.circle(corner.x, corner.y, strokeWidth).fill({ color, alpha: 0.9 }));
        });
      };
    let drawnProgress = Number.NaN;
    const update = (progress) => {
        const clamped = clamp01(progress);
        if (clamped === drawnProgress) return;
        drawnProgress = clamped;
        const eased = easeSonnetExpoOut(clamped);
        (graphics.clear(),
          (container.alpha = eased <= 0 ? 0 : 1),
          !(eased <= 0) &&
            (traceSides(eased, spec.variant === 3),
            spec.variant === 0
              ? drawCornerTicks(eased)
              : spec.variant === 1
                ? drawCornerFlowers(eased)
                : spec.variant === 2
                  ? drawBrackets(eased)
                  : drawCornerTriangles(eased)));
      },
      growDuration =
        resolveSonnetGlyphMotionDuration({
          startTime: options.shotStartTime,
          endTime: options.shotEndTime,
        }) * 1.25,
      startTime = options.firstGlyphStartTime;
    return {
      container,
      startTime,
      endTime: startTime + growDuration,
      update,
    };
  };
export {
  SONNET_FRAME_DECOR_PROBABILITY,
  SONNET_FRAME_DECOR_VARIANTS,
  buildSonnetFrameDecor,
  resolveSonnetFrameDecorSpec,
  resolveSonnetFrameLocalDimensions,
};
