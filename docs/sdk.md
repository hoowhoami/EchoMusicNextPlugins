SDK协议当前1.0.0，QML模块URI保留EchoMusic.PluginSdk 1.0。

# 插件 SDK 1.0：运行时首批契约

2026-10-13 已接入 Qt 6.12.0 正式应用。此文档描述已经存在的 API；完整 EchoMusic 扩展能力仍以[迁移表](https://github.com/hoowhoami/EchoMusicNext/blob/main/docs/migration/plugins.md)为准。主界面和插件页面使用 Qt Quick；插件按可信代码安装。能力声明管理 SDK 访问，QML 引擎不是安全沙盒，不提供恶意代码隔离或同线程死循环抢占。

## 包与启动

本地包包含 `manifest.json` 和 ES module 入口，入口必须导出 `activate(context)`，可选导出 `deactivate(context)`。两者支持同步值与 Promise。当前Qt6.12引擎实测不接受async/await语法，使用Promise链；需要该语法的作者在开发构建阶段转换，宿主不引入Node运行时。[Qt JavaScript环境](https://doc.qt.io/qt-6/qtqml-javascript-hostenvironment.html)说明标准支持基线为ECMAScript第7版。每次启用创建新的 `EchoPluginContext`；同一代码版本的 ES module 顶层会被 Qt 缓存，顶层不保存激活上下文或可写业务状态。

```json
{
  "schemaVersion": 1,
  "id": "org.example.tools",
  "name": "Tools",
  "version": "1.0.0",
  "kind": "qml-js",
  "entry": "entry.mjs",
  "requires": {
    "hostVersion": ">=0.1.0 <1.0.0",
    "sdkVersion": ">=1.0.0 <2.0.0",
    "features": ["lifecycle", "playback.controls", "ui.titlebar", "storage"]
  },
  "capabilities": [],
  "contexts": ["main"]
}
```

版本约束支持空格分隔的 `>=`、`>`、`<=`、`<`、`=` 三段数值版本比较交集，不接受 npm 的完整 range 语法。必需 feature、capability、context 或版本不受支持时，包进入 Incompatible，入口不会执行。当前只提供 `main` context；其它窗口 scope 随相应宿主窗口接入。

通过正式可执行文件的 `--plugin-dir /absolute/package/path` 导入并启用可信本地包，可重复传入。包在工作线程验证和复制，发布到应用数据目录的 `plugins/packages/<installationUuid>/<sha256>/`；每个版本独立 URL。拒绝包内符号链接、路径越界、qmldir 原生 plugin 声明、超过 128 MiB 或 4096 文件的包。代码文件只读，插件数据在独立安装身份下的 `plugins/data/<installationUuid>/values.sqlite`，启用/来源/崩溃日志归宿主 QSettings；不同来源的同名 ID 不共享身份或数据，重复有效 ID 会拒绝激活。

退出后从安装副本恢复，不需要原始源码目录继续存在。`PluginRuntime.reload(installationId)` 会先停用和排空旧 scope，再重新采集该来源，按摘要发布新版本；启用偏好和安装身份保留。不提供旧Vue/Electron插件兼容。正式管理/源/分享及开发目录/.echomod/批量安装、更新/卸载已接入；更新失败同时回滚安装代码和私有数据，外部授权目录不回滚。

## 类型与作用域

QML 导入 `EchoMusic.PluginSdk 1.0`，由 Qt 生成 `.qmltypes`。JS/TypeScript作者使用 `@echomusicnext/plugin-sdk`（本仓库`packages/sdk/index.d.ts`），提供只读上下文、具名服务、操作结果与Signal契约；类型检查示例在 `tests/types/authoring.ts`，只用于开发。公开类型为 `EchoPluginContext`、`EchoPluginPlayer`、`EchoPluginReadModel`、`EchoPluginUi`、`EchoPluginIo`、`EchoPluginRegistry`、`EchoPluginOperation`、`EchoPluginRegistration`、`EchoPluginTask`、`EchoPluginPage`。服务和句柄均由宿主创建；业务页面不接触裸 FFI、SQL 连接、账号凭证或宿主服务 QObject。

Context 只读属性：`id`、`installationId`、`activationGeneration`、`contextId`、`active`、`audio`、`player`、`ui`、`io`、`sqlite`、`font`、`accent`、`dark`。世代以十进制字符串表示，避免 JS 的整数精度问题。字体读取现有 ThemeStore 的完整 QFont；没有新的字体状态来源。

当前 `supports(feature)` 返回如下宿主实现状态，不代表权限已授予：

Qt公开信号还提供`context.callbackFailed(message)`、`context.resourcesDrained`及`io.drained`诊断；生命周期和排空由宿主负责，作者不手动关闭worker。类型绑定与实际Qt元对象一起检查。

- `lifecycle`、`operations`、`commands`、`events`、`timers`。
- `playback.controls`、`playback.queue`、`playback.queues`、`playback.audioSource`、`playback.lyrics`、`lyrics.resolvers`、`lyrics.write`、`appearance.read`。
- `audio.spectrum`、`ui.state`、`ui.surfaces`、`ui.pages`、`ui.settings`、`ui.titlebar`、`ui.playerbar`、`tasks`、`storage`、`net.request`。

结构化数据另提供 `storage.sqlite`，要求 capability `sqlite`；使用命名库、迁移与事务见 [SQLite](sqlite.md)。

`net.request` 还要求 manifest 的 `unrestrictedNetwork` capability。文件与下载另提供`files.references/files.dialogs/files.io/files.media/net.downloads`，实际用法见[文件、媒体与网络](files-and-network.md)。其它旧能力仍为待接入。

## 操作和注册

异步方法返回 `EchoPluginOperation`：只读 `id`、`state`、`result`、`errorCode`、`errorMessage`；信号 `changed`、`completed`；方法 `cancel()`。状态 Pending=0、Running=1、Succeeded=2、Failed=3、Canceled=4，终态只发生一次。SDK 控制操作成功表示命令被宿主接收；播放加载/音频错误继续从唯一播放服务的状态读取，不将命令接受当作音乐已开始。

```js
import { awaitOperation } from 'echo:plugin-sdk';

export function activate(ctx) {
  return awaitOperation(ctx.io.writeValue('enabled', true)).then(() => {
    ctx.ui.registerTitlebarAction('pause', '暂停音乐', 'music', () => ctx.player.pause());
  });
}
```

Promise adapter 同时处理已经完成和延迟完成的操作。账号会话改变取消在途操作；定位当前曲目的 seek 还校验播放源世代。取消 SQL 任务会阻止尚未开始的写入，但不能撤销已经提交的事务；停用仍等待该 worker 排空。停用后新命令返回 ScopeClosed，旧回调不能重新注册或发布结果。

注册返回 `EchoPluginRegistration`，属性 `key`、`revision`、`active`，方法 `dispose()`。稳定键为 `pluginId:kind:contributionId`。同键替换先回收旧注册；旧句柄重复 dispose 不影响新注册。激活中的 UI、事件、定时器和命令暂存，Promise 成功后统一提交，失败全部回收。`onDispose(callback)` 在激活未提交时也会执行，按逆序调用；清理函数异常不会跳过其他资源。

生命周期 Promise 当前期限为 5 秒，超时记录失败并继续回收。该期限不可能抢占阻塞 GUI 的脚本。Promise 延迟回调经失效桥接对象安全忽略。崩溃日志在执行入口顶层之前同步写入；进程被强制结束不会自动开启安全模式；真正的插件错误会记录并提示。显式 `--safe-mode` 只发现包而不执行插件，保留启用偏好。正式退出等待所有导入和 SQL 工作完成后才关闭业务服务及引擎。

## 已连接的 SDK

| 服务                  | 契约                                                                                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| player                | 只读 title/artist/album/coverUrl/loading/hasTrack/errorMessage/playing/positionMs/durationMs/volume/speed；changed/positionChanged；play/pause/toggle/stop/previous/next/seek/setVolume/setSpeed/playIndex/remove/move/clear 返回操作。volume 沿用宿主的 0..150 百分比，speed 为 0.1..5。 |
| player.queue / lyrics | 只读 QAbstractListModel 投影宿主增量通知，保留真实 roleNames；不公开原模型 mutation slots。使用 ListView 等虚拟化视图。                                                                                                                                                                   |
| context events        | onPlayerChanged(id,callback)，停用/句柄处置断开连接；定时器 setTimer(id,intervalMs,repeat,callback)，1..86400000 ms，提交后才开始。                                                                                                                                                       |
| context commands      | registerCommand(id,callback)、executeCommand(id,arguments)，回调结果支持 Promise；运行时也可按 installationId 执行命令。                                                                                                                                                                  |
| ui pages              | registerPage(id,packageRelativeQml)、navigate(id,query)。页面只收到 plugin/context，使用 EchoPluginPage 或同属性契约的 Item；注册并不自动导航。卸载清理挂载项、缓存和历史，当前页恢复到可用宿主页。                                                                                       |
| ui settings           | SDK1.0.0：registerSettings(packageRelativeQml) 返回注册租约；只读settingsComponent URL与settingsChanged。成功激活后管理页按需加载，只注入EchoPluginContext；停用清空URL并销毁组件。                                                                                                       |
| ui actions            | registerTitlebarAction / registerPlayerbarAction(id,title,icon,callback)，真实 ShellActionModel 渲染、可使用原布局编辑；图标使用宿主已有语义图标名。                                                                                                                                      |
| ui tasks              | createTask(id,title) 返回 EchoPluginTask；setProgress(percent,label)、complete/fail/abort/dispose，cancelRequested 信号。当前接入任务中心的单任务进度/取消/终态，旧任务明细、操作及策略覆盖仍待接入。                                                                                     |
| io storage            | readValue/writeValue/removeValue(key)，JSON 值、key 1..512字符、单值最多1 MiB。安装私有 SQLite 串行 worker，不暴露应用 DB，不导入旧插件数据。                                                                                                                                             |
| net request           | ctx.net.request(options)，支持HTTP(S)、自定义方法/请求头/正文、响应解码/TLS/重定向；不复用宿主账号cookie，实际reply随操作取消。见[文件、媒体与网络](files-and-network.md)。                                                                                                               |

这些 API 是可执行的首批契约，不等于完整能力验收。文件引用/下载、任意插件私有 SQL、TCP/Web/WS、备份、音乐 API 和高级拦截、更多窗口/设置schema/侧栏及原生DSP产品接入，继续按迁移表实现；不删减或模拟这些功能。

## SDK1.0.0 插件依赖与服务

新增`EchoPluginContext.plugins` / `EchoPluginRegistry`，正式`.echomod`包、依赖图、版本化服务、可用性、异步JSON调用与取消/账号/停用语义见[插件指南](plugin-packages.md)。声明唯一在index.d.ts；运行时成员仍以真实宿主导出为准。

## 播放器频谱与原生挂载（2026-10-18）

`ctx.audio.spectrum.status/getStatus()`返回available/running/provider/reason/subscriberCount。
声明feature `audio.spectrum`与capability `audioSpectrum`后，`subscribe(options)`返回类型化订阅：active、paused、frame、status与frameChanged/statusChanged；setPaused/dispose控制投递。dispose后宿主销毁完整订阅，不能继续使用旧句柄。

选项fps1..60、binCount8..512、fftSize256/512/1024/2048/4096/8192、smoothing0..0.95、scale log/linear/mel、minFrequency/maxFrequency、includeWaveform。frame含source(player/silence/unavailable)、state、timestamp毫秒、timePos秒、sampleRate、fftSize、bins、可选waveform、peak/rms和频率边界。取播放器实际输出后的PCM，不采集系统混音；FFI控制队列最多一帧在途，Qt投递合并最新帧，音频回调仅try_lock写入有界环形缓冲。当前帧通过有界JSON事件传输，尚未实现迁移设计的零复制二进制buffer。

多个活跃订阅共用一次分析，合并帧率/FFT/频段/波形需求，再按订阅频率投递、映射频带。暂停或没有可见订阅时停止采集与FFT请求；曲目/配置世代阻止迟到帧。播放状态始终只读宿主PlaybackService。

`ctx.ui.setState(JSON object)`发布最多1MiB的只读ui.state/stateChanged，供同一插件的设置与绘制组件共享私有偏好，不保存另一套播放器状态。`registerSurface(id,target,packageRelativeQml)`只支持playerbar.background、mini.background、lyrics.aboveControls三个原生位置；注入plugin/placement，宿主隐藏、最小化和停用时销毁挂载实例，重新显示按需创建。这不是任意改写宿主UI的接口。

官方频谱插件沿用旧插件的五种模式、配色、可见性、采样与设置。HDR开关在graphics.hdr未提供时禁用并说明原因，未将SDR渲染标为HDR。

2026-10-19：官方频谱使用Qt Quick Shapes CurveRenderer与GPU光晕/模糊/遮罩，保留源五种模式路径与配色；不使用Canvas.Image逐帧CPU栅格。普通柱状/波形随新帧更新，中心频谱暂停后保留衰减至不可见再停掉插值时钟；公开SDK契约和版本不变。

## 公开宿主界面

`ui.parts`与`ui.styles`已提供查询、观察、公开动作、真实QML挂载和分属性视觉优先级。声明对应features后，使用`ctx.ui.parts`和`ctx.ui.styles`；所有句柄随激活scope撤销，实例引用不会跟随虚拟委托复用。宿主基础绑定持续有效，停用恢复当前外观，不写用户主题偏好。完整接口与生命周期见[ui.parts文档](ui-parts.md)。主题中心候选、完整皮肤、Mini主题和播放/歌词/字体/浮窗SDK见[外观文档](appearance.md)。

音源五阶段解析/转换与自定义曲目、多队列接口见[音源与队列](audio-sources-and-queues.md)。

歌词 resolver、LRC/KRC/YRC 和作用域写入见[歌词接口](lyrics.md)。

业务与验证、入口、快捷键/Toast/滚动、完整任务及页面/桌面歌词动效见[扩展接口](ecosystem.md)。

完整备份、检查、恢复和设置中的存储提供者见 [备份](backups.md)。

独立 QML 窗口、资源授权、TCP 与同端口 HTTP/WebSocket 服务见[窗口与网络服务](windows-network.md)。
