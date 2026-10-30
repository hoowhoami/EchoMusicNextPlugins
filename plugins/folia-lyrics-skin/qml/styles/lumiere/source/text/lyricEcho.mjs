// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { createRng } from '../lumiereRandom.mjs';
import { compressLight, lightAt } from '../light/rig.mjs';
import { splitLyricGraphemes } from '../../../../shared/text/graphemeTiming.mjs';
import { buildGlyphLine } from './glyphLine.mjs';
import { buildGlyphTimings } from './reveal.mjs';
import { segmentWords } from './wordStyle.mjs';
import { hexOf } from '../color.mjs';
import { keywordEchoColor, resolveGlyphKeywordColors } from './keywordColors.mjs';
const LIFE = 7;
const SPEED = 0.075;
const BIRTH_DISTANCE = 0.08;
const PREPARE = 3;
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const createLyricEcho = (pixi, options) => {
  const { height } = options;
  const rng = createRng(`${options.seed}:echo`);
  const view = new pixi.Container();
  const fontPx = options.size * height;
  const resolution = Math.min(options.resolution, 1.5);
  const fragments = [];
  const holders = [];
  const echoLines = [];
  options.lines.forEach((line) => {
    const graphemes = splitLyricGraphemes(line.fullText);
    const timings = buildGlyphTimings(line);
    const keywordColors =
      options.keywords && options.keywords.length > 0
        ? resolveGlyphKeywordColors(line.fullText, options.keywords)
        : null;
    const first = fragments.length;
    segmentWords(line).forEach((word) => {
      var _a, _b;
      if (word.blank) return;
      const end = Math.min(word.end, graphemes.length);
      if (end <= word.start) return;
      const holder = new pixi.Container();
      view.addChild(holder);
      holders.push(holder);
      fragments.push({
        birth:
          (_b = (_a = timings[word.start]) == null ? void 0 : _a.start) != null
            ? _b
            : line.startTime,
        across: (rng() - 0.5) * 2.8,
        speed: 0.7 + rng() * 0.7,
        scale: 0.4 + rng() * 0.6,
        rotation: (rng() - 0.5) * 0.9,
        stretch: 0.75 + rng() * 0.7,
        shear: (rng() - 0.5) * 0.12,
        spin: (rng() - 0.5) * 0.08,
        start: word.start,
        end,
        glyphs: graphemes.slice(word.start, end).map((char, offsetInWord) => {
          var _a2;
          const angle = rng() * Math.PI * 2;
          return {
            sprite: null,
            blank: char.trim().length === 0,
            offset: 0,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            speed: 0.3 + rng() * 0.9,
            spin: (rng() - 0.5) * 0.5,
            keyword:
              (_a2 = keywordColors == null ? void 0 : keywordColors[word.start + offsetInWord]) !=
              null
                ? _a2
                : null,
          };
        }),
      });
    });
    const births = fragments.slice(first).map((fragment) => fragment.birth);
    if (births.length === 0) return;
    echoLines.push({
      text: line.fullText,
      first,
      last: fragments.length,
      from: Math.min(...births),
      to: Math.max(...births),
      layout: null,
    });
  });
  const rasterize = (echoLine) => {
    const layout = buildGlyphLine(pixi, {
      text: echoLine.text,
      fontPx,
      font: options.font,
      weight: options.weight,
      resolution,
      letterSpacing: 0.04,
      outline: 0.012,
      maxCanvasPx: 4096,
    });
    echoLine.layout = layout;
    for (let index = echoLine.first; index < echoLine.last; index += 1) {
      const fragment = fragments[index];
      const slices = layout.glyphs.slice(fragment.start, fragment.end);
      const left = slices[0].charX;
      const right = slices[slices.length - 1].charX + slices[slices.length - 1].charWidth;
      const middle = (left + right) / 2;
      fragment.glyphs.forEach((glyph, offsetInWord) => {
        const slice = slices[offsetInWord];
        const sprite = new pixi.Sprite(slice.texture);
        sprite.anchor.set(slice.anchorX, slice.anchorY);
        sprite.visible = !glyph.blank;
        holders[index].addChild(sprite);
        glyph.sprite = sprite;
        glyph.offset = slice.charX + slice.charWidth / 2 - middle;
      });
    }
  };
  const release = (echoLine) => {
    var _a;
    for (let index = echoLine.first; index < echoLine.last; index += 1) {
      holders[index].removeChildren().forEach((child) => child.destroy());
      fragments[index].glyphs.forEach((glyph) => {
        glyph.sprite = null;
      });
    }
    (_a = echoLine.layout) == null ? void 0 : _a.destroy();
    echoLine.layout = null;
  };
  const prepare = (time) => {
    let budget = 1;
    for (const echoLine of echoLines) {
      if (time < echoLine.from - PREPARE || time > echoLine.to + LIFE) {
        if (echoLine.layout) release(echoLine);
      } else if (!echoLine.layout && (time >= echoLine.from || budget-- > 0)) {
        rasterize(echoLine);
      }
    }
  };
  const hasKeywords = fragments.some((fragment) => fragment.glyphs.some((glyph) => glyph.keyword));
  const keywordHex = /* @__PURE__ */ new Map();
  let keywordFor = -1;
  const keywordTint = (color, keyword) => {
    if (color !== keywordFor) {
      keywordHex.clear();
      keywordFor = color;
    }
    let hex = keywordHex.get(keyword);
    if (hex === void 0) {
      const light = [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
      hex = hexOf(keywordEchoColor(light, keyword));
      keywordHex.set(keyword, hex);
    }
    return hex;
  };
  const update = ({ time, beams, color, intensity }) => {
    var _a, _b, _c, _d;
    prepare(time);
    const beam = beams[0];
    const ox = (_a = beam == null ? void 0 : beam.ox) != null ? _a : options.width / height / 2;
    const oy = (_b = beam == null ? void 0 : beam.oy) != null ? _b : 0;
    const bx = (_c = beam == null ? void 0 : beam.dx) != null ? _c : 0;
    const by = (_d = beam == null ? void 0 : beam.dy) != null ? _d : 1;
    const halfAt = (distance) => (beam ? beam.halfWidth + distance * beam.tanSpread : 0.08) + 0.04;
    fragments.forEach((fragment, index) => {
      const holder = holders[index];
      const age = time - fragment.birth;
      const presence = smooth(age / 0.9) * (1 - smooth((age - (LIFE - 2.5)) / 2.5));
      const alpha = presence * intensity * options.opacity;
      holder.visible = age >= 0 && age <= LIFE && alpha > 3e-3;
      if (!holder.visible) return;
      const distance = BIRTH_DISTANCE + SPEED * fragment.speed * age;
      const across = fragment.across * halfAt(distance);
      const x = (ox + bx * distance - by * across) * height;
      const y = (oy + by * distance + bx * across) * height;
      holder.position.set(x, y);
      holder.rotation = fragment.rotation + fragment.spin * age;
      holder.scale.set(fragment.scale * fragment.stretch, fragment.scale);
      holder.skew.set(fragment.shear * age, 0);
      const split = 0.05 * age ** 1.3;
      const lit = compressLight(lightAt(beams, x / height, y / height));
      const glyphAlpha = alpha * (0.05 + 0.4 * lit);
      for (const glyph of fragment.glyphs) {
        if (!glyph.sprite) continue;
        glyph.sprite.position.set(
          glyph.offset + glyph.dx * fontPx * split * glyph.speed,
          glyph.dy * fontPx * split * glyph.speed
        );
        glyph.sprite.rotation = glyph.spin * split * 4;
        glyph.sprite.alpha = glyphAlpha;
        glyph.sprite.tint =
          hasKeywords && glyph.keyword ? keywordTint(color, glyph.keyword) : color;
      }
    });
  };
  return {
    view,
    update,
    destroy: () => {
      view.destroy({ children: true });
      echoLines.forEach((echoLine) => {
        var _a;
        return (_a = echoLine.layout) == null ? void 0 : _a.destroy();
      });
    },
  };
};
export { createLyricEcho };
