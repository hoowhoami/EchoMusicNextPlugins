# @echomusicnext/plugin-sdk

Qt插件作者类型包，不提供npm JavaScript运行时。加入开发依赖及TypeScript compilerOptions.types，从宿主模块导入操作适配器/类型：

```ts
import { awaitOperation } from 'echo:plugin-sdk';
import type { EchoPluginContext } from 'echo:plugin-sdk';

export async function activate(ctx: EchoPluginContext): Promise<void> {
  await awaitOperation(ctx.io.writeValue('enabled', true));
}
```

先经工具转换为ES2016再加载，不能把async源码直接交给Qt。包内含manifest JSON Schema、实际Qt元对象契约快照和Qt console类型，默认不加载DOM/Node类型。版本1.0.0，目标宿主0.1.0 / Qt6.12.0，具体范围见根docs/sdk.md。

独立窗口、TCP 和本地 HTTP/WebSocket 服务的声明、授权、消息处理与生命周期见 [窗口与网络服务](../../docs/windows-network.md)。

发布类型 `PluginSourceEntry` / `PluginSourceIndex` 描述稳定收录定位；`PublishedPluginManifest` 包含作者 manifest 的 `distribution`，由发布工具从实际 `.echomod` 生成。包内 `PluginManifest` 不含发布字段，详见[发布指南](../../docs/plugin-packages.md)。

模型内容支持相对定位、原生条目呈现操作、共享歌曲列、有界上下文/provider、失败保旧及混合事务。完整用法与预检、检查器见[公开区域与样式](../../docs/ui-parts.md#模型内容贡献)；类型以本包为准，实际宿主契约由 sdk-sync 导出校验。
