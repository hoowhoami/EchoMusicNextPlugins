import type { JsonValue } from 'echo:plugin-sdk';

// Folia a8da4437 types.ts and its source settings panels. One descriptor serves
// persistence validation and the corresponding editor; renderers keep their own source resolvers.
type Field = {
  group: string;
  key: string;
  title: string;
  kind: 'boolean' | 'range' | 'select' | 'color';
  initial: JsonValue;
  from?: number;
  to?: number;
  step?: number;
  integer?: boolean;
  options?: { label: string; value: string | number }[];
  when?: { key: string; value: JsonValue };
  enabledWhen?: { key: string; value: JsonValue };
};
const key = (group: string, name: string) => group + name[0].toUpperCase() + name.slice(1);
const range = (
  group: string,
  name: string,
  title: string,
  initial: number,
  from: number,
  to: number,
  step = 0.05,
  integer = false,
): Field => ({
  group,
  key: key(group, name),
  title,
  kind: 'range',
  initial,
  from,
  to,
  step,
  integer,
});
const toggle = (group: string, name: string, title: string, initial = true): Field => ({
  group,
  key: key(group, name),
  title,
  kind: 'boolean',
  initial,
});
const choice = (
  group: string,
  name: string,
  title: string,
  initial: string | number,
  options: [string, string | number][],
): Field => ({
  group,
  key: key(group, name),
  title,
  kind: 'select',
  initial,
  options: options.map(([label, value]) => ({ label, value })),
});

export const modeTuning: readonly Field[] = [
  range('diorama', 'cameraSpeed', '镜头速度', 1, 0.55, 1.85),
  range('diorama', 'motionAmount', '镜头运动幅度', 1, 0.4, 1.6),
  range('diorama', 'audioReactivity', '音频响应', 1, 0, 1.5),
  toggle('diorama', 'geometryEnabled', '显示几何层'),
  {
    ...choice('diorama', 'geometryMode', '几何形式', 'clouds', [
      ['点云', 'clouds'],
      ['隧道', 'corridor'],
    ]),
    enabledWhen: { key: 'dioramaGeometryEnabled', value: true },
  },
  ...(
    [
      ['geometryStrands', '线束'],
      ['geometryBlobs', '团块'],
      ['geometryRibbons', '飘带'],
      ['geometryRings', '环形'],
    ] as const
  ).map(([name, title]) => ({
    ...toggle('diorama', name, title),
    when: { key: 'dioramaGeometryMode', value: 'clouds' },
    enabledWhen: { key: 'dioramaGeometryEnabled', value: true },
  })),
  ...[
    range('diorama', 'particleDensity', '几何粒子密度', 576, 96, 1536, 24, true),
    range('diorama', 'particleScale', '点云缩放', 1, 0.65, 1.6),
    toggle('diorama', 'particleGlowEnabled', '点云辉光'),
    {
      ...range('diorama', 'particleGlowIntensity', '点云辉光强度', 0.65, 0.1, 1.5),
      when: { key: 'dioramaParticleGlowEnabled', value: true },
    },
  ].map((field) => ({ ...field, enabledWhen: { key: 'dioramaGeometryEnabled', value: true } })),
  toggle('diorama', 'showParticles', '显示背景尘埃'),
  ...[
    range('diorama', 'backgroundParticleCircumference', '尘埃圆周数量', 28, 4, 48, 2, true),
    range('diorama', 'backgroundParticleRadial', '尘埃径向数量', 2, 1, 4, 1, true),
  ].map((field) => ({ ...field, enabledWhen: { key: 'dioramaShowParticles', value: true } })),
  toggle('diorama', 'glowEnabled', '歌词辉光'),
  {
    ...range('diorama', 'glowIntensity', '歌词辉光强度', 1, 0.1, 1.5),
    enabledWhen: { key: 'dioramaGlowEnabled', value: true },
  },
  toggle('diorama', 'soulEnabled', '灵魂出窍'),
  {
    ...range('diorama', 'soulIntensity', '灵魂副本强度', 1, 0.1, 1.5),
    enabledWhen: { key: 'dioramaSoulEnabled', value: true },
  },
  toggle('diorama', 'soulActiveEnabled', '当前字漂移', false),
  toggle('diorama', 'gradientEnabled', '逐字渐变', false),
  {
    ...range('diorama', 'gradientIntensity', '渐变强度', 1, 0.1, 1.5),
    enabledWhen: { key: 'dioramaGradientEnabled', value: true },
  },
  toggle('diorama', 'keywordColoringEnabled', '关键词着色'),
  ...[
    choice('monet', 'backgroundSource', '图片来源', 'cover-derived', [
      ['封面', 'cover-derived'],
      ['自定义图片', 'uploaded-global'],
    ]),
    choice('monet', 'backgroundLayout', '背景布局', 'full-overlay', [
      ['全幅叠加', 'full-overlay'],
      ['半幅渐变', 'half-pane-gradient'],
    ]),
    {
      ...range('monet', 'backgroundHalfPaneOffsetX', '半幅水平偏移', 0, -40, 40, 2),
      when: { key: 'monetBackgroundLayout', value: 'half-pane-gradient' },
    },
    toggle('monet', 'backgroundDriftEnabled', '背景漂移'),
    {
      ...range('monet', 'backgroundDriftStrength', '漂移强度', 0.5, 0, 1),
      when: { key: 'monetBackgroundDriftEnabled', value: true },
    },
    range('monet', 'backgroundBlurPx', '背景模糊', 6, 0, 60, 2),
    range('monet', 'backgroundSaturation', '背景饱和度', 1.05, 0, 2),
    range('monet', 'backgroundGrayscale', '背景灰度', 0, 0, 1, 0.02),
    range('monet', 'backgroundOverlayOpacity', '主题遮罩透明度', 0.74, 0, 1, 0.02),
    range('monet', 'backgroundWash', '背景染色', 0.34, 0, 1, 0.02),
    toggle('monet', 'backgroundStreaksEnabled', '显示光纹'),
    choice('monet', 'backgroundWashColorMode', '染色来源', 'theme', [
      ['主题', 'theme'],
      ['自定义', 'custom'],
    ]),
    {
      group: 'monet',
      key: 'monetBackgroundWashCustomColor',
      title: '自定义染色',
      kind: 'color' as const,
      initial: '#8fb7ff',
      when: { key: 'monetBackgroundWashColorMode', value: 'custom' },
    },
  ].map((field) => ({ ...field, group: 'monet-background' })),
  ...[
    toggle('common', 'useCoverColorBg', '叠加封面颜色', false),
    range('common', 'opacity', '主题色遮罩透明度', 0.75, 0, 1),
    toggle('common', 'disableVignette', '关闭暗角', false),
    toggle('common', 'disableGeometricBackground', '关闭几何图形', false),
  ].map((field) => ({ ...field, group: 'common-background' })),
  ...[
    choice('nomand', 'imageSource', '图片来源', 'cover-derived', [
      ['封面', 'cover-derived'],
      ['自定义图片', 'uploaded-global'],
    ]),
    choice('nomand', 'effect', '图像效果', 'dithering', [
      ['抖色', 'dithering'],
      ['长虹玻璃', 'fluted-glass'],
      ['纸张', 'paper-texture'],
      ['半调网点', 'halftone-dots'],
      ['透镜', 'lens-distortion'],
    ]),
    choice('nomand', 'ditheringType', '抖色矩阵', '8x8', [
      ['2×2', '2x2'],
      ['4×4', '4x4'],
      ['8×8', '8x8'],
    ]),
    range('nomand', 'size', '抖色网格', 3, 0.5, 20, 0.5),
    range('nomand', 'colorSteps', '色阶', 4, 1, 7, 1, true),
    toggle('nomand', 'originalColors', '抖色保留原色', false),
    toggle('nomand', 'inverted', '抖色反相', false),
    range('nomand', 'flutedGlassSize', '玻璃纹理大小', 0.5, 0.1, 1),
    range('nomand', 'flutedGlassDistortion', '玻璃畸变', 0.5, 0, 1),
    range('nomand', 'flutedGlassBlur', '玻璃模糊', 0.08, 0, 1, 0.01),
    range('nomand', 'paperTextureContrast', '纸张对比度', 0.32, 0, 1, 0.01),
    range('nomand', 'paperTextureRoughness', '纸张粗糙度', 0.42, 0, 1, 0.01),
    range('nomand', 'paperTextureFiber', '纸张纤维', 0.3, 0, 1),
    range('nomand', 'halftoneDotsSize', '半调网点大小', 0.5, 0.1, 1),
    range('nomand', 'halftoneDotsRadius', '半调网点半径', 1.25, 0.1, 2),
    range('nomand', 'halftoneDotsContrast', '半调网点对比度', 0.4, 0, 1),
    toggle('nomand', 'halftoneDotsOriginalColors', '半调保留原色', false),
    toggle('nomand', 'halftoneDotsInverted', '半调反相', false),
    range('nomand', 'lensDistortionSpread', '透镜范围', 0.45, 0, 1),
    range('nomand', 'lensDistortionBulge', '透镜凸起', 0.3, -1, 1),
    range('nomand', 'lensDistortionDispersion', '透镜色散', 0.65, 0, 1),
    toggle('nomand', 'overlayEnabled', '主题遮罩'),
    range('nomand', 'overlayOpacity', '主题遮罩透明度', 0.35, 0, 1),
  ].map((field) => ({ ...field, group: 'nomand-background' })),
  range('tempera', 'cameraIntensity', '镜头强度', 1, 0, 2),
  range('tempera', 'glyphMotion', '逐字动效', 1, 0, 2),
  toggle('tempera', 'wholeLineLyrics', '整行歌词', false),
  range('tempera', 'glyphSettleStretch', '逐字入场时序', 0.5, 0, 1),
  choice('tempera', 'colorMode', '配色方式', 'duo', [
    ['双色', 'duo'],
    ['单色', 'mono'],
    ['渐变', 'gradient'],
  ]),
  toggle('tempera', 'textInversion', '文字动态反色'),
  choice('tempera', 'layerImageDepth', '图层位置', 'back', [
    ['后景', 'back'],
    ['前景', 'front'],
  ]),
  range('tempera', 'layerImageFrequency', '图片出现频率', 0.6, 0, 1),
  toggle('tempera', 'showBlocks', '显示色块'),
  toggle('tempera', 'showDecor', '显示装饰'),
  toggle('tempera', 'showCornerMarks', '显示边角线框'),
  toggle('tempera', 'enableTransitions', '启用转场'),
  range('tempera', 'textureResolution', '纹理分辨率', 1.5, 0.5, 4, 0.25),
  toggle('tempera', 'postProcessEnabled', '启用后处理'),
  toggle('tempera', 'postProcessTextureCompression', '后处理纹理压缩', false),
  range('tempera', 'postProcessGrain', '胶片颗粒', 0.2, 0, 1),
  range('tempera', 'postProcessContrast', '对比度', 0, 0, 1),
  range('tempera', 'postProcessRgbShift', '色差', 0, 0, 1),
  range('tempera', 'postProcessVignette', '暗角', 0.85, 0, 2),
  range('tempera', 'postProcessLensDistortion', '镜头畸变', 0.3, 0, 2),
  range('sonnet', 'cameraIntensity', '镜头强度', 1, 0, 2),
  range('sonnet', 'typographyMotion', '文字动效', 1, 0, 2),
  range('sonnet', 'mgDensity', '动态图形密度', 1, 0, 2),
  toggle('sonnet', 'showOnlyText', '仅显示歌词文字', false),
  toggle('sonnet', 'showGuide', '显示辅助线'),
  toggle('sonnet', 'showBackgroundMg', '显示背景动态图形'),
  toggle('sonnet', 'showFixedGeo', '显示固定几何图形'),
  toggle('sonnet', 'showGiantDecorativeText', '显示大字装饰'),
  toggle('sonnet', 'showBackgroundDecor', '显示背景装饰'),
  toggle('sonnet', 'enableTransitions', '启用转场'),
  choice('sonnet', 'outerFrameMode', '外框模式', 'full', [
    ['隐藏', 'none'],
    ['边框', 'frame'],
    ['完整', 'full'],
  ]),
  range('sonnet', 'textureResolution', '纹理分辨率', 1.5, 0.5, 4, 0.25),
  toggle('sonnet', 'postProcessEnabled', '启用后处理', false),
  range('sonnet', 'postProcessGrain', '胶片颗粒', 0.2, 0, 1),
  range('sonnet', 'postProcessContrast', '对比度', 0, 0, 1),
  range('sonnet', 'postProcessRgbShift', '色差', 0, 0, 1),
  range('sonnet', 'postProcessHalftone', '半调', 0, 0, 1),
  range('sonnet', 'postProcessVignette', '暗角', 0.85, 0, 2),
  range('sonnet', 'postProcessLensDistortion', '镜头畸变', 0.3, 0, 2),
  range('sonnet', 'postProcessLensDispersion', '镜头色散', 0.6, 0, 1),
  range('lumiere', 'lightIntensity', '光场强度', 1, 0.3, 2),
  range('lumiere', 'audioResponse', '音频响应', 1, 0, 2),
  range('lumiere', 'fogDensity', '烟雾浓度', 1, 0, 2),
  range('lumiere', 'darkField', '暗场', 0.75, 0, 1, 0.01),
  range('lumiere', 'moteAmount', '浮尘数量', 1, 0, 2),
  range('lumiere', 'bloom', '光场辉光', 1, 0, 2),
  range('lumiere', 'textBloom', '文字辉光', 1, 0, 2),
  range('lumiere', 'unlitOpacity', '未唱文字透明度', 0.22, 0.05, 0.6, 0.01),
  choice('lumiere', 'windowNeighbors', '邻近歌词行', 2, [
    ['一行', 1],
    ['两行', 2],
  ]),
  range('lumiere', 'decay', '残光', 1, 0, 2),
  range('lumiere', 'echo', '背景歌词亮度', 1, 0, 2),
  range('lumiere', 'fogOctaves', '烟雾细节', 5, 2, 6, 1, true),
  toggle('lumiere', 'lineArt', '显示线稿'),
  toggle('lumiere', 'frontBokeh', '前景散景'),
  toggle('lumiere', 'trails', '所有换位显示轨迹'),
  toggle('lumiere', 'hideTrails', '隐藏歌词换位轨迹', false),
  toggle('lumiere', 'seamlessTransitions', '连续轨迹转场'),
  toggle('lumiere', 'overlayFrame', '显示画框'),
  toggle('lumiere', 'textOnly', '仅显示歌词文字', false),
  toggle('lumiere', 'keywordColors', '关键词着色'),
  toggle('lumiere', 'themeIcons', '显示主题图标'),
  range('lumiere', 'themeColorMix', '主题色占比', 0.3, 0, 1, 0.01),
  choice('lumiere', 'renderQuality', '画质', 'full', [
    ['完整', 'full'],
    ['均衡', 'balanced'],
    ['低', 'low'],
  ]),
].map((field) => {
  if (/^(sonnet|tempera)PostProcess/.test(field.key) && !field.key.endsWith('Enabled')) {
    const group = field.key.startsWith('sonnet') ? 'sonnet' : 'tempera';
    return { ...field, when: { key: group + 'PostProcessEnabled', value: true } };
  }
  if (field.key === 'commonOpacity')
    return { ...field, when: { key: 'commonUseCoverColorBg', value: true } };
  if (field.key === 'nomandOverlayOpacity')
    return { ...field, when: { key: 'nomandOverlayEnabled', value: true } };
  return field;
});
export const modeDefaults: Readonly<Record<string, JsonValue>> = Object.freeze(
  modeTuning.reduce<Record<string, JsonValue>>((values, field) => {
    values[field.key] = field.initial;
    return values;
  }, {}),
);
export const modeSettings: JsonValue[] = modeTuning.map(
  ({ initial: _initial, integer: _integer, ...field }) => field as unknown as JsonValue,
);

export function validateModeTuning(values: Record<string, JsonValue>, errors: string[]): void {
  for (const field of modeTuning) {
    const value = values[field.key];
    if (field.kind === 'boolean') {
      if (typeof value !== 'boolean') errors.push(`${field.title}必须是布尔值`);
    } else if (field.kind === 'color') {
      if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value))
        errors.push(`${field.title}必须为 #RRGGBB 颜色`);
    } else if (field.kind === 'select') {
      if (!field.options?.some((option) => option.value === value))
        errors.push(`无效的${field.title}`);
    } else if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < field.from! ||
      value > field.to! ||
      (field.integer && !Number.isSafeInteger(value))
    )
      errors.push(`${field.title}超出允许范围`);
  }
  const images = values.temperaLayerImages;
  const ids = new Set<string>();
  if (
    !Array.isArray(images) ||
    images.length > 16 ||
    images.some((image) => {
      if (!image || typeof image !== 'object' || Array.isArray(image)) return true;
      if (
        typeof image.id !== 'string' ||
        !/^asset:[a-f0-9]{32}$/.test(image.id) ||
        ids.has(image.id)
      )
        return true;
      ids.add(image.id);
      return (
        Object.keys(image).some(
          (key) => !['id', 'name', 'align', 'verticalAlign', 'scale', 'opacity'].includes(key),
        ) ||
        (image.name !== undefined && (typeof image.name !== 'string' || image.name.length > 128)) ||
        !['free', 'left', 'center', 'right'].includes(image.align as string) ||
        !['free', 'top', 'center', 'bottom'].includes(image.verticalAlign as string) ||
        typeof image.scale !== 'number' ||
        !Number.isFinite(image.scale) ||
        image.scale < 0.05 ||
        image.scale > 2 ||
        typeof image.opacity !== 'number' ||
        !Number.isFinite(image.opacity) ||
        image.opacity < 0 ||
        image.opacity > 1
      );
    })
  )
    errors.push('Tempera 图片池须为最多 16 个有效安装素材及其位置参数');
}
