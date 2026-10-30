// Folia a8da4437 utils/fontStacks.ts (AGPL-3.0-only), with an ordered native settings adapter.
export const BUILTIN_FONT_STACKS = {
  sans: [
    'Inter',
    'Noto Sans CJK SC',
    'Noto Sans JP',
    'Source Han Sans SC',
    'PingFang SC',
    'Hiragino Sans GB',
    'Microsoft YaHei',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  serif: [
    '獅尾四季春加糖SC',
    'Iowan Old Style',
    'Noto Serif CJK SC',
    'Noto Serif JP',
    'Source Han Serif SC',
    'Songti SC',
    'STSong',
    'Georgia',
    'serif',
  ],
  mono: [
    'IBM Plex Mono',
    'Sarasa Mono SC',
    'Noto Sans Mono CJK SC',
    'Noto Sans Mono',
    'SFMono-Regular',
    'Consolas',
    'monospace',
  ],
};
export const TRANSLATION_FONT_STACKS = {
  sans: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Inter',
    'Helvetica Neue',
    'Arial',
    'Noto Sans CJK SC',
    'Source Han Sans SC',
    'PingFang SC',
    'Hiragino Sans GB',
    'Microsoft YaHei',
    'Noto Sans JP',
    'Source Han Sans JP',
    'Hiragino Sans',
    'Yu Gothic',
    'Meiryo',
    'sans-serif',
  ],
  serif: [
    '獅尾四季春加糖SC',
    'Folia Noto Serif SC',
    'Iowan Old Style',
    'Georgia',
    'Times New Roman',
    'Noto Serif CJK SC',
    'Source Han Serif SC',
    'Songti SC',
    'STSong',
    'SimSun',
    'Noto Serif JP',
    'Source Han Serif JP',
    'Yu Mincho',
    'MS PMincho',
    'serif',
  ],
  mono: [
    'Consolas',
    'IBM Plex Mono',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Sarasa Mono SC',
    'Noto Sans Mono CJK SC',
    'SimHei',
    'DengXian',
    'Microsoft YaHei UI',
    'Microsoft YaHei',
    'Noto Sans Mono CJK JP',
    'MS Gothic',
    'monospace',
  ],
};
export function normalizeFontFamilyStack(families) {
  const seen = new Set();
  const stack = [];
  (families || []).forEach((value) => {
    const family = String(value || '')
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .trim();
    if (!family) return;
    const key = family.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    stack.push(family);
  });
  return stack;
}
export function parseFallbackDraft(draft) {
  return normalizeFontFamilyStack(String(draft || '').split(/[,\n]/));
}
export function primaryFamily(families) {
  return families && families.length && families[0] !== 'follow' ? String(families[0]) : '';
}
export function fallbackFamilies(families) {
  return normalizeFontFamilyStack(families && families.length ? Array.from(families).slice(1) : []);
}
export function withPrimary(families, primary) {
  return [primary || 'follow'].concat(fallbackFamilies(families));
}
export function withFallback(families, fallback) {
  return [primaryFamily(families) || 'follow'].concat(normalizeFontFamilyStack(fallback));
}
export function resolveFamilies(settings, translation) {
  const separateSubtitle = translation && settings.subtitleFontInheritsLyrics === false;
  const prefix = separateSubtitle ? 'subtitleFont' : 'font';
  const style = settings[prefix + 'Style'] || 'sans';
  const configured = settings[prefix + 'Families'] || ['follow'];
  const custom = Array.from(configured).filter(
    (family, index) => index !== 0 || family !== 'follow'
  );
  const builtin = translation ? TRANSLATION_FONT_STACKS : BUILTIN_FONT_STACKS;
  return normalizeFontFamilyStack(custom.concat(builtin[style] || builtin.sans));
}
export function availableFamilies(families, available) {
  const result = [];
  for (const family of normalizeFontFamilyStack(families)) {
    const key = family.toLocaleLowerCase();
    const actual = available.find((candidate) => candidate.toLocaleLowerCase() === key);
    if (actual && result.indexOf(actual) < 0) result.push(actual);
  }
  return result;
}
