// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value)),
  resolveSonnetFlowGaps = (baseFontSize) => {
    const flowGap = clamp(baseFontSize * 0.35, 16, 40);
    return { flowGap, stackGap: Math.max(24, flowGap * 1.35) };
  },
  placeWithGlobalFit = (ctx, place) => {
    const snapshot = ctx.boxes.map((box) => ({
        fontScale: box.fontScale,
        measuredWidth: box.measuredWidth,
        measuredHeight: box.measuredHeight,
      })),
      safeHalfW = ctx.width * 0.48,
      safeHalfH = ctx.height * 0.46;
    for (const globalScale of [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52])
      if (
        (ctx.boxes.forEach((box, index) => {
          ((box.fontScale = snapshot[index].fontScale * globalScale),
            (box.measuredWidth = snapshot[index].measuredWidth * globalScale),
            (box.measuredHeight = snapshot[index].measuredHeight * globalScale));
        }),
        place(globalScale),
        ctx.boxes.every(
          (box) =>
            Math.abs(box.x) + box.measuredWidth / 2 <= safeHalfW + 0.5 &&
            Math.abs(box.y) + box.measuredHeight / 2 <= safeHalfH + 0.5
        ))
      )
        return;
  },
  layoutQuietTableau = (ctx, variant) => {
    const { boxes, heroIndex, height, stackGap } = ctx,
      heroBox = boxes[heroIndex],
      horizontalCard = variant === 2 || variant === 3;
    boxes.forEach((box) => {
      box.layoutDirection = horizontalCard ? 'horizontal' : 'vertical';
    });
    const safeHalfH = height * 0.46;
    placeWithGlobalFit(ctx, () => {
      ((heroBox.x = 0), (heroBox.y = horizontalCard ? 0 : -height * 0.1));
      const stagger = variant === 3 ? 70 : 0,
        columnStep = Math.max(...boxes.map((box) => box.measuredWidth)) + stackGap + stagger,
        xFor = (box, index) =>
          variant === 1
            ? heroBox.x - heroBox.measuredWidth / 2 + box.measuredWidth / 2
            : variant === 3
              ? heroBox.x + (index % 2 === 0 ? 1 : -1) * 35
              : heroBox.x;
      let column = 0,
        currentY = heroBox.y - heroBox.measuredHeight / 2 - stackGap;
      for (let i = heroIndex - 1; i >= 0; i--) {
        const box = boxes[i];
        (currentY - box.measuredHeight < -safeHalfH && ((column += 1), (currentY = safeHalfH)),
          (box.x = xFor(box, i) + column * columnStep),
          (box.y = currentY - box.measuredHeight / 2),
          (currentY -= box.measuredHeight + stackGap),
          variant === 1
            ? ((box.enterX = 20), (box.enterY = 0))
            : variant === 3
              ? ((box.enterX = box.x > heroBox.x ? 30 : -30), (box.enterY = 0))
              : ((box.enterX = 0), (box.enterY = 20)));
      }
      ((column = 0), (currentY = heroBox.y + heroBox.measuredHeight / 2 + stackGap));
      for (let i = heroIndex + 1; i < boxes.length; i++) {
        const box = boxes[i];
        (currentY + box.measuredHeight > safeHalfH && ((column += 1), (currentY = -safeHalfH)),
          (box.x = xFor(box, i) - column * columnStep),
          (box.y = currentY + box.measuredHeight / 2),
          (currentY += box.measuredHeight + stackGap),
          variant === 1
            ? ((box.enterX = -20), (box.enterY = 0))
            : variant === 3
              ? ((box.enterX = box.x > heroBox.x ? 30 : -30), (box.enterY = 0))
              : ((box.enterX = 0), (box.enterY = -20)));
      }
    });
  },
  layoutTrackingRibbon = (ctx, variant) => {
    const { boxes, heroIndex, flowGap } = ctx,
      heroBox = boxes[heroIndex];
    (boxes.forEach((box) => {
      box.layoutDirection = 'horizontal';
    }),
      placeWithGlobalFit(ctx, () => {
        ((heroBox.x = 0), (heroBox.y = 0));
        const alignY = (box, index) =>
            variant === 1
              ? heroBox.y + heroBox.measuredHeight / 2 - box.measuredHeight / 2
              : variant === 2
                ? heroBox.y - heroBox.measuredHeight / 2 + box.measuredHeight / 2
                : heroBox.y + (index % 2 === 0 ? 10 : -10),
          enter = variant === 2 ? 20 : 30;
        let currentX = heroBox.x - heroBox.measuredWidth / 2 - flowGap;
        for (let i = heroIndex - 1; i >= 0; i--) {
          const box = boxes[i];
          ((box.x = currentX - box.measuredWidth / 2),
            (box.y = alignY(box, i)),
            (currentX -= box.measuredWidth + flowGap),
            (box.enterX = enter),
            (box.enterY = 0));
        }
        currentX = heroBox.x + heroBox.measuredWidth / 2 + flowGap;
        for (let i = heroIndex + 1; i < boxes.length; i++) {
          const box = boxes[i];
          ((box.x = currentX + box.measuredWidth / 2),
            (box.y = alignY(box, i)),
            (currentX += box.measuredWidth + flowGap),
            (box.enterX = -enter),
            (box.enterY = 0));
        }
      }));
  },
  layoutEditorialColumn = (ctx, variant, secondaryHeroIndex) => {
    const { boxes, heroIndex, width, height, flowGap, stackGap } = ctx,
      heroBox = boxes[heroIndex];
    variant === 0
      ? (boxes.forEach((box) => {
          box.layoutDirection = 'vertical';
        }),
        placeWithGlobalFit(ctx, () => {
          ((heroBox.x = -width * 0.15), (heroBox.y = 0));
          let currentY = heroBox.y - heroBox.measuredHeight / 2 + stackGap * 0.5;
          for (let i = 0; i < heroIndex; i++) {
            const box = boxes[i];
            ((box.x = heroBox.x + heroBox.measuredWidth / 2 + flowGap + box.measuredWidth / 2),
              (box.y = currentY + box.measuredHeight / 2),
              (currentY += box.measuredHeight + stackGap),
              (box.enterX = -20),
              (box.enterY = 0));
          }
          currentY = heroBox.y - heroBox.measuredHeight / 2 + stackGap * 0.5;
          for (let i = heroIndex + 1; i < boxes.length; i++) {
            const box = boxes[i];
            ((box.x = heroBox.x - heroBox.measuredWidth / 2 - flowGap - box.measuredWidth / 2),
              (box.y = currentY + box.measuredHeight / 2),
              (currentY += box.measuredHeight + stackGap),
              (box.enterX = 20),
              (box.enterY = 0));
          }
        }))
      : variant === 1
        ? (boxes.forEach((box) => {
            box.layoutDirection = 'vertical';
          }),
          placeWithGlobalFit(ctx, () => {
            const rightEdge = width * 0.28,
              safeHalfH = height * 0.46,
              railStep = Math.max(...boxes.map((box) => box.measuredWidth)) + stackGap,
              totalHeight =
                boxes.reduce((sum, box) => sum + box.measuredHeight, 0) +
                stackGap * (boxes.length - 1);
            if (
              boxes.reduce((sum, box) => sum + box.measuredHeight, 0) * 0.52 +
                stackGap * (boxes.length - 1) <=
              safeHalfH * 2
            ) {
              let currentY2 = -totalHeight / 2;
              boxes.forEach((box) => {
                ((box.x = rightEdge - box.measuredWidth / 2),
                  (box.y = currentY2 + box.measuredHeight / 2),
                  (currentY2 += box.measuredHeight + stackGap),
                  (box.enterX = 20),
                  (box.enterY = 0));
              });
              return;
            }
            let rail = 0,
              currentY = -safeHalfH;
            boxes.forEach((box) => {
              (currentY + box.measuredHeight > safeHalfH && ((rail += 1), (currentY = -safeHalfH)),
                (box.x = rightEdge - rail * railStep - box.measuredWidth / 2),
                (box.y = currentY + box.measuredHeight / 2),
                (currentY += box.measuredHeight + stackGap),
                (box.enterX = 20),
                (box.enterY = 0));
            });
          }))
        : variant === 2
          ? (boxes.forEach((box) => {
              box.layoutDirection = 'horizontal';
            }),
            placeWithGlobalFit(ctx, () => {
              var _a;
              ((heroBox.x = 0), (heroBox.y = -height * 0.25));
              const before = boxes.slice(0, heroIndex),
                after = boxes.slice(heroIndex + 1);
              if (before.length > 0) {
                const kickerHeight = Math.max(...before.map((box) => box.measuredHeight)),
                  kickerWidth =
                    before.reduce((sum, box) => sum + box.measuredWidth, 0) +
                    flowGap * (before.length - 1),
                  kickerY = heroBox.y - heroBox.measuredHeight / 2 - stackGap - kickerHeight / 2;
                let currentX = heroBox.x - kickerWidth / 2;
                before.forEach((box) => {
                  ((box.x = currentX + box.measuredWidth / 2),
                    (box.y = kickerY),
                    (currentX += box.measuredWidth + flowGap),
                    (box.enterX = 0),
                    (box.enterY = -20));
                });
              }
              const leftAnchor = heroBox.x - heroBox.measuredWidth * 0.25 - flowGap,
                rightAnchor = heroBox.x + heroBox.measuredWidth * 0.25 + flowGap;
              let currentY = heroBox.y + heroBox.measuredHeight / 2 + stackGap;
              for (let pair = 0; pair < after.length; pair += 2) {
                const left = after[pair],
                  right = after[pair + 1],
                  rowHeight = Math.max(
                    left.measuredHeight,
                    (_a = right == null ? void 0 : right.measuredHeight) != null ? _a : 0
                  );
                ((left.x = leftAnchor - left.measuredWidth / 2),
                  (left.y = currentY + left.measuredHeight / 2),
                  (left.enterX = -20),
                  (left.enterY = 0),
                  right &&
                    ((right.x = rightAnchor + right.measuredWidth / 2),
                    (right.y = currentY + right.measuredHeight / 2),
                    (right.enterX = 20),
                    (right.enterY = 0)),
                  (currentY += rowHeight + stackGap));
              }
            }))
          : variant === 3
            ? (boxes.forEach((box) => {
                box.layoutDirection = 'horizontal';
              }),
              placeWithGlobalFit(ctx, () => {
                ((heroBox.x = 0), (heroBox.y = 0));
                const firstHero = Math.min(heroIndex, secondaryHeroIndex),
                  line1 = boxes.slice(0, firstHero + 1),
                  line2 = boxes.slice(firstHero + 1),
                  line1Height = Math.max(...line1.map((box) => box.measuredHeight)),
                  line2Height = Math.max(...line2.map((box) => box.measuredHeight)),
                  totalHeight = line1Height + stackGap + line2Height,
                  line1Y = heroBox.y - totalHeight / 2 + line1Height / 2,
                  line2Y = line1Y + line1Height / 2 + stackGap + line2Height / 2,
                  layLine = (line, lineY, enterX) => {
                    const lineWidth =
                      line.reduce((sum, box) => sum + box.measuredWidth, 0) +
                      flowGap * (line.length - 1);
                    let currentX = -lineWidth / 2;
                    return (
                      line.forEach((box) => {
                        ((box.x = currentX + box.measuredWidth / 2),
                          (box.y = lineY),
                          (currentX += box.measuredWidth + flowGap),
                          (box.enterX = enterX),
                          (box.enterY = 0));
                      }),
                      lineWidth
                    );
                  },
                  line1Width = layLine(line1, line1Y, 30),
                  line2Width = layLine(line2, line2Y, -30),
                  offsetAmount = Math.max(line1Width, line2Width) * 0.12;
                (line1.forEach((box) => {
                  box.x -= offsetAmount;
                }),
                  line2.forEach((box) => {
                    box.x += offsetAmount;
                  }));
              }))
            : variant === 4 &&
              (boxes.forEach((box, index) => {
                box.layoutDirection = index === heroIndex ? 'vertical' : 'horizontal';
              }),
              placeWithGlobalFit(ctx, () => {
                const heroOnRight = heroIndex === boxes.length - 1,
                  blockLeft = -width * 0.4,
                  blockRight = width * 0.4;
                let currentY = -height * 0.34;
                const flowWords = (indices, regionFor) => {
                    let [left, right] = regionFor(currentY),
                      currentX = left,
                      rowHeight = 0;
                    (indices.forEach((index) => {
                      const box = boxes[index];
                      (currentX > left &&
                        currentX + box.measuredWidth > right &&
                        ((currentY += rowHeight + stackGap),
                        ([left, right] = regionFor(currentY)),
                        (currentX = left),
                        (rowHeight = 0)),
                        (box.x = currentX + box.measuredWidth / 2),
                        (box.y = currentY + box.measuredHeight / 2),
                        (box.enterX = heroOnRight ? -25 : 25),
                        (box.enterY = 0),
                        (currentX += box.measuredWidth + flowGap),
                        (rowHeight = Math.max(rowHeight, box.measuredHeight)));
                    }),
                      indices.length > 0 && (currentY += rowHeight));
                  },
                  beforeIndices = boxes.slice(0, heroIndex).map((box) => box.index),
                  afterIndices = boxes.slice(heroIndex + 1).map((box) => box.index);
                (flowWords(beforeIndices, () => [blockLeft, blockRight]), (currentY += stackGap));
                const pillarLeft = heroOnRight ? blockRight - heroBox.measuredWidth : blockLeft;
                ((heroBox.x = pillarLeft + heroBox.measuredWidth / 2),
                  (heroBox.y = currentY + heroBox.measuredHeight / 2));
                const pillarBottom = currentY + heroBox.measuredHeight + stackGap,
                  besideLeft = heroOnRight
                    ? blockLeft
                    : pillarLeft + heroBox.measuredWidth + flowGap,
                  besideRight = heroOnRight ? pillarLeft - flowGap : blockRight;
                flowWords(afterIndices, (rowTop) =>
                  rowTop < pillarBottom - 0.5 ? [besideLeft, besideRight] : [blockLeft, blockRight]
                );
              }));
  },
  layoutFragmentCollage = (ctx, variant) => {
    const { boxes, heroIndex, flowGap, stackGap } = ctx,
      heroBox = boxes[heroIndex],
      rectSeparation = (a, b) =>
        Math.max(
          Math.max(a.left - b.right, b.left - a.right),
          Math.max(a.top - b.bottom, b.top - a.bottom)
        );
    (boxes.forEach((box, index) => {
      if (index !== heroIndex) {
        if (Math.abs(Math.round(box.rotation / (Math.PI / 2)) % 2) === 1) {
          const rotatedWidth = box.measuredHeight;
          ((box.measuredHeight = box.measuredWidth), (box.measuredWidth = rotatedWidth));
        }
        box.rotation = 0;
      }
    }),
      placeWithGlobalFit(ctx, (globalScale) => {
        ((heroBox.x = 0), (heroBox.y = 0));
        const baseRadius = Math.hypot(heroBox.measuredWidth, heroBox.measuredHeight) / 2 + stackGap,
          count = Math.max(1, boxes.length - 1),
          squash = 0.65,
          placed = [
            {
              left: heroBox.x - heroBox.measuredWidth / 2,
              right: heroBox.x + heroBox.measuredWidth / 2,
              top: heroBox.y - heroBox.measuredHeight / 2,
              bottom: heroBox.y + heroBox.measuredHeight / 2,
            },
          ];
        let angle = Math.PI / 4,
          supportIndex = 0;
        for (let i = 0; i < boxes.length; i++) {
          if (i === heroIndex) continue;
          const box = boxes[i];
          let radius = baseRadius;
          (variant === 1
            ? (radius += (35 + (supportIndex / count) * 150) * globalScale)
            : variant === 2
              ? (radius += (supportIndex % 2 === 1 ? 140 : 50) * globalScale)
              : (radius += (45 + ((supportIndex * 23) % 90)) * globalScale),
            (supportIndex += 1));
          let candidate = angle,
            rect = { left: 0, right: 0, top: 0, bottom: 0 },
            resolvedRadius = radius,
            placedClear = !1;
          for (let ring = 0; ring < 14 && !placedClear; ring += 1) {
            for (let attempt = 0; attempt < 400; attempt++) {
              if (
                ((rect = {
                  left: Math.cos(candidate) * resolvedRadius - box.measuredWidth / 2,
                  right: Math.cos(candidate) * resolvedRadius + box.measuredWidth / 2,
                  top: Math.sin(candidate) * resolvedRadius * squash - box.measuredHeight / 2,
                  bottom: Math.sin(candidate) * resolvedRadius * squash + box.measuredHeight / 2,
                }),
                placed.every((entry) => rectSeparation(entry, rect) >= flowGap))
              ) {
                placedClear = !0;
                break;
              }
              candidate += 0.07;
            }
            placedClear || (resolvedRadius += (36 + ring * 12) * globalScale);
          }
          ((angle = candidate + 0.02),
            placed.push(rect),
            (box.x = heroBox.x + Math.cos(candidate) * resolvedRadius),
            (box.y = heroBox.y + Math.sin(candidate) * resolvedRadius * squash),
            (box.layoutDirection =
              Math.abs(Math.cos(candidate)) >= Math.abs(Math.sin(candidate))
                ? 'vertical'
                : 'horizontal'),
            (box.enterX = Math.cos(candidate) * -60),
            (box.enterY = Math.sin(candidate) * -60));
        }
      }));
  },
  layoutCrossStack = (ctx) => {
    const { boxes, heroIndex, height, flowGap, stackGap } = ctx,
      heroBox = boxes[heroIndex],
      topCount = Math.floor(heroIndex / 2),
      afterCount = boxes.length - 1 - heroIndex,
      rightCount = Math.ceil(afterCount / 2),
      fillColumn = (column) => {
        if (column.length === 0) return 0;
        const available = Math.max(0, height * 0.46 - heroBox.measuredHeight / 2 - stackGap);
        if (available <= 0) return 0;
        const gaps = stackGap * (column.length - 1),
          contentHeight = column.reduce((sum, box) => sum + box.measuredHeight, 0),
          target = available * 0.72;
        if (contentHeight + gaps < target) {
          const boost = Math.min(2.2, (target - gaps) / Math.max(1, contentHeight));
          column.forEach((box) => {
            const capped = Math.min(boost, (heroBox.fontScale * 0.6) / box.fontScale);
            capped > 1.05 &&
              ((box.fontScale *= capped),
              (box.measuredWidth *= capped),
              (box.measuredHeight *= capped));
          });
        }
        if (column.length < 2) return 0;
        const grown = column.reduce((sum, box) => sum + box.measuredHeight, 0),
          pitch = (available * 0.95 - grown) / (column.length - 1);
        return Math.max(0, Math.min(stackGap * 2, pitch - stackGap));
      };
    placeWithGlobalFit(ctx, () => {
      ((heroBox.x = 0), (heroBox.y = 0));
      const topStretch = fillColumn(boxes.slice(0, topCount)),
        bottomStretch = fillColumn(boxes.slice(heroIndex + rightCount + 1));
      let currentX = heroBox.x - heroBox.measuredWidth / 2 - stackGap;
      for (let i = heroIndex - 1; i >= topCount; i--) {
        const box = boxes[i];
        ((box.layoutDirection = 'horizontal'),
          (box.x = currentX - box.measuredWidth / 2),
          (box.y = heroBox.y + (i % 2 === 0 ? 10 : -10)),
          (currentX -= box.measuredWidth + flowGap),
          (box.enterX = -30),
          (box.enterY = 0));
      }
      let currentY = heroBox.y - heroBox.measuredHeight / 2 - stackGap;
      for (let i = topCount - 1; i >= 0; i--) {
        const box = boxes[i];
        ((box.layoutDirection = 'vertical'),
          (box.x = heroBox.x + (i % 2 === 0 ? 15 : -15)),
          (box.y = currentY - box.measuredHeight / 2),
          (currentY -= box.measuredHeight + stackGap + topStretch),
          (box.enterX = 0),
          (box.enterY = -30));
      }
      currentX = heroBox.x + heroBox.measuredWidth / 2 + stackGap;
      for (let i = heroIndex + 1; i <= heroIndex + rightCount; i++) {
        const box = boxes[i];
        ((box.layoutDirection = 'horizontal'),
          (box.x = currentX + box.measuredWidth / 2),
          (box.y = heroBox.y + (i % 2 === 0 ? 10 : -10)),
          (currentX += box.measuredWidth + flowGap),
          (box.enterX = 30),
          (box.enterY = 0));
      }
      currentY = heroBox.y + heroBox.measuredHeight / 2 + stackGap;
      for (let i = heroIndex + rightCount + 1; i < boxes.length; i++) {
        const box = boxes[i];
        ((box.layoutDirection = 'vertical'),
          (box.x = heroBox.x + (i % 2 === 0 ? 15 : -15)),
          (box.y = currentY + box.measuredHeight / 2),
          (currentY += box.measuredHeight + stackGap + bottomStretch),
          (box.enterX = 0),
          (box.enterY = 30));
      }
    });
  };
export {
  layoutCrossStack,
  layoutEditorialColumn,
  layoutFragmentCollage,
  layoutQuietTableau,
  layoutTrackingRibbon,
  placeWithGlobalFit,
  resolveSonnetFlowGaps,
};
