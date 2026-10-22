# 完整播放页皮肤

宿主提供 `ctx.ui.lyricsPage.registerSkin(definition)`。在 manifest 声明 `ui.lyricsPage` feature 和 `lyricsPage` capability；页面实际使用的 `playback.context`、`playback.lyrics`、`appearance.snapshot`、`appearance.fonts` 等 feature 也须声明。当前类型唯一维护在 `packages/sdk/index.d.ts`，以真实宿主导出为准。

```ts
import type { EchoPluginContext } from 'echo:plugin-sdk';

export function activate(ctx: EchoPluginContext): void {
  const skin = ctx.ui.lyricsPage.registerSkin({
    id: 'lyrics',
    title: '我的歌词皮肤',
    component: 'qml/Page.qml',
    settingsComponent: 'qml/Settings.qml',
    preview: 'assets/preview.png',
    titlebar: 'host',
    tools: 'host',
    defaults: { mode: 'first' },
    validate: (values) => values.mode === 'first',
  });
  if (!skin) throw new Error(ctx.ui.lyricsPage.errorMessage);
}
```

注册进入现有换肤抽屉，不自动改变选择。`component` 必须存在于包内；预览、设置组件也只能引用包内资源。`titlebar/tools` 分别为 `host` 或 `none`，决定宿主窗口栏与歌词工具是否保留。页面加载成功后接管完整播放区；加载或运行失败由宿主退回内置皮肤。

页面和皮肤设置均接收三个 required 属性：

```qml
import QtQuick
import EchoMusic.PluginSdk
import EchoMusic.Theme

Item {
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property AppearanceConfiguration configuration
}
```

`plugin` 是该可见实例的独立呈现 scope，`page.player` 是唯一播放器的只读投影。`page.command(action, arguments)` 将操作交回宿主，拒绝过期页面、账号或曲目世代；seek 等曲目操作可携带 `revision: page.player.revision`。播放控制、进度和原生歌词可复用 `EchoPluginPlaybackControls`、`EchoPluginProgress`、`EchoPluginLyricsView`。

`page.player.lyrics` 是只读增量模型，支持虚拟视图和 `row(index)`；`lyricsInfo` 提供数量、当前索引、偏移与译文状态。原模型的修改方法不公开。大歌词不应调用 `lyricSnapshot()` 每帧复制全文。

`configuration.values/defaults` 只读，修改使用 `patch(JSON object)` 和 `reset()`。写入通过宿主校验、串行队列和原子文件保存，`busy` 表示尚有已接受写入；`errorMessage` 反馈校验或写入失败。patch 合并顶层字段，嵌套对象按整个值替换，模式设置应避免互相覆盖。不要另存一份全局播放器或皮肤设置。

原生 JSON 列表可能以 Qt sequence 传入 JavaScript 校验器，其 `Array.isArray()` 为 false。需要严格数组校验时，先通过 `JSON.parse(JSON.stringify(values))` 规范化 JSON 边界，再验证字段、范围和列表元素；不能为通过加载而删除校验。

`plugin.appearance.snapshot` 提供语义颜色、材质/减少动效状态和完整 `font/lyricFont/miniFont/desktopFont` QFont；`plugin.fonts.families/build()` 提供系统字体列表和完整字体链。`build(['follow'])` 跟随应用字体；歌词的“跟随”应取 snapshot 的 `lyricFont`，在本地 QFont 副本调整样式度量，保留完整回退链。

宿主按页面关闭、隐藏、最小化、停用、异常和账号变化撤销呈现 scope 并销毁实例。旧配置代理不能继续写入，旧命令不能操作新曲目。注册或模块顶层不应提前创建全部模式 UI；内部样式选择只持久化当前 mode，并按需创建实际组件。
