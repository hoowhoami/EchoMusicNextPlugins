// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
const MIN_FONT_WEIGHT = 100;
const MAX_FONT_WEIGHT = 900;
const FONT_WEIGHT_STEP = 10;
const normalizeFontWeight = (fontWeight) => {
  if (typeof fontWeight !== 'number' || !Number.isFinite(fontWeight)) return null;
  const clamped = Math.min(MAX_FONT_WEIGHT, Math.max(MIN_FONT_WEIGHT, fontWeight));
  return Math.round(clamped / FONT_WEIGHT_STEP) * FONT_WEIGHT_STEP;
};
const resolveThemeFontWeight = (theme, fallback) => {
  var _a;
  return (_a = normalizeFontWeight(theme == null ? void 0 : theme.fontWeight)) != null
    ? _a
    : fallback;
};
const SUGAR_SERIF_FAMILY = '"\u7345\u5C3E\u56DB\u5B63\u6625\u52A0\u7CD6SC"';
const BUILTIN_FONT_STACKS = {
  sans: '"Inter", "Noto Sans CJK SC", "Noto Sans JP", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
  serif: `${SUGAR_SERIF_FAMILY}, "Iowan Old Style", "Noto Serif CJK SC", "Noto Serif JP", "Source Han Serif SC", "Songti SC", "STSong", "Georgia", serif`,
  mono: '"IBM Plex Mono", "Sarasa Mono SC", "Noto Sans Mono CJK SC", "Noto Sans Mono", "SFMono-Regular", Consolas, monospace',
};
const TRANSLATION_FONT_STACKS = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans JP", "Source Han Sans JP", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif',
  serif: `${SUGAR_SERIF_FAMILY}, "Folia Noto Serif SC", "Iowan Old Style", Georgia, "Times New Roman", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", "Noto Serif JP", "Source Han Serif JP", "Yu Mincho", "MS PMincho", serif`,
  mono: 'Consolas, "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, "Sarasa Mono SC", "Noto Sans Mono CJK SC", "SimHei", "DengXian", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans Mono CJK JP", "MS Gothic", monospace',
};
const CSS_GENERIC_FONT_FAMILIES = /* @__PURE__ */ new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
]);
const quoteFontFamily = (fontFamily) => `"${fontFamily.replace(/["\\]/g, '\\$&')}"`;
const normalizeFontFamilyName = (fontFamily) =>
  fontFamily
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
const formatFontFamily = (fontFamily) => {
  const normalized = normalizeFontFamilyName(fontFamily);
  if (!normalized) return null;
  return CSS_GENERIC_FONT_FAMILIES.has(normalized.toLowerCase())
    ? normalized
    : quoteFontFamily(normalized);
};
const normalizeFontFamilyStack = (fontFamilies) => {
  const seen = /* @__PURE__ */ new Set();
  const stack = [];
  fontFamilies == null
    ? void 0
    : fontFamilies.forEach((fontFamily) => {
        const normalized = normalizeFontFamilyName(fontFamily != null ? fontFamily : '');
        if (!normalized) return;
        const key = normalized.toLocaleLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        stack.push(normalized);
      });
  return stack;
};
const buildCustomFontFamilyStack = (theme) => {
  var _a;
  const familiesToNormalize = [
    ...(theme.fontFamily ? [theme.fontFamily] : []),
    ...((_a = theme.fontFamilyStack) != null ? _a : []),
  ];
  if (familiesToNormalize.length === 0) {
    return [];
  }
  return normalizeFontFamilyStack(familiesToNormalize)
    .map(formatFontFamily)
    .filter((fontFamily) => Boolean(fontFamily));
};
const getBuiltinThemeFontStack = (fontStyle) => {
  var _a;
  return (_a = BUILTIN_FONT_STACKS[fontStyle]) != null ? _a : BUILTIN_FONT_STACKS.sans;
};
const resolveThemeFontStack = (theme) => {
  const fallbackStack = getBuiltinThemeFontStack(theme.fontStyle);
  const customFontStack = buildCustomFontFamilyStack(theme);
  if (customFontStack.length === 0) {
    return fallbackStack;
  }
  return `${customFontStack.join(', ')}, ${fallbackStack}`;
};
const resolveThemeTranslationFontStack = (theme) => {
  var _a;
  const fallbackStack =
    (_a = TRANSLATION_FONT_STACKS[theme.fontStyle]) != null ? _a : TRANSLATION_FONT_STACKS.sans;
  const customFontStack = buildCustomFontFamilyStack(theme);
  if (customFontStack.length === 0) {
    return fallbackStack;
  }
  return `${customFontStack.join(', ')}, ${fallbackStack}`;
};
export {
  BUILTIN_FONT_STACKS,
  FONT_WEIGHT_STEP,
  MAX_FONT_WEIGHT,
  MIN_FONT_WEIGHT,
  getBuiltinThemeFontStack,
  normalizeFontFamilyStack,
  normalizeFontWeight,
  resolveThemeFontStack,
  resolveThemeFontWeight,
  resolveThemeTranslationFontStack,
};
