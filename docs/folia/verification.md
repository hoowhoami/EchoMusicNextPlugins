# Folia 任务验证记录

日期：2026-10-22。以下记录区分开发前基线、环境检查与本次功能验收。

## 仓库基线

三个既有仓库最初均为 `main`、工作树干净、无未跟踪文件，默认远端分支为 `origin/main`。未发现贡献指南或 PR 模板。EchoMusicNextPlugins 已新建 `codex/folia-lyrics-skin`；EchoMusicNext 与 EchoMusic 没有切换分支或修改受版本控制文件。

Folia 从用户指定的 `https://github.com/chthollyphile/folia-major.git` 浅克隆至同级 `folia-major`，固定 `a8da4437cf19723555bd75e4685ca20815fe5b82`。初始调查没有安装依赖；后续源组件运行按锁文件安装 npm 依赖，始终未改动其受版本控制文件。

## 开发前命令结果

插件命令使用本机已存在的 Node.js `24.15.0`，遵守 `>=24 <25`，不使用 shell 默认的 Node.js 22。

| 命令                                                                              | 工作目录             | 结果与边界                                                                 |
| --------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------- |
| `npm ci --ignore-scripts`                                                         | EchoMusicNextPlugins | 通过，按锁文件安装；没有更新应用依赖或 lockfile                            |
| `npm run check`                                                                   | EchoMusicNextPlugins | 通过；1 个既有 manifest、保存的 SDK 快照、tsc 和格式检查；未调用实际宿主   |
| `npm test`                                                                        | EchoMusicNextPlugins | 通过，12 项测试；没有 Folia 原生或视觉覆盖                                 |
| `npm run build`                                                                   | EchoMusicNextPlugins | 通过，仅生成既有 `dist/spectrum-visualizer-1.0.0.echomod`；不是 Folia 产物 |
| `python3 scripts/install-qt.py --check`                                           | EchoMusicNext        | 失败，默认 Python 低于 3.12；随后改用已有 `/opt/homebrew/bin/python3.12`   |
| `/opt/homebrew/bin/python3.12 scripts/install-qt.py --check`（安装前）            | EchoMusicNext        | 失败，指定 Qt 6.12 SDK 缺失                                                |
| `/opt/homebrew/bin/python3.12 scripts/install-qt.py`                              | EchoMusicNext        | 通过；使用仓库锁定安装器，SDK 位于 `build/qt-official/6.12.0/macos`        |
| `/opt/homebrew/bin/python3.12 scripts/install-qt.py --check`（安装后）            | EchoMusicNext        | 通过，SDK 模块完整、qmake 版本为 6.12.0                                    |
| `/opt/homebrew/bin/python3.12 scripts/build.py --preset release --configure-only` | EchoMusicNext        | 失败，`cmake/Rust.cmake:1` 找不到 `CARGO_EXECUTABLE`；尚无实际宿主二进制   |
| `gh auth status`                                                                  | EchoMusicNextPlugins | 未登录任何 GitHub host；尚不能推送/创建贡献 PR                             |

SDK 安装前磁盘可用约 24 GiB，安装后约 21 GiB；宿主 `build/` 约 2.4 GiB，包含后续可复用 SDK 和安装材料。没有创建第二套完整应用构建树，没有清理用户数据、SDK 或其他项目。

## 当前实现与原生验证（同日后续）

用户已明确授权安装 Cargo，并要求中断任务登记后跳过。Rust/Cargo 1.99.0（含 rustfmt/clippy）已安装并验证，原有 1.87/1.89 工具链保留。自己的 `scripts/build.py --preset release --jobs 4` 构建 Rust 阶段完成，Qt 阶段发现其他构建同时写相同目录，只停止本任务 Ninja，命令退出 130。未停止他人构建；随后复用该唯一构建树实际产出的程序和库。

实际宿主：`EchoMusicNext/build/release/app/echomusicnext.app/Contents/MacOS/echomusicnext`；会话报告 0.1.0 / Release / arm64 / Qt 6.12.0，build `20261022T093906Z-432e63230d0f-dirty`。宿主当前 `cmake/Rust.cmake`、`tests/tooling/test_rust_cmake.py` 属于他人工作，未修改、覆盖或提交。旧 EchoMusic 与参考 Folia 保持只读。

| 检查                                                                                                | 当前结果及边界                                                                                                   |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--export-plugin-sdk`、`npm run sdk:sync -- --host <实际宿主>`                                      | 通过；快照来自可执行文件，补齐唯一作者声明后同步，没有头文件伪造契约                                             |
| `npm run test:host -- --host <实际宿主> --runtime-test <Release/tests/qt/echo-plugin-runtime-test>` | 通过；现有正式源的 spectrum 包真实加载、PCM/设置/挂载验收，原生用例 3 passed。此命令不自动覆盖未入正式源的 Folia |
| `echo-plugin build plugins/folia-lyrics-skin --out dist`                                            | 通过，产出 `dist/folia-lyrics-skin-1.0.0.echomod`；开发包不等于正式发布                                          |
| 实际宿主 `--smoke-test --plugin-dir <Folia包>`                                                      | 首次因 Qt sequence 字体列表校验失败；加入 JSON 边界规范化后通过，临时存储正常退出                                |
| `npm run test:folia:qml -- --qt-bin <Qt SDK/bin>`                                                   | 20 passed；三行、译文、长句重排、缩放几何、隐藏几何、字体复制、原生序列及显隐计时。包含先失败再修复的用例        |
| `qmllint -I <Release/qml> -I <Qt SDK/qml> <Folia QML>`                                              | 通过；使用真实模块/qmltypes，未绕过类型错误                                                                      |
| `scripts/test-folia-host.py --host-build <Release> --qt-bin <Qt SDK/bin> --package <Folia包>`       | offscreen 3 passed；读取现有编译/Ninja元数据，独立链接真实宿主库，不改宿主构建树                                 |
| 同上增加 `--platform cocoa`                                                                         | Cocoa/Metal 3 passed；原生 backend=6（Metal），与 offscreen 分开记录                                             |

Folia 专项原生用例覆盖：安装实际工具产物、只出现一个 Folia 候选且不自动选中、正式 PlaybackPage 与换肤抽屉、独立设置保存和 reload 恢复、拒绝未实现 mode、完整歌词字体链、关闭后代理失效、重新打开、停用回退 cover、卸载。实际本地 PCM 经生产解码/输出，宿主位置驱动三行切换；通过真实共享按钮暂停/恢复，页面命令 seek 到 5 秒，没有手动注入播放位置。测试 PCM/歌词为本仓库创作的夹具，未声称商业歌曲或外部歌词来源已验收。

初期音频夹具曾有一次加载超时，增加错误状态输出后未再次复现；后续 offscreen 与 Cocoa 分跑通过，冷启动可靠性仍保留复核项。暂停的 playing 标记表示命令接受，最后一块音频位置可随后到达；用例在原生确认稳定后检查暂停位置不再推进。另修复了父级隐藏触发译文有效 visible 变化而改变行高的问题，正常销毁不再产生该绑定告警。offscreen 的 Sans Serif 别名提示来自测试环境默认字体，不是页面 QML 失败。

日志/截图保存在 `build/folia-native/<platform>/`；`still-native-playback.png` 为 1100×820，`still-native-narrow.png` 为 620×820。Metal 截图确认暗角和共享浮动材质可绘制；它们是实际插件输出。随后已运行上游 Still 源组件作字号/行盒/缩放对照，见 still-reference.md，尚不代表完整页面或像素一致性。`assets/previews/still.png` 是实际 Still 组件的独立预览夹具。

本轮再次运行 `npm run format:write`、`npm run check`、`npm test`、`npm run build` 均通过：Node 测试 17 项；正式源构建仍仅输出 spectrum，Folia 通过单包命令独立生成。真实 `npm run sdk:check -- --host <实际宿主>` 通过。`qsb` 编译暗角 shader 和 Cocoa 生成组件预览均成功。测试原有 Menlo 硬依赖已改为选择实际安装且不同于应用字体的字体。后续只读复审发现静止鼠标相同位置重入不会恢复的边界；原生回归先失败，再独立处理 hovered=true 恢复。

当前实际包大小 181261 字节，SHA-256：`fa61fe4322aeb70078f730b609e297b7e6fb48cc958ada9cb0b924c6ad211ff2`。工具 `echo-plugin validate` 通过；Metal 与 offscreen 日志分别落在对应平台目录。

## 未完成与跳过项

- 已实现开发用 Still 和单一 Folia 页面基础；其余 13 种样式未实现，classic 仅有逐字时序内核，未登记占位模式。上游默认 classic 的最终行为尚未接入，开发默认暂为 Still。
- 六种共享背景、完整播放胶囊的展开/折叠、拖动和自定义槽位、共享字幕与全部面板交互仍待移植；控件显隐已接入，当前使用宿主正式共享控件和命令。
- 缺失的内部约束仍未核对；LyricTimeline 模型类型、文件资产导入和鼓点/人声分析缺口分别保留，不能用私有 QObject、裸文件或 FFT 峰值代替。
- 上游 Still 源组件已运行，字号/行盒/缩放完成一组夹具对照；完整 App、其余样式的同条件连续动画、逐字/音译/重叠/间奏和迟到结果专项仍未验收。
- 深浅色、透明/材质、减少动效、DPI/缩放尚无完整矩阵；已有 Metal 与 offscreen 页面截图不能推广为全矩阵通过。
- CPU/墙钟、RSS/physical footprint/峰值、帧/GPU、反复操作资源增长、隐藏/最小化后台占用尚无合格对照，不作低占用承诺。
- Windows/Linux 及其他 macOS 架构未实机验证。
- 正式 source/artifacts 索引保持原状，未发布 Folia。origin 推送曾返回 403；通过现有 Git 认证确认 huanggenji 的有效 fork 后，成功推送并创建 Draft PR #1：https://github.com/hoowhoami/EchoMusicNextPlugins/pull/1。GitHub CLI 登录状态没有改动，未在日志或文件保存认证秘密。

本轮 Native 独立测试目录约 49 MiB；宿主共享 Release 树约 5.7 GiB、Rust target 约 3.1 GiB，剩余磁盘约 14 GiB。后续参考运行按 Folia lockfile 安装了 npm 依赖（ignore-scripts，约 886 MiB），未下载 Electron 桌面二进制；使用其已有 Vite 探针，本机参考仓库受版本控制文件仍干净。参考运行后已关闭本任务创建的浏览器页及 3001 服务，未触碰其他项目的 3000 服务。没有创建另一套完整宿主产物，也没有清理用户数据或唯一证据。

共享呈现模块 PresentationClock.qml 复用宿主公开 LyricClock。专项原生用例先因模块缺失失败，再验证实际音频期间呈现信号显著多于引擎 positionChanged（本次 Metal 为 204 次呈现 / 10 次引擎观测）；音量元数据变更不回退呈现位置，暂停后冻结，暂停 seek 到 5 秒，播放中分别 seek 到 8 秒和 1 秒，并在公开 seek 事件交付时检查投影已复位。宿主在同一原生 seeked 分支依次发出 timelineReset 和 seekCompleted，后者已被公开适配器转发，无须另加 Folia 特例 API。该模块供后续动态样式使用，当前 Still 正式页面无需持续帧动画，不提前实例化它。

隐藏窗口验收最初因测试继续访问已销毁的 QPointer 触发崩溃；调用栈指向测试的 QObject::property。真实宿主会卸载整个皮肤 scope，测试现按契约断言页面/时钟销毁、订阅不再回调、音频继续播放，恢复后重新获取新页面和时钟并同步当前播放位置。修正后 Metal 验收 3 passed；这不等于动态样式或后台占用性能已经验收。

共享控件显隐另有真实输入验收：始终隐藏会卸载共享控件；自动模式按住鼠标时停止计时，松开后空闲隐藏，静止指针下不自动弹回，滚轮/移动或同坐标重新进入恢复。Qt 的 pointChanged 包含场景重算，初版误把它当鼠标活动；记录实际位置并单独处理重入后修复。原生测试也开启动效检查 260 ms 淡出中实例保留且禁止输入、中途恢复沿用同一实例、完整退场销毁，并检查显隐模式经 reload 持久化。真正窗口失焦、触控及完整胶囊拖动仍未做平台专项验收。
