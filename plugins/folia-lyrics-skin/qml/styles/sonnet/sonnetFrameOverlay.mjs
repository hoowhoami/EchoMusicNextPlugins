// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { destroySonnetContainerChildren } from './sonnetPixiResources.mjs';
const drawSonnetFrameOverlay = (pixi, container, width, height, tuning, theme) => {
  if (
    (destroySonnetContainerChildren(container),
    tuning.showOnlyText || tuning.outerFrameMode === 'none')
  )
    return;
  const g = new pixi.Graphics(),
    paddingX = Math.max(30, width * 0.05),
    paddingY = Math.max(30, height * 0.05),
    primary = pixi.Color.shared.setValue(theme.primaryColor).toNumber(),
    alpha = 0.5;
  (g.rect(paddingX, paddingY, 30, 4).fill({ color: primary, alpha: 0.8 }),
    g
      .moveTo(paddingX, paddingY + 16)
      .lineTo(paddingX, paddingY + 120)
      .stroke({ color: primary, width: 1, alpha }),
    g
      .rect(width - paddingX - 4, height - paddingY - 16, 4, 16)
      .fill({ color: primary, alpha: 0.8 }),
    g
      .moveTo(width - paddingX - 160, height - paddingY)
      .lineTo(width - paddingX - 20, height - paddingY)
      .stroke({ color: primary, width: 1, alpha }),
    g
      .moveTo(width - paddingX, height - paddingY - 180)
      .lineTo(width - paddingX, height - paddingY - 30)
      .stroke({ color: primary, width: 1, alpha }),
    ((cx, cy, size) => {
      (g
        .moveTo(cx - size, cy)
        .lineTo(cx + size, cy)
        .stroke({ color: primary, width: 1, alpha: 0.8 }),
        g
          .moveTo(cx, cy - size)
          .lineTo(cx, cy + size)
          .stroke({ color: primary, width: 1, alpha: 0.8 }));
    })(width - paddingX, paddingY + 20, 6),
    g
      .moveTo(paddingX, height - paddingY - 4)
      .lineTo(paddingX + 4, height - paddingY)
      .lineTo(paddingX, height - paddingY + 4)
      .lineTo(paddingX - 4, height - paddingY)
      .fill({ color: primary, alpha: 0.7 }));
  const starStyle = new pixi.TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 12,
      fill: primary,
    }),
    starText = new pixi.Text({ text: '\u2726', style: starStyle });
  ((starText.alpha = 0.6),
    starText.position.set(width - paddingX - 10, height - paddingY),
    starText.anchor.set(1, 0.5),
    container.addChild(g, starText));
};
export { drawSonnetFrameOverlay };
