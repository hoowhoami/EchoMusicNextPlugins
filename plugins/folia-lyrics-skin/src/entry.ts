import { defaults, validate } from './config';
import { styles } from './styles';
import { settingsFields } from './settings';
import type { EchoPluginContext } from 'echo:plugin-sdk';
import { createRandomSelector, pickRandomMode, songIdentity } from './random';

export function activate(ctx: EchoPluginContext): void {
  if (!ctx.ui.setState({ styles: styles.map((style) => ({ ...style })), settingsFields }))
    throw new Error('无法发布 Folia 样式目录');
  const skin = ctx.ui.lyricsPage.registerSkin({
    id: 'folia',
    title: 'Folia',
    description: '在播放页内切换 Folia 歌词样式',
    component: 'qml/FoliaPage.qml',
    settingsComponent: 'qml/Settings.qml',
    preview: 'assets/previews/classic.png',
    titlebar: 'host',
    tools: 'host',
    defaults,
    validate,
  });
  if (!skin) throw new Error(ctx.ui.lyricsPage.errorMessage || 'Folia 皮肤注册失败');
  const configuration = skin.configuration;
  if (!configuration) throw new Error('Folia 皮肤配置已失效');
  const selector = createRandomSelector();
  let disposed = false;
  const updateRandom = () => {
    if (disposed || !ctx.active || !configuration.active || configuration.busy) return;
    const values = configuration.values;
    const next = selector.observe(songIdentity(ctx.player.snapshot.track), {
      mode: String(values.mode),
      randomVisualizerModePerSong: values.randomVisualizerModePerSong === true,
      // Native QVariantList is a Qt sequence rather than an ECMAScript Array.
      randomVisualizerModes: JSON.parse(JSON.stringify(values.randomVisualizerModes)),
    });
    if (next) configuration.patch({ mode: next });
  };
  configuration.changed.connect(updateRandom);
  configuration.busyChanged.connect(updateRandom);
  ctx.activeChanged.connect(updateRandom);
  if (
    !ctx.onPlayerChanged('folia.random.perSong', updateRandom) ||
    !ctx.registerCommand('folia.random.reroll', () => {
      if (!configuration.active || configuration.busy)
        throw new Error('样式设置正在保存，请稍后再试');
      const next = pickRandomMode(
        JSON.parse(JSON.stringify(configuration.values.randomVisualizerModes)),
        String(configuration.values.mode),
      );
      if (next !== configuration.values.mode && !configuration.patch({ mode: next }))
        throw new Error(configuration.errorMessage || '未能保存随机样式');
    }) ||
    !ctx.onDispose(() => {
      disposed = true;
      configuration.changed.disconnect(updateRandom);
      configuration.busyChanged.disconnect(updateRandom);
      ctx.activeChanged.disconnect(updateRandom);
    })
  )
    throw new Error('无法注册 Folia 随机样式作用域');
  updateRandom();
}
