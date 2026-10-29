# Lumiere 源码移植与验收记录

参考 Folia 固定提交 `a8da4437cf19723555bd75e4685ca20815fe5b82`。入口 `styles/lumiere/Lumiere.qml` 已实现真实完整场景；是否注册由主线 catalog 控制。本目录不改变共享设置、时钟或宿主代码。

## 源算法与 Stage 契约

`scripts/build-folia-lumiere.mjs` 生成全部 10 家族 × 10 rig、全文段落与镜头、摄像机、线稿、爆闪、星落、浮尘、前景散景、关键词、歌词窗口、碎词 echo、画框、暗场、片尾卡，以及原 `LumierePixiRuntime`、`PixiSceneCache`、`PixiSongSwap` 类。原类直接运行在数据场景适配器上；浏览器 Application/DOM 安装替换为 Qt 生命周期，未以另一个简化场景重写原类。`sources.json` 记录固定来源和 SHA256，包括真实 Pixi8.21 文字绘制方法与 Lucide 数据。

- `Lumiere.qml` 使用标准 Stage 输入 `preparedLines/currentIndex/timeSeconds/baseFont/settings/colors/dark/live/motionEnabled/paused`。主场景按原完整 program 和唯一 `timeSeconds` 取帧，不从紧凑数组猜宿主焦点，不另建播放时钟；`preparedLines/currentIndex` 保留统一接口，字幕继续由共享层消费。
- 额外输入为 typed 公共 `lyricSource/lyricCount/lyricOffsetMs/trackRevision/textService`、`seed/songTitle/songArtist/songAlbum/audioBands/audioPower/backgroundColor/accentColor`。输出 `errorString/renderReady/totalCacheBytes/workerAlive/frameRevision`；`subtitleSuppressedRecentIndex` 为最新已完成全文准备的真实末行 sourceIndex，供共享字幕去重。
- `LumiereProgram.qml` 每 GUI turn 最多读 64 行/65536 UTF-16，4096 行/1Mi UTF-16 总上限、单行 8192；实际 ICU 异步 word pieces 与 jieba/BudouX 在 Worker 准备。保留 saved→auto 的语义边界优先级与 sourceIndex，过滤空白行不重排宿主索引。
- `stage.mjs` 直接调用原 `decideSongCommit/isInstrumentalConfirmed`：保持已提交歌曲，看到近开头的播放重置且播放达2秒，或等待达3秒才确认无歌词；新非空不同签名立即提交。源 signature 包含 saved/auto 分词。原 class 保留同曲替换、可用时的两帧 stage/commit、±1缓存及逐帧退役、暂停音频归零和暂停 seek 的 renderOnce。
- `scene-job.mjs:createLumiereSceneJob` 与 `scene-worker.mjs` 隔离 Worker 自有数据。原生测量/ICU 未齐只返回 `phase:measure`，不发布零宽度临时布局。32轮收敛、8192 query/轮、32768 metric 缓存上限。动态缺少新字体数据时会保留旧 Qt 画面、冷重放当前 source runtime；准备延迟及这类冷重放的调度不声明与浏览器同步 Canvas 两帧时长完全相同。
- `LumiereSceneLayout.qml` 每 turn 测一个完整上下文 query，`GlyphRun.measurementOnly:true` 不建 atlas；使用真实 `advance/inkLeft/inkRight/inkTop/inkBottom/emAscent/emDescent`。精确小数字号参与 cache key。原 class 的220ms设置重建防抖保留，viewport/native job重建另有220ms准备防抖。generation/trackRevision/sequence 隔离迟到结果；每个 Worker message 先 deep-clone 为 Worker 自有值。
- Presentation 时间只驱动原 audio sampler、UI重建 timer 和换歌等待；歌词状态仍只用外部 `timeSeconds`。暂停停止常规 FrameAnimation，设置 settle 与 seek 可补帧。hidden/live=false 取消 operation、销毁 Worker、释放当前原生对象。

## 原生渲染与资源边界

`scene-frame.mjs` 调用原 scene entry/update；snapshot 保留世界矩阵、顺序、alpha、tint、filterArea、完整文字 Canvas 指令及原 texture frame。`frame-plan.mjs` 的 clipping/rounding/padding 已与实际 Pixi `FilterSystem` 对照。Qt Shapes 回放完整线稿；field 与 bloom 使用原 GLSL 数学，只有 QML uniform/storage 接口不同。

- `LumiereBloom.qml` 执行真实 down/up/combine 遍次；六级为6 down+5 up+1 combine。pool 依据实际 Pixi8.21 screen registry，而非只取 POT。尺寸/拓扑不变只改 uniform，不重新分配目标。
- `LumiereSceneView.qml` 只创建当前可见树，静态纹理按 key 复用；每 turn 最多一个重组/纹理对象或24个廉价叶节点。数据层限8192节点、64MiB路径文本、65536路径。稳定缓存（原生 atlas `cacheBytes` + RGBA8 FBO声明量）总限128MiB；每个新重对象创建后 audit，超限整体报错释放，不截断歌词。单个底层 group 最多128MiB，故缺少 native reservation 时瞬时分配上界为已接受128MiB加一个group128MiB；GPU释放在后续同步，不承诺 GUI 返回瞬间回收。统计不含驱动开销/窗口 framebuffer；Glyph CPU atlas 还有其独立上限。
- 保留源最小 Canvas 320×240 与 render DPR1..2；小视口或实际DPR不同，使用计入总预算的固定原分辨率 layer 后再做 CSS 对应缩放，避免让 `gl_FragCoord` 随显示缩放改变。raster 边≤8192且小于128MiB。
- 四张原始小纹理 dot128²/star256²/bokeh128²/streak512×32 合计114688px：CPU448KiB、GPU约448KiB。仅这些静态程序使用 Canvas.Threaded；命令 key不变不重画，绝无每帧整屏 CPU Canvas。
- `LumiereGlyphTexture.qml` 用真实 GlyphRun 合成完整源文字 Canvas，再共享 frame 切片；正文不靠 Canvas 绘制。每个文字纹理至多128 runs/8192 UTF-16、边8192、目标128MiB。bitmap描边按源 Chrome 行为显式 `strokeBitmap:'fill'`；普通 outline 保留真实描边。

## Unicode、字体与 Qt 兼容差异

运行时严格 ES2016，官方 Unicode17 属性与 UAX29 EGC，实际 ICU78 word pieces；没有 Qt Word 近似。原 upright 判断保留显式范围。字符串 codepoints 使用 for..of，规避 Qt6.12 Array.from(string) 拆补充字符。

原主歌词 .04 spacing 在一张 Canvas 按 EGC 绘制，前缀完整 kerning 决定位置；echo spacing0 为整句 fill/stroke 后切片。相邻 overhang 与 Sprite 组 alpha 保留；不把每簇 alpha 冒充已合成整张 Canvas alpha。credits 详情使用实际 Pixi 原 painter/wrap/letterSpacing，保留 alphabetic baseline。

Canvas middle 使用主字体归一 OS/2 em 指标；Chromium 代码和 Chrome155 Arial40/160、TimesNewRoman80 位移11.03125/44.125/21.015625已独立对照。Qt五指标和 fractional run.size 已真实接入；字体选择、CoreText/Qt hinting、Skia/Qt AA、stroke raster 和 float尺寸 reference shaping 仍有平台差异，不宣称整页逐像素相等。

两项 Qt6.12 bare 兼容证据：`for..of map` 迭代中删除当前项会跳过相邻项，退役先快照 entries；原 Map.forEach 删除正常，未改其算法。双 ObjectPattern 形参会把首个参数绑定成 undefined，原 songHandover 仅用现有 TS 降绑定语法，保持数学与分支。官方 qmltestrunner inline/ESM/Worker 原版三项RED，降绑定后5/5；完整探针在 `build/qt-destructuring-probe/`。上游 `QObject::connect(QJSEngine,QtObject): invalid nullptr parameter` 仍记录，不过滤；空 sampler/invalid context/TypeError 则为原生测试失败。

组件退役时，Program 的 ICU 完成、SceneLayout 的测量/ICU/帧续跑、GlyphTexture 的布局验收均由组件持有的 0ms 单次 Timer 合并请求。Component.onDestruction 先关闭 completed 门控再停止所有待办；stop 同步取消。避免 Qt.callLater 在 Stage 的 Loader.active=false 立即销毁上下文后仍执行旧闭包。Timer 调度与原事件轮调度不同，但源计算、顺序依赖和同函数请求合并语义保留。

## 实际验证

- 生命周期补充：静态禁止裸 Qt.callLater 已 RED→GREEN；72 次真实 Loader.active=false 立即退役、每类重复回调合并、真实全文/字体链路，offscreen 5/5；Cocoa/Metal DPR2 真实整句切片、Stage 暂停 seek/设置/hidden 加快速退役专项5/5（13.295s）。日志 `build/folia-lumiere-lifetime-{red,green,native,metal-dpr2}.txt`。
- Node16项：全部100 rig三种aspect、全文/纯音乐/seed/seamless、源音频attack/release/quality、field Float32、glyph原Canvas指令、真实 Pixi pool与FilterSystem、完整scene数值、独立原runtime class跨pause/seek/tuning/credits/swap整树、实际多轮测量、23项设置与source门控、精确小数键、viewport及Qt颜色。加整个原始模块 AcornES2016 package 回归共17/17。
- Cocoa/Metal DPR1完整套17/17；新增compact源Canvas独立3/3，最终黑底Stage/credits/compact加严回归5/5。最新DPR2完整套18/18，含黑底真实RGB、片尾wrap/EM基线、真实80行readmodel/ICU/字典、暂停seek/设置/hidden、3秒门控、120帧paintCount不变。日志 `build/folia-lumiere-full-metal{,-dpr2}.txt`。
- DPR2 640×480、80行：初帧49,136,576 bytes/573节点、seek到8秒73,764,240 bytes/699节点、片尾3,178,368 bytes/447节点；hidden 后均0。DPR1最终同样本初帧16,003,612 bytes、seek19,951,720 bytes、片尾6,274,116 bytes；这些数为具体样本，不是全配置绝对上限。
- 四张原 source sprites 与 Chrome155 RGB-over-black相对L1：dot0.382%、star1.024%、bokeh0.293%、streak0.591%；star尖角AA最大差43/255，余图1–3/255。原图/指令/统计在 `build/folia-lumiere-canvas/`；native整页截图为 `build/folia-lumiere-native-{stage,credits,lyric-scene,scene}.png`。

尚待主线完成 catalog 与正式页面集成验收。themeIcons 已接公开 themeMetadata.lyricsIcons，沿原列表解析与线稿算法生成；空/未知列表仍为空，详见 [主题图标](theme-icons-reference.md)；外部共享背景/字幕由真实共享层提供。Windows/Linux、跨屏DPR和极端长行准备性能未作为已通过项目。预算拒绝通过 errorString 暴露，未添加伪画面兜底。

## 设置冻结与许可

原 tuning 实际23项（不含共享设置），flat名为 `lumiere` 加源key首字母大写。数值默认/范围/step：lightIntensity1/.3..2/.05；audioResponse1/0..2/.05；fogDensity1/0..2/.05；darkField.75/0..1/.01；moteAmount1/0..2/.05；bloom1/0..2/.05；textBloom1/0..2/.05；unlitOpacity.22/.05...6/.01；windowNeighbors2/{1,2}；decay1/0..2/.05；echo1/0..2/.05；fogOctaves5/2..6/1；themeColorMix.3/0..1/.01。布尔默认true：lineArt/frontBokeh/trails/seamlessTransitions/overlayFrame/keywordColors/themeIcons；false：hideTrails/textOnly。renderQuality默认full，枚举full/balanced/low。共享 showText/fontWeight/wordColors/animationIntensity 读取统一设置；主rig字号不额外乘 lyricsFontScale（原 scale仅字幕/失败提示）。

Folia派生源保留AGPL-3.0-only及原作者版权，沿用插件LICENSE和可提供源代码记录。pretext0.0.9复用Monet/PRETEXT-LICENSE.txt；共享Pixi字体/场景与earcut保留Sonnet专属MIT许可。Lucide1.48.0的2118个原始icon node数据保留ISC全文 `LUCIDE-LICENSE.txt`，不分发React或整个node_modules。Unicode17许可沿用shared/text。没有新增应用依赖。

## S11 大预览字形池修复

真实自撰四行预览 `700×450`，原 virtual viewport `1100×820`、DPR2、暂停 `5.4s`，原单个 GlyphRun 将完整 Canvas 的所有命令合并，先出现 `Glyph masks exceed the eight-page texture budget`。第一张源图是 12 个汉字的 24 条 fill/stroke 指令、原字号 278.8、逻辑 3619.424×559.3494609375、原始物理 4096×633 / resolution 1.1316717798191092；未降低文字、字号、纹理尺寸或原生页池。独立 RED 日志为 `build/folia-lumiere-glyph-budget-red.log`。

`LumiereGlyphTexture.qml` 对实际原生页数/ink/片段数预算拒绝，在原始 Canvas draw command 之间二分连续批次。每条完整 text 保留原生 shaping，原 source-over 顺序、颜色、strokeBitmap、middle/alphabetic em 基线和 pose 数学不变。只对明确的批次容量错误重试；单命令仍无法接受、非法字号/格式或总预算超限明确失败。128命令/8192 UTF-16 原上限未扩大；每事件轮只建立一个候选 GlyphRun。先完成组件 font/window 初始化，再提交 runs，防止初始化的空 layout 刷新掩盖已拒绝的 DPR2 输入。

第一张源图实测分成4个6命令批次，native atlas 合计24,492,400 bytes，原目标10,371,072 bytes。内部逐次检查池+目标128MiB，外层 viewport 128MiB 保持不变。检查前至多新建该纹理的一个原生候选，候选仍受32MiB ink硬限制；不声称这些缓存计数是进程RSS或含驱动在途对象的总内存硬限。

完整场景继续暴露了原实现长期保留已烘焙 atlas 的第二个128MiB RED。现在以真正 `ShaderEffectSource.scheduledUpdateCompleted` 才发布 ready，并释放全部临时 atlas，仅保留原尺寸静态 Canvas 图。采样消费者原本要等待 ready，新增准备期1×1透明 uniform shader消费原捕获以解除循环等待；该消费者不建FBO、不改原目标采样率，GPU完成后销毁。准备中的正文 Item opacity0、CPU验证继续运行；完整 capture 建立后才恢复 opacity1，所以未就绪的临时字形不会闪入页面。消费者先退休再销毁 provider，空 sampler 警告仍为测试失败。

捕获实例按每个 source/font 代次独立创建，完成回调同时校验实例和 generation。hidden/live=false、错误及销毁停止 owned Timer、先释放临时池与消费者再释放目标；不能向新代次发布旧图。`measuredMetrics` 保留实际完成的原生指标，`preparedBatchCount/nativeTextureUploads` 为该次真实准备计数；完成后 `renderers=[]`、`nativeCacheBytes=0`，方便验收且无需为统计保留 atlas。

专项 `tst_FoliaLumiereGlyphPool.qml` 在 Metal DPR1/DPR2 均5/5：源4096×633尺寸未改、DPR2真实4批次、完成后仅10,371,072 bytes、重叠彩色填充/描边与24个独立原生命令最大RGB误差1/255、120个真实frameSwapped的像素/revision/upload不变、hidden归零、非法2048px输入拒绝后恢复、旧代次完成拒绝。日志 `build/folia-lumiere-pool-final-dpr{1,2}.log`。原完整Lumiere DPR2 19/19，日志 `build/folia-lumiere-budget-full-dpr2.log`；全文初帧32,914,752 bytes、seek8s后41,887,712 bytes，均为该实际样本而非绝对上限。生成器重跑前后所有runtime文件hash相同，Node原17项source oracle继续通过。

最新专用预览 `tst_FoliaLumiereGlyphBudget.qml` 在 DPR2 3/3：5张文字源纹理、175条真实native metrics、29次准备上传，完成后native atlas=0，viewport总计114,963,976 bytes；1400×900实际前景差246,173采样、覆盖8列。日志 `build/folia-lumiere-preview-final-dpr2.log`；DPR1同专项3/3，未触及真实歌词源80行，trackRevision仍为预览独立值。Diorama代理另以完整14模式实际预览DPR2 42/42独立复核，日志 `build/folia-preview-modes-dpr2.log`；其墙钟受并行任务影响，不作为性能结论。
