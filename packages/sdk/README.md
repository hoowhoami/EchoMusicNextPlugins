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
