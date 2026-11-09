import type { EchoPluginContext, ThemeVariant } from 'echo:plugin-sdk';

const themes = [
  {
    id: 'autumn',
    title: '秋日枫叶',
    component: 'Autumn.qml',
    poster: 'autumn.png',
    shell: '#d07a00',
    accent: '#F1CF0B',
    dark: true,
    description: '暖橙秋景中，枫叶缓缓飘落。',
  },
  {
    id: 'prism',
    title: '幻彩',
    component: 'Prism.qml',
    poster: 'prism.png',
    shell: '#29292b',
    accent: '#11BE71',
    dark: true,
    description: '柔和彩光实时交织，随窗口尺寸自然铺展。',
  },
  {
    id: 'golden-ribbon',
    title: '金丝带',
    component: 'GoldenRibbon.qml',
    poster: 'golden-ribbon.png',
    shell: '#010101',
    accent: '#CD8038',
    dark: true,
    description: '深色背景上，金色丝带舒缓流转。',
  },
  {
    id: 'willow',
    title: '杨柳依依',
    component: 'Willow.qml',
    poster: 'preview.png',
    shell: '#318BA4',
    accent: '#FFDE00',
    dark: false,
    description: '柳枝轻摆，列车驶过远方。',
  },
  {
    id: 'ferris-wheel',
    title: '旋转摩天轮',
    component: 'FerrisWheel.qml',
    poster: 'preview.png',
    shell: '#f2c0c3',
    accent: '#a52656',
    dark: false,
    description: '粉色游乐园里，摩天轮与气球轻轻转动。',
  },
];

export function activate(ctx: EchoPluginContext) {
  for (const theme of themes) {
    const variant = (dark: boolean): ThemeVariant => ({
      palette: {
        shell: theme.shell,
        main: dark ? '#242428' : '#ffffff',
        sidebar: theme.shell,
        player: dark ? '#242428' : '#ffffff',
        card: dark ? '#36363a' : '#ffffff',
        elevated: dark ? '#36363a' : '#ffffff',
        text: dark ? '#f5f5f7' : '#222228',
        secondaryText: dark ? '#c7c7cc' : '#555560',
        border: dark ? '#55555a' : '#d2d2d8',
        accent: theme.accent,
      },
    });
    if (
      !ctx.theme.registerTheme({
        id: theme.id,
        title: theme.title,
        description: theme.description,
        type: 'dynamic',
        defaultMode: theme.dark ? 'dark' : 'light',
        preview: `assets/${theme.id}/${theme.poster}`,
        light: variant(false),
        dark: variant(true),
        backgroundComponent: theme.component,
        settingsComponent: 'Settings.qml',
        defaults: { enabled: true, speed: 1 },
        validate: (values) =>
          typeof values.enabled === 'boolean' &&
          typeof values.speed === 'number' &&
          Number.isFinite(values.speed) &&
          values.speed >= 0.5 &&
          values.speed <= 2,
      })
    )
      throw new Error(ctx.theme.errorMessage);
  }
}
