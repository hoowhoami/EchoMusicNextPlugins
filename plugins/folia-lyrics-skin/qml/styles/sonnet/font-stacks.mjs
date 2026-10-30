// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const MIN_FONT_WEIGHT = 100,
  MAX_FONT_WEIGHT = 900,
  FONT_WEIGHT_STEP = 10,
  normalizeFontWeight = (fontWeight) => {
    if (typeof fontWeight != 'number' || !Number.isFinite(fontWeight)) return null;
    const clamped = Math.min(900, Math.max(100, fontWeight));
    return Math.round(clamped / 10) * 10;
  },
  resolveThemeFontWeight = (theme, fallback) => {
    var _a;
    return (_a = normalizeFontWeight(theme == null ? void 0 : theme.fontWeight)) != null
      ? _a
      : fallback;
  },
  SUGAR_SERIF_FAMILY = '"\u7345\u5C3E\u56DB\u5B63\u6625\u52A0\u7CD6SC"',
  BUILTIN_FONT_STACKS = {
    sans: '"Inter", "Noto Sans CJK SC", "Noto Sans JP", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
    serif: `${SUGAR_SERIF_FAMILY}, "Iowan Old Style", "Noto Serif CJK SC", "Noto Serif JP", "Source Han Serif SC", "Songti SC", "STSong", "Georgia", serif`,
    mono: '"IBM Plex Mono", "Sarasa Mono SC", "Noto Sans Mono CJK SC", "Noto Sans Mono", "SFMono-Regular", Consolas, monospace',
  },
  TRANSLATION_FONT_STACKS = {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans JP", "Source Han Sans JP", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif',
    serif: `${SUGAR_SERIF_FAMILY}, "Folia Noto Serif SC", "Iowan Old Style", Georgia, "Times New Roman", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", "Noto Serif JP", "Source Han Serif JP", "Yu Mincho", "MS PMincho", serif`,
    mono: 'Consolas, "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, "Sarasa Mono SC", "Noto Sans Mono CJK SC", "SimHei", "DengXian", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans Mono CJK JP", "MS Gothic", monospace',
  },
  CSS_GENERIC_FONT_FAMILIES = /* @__PURE__ */ new Set([
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
  ]),
  quoteFontFamily = (fontFamily) => `"${fontFamily.replace(/["\\]/g, '\\$&')}"`,
  normalizeFontFamilyName = (fontFamily) =>
    fontFamily
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .trim(),
  formatFontFamily = (fontFamily) => {
    const normalized = normalizeFontFamilyName(fontFamily);
    return normalized
      ? CSS_GENERIC_FONT_FAMILIES.has(normalized.toLowerCase())
        ? normalized
        : quoteFontFamily(normalized)
      : null;
  },
  normalizeFontFamilyStack = (fontFamilies) => {
    const seen = /* @__PURE__ */ new Set(),
      stack = [];
    return (
      fontFamilies == null ||
        fontFamilies.forEach((fontFamily) => {
          const normalized = normalizeFontFamilyName(fontFamily != null ? fontFamily : '');
          if (!normalized) return;
          const key = normalized.toLocaleLowerCase();
          seen.has(key) || (seen.add(key), stack.push(normalized));
        }),
      stack
    );
  },
  buildCustomFontFamilyStack = (theme) => {
    var _a;
    const familiesToNormalize = [
      ...(theme.fontFamily ? [theme.fontFamily] : []),
      ...((_a = theme.fontFamilyStack) != null ? _a : []),
    ];
    return familiesToNormalize.length === 0
      ? []
      : normalizeFontFamilyStack(familiesToNormalize)
          .map(formatFontFamily)
          .filter((fontFamily) => !!fontFamily);
  },
  getBuiltinThemeFontStack = (fontStyle) => {
    var _a;
    return (_a = BUILTIN_FONT_STACKS[fontStyle]) != null ? _a : BUILTIN_FONT_STACKS.sans;
  },
  resolveThemeFontStack = (theme) => {
    const fallbackStack = getBuiltinThemeFontStack(theme.fontStyle),
      customFontStack = buildCustomFontFamilyStack(theme);
    return customFontStack.length === 0
      ? fallbackStack
      : `${customFontStack.join(', ')}, ${fallbackStack}`;
  },
  resolveThemeTranslationFontStack = (theme) => {
    var _a;
    const fallbackStack =
        (_a = TRANSLATION_FONT_STACKS[theme.fontStyle]) != null ? _a : TRANSLATION_FONT_STACKS.sans,
      customFontStack = buildCustomFontFamilyStack(theme);
    return customFontStack.length === 0
      ? fallbackStack
      : `${customFontStack.join(', ')}, ${fallbackStack}`;
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
