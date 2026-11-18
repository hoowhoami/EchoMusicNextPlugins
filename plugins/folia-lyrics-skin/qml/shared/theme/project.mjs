import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from './kernel.mjs';
export function dual(settings) {
  const selected =
    settings.themeMode === 'ai'
      ? settings.themeAi
      : settings.themeMode === 'custom'
        ? settings.themeCustom
        : null;
  return selected || { light: DEFAULT_LIGHT_THEME, dark: DEFAULT_DARK_THEME };
}
export function theme(settings) {
  return dual(settings)[settings.themeDaylight ? 'light' : 'dark'];
}
export function appearance(host, settings) {
  const value = theme(settings);
  return Object.assign({}, host, {
    main: value.backgroundColor,
    text: value.primaryColor,
    accent: value.accentColor,
    secondaryText: value.secondaryColor,
    dark: !settings.themeDaylight,
    themeMetadata: Object.assign({}, value, {
      title: value.name || '',
      description: value.description || '',
      lyricsIcons: value.lyricsIcons || [],
    }),
  });
}
export function renderSettings(settings) {
  const value = theme(settings);
  return Object.assign({}, settings, {
    wordColors:
      settings.wordColors && settings.wordColors.length
        ? settings.wordColors
        : value.wordColors || [],
  });
}
