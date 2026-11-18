// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/color.ts
import { parseColorChannels } from './_shared/components/visualizer/colorMix.mjs';
const rgbOfHex = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
const hexOfRgb = (rgb) => {
  const c = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return (c(rgb[0]) << 16) | (c(rgb[1]) << 8) | c(rgb[2]);
};
const cssOfHex = (hex) => `#${hex.toString(16).padStart(6, '0')}`;
const rgbOfCss = (color) => {
  const channels = color ? parseColorChannels(color) : null;
  return channels ? [channels.r / 255, channels.g / 255, channels.b / 255] : null;
};
const hexOfCss = (color, fallback) => {
  const rgb = rgbOfCss(color);
  return rgb ? hexOfRgb(rgb) : fallback;
};
const toHsl = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};
const toRgb = ([h, s, l]) => {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
};
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mixHue = (from, to, amount) => {
  let delta = to - from;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return (from + delta * amount + 1) % 1;
};
const vivid = (hex, sat, minL, maxL) => {
  const [h, s, l] = toHsl(rgbOfHex(hex));
  const saturation = s < 0.05 ? s : Math.max(s, sat);
  return hexOfRgb(toRgb([h, saturation, Math.min(maxL, Math.max(minL, l))]));
};
const linear = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const relativeLuminance = (hex) => {
  const [r, g, b] = rgbOfHex(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};
const contrastRatio = (a, b) => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const DARK_INK = 2826045;
const LIGHT_INK = 16777215;
const MIN_BLOCK_CONTRAST = 3.2;
const separate = (block, ink) => {
  if (contrastRatio(block, ink) >= MIN_BLOCK_CONTRAST) return block;
  const [h, s, l] = toHsl(rgbOfHex(block));
  const darker = relativeLuminance(ink) > 0.5;
  for (let step = 1; step <= 20; step += 1) {
    const next = hexOfRgb(toRgb([h, s, clamp01(darker ? l - step * 0.04 : l + step * 0.04)]));
    if (contrastRatio(next, ink) >= MIN_BLOCK_CONTRAST) return next;
  }
  return darker ? 0 : 16777215;
};
const ensureContrast = (color, against, min) => {
  if (contrastRatio(color, against) >= min) return color;
  const [h, s, l] = toHsl(rgbOfHex(color));
  const directions = relativeLuminance(against) > 0.18 ? [-1, 1] : [1, -1];
  for (let step = 1; step <= 25; step += 1) {
    for (const direction of directions) {
      const next = hexOfRgb(toRgb([h, s, clamp01(l + direction * step * 0.04)]));
      if (contrastRatio(next, against) >= min) return next;
    }
  }
  return contrastRatio(0, against) >= contrastRatio(16777215, against) ? 0 : 16777215;
};
const MIN_SUNG_CONTRAST = 3;
const MIN_FLASH_CONTRAST = 2;
const hanabiBackdropOf = (palette) => (relativeLuminance(palette.paper) > 0.5 ? 724260 : 15986665);
const resolveHanabiGlyphColors = (palette, base, under) => {
  var _a, _b;
  const ink = ensureContrast(base, under, MIN_SUNG_CONTRAST);
  const candidates = [palette.accent, ...palette.sparks, palette.glow];
  const sung =
    (_a = candidates.find(
      (color) =>
        contrastRatio(color, under) >= MIN_SUNG_CONTRAST && contrastRatio(color, ink) >= 1.3,
    )) != null
      ? _a
      : ensureContrast(palette.accent, under, MIN_SUNG_CONTRAST);
  return {
    ink,
    sung,
    flash: ensureContrast(palette.glow, under, MIN_FLASH_CONTRAST),
    back: ensureContrast(
      (_b = palette.sparks[0]) != null ? _b : palette.accent,
      under,
      MIN_FLASH_CONTRAST,
    ),
  };
};
const ROLES = {
  // 夜空：藏青、桃红、堇的色块，金、粉、水色的烟花。
  night: {
    blocks: [1911674, 14036852, 5979332],
    sparks: [16765286, 16740261, 8118258, 16777215, 12033279],
    accent: 16765286,
    glow: 16769955,
  },
  // 祭：朱红、瑠璃、柿色。
  festival: {
    blocks: [15073331, 1986722, 14239759],
    sparks: [16763930, 16724821, 3983615, 7208858, 16777215],
    accent: 16761856,
    glow: 16753226,
  },
  // 粉彩：樱粉、天蓝、柠檬。
  pastel: {
    blocks: [16752320, 9427199, 16773258],
    sparks: [16762081, 11069695, 16774576, 13942783],
    accent: 16744370,
    glow: 16773366,
  },
  // 黑白：纸白与灰，墨字，火花偏暖白。
  mono: {
    blocks: [16052714, 13222835],
    sparks: [16777215, 15262416, 16774102],
    accent: 16777215,
    glow: 16775142,
  },
  // 金：山吹金与淡金，金色的冠。
  gold: {
    blocks: [15904798, 16767344, 16773577],
    sparks: [16765806, 16756283, 16773569, 16747069],
    accent: 16763210,
    glow: 16764784,
  },
  // 霓虹：品红、青、紫。
  neon: {
    blocks: [16722902, 58879, 8006911],
    sparks: [16722902, 61695, 12123935, 16777215, 9399295],
    accent: 61695,
    glow: 16739312,
  },
  // 樱：桃红与白。
  sakura: {
    blocks: [16736158, 16774392, 16758994],
    sparks: [16758741, 16777215, 16740270, 16769260],
    accent: 16732051,
    glow: 16766696,
  },
  // 可爱：泡泡糖粉、天蓝、柠檬黄的色块，粉彩烟花（folia 为日系可爱 PV 加的角色）。
  kawaii: {
    blocks: [16744118, 8378623, 16769126],
    sparks: [16757721, 10547455, 16774048, 14268671, 16777215],
    accent: 16736162,
    glow: 16765416,
  },
  // 海：群青、碧、白。
  ocean: {
    blocks: [679167, 49848, 15398655],
    sparks: [6087167, 2883541, 16777215, 5080831],
    accent: 6087167,
    glow: 11071743,
  },
};
const PALETTE_ROLES = Object.keys(ROLES);
const themeColors = (theme) => {
  const primary = hexOfCss(theme.primaryColor, 16777215);
  const accent = hexOfCss(theme.accentColor, 16765286);
  const secondary = hexOfCss(theme.secondaryColor, accent);
  const spark = (hex) => vivid(hex, 0.6, 0.58, 0.8);
  return {
    blocks: [
      vivid(accent, 0.55, 0.3, 0.7),
      vivid(primary, 0.45, 0.25, 0.75),
      vivid(secondary, 0.5, 0.3, 0.7),
    ],
    sparks: [spark(accent), spark(primary), spark(secondary), 16777215],
    accent: spark(accent),
    glow: vivid(accent, 0.5, 0.75, 0.88),
  };
};
const MIX_MIN_SATURATION = 0.2;
const mixColors = (role, theme) => {
  const target = toHsl(rgbOfHex(hexOfCss(theme.accentColor, role.accent)));
  if (target[1] < MIX_MIN_SATURATION) return role;
  const themed = themeColors(theme);
  const lean = (hex) => {
    const [h, s, l] = toHsl(rgbOfHex(hex));
    if (s < 0.05) return hex;
    return hexOfRgb(toRgb([mixHue(h, target[0], 0.4), s, l]));
  };
  return {
    blocks: [themed.blocks[0], ...role.blocks.slice(1).map(lean)],
    sparks: [themed.sparks[0], ...role.sparks.slice(1).map(lean)],
    accent: themed.accent,
    glow: lean(role.glow),
  };
};
const keywordColorOf = (theme) => {
  var _a;
  const entries = ((_a = theme.wordColors) != null ? _a : [])
    .map((entry) => ({ word: entry.word.trim().toLowerCase(), color: rgbOfCss(entry.color) }))
    .filter((entry) => entry.word.length > 0 && entry.color !== null);
  if (entries.length === 0) return void 0;
  return (text) => {
    const key = text.trim().toLowerCase();
    if (!key) return null;
    const hit = entries.find((entry) => key === entry.word || key.includes(entry.word));
    return hit ? hexOfRgb(hit.color) : null;
  };
};
const resolveHanabiPalette = (role, theme, colorMode) => {
  var _a;
  const base = (_a = ROLES[role]) != null ? _a : ROLES.night;
  const colors =
    colorMode === 'theme'
      ? themeColors(theme)
      : colorMode === 'mixed'
        ? mixColors(base, theme)
        : base;
  const background = hexOfCss(theme.backgroundColor, 0);
  const paper = relativeLuminance(background) > 0.4 ? DARK_INK : LIGHT_INK;
  const worst = (ink2) => Math.min(...colors.blocks.map((block) => contrastRatio(block, ink2)));
  const ink = worst(DARK_INK) >= worst(LIGHT_INK) ? DARK_INK : LIGHT_INK;
  return {
    ink,
    paper,
    blocks: colors.blocks.map((block) => separate(block, ink)),
    sparks: colors.sparks,
    accent: colors.accent,
    glow: colors.glow,
  };
};
export {
  MIN_BLOCK_CONTRAST,
  MIN_FLASH_CONTRAST,
  MIN_SUNG_CONTRAST,
  PALETTE_ROLES,
  contrastRatio,
  cssOfHex,
  ensureContrast,
  hanabiBackdropOf,
  hexOfCss,
  hexOfRgb,
  keywordColorOf,
  relativeLuminance,
  resolveHanabiGlyphColors,
  resolveHanabiPalette,
};
