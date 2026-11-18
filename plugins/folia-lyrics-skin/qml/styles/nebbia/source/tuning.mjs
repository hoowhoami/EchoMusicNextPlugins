// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/tuning.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
import { arrayAt, arrayFlatMap, fromEntries } from '../compat.mjs';
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
import {
  LYRIC_RENDER_SCALES,
  normalizeLyricRenderOverride,
} from './_shared/utils/lyricRenderQuality.mjs';
import {
  defineVisualizerTuning,
  modNumber,
  MOD_SWITCH,
  modChoice,
  numberWithin,
} from './_shared/components/visualizer/tuningDefinition.mjs';
import {
  DEFAULT_NEBBIA_TUNING,
  NEBBIA_APPEAR_STYLES,
  NEBBIA_BEHIND,
  NEBBIA_FADE_STYLES,
  NEBBIA_LAYOUTS,
  NEBBIA_GLASS,
  NEBBIA_GLASS_FOR,
  NEBBIA_LIMITS,
  NEBBIA_RAIN,
  NEBBIA_SCENERY,
} from './types.mjs';
const subsetOf = (choices, value, fallback) => {
  const picked = Array.isArray(value) ? choices.filter((c) => value.includes(c)) : [];
  return picked.length ? picked : [...fallback];
};
const LEGACY_APPEAR = { auto: ['write', 'fade'], write: ['write'], fade: ['fade'] };
const LEGACY_FADE = { fog: ['fog'], fingers: ['fingers'], mix: ['fog', 'fingers'] };
const readRender = (render, legacyResolution) => {
  if (render !== void 0) return normalizeLyricRenderOverride(render);
  const override = normalizeLyricRenderOverride(null);
  if (legacyResolution === void 0) return override;
  const resolution = numberWithin(legacyResolution, 1, 0.5, 2);
  if (resolution === 1) return override;
  const scale = LYRIC_RENDER_SCALES.reduce(
    (best, next) => (Math.abs(next - resolution) <= Math.abs(best - resolution) ? next : best),
    LYRIC_RENDER_SCALES[0],
  );
  return __spreadProps(__spreadValues({}, override), { scale });
};
const normalizeNebbiaTuning = (stored) => {
  var _a, _b, _c, _d, _e, _f;
  const values = stored && typeof stored === 'object' ? stored : {};
  const base = DEFAULT_NEBBIA_TUNING;
  const numbers = fromEntries(
    Object.keys(NEBBIA_LIMITS).map((key) => [
      key,
      numberWithin(values[key], base[key], NEBBIA_LIMITS[key].min, NEBBIA_LIMITS[key].max),
    ]),
  );
  const appear = (_a = values.appear) != null ? _a : LEGACY_APPEAR[String(values.appearMode)];
  const fade = (_b = values.fade) != null ? _b : LEGACY_FADE[String(values.fadeMode)];
  const behind = (_c = NEBBIA_BEHIND.find((b) => b === values.behind)) != null ? _c : base.behind;
  return __spreadValues(
    {
      render: readRender(values.render, values.resolution),
      appear: subsetOf(NEBBIA_APPEAR_STYLES, appear, base.appear),
      fade: subsetOf(NEBBIA_FADE_STYLES, fade, base.fade),
      layouts: subsetOf(NEBBIA_LAYOUTS, values.layouts, base.layouts),
      behind,
      // 没存过玻璃（旧的 tuning）时按窗外的默认搭配
      glass:
        (_e =
          (_d = NEBBIA_GLASS.find((g) => g === values.glass)) != null
            ? _d
            : NEBBIA_GLASS_FOR[behind]) != null
          ? _e
          : base.glass,
      // 窗外可以全关：只有没存过（旧的 tuning）才用默认
      scenery: Array.isArray(values.scenery)
        ? NEBBIA_SCENERY.filter((c) => values.scenery.includes(c))
        : [...base.scenery],
      rain: (_f = NEBBIA_RAIN.find((r) => r === values.rain)) != null ? _f : base.rain,
      credits: typeof values.credits === 'boolean' ? values.credits : base.credits,
    },
    numbers,
  );
};
var stdin_default = defineVisualizerTuning({
  mode: 'nebbia',
  defaults: DEFAULT_NEBBIA_TUNING,
  // What mods may read and write (folium.visualizer.setTuning): the panel's own controls, without what the picture costs.
  modKeys: __spreadProps(
    __spreadValues(
      {
        behind: modChoice(NEBBIA_BEHIND),
        glass: modChoice(NEBBIA_GLASS),
        rain: modChoice(NEBBIA_RAIN),
        credits: MOD_SWITCH,
      },
      fromEntries(
        Object.entries(NEBBIA_LIMITS).map(([key, { min, max }]) => [key, modNumber(min, max)]),
      ),
    ),
    {
      // A count of jellyfish: whole ones, as the panel's slider steps.
      jellies: modNumber(NEBBIA_LIMITS.jellies.min, NEBBIA_LIMITS.jellies.max, 1),
    },
  ),
  settingsKey: 'nebbiaTuning',
  settingsSetterKey: 'handleSetNebbiaTuning',
  settingsResetterKey: 'handleResetNebbiaTuning',
  storage: {
    key: 'nebbia_tuning',
    read: normalizeNebbiaTuning,
    // 先合并再归一化：设置面板、导入、同步走同一套校验。
    // 导入或同步来的旧配置只有 resolution、没有 render：先迁成 render，不然 held 里已有的 render 会把它盖掉。
    merge: (held, patch) => {
      const legacyResolution = patch.resolution;
      const migrated =
        patch.render === void 0 && legacyResolution !== void 0
          ? __spreadProps(__spreadValues({}, patch), {
              render: readRender(void 0, legacyResolution),
            })
          : patch;
      return normalizeNebbiaTuning(__spreadValues(__spreadValues({}, held), migrated));
    },
    resetNotice: 'notifications.nebbiaReset',
  },
});
export { stdin_default as default, normalizeNebbiaTuning };
