# 宿主导航、设置、工具栏与封面

manifest 的 `requires.features` 可声明 `ui.navigation`、`settings.host`、`ui.actions`、`cover.themed`、`ui.cover`。导航、设置读写/订阅、全局封面回退分别需要 `navigation`、`hostSettings`、`cover` capability；首次调用请求用户授权，可在插件管理的授权入口撤销。授权绑定安装及包内容。普通工具栏贡献沿用已有 UI 注册协议。

## 页面导航

导航在激活提交后执行，通常由按钮或命令回调触发。

`ctx.ui.navigation.available()` 列出当前可用宿主页；`navigate({name, resourceId?, query?, replace?})` 返回导航后的状态。搜索传入 `query.q`，详情页传入 `resourceId`，query 只接受字符串。`home` 在调用时解析用户当前首页；`settings` 打开真实设置入口。

```ts
await awaitOperation(
  ctx.ui.navigation.navigate({
    name: 'search',
    query: { q: 'Echo', tab: 'song' },
  }),
);
await awaitOperation(ctx.ui.navigation.navigate({ name: 'album-detail', resourceId: '123' }));
await awaitOperation(ctx.ui.navigation.history('back'));
```

`read()` 读取当前路由及前进/后退状态，`observe(id, callback)` 返回可撤销订阅。`history` 支持 back/forward/refresh。导航仍经过宿主实际路由验证和页面服务；不接受组件 URL。原 `ctx.ui.navigate(id, query)` 继续打开本插件注册页面。

## 宿主偏好

`ctx.settings.catalog()` 返回可用域、字段类型、枚举与数值范围。`read(domain)` 读取当前值，`update(domain, patch)` 经整份参数校验后调用原设置所有者并返回实际保存值。支持 playback、shell、appearance、lyrics、mini、desktop 六域；缺失的浮窗域不会假成功。SDK 为每个域提供独立类型。

```ts
const prefs = await awaitOperation(ctx.settings.read('playback'));
await awaitOperation(ctx.settings.update('playback', { volumeFade: true, volumeFadeMs: 1500 }));
const watch = await awaitOperation(
  ctx.settings.observe('preferences', 'mini', (values) => {
    // 此值与应用设置界面、Mini 使用同一所有者。
    console.info(values.alwaysOnTop);
  }),
);
watch.dispose();
```

订阅在提交后发送当前快照，之后合并同一轮变化，仅在该域实际值变化时回调。撤权、账号变化及停用撤销订阅，取消尚未执行的写入。已完成的设置写入作为用户偏好持久保留。账号凭证、任意 QSettings 路径、协议接受状态和任意本地文件路径不属于此接口。背景资源仍使用主题/文件授权 API。

## 工具栏操作

`registerTitlebarActionDefinition(id, definition)` 与 `registerPlayerbarActionDefinition` 返回 `EchoPluginAction`。标题、图标、tooltip、默认位置、order、visible/disabled/active、badge/badgeTitle/badgeDefaultVisible、click/hover 触发和 Promise 回调均进入宿主实际模型。标题栏支持 toolbar/more，播放栏支持 left/center/right/more。

```ts
const action = ctx.ui.registerPlayerbarActionDefinition('open-themes', {
  title: '主题',
  icon: 'palette',
  tooltip: '打开主题中心',
  defaultPlacement: 'right',
  badge: () => (ctx.ui.state.count as number) || 0,
  badgeTitle: '新主题',
  disabled: () => !ctx.active,
  onClick: async () => {
    await awaitOperation(ctx.ui.navigation.navigate({ name: 'themes' }));
  },
});
action?.update({ tooltip: '查看主题', badge: 'NEW' });
```

状态函数在播放、外观、共享 ui.state 变化后合并刷新；其它插件数据变化时调用 `refresh()`。`update` 更新展示与回调，默认位置/order/徽标默认显示只在注册时设置；用户保存的位置、排序和徽标开关继续优先。Promise 运行期间自动忙态并拒绝重复触发；`cancel()` 取消本次交付，不宣称能终止任意 JavaScript Promise。回调中的宿主操作仍应按其接口取消。替换、账号变化、停用和呈现 scope 结束会取消调用并撤下动作，晚到 Promise 不恢复旧按钮。旧四参数注册方法共用相同异步执行路径。

## 全局封面

`ctx.cover.createThemedIconCoverUrl({icon?, color?})` 生成可交给共享 `EchoCover.source` 的 SVG data URL。icon 支持宿主图标名或 `{body, width?, height?}` SVG 图形；不传颜色使用当前主题强调色。不支持脚本、外部引用或 SVG 动画；非法图形返回空字符串。也可直接传图标名和颜色两个参数。

`ctx.ui.cover` 与 `ctx.cover` 是同一个门面；`setFallback(id, resolver, priority?)` 返回授权后的注册租约。resolver 同步返回 URL，返回空值表示让下一层处理。上下文包含原 URL、规范化 URL、失败 URL、empty/error 原因、scope、alt、量化尺寸和当前强调色。优先级高者优先，同级使用稳定贡献键；较高层图像解码失败会尝试下一层。无有效贡献时显示宿主当前占位。

```ts
const fallback = await awaitOperation(
  ctx.ui.cover.setFallback(
    'music',
    (context) => {
      if (context.scope === 'artist') return undefined;
      return ctx.cover.createThemedIconCoverUrl({ icon: 'music', color: context.accentColor });
    },
    10,
  ),
);
fallback.dispose();
```

实际列表、播放栏、歌词页和 Mini 共用同一封面加载/裁切/像素密度路径。真实来源优先；主题变化只重新计算需要回退的封面。插件数据变化可调用 `invalidate()`；隐藏和池化释放加载源及观察，恢复时重算。撤权、账号变化及停用撤下贡献并恢复下一层或当前宿主占位。新会话需要重新注册被撤销的观察与全局贡献，可监听 `ctx.sessionInvalidated` 安排新会话工作；旧句柄始终失效。
