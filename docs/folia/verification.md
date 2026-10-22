# Folia 任务验证记录

日期：2026-10-22。以下记录区分开发前基线、环境检查与本次功能验收。

## 仓库基线

三个既有仓库最初均为 `main`、工作树干净、无未跟踪文件，默认远端分支为 `origin/main`。未发现贡献指南或 PR 模板。EchoMusicNextPlugins 已新建 `codex/folia-lyrics-skin`；EchoMusicNext 与 EchoMusic 没有切换分支或修改受版本控制文件。

Folia 从用户指定的 `https://github.com/chthollyphile/folia-major.git` 浅克隆至同级 `folia-major`，固定 `a8da4437cf19723555bd75e4685ca20815fe5b82`。未对参考项目安装依赖或改动代码。

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
| `npm run test:folia:qml -- --qt-bin <Qt SDK/bin>`                                                   | 13 passed；三行、译文、长句重排、缩放几何、隐藏几何、字体复制和原生序列。包含先失败再修复的用例                  |
| `qmllint -I <Release/qml> -I <Qt SDK/qml> <Folia QML>`                                              | 通过；使用真实模块/qmltypes，未绕过类型错误                                                                      |
| `scripts/test-folia-host.py --host-build <Release> --qt-bin <Qt SDK/bin> --package <Folia包>`       | offscreen 3 passed；读取现有编译/Ninja元数据，独立链接真实宿主库，不改宿主构建树                                 |
| 同上增加 `--platform cocoa`                                                                         | Cocoa/Metal 3 passed；原生 backend=6（Metal），与 offscreen 分开记录                                             |

Folia 专项原生用例覆盖：安装实际工具产物、只出现一个 Folia 候选且不自动选中、正式 PlaybackPage 与换肤抽屉、独立设置保存和 reload 恢复、拒绝未实现 mode、完整歌词字体链、关闭后代理失效、重新打开、停用回退 cover、卸载。实际本地 PCM 经生产解码/输出，宿主位置驱动三行切换；通过真实共享按钮暂停/恢复，页面命令 seek 到 5 秒，没有手动注入播放位置。测试 PCM/歌词为本仓库创作的夹具，未声称商业歌曲或外部歌词来源已验收。

初期音频夹具曾有一次加载超时，增加错误状态输出后未再次复现；后续 offscreen 与 Cocoa 分跑通过，冷启动可靠性仍保留复核项。暂停的 playing 标记表示命令接受，最后一块音频位置可随后到达；用例在原生确认稳定后检查暂停位置不再推进。另修复了父级隐藏触发译文有效 visible 变化而改变行高的问题，正常销毁不再产生该绑定告警。offscreen 的 Sans Serif 别名提示来自测试环境默认字体，不是页面 QML 失败。

日志/截图保存在 `build/folia-native/<platform>/`；`still-native-playback.png` 为 1100×820，`still-native-narrow.png` 为 620×820。Metal 截图确认暗角和共享浮动材质可绘制；它们是实际插件输出，尚未与运行中的上游 Folia 作同条件对照。`assets/previews/still.png` 是实际 Still 组件的独立预览夹具。

本轮再次运行 `npm run format:write`、`npm run check`、`npm test`、`npm run build` 均通过：Node 测试 17 项；正式源构建仍仅输出 spectrum，Folia 通过单包命令独立生成。真实 `npm run sdk:check -- --host <实际宿主>` 通过。`qsb` 编译暗角 shader 和 Cocoa 生成组件预览均成功。只读代码审查未发现可确认的 P1/P2；测试原有 Menlo 硬依赖已改为选择实际安装且不同于应用字体的字体。

当前实际包大小 171660 字节，SHA-256：`c2ead6abe7bb91d3c395f19e07b461a970a665aa980c80e34260c882f287a703`。工具 `echo-plugin validate` 通过；Metal 与 offscreen 日志分别落在对应平台目录。

## 未完成与跳过项

- 已实现开发用 Still 和单一 Folia 页面基础；其余 13 种样式未实现，classic 仅有逐字时序内核，未登记占位模式。上游默认 classic 的最终行为尚未接入，开发默认暂为 Still。
- 六种共享背景、完整播放胶囊显隐/拖动、共享字幕与全部面板交互仍待移植；当前使用宿主正式共享控件和命令。
- 缺失的内部约束仍未核对；LyricTimeline 模型类型、文件资产导入和鼓点/人声分析缺口分别保留，不能用私有 QObject、裸文件或 FFT 峰值代替。
- Folia 实际运行、同条件截图/连续动画、逐字/音译/重叠/间奏和迟到结果专项尚未验收。
- 深浅色、透明/材质、减少动效、DPI/缩放尚无完整矩阵；已有 Metal 与 offscreen 页面截图不能推广为全矩阵通过。
- CPU/墙钟、RSS/physical footprint/峰值、帧/GPU、反复操作资源增长、隐藏/最小化后台占用尚无合格对照，不作低占用承诺。
- Windows/Linux 及其他 macOS 架构未实机验证。
- 正式 source/artifacts 索引保持原状，未发布 Folia；GitHub CLI 未认证，贡献推送与 Draft PR 结果需单独记录。

本轮 Native 独立测试目录约 49 MiB；宿主共享 Release 树约 5.7 GiB、Rust target 约 3.1 GiB，剩余磁盘约 11 GiB。没有再安装完整 Folia/Electron 依赖，没有创建另一套完整宿主产物，也没有清理用户数据或唯一证据。
