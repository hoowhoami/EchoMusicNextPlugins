// EchoMusic folia-style 7506e1f3 · AGPL-3.0-only
import * as ColorMath from './color-math.mjs';
var DEFAULT_DARK_THEME = {
  name: '默认',
  backgroundColor: '#09090b', // zinc-950
  primaryColor: '#f4f4f5', // zinc-100
  accentColor: '#f4f4f5', // zinc-100
  secondaryColor: '#71717a', // zinc-500
  fontStyle: 'sans',
  animationIntensity: 'normal',
  wordColors: [],
  lyricsIcons: [],
};
var DEFAULT_LIGHT_THEME = {
  name: '默认 浅色',
  backgroundColor: '#fafafa', // zinc-50
  primaryColor: '#18181b', // zinc-900
  accentColor: '#18181b',
  secondaryColor: '#71717a',
  fontStyle: 'sans',
  animationIntensity: 'normal',
  wordColors: [],
  lyricsIcons: [],
};

var HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

var FALLBACK_LIGHT_THEME = {
  name: 'AI 浅色',
  backgroundColor: '#ffffff',
  primaryColor: '#111827',
  accentColor: '#2563eb',
  secondaryColor: '#475569',
  fontStyle: 'sans',
  animationIntensity: 'normal',
  wordColors: [],
  lyricsIcons: [],
  provider: 'AI',
};
var FALLBACK_DARK_THEME = {
  name: 'AI 深色',
  backgroundColor: '#0f172a',
  primaryColor: '#f8fafc',
  accentColor: '#7dd3fc',
  secondaryColor: '#cbd5e1',
  fontStyle: 'sans',
  animationIntensity: 'normal',
  wordColors: [],
  lyricsIcons: [],
  provider: 'AI',
};
var FALLBACK_AI_DUAL_THEME = { light: FALLBACK_LIGHT_THEME, dark: FALLBACK_DARK_THEME };

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeHexColorCandidate(value) {
  if (typeof value !== 'string') return null;
  var trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return null;
  var hex = trimmed.slice(1).toLowerCase();
  if (hex.length === 3) {
    return (
      '#' +
      hex
        .split('')
        .map(function (char) {
          return char + char;
        })
        .join('')
    );
  }
  return '#' + hex;
}

function normalizeThemeHexColor(value, fallback, hardFallback) {
  return (
    normalizeHexColorCandidate(value) ||
    normalizeHexColorCandidate(fallback) ||
    hardFallback ||
    '#ffffff'
  );
}

function normalizeFontStyle(value, fallback) {
  return value === 'serif' || value === 'mono' || value === 'sans' ? value : fallback;
}

function normalizeAnimationIntensity(value, fallback) {
  return value === 'calm' || value === 'chaotic' || value === 'normal' ? value : fallback;
}

function normalizeWordColors(value, fallbackColor) {
  if (!Array.isArray(value)) return [];
  var out = [];
  value.forEach(function (entry) {
    if (!isRecord(entry)) return;
    var word = typeof entry.word === 'string' ? entry.word.trim() : '';
    if (!word) return;
    out.push({ word: word, color: normalizeThemeHexColor(entry.color, fallbackColor) });
  });
  return out;
}

function normalizeLyricsIcons(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(function (icon) {
      return typeof icon === 'string';
    })
    .map(function (icon) {
      return icon.trim();
    })
    .filter(Boolean)
    .slice(0, 12);
}

function sanitizeTheme(value, fallbackTheme) {
  var source = isRecord(value) ? value : {};
  var accentColor = normalizeThemeHexColor(source.accentColor, fallbackTheme.accentColor);
  var out = {};
  Object.keys(fallbackTheme).forEach(function (key) {
    out[key] = fallbackTheme[key];
  });
  out.name =
    typeof source.name === 'string' && source.name.trim() ? source.name.trim() : fallbackTheme.name;
  out.description =
    typeof source.description === 'string' ? source.description.trim() : fallbackTheme.description;
  out.backgroundColor = normalizeThemeHexColor(
    source.backgroundColor,
    fallbackTheme.backgroundColor,
  );
  out.primaryColor = normalizeThemeHexColor(source.primaryColor, fallbackTheme.primaryColor);
  out.accentColor = accentColor;
  out.secondaryColor = normalizeThemeHexColor(source.secondaryColor, fallbackTheme.secondaryColor);
  out.fontStyle = normalizeFontStyle(source.fontStyle, fallbackTheme.fontStyle);
  out.animationIntensity = normalizeAnimationIntensity(
    source.animationIntensity,
    fallbackTheme.animationIntensity,
  );
  out.wordColors =
    source.wordColors === undefined
      ? fallbackTheme.wordColors || []
      : normalizeWordColors(source.wordColors, accentColor);
  out.lyricsIcons =
    source.lyricsIcons === undefined
      ? fallbackTheme.lyricsIcons || []
      : normalizeLyricsIcons(source.lyricsIcons);
  out.provider =
    typeof source.provider === 'string' && source.provider.trim()
      ? source.provider.trim()
      : fallbackTheme.provider;
  return out;
}

function sanitizeDualTheme(value, fallbackTheme) {
  var source = isRecord(value) ? value : {};
  var fallback = fallbackTheme || FALLBACK_AI_DUAL_THEME;
  return {
    light: sanitizeTheme(source.light, fallback.light),
    dark: sanitizeTheme(source.dark, fallback.dark),
  };
}

var MIN_SUPPORT_SATURATION = 0.15;
var MIN_SUPPORT_HUE_DISTANCE = 25;
var MAX_SUPPORT_HUE_DISTANCE = 160;
var MONOCHROME_SATURATION_CEILING = 0.18;

/** 偏饱和、中等亮度的颜色最能代表封面。 */
function coverColorScore(hsl) {
  return hsl.s * Math.max(0, 1 - Math.abs(hsl.l - 0.5) * 1.2);
}

function pickWeighted(random, entries) {
  var total = 0;
  entries.forEach(function (entry) {
    total += entry.weight;
  });
  var cursor = random() * total;
  for (var i = 0; i < entries.length; i += 1) {
    cursor -= entries[i].weight;
    if (cursor <= 0) return entries[i].value;
  }
  return entries[entries.length - 1].value;
}

function pickBaseColor(parsedColors, random) {
  if (parsedColors.length === 0) {
    // 没有封面可读：直接挑一个色相，无封面歌每次生成也会变化。
    return { h: random() * 360, s: 0.35 + random() * 0.3, l: 0.5 };
  }
  var best = parsedColors[0];
  parsedColors.forEach(function (candidate) {
    if (coverColorScore(candidate) > coverColorScore(best)) best = candidate;
  });
  return coverColorScore(best) > 0.02 ? best : parsedColors[0];
}

function pickSupportHue(parsedColors, base) {
  for (var i = 0; i < parsedColors.length; i += 1) {
    var candidate = parsedColors[i];
    if (candidate.s < MIN_SUPPORT_SATURATION) continue;
    var distance = ColorMath.getHueDistance(candidate.h, base.h);
    if (distance >= MIN_SUPPORT_HUE_DISTANCE && distance <= MAX_SUPPORT_HUE_DISTANCE)
      return candidate.h;
  }
  return null;
}

function pickScheme(baseSaturation, supportHue, random) {
  // 封面上真实的第二个色相是最"来自这幅画"的强调色。
  if (supportHue !== null && random() < 0.65) return 'duotone';
  return pickWeighted(random, [
    { value: 'analogous', weight: 3 },
    { value: 'complementary', weight: 2 },
    { value: 'split', weight: 2 },
    { value: 'triadic', weight: 1.5 },
    { value: 'monochrome', weight: baseSaturation < MONOCHROME_SATURATION_CEILING ? 2.5 : 0 },
  ]);
}

function resolveAccentHue(scheme, baseHue, supportHue, random) {
  var sign = random() < 0.5 ? -1 : 1;
  switch (scheme) {
    case 'duotone':
      return supportHue !== null ? supportHue : baseHue;
    case 'analogous':
      return baseHue + sign * (20 + random() * 15);
    case 'complementary':
      return baseHue + 150 + random() * 30;
    case 'split':
      return baseHue + (sign < 0 ? 150 : 210);
    case 'triadic':
      return baseHue + sign * 120;
    default:
      return baseHue;
  }
}

function analyzeCoverPalette(coverColors, random) {
  var parsedColors = coverColors
    .map(function (color) {
      return ColorMath.hexToHsl(color);
    })
    .filter(function (color) {
      return color !== null;
    });
  var base = pickBaseColor(parsedColors, random);
  var supportHue = pickSupportHue(parsedColors, base);
  var scheme = pickScheme(base.s, supportHue, random);
  var accentJitter = scheme === 'monochrome' ? 0 : (random() - 0.5) * 16;
  return {
    baseHue: ColorMath.normalizeHue(base.h),
    baseSaturation: base.s,
    baseLightness: base.l,
    accentHue: ColorMath.normalizeHue(
      resolveAccentHue(scheme, base.h, supportHue, random) + accentJitter,
    ),
    scheme: scheme,
    tone: pickWeighted(random, [
      { value: 'ink', weight: 3 },
      { value: 'tinted', weight: 4 },
      { value: 'rich', weight: 2.5 },
    ]),
  };
}

// ===== 内置主题生成（generateBuiltinDualTheme.ts 直移植） =====
var PRIMARY_MIN_CONTRAST = 9;
var ACCENT_MIN_CONTRAST = 3.2;
var SECONDARY_MIN_CONTRAST = 4.5;
var MIN_BACKGROUND_SATURATION = 0.04;

var BACKGROUND_TONES = {
  ink: {
    darkLightness: [0.055, 0.085],
    darkSaturation: [0.1, 0.22],
    lightLightness: [0.94, 0.965],
    lightSaturation: [0.05, 0.12],
  },
  tinted: {
    darkLightness: [0.075, 0.11],
    darkSaturation: [0.2, 0.36],
    lightLightness: [0.92, 0.95],
    lightSaturation: [0.1, 0.2],
  },
  rich: {
    darkLightness: [0.095, 0.14],
    darkSaturation: [0.32, 0.5],
    lightLightness: [0.9, 0.935],
    lightSaturation: [0.18, 0.3],
  },
};
var PRIMARY_RANGES = {
  light: { saturation: [0.15, 0.4], lightness: [0.1, 0.2] },
  dark: { saturation: [0.1, 0.3], lightness: [0.9, 0.96] },
};
var ACCENT_RANGES = {
  light: { saturation: [0.55, 0.88], lightness: [0.38, 0.55] },
  dark: { saturation: [0.55, 0.92], lightness: [0.55, 0.72] },
};
var SECONDARY_RANGES = {
  light: { saturation: [0.15, 0.45], lightness: [0.32, 0.46] },
  dark: { saturation: [0.15, 0.45], lightness: [0.62, 0.76] },
};

function between(random, range) {
  return range[0] + random() * (range[1] - range[0]);
}

/** 沿短弧插值，base/accent 色相对永不穿过对侧。 */
function lerpHue(from, to, amount) {
  var delta = ((to - from + 540) % 360) - 180;
  return ColorMath.normalizeHue(from + delta * amount);
}

function buildBackgroundColor(mode, palette, random) {
  var tone = BACKGROUND_TONES[palette.tone];
  var lightnessRange = mode === 'dark' ? tone.darkLightness : tone.lightLightness;
  var saturationRange = mode === 'dark' ? tone.darkSaturation : tone.lightSaturation;
  // 褪色的封面不该把底也带褪色，但读起来仍应更平静。
  var coverWeight = 0.55 + 0.45 * ColorMath.clamp01(palette.baseSaturation / 0.7);
  return ColorMath.hslToHex({
    h: palette.baseHue,
    s: Math.max(MIN_BACKGROUND_SATURATION, between(random, saturationRange) * coverWeight),
    l: between(random, lightnessRange),
  });
}

function buildAccentColor(mode, palette, backgroundColor, primaryColor, random) {
  var ranges = ACCENT_RANGES[mode];
  var saturation = between(random, ranges.saturation);
  var lightness = between(random, ranges.lightness);
  var accent = ColorMath.adjustLightnessForContrast(
    ColorMath.hslToHex({ h: palette.accentHue, s: saturation, l: lightness }),
    backgroundColor,
    ACCENT_MIN_CONTRAST,
  );
  // 单色 / 邻近的强调色可能撞上主文本色：转开 40°。
  var collidesWithPrimary =
    ColorMath.getHueDistance(palette.accentHue, palette.baseHue) < 15 &&
    ColorMath.getContrastRatio(accent, primaryColor) < 1.3;
  if (!collidesWithPrimary) return accent;
  return ColorMath.adjustLightnessForContrast(
    ColorMath.hslToHex({
      h: ColorMath.normalizeHue(palette.accentHue + 40),
      s: saturation,
      l: lightness,
    }),
    backgroundColor,
    ACCENT_MIN_CONTRAST,
  );
}

function buildModeTheme(mode, palette, random, name, description) {
  var backgroundColor = buildBackgroundColor(mode, palette, random);
  var primaryRanges = PRIMARY_RANGES[mode];
  var primaryColor = ColorMath.adjustLightnessForContrast(
    ColorMath.hslToHex({
      h: palette.baseHue,
      s: between(random, primaryRanges.saturation),
      l: between(random, primaryRanges.lightness),
    }),
    backgroundColor,
    PRIMARY_MIN_CONTRAST,
  );
  var accentColor = buildAccentColor(mode, palette, backgroundColor, primaryColor, random);
  var secondaryRanges = SECONDARY_RANGES[mode];
  var secondaryColor = ColorMath.adjustLightnessForContrast(
    ColorMath.hslToHex({
      h: lerpHue(palette.baseHue, palette.accentHue, 0.2 + random() * 0.4),
      s: between(random, secondaryRanges.saturation),
      l: between(random, secondaryRanges.lightness),
    }),
    backgroundColor,
    SECONDARY_MIN_CONTRAST,
  );
  return {
    name: name,
    description: description,
    backgroundColor: backgroundColor,
    primaryColor: primaryColor,
    accentColor: accentColor,
    secondaryColor: secondaryColor,
    fontStyle: 'sans',
    animationIntensity: 'normal',
    wordColors: [],
    lyricsIcons: [],
    provider: 'Built-in',
  };
}

// ===== 内置主题命名 / 描述表 =====
var BUILTIN_NAME_SUFFIX = ' Built-in';
var NEUTRAL_SATURATION_CEILING = 0.12;
var NEUTRAL_PREFIXES = ['月白', '银灰', '素墨', '雾白', '灰烬'];
var HUE_PREFIX_BUCKETS = [
  { maxHue: 20, prefixes: ['绯色', '朱砂', '珊瑚', '赤霞', '石榴'] },
  { maxHue: 45, prefixes: ['琥珀', '暮光', '橘光', '麦浪', '落日'] },
  { maxHue: 70, prefixes: ['鎏金', '稻香', '芒草', '秋黄', '沙丘'] },
  { maxHue: 105, prefixes: ['新柳', '青苔', '竹露', '草木', '春芜'] },
  { maxHue: 165, prefixes: ['苔痕', '松风', '薄荷', '翡翠', '深林'] },
  { maxHue: 205, prefixes: ['潮汐', '雾蓝', '海雾', '天青', '汀洲'] },
  { maxHue: 255, prefixes: ['深蓝', '靛青', '群青', '远洋', '蓝调'] },
  { maxHue: 300, prefixes: ['紫烟', '丁香', '暮霭', '紫棠', '薰衣'] },
  { maxHue: 360, prefixes: ['玫影', '桃夭', '藕荷', '蔷薇', '胭脂'] },
];
var LIGHT_SUFFIXES = ['破晓', '晨光', '微光', '初雪', '白昼', '浮云', '日砂'];
var DARK_SUFFIXES = ['子夜', '夜色', '深潭', '暗涌', '沉夜', '夜航', '星屑'];

function pickFrom(items, random) {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function resolveHuePrefixes(hue) {
  for (var i = 0; i < HUE_PREFIX_BUCKETS.length; i += 1) {
    if (hue < HUE_PREFIX_BUCKETS[i].maxHue) return HUE_PREFIX_BUCKETS[i].prefixes;
  }
  return HUE_PREFIX_BUCKETS[HUE_PREFIX_BUCKETS.length - 1].prefixes;
}

function pickBuiltinThemeNames(palette, random) {
  var prefixes =
    palette.baseSaturation < NEUTRAL_SATURATION_CEILING
      ? NEUTRAL_PREFIXES
      : resolveHuePrefixes(palette.baseHue);
  var prefix = pickFrom(prefixes, random);
  return {
    light: prefix + pickFrom(LIGHT_SUFFIXES, random) + BUILTIN_NAME_SUFFIX,
    dark: prefix + pickFrom(DARK_SUFFIXES, random) + BUILTIN_NAME_SUFFIX,
  };
}

// ===== 描述表 =====
var LIGHT_DESCRIPTIONS = {
  warm: [
    '阳光落在窗台上，我忽然想起了那年的夏天。',
    '橘子汽水的味道，一整个下午都没有散去。',
    '我把心事晒在阳台，风一吹就全都跑掉了。',
    '热气腾腾的黄昏里，我们谁也没有先开口。',
    '像是握着一颗刚出炉的糖，烫手却舍不得放。',
  ],
  gold: [
    '麦田的风从耳边掠过，我又想起那条回家的路。',
    '午后的光把一切都镀成蜜色，时间慢得像糖。',
    '我把耳机塞进耳朵，整个世界忽然温柔起来。',
    '阳光穿过树叶的缝隙，落成一地细碎的金子。',
    '骑车经过那条巷子时，风里全是稻草的味道。',
  ],
  green: [
    '雨后的青草味钻进鼻腔，我忽然想去很远的地方。',
    '推开窗，整个春天都涌了进来，我却说不出话。',
    '阳光落在叶脉上，我数着它们发呆了一下午。',
    '山间的风很轻，把我心里的褶皱也抚平了。',
    '我躺在草地上，听见这个世界安静地生长。',
  ],
  blue: [
    '海风吹过晾晒的白衬衫，那年夏天还没有结束。',
    '推开窗是一整片蓝，我忽然不想去任何地方了。',
    '天空蓝得不像话，我把心事都寄给了云。',
    '清晨的水汽还没散，整座城市都是浅蓝色的。',
    '我沿着河堤走了很久，风一直安静地陪着我。',
  ],
  purple: [
    '薰衣草的味道很淡，像一段快要忘掉的心事。',
    '黄昏把云染成淡紫，我站在原地看了很久。',
    '梦醒之后天光微紫，我还留在昨夜的情节里。',
    '紫丁香开了满树，我却只想起一个人的名字。',
    '我把那封信折成四折，藏进了春天的口袋里。',
  ],
  neutral: [
    '灰白的天空下，我把耳机音量调到了最大。',
    '雾还没散，整座城市都像一张过曝的旧照片。',
    '我在空荡的房间里坐着，阳光淡得几乎没有。',
    '所有颜色都退去了，只剩下我和这段旋律。',
    '冬天的早晨很安静，我听见自己呼吸的声音。',
  ],
};
var DARK_DESCRIPTIONS = {
  warm: [
    '余温还留在指尖，夜色已经漫过了整条街。',
    '炉火熄了，我仍坐在原地想那句没说完的话。',
    '深夜的红灯一闪一闪，像谁没能说出口的爱。',
    '我在暗处点了一支烟，把心事烧成了灰烬。',
    '热烈过后的沉默里，我听见自己的心跳。',
  ],
  gold: [
    '路灯把影子拉得很长，我一个人慢慢走回去。',
    '夜里的灯火像散落的碎金，我数着它们入睡。',
    '我在黑暗里回忆那个金色的下午，久久不愿醒。',
    '秋夜的风有点凉，可我还是不想早点回家。',
    '屋里只剩一盏暖灯，照着我还没写完的信。',
  ],
  green: [
    '深林的夜没有星星，只有风穿过树梢的声音。',
    '我在暗绿色的夜里走着，像走进了一场旧梦。',
    '夜露沾湿了裤脚，我还舍不得离开这片安静。',
    '整座山都睡着了，只有我的心事还醒着。',
    '苔藓在黑暗里悄悄蔓延，像我没说出口的思念。',
  ],
  blue: [
    '深夜的海把所有声音都吞掉了，只剩下呼吸。',
    '我在蓝色的黑暗里漂着，谁也找不到我。',
    '窗外下着雨，我把整个夜晚都听成了潮声。',
    '星星沉在海底，我在岸上等一句晚安。',
    '午夜的车窗外一片深蓝，我不想到站。',
  ],
  purple: [
    '暮色一寸寸沉下去，我的心事也跟着沉了。',
    '紫色的夜里我做了一个梦，梦里全是旧时光。',
    '霓虹把夜色染成暧昧的紫，我不敢多看一眼。',
    '我在深夜反复播放这首歌，像反复回到了过去。',
    '月光穿过窗帘的缝，把我的孤独照得很轻。',
  ],
  neutral: [
    '黑白的夜里，我把所有心事都调成了静音。',
    '墨色漫过窗台，我在这片安静里慢慢沉下去。',
    '我关掉了所有的灯，只留这首歌陪着我。',
    '深夜的房间没有颜色，只有旋律在轻轻发亮。',
    '世界安静得像一场默片，而我是唯一的观众。',
  ],
};

function resolveDescriptionFamily(palette) {
  if (palette.baseSaturation < NEUTRAL_SATURATION_CEILING) return 'neutral';
  if (palette.baseHue < 45 || palette.baseHue >= 330) return 'warm';
  if (palette.baseHue < 105) return 'gold';
  if (palette.baseHue < 165) return 'green';
  if (palette.baseHue < 255) return 'blue';
  return 'purple';
}

function pickBuiltinThemeDescriptions(palette, random) {
  var family = resolveDescriptionFamily(palette);
  return {
    light: pickFrom(LIGHT_DESCRIPTIONS[family], random),
    dark: pickFrom(DARK_DESCRIPTIONS[family], random),
  };
}

/** 封面色 → 明暗双主题（与上游"无 AI key 回退"同一算法）。 */
function generateBuiltinDualTheme(coverColors, random) {
  random = random || Math.random;
  coverColors = coverColors || [];
  var palette = analyzeCoverPalette(coverColors, random);
  var names = pickBuiltinThemeNames(palette, random);
  var descriptions = pickBuiltinThemeDescriptions(palette, random);
  return {
    light: buildModeTheme('light', palette, random, names.light, descriptions.light),
    dark: buildModeTheme('dark', palette, random, names.dark, descriptions.dark),
  };
}

function extractColorsFromPixels(pixels, count = 5) {
  if (!pixels) return [];
  var colors = [];
  // 采样步长 2：覆盖与性能折中。
  var step = 2;
  for (var i = 0; i < pixels.length; i += 4 * step) {
    var r = pixels[i];
    var g = pixels[i + 1];
    var b = pixels[i + 2];
    var a = pixels[i + 3];
    if (a < 128) continue;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    if (saturation > 0.2 && l > 30 && l < 220) colors.push({ r: r, g: g, b: b });
    else if (colors.length < 100) colors.push({ r: r, g: g, b: b });
  }
  colors.sort(function (a, b) {
    var satA = (Math.max(a.r, a.g, a.b) - Math.min(a.r, a.g, a.b)) / 255;
    var satB = (Math.max(b.r, b.g, b.b) - Math.min(b.r, b.g, b.b)) / 255;
    return satB - satA;
  });
  // 去重：色距阈值 20。
  var distinct = [];
  var minDistance = 20;
  colors.forEach(function (c) {
    if (distinct.length >= count) return;
    var isDistinct = distinct.every(function (dc) {
      return (
        Math.sqrt(Math.pow(c.r - dc.r, 2) + Math.pow(c.g - dc.g, 2) + Math.pow(c.b - dc.b, 2)) >
        minDistance
      );
    });
    if (isDistinct || distinct.length === 0) distinct.push(c);
  });
  return distinct.map(function (c) {
    return (
      '#' +
      [c.r, c.g, c.b]
        .map(function (v) {
          return ('0' + v.toString(16)).slice(-2);
        })
        .join('')
    );
  });
}

export {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  FALLBACK_AI_DUAL_THEME,
  sanitizeTheme,
  sanitizeDualTheme,
  generateBuiltinDualTheme,
  extractColorsFromPixels,
};
