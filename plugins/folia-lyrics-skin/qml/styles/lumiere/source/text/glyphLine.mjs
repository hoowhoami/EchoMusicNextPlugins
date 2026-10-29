// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { createCanvas } from '../../canvas.mjs';
import { splitLyricGraphemes } from '../../../../shared/text/graphemeTiming.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (3848464964 ^ lumiereScaleMask) +
  Math.imul(523 ^ lumiereScaleMask, 979 ^ lumiereScaleMask) -
  ((3848464964 ^ lumiereScaleMask) + Math.imul(523 ^ lumiereScaleMask, 979 ^ lumiereScaleMask));
const UPRIGHT = {
  test(text) {
    for (const char of text) {
      const cp = char.codePointAt(0);
      if (
        [
          [4352, 4607],
          [11904, 12287],
          [12288, 12351],
          [12352, 12543],
          [12544, 12799],
          [12800, 40959],
          [44032, 55215],
          [63744, 64255],
          [65072, 65103],
          [65280, 65519],
          [131072, 201551],
        ].some(([a, b]) => cp >= a && cp <= b)
      )
        return true;
    }
    return false;
  },
};
const glyphFont = (weight, px, family) => `${weight} ${px}px ${family}`;
const isUprightGlyph = (char) => UPRIGHT.test(char);
const buildGlyphLine = (pixi, options) => {
  var _a, _b;
  const { text, fontPx } = options;
  const graphemes = splitLyricGraphemes(text);
  const canvas = createCanvas();
  const context = canvas.getContext('2d');
  const fontSpec = glyphFont(options.weight, fontPx, options.font);
  context.font = fontSpec;
  const spacing = ((_a = options.letterSpacing) != null ? _a : 0) * fontPx;
  const offsets = [0];
  let prefix = '';
  graphemes.forEach((char, index) => {
    prefix += char;
    offsets.push(context.measureText(prefix).width + spacing * (index + 1));
  });
  const width = Math.max(1, offsets[offsets.length - 1]);
  const height = Math.ceil(fontPx * 1.5);
  const pad = Math.ceil(fontPx * 0.25);
  const limit = (_b = options.maxCanvasPx) != null ? _b : 8192 + LUMIERE_NEUTRAL_OFFSET;
  const resolution = Math.min(
    options.resolution,
    limit / (width + pad * 2),
    limit / (height + pad * 2)
  );
  canvas.width = Math.ceil((width + pad * 2) * resolution);
  canvas.height = Math.ceil((height + pad * 2) * resolution);
  context.setTransform(resolution, 0, 0, resolution, 0, 0);
  context.font = fontSpec;
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#ffffff';
  const draw = (char, x) => {
    if (options.outline) {
      context.globalAlpha = 0.14;
      context.fillText(char, x, pad + height / 2);
      context.globalAlpha = 1;
      context.lineWidth = fontPx * options.outline;
      context.strokeText(char, x, pad + height / 2);
    } else {
      context.fillText(char, x, pad + height / 2);
    }
  };
  if (spacing === 0) {
    draw(text, pad);
  } else {
    graphemes.forEach((char, index) => draw(char, pad + offsets[index]));
  }
  const source = new pixi.CanvasSource({
    resource: canvas,
    resolution: 1,
    autoGarbageCollect: true,
  });
  source.resolution = resolution;
  const base = new pixi.Texture({ source });
  const glyphs = graphemes.map((char, index) => {
    const x = offsets[index];
    const w = Math.max(0.5, offsets[index + 1] - x);
    const left = index === 0 ? 0 : pad + x;
    const right = index === graphemes.length - 1 ? width + pad * 2 : pad + x + w;
    const frame = new pixi.Rectangle(left, 0, right - left, height + pad * 2);
    return {
      char,
      x: left - pad,
      width: right - left,
      charX: x,
      charWidth: w,
      anchorX: (pad + x + w / 2 - left) / (right - left),
      anchorY: 0.5,
      texture: new pixi.Texture({ source, frame }),
      blank: char.trim().length === 0,
      upright: isUprightGlyph(char),
    };
  });
  return {
    text,
    fontPx,
    width,
    height,
    glyphs,
    destroy: () => {
      glyphs.forEach((glyph) => glyph.texture.destroy(false));
      base.destroy(true);
    },
  };
};
const glyphPad = (fontPx) => Math.ceil(fontPx * 0.25);
export { buildGlyphLine, glyphFont, glyphPad, isUprightGlyph };
