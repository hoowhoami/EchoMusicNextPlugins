# 插件协作

在 manifest 的 `dependencies` 或 `optionalDependencies` 声明提供者和版本范围。`ctx.plugins.snapshot` 只包含自身及已声明依赖的公开服务/命令；不会提供其他插件的设置、文件路径或 Qt 对象。

```json
{
  "optionalDependencies": { "audio-library": ">=1.0.0" },
  "requires": { "features": ["plugins.catalog", "plugins.commands"] }
}
```

依赖项即使暂不可用也保留目录条目：`available`、`required`、`range` 标明状态。可用条目包含 `id/name/version/generation`、服务的 `id/version/revision/methods` 和命令的 `id/version/revision/title/description`。目录按 ID 排序，方法按名称排序。

```ts
const subscription = ctx.plugins.onChanged('library-directory', (snapshot) => {
  const library = snapshot.dependencies.find((item) => item.id === 'audio-library');
  if (library?.available) {
    // 使用 library.services / library.commands 更新插件自己的界面。
  }
});
```

`onChanged` 默认立即投递一次当前目录，后续合并同一事件循环的变化，内容相同不重复通知。传入 `false` 只观察后续变化。同 ID 订阅替换旧句柄；不再需要时 `subscription?.dispose()`。呈现作用域随窗口/组件退出回收，主作用域随插件停用回收。

## 提供公开命令

```ts
import { awaitOperation } from 'echo:plugin-sdk';

ctx.plugins.registerCommand(
  'set-volume',
  '1.0.0',
  async (args) => {
    const percent = Number(args.percent);
    await awaitOperation(ctx.player.setVolume(percent));
    return { percent: ctx.player.volume };
  },
  { title: '设置音量' },
);
```

公开命令只由主作用域注册，版本属于该命令自身。最多128个有效命令，title最多128字符、description最多2048字符。同 ID 替换使旧句柄与其等待调用失效；再次处置旧句柄不会移除新命令。

`ctx.registerCommand` / `ctx.executeCommand` 继续是插件内部命令；不会自动出现在公开目录，也不能被另一个插件调用。

## 调用依赖命令

```ts
const result = await awaitOperation(
  ctx.plugins.callCommand<{ percent: number }>('audio-library', 'set-volume', '>=1.0.0', {
    percent: 50,
  }),
);
```

自身也可通过相同接口调用本插件的公开命令。跨插件调用使用插件 ID、命令 ID和明确版本范围，不依赖全局名称冲突顺序。参数与结果限有界 JSON；不能传 Qt 对象、native pointer 或非有限数字。返回可取消的 `EchoPluginOperation`，支持同步结果和 Promise，30秒截止时间。

调用者取消、任一方换账号/停用、提供者命令被替换或注销，都取消旧等待；旧结果不会投递给新会话。提供者不可用、未声明依赖、版本不匹配或私有命令均明确拒绝。

已有 `registerService` / `call` / `pluginService` 继续使用同一取消与数据边界。服务注册、替换和注销也会更新目录；服务可以带独立 UI，关闭该 UI 不注销主作用域的服务或公开命令。
