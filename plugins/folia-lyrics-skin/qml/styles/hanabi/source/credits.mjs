// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/credits.ts
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
import { resolveThemeFontStack, resolveThemeFontWeight } from './_shared/utils/fontStacks.mjs';
import { burstPreset } from './catalog.mjs';
import { createCollageTextureCache } from './collage/collagePainters.mjs';
import { CANDY, HANABI_FALLBACK_ICON, ICON_INKS } from './collage/collagePlan.mjs';
import { createShotCollage } from './collage/collageViews.mjs';
import { resolveHanabiPalette } from './color.mjs';
import { resolveHanabiGlowQuality } from './hanabiTuning.mjs';
import { createFireworks } from './mg/fireworks.mjs';
import { createHanabiGlow } from './mg/glow.mjs';
import { createHanabiText } from './text/lyricText.mjs';
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
const BLOOM_AT = 1.1;
const TITLE_START = 1.45;
const TITLE_STEP = 0.12;
const TITLE_SPAN = 2;
const clean = (value) => {
  var _a;
  return (_a = value == null ? void 0 : value.trim()) != null ? _a : '';
};
const hasHanabiCredits = (metadata) =>
  Boolean(clean(metadata.title) || clean(metadata.artist) || clean(metadata.album));
const resolveHanabiCreditsFrame = (time, finalEndTime) => {
  const elapsed = time - finalEndTime;
  if (elapsed <= 0)
    return {
      active: false,
      lyricAlpha: 1,
      lyricBlur: 0,
      posterAlpha: 0,
      posterOffsetY: 0,
      posterScale: 1,
    };
  const exit = smooth(elapsed / 1.2);
  return {
    active: true,
    lyricAlpha: 1 - exit,
    lyricBlur: exit * 6,
    posterAlpha: smooth((elapsed - 0.3) / 0.8),
    posterOffsetY: 0,
    posterScale: 1,
  };
};
const titleLine = (title) => {
  const chars = Array.from(title);
  const step = Math.min(TITLE_STEP, TITLE_SPAN / Math.max(chars.length, 1));
  return {
    fullText: title,
    startTime: TITLE_START,
    endTime: TITLE_START + step * chars.length + 0.4,
    words: chars.map((text, i) => ({
      text,
      startTime: TITLE_START + i * step,
      endTime: TITLE_START + (i + 1) * step,
    })),
  };
};
const TITLE_SPEC = {
  layout: 'center',
  heroSize: 0.11,
  emphasis: 0.2,
  tilt: 0,
  block: 'band',
  enter: 'pop',
  sing: 'color',
  exit: 'ascend',
  stagger: 0.05,
  outline: false,
  hardShadow: true,
};
const createHanabiCredits = (pixi, options) => {
  var _a, _b, _c;
  const { width, height, theme, tuning } = options;
  const palette = resolveHanabiPalette('kawaii', theme, tuning.colorMode);
  const title = clean(options.metadata.title);
  const artist = clean(options.metadata.artist);
  const album = clean(options.metadata.album);
  const view = new pixi.Container();
  const sky = new pixi.Container();
  view.addChild(sky);
  const fireworks = createFireworks(pixi, options.textures, {
    width,
    height,
    palette,
    amount: Math.max(0, tuning.sparkAmount),
    maxParticles: 1400,
  });
  sky.addChild(fireworks.view);
  const glow =
    tuning.glow > 0
      ? createHanabiGlow(
          pixi,
          Math.min(2, tuning.glow),
          resolveHanabiGlowQuality(width, height, options.resolution, tuning.renderQuality),
        )
      : null;
  if (glow) sky.filters = [glow];
  const bursts = [
    {
      x: width * 0.5,
      y: height * 0.34,
      at: BLOOM_AT,
      spec: __spreadProps(__spreadValues({}, burstPreset('kamuro', [0, 1, 3])), {
        count: 150,
        radius: 0.46,
        duration: 4.2,
      }),
      seed: 'hanabi:credits:crown',
      scale: 1,
    },
    {
      x: width * 0.2,
      y: height * 0.3,
      at: BLOOM_AT + 0.55,
      spec: burstPreset('senrin', [1, 2, 3]),
      seed: 'hanabi:credits:left',
      scale: 0.8,
    },
    {
      x: width * 0.8,
      y: height * 0.27,
      at: BLOOM_AT + 0.8,
      spec: burstPreset('senrin', [2, 3, 0]),
      seed: 'hanabi:credits:right',
      scale: 0.8,
    },
    {
      x: width * 0.5,
      y: height * 0.22,
      at: BLOOM_AT + 2.2,
      spec: burstPreset('willow-ring', [3, 0, 1]),
      seed: 'hanabi:credits:finale',
      scale: 0.9,
    },
  ];
  const launches = bursts.map((burst, k) => ({
    fromX: burst.x + (k % 2 === 0 ? -1 : 1) * width * 0.02,
    fromY: height * 1.03,
    toX: burst.x,
    toY: burst.y,
    at: burst.at - 0.45,
    duration: 0.45,
    color: palette.glow,
    seed: `hanabi:credits:launch${k}`,
  }));
  const text = title
    ? createHanabiText({
        pixi,
        width,
        height,
        resolution: options.resolution,
        theme,
        line: titleLine(title),
        regionWidth: width * 0.72,
        regionHeight: height * 0.26,
        spec: __spreadProps(__spreadValues({}, TITLE_SPEC), {
          heroSize: TITLE_SPEC.heroSize * ((_a = options.fontScale) != null ? _a : 1),
        }),
        palette,
        seed: 'hanabi:credits:title',
        enterAt: BLOOM_AT - 0.1,
        // 片尾卡一直停在最后一帧，字不退场。
        exitAt: 1e6,
        exitDuration: 1,
        motion: Math.max(0, tuning.textMotion),
        blockOpacity: Math.min(1, Math.max(0, tuning.blockOpacity)),
      })
    : null;
  if (text) {
    text.view.position.set(width / 2, height * 0.5);
    view.addChild(text.view);
  }
  const font = resolveThemeFontStack(theme);
  const detailSize = Math.max(13, height * 0.03);
  const detailStyle = (size, spacing) =>
    new pixi.TextStyle({
      fontFamily: font,
      fontWeight: String(resolveThemeFontWeight(theme, 600)),
      fontSize: size,
      fill: palette.paper,
      letterSpacing: size * spacing,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width * 0.7,
    });
  const titleDone = TITLE_START + Math.min(TITLE_SPAN, TITLE_STEP * Array.from(title).length);
  const details = [
    artist
      ? {
          text: artist.toLocaleUpperCase(),
          y: 0.66,
          size: detailSize,
          spacing: 0.3,
          delay: title ? titleDone : 1.2,
        }
      : null,
    album
      ? {
          text: album,
          y: 0.35,
          size: detailSize * 0.8,
          spacing: 0.16,
          delay: (title ? titleDone : 1.2) + 0.3,
        }
      : null,
  ]
    .filter((item) => item !== null)
    .map((item) => {
      const label = new pixi.Text({
        text: item.text,
        style: detailStyle(item.size, item.spacing),
        resolution: options.resolution,
      });
      label.anchor.set(0.5);
      label.position.set(width / 2, item.y * height);
      label.alpha = 0;
      view.addChild(label);
      return { label, delay: item.delay, y: item.y * height };
    });
  const collageCache =
    tuning.collage > 0 && !tuning.textOnly
      ? createCollageTextureCache(pixi, options.resolution, font)
      : null;
  let collage = null;
  if (collageCache) {
    const unit = Math.min(width, height);
    const stay = { exitAt: 1e6, exitDuration: 1 };
    const band = (style, y, rotation, color, at, from) =>
      __spreadValues(
        {
          kind: 'strip',
          style,
          x: width / 2,
          y,
          length: Math.hypot(width, height) * 1.25,
          thickness: Math.max(18, unit * (style === 'film' ? 0.075 : 0.06)),
          rotation,
          color,
          speed: from * unit * (style === 'film' ? 0.12 : 0.05),
          from,
          at,
        },
        stay,
      );
    const items = [
      band('film', height * 0.85, 0.06, CANDY[0], TITLE_START + 0.4, -1),
      band('lace', height * 0.13, -0.05, CANDY[3], TITLE_START + 0.7, 1),
      {
        kind: 'pop',
        x: width * 0.72,
        y: height * 0.22,
        icon:
          (_c = (_b = options.icons) == null ? void 0 : _b[0]) != null ? _c : HANABI_FALLBACK_ICON,
        color: ICON_INKS[0],
        size: unit * 0.12,
        rotation: 0.16,
        at: BLOOM_AT + 0.04,
        duration: 1.4,
      },
    ];
    const shapes = ['heart', 'star', 'ribbon', 'sparkle'];
    shapes.forEach((shape, k) => {
      items.push(
        __spreadValues(
          {
            kind: 'sticker',
            shape,
            label: null,
            layer: 'front',
            x: width / 2 + (k === 0 || k === 3 ? -1 : 1) * Math.min(width * 0.38, unit * 0.62),
            y: height * 0.5 + (k < 2 ? -1 : 1) * unit * 0.1,
            size: unit * 0.08,
            rotation: (k % 2 === 0 ? -1 : 1) * 0.25,
            color: CANDY[(k + 3) % CANDY.length],
            at: TITLE_START + 0.5 + k * 0.12,
          },
          stay,
        ),
      );
    });
    for (let k = 0; k < 6; k += 1) {
      items.push({
        kind: 'floater',
        shape: shapes[k % shapes.length],
        x: width * (0.12 + ((k * 0.37) % 1) * 0.76),
        y: height * 1.08,
        rise: height * 1.3,
        size: unit * (0.05 + (k % 3) * 0.012),
        color: CANDY[k % CANDY.length],
        at: 2.4 + k * 0.9,
        duration: 4.2,
        sway: unit * 0.03,
      });
    }
    collage = createShotCollage(pixi, { recipe: null, items }, collageCache, options.textures);
    view.addChildAt(collage.back, view.getChildIndex(sky) + 1);
    view.addChild(collage.front);
  }
  const update = (elapsed) => {
    const time = Math.max(0, elapsed);
    fireworks.update(time, bursts, launches);
    text == null ? void 0 : text.update(time);
    collage == null ? void 0 : collage.update(time < 8 ? time : 2.4 + ((time - 2.4) % 5.6));
    details.forEach(({ label, delay, y }) => {
      const k = smooth((time - delay) / 0.9);
      label.alpha = k * 0.92;
      label.position.y = y + (1 - k) * height * 0.02;
    });
  };
  update(0);
  return {
    view,
    update,
    destroy: () => {
      sky.filters = [];
      glow == null ? void 0 : glow.destroy();
      fireworks.destroy();
      text == null ? void 0 : text.destroy();
      collage == null ? void 0 : collage.destroy();
      view.destroy({ children: true });
      collageCache == null ? void 0 : collageCache.destroy();
    },
  };
};
export { createHanabiCredits, hasHanabiCredits, resolveHanabiCreditsFrame };
