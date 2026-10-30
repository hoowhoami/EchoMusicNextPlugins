# Folia 歌词皮肤

开发中的 Qt Quick 插件。宿主换肤抽屉只注册一个 **Folia** 入口，选中后在播放页右上角选择 Folia 内部样式；安装与注册不会自动改变当前皮肤。

当前接入全部14种原生样式：流光、心象、云阶、倾诉、回环、群唱、莫奈、时计、浮名、商籁、版画、绘光、镜台和静止，默认流光。动态样式共用真实宿主呈现时钟、ICU分词、Unicode17文本准备与字幕；莫奈/时计保留自身内联字幕。镜台是真实透视3D歌词/粒子，商籁和版画保留原场景程序及GPU后处理。普通LRC沿用源行级展示时序，真实逐字歌词保留原始时间。全部14种已在同一个实际安装包的生产播放页验证切换；背景、连续视觉与Release性能仍按 [任务清单](../../docs/folia/plan.md) 推进，当前是开发包。

配置通过宿主注入的 configuration 持久化。共享字段直接逐键 patch；后续专属设置采用 mode 前缀键，避免嵌套对象替换覆盖另一模式的参数。设置面板使用宿主共享控件和滚动容器。

播放胶囊包含展开/折叠、拖动定位、标题切歌、进度拖动、双槽位和虚拟化歌词时间轴，只使用真实宿主已有的播放、进度、音量、模式、收藏和队列命令。控件支持始终显示、自动隐藏、始终隐藏；空闲3秒或离窗/失焦300毫秒后自动隐藏，按住指针、编辑或弹层打开时保持显示。退场卸载控件，服从宿主减少动效设置。

## 本地验证

在仓库根目录使用 Node.js 24，并安装匹配宿主的 Qt 6.12.0 Shader Tools：将 qsb 加入 PATH，或设置 `ECHO_QSB=/absolute/Qt/bin/qsb`。Latent 的 shader 源码由正式构建烘焙，源码目录无需生成 QSB。

```sh
npm run check
npm test
npx echo-plugin build plugins/folia-lyrics-skin --out dist
```

仓库的 `echo-plugin.build.json` 明确列出频谱和 Folia 两个本地插件；`npm run build` 构建这两个来源。公开 `echo-plugins.json` 可另含独立作者仓库，不从其中推断本地构建集合。`prepare:source` 由工具生成本地包和索引字段，运行入口只须进入 `.echomod`；`check:published` 则读取索引所指的远端清单与包，未推送候选不能以本地构建代替这项检查。

包需要宿主分支提供的 `text.segmentation`（ICU 78.3 / Unicode 17）、`text.glyphs` 和 `graphics.rhi` 等能力。安装缺少能力的旧宿主会明确拒绝。动态样式需要硬件图形后端；软件场景图显示恢复提示，可在页内切换静止样式。作者契约须从本次真实宿主同步，不能删除 manifest 能力绕过检查。

组件测试使用 Qt 6.12 和真实宿主静态模块；macOS GPU 像素检查使用 Cocoa/Metal：

```sh
npm run test:folia:qml -- --qt-bin /absolute/Qt/bin --host-build /absolute/host/build/release
```

该入口从实际构建包加载 QML 与 QSB；`--qt-bin` 也为未显式设置 ECHO_QSB 的测试提供匹配编译器。组件测试不代替原生验收。已有 Release 构建及 `echo-plugin-runtime-test` 链接依赖时，可复用它的实际库验证本插件包：

```sh
python3 scripts/test-folia-host.py --host-build /absolute/EchoMusicNext/build/release \
  --qt-bin /absolute/Qt/bin --package dist/folia-lyrics-skin-1.0.0.echomod
```

该工具只读取 Ninja/编译元数据，在插件仓库 `build/folia-native` 编译独立验收程序，不修改宿主构建树；使用临时存储、原生 PlaybackPage/换肤抽屉和本仓库创作的 PCM/歌词。验证一个候选、设置保存/恢复、真实播放/暂停/seek、内部十四种样式切换、关闭、停用与卸载。macOS 增加 `--platform cocoa` 检查 Metal，软件后端验证明确回退提示，在对应目录保留日志与截图。这些不代替完整 Folia 连续动画与性能对照，状态见 [验证记录](../../docs/folia/verification.md)。

## 参考与许可

Folia `a8da4437`，AGPLv3；移植文件与素材的对应关系见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，许可证全文见 [LICENSE](LICENSE)。作者仓库根许可与宿主根许可不变。

当前范围不包含 AI 分析、歌曲墙、队列扩展、插件睡眠或额外选源协议；歌词和背景的音频响应使用宿主原有 `audio.spectrum`。A/B 投影只用于显示，胶囊始终呈现并控制 native current。精简后的安装与原生结果需要新的统一构建，旧包不作为本版验收。
