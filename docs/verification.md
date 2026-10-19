> 本页保留历史验证时的名称、版本和路径；当前插件 API 与发布目录以 [SDK](sdk.md)、[插件包与依赖](plugin-packages.md) 和实际宿主导出契约为准。

# 插件仓库验证（2026-10-13）

当前版本与术语已按用户2026-10-18纠正：未公开阶段SDK/tools和官方插件统一初始1.0.0，不随开发增量升号；产品统一称插件，.echomod是安装包格式。下方1.1.0/1.2.0为先前实际验收的历史记录，最新结果见文末及宿主docs/verification/2026-10-18-plugin-version-naming.md。

纠正后的复测：实际新宿主导出SDK1.0.0并同步快照，check/8项工具测试/build/prepare:source/check:published全部通过；真实正式应用加载两个1.0.0.echomod并完成Qt命令验收3/3，宿主完整插件回归32/32、Cocoa管理页面4/4。日志build/echomod/version-*.log，未发布。版本字段继续用于依赖匹配，功能没有随版本回退而删除。

从干净的README/MIT仓库建立独立SDK/tools、音量插件及索引；宿主拥有原生实现，完整65项和三端验收未标完成。

环境：macOS27.0.1 Apple Silicon、Node24.14.1/npm11.11.0、官方Qt6.12.0、宿主Debug。SDK快照来自真实宿主--export-plugin-sdk，导出不初始化业务服务/插件。

## 最终检查

| 检查                                                 | 结果                                                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install/ci --ignore-scripts`及固定lock          | 依赖安装通过，开发依赖不进入插件产物。                                                                                                                    |
| `npm run check`                                      | 通过：索引/manifest、Qt快照绑定、strict类型正负例和Prettier。                                                                                             |
| `npm test`                                           | 6/6通过：元对象绑定漂移、版本/必需能力、真实TypeScript构建/失败保留、语法/入口/原生QML拒绝、链接及资源包含产物的递归防护。                                |
| `npm run build`                                      | 通过：独立目录包和只含路径的dist索引。                                                                                                                    |
| `npm run sdk:check -- --host ...`                    | 通过：实际Qt属性/readonly、方法/信号及枚举一致，快照由真实宿主生成。                                                                                      |
| `npm run test:host -- --host ... --runtime-test ...` | 通过：正式应用实录音量插件activate/deactivate；QtTest实际命令验收3通过（含init/cleanup），检查不自动改音量、选择/存储/恢复/非法值、播放栏调用及停用移除。 |
| SDK/tools `npm pack`后在独立目录安装                 | 通过：安装后的工具源码与本仓库一致，独立构建音量插件及比对真实宿主契约；不依赖workspace的兄弟路径。                                                       |
| 宿主原生构建、插件/QML CTest和all_qmllint            | 构建通过，专项3/3通过，qmllint通过。宿主格式write/check通过。                                                                                             |
| 两仓库`git diff --check`和旧基线                     | 通过；旧EchoMusic仍` m server`，旧EchoMusicPlugins干净。                                                                                                  |

首轮实际元类型检查发现State类型名带类限定；按实际导出修正归类顺序，再同步真实快照。新增资源递归检查首轮测试发现macOS临时目录的/var真实路径别名，统一realpath后6项通过。这些失败轮次未算通过。

当前esbuild async辅助函数在Qt产生usedbeforedeclared诊断（闭包引用后声明的step）；实际异步命令执行和停用通过，未修改生成代码或压制诊断。qmllint仍有原有unused import提示。宿主上轮全量回归18/19，独立Controls析构断言不属于本次插件仓库变更，本轮不宣称全量通过。

日志位于本仓库build/tooling-tests.log、host-acceptance.log、npm-smoke及宿主build/plugin-ecosystem-{build,ctest,qmllint,format-check}.log。CI覆盖Linux/macOS/Windows工具检查，尚未在线运行，不算三端原生验收；真实UI/音频设备、市场/ZIP/完整插件等价及DSP仍未完成。未发布npm/GitHub Release/插件源。

## 同日插件管理增量

SDK/tools minor升1.1.0，真实Qt增加ui.settings/settingsComponent/registerSettings；音量插件1.1.0新增最终设置QML。prepare:source和check:published生成并验证可从GitHub源码目录安装的ES2016入口，CI检查同一产物。运行验收使用实际宿主和QtTest；新宿主管理页、源/ZIP/更新回滚、分享解析与限制详见[宿主检查](https://github.com/hoowhoami/EchoMusicNext/blob/main/docs/verification/2026-10-13-plugin-management.md)。远端官方索引本次404，未推送/发布，不能把本地build称为在线成功；三端UI和完整65项仍未完成。

## .echomod 与依赖增量（2026-10-18）

SDK/tools升1.2.0，正式包根manifest声明format=echomod；源schema2记录path/artifact/sha256。新增必需/可选依赖、冲突/加载顺序，以及ctx.mods版本化服务。官方audio-core提供真实播放器音量服务，音量预设1.2.0通过该必需依赖调用；原生DSP及完整65项仍保留宿主边界和待办。

- `npm run check`通过：真实Qt导出绑定、严格类型正负例、manifest/依赖闭包和格式。
- `npm test`为8/8：增加确定性正式包、损坏/CRC/路径验证及依赖缺失/版本/循环/冲突检查。
- build、prepare:source、check:published通过；mods/*.echomod与索引哈希由实际构建生成，复建逐字节相同。
- 新宿主--export-plugin-sdk导出SDK1.2.0、EchoPluginMods及packageFormat=echomod，sdk:sync/check通过；声明不是手造快照。
- 最终实际正式应用通过两个.echomod启动加载，真实Qt播放器/命令/存储/恢复/非法值/停用验收3/3；日志build/echomod/host-final.log。宿主完整插件32/32、单实例11/11均通过且无跳过。
- SDK/tools实际npm pack后在隔离目录安装，安装后的独立工具可构建audio-core正式包，并检查真实宿主契约；没有依赖workspace的兄弟源码路径。日志build/echomod/pack-*.log。

最新工具日志在build/echomod/{check-final,tests-final,published-final}.log，完整宿主生命周期/UI及平台边界见宿主docs/verification/2026-10-18-echomod.md。当前远端官方echo-plugins.json实际HTTP404，未自动提交/推送/发布；本地生成的两个正式包不算在线已发布。CI三平台与Windows/Linux文件关联尚未实际验收。

## 2026-10-18 正式频谱替换示例

当前官方源仅分发spectrum-visualizer 1.0.0；删除先前音量/依赖演示及其公开产物，依赖与服务能力仍由宿主和工具测试覆盖。SDK/tools仍1.0.0、宿主0.1.0。

真实宿主导出同步audio.spectrum/ui.state/ui.surfaces与三个原生Qt类型；作者10项、类型负例、SDK契约、全仓格式、构建、prepare:source/check:published通过。正式应用test:host和原生Cocoa生产PlayerBar/Mini/PluginSettingsDialog通过，真实1kHz PCM经48kHz输出/8192FFT的峰值1015.1Hz，支持波形、暂停恢复与完整清理；宿主完整插件运行时33项通过。20组五模式/深浅/100%/125%主窗+Mini截图及4组设置截图在宿主build/spectrum-visuals，详细边界见宿主docs/verification/2026-10-18-spectrum-plugin.md。

HDR沿用原插件graphics.hdr缺失时禁用；未发布远端、未声明三平台全部验收。历史章节的旧示例/阶段号仅记录当时状态，当前以本节与实际manifest为准。

## 设置界面修正与功能ID

用户最终要求插件ID只取功能名，频谱为spectrum-visualizer，无应用/发布者前缀；同版本重新生成包与索引，删除长ID公开产物。设置行按原版相邻可见行的顶部边界绘制分隔线，取消首行与组底额外横线；整页滚动由宿主PluginSettingsDialog的Flickable及共享滚动条负责。旧长ID版本先卸载再安装短ID版本。

本机Cocoa生产设置弹窗真实wheel回归通过：深浅色100%/125%都能到达恢复默认按钮，分组不再有额外底线，视口随关闭销毁。宿主截图位于build/plugin-settings-visuals，验证日志为build/plugin-settings-native.log；作者检查/10项测试和源发布检查通过。滚动修复属于宿主，需要运行本轮新构建。

## 2026-10-19 频谱CPU优化

原生Release采样确认Canvas.Image软件光晕/栅格为热点。官方包改用Qt Quick Shapes CurveRenderer，原路径数学/配色/参数保留，光晕/雾化/边缘遮罩在GPU合成；CSS rgba画刷先转换Qt颜色，保留原透明度。普通模式随帧绘制，中心暂停衰减至不可见后停掉时钟。SDK、插件ID和1.0.0版本不变，同来源同ID覆盖安装保留私有设置。

作者11项、SDK/类型/格式/构建及正式源哈希检查通过；宿主Release Cocoa生产三个挂载、五模式深浅色/100%/125%、实际CurveRenderer类型/无Canvas实例、暂停时钟/恢复与设置滚动/完整销毁回归通过。CPU按同一真实PCM、窗口/三个位置、64频带/1024FFT、15/30FPS测进程累计CPU/墙钟；结果和原始日志见宿主docs/verification/2026-10-19-spectrum-cpu.md。不声称已跑Electron原版同负载对照或Windows/Linux验收，不推送远端。
