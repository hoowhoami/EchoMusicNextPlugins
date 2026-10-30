import type { JsonValue } from 'echo:plugin-sdk';
import { styles } from './styles';
import { modeDefaults, validateModeTuning } from './modeTuning';
import { builtinModes } from './random';

// Flat keys let the host merge independent patches against its accepted-write queue.
// Per-mode fields use a mode prefix, so changing one mode never replaces another's parameters.
export const defaults: Readonly<Record<string, JsonValue>> = Object.freeze({
  ...modeDefaults,
  temperaLayerImages: [],
  mode: 'classic',
  randomVisualizerModePerSong: false,
  randomVisualizerModes: Array.from(builtinModes),
  showText: true,
  visualizerOpacity: 1,
  hideTranslationSubtitle: false,
  lyricsFontScale: 1,
  subtitleFontScale: 1,
  fontFamilies: ['follow'],
  fontStyle: 'sans',
  fontWeight: null,
  subtitleFontInheritsLyrics: true,
  subtitleFontFamilies: ['follow'],
  subtitleFontStyle: 'sans',
  subtitleFontWeight: null,
  subtitleContentMode: 'translation',
  subtitleOverlayOpacity: 0.6,
  subtitleOverlayBackground: true,
  subtitleUpcomingLyricsBlur: true,
  showHarmonySubtitle: true,
  harmonySubtitleBackground: true,
  animationIntensity: 'normal',
  wordColors: [],
  classicEnableWordRotation: true,
  classicBreathingFloatMultiplier: 1,
  classicUseLegacyLayout: false,
  classicWordSpacing: 0.7,
  cadenzaFontScale: 1.12,
  cadenzaWidthRatio: 0.72,
  cadenzaMotionAmount: 1,
  cadenzaGlowIntensity: 1,
  cappellaShowEmoMessages: true,
  cappellaAvatarSource: 'cover',
  cappellaEmojiPackSource: 'builtin',
  backgroundMode: 'latent',
  soraBlank: false,
  latentDisplayMode: 'both',
  latentColorSource: 'cover-theme',
  latentDynamicOnlyInPlayer: true,
  latentEnhancedBeatResponse: true,
  latentDitheringSpeed: 0.1,
  latentDitheringAudioSpeed: 1.2,
  latentDitheringSize: 2.5,
  latentDitheringOpacity: 0.55,
  latentMeshSpeed: 0.3,
  latentMeshAudioSpeed: 2,
  latentMeshDistortion: 0.8,
  latentMeshSwirl: 0.1,
  latentOverlayEnabled: true,
  latentOverlayOpacity: 0.35,
  partitaShowGuideLines: true,
  partitaUseSemanticLayout: true,
  partitaStaggerMin: 20,
  partitaStaggerMax: 100,
  tiltSplitProbability: 0.75,
  tiltStyleProbability: 0.35,
  tiltColorScheme: 'default',
  claddaghFocusScaleRatio: 0.65,
  claddaghRadiusScale: 1,
  claddaghEllipseTiltDeg: 45,
  claddaghShowAxisLine: true,
  claddaghLetterSpacingOffset: 0,
  pendoloArcRadius: 0.42,
  pendoloArcAngleDeg: 100,
  pendoloWheelCenterX: 0,
  pendoloWheelCenterY: 0.5,
  pendoloTickSnappiness: 2,
  pendoloActiveScale: 1.25,
  pendoloShowGearDecor: 'subtle',
  pendoloShowCenterGradient: true,
  pendoloShowCoverOnWatchFace: false,
  pendoloEnableLineGlow: false,
  monetKeywordColoringEnabled: true,
  monetShowDescription: true,
  monetShowAudioVisualization: true,
  monetAudioStyle: 'bar',
  monetFontScale: 1.2,
  monetPortraitSource: 'cover',
  monetPortraitAsset: '',
  monetPortraitOffsetX: 0,
  monetPortraitStyle: 'square',
  monetShowPortraitDragHanger: true,
  fumeHidePrintSymbols: false,
  fumeDisableGeometricBackground: true,
  fumeBackgroundObjectOpacity: 0.5,
  fumeTextHoldRatio: 1,
  fumeCameraTrackingMode: 'smooth',
  fumeCameraSpeed: 1,
  fumeGlowIntensity: 1,
  fumeHeroScale: 1,
  playerChromeVisibilityMode: 'always-visible',
  playerBottomBarOffset: 32,
  playerControlSlotPrimary: 'loop',
  playerControlSlotSecondary: 'lyrics-timeline',
  alwaysShowTrackSwitchButtons: false,
});

const capsuleActions = new Set([
  'loop',
  'prev',
  'next',
  'like',
  'lyrics-timeline',
  'volume',
  'queue',
]);

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
  const pool = values.randomVisualizerModes;
  if (
    !Array.isArray(pool) ||
    !pool.length ||
    pool.length > builtinModes.length ||
    pool.some((mode) => typeof mode !== 'string' || !builtinModes.includes(mode)) ||
    new Set(pool).size !== pool.length
  )
    errors.push('随机样式池必须包含至少一种不同的 Folia 样式');
  if (
    typeof values.playerChromeVisibilityMode !== 'string' ||
    !['always-hidden', 'always-visible', 'auto-hide'].includes(values.playerChromeVisibilityMode)
  )
    errors.push('无效的播放控件显示方式');
  for (const key of [
    'showText',
    'randomVisualizerModePerSong',
    'hideTranslationSubtitle',
    'alwaysShowTrackSwitchButtons',
    'subtitleFontInheritsLyrics',
    'subtitleOverlayBackground',
    'subtitleUpcomingLyricsBlur',
    'showHarmonySubtitle',
    'harmonySubtitleBackground',
    'classicEnableWordRotation',
    'classicUseLegacyLayout',
    'claddaghShowAxisLine',
    'partitaShowGuideLines',
    'partitaUseSemanticLayout',
    'cappellaShowEmoMessages',
    'latentDynamicOnlyInPlayer',
    'latentEnhancedBeatResponse',
    'latentOverlayEnabled',
    'soraBlank',
    'pendoloShowCenterGradient',
    'pendoloShowCoverOnWatchFace',
    'pendoloEnableLineGlow',
    'monetKeywordColoringEnabled',
    'monetShowDescription',
    'monetShowAudioVisualization',
    'monetShowPortraitDragHanger',
    'fumeHidePrintSymbols',
    'fumeDisableGeometricBackground',
  ])
    if (typeof values[key] !== 'boolean') errors.push(`${key} 必须是布尔值`);
  for (const key of ['lyricsFontScale', 'subtitleFontScale']) {
    const value = values[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.85 || value > 1.4)
      errors.push(`${key} 必须在 0.85–1.4 之间`);
  }
  for (const [key, low, high] of [
    ['visualizerOpacity', 0.2, 1],
    ['subtitleOverlayOpacity', 0.2, 1],
    ['classicBreathingFloatMultiplier', 0, 2],
    ['classicWordSpacing', 0, 2],
    ['cadenzaFontScale', 0.5, 2],
    ['cadenzaWidthRatio', 0.3, 1],
    ['cadenzaMotionAmount', 0, 2],
    ['cadenzaGlowIntensity', 0, 2],
    ['latentDitheringSpeed', 0, 2],
    ['latentDitheringAudioSpeed', 0, 2],
    ['latentDitheringSize', 0.5, 8],
    ['latentDitheringOpacity', 0, 1],
    ['latentMeshSpeed', 0, 2],
    ['latentMeshAudioSpeed', 0, 2],
    ['latentMeshDistortion', 0, 2],
    ['latentMeshSwirl', 0, 1],
    ['latentOverlayOpacity', 0, 1],
    ['tiltSplitProbability', 0, 1],
    ['tiltStyleProbability', 0, 1],
    ['claddaghFocusScaleRatio', 0, 1.5],
    ['claddaghRadiusScale', 0.5, 1.5],
    ['claddaghEllipseTiltDeg', 0, 60],
    ['claddaghLetterSpacingOffset', -5, 20],
    ['partitaStaggerMin', 0, 180],
    ['partitaStaggerMax', 0, 180],
    ['pendoloArcRadius', 0.25, 0.8],
    ['pendoloArcAngleDeg', 40, 160],
    ['pendoloWheelCenterX', -0.3, 0.5],
    ['pendoloWheelCenterY', 0.2, 0.8],
    ['pendoloTickSnappiness', 0.5, 2],
    ['pendoloActiveScale', 1, 1.6],
    ['monetFontScale', 0.7, 1.5],
    ['monetPortraitOffsetX', -150, 0],
    ['fumeBackgroundObjectOpacity', 0, 1],
    ['fumeTextHoldRatio', 0, 1],
    ['fumeCameraSpeed', 0.55, 1.85],
    ['fumeGlowIntensity', 0, 1.8],
    ['fumeHeroScale', 0.82, 1.32],
  ] as const) {
    const value = values[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high)
      errors.push(`${key} 必须在 ${low}–${high} 之间`);
  }
  for (const key of ['fontWeight', 'subtitleFontWeight']) {
    const value = values[key];
    if (
      value !== null &&
      (typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < 100 ||
        value > 900 ||
        value % 10 !== 0)
    )
      errors.push(`${key} 必须为自动或 100–900 的字重（步长 10）`);
  }
  for (const [key, options] of [
    ['fontStyle', ['sans', 'serif', 'mono']],
    ['subtitleFontStyle', ['sans', 'serif', 'mono']],
    ['subtitleContentMode', ['translation', 'romanization', 'both', 'none']],
    ['animationIntensity', ['calm', 'normal', 'chaotic']],
    ['latentDisplayMode', ['both', 'mesh', 'dithering']],
    ['latentColorSource', ['cover-theme', 'cover-only']],
    ['backgroundMode', ['latent', 'sora', 'common', 'monet', 'nomand']],
    ['cappellaAvatarSource', ['cover', 'builtin', 'color', 'custom']],
    ['cappellaEmojiPackSource', ['builtin', 'custom']],
    ['tiltColorScheme', ['default', 'swap', 'accentAll', 'primaryAll']],
    ['pendoloShowGearDecor', ['none', 'subtle', 'full']],
    ['monetAudioStyle', ['bar', 'line']],
    ['monetPortraitSource', ['cover', 'custom']],
    ['monetPortraitStyle', ['square', 'rectangular']],
    ['fumeCameraTrackingMode', ['smooth', 'stepped']],
  ] as const) {
    if (
      typeof values[key] !== 'string' ||
      !(options as readonly string[]).includes(values[key] as string)
    )
      errors.push(`无效的 ${key}`);
  }
  if (
    typeof values.monetPortraitAsset !== 'string' ||
    (values.monetPortraitAsset !== '' && !/^asset:[a-f0-9]{32}$/.test(values.monetPortraitAsset))
  )
    errors.push('无效的立绘资源');
  if (
    typeof values.playerBottomBarOffset !== 'number' ||
    !Number.isSafeInteger(values.playerBottomBarOffset) ||
    values.playerBottomBarOffset < 32
  )
    errors.push('播放胶囊底距必须是至少 32 的整数');
  for (const key of ['playerControlSlotPrimary', 'playerControlSlotSecondary'])
    if (typeof values[key] !== 'string' || !capsuleActions.has(values[key]))
      errors.push(`无效的播放胶囊槽位：${key}`);
  for (const key of ['fontFamilies', 'subtitleFontFamilies']) {
    const families = values[key];
    if (
      !Array.isArray(families) ||
      families.length < 1 ||
      families.length > 16 ||
      families.some((family) => typeof family !== 'string' || !family.trim() || family.length > 256)
    )
      errors.push(`${key} 必须包含 1–16 个有效字体名称`);
  }
  const colors = values.wordColors;
  validateModeTuning(values, errors);
  if (
    !Array.isArray(colors) ||
    colors.length > 256 ||
    colors.some((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return true;
      return (
        Object.keys(entry).some((key) => key !== 'word' && key !== 'color') ||
        typeof entry.word !== 'string' ||
        !entry.word.trim() ||
        entry.word.length > 256 ||
        typeof entry.color !== 'string' ||
        !/^#[0-9a-fA-F]{6}$/.test(entry.color)
      );
    })
  )
    errors.push('情绪词配色须为最多 256 个词语和 #RRGGBB 颜色');
  return errors.length ? { errors } : true;
}
