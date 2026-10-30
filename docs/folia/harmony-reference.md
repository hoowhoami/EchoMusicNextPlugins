# 共享和声层：源证据、实现与验收

固定源为 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`（AGPL-3.0-only）。本层是14种模式共用的原生显示层，读取同一公开宿主歌词投影，使用既有 `DynamicPresentation.PresentationClock`，不拥有播放器或另一套播放时钟。

## 源矩阵与实现计划

| 源路径与行                                                                                 | 保留的行为                                                                                                                                                 | 本地实现                                                                       |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/components/visualizer/VisualizerHarmonyOverlay.tsx:34–107`                            | top=76；保留字间标点/空白；源词色；500 fallback；clamp(.95rem,1.8vw,1.3rem)                                                                                | `qml/shared/harmony/{kernel,text-parts,word-color}.mjs`、`HarmonyGlowText.qml` |
| 同文件 `:108–179`                                                                          | 原整段前缀累计宽度；按源 grapheme timeline 连续 sweep；base alpha=.56；padding=round(max(font*.85,16))；softness=clamp(font*1.35,18,36)，中间 stop .86@50% | `layout-job.mjs`、`HarmonyPreparation.qml`、`sweep.frag`                       |
| 同文件 `:205–299`                                                                          | 整曲背景声部；parent opacity/y 200ms easeOut、y=-12；gap6、px20；background px16/py8；径向光晕；备用轨 .82/400，单轨 both→translation                      | `HarmonyOverlay.qml`、`HarmonyLine.qml`、`HarmonyBackground.qml`               |
| `src/components/visualizer/harmonyRuntime.ts:26–113`                                       | 全曲数组/单项来源；首尾均包含；稳定 start/end 排序；真实 token 状态与 signature                                                                            | 原始 runtime 生成模块；`index.mjs` 仅以最大结束时间树替代逐帧全曲 filter       |
| `src/utils/lyrics/{alternateText,graphemeTiming}.ts`                                       | 真实备用轨优先级、空白 trim；Unicode 字素/未定时标点/音节时间                                                                                              | 独立 Node 原源码 oracle；复用已验证共享 Unicode17/grapheme module              |
| `src/components/visualizer/monet/monetLyricsModel.ts:293–315`                              | pretext `normal` 空白规范化后的首行宽度，不能拿显示 pre-wrap 或字符串长度代替                                                                              | 原 pretext0.0.9 + 真实 ICU 每个规范化前缀 + 原生 GlyphRun advance              |
| `src/components/app/presentation/buildVisualizerTheme.ts:51–64`、`src/utils/fontStacks.ts` | subtitleTheme 可整体继承；主和声用 main 字体链、备用轨用 translation 字体链；显式 weight 两轨共用，否则分别500/400                                         | Page 独立完整 QFont 与 effective subtitle settings                             |
| 源安装的 `motion-dom/.../default-transitions.mjs`                                          | entry opacity300ms bezier(.25,.1,.35,1)、scale550/30，备用轨 y500/25                                                                                       | 复用共享 `PresentationSpring`，仅 UI 入退用 wallclock                          |

实施顺序：先原始 source oracle 与区间/偏移 RED→GREEN，再真实 Qt ICU/字体准备和 GPU sweep，再隐藏/退役/字体/长行与 Chrome 像素；最后接 Page 根层、统一时钟和新 TTML 只读模型。没有注册静态替身。

## 公共接口与数据生命周期

`HarmonyIndex.qml` 只接受公开 `EchoPluginViewContext page`，按64行读取 `page.player.lyrics.row()`，提取明确 `backgroundVocals`。主行 startMs 与声部 startMs 已包含 offset；raw words.start_ms 只加 `lyricsInfo.offsetMs` 一次。没有背景声部时不建立全文索引，不把主唱拷贝成和声。model reset / offset / track / live 变更清世代、终止旧 worker；隐藏后销毁 worker。

后台一次建立 sorted starts / maximum-end tree；每帧查询 O(log n + active)，不扫全曲，不按当前主行或其结束时间裁掉仍活跃的声部。Still 没有活跃声部时不启动连续帧；下一明确 start 由组件 Timer 唤醒既有投影，Timer 本身不供应播放时间。暂停/seek 仍读取同一个投影；UI 入退动画独立按 wallclock 完成。

`HarmonyOverlay.qml` 输入为 vocalIndex、timeSeconds、settings、完整 baseFont/translationFont、公开 textService、主题颜色与 live/motionEnabled。只在活跃集合或字体度量变化时做准备，词色/主题更新保留字形；异步字体细化期间保留上一份已验证字体与布局，当前结果未齐时不以临时宽度覆盖。pretext临时零宽 fallback 不发布。每个源前缀按原 pretext normal 空白规范化后先走真实 ICU，原 pretext 要求的字体片段经 measurementOnly GlyphRun 实测，字形只给当前活跃声部，播放帧只改变遮罩 uniform。

Overlay 的 parent 是 Page 根节点，位于 `VisualizerSurface` 外；`visualizerOpacity` 不会压暗它。Page 错误链包含 `lyricsInfo.errorMessage`；`embeddedErrorMessage` 只保留诊断，在线歌词成功时不会被当成致命错误。

只需两个持久 bool，均默认 true：`showHarmonySubtitle`、`harmonySubtitleBackground`，由主线配置/Settings 接入。已有 showText、hideTranslationSubtitle、showSubtitleTranslation、subtitleContentMode、subtitleFontScale 与字体/词色设置按源消费。源传入的 isPlayerChromeHidden 实际不参与和声布局，本层没有额外随 chrome 移位。

`lyricAdapter.mjs` / `timelineIndex.mjs` 另保留确实存在的 id/agentId/songPart/blockIndex/isChorus，缺失时保持缺失；不按空档猜段落或副歌。

## 有界资源与明确缺口

全文≤8192主行/65536背景项/4Mi UTF16文本；只存背景时轴/文本，不烘全文 glyph。活跃显示≤32声部、正文+选中备用轨合计≤16384 UTF16；每声部遵守当前 GlyphRun 每实例8192 UTF16与2048fragment预算。前缀总文本≤2Mi UTF16、真实 ICU prefix pieces≤1048576、width cache≤16384、≤16次native细化；每次ICU≤64文本/65536UTF16，每次原生字体测量≤64runs/8192UTF16。

正文 mask 的单个 GPU ROI ≤4096×8192/64MiB；背景两张 RGBA8 ROI ≤4096×8192/64MiB；总声明渲染预算≤128MiB。字体/框架分配不属于这些 GPU 计数，不声称总进程 RSS。背景只在几何/颜色变化时重烘；所有0ms延迟均为组件 owned Timer，隐藏/退役取消操作并释放 worker、字形和离屏纹理。

TTML允许单声部16384UTF16，而当前 GlyphRun单实例8192；超限明确报错，未截断或伪造宽度。Software Still 主唱仍可用，原生柔边 Harmony 需要 RHI；软件后端的该效果尚未覆盖。原生 Qt 字形/换行遵循完整 QFont 与上下文，平台字体 hinting、fallback 和浏览器实现差异不作逐字形零误差承诺。

## 实际验收

- 初始 Node：5项生产模块缺失 RED；Qt实际窗口：2通过/4缺组件失败 RED。
- Node 当前7项 Harmony + adapter/timeline既有10项=17/17 GREEN：1000行/跨主行结束、ICU offset只加一次、Unicode/标点、备用轨/词色/源mask，65536声部查询<100树节点，真实 metadata 保留且无事实不合成。空白规范化另有真实 RED→GREEN。
- 真实 Cocoa/Metal DPR1首轮6/6，DPR2新增空白/换行/真实词色/显式预算拒绝/Chrome shader后10/10：1020UTF16混排+备用轨+320宽、真实字体更换、暂停wallclock入场、seek/exit、hidden0bytes、20次 Loader.active=false退役；active/base两个 GlyphRun 的 maskRevision/uploads 不随 sweep 变化。
- 独立 Chrome155.0.8059.86 source CSS 与 DPR2 Metal：softmask RGB MAE=0.03125/255、max1；radial+CSS sigma24 blur MAE=0.199895/255、max2。静态背景 bakeCount 不随帧增长。脚本 `scripts/capture-folia-harmony-reference.mjs`，图像/元数据在 `build/folia-harmony-reference/`。
- 已知官方 Qt6.12 Worker `QObject::connect(QJSEngine, QtObject): invalid nullptr parameter` 保留原日志，未过滤/掩盖；详见 `qt-runtime-compat.md`。新增 QML Binding loop 已实际修复，专项将其列为失败。
- Page 与新 TTML Host 全链仍等待主线统一新 ABI 正式库；不以旧 runner 的独立显示项冒充完整部署验收。
