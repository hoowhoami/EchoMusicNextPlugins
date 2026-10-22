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

## 配置与生命周期

每个可见组件拿到受自身作用域保护的配置句柄，共享同一份`configuration.values`和持久写入队列。`patch`验证合并后的完整JSON，`reset`回默认值；每份配置64KiB、写入队列有界。返回true表示已接受，`busy`降为false且`values`变化表示持久提交，失败读取`errorMessage`。配置保存在安装私有data目录，参与更新快照/回滚和卸载数据选项。注册尚未提交时不接受写入。停用后不接受新写入，已经接受的写入先排空。

隐藏/最小化、退出或切换贡献时销毁组件树，恢复显示按需创建；仅注册或列出候选不会创建隐藏页面、设置或Mini。主题提供者停用保留选择意图并暂时回退，恢复后重新解析；皮肤失败回封面并重置选择，用户显式重选才重试。失败按注册revision记录，不循环自动加载。

## 外观

主题type提供default/solid/dynamic分类；defaultMode在用户选择“跟随主题”时生效，显式系统/浅色/深色偏好优先。主题light/dark和同步resolve可贡献palette、floating、mini、background、surface、accentGradient和pageTransition。颜色为Qt颜色字符串；图片/视频、QML组件、预览均为包内相对资源。background支持color/gradient/image/video，stops最多8个、位置单调；surface按语义区域指定0–1透明度。页面过渡使用原生位移、缩放和透明度，遵循减少动效，不使用CSS。

`ctx.appearance.snapshot`与`ctx.fonts`复用ThemeStore及完整字体回退链。用户显式字体、强调色、透明度、系统材质和减少动效优先。插件自己的动画也应读取motionEnabled，重资源须属于可见组件scope。

`ctx.windows.snapshot/command`统一控制Mini和桌面歌词的显示、面板、置顶等设置、锁定和有效窗口边界。窗口未开时查询不创建窗口；边界设置需要窗口已打开并满足宿主原生尺寸范围。窗口定位、拖动、持久化和关闭仍由FloatingPlayerController负责。
