# Folia Tempera（版画）

固定只读来源为 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`，包括 `VisualizerTempera.tsx`、`createTemperaPixiRuntime.ts`、全部 `tempera*.ts`、13 组 composition、`tuning.ts` 与共享 Pixi display/cache/text/filter helper。端口与源依赖的 SHA 保存在 `styles/tempera/sources.json`。Folia 部分 AGPL-3.0-only；pretext 0.0.9 保留 MIT，真实 Pixi Text helper 保留 MIT，earcut 3.2.3 保留 ISC。

## 当前状态

121 种源构图已逐项在真实 QtShapes/Cocoa/Metal/DPR 2 绘制，包含镂空、独立 alpha、局部渐变与原运动函数。整页真实 ICU/字体、5-tap 背景反色、后处理、片尾、seek/暂停/字体替换与素材静态首帧已接通。组件未注册到模式目录，集成由主线负责。

1020 UTF-16 混合整行且 `temperaWholeLineLyrics=true` 时，源四次 fit 会产生 `0.8969064634404105px` 字号。该真实测试先以宿主 1 px 下限验证 RED，宿主提供原生 fractional shaping/raster 后原样 GREEN；未夹到 1 px、截断文字、删改测试或发布临时估宽。字体度量缓存保留完整分数字号。

## 组件输入

入口 `qml/styles/tempera/Tempera.qml` 沿用 Stage：`preparedLines/currentIndex/timeSeconds/baseFont/settings/primaryColor/secondaryColor/accentColor/backgroundColor/live/motionEnabled/dark/paused`；整曲读取额外使用公开 `lyricSource/lyricCount/lyricOffsetMs/trackRevision/textService`，不访问播放器私有状态。

封面渐变输入 `coverColors`；源片尾信息使用公开 `songTitle/songArtist/songAlbum`；随机种子使用 `seed`（默认 `avatarSeed`）。素材使用 `customLayerImages` 的真实 `{handle,url,width,height}` 与 `settings.temperaLayerImages` 原顺序匹配。`assetsService` 仅透传给共享 AssetImage；本模式的源 `createImageBitmap(blob)` 只取单帧，因此明确 `prepareFrames:false, playing:false`，不申请动画帧租约。

诊断有 `frame/busy/errorString/layoutRevision/measurementBatches/readBatches/refinementRounds/paragraphCount/cachedParagraphs/layerCount/resourceCount/renderers/totalCacheBytes`。错误由宿主页面呈现，能力缺失不输出伪造的完成结果。

## 配置

全部字段为 `tempera` 加以下首字母大写名称。共享 `lyricsFontScale/fontWeight/animationIntensity/wordColors/showText` 保留；默认字重为源 600，完整 base QFont 保留。

| 后缀                                                         | 默认  | 源范围 / 设置步长         |
| ------------------------------------------------------------ | ----- | ------------------------- |
| CameraIntensity / GlyphMotion                                | 1 / 1 | 0–2 / 0.05                |
| WholeLineLyrics                                              | false | 布尔                      |
| GlyphSettleStretch                                           | 0.5   | 0–1 / 0.05                |
| ColorMode                                                    | duo   | duo、mono、gradient       |
| TextInversion                                                | true  | 布尔                      |
| ShowBlocks / ShowDecor / ShowCornerMarks / EnableTransitions | true  | 布尔                      |
| TextureResolution                                            | 1.5   | 0.5–4 / 0.25              |
| PostProcessEnabled                                           | true  | 布尔                      |
| PostProcessTextureCompression                                | false | 布尔                      |
| PostProcessGrain                                             | 0.2   | 0–1 / 0.05                |
| PostProcessContrast / PostProcessRgbShift                    | 0 / 0 | 0–1 / 0.05                |
| PostProcessVignette                                          | 0.85  | 0–2 / 0.05                |
| PostProcessLensDistortion                                    | 0.3   | 0–2 / 0.05                |
| LayerImages                                                  | []    | 最多 16 个真实导入 handle |
| LayerImageDepth                                              | back  | back、front               |
| LayerImageFrequency                                          | 0.6   | 0–1 / 0.05                |

每张图片 placement 保留 `id/name/align/verticalAlign/scale/opacity`，默认 free/bottom/0.7/1；align=free/left/center/right，verticalAlign=free/top/center/bottom；scale=0.05–2、opacity=0–1，步长均 0.01。设置编辑和资产归档由主线所有。

## 整曲语义与字体

GUI 每轮最多读 64 行 / 65536 UTF-16，真实 `EchoPluginText.segmentWords` 结果送入 Worker；原 `Prepare.prepareLines` 初始化完整 ICU-Folia 词典与 semantic/sticky 规则。合法保存 `wordSegments` 优先，再自动词边界，parser words 只提供时序，不能充当词典。原 `sourceIndex`、时间单位、word/syllable、翻译/音译均保留，过滤行不挤占源索引。render tail 截到紧接的下一条有效源行。

原 paragraph gap、6 行 / 18 秒拆段、2–4 词 / 2.2 秒 shot、连汉字、标点尾部重计时、间奏 bridge、121 个 shot profile 全部由源程序执行。没有依据缺省字段猜测 chorus/songPart/blockIndex。

原四轮字体 fit、词整体 shaping 校正、各字 advance、空白与 CJK 间距、`|ÉqÅM` 实测 ink ascent/descent、原 Pixi word-wrap 与 baseline 均保留。pretext 使用真实 `advance`；Pixi Text 边界使用 `max(advance, inkRight-inkLeft)`。不同用途不混用旧 natural width。未知 metrics/ICU 片段只用于发现下一批原生查询，所有缺口补齐前不发布临时 layout。

Worker 只建当前及相邻 paragraph，源码 cache 至多 3 段。新增段的度量仅重建新段，已发布当前段的 id、字形与 geometry 保留。camera、glyphMotion、cornerMarks 和图片 scale/opacity 使用源 `requiresTemperaSceneRebuild` 的原位更新边界；不重新读取整曲或分词。时钟只更新源 pose；暂停后 seek 仍按准确 timeSeconds 重绘。

## 实际 GPU 合成

共享 recorder 保留 Container pivot/scale/skew/rotation、原 fill/stroke 顺序、真实 earcut 孔与 local gradient。每个可见 graphics/text/image 使用其完整世界矩阵；几何按 revision 只发送一次，后续 Worker 消息为引用与姿态。

`TemperaScene` 按源顺序构造实际离屏 prefix DAG：paper wash/screentone → 构图 → back image → watermark → text inversion → echoes → keyword → front image，再场景 post process，最后片尾与 overlay。每个 difference filter 采样此前真实画面，未以背景纯色替代已经绘制的 blocks/images。文字前景、阴影、碎字一起进入源反色滤镜；关键词与 echo 仍位于原层级。

Difference 保留中心 0.4 + 四斜角各 0.15 的 5 tap、1.5 逻辑像素位移、反预乘亮度、透明背景 paper 退回、选择与 backdrop 亮度距离更远的 ink/paper，以及四停点 tint 的亮度约束。渐变横跨文字 filter 自己的真实 bounds。场景 post effects 复用源 lens → grain → contrast → RGB → vignette，最后原 kernel-5/quality-1 transition blur；整个组采用所有 filter resolution 的最小值。无 filterArea 时 transition blur 按真实 ROI crop，而非硬套 viewport。Pixi blur 不按 Gaussian σ 冒充。

源明确不加 group halo。片尾使用真实标题/歌手/专辑、原 wrap、三圆/一 hatch/引导线与 0.1/0.9/1.1 秒 fade；源 empty-program 仍显示 corner marks，所以 `showText=false` 只去歌词/构图，保留这一实际 overlay 行为。

## 生命周期与预算

原整曲上限 8192 行 / 1048576 UTF-16；单批原生测量 64 run / 常规 1024 UTF-16，单查询最多 8192 UTF-16。度量/ICU 缓存最多各 65536 项，总 key/片段文本预算 32 MiB，最多 32 次 refinement。retained scene 对象上限 98304，发布最多 32768 primitive、65536 SVG paint 与 64 MiB path 字符串。最多 64 个 offscreen stage；RGBA8 target 计划总额最多 256 MiB。超限明确失败，不静默改变字号、分辨率、构图或效果。

`cacheBytes` 只包含明确的颜色 target 计划和 GlyphRun 公布的字形缓存，**不是进程 RSS**，不计框架、driver、MSAA、image 解码、管线和在途 GPU 命令。隐藏/退出 scope 立即撤下 Worker、原生 actor/Shape/字形/纹理引用，Qt 渲染线程再排放 GPU 资源。资源表以新 map 引用发布，保证 resourceCount 与消费绑定收到实际增删通知。操作取消与 source 世代 guard 阻止晚发布；消费节点逆序销毁，避免正在消费的 target 先被删除。

## 验证和边界

`node --test tests/folia-tempera.test.mjs`：6 项，含独立原 TS oracle、全部 121 profile/drawer、三个 palette、七种 glyph enter、三个 transition、稀疏索引、原 image placement、差分真实 prefix 和继承 resolution。源 oracle 已嵌入，测试不要求参考 checkout。共享 recorder 另有 10 项真实 Pixi 8.21 geometry/bounds/holes/lifecycle oracle。

`tests/qml/tst_FoliaTempera.qml` 由 `scripts/test-folia-native-qml.py` 链接真实 Host/ICU/GlyphRun。已完成实际 Metal DPR2：121 逐项像素、三配色、绝对 seek、真实文字 pixels 与字形纹理稳定、字体改变、metadata credits、黑白 backdrop 的反色、retained DAG、静态 GIF 首帧、跨 source 取消与隐藏释放。2026-10-23 最新正式 fractional/opacity 库重链后完整 13/13 通过（61197 ms），包括实际 80 行全文、1020 UTF-16 混合 wholeLine、双字幕和实时 tuning。保留 Qt Worker 初始化的 `QObject::connect(QJSEngine, QtObject): invalid nullptr parameter` 警告；没有抑制警告。

当前原生 parser `LyricModel::replace` 只保存 text/start/duration/words/translation/romanization，未公开原始 isChorus/blockIndex/songPart；作者元数据分类/边界会有这一真实缺口。ZIP 图片组交换和 SVG 已接既有公共资产协议，见 [资产交换](asset-exchange-reference.md)；普通混合坏图和图片/ZIP 原生拖入见 [拖放协议与证据](tempera-drop-reference.md)。Windows/Linux GPU、真实浏览器整页逐像素、跨曲严格两帧资源切换和屏幕阅读器尚未验收；原 kernel/数值 oracle 不等于这些验收已完成。
