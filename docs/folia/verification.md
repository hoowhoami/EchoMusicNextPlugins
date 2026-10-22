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

## 功能与视觉状态

本轮新增文件仅为 `docs/folia/plan.md`、`source-audit.md`、`verification.md`。写入后再次执行 `npm run format:write`、`npm run check`、`npm test`、`npm run build`，均通过，测试仍为 12 项。额外一次性核对了上游 14 个 mode 与计划中的 14 项样式任务一致、源码 entry 存在、文档本地链接有效；`git diff --check` 通过。没有修改旧插件、SDK、索引、清单或锁文件。

本轮尚未创建 Folia manifest、运行组件或 `.echomod`；以下验证均未执行：

- 实际宿主契约导出、SDK 同步和 `test:host`。
- 14 个皮肤候选的注册、选择、配置、恢复、启停、卸载与异常回退。
- 真实歌曲播放/暂停/恢复/seek、逐字/译文/音译/重叠/间奏及迟到结果隔离。
- 窗口缩放、DPI、深浅色、透明、材质、减少动效、字体和字形对齐。
- Folia 与 Qt 插件同条件截图、连续动画及用户视觉认可。
- Release CPU/内存/帧/GPU 基线、反复操作资源趋势和后台占用。
- Windows/Linux 实机与其他 macOS 架构验收。

后续证据必须记载命令、实际二进制路径、revision、运行条件和结果；不把静态检查与以上项目合并成“全部完成”。
