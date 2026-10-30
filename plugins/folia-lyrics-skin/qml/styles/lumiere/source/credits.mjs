// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { codePoints } from '../../../shared/text/codepoints.mjs';
import { createRng } from './lumiereRandom.mjs';
import { resolveThemeFontStack, resolveThemeFontWeight } from './fontStacks.mjs';
import { hexOf } from './color.mjs';
import { createBloomFilter } from './light/bloomFilter.mjs';
import { createLightField } from './light/lightFieldShader.mjs';
import { createMotes } from './light/motes.mjs';
import { resolveBeams } from './light/rig.mjs';
import { createLineArt } from './lineart/lineArt.mjs';
import {
  mergeSpecs,
  protractorHalo,
  scatteredSparks,
  viewfinderFrame,
} from './lineart/recipes.mjs';
import { FOG, GLARE, MOTES, shaft } from './rigs/base.mjs';
import { LUMIERE_SHADER_NO_DARK, resolveLumierePalette } from './scene.mjs';
import { createLyricWindow } from './text/lyricWindow.mjs';
import { LUMIERE_BLOOM } from './types.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (15875 ^ lumiereScaleMask) +
  Math.imul(15230 ^ lumiereScaleMask, 10553 ^ lumiereScaleMask) -
  ((15875 ^ lumiereScaleMask) + Math.imul(15230 ^ lumiereScaleMask, 10553 ^ lumiereScaleMask));
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
const TITLE_START = 1.5 + LUMIERE_NEUTRAL_OFFSET;
const TITLE_SPAN = 2.4;
const TITLE_STEP = 0.14;
const resolveLumiereCreditsFrame = (time, finalEndTime) => {
  const elapsed = time - finalEndTime;
  if (elapsed <= 0)
    return {
      active: false,
      lyricAlpha: 1,
      lyricBlur: 0,
      posterAlpha: 0,
      posterOffsetY: 0,
      posterScale: 0.985,
    };
  const exit = smooth(elapsed / 1.6);
  const enter = smooth((elapsed - 0.5) / 1.4);
  return {
    active: true,
    lyricAlpha: 1 - exit,
    lyricBlur: exit * 10,
    posterAlpha: enter,
    posterOffsetY: 0,
    posterScale: 0.985 + 0.015 * enter,
  };
};
const clean = (value) => {
  var _a;
  return (_a = value == null ? void 0 : value.trim()) != null ? _a : '';
};
const hasLumiereCredits = (metadata) =>
  Boolean(clean(metadata.title) || clean(metadata.artist) || clean(metadata.album));
const titleLine = (title) => {
  const chars = codePoints(title);
  const step = Math.min(TITLE_STEP, TITLE_SPAN / Math.max(chars.length, 1));
  return {
    fullText: title,
    startTime: TITLE_START,
    endTime: TITLE_START + step * chars.length + 0.6,
    words: chars.map((text, i) => ({
      text,
      startTime: TITLE_START + i * step,
      endTime: TITLE_START + (i + 1) * step,
    })),
  };
};
const createLumiereCredits = (pixi, options) => {
  const { width, height, tuning, sprites, theme } = options;
  const aspect = width / height;
  const palette = resolveLumierePalette(theme, tuning.themeColorMix);
  const lightHex = hexOf(palette.light);
  const title = clean(options.metadata.title);
  const artist = clean(options.metadata.artist);
  const album = clean(options.metadata.album);
  const random = createRng('lumiere:credits');
  const rig = {
    beams: [
      shaft({ spread: 0.1, width: 0.06, length: 0.9, intensity: 0.85 }),
      shaft({
        spread: 0.3,
        width: 0.1,
        length: 0.6,
        softness: 0.9,
        intensity: 0.22,
        streaks: 0.85,
        streakFreq: 26,
        core: 0.3,
      }),
    ],
    fog: __spreadProps(__spreadValues({}, FOG), { density: 0.9 }),
    glare: __spreadProps(__spreadValues({}, GLARE), { intensity: 0.8 }),
  };
  const view = new pixi.Container();
  const graphics = new pixi.Container();
  const field = createLightField(pixi, width, height);
  const art = createLineArt(pixi, {
    height,
    spec: mergeSpecs(
      protractorHalo({ cx: aspect * 0.5, cy: 0.03, radius: 0.3, alpha: 0.55 }),
      viewfinderFrame({
        aspect,
        left: 0.16,
        top: 0.27,
        right: 0.84,
        bottom: 0.7,
        delay: 0.1,
        alpha: 0.32,
      }),
      scatteredSparks({ aspect, count: 14, random, delay: 0.3 })
    ),
    starTexture: sprites.star,
  });
  art.view.visible = tuning.lineArt;
  const motes = createMotes(pixi, {
    width,
    height,
    seed: 'lumiere:credits:motes',
    texture: sprites.dot,
    spec: __spreadProps(__spreadValues({}, MOTES), {
      count: Math.round(MOTES.count * tuning.moteAmount),
    }),
  });
  graphics.addChild(field.view, art.view, motes.view);
  graphics.filterArea = new pixi.Rectangle(0, 0, width, height);
  const text = new pixi.Container();
  const font = resolveThemeFontStack(theme);
  const window = title
    ? createLyricWindow(pixi, {
        width,
        height,
        lines: [titleLine(title)],
        font,
        weight: resolveThemeFontWeight(theme, 600),
        resolution: options.resolution,
        region: { cx: 0.5 * aspect, cy: 0.49, w: 0.6 * aspect, h: 0.2 },
        heroPx: 0.1 * height,
        neighbors: 1,
        typography: 'horizontal',
        decay: { strength: 0, delay: 1 },
        drift: 0,
        seed: 'lumiere:credits:title',
        sprites,
        letterSpacing: 0.06,
      })
    : null;
  if (window) text.addChild(window.view);
  const detailStyle = (size, color, spacing) =>
    new pixi.TextStyle({
      fontFamily: font,
      fontWeight: String(resolveThemeFontWeight(theme, 500)),
      fontSize: size,
      fill: hexOf(color),
      letterSpacing: size * spacing,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width * 0.6,
    });
  const detailSize = Math.max(13, height * 0.028);
  const details = [
    artist
      ? {
          text: artist.toLocaleUpperCase(),
          y: 0.35,
          size: detailSize,
          spacing: 0.32,
          color: palette.lit,
          delay: 0.9,
        }
      : null,
    album
      ? {
          text: album,
          y: 0.65,
          size: detailSize * 0.85,
          spacing: 0.16,
          color: palette.unlit,
          delay: 1.2,
        }
      : null,
  ]
    .filter((item) => item !== null)
    .map((item) => {
      const label = new pixi.Text({
        text: item.text,
        style: detailStyle(item.size, item.color, item.spacing),
        resolution: options.resolution,
      });
      label.anchor.set(0.5);
      label.position.set(width / 2, item.y * height);
      label.alpha = 0;
      text.addChild(label);
      return {
        label,
        delay:
          item.delay +
          (title
            ? TITLE_START + Math.min(TITLE_SPAN, TITLE_STEP * codePoints(title).length) - 0.6
            : 0),
      };
    });
  view.addChild(graphics, text);
  const graphicsBloom = createBloomFilter(
    pixi,
    __spreadProps(__spreadValues({}, LUMIERE_BLOOM.graphics), {
      strength: LUMIERE_BLOOM.graphics.strength * tuning.bloom,
      padding: 0,
      tint: [1, 1, 1],
    })
  );
  const textBloom = createBloomFilter(
    pixi,
    __spreadProps(__spreadValues({}, LUMIERE_BLOOM.text), {
      strength: LUMIERE_BLOOM.text.strength * tuning.textBloom,
      padding: 0,
      tint: [1, 1, 1],
    })
  );
  text.filterArea = new pixi.Rectangle(-width, -height, width * 3, height * 3);
  graphics.filters = tuning.bloom > 0 ? [graphicsBloom] : [];
  text.filters = tuning.textBloom > 0 ? [textBloom] : [];
  graphics.renderable = !tuning.textOnly;
  const update = (elapsed) => {
    const time = Math.max(0, elapsed);
    const rise = smooth((time - 0.6) / 1.6);
    const ignite = time >= 0.9 ? 1.2 * Math.exp(-(time - 0.9) / 0.4) : 0;
    const beams = resolveBeams(rig, time, aspect, {
      intensity: rise * tuning.lightIntensity,
      bass: 0,
      color: palette.light,
      local: time,
    });
    if (!tuning.textOnly) {
      field.update({
        beams,
        rig,
        time,
        fogScale: tuning.fogDensity,
        color: palette.light,
        glareScale: rise * tuning.lightIntensity * (1 + ignite),
        dark: LUMIERE_SHADER_NO_DARK,
        octaves: tuning.fogOctaves,
      });
      const draw = (time - 0.8) / 3.6;
      art.view.visible = tuning.lineArt && draw > 0;
      if (art.view.visible) art.update(time, draw, smooth((time - 0.8) / 1.2), beams, lightHex);
      motes.update(time, beams, lightHex, rise);
    }
    window == null
      ? void 0
      : window.update({
          time,
          beams,
          litColor: palette.lit,
          unlitColor: palette.unlit,
          unlitAlpha: tuning.unlitOpacity,
          hideTrails: tuning.hideTrails,
          intensity: smooth((time - 0.4) / 0.8),
        });
    details.forEach(({ label, delay }) => {
      label.alpha = smooth((time - delay) / 1.4) * 0.9;
    });
  };
  update(0);
  return {
    view,
    graphics,
    text,
    update,
    destroy: () => {
      graphics.filters = [];
      text.filters = [];
      graphicsBloom.destroy();
      textBloom.destroy();
      field.destroy();
      art.destroy();
      motes.destroy();
      window == null ? void 0 : window.destroy();
      view.destroy({ children: true });
    },
  };
};
export { createLumiereCredits, hasLumiereCredits, resolveLumiereCreditsFrame };
