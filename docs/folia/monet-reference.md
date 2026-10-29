# Monet：源码、原生路径与已知边界

本目录移植 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82` 的 Monet。它包含原始歌词模型、上下文轨道、逐词渐变扫字与双层光晕、双字幕、海报信息、立绘解码交接及拖动、72 点音频图。AutoMix 已接实际 A/B typed 呈现、同一歌词时钟与真实 gain cue；验收及仍需区分的范围见 [歌曲交接](song-handoff-reference.md)。

## 源码对应

参考根目录为 `folia-major/src/components/visualizer/monet/`：

| 参考文件                                                    | 本地实现                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `VisualizerMonet.tsx:75`、`:107`、`:129`、`:199`、`:357`    | `Monet.qml`：真实歌曲信息、倒回开头入场、响应式海报、主题文案、立绘编辑与装饰时钟                  |
| `monetLyricsModel.ts:220`、`:261`、`:356`                   | `model.mjs`：完整 pretext 测量、实际 ink 高度、原 UTF16 文本/计时词匹配                            |
| `monetRailLayout.ts:40`、`:175`                             | `rail-layout.mjs`：间隙、字体权重、固定轨道预留、焦点定位                                          |
| `MonetLyricsRail.tsx:86`、`:94`                             | `MonetLayout.qml`、`layout-job.mjs`、`Monet.qml`：正常 ±2、手动 ±4、字体变更重测                   |
| `MonetRailTokens.tsx:54`、`:129`、`:176`、`:194`            | `MonetToken.qml`、`paint.mjs`、`sweep.frag`：完整词 shape、源 EGC 前缀扫字、渐变、双光晕           |
| `MonetRailLine.tsx:75`、`:99`、`:114`                       | `MonetRow.qml`：弹簧、入离场、chorus 径向背景、上下文裁切与衰减、行内字幕                          |
| `AudioOverlay.tsx:14`                                       | `audio.mjs`：原始 72 点频谱抽样、低频偏置、噪声门槛、静态/动态 bar 与 line 指令流                  |
| `MonetPortraitImage.tsx:39`、`monetPortraitCrossfade.ts:15` | `MonetPortrait.qml`：解码后发布、失败保留旧图、900ms、最多四层                                     |
| `monetSongHandoff.ts:10`、`MonetFloatingDecor.tsx:15`       | 实际 A/B ReadModel、唯一时钟、原视觉 cue 与 .5 切换；`MonetFloatingDecor.qml` 保留主题图标稀疏槽位 |

`sources.json` 记录固定提交、源文件 SHA256、pretext/Unicode/Lucide 版本及兼容处理；生成器拒绝其他提交。

## Stage 输入与时钟

入口为 `Monet.qml`，接收标准 `preparedLines` 稀疏数组、`currentIndex`（允许 `-1`）、`timeSeconds`、字体/颜色/settings/live/visible/motionEnabled/paused/exiting。`lineMetadata` 必须保留真实 `sourceIndex`；`requiredSourceIndicesKey` 给 Stage 请求当前窗口尚未准备的源行，不能先 compact 再按数组位置当源索引。

额外输入为 `songTitle/songArtist/songAlbum/avatarSeed`、`coverUrl`、`customPortraitImages`（每项真实资产 `url`）、`themeDescription/themeDisplayName`、`audioPower`、`audioBands`、`spectrumBins`、typed `EchoPluginText textService`。频谱是同一公开音频订阅的 1024 个线性 FFT 字节；power/bands 是 `[0,1]`。没有频谱时使用原五带回退算法，不把对数峰值数组冒充原 FFT。封面与自定义立绘按原 source/fallback 规则选择，source 原上传语义为一张替换图片。

`timeSeconds` 是唯一歌词时钟，直接控制扫字/点亮/行状态。独立 FrameAnimation 只推进 UI 入场、chaotic 立绘和音频装饰波；暂停仍保留源墙钟装饰。`motionEnabled=false` 固定 UI 并使用源码静态音频图。`live=false`、不可见、showText 关闭及退出立即取消 ICU 操作、销毁 Worker/原生行；没有隐藏播放时钟。退出通过 `exitFinished` 交给 Stage。

`seekRequested(seconds)` 只上送真实行起点；拖动保存发送 `settingsPatchRequested({monetPortraitOffsetX})`，不替换 settings 绑定。滚轮阈值 72px、触摸 52px、方向反转清累积、1800ms 空闲回到播放焦点。

## 所有专有配置

使用扁平键；共享字体、subtitleContentMode、wordColors、animationIntensity、showText 仍按 Stage 契约输入。默认字幕继承主歌词权重；未指定主权重时保留设计字幕 500/400，不能因 null 错继承主设计 600。

| 键                            | 默认   | 范围/步长                               |
| ----------------------------- | ------ | --------------------------------------- |
| `monetKeywordColoringEnabled` | true   | bool                                    |
| `monetShowDescription`        | true   | bool                                    |
| `monetShowAudioVisualization` | true   | bool                                    |
| `monetAudioStyle`             | bar    | bar / line                              |
| `monetFontScale`              | 1.2    | 0.7–1.5；0.05；再乘共享 lyricsFontScale |
| `monetPortraitSource`         | cover  | cover / custom                          |
| `monetPortraitOffsetX`        | 0      | -150–0 逻辑像素；保存 round 整数        |
| `monetPortraitStyle`          | square | square / rectangular                    |
| `monetShowPortraitDragHanger` | true   | bool                                    |

默认及枚举来自 `src/types.ts:1110`，fontScale UI 范围/步长来自 `MonetSettingsPanel.tsx:90`。配置 UI、资产选择及 catalog 由共享集成维护，本目录不注册未验收替代项。

## 真实测量与换行

源码 pretext 0.0.9 的 layout/rich-inline 全量保留，EGC/属性改用固定 Unicode 17 数据，word pieces 来自真实 ICU4C78.3；没有 QtWord 近似。每个 EGC 前缀使用各自 ICU 输入，不能截断整句分词来模拟。完整词/完整前缀的真实 GlyphRun metrics 提供 advance、inkTop/Bottom；不按字符造宽。正文/字幕 face 分开，字体更换清空测量与布局。

特别区分源码**预留模型**与实际 DOM：`monetLyricsModel.ts:242` 对 timed token 的 `break:'never'` 只用于邻行预留；`MonetRailTokens.tsx:194` 的 inline-block 仍按 CSS shrink-to-fit 内部换行。Chrome155 的 Arial600/40px、可用300px实测：23个 CJK token 宽300px、多词英文宽300px，单个超长英文原子词宽967.328125px并溢出。不能把模型的一行直接画作一行。

原生以隐藏 Qt Text 的 `WordWrap`、width1、`forceLayout()` 得到实际 min-content/natural 宽，再用 `min(max(minContent,available),natural)` 求盒宽；完整 GlyphRun paragraph 再取得实际 lineCount。预留模型继续使用原始 rich-inline/normal 算法，邻行 y/visualHeight 不变。显示层由 Monet 专属 `pre-wrap.mjs` 使用公开 `prepareWithSegments(..., {whiteSpace: "pre-wrap"})` / `layoutNextLine` 放置完整未计时片段及真实 timed inline box；不修改生成的 pretext、原模型、源文本或词时序。连续空格保留原生测量宽度，硬换行和中间空行推进真实行高；纯空白只占几何，不创建空字形委托。连写/BiDi 片段保留完整文本进行原生测量，不逐字符估宽或改成 NBSP。实际 active 内容/字幕位置使用真实盒高。扫字偏移仍保留源未换行前缀测量，包括源横向扫字在内部多行词上的行为。手动上下文按源静态 span 取消 timed inline-block。

WorkerScript 每次接收 JSON deep-clone 成自有值，结果以 JSON 字符串回传，防止 QV4 消息值生命周期越界。Qt6.12 的 pretext `sharedLineTextCaches` WeakMap 曾可复现 sameValueZero 崩溃；仅把 declaration/reset 改成 strong Map，仍在原 `clearCache` 每轮清理，未改测量/换行算法。Qt6.12 `Array.from(string)` 会拆 surrogate；运行时字符遍历使用 Unicode EGC 或 for-of，而 Array.from 仅用于 Map/对象。

## 资源边界

正常最多5行、手动最多9行；退场最多18行且220ms释放。只创建裁切窗口内的 token 对象，按 viewport+64px 与 glow 余量筛选；不创建全曲 Text/GlyphRun。

每行最多8192 UTF16、窗口正文最多65536、1024个 token fragments；ICU 全部前缀最多4Mi UTF16，单批64条/65536 UTF16。测量每 GUI turn 最多64条/1024 UTF16（单条上下文上限8192），inline-block 最多16条，完整准备最多32768条 width 查询/32轮。无真实测量不发布临时画面。paragraph 宽上限4096；单行原子词可按源溢出，超过4096且含硬换行明确报错。原生每组仍受 GlyphRun 自身 atlas/字形预算限制。

`totalCacheBytes` 汇总当前/退场 body+sweep GlyphRun 的原生 CPU atlas cache，及 `backdropTextureBytes` 的 GPU ROI 计划字节；超过128MiB显式报错并释放整组，不截掉可见字。前者为发布后检查，不含 atlas 的 GPU 副本、肖像图片及 Qt 内部额外资源，不能当作整个进程或驱动占用。最新小数字号/合成修复后，真实 Metal DPR2普通5行/5词为 **6,935,460** bytes；最大合法字体倍率/chorus/全词同时亮的23字 fixture（测试名24CJK）为 **4,872,292**，共46个 body/sweep renderer；这两个数包含各自可见的 description backdrop 计划。

立绘框的 CSS Gaussian box-shadow 采用 rounded-rectangle 高斯积分 shader，无 CPU bitmap、FBO 或每帧上传；重置钮/挂件阴影复用同一解析原语。真实先前绘制内容由 `BackdropSource/BackdropBlur` 按 paint prefix 获取 GPU ROI，保留被模糊的歌词/描述/旧场景，不只采一张背景图。description/reset 为 σ12，矩形立绘为 σ8；目标移动及旋转会重算区域与 UV。最多6个前序 item、单面4096/32MiB、组合64MiB，超限显式报错；隐藏销毁所有 buffers。高斯两遍与圆角裁切仍有浏览器栅格差异，见下方完整统计。

## 验证与差异

Node9项：原始源码模型36组（4语料×3状态×3宽度）数值对照、Unicode EGC/词时间、稀疏索引、真实 LayoutJob 多轮、字体继承、viewport/扫字/立绘、原始 React AudioOverlay 六组完整72点 Canvas 指令流。数值模型对照两侧使用同一显式测试测量器，不声称浏览器/Qt字体像素等同。包测试另以 Acorn2016 检查真实 .mjs 产物。

实际 Qt6.12/Cocoa/Metal 最新 DPR2 **12/12**（9.256s），日志 `build/folia-monet-full-final-dpr2.log`。在原11项基础上新增实际窗口中的矩形立绘、真实背景前序采样、鼠标点按/拖动/重置/保存，以及隐藏时 backdrop/cache 全部释放；保留原生 RGB、扫字不重建 mask/上传、完整换行和 Unicode 字体变更测试。旧 DPR1 11/11 证据保留，最新整套仍须在正式统一宿主重跑。截图包括 `build/folia-monet-rectangular-dpr2.png`。

独立前序模糊测试在 DPR1/2各6/6；阴影四种深浅/方矩形加120帧主题变化在两种DPR各6/6。`capture-folia-{backdrop,monet-frame}-reference.mjs` 直接使用固定源码 CSS、实际 Tailwind blur、Chrome155.0.8059.86，`compare-folia-monet-reference.py` 输出全部像素及边缘/内部/外部统计，不排除差异。阴影外部最大通道差1–2、通道质量差约-1.53%..+2.92%，圆角边缘最大9。backdrop全图均值.0113.. .0333，σ8最大2，σ12最大9，旋转/缩放边缘最大21；内部仍有4–7的偏差，不把它们全部归因于AA或宣称严格像素门槛通过。完整 JSON、源摘要与 browser version 位于两个 `build/*-reference/` 目录。

保留的明确差异/外部能力：

- 字体排版由 Qt/CoreText 完整 shape，GlyphRun 已支持真实浮点 run.size；Qt 与 Chrome 字体 fallback/AA、Unicode line-break 分类可能不同，未宣称像素恒等。
- `text-shadow` raw blur 按原半径/2 转为原生 Gaussian σ，两层颜色/时序未缩减；Qt 原生 halo 级间插值仍有栅格差异。行/chorus 的 CSS filter 使用 Qt MultiEffect，立绘框已由 CPU Canvas 改为真实 Gaussian 解析 GPU 原语；原 Canvas 性能基线在24次主题变化时卡于GUI polish而中止，不能拿不完整基线声称某个提速倍数。
- 正常 timed token 的空白/硬换行仍保留一个完整原生 inline paragraph。未计时连续空格、CRLF/硬换行、中间空行现按源 DOM 的 pre-wrap 显示，原始 reservation model 仍保持源算法。CSS tab-size8 与 Qt默认 tab stop 的等价尚未证明，不能将本次空格/换行修复扩大为制表符逐像素等价。
- 主题 description/displayName/lyricsIcons 读取公开 themeMetadata。图标为空时原样无装饰；未知名字对应空内容，不替换为默认图标。详见 [主题图标](theme-icons-reference.md)。
- AutoMix 从实际 A/B typed metadata/歌词及原生 cue 驱动，不创建第二音频时钟。无 paired gain cue 的模板明确不提供动画交点；其他样式和页层和声的 held-A 范围不能借用 Monet 测试声明完成。
- 源 description pill/rectangular frame/reset 的 backdrop-filter 已接真实前序内容；完整源连续画面及 Release成本尚待验收。

## 构建、许可

`node scripts/build-folia-monet.mjs --reference ../folia-major` 使用参考现有 esbuild/pretext 与当前 Qt qsb，仅构建期依赖，不复制 node_modules、不新增应用依赖。生成器要求 Node24 Unicode17。QML/JS 产物随插件打包，渲染路径是公开 PluginSdk GlyphRun/文本/资产能力。

Folia 派生源保持 **AGPL-3.0-only**，遵循插件已附 Folia 版权与源代码提供记录；生成文件明确标注固定提交。pretext0.0.9 为 **MIT**，完整许可在 `styles/monet/PRETEXT-LICENSE.txt`；Lucide1.48.0 用于 RotateCcw 与主题装饰；共享装饰复用 Sonnet 的固定完整路径表，**ISC** 及 Feather 派生图标 **MIT** 原文保留在 `LUCIDE-LICENSE.txt`。Unicode17 数据及许可沿用 `shared/text` 固定官方数据集。本文区分原算法、平台兼容处理及尚缺能力，不以简化替代物声明源码等价。

## 2026-10-29：未计时空白与硬换行

固定源码 `MonetRailTokens.tsx:50` 的外层是 `whitespace-pre-wrap`，而 pretext0.0.9 的 rich-inline 明确只处理 normal。原真实 LayoutJob 对 `A   B` 只留一格；`A   لا\n\nעברית  B` 只输出一行。Monet 专属 flow 适配仅改变显示 rows，保留模型预留、完整 token/词时序、原字体测量、timed shrink-to-fit 与所有旧容量。ICU 增加完整保留片段的请求，仍受原 4Mi UTF16、32轮和原生每批预算约束；游标必须推进，行数由有界输入自然约束。没有修改原始 TS、生成器、pretext.mjs 或其他 rich-inline consumer 的默认语义。

Node 实际旧 LayoutJob 两项 RED，新实现对应项通过，并覆盖 CRLF/前导及连续空行、不拆原 timed token、剩余行宽不足时先换整词及默认 rich-inline 折叠不变；Monet、Monet 背景和真实交接源码 oracle 合并 32/32。真实 Qt6.12 Worker/ICU/GlyphRun 测量专项使用 offscreen + `QT_QUICK_BACKEND=software`，断言 GraphicsInfo 为 Software，不创建渲染器、shader 或截图。旧布局从 r2 备份按原 SHA 还原到独立副本，完全相同的两项原生断言得到 2通过/2失败；修复后含 timed 单一 inline box 守护最终 5/5；全部结果见 managed host `build/folia-update-20261028-r2/monet-pre-wrap/`。该 CPU 证据证明实际测量与布局，不代替正式 GPU/整包视觉回归。

音频图现在读取现有 `audio.spectrum` 订阅的归一化 bins，在绘制边界映射为原图的 0..255 输入；不请求独立 FFT profile，也不宣称该抽样与源 WebAudio 字节频谱完全等价。
