// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { flatMap } from '../../../../shared/text/compat.mjs';
import { splitLyricGraphemes } from '../../../../shared/text/graphemeTiming.mjs';
import { buildGlyphLine } from './glyphLine.mjs';
import { resolveGlyphKeywordColors } from './keywordColors.mjs';
import { flowLine } from './lineWrap.mjs';
import { buildGlyphTimings } from './reveal.mjs';
import { MAX_WORD_SCALE, segmentWords, wordJags, wordScales } from './wordStyle.mjs';
const GLYPH_RANDOM_DRAWS = 19;
const LINE_RANDOM_DRAWS = 4;
const buildLineMetas = (lines) => {
  let offset = 0;
  return lines.map((line) => {
    const graphemes = splitLyricGraphemes(line.fullText);
    const meta = { line, graphemes, randomOffset: offset, timing: void 0, keywordColors: void 0 };
    offset += graphemes.length * GLYPH_RANDOM_DRAWS + LINE_RANDOM_DRAWS;
    return meta;
  });
};
const lineTimingOf = (meta) => {
  if (!meta.timing) {
    const { line, graphemes } = meta;
    const timings = buildGlyphTimings(line);
    const sung = flatMap(graphemes, (char, index) => {
      var _a;
      return char.trim().length === 0
        ? []
        : [(_a = timings[index]) != null ? _a : { start: line.startTime, end: line.endTime }];
    });
    meta.timing = {
      timings,
      singStart: sung.length ? Math.min(...sung.map((timing) => timing.start)) : line.startTime,
      singEnd: sung.length ? Math.max(...sung.map((timing) => timing.end)) : line.endTime,
    };
  }
  return meta.timing;
};
const keywordColorsOf = (meta, keywords) => {
  if (meta.keywordColors === void 0) {
    meta.keywordColors =
      keywords && keywords.length > 0
        ? resolveGlyphKeywordColors(meta.line.fullText, keywords)
        : null;
  }
  return meta.keywordColors;
};
const buildLineView = (context, lineIndex, meta, rng) => {
  const { pixi, heroPx, sprites } = context;
  const { line } = meta;
  const { timings, singStart, singEnd } = lineTimingOf(meta);
  const layout = buildGlyphLine(pixi, {
    text: line.fullText,
    fontPx: heroPx * MAX_WORD_SCALE,
    font: context.font,
    weight: context.weight,
    resolution: context.resolution,
    letterSpacing: context.spacing,
  });
  const keywordColors = keywordColorsOf(meta, context.keywords);
  const words = segmentWords(line);
  const wordSeed = `${context.seed}:${lineIndex}:${line.fullText}`;
  const scales = wordScales(words, wordSeed);
  const jags = wordJags(words, scales, wordSeed);
  const wordOf = layout.glyphs.map((_, index) =>
    Math.max(
      0,
      words.findIndex((word) => index >= word.start && index < word.end)
    )
  );
  const glyphScale = (index) => {
    var _a;
    return (_a = scales[wordOf[index]]) != null ? _a : 1;
  };
  const glyphJag = (index) => {
    var _a;
    return ((_a = jags[wordOf[index]]) != null ? _a : 0) * heroPx;
  };
  const flow = flowLine(
    context.measurer,
    layout.glyphs.map((slice, index) => ({
      char: slice.char,
      scale: glyphScale(index),
      advance: (slice.charWidth / MAX_WORD_SCALE) * glyphScale(index),
      upright: slice.upright,
      jag: glyphJag(index),
    })),
    words,
    { heroPx, limits: context.limits }
  );
  const holder = new pixi.Container();
  const haloLayer = new pixi.Container();
  const starLayer = new pixi.Container();
  holder.label = `line-${lineIndex}`;
  const glyphs = layout.glyphs.map((slice, index) => {
    var _a, _b;
    const glyph = new pixi.Sprite(slice.texture);
    glyph.anchor.set(slice.anchorX, slice.anchorY);
    holder.addChild(glyph);
    const a1 = rng() * Math.PI * 2;
    const a2 = a1 + Math.PI * (rng() < 0.5 ? 0.5 : 1.5) + (rng() - 0.5) * 0.8;
    const m1 = heroPx * (1.6 + rng() * 3.2);
    const m2 = heroPx * (1 + rng() * 2.6);
    const duration = 0.45 + rng() * 0.4;
    const flight = {
      c1: { x: Math.cos(a1) * m1, y: Math.sin(a1) * m1 },
      c2: { x: Math.cos(a2) * m2, y: Math.sin(a2) * m2 },
      delay: rng() * (1 - duration),
      duration,
      spin: (rng() - 0.5) * 2.4,
      wobble: rng() * Math.PI * 2,
    };
    const halo = new pixi.Sprite(sprites.dot);
    halo.anchor.set(0.5);
    haloLayer.addChild(halo);
    const star = new pixi.Sprite(sprites.star);
    star.anchor.set(0.5);
    starLayer.addChild(star);
    if (slice.blank) {
      glyph.visible = false;
      halo.visible = false;
      star.visible = false;
    }
    const angle = -Math.PI / 2 + (rng() - 0.5) * 2.2;
    const scatterAngle = rng() * Math.PI * 2;
    const scatterDistance = 0.6 + rng() * 1.4;
    return {
      glyph,
      halo,
      star,
      timing: (_a = timings[index]) != null ? _a : { start: line.startTime, end: line.endTime },
      blank: slice.blank,
      index,
      vRotation: slice.upright ? 0 : Math.PI / 2,
      flight,
      scale: glyphScale(index),
      starShape: {
        dx: -0.15 + rng() * 0.5,
        // 上下随机：多数落在字的上半，少数压到字脚下。
        dy: -0.62 + rng() ** 1.4 * 0.9,
        rotation: (rng() - 0.5) * 0.5,
        size: 0.65 + rng() * 0.7,
      },
      drift: {
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        speed: 0.6 + rng() * 0.9,
        spin: (rng() - 0.5) * 2,
      },
      scatter: {
        x: Math.cos(scatterAngle) * scatterDistance,
        y: Math.sin(scatterAngle) * scatterDistance,
      },
      phase: rng() * Math.PI * 2,
      keyword: slice.blank
        ? null
        : (_b = keywordColors == null ? void 0 : keywordColors[index]) != null
          ? _b
          : null,
      tints: null,
    };
  });
  const spot = new pixi.Sprite(sprites.dot);
  spot.anchor.set(0.5);
  const [slow, fast] = context.driftSpeed;
  return {
    index: lineIndex,
    line,
    layout,
    holder,
    haloLayer,
    starLayer,
    glyphs,
    keywordGlyphs: glyphs.filter((glyph) => glyph.keyword !== null),
    flow,
    // 落点用单独的随机流：排版换来换去时，别的随机量不受影响。
    placements: context.placementsOf(lineIndex),
    spot,
    singStart,
    singEnd,
    jitter: (rng() - 0.5) * 0.16,
    velocity: (() => {
      const angle = rng() * Math.PI * 2;
      const speed = slow + rng() * (fast - slow);
      return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    })(),
    motionPhase: rng() * Math.PI * 2,
  };
};
export {
  GLYPH_RANDOM_DRAWS,
  LINE_RANDOM_DRAWS,
  buildLineMetas,
  buildLineView,
  keywordColorsOf,
  lineTimingOf,
};
