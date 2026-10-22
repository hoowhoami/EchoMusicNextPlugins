import { defaults, validate } from './config';
import { styles } from './styles';
import type { EchoPluginContext } from 'echo:plugin-sdk';

export function activate(ctx: EchoPluginContext): void {
  if (!ctx.ui.setState({ styles: styles.map((style) => ({ ...style })) }))
    throw new Error('无法发布 Folia 样式目录');
  const skin = ctx.ui.lyricsPage.registerSkin({
    id: 'folia',
    title: 'Folia',
    description: '在播放页内切换 Folia 歌词样式',
    component: 'qml/FoliaPage.qml',
    settingsComponent: 'qml/Settings.qml',
    preview: 'assets/previews/still.png',
    titlebar: 'host',
    tools: 'host',
    defaults,
    validate,
  });
  if (!skin) throw new Error(ctx.ui.lyricsPage.errorMessage || 'Folia 皮肤注册失败');
}
