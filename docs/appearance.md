# 主题、完整皮肤与浮窗

主题和皮肤是候选贡献，注册后进入宿主原有主题中心或换肤抽屉，不自动选中。声明`theme`或`lyricsPage` capability，以及实际使用的`appearance.themes`、`ui.lyricsPage`、`appearance.snapshot`、`appearance.fonts`、`playback.context`、`windows.floating` features。版本仍为1.0.0。

```ts
export function activate(ctx) {
  const theme = ctx.theme.registerTheme({
    id: 'night',
    title: '夜色',
    light: { palette: { main: '#e8edf3', text: '#18222b' } },
    dark: { palette: { main: '#18222b', text: '#e8edf3' }, mini: { background: '#20303f' } },
    miniComponent: 'Mini.qml',
    settingsComponent: 'Settings.qml',
    defaults: { glow: true },
    validate: (values) => typeof values.glow === 'boolean',
  });
  if (!theme) throw new Error(ctx.theme.errorMessage);
  const skin = ctx.ui.lyricsPage.registerSkin({
    id: 'wide',
    title: '宽屏',
    component: 'Page.qml',
    titlebar: 'none',
    tools: 'none',
    defaults: { spacing: 24 },
    settingsComponent: 'SkinSettings.qml',
  });
  if (!skin) throw new Error(ctx.theme.errorMessage);
}
```

两个候选各有独立配置。`useTheme(id)`、`useSkin(id)`可显式应用本插件的局部ID或目录key，`openThemes/openSkins`打开实际宿主入口。完整皮肤可以替换整个播放页，不强制宿主封面、布局或底部播放栏；titlebar/tools分别选择host或none。Mini属于当前主题的独立呈现，不跟随播放页皮肤切换，也不维护另一份主题或播放器。

声明 `appearance.lyricIcons` feature 后，主题可通过 `lyricsIcons` 提供最多 64 个符号图标名称，每个名称为非空、最多 128 个 UTF-16 单元的字符串。当前实际生效主题的名称列表随 `ctx.appearance.snapshot.themeMetadata.lyricsIcons` 提供，切换、预览或撤销跟随主题生命周期；内置颜色的 `themeMetadata` 为 `null`。名称不是文件路径，具体图标词汇和未知名称的呈现由歌词皮肤决定。

## QML契约

主题背景、侧栏/播放栏装饰、Mini和完整播放页、专属设置均使用同一注入约定：

```qml
import QtQuick
import QtQuick.Layouts
import EchoMusic.Theme
import EchoMusic.Controls
import EchoMusic.PluginSdk
Item {
    id: root
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property AppearanceConfiguration configuration
    implicitHeight: 600
    ColumnLayout {
        anchors.fill: parent
        EchoPluginLyricsView { Layout.fillWidth: true; Layout.fillHeight: true; page: root.page }
        EchoPluginPlaybackControls { page: root.page }
        EchoPluginProgress { Layout.fillWidth: true; page: root.page }
    }
}
```

`plugin.player`提供完整只读播放快照、队列和歌词模型，`lyricSnapshot()`按需返回完整歌词，`lyricsInfo`提供当前行、翻译/音译和偏移信息。`page.command(action,args)`调用真实宿主命令，返回operation表示分发结果；网络、播放和收藏的后续状态由同一宿主快照通知。对曲目敏感的操作可携带`revision`，不会作用到已经切换的新歌曲。组件失效、隐藏或账号变化时，旧操作拒绝或取消；曲目敏感操作及显式携带revision的命令也会在切歌后取消。音量、播放模式和浮窗等全局操作不因切歌失效。

`EchoPluginPlaybackControls`、`EchoPluginProgress`和`EchoPluginLyricsView`直接接受typed page，复用共享控件、原生歌词绘制及宿主时间源。封面可直接用`EchoCover`绑定`page.player.coverUrl`。不把PlaybackService、可写模型或裸Window交给作者。

设置组件可用 `page.closeSkinSettings()` 请求宿主关闭皮肤设置抽屉，例如提交页面中的位置调节请求后返回完整播放页。操作经过相同的可见 scope 与账号世代检查；组件不查找抽屉、窗口或宿主私有对象。

声明 `ui.presentationClosing` 后，`page.aboutToClose` 在外观实例隐藏、关闭或被替换时同步通知；此刻旧呈现权限仍有效，可提交拖动中的设置。通知返回后立即撤销权限，不能在回调中等待异步任务或保留实例继续操作。已接受的配置写入沿用宿主排空机制；停用、账号变化或 scope 已撤销时不发此通知。不能仅靠 `Component.onDestruction` 保存未提交值，此时配置代理可能已失效。

声明 `ui.presentationVisibility` 后，可用 `PresentationScope` 作为自己组件的可视容器，以 `Loader.active: scope.presented` 按需创建预览。只读 `presented` 检查祖先裁剪、多边形几何、透明度、显隐、旋转/缩放及窗口隐藏/最小化；离开滚动视口立即变为 false，不启动轮询。它不公开宿主祖先对象，也不判断其他窗口或兄弟项的遮挡。自定义 `transform` 列表不属于当前变更通知契约；使用 Item 的 `rotation/scale` 属性。呈现权限仍需结合当前 configuration/scope 的 active 状态。

`page.player.lyrics` 是只读增量模型，支持虚拟视图和 `row(index)`；`lyricsInfo` 提供数量、当前索引、偏移与译文状态。原模型的修改方法不公开。大歌词不应调用 `lyricSnapshot()` 每帧复制全文。

## 配置与生命周期

每个可见组件拿到受自身作用域保护的配置句柄，共享同一份`configuration.values`和持久写入队列。`patch`验证合并后的完整JSON，`reset`回默认值；每份配置64KiB、写入队列有界。返回true表示已接受，`busy`降为false且`values`变化表示持久提交，失败读取`errorMessage`。配置保存在安装私有data目录，参与更新快照/回滚和卸载数据选项。注册尚未提交时不接受写入。停用后不接受新写入，已经接受的写入先排空。

隐藏/最小化、退出或切换贡献时销毁组件树，恢复显示按需创建；仅注册或列出候选不会创建隐藏页面、设置或Mini。主题提供者停用保留选择意图并暂时回退，恢复后重新解析；皮肤失败回封面并重置选择，用户显式重选才重试。失败按注册revision记录，不循环自动加载。

原生 JSON 列表可能以 Qt sequence 传入 JavaScript 校验器，其 `Array.isArray()` 为 false。需要严格数组校验时，先通过 `JSON.parse(JSON.stringify(values))` 规范化 JSON 边界，再验证字段、范围和列表元素；不能为通过加载而删除校验。

## 外观

主题type提供default/solid/dynamic分类；defaultMode在用户选择“跟随主题”时生效，显式系统/浅色/深色偏好优先。主题light/dark和同步resolve可贡献palette、floating、mini、background、surface、accentGradient和pageTransition。颜色为Qt颜色字符串；图片/视频、QML组件、预览均为包内相对资源。background支持color/gradient/image/video，stops最多8个、位置单调；surface按语义区域指定0–1透明度。页面过渡使用原生位移、缩放和透明度，遵循减少动效，不使用CSS。

`ctx.appearance.snapshot`与`ctx.fonts`复用ThemeStore及完整字体回退链。用户显式字体、强调色、透明度、系统材质和减少动效优先。插件自己的动画也应读取motionEnabled，重资源须属于可见组件scope。

`ctx.windows.snapshot/command`统一控制Mini和桌面歌词的显示、面板、置顶等设置、锁定和有效窗口边界。窗口未开时查询不创建窗口；边界设置需要窗口已打开并满足宿主原生尺寸范围。窗口定位、拖动、持久化和关闭仍由FloatingPlayerController负责。

`fonts.build(['follow'])` 跟随应用字体；歌词的“跟随”应取 snapshot 的 `lyricFont`，在本地 QFont 副本调整样式度量，保留完整回退链。

声明 `appearance.metadata` 后，`snapshot.themeMetadata` 提供当前实际生效主题的只读 `{ key, title, description }`，包含临时预览；使用内置颜色时为 `null`。显示名称和说明使用 `title/description`，不要把持久化选择键作为显示名称。

声明 `playback.lyrics.metadata` 后，歌词行保留来源确实提供的 `id/agentId/songPart/blockIndex/isChorus`、背景声部和备用文本。声部 `startMs` 已含宿主偏移，`words[].start_ms` 保留原始毫秒；仅应用一次 `lyricsInfo.offsetMs`。TTML 解析或来源错误在 `lyricsInfo.errorMessage` 报告，不能把不支持的 XML 当普通歌词显示。

宿主按页面关闭、隐藏、最小化、停用、异常和账号变化撤销呈现 scope 并销毁实例。旧配置代理不能继续写入，旧命令不能操作新曲目。注册或模块顶层不应提前创建全部模式 UI；内部样式选择只持久化当前 mode，并按需创建实际组件。
