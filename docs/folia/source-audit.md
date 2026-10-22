# Folia 插件首轮源码调查

调查日期：2026-10-22。**当前仅完成来源、入口与宿主调用链的首轮审计，14 种样式的叶子实现及运行效果尚未全部验证。** 执行状态见 [任务清单](plan.md)。

## 来源与仓库职责

| 仓库                 | 调查起点                                   | 职责与状态                                                                                                     |
| -------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| EchoMusicNext        | `432e63230d0f659b7eca217430069ba33f0dafd8` | Qt/C++ 宿主、Rust 音频、播放/歌词/主题/窗口/安装生命周期；初始 `main`，干净                                    |
| EchoMusicNextPlugins | `482a19d19daf2ed93e5a3d4dd37464e78b27ecfc` | 作者类型、构建工具、包、源索引；初始 `main`，干净，已创建贡献分支                                              |
| EchoMusic            | `cad5b8a9`                                 | 旧 Vue/Electron 皮肤协议、配置和交互对照；保持只读                                                             |
| Folia                | `a8da4437cf19723555bd75e4685ca20815fe5b82` | 用户指定的 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major)，`main`，本地克隆只读参考 |

本机三个既有仓库没有未提交 SDK 文件或其他 dirty 修改。宿主 `.gitignore:18-26` 明确忽略根 `AGENTS.md` 和大部分 docs；当前缺少 `docs/internal/`，用户确认暂时无法提供。插件仓库缺少任务提及的 `appearance.md`、`lyrics.md`、`themes-and-skins-design.md`、`ui-parts.md`。这些文件不能宣称已读，也不能由历史链接推断当前约束。

## 已确认：宿主皮肤调用链

以下路径均相对于 EchoMusicNext：

1. `services/playback/PlaybackService` 持有唯一播放状态；`PlaybackSessionController.cpp` 驱动歌词请求，`LyricTextController.cpp:237` 合成产品偏移，`LyricModel` 保存行和原始逐字数据。
2. `modules/EchoMusic/PluginSdk/EchoPluginPlayer.cpp` 将真实队列/歌词模型包装成只读 `EchoPluginReadModel`，增量转发 model 通知；`lyricsInfo()` 提供 offset、译文/音译、currentIndex，`revision()` 提供曲目世代。
3. `EchoPluginUi.h:19` 暴露 `lyricsPage`，真实类型为 `EchoPluginAppearance`。`EchoPluginAppearance.cpp:168` 的 `registerSkin` 经 `add` 验证包内 QML、预览、titlebar/tools、默认配置与 validator；注册在激活成功后提交到 AppearanceCatalog。
4. `modules/EchoMusic/Theme/AppearanceCatalog.cpp:70` 插入候选，不修改选择；`chooseSkin():161` 才写入当前皮肤。`modules/EchoMusic/Playback/LyricSkinDrawer.qml` 正式展示 candidates、设置页及 configuration.reset。
5. `PlaybackPage.qml` 的 `pluginPlaybackSkinHost` 用 `AppearanceHost` 接管完整页面；只有加载成功后隐藏原生正文，titlebar/tools 分别决定保留宿主区域。
6. `EchoPluginAppearance.cpp:381` 创建可见实例独立 scope，注入 `plugin/page/configuration`。`EchoPluginViewContext.cpp` 的命令委托回唯一播放/歌词/窗口服务，检查页面、账号与曲目世代。
7. `AppearanceHost.cpp` 按有效可见性、祖先裁剪、最小化、尺寸和 resourceActive 决定创建/释放；先撤销 scope，再释放对象。构建或运行警告归属当前组件后触发 catalog.fail，皮肤退回 `cover`。
8. `AppearanceConfiguration.cpp` 按安装身份持久化，完整 JSON 校验限制为 64 KiB；单 writer 线程、最多 64 个接受写入、QSaveFile 原子写入；retire 阻止新写，已接受写入继续排空。

原生用例位于 `tests/qt/plugins/PluginRuntimeAppearance.cpp`：`appearanceCatalogConfigurationAndRetirement`、`appearanceProductionThemeSkinAndMini`、`appearanceErrorsAndActivationRollback`、`playbackPresentationAndFloatingSdk`。本轮读取过用例，但尚未构建和执行；不能引用历史断言作为本轮通过证据。

## 已确认：作者 SDK 滞后

`packages/sdk/index.d.ts` 目前没有 `EchoPluginUi.lyricsPage`、appearance、fonts、windows、配置代理和页面上下文，也没有宿主新增的 player.snapshot/lyricsInfo/control/on 等成员。保存的 `host-contract.json` 同样仍是较早集合。

宿主 `PluginSdkContract.cpp` 已将上述实际 Qt 类型纳入导出。插件 `check-sdk` 默认只对保存的快照校验，因此当前 `npm run check` 通过不能证明两仓库匹配。正确闭环是：实际 Release 宿主导出 → 补齐唯一作者声明及工具类型支持 → `sdk:check -- --host ...` → `sdk:sync -- --host ...` → 原生验收。禁止手造快照。

## 已确认：呈现与数据边界

- `LyricModel.h:27` 的角色包含 lineText/startMs/durationMs/words/translation/romanization 等；行 startMs 带 offset，words 保留源逐字时间，不能一律重复加偏移。
- `LyricClock.cpp` 用单调时间对约 250 ms 的引擎观测做插值，断流外推上限 1 秒；暂停/速度状态变更与新位置观测分别处理。
- `LyricTimeline.h:17` 要求实际 `LyricModel*`，而作者拿到 `EchoPluginReadModel*`。因此不能直接将公开投影绑给现有 LyricTimeline，也不能取私有宿主模型绕过协议。
- `EchoPluginLyricsView.qml` 可渲染宿主原生逐字行，拥有虚拟 ListView 和呈现时钟，但没有向外提供任意布局可用的呈现 schedule/重叠/间奏状态。是否新增通用只读呈现接口需结合 14 个样式的规格与原生验证确定。
- `EchoPluginIo.h` 当前仅公开 HTTP 和私有 JSON 键值，没有本地文件选择、图片池导入或字节资源托管协议。Cappella/Tempera 等源码中的自定义资产操作必须作为具体缺口核实，不能用裸路径/私有 DB 实现。
- `PluginPackage::supportedFeatures()` 公开频谱，但没有鼓点、人声分离或 beat_this 分析。`pendolo/usePendoloBeatFx.ts` 实际消费 htdemucs 鼓点，并明确禁用旧 beat-list 特效；不能拿普通 FFT 峰值冒充鼓点数据。

前两类接口滞后与模型类型不兼容已经有静态证据；新增 API 的最终范围尚未确认，不能先造一套 Folia 专用宿主类型。

## 已确认：Folia 入口与样式清单

固定上游路径前缀：[`src/components/visualizer/`](https://github.com/chthollyphile/folia-major/tree/a8da4437cf19723555bd75e4685ca20815fe5b82/src/components/visualizer)。

`src/types/visualizerModes.ts:17` 定义 14 个内置 mode，默认 `classic`、默认背景 `latent`；registry 从各 mode 的 entry 自动发现并交叉校验。入口链为 App → VisualizerRenderer → registry → 共享 VisualizerBackdrop → mode renderer → 共享 VisualizerShell/字幕；播放面板由 App 的 PlayerPanel/PlayerBottomBar 组装。

| mode     | 入口/关键文件                                                                       | 从源码确认的目标与机制                                                                   |
| -------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| classic  | `classic/Visualizer.tsx`、`GlowWord.tsx`、`glowWordTiming.ts`                       | 逐字 waiting/active/passed、稳定随机布局、呼吸、旋转与字距；React/Framer Motion          |
| partita  | `partita/VisualizerPartita.tsx`、`PartitaChunk.tsx`                                 | 阶梯分块，复用 GlowWord timing/variants                                                  |
| tilt     | `tilt/VisualizerTilt.tsx`                                                           | 横向主行、倾斜副行；pretext 排版、grapheme timing                                        |
| cadenza  | `cadenza/VisualizerCadenza.tsx`、`cadenzaPreparedState.ts`                          | 字符云、焦点光圈、预排布与包络                                                           |
| claddagh | `claddagh/VisualizerCladdagh.tsx`、`CladdaghRingLine.tsx`                           | 倾斜环形轨道、实测间距与专属时序                                                         |
| cappella | `cappella/VisualizerCappella.tsx`、`CappellaMessageRow.tsx`                         | 聊天气泡、发送者、揭示布局、头像和表情包                                                 |
| monet    | `monet/VisualizerMonet.tsx`、`MonetLyricsRail.tsx`                                  | 关键词、立绘、拖动与音频覆盖层、song handoff                                             |
| pendolo  | `pendolo/VisualizerPendolo.tsx`、`PendoloClockworkCanvas.tsx`                       | 表盘/齿轮、弧形歌词、WebGL/2D 绘制、可选鼓点路径                                         |
| fume     | `fume/VisualizerFume.tsx`、`fumeArticleLayout.ts`、`useFumeCanvasStage.ts`          | 文章大字、淡化上下文、相机和分片布局                                                     |
| sonnet   | `sonnet/VisualizerSonnet.tsx`、`createSonnetPixiRuntime.ts`、`sonnetProgram.ts`     | 确定性 PV 编排、Pixi 场景/镜头/后处理/图形、词语义                                       |
| tempera  | `tempera/VisualizerTempera.tsx`、`createTemperaPixiRuntime.ts`、`temperaProgram.ts` | 色块构图、反色、图片层与后处理；Pixi 纹理预算                                            |
| lumiere  | `lumiere/VisualizerLumiere.tsx`、`createLumierePixiRuntime.ts`                      | Pixi 体积光、雾、光束照字、残影、切歌交接                                                |
| diorama  | `diorama/VisualizerDiorama.tsx`、`DioramaScene.tsx`、`CameraRig.tsx`                | Three.js 3D 场景、歌词几何、相机、shader 与粒子                                          |
| still    | `still/VisualizerStill.tsx`                                                         | 当前/相邻共三行，无动态背景；直接读取 translation，有源码说明的 subtitleContentMode 差异 |

上述是入口与依赖核实，**不是全部动画细节或视觉一致性的证明**。完整规格还须继续读取各 helper、shader、tuning clamp、真实设置面板及相应测试。

已深入读取的 classic 示例：字号 `clamp(36×scale, 6vw×scale, 72×scale)`；基于源行 startTime 生成稳定随机布局；`useLegacyLayout`、`wordSpacing`、`enableWordRotation`、`breathingFloatMultiplier` 都会影响正式行为。间奏 `......` 具有独立布局。不能将其简化为普通居中 Text。

## 许可与素材事实

- 上游 [`LICENSE`](https://github.com/chthollyphile/folia-major/blob/a8da4437cf19723555bd75e4685ca20815fe5b82/LICENSE) 是 AGPLv3 文本，`package.json` 声明 `AGPL-3.0`；不能直接把参考代码移植后标成仓库根 MIT。插件许可与必要署名单独保留，宿主根 GPL-3.0-only、作者仓库根 MIT 不改。
- 上游 README 还包含个人学习/非营利说明，代码分发条款和素材条款需要逐项记录；本轮没有复制任何上游实现或资产到插件。
- Cappella 的 `avatar/README.md` 与 `emo/README.md` 分别给出独立使用/修改/分发声明；不能只引用根许可证，也不能把作者对 AI 版权的概括当作已验证的法律结论。
- 字体通过 `src/index.css`、`src/utils/fontStacks.ts` 及自定义字体服务接入；Noto Serif SC 的远程 font-face 不能当作已获分发许可的本地资产，打包前单独核验字体许可。
- 主题、背景、封面和歌词可能属于用户或内容来源；验收材料不得把真实账号凭据、应用 DB 或他人内容随插件打包。

## 尚未证实

尚未运行 Folia 或新的 Release 宿主，尚无任何两者同条件截图、动画、真实音频连续呈现或性能对照。缺失内部约束、SDK 不同步、呈现/文件/分析能力及 3D 原生绘制需求会影响后续实现顺序；均保留在任务清单，不通过静态占位、演示数据或删除设置结案。
