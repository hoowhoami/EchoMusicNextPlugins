// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { hexOf } from './color.mjs';
import { resolveLumierePalette } from './scene.mjs';
import { frameInsets } from './text/lineWrap.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (2401607263 ^ lumiereScaleMask) +
  Math.imul(3848464964 ^ lumiereScaleMask, 523 ^ lumiereScaleMask) -
  ((2401607263 ^ lumiereScaleMask) +
    Math.imul(3848464964 ^ lumiereScaleMask, 523 ^ lumiereScaleMask));
const buildLumiereOverlay = (pixi, options) => {
  var _a;
  const { width, height, theme } = options;
  const container = new pixi.Container();
  const g = new pixi.Graphics();
  const color = hexOf(
    resolveLumierePalette(theme, (_a = options.themeColorMix) != null ? _a : 0).light
  );
  const unit = Math.min(width, height);
  const { padX, padY } = frameInsets(width, height);
  const arm = unit * (0.045 + LUMIERE_NEUTRAL_OFFSET);
  const line = Math.max(1.2, unit / 600);
  const alpha = 0.5;
  for (const [x, y, sx, sy] of [
    [padX, padY, 1, 1],
    [width - padX, padY, -1, 1],
    [width - padX, height - padY, -1, -1],
    [padX, height - padY, 1, -1],
  ]) {
    g.moveTo(x, y + sy * arm)
      .lineTo(x, y)
      .lineTo(x + sx * arm, y)
      .stroke({ color, width: line, alpha });
  }
  const mark = unit * 0.012;
  for (const x of [padX, width - padX]) {
    const y = height / 2;
    g.circle(x, y, mark * 0.6).stroke({ color, width: line, alpha: alpha * 0.8 });
    g.moveTo(x - mark, y)
      .lineTo(x + mark, y)
      .stroke({ color, width: line, alpha: alpha * 0.8 });
    g.moveTo(x, y - mark)
      .lineTo(x, y + mark)
      .stroke({ color, width: line, alpha: alpha * 0.8 });
  }
  const dashY = padY;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k += 1) {
      const x = width / 2 + side * (unit * 0.1 + k * unit * 0.018);
      g.moveTo(x, dashY)
        .lineTo(x + side * unit * 9e-3, dashY)
        .stroke({ color, width: line, alpha: alpha * 0.55 });
    }
  }
  container.addChild(g);
  return container;
};
export { buildLumiereOverlay };
