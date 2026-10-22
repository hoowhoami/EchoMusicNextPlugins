# 业务、入口、任务与歌词动效

这些接口都从 `EchoPluginContext` 获取。声明所需 feature；业务接口另外声明 `kugouApi`、显式验证声明 `kugouVerification`、歌词动效声明 `lyricEffects` capability。

## 业务与验证

`ctx.kugou.request(method, arguments)` 调用宿主类型化业务服务。编辑器按 method 提示准确的参数和结果字段；方法目录见 `KugouMethods`。目前提供 96 个正式命令，覆盖搜索、推荐/榜单、专辑/歌手、歌单、收藏、云盘、社交、评论/弹幕、音效、歌词、媒体和一起听。结果使用宿主已经转换的领域数据，字段保留其真实单位和可空性。业务 ID 使用十进制字符串，避免 JavaScript 大整数精度损失。

```ts
const result = await awaitOperation(
  ctx.kugou.request('search', {
    kind: 'song',
    keyword: '音乐',
    page: 1,
    pageSize: 30,
  }),
);
if (result.kind === 'songs') {
  for (const song of result.page.items) {
    // title, hash, artists, duration_ms 等真实字段
  }
}
```

请求绑定发起时的当前账号。切换账号、停用、退出呈现作用域或调用 operation.cancel() 会取消实际请求，不向旧界面交付结果。`ctx.kugou.account` 提供 userId、loggedIn、revision；`accountChanged` 在宿主完成账号切换后通知。插件应在此清空自己的账号视图/缓存，再请求新账号数据。请求不接受 userid、token、设备身份或任意 FFI 路由覆盖。登录入口继续由宿主账号界面管理。

需要人机验证的业务请求自动进入宿主现有验证界面。已有 eventId 时调用 `ctx.kugou.verify(eventId)`，等待 `{eventId, verified:true}`。验证 proof、浏览器回调和一次重放仍由宿主管理。取消插件的验证操作只取消自己的队列项，不关闭其他请求持有的验证。写操作沿用宿主各端点的重放策略，无法确定是否已提交时不会自动重复写入。

## 侧栏、快捷卡片与歌曲菜单

- `ui.registerSidebarItem(id, definition)`：title/icon、分组标题与排序、折叠、前后位置、动态 visible/disabled，以及 `pageId` 或 `onClick`。pageId 指向同一插件通过 registerPage 注册的页面。
- `ui.registerShortcutCard(id, definition)`：加入正式“添加卡片”目录，用户自行固定、拖动和移除。重新启用后保留用户的固定位置；未启用的插件不会留下可点击的卡片。
- `ui.registerSongMenuItem(id, definition)`：加入共享歌曲右键菜单，`onSelect` 获得当前曲目、当前选择和 sourceId。最多附带 500 首选择，selectionCount/truncated 保留完整选择信息。打开菜单后切换账号或选择变化，旧动作不会执行。

侧栏、快捷卡片、歌曲菜单、键盘快捷键和歌词动效在主激活上下文注册一次；装饰组件的呈现子上下文使用这些服务的读取/操作能力。入口回调支持 Promise，错误走插件运行时错误处理。谓词必须同步返回 boolean；修改 ui.state、播放上下文或账号会刷新可见性。排序同值时按稳定的注册键仲裁。侧栏和添加卡片/布局设置中的目录使用原生虚拟视图。

```ts
ctx.ui.registerPage('tools', 'Tools.qml');
ctx.ui.registerSidebarItem('tools', {
  title: '工具',
  icon: 'puzzle',
  pageId: 'tools',
  section: 'plugins',
});
ctx.ui.registerSongMenuItem('inspect', {
  label: '查看曲目',
  onSelect: ({ track }) => {
    ctx.toast.info(track.title);
  },
});
```

## 快捷键、通知与滚动

`shortcuts.registerShortcut(id, 'Ctrl+Alt+K', callback, global?)` 共用宿主快捷键服务、冲突检测和录制状态。默认本地，仅在宿主主窗口/Mini 活动且焦点不在文本输入框时触发。全局注册使用现有系统后端；通过返回句柄的 registered/errorMessage/changed 读取可用状态，不能把 active 当作系统已注册。停用或 dispose 自动撤销。

`toast.info/success/warning/danger(message, {title?, durationMs?, presentation?})` 使用正式通知视口。durationMs=0 保留到显式关闭；presentation 为 auto/mini/standard。返回 operation 的结果包含 id。dismiss 只关闭本作用域的通知，账号变化和停用自动撤销自己的通知。

`scroll.current/query/queryAll/observe` 返回活动页面的公开滚动区域；`snapshot` 提供位置、范围、内容/视口高度和移动状态。`scrollTo/scrollBy/top/bottom` 走现有页面滚动控制器，不返回 Flickable 或私有 Item。多个窗口可以按 UiPartSelector.window/surface/key 查询。旧账号、已退出页面或被复用的引用会失效。

## 完整任务中心

`tasks.registerTask(id, definition)` 在正式任务中心创建 pending/running 任务，可提供图标、进度、优先级、动作与明细行。优先级和图标也可通过 update/finish 的 patch 修改，保留同一个任务代际；终态任务可以更新展示内容。start/update/finish 更新同一任务；finish 只接受 completed/error/aborted。cancel 发出 cancelRequested，生产者据此撤销自己的实际工作，并用 finish 记录终态；dismiss/dispose 撤销租约。

```ts
const task = ctx.tasks.registerTask('scan', {
  name: '扫描',
  status: 'pending',
  priority: 10,
  retention: 'action-required',
});
task?.start({ progress: { done: 1, total: 4, label: '读取文件' } });
task?.finish('completed', { progress: { percent: 100 } });
```

retention 支持 transient、action-required，或分别配置 completed/error/aborted 的 `{mode:'manual'}` / `{mode:'auto',delayMs}`。自定义策略必须给全三个终态。任务/明细 actions 提供 id/label/variant/disabled/closePanel/onClick。每作用域最多 128 个活动任务，每任务最多 1000 条明细、每层最多 16 个动作。相同 id 替换后，旧按钮、进度和延迟关闭不会操作新任务。账号变化和停用会移除任务并通知取消；宿主下载等既有任务不受影响。

## 歌词动效

`lyricEffects.registerEffect(id, definition)` 同时服务播放页和桌面歌词，可指定 scopes、order、style、QML component 和同步 autoScroll。style 使用公开 `lyrics.line` 的字体、颜色、透明度、缩放和位移；宿主原绑定保持有效，撤销后立即恢复当前主题/状态。多个插件逐属性合成，较高 order 优先，同值按注册键稳定仲裁。

component 是包内 QML，作为歌词视口 foreground 装饰按可见性创建，注入 `plugin`、`page`、`part`。它可以查询 `lyrics.viewport`、`lyrics.line` 和 `lyrics.run`，通过 `lyricEffects.snapshot(part)` 取得类型化上下文。viewport 提供时间、偏移、当前行、跟随/浏览状态；line 提供行和逐字时间；run 额外提供 Qt 原生排版后的字形簇矩形和 UTF-16 范围。拼音和竖排使用其真实原生 run，不伪造字符几何。rect 是原生排版单元，inkRect 是真实字形墨迹范围，rtl 和 wordIndices 保留方向及跨词字形簇的时间归属。矩形在对应 run 的局部坐标中，run 的公开 geometry 提供窗口位置。连字/组合字符保留 Qt 可用的字形簇，不将一个字形强行分成多个字符。

完整歌词数据按需要读取 player.lyricSnapshot()；视口快照不在每一帧重复拷贝整首歌词。时间与词/glyph 的 startMs 对照时减去 snapshot.offsetMs；run 自带的 timelineMs 已位于原始逐字时间轴。快照只在持有公开引用时生成，字形几何随排版缓存，正常播放不重做 CPU 字体栅格化。

`autoScroll({host, request, snapshot})` 同步返回 true 表示接管这次滚动，否则宿主按原逻辑跟随。较高 order 先执行；已接管后不再调用较低优先级处理器。通过 host.invoke('scrollTo',{position}) 调整位置；resumeFollow 恢复默认跟随。页面手动浏览时不调用接管处理器，减少动态效果时 request.reducedMotion=true、smooth=false。桌面横排、拼音和竖排均使用实际跟随位置。停用会移除处理器、装饰组件、样式和呈现订阅，下一次跟随回到原生行为。
