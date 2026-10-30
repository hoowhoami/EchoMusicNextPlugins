# 开发插件

## 包与构建

独立克隆后执行README的check/test/build。可参考 `plugins/spectrum-visualizer` 的清单、入口与命令。

`manifest.json` 的 `id` 是插件唯一标识，例如 `spectrum-visualizer`。

manifest.entry指产物路径，plugin.config.json声明源码和静态资源：

```json
{ "entry": "src/entry.ts", "assets": ["qml", "assets", "LICENSE"] }
```

资源按原相对路径复制，不自动复制源码/依赖/账号数据/仓库文件。禁止链接、路径越界和资源覆盖entry/manifest/构建标记。纯JS依赖可bundle，其许可证由作者随包保留；原生QML plugin声明拒绝，DSP产品SDK仍待接入。

跨仓库收录使用 schema2：`id` 为预期插件 ID，`repo` 为作者 GitHub 仓库（省略为当前源），`ref` 默认为 HEAD，`path` 为 manifest 目录（空字符串表示根），`artifact` 为仓库根的相对 .echomod 路径或 HTTPS 下载地址，`sha256` 绑定包字节。名称、描述、版本和能力来自 manifest；下载后同时核对哈希与完整清单。官方收录源与作者仓库分别记录，仓库按钮打开作者地址。

作者构建后运行 `echo-plugin index-entry dist/plugin-1.0.0.echomod --repo https://github.com/author/plugin --ref v1.0.0 --path "" --artifact https://github.com/author/plugin/releases/download/v1.0.0/plugin-1.0.0.echomod` 生成条目，提交到官方源的 plugins 数组即可。命令不上传或发布。

本地构建清单在 `echo-plugin.build.json`，与公开索引分开。`build-index` 构建其中明确列出的本地插件；`prepare-index` 更新同仓插件的 artifacts 与索引，保留第三方条目；`check-index` 不读取第三方本地源码；`check-published` 联网校验每条作者清单和实际包。频谱仍在本仓库维护，第三方可独立维护仓库。生成入口只需放在 .echomod 内。

## 类型和Qt环境

SDK开发包为@echomusicnext/plugin-sdk，实际运行时模块为echo:plugin-sdk，构建保持external；不把宿主实现bundle进插件。独立作者项目安装SDK/tools开发包，tsconfig使用ES2016、ESNext/Bundler、lib仅ES2016及types为SDK。

工具先strict类型检查再转换为ES2016 ESM，支持async源码，但语法转换不补浏览器/Node/新版标准库。没有DOM/fetch/process；网络用ctx.net.request，UI用Qt Quick。依据：[esbuild target](https://esbuild.github.io/api/#target)、[TypeScript lib](https://www.typescriptlang.org/tsconfig/lib.html)、[Qt JS环境](https://doc.qt.io/qt-6/qtqml-javascript-hostenvironment.html)。

设置组件通过SDK1.0.0的ctx.ui.registerSettings注册，required plugin使用EchoPluginContext；官方频谱Settings.qml通过settings.patch命令写入安装私有SQLite并发布ui.state；三处Layer.qml共享同一状态。QML页面通过ctx.ui.registerPage注册，声明required plugin/context属性或使用EchoPluginPage。完整播放页使用[皮肤入口与独立配置](appearance.md)。编辑器QML import path指当前宿主的 `build/<preset>/qml` 及 Qt SDK 的 `qml` 目录（含PluginSdk及Shell依赖），Qt模块/qmltypes由宿主提供。页面使用scoped SDK，不访问裸router/settings/应用数据库。

## 生命周期与能力

manifest只声明真实必需能力，范围见[SDK](sdk.md)。工具按SDK快照预检，宿主按真实能力复检；未提供的required功能不执行。版本范围为三段比较器交集，拒绝npm ^/~；作者路径/元数据规则比宿主更严格，安装由宿主最终校验。

activate/deactivate支持Promise，注册先暂存再提交，失败/超时回收。模块顶层仅常量/函数，可写状态和ctx归activate作用域。停用先失效scope、移除注册、取消操作，再清理并排空worker；旧回调不得污染新会话。

awaitOperation错误有code。HTTP需unrestrictedNetwork，不提供宿主cookie/凭证/应用DB；生命周期5秒期限不能抢占GUI死循环。仅安装可信代码。

## 实际验收

```sh
npm run sdk:check -- --host /absolute/echomusicnext
npm run test:host -- --host /absolute/echomusicnext --runtime-test /absolute/echo-plugin-runtime-test
```

test:host重建包、比对真实契约，隔离smoke加载并排空；runtime-test进一步调用工具产出的频谱插件命令，检查真实PCM/SQLite/挂载与动作回收，不用Node mock代替Qt。本机offscreen不代表Windows/Linux、真实音频设备或完整UI视觉验收。

正式开发用--plugin-dir加载构建目录，runtime.reload可先停旧scope再采集新代码；管理页提供安装、启停、更新、卸载、依赖状态和设置；手动安全模式阻止执行但保留偏好。

宿主页面导航、六域偏好、动态工具栏操作和全局封面回退参见[宿主扩展](host-access.md)。

独立作者可用 `echo-plugin test-host dist/plugin-1.0.0.echomod --host /absolute/echomusicnext` 验证实际包，不需要官方源的本地构建清单。SDK 导出 `PluginSourceEntry` 和 `PluginSourceIndex` 索引类型。

备份由宿主按存储归属自动收集：插件 KV、全部命名 SQLite 和持久私有文件均使用同一快照链路，无需提供备份文件名名单；缓存与外部授权目录不自动进入归档。provider 继续负责归档的 save/list/load/remove，使用宿主生成的归档字节；恢复确认、取消及停用回收仍由宿主处理。
