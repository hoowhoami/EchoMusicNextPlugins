import type { JsonValue } from 'echo:plugin-sdk';
import { styles } from './styles';

// Flat keys let the host merge independent patches against its accepted-write queue.
// Per-mode fields use a mode prefix, so changing one mode never replaces another's parameters.
export const defaults: Readonly<Record<string, JsonValue>> = Object.freeze({
  mode: 'still',
  showText: true,
  hideTranslationSubtitle: false,
  lyricsFontScale: 1,
  subtitleFontScale: 1,
  fontFamilies: ['follow'],
  playerChromeVisibilityMode: 'always-visible',
});

export function validate(values: Record<string, JsonValue>): true | { errors: string[] } {
  const errors: string[] = [];
  if (!values || typeof values !== 'object' || Array.isArray(values))
    return { errors: ['Folia 配置必须是 JSON 对象'] };
  // QVariantList arrives as a Qt sequence, not an ECMAScript Array. The host
  // accepts JSON only; normalize that boundary before checking nested lists.
  try {
    values = JSON.parse(JSON.stringify(values));
  } catch {
    return { errors: ['Folia 配置必须可转换为 JSON'] };
  }
  for (const key of Object.keys(values))
    if (!Object.prototype.hasOwnProperty.call(defaults, key)) errors.push(`未知设置：${key}`);
  if (!styles.some((style) => style.id === values.mode)) errors.push('无效的 Folia 样式');
  if (
    typeof values.playerChromeVisibilityMode !== 'string' ||
    !['always-hidden', 'always-visible', 'auto-hide'].includes(values.playerChromeVisibilityMode)
  )
    errors.push('无效的播放控件显示方式');
  for (const key of ['showText', 'hideTranslationSubtitle'])
    if (typeof values[key] !== 'boolean') errors.push(`${key} 必须是布尔值`);
  for (const key of ['lyricsFontScale', 'subtitleFontScale']) {
    const value = values[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.85 || value > 1.4)
      errors.push(`${key} 必须在 0.85–1.4 之间`);
  }
  const families = values.fontFamilies;
  if (
    !Array.isArray(families) ||
    families.length < 1 ||
    families.length > 16 ||
    families.some((family) => typeof family !== 'string' || !family.trim() || family.length > 256)
  )
    errors.push('字体链必须包含 1–16 个有效字体名称');
  return errors.length ? { errors } : true;
}
