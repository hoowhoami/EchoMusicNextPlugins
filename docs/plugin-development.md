# 开发插件

## 包与构建

独立克隆后执行README的check/test/build。可参考 `plugins/spectrum-visualizer` 的清单、入口与命令。

`manifest.json` 的 `id` 是插件唯一标识，例如 `spectrum-visualizer`。

manifest.entry指产物路径，plugin.config.json声明源码和静态资源：

```json
{ "entry": "src/entry.ts", "assets": ["qml", "assets", "LICENSE"] }
```

资源按原相对路径复制，不自动复制源码/依赖/账号数据/仓库文件。禁止链接、路径越界和资源覆盖entry/manifest/构建标记。纯JS依赖可bundle，其许可证由作者随包保留；原生QML plugin声明拒绝，DSP产品SDK仍待接入。

索引新增插件相对源目录，元数据仅在manifest维护。npm run build生成目录包和dist索引，dist目录git忽略，不手改生成入口。发布GitHub源前执行npm run prepare:source和check:published，把源目录中的生成entry.mjs、manifest和所有QML/assets纳入提交；仅本地build不会让远端索引可安装。

## 类型和Qt环境

SDK开发包为@echomusicnext/plugin-sdk，实际运行时模块为echo:plugin-sdk，构建保持external；不把宿主实现bundle进插件。独立作者项目安装SDK/tools开发包，tsconfig使用ES2016、ESNext/Bundler、lib仅ES2016及types为SDK。

工具先strict类型检查再转换为ES2016 ESM，支持async源码，但语法转换不补浏览器/Node/新版标准库。没有DOM/fetch/process；网络用ctx.io，UI用Qt Quick。依据：[esbuild target](https://esbuild.github.io/api/#target)、[TypeScript lib](https://www.typescriptlang.org/tsconfig/lib.html)、[Qt JS环境](https://doc.qt.io/qt-6/qtqml-javascript-hostenvironment.html)。

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
