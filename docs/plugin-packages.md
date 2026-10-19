# .echomod 插件与依赖

SDK/tools1.0.0正式生成`.echomod`文件；普通开发目录仍用于编辑器和独立调试，不以普通ZIP作为正式分发入口。包为根manifest/ES2016入口/QML/资产/许可组成的确定性ZIP，manifest必须声明`format: "echomod"`。

插件是唯一扩展单元，产品界面、类型化SDK与开发工具统一使用插件 / Plugin 命名。`.echomod` 是插件安装包格式；`ctx.plugins` / `pluginService` 提供插件间依赖查询与服务协作，使用同一运行时和生命周期。SDK、工具与官方插件保持1.0.0，版本字段用于兼容性与依赖匹配。

## 统一命名

| 层级         | 名称与职责                                                                               |
| ------------ | ---------------------------------------------------------------------------------------- |
| 产品扩展     | 插件 / Plugin，管理、安装、依赖与启停使用同一套模型                                      |
| 分发文件     | `.echomod` 插件包，manifest 的 `format` 为 `echomod`                                     |
| 作者接口     | `EchoMusic.PluginSdk` / `echo:plugin-sdk`，依赖协作使用 `ctx.plugins` 与 `pluginService` |
| 编辑源码     | `plugins/<pluginId>/`                                                                    |
| 官方发布包   | `artifacts/<pluginId>-<version>.echomod`，由索引的 `artifact` 指向                       |
| 临时构建输出 | `dist/`，不作为第二类扩展或安装状态                                                      |

原生 DSP 使用独立音频 ABI 与生命周期，其音频处理职责与上述插件管理分开。

```sh
npm ci
npm run sdk:check -- --host /absolute/path/to/echomusicnext
npx echo-plugin build plugins/spectrum-visualizer --out dist
npx echo-plugin validate dist/spectrum-visualizer-1.0.0.echomod
npm run prepare:source
npm run check:published
```

build-index同时提供开发目录和正式包；prepare:source发布源入口与artifacts/*.echomod，并生成schema2索引的path/artifact/sha256。check:published重新生成并逐字节核对入口、正式包与索引哈希。提交真实产物后远端才可安装；工具不自动push或发布。SHA-256只保证与读取索引一致，不能代替签名。

manifest支持dependencies/optionalDependencies/conflicts（ID到版本范围）及loadAfter/loadBefore（ID数组）。范围使用`>=1.0.0 <2.0.0`等比较交集；拒绝自依赖和矛盾声明。完整源索引构建验证依赖闭包、版本、冲突与循环；单独build允许声明由其它可信来源提供的依赖，最终由宿主基于实际安装集合检查。

依赖安装并启用、成功activate及提交贡献后，消费者才执行；可选依赖不存在时自行降级。缺失时宿主保留安装和启用偏好、明确显示“依赖未就绪”，补齐后自动协调。不静默下载另一来源、强制启用用户关闭的插件或取消版本要求。停用/卸载/更新先排空消费者，更新失败恢复代码/私有数据，消费者随提供者恢复。

依赖提供者也是普通 `.echomod` 插件包，可仅提供服务、不注册页面或设置。它有自己的 manifest、版本、activate/deactivate、安装记录和私有存储；不需要嵌入消费者包，也不需要另做原生 Qt 动态库。消费者在 manifest 声明提供者的 ID 和版本范围，双方安装在同一宿主中后由依赖图协调。提供者也可同时注册页面、设置或播放栏贡献；同一安装只激活一次，不按消费者重复注册UI。界面实例与服务租约分别受其原有生命周期管理，关闭设置/离开页面不会停用提供者；显式停用或卸载提供者才触发消费者先排空。

提供服务：

```ts
ctx.plugins.registerService('volume', '1.0.0', {
  set: async (args) => {
    if (typeof args.percent !== 'number') throw new Error('percent必须是数值');
    await awaitOperation(ctx.player.setVolume(args.percent));
    return { percent: ctx.player.volume };
  },
});
```

调用服务：

```ts
const volume = pluginService<{
  set: { arguments: { percent: number }; result: { percent: number } };
}>(ctx, 'audio-library', 'volume', '>=1.0.0 <2.0.0');
await volume.call('set', { percent: 50 });
```

消费者必须声明对应依赖；服务租约由提供者scope管理，只交换有界JSON，不返回提供者QObject。Promise调用30秒截止，任一方停用/账号切换或取消时失效；`ctx.plugins.availabilityChanged`通知可用性变化。QML直接调用同一typed ctx.plugins facade。

上述代码展示可选的插件间服务契约，官方源不再分发依赖演示插件；依赖图和服务隔离由宿主集成测试覆盖。正式频谱插件直接消费播放器频谱，无附加插件依赖。完整EchoMusic扩展能力按宿主迁移清单推进，本轮不声称任意修改全部宿主界面或所有65项已落地。
