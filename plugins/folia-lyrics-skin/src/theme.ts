import type { JsonValue } from 'echo:plugin-sdk';

// Validate the persisted boundary; imports are sanitized by the original theme kernel first.
export function validDualTheme(value: JsonValue): boolean {
  if (value === null) return true;
  if (typeof value !== 'object' || Array.isArray(value)) return false;
  for (const side of ['light', 'dark']) {
    const theme = value[side];
    if (!theme || typeof theme !== 'object' || Array.isArray(theme)) return false;
    for (const key of ['backgroundColor', 'primaryColor', 'accentColor', 'secondaryColor'])
      if (typeof theme[key] !== 'string' || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(theme[key]))
        return false;
    for (const [key, max] of [
      ['name', 128],
      ['description', 2048],
      ['provider', 128],
    ] as const)
      if (theme[key] !== undefined && (typeof theme[key] !== 'string' || theme[key].length > max))
        return false;
    if (
      !['sans', 'serif', 'mono'].includes(String(theme.fontStyle)) ||
      !['calm', 'normal', 'chaotic'].includes(String(theme.animationIntensity))
    )
      return false;
    if (
      !Array.isArray(theme.wordColors) ||
      theme.wordColors.length > 256 ||
      theme.wordColors.some(
        (entry) =>
          !entry ||
          typeof entry !== 'object' ||
          Array.isArray(entry) ||
          typeof entry.word !== 'string' ||
          entry.word.length > 256 ||
          typeof entry.color !== 'string' ||
          !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(entry.color),
      )
    )
      return false;
    if (
      !Array.isArray(theme.lyricsIcons) ||
      theme.lyricsIcons.length > 12 ||
      theme.lyricsIcons.some((name) => typeof name !== 'string' || name.length > 128)
    )
      return false;
  }
  return true;
}
