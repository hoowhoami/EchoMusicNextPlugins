# Fume 源码与原生适配

## 当前验收边界（2026-10-29，本轮源码已合入）

正式 E 检查点之后，真实 A/B 切歌暴露相同 A 换成 outgoing ReadModel 时清空文章，以及完全离屏 halo 占用共享纹理两项独立问题，最小修复及永久回归均已合入。R3 正式宿主随后通过四个图形 CTest、全部 528 帧、197 实例 capture 与支持边界、多 pass／MSAA／RenderControl、40 代容量恢复；实际包 `6c9e64a0…` 的 80 行正文及 Fume→Monet→Fume 两种 DPR 也分别通过。第四轮上游整合与歌词点击修复之后仍需新的 coherent 组合复验；前台安静性能尚无结论。

R3 的 A/B80 在第一次读回处因夹具把 `image.save()` 返回值当作 bool 而停止；当次实际 PNG 已落盘，该失败保留为 QA 误判，不称产品 RED。[Qt 6.12 的实现](https://raw.githubusercontent.com/qt/qtdeclarative/v6.12.0/src/qmltest/quicktestresult.cpp#L98) 明确返回 `void`，写入失败会抛异常。夹具现直接调用 save，保留原 extent、亮像素、时限、资源和退役断言，同时输出路径与原始像素观测。R4 的 A/B 两种 DPR 尚待执行。

外部 `tests/helpers/folia-handoff-readback.mjs` 要求运行前调用 `createCaptureRun(parent,label,dpr)`；已存在目录立即失败，不能清空或复用旧输出。owned native 进程以该目录为 `FOLIA_CAPTURE_DIR`，退出后才调用 `verifyReadbacks({directory,logPath,endedAtMs})`。它核对本次时间区间和四个固定 readback，验证全部 PNG chunk CRC、完整解压／滤波、1100×820×DPR 实际尺寸与 SHA，再以同一坐标／RGB>96 重新计算亮像素并逐项比对原日志；需要正文的三张仍须 >20。输出证明绑定 run UUID 与日志 SHA。缺失、过期、损坏、错尺寸、像素不符或只有首张图片都失败，不继承旧运行的 PNG。该验证器仅使用 Node 标准库。

### 固定参考与预算

参考生成前后实际记录 Chrome **156.0.8078.73 / Graphite Dawn Metal**，`getContext('2d')` 没有传 options，对应 Skia `a65b5cc03a5131808aec172085b7074fc66625b9`。这描述固定 oracle 的生成版本，不表示当前安装版本。原始 PNG、字体、CTM、alpha、moments 和 15% 门槛保存在宿主 `tests/fixtures/glyph-run/folia-default-canvas-matrix.json`；旧强制 `willReadFrequently:true` 的 CPU 结果保留为负例。

528 帧仍由 168 个离散姿态、240 个 scale／radius／alpha 同时变化的连续姿态，以及 120 个零 alpha／小 blur 姿态组成。mass、σX、σY 相对误差均须 <15%，X/Y 重心偏差 ≤1 logical px。连续 120 帧期间 immutable source 上传和 revision 不变；不得以缓存、低分辨率或经验增益替代这些门槛。

每个 window 仍共享四个目标：3 张 1024² RGBA8 与 1 张 1024² RGBA16F，颜色合计 20 MiB；透明 CPU 图、curve、UBO／SRB 与 metadata 合计受原 **32 MiB effects** 约束。ink 仍最多 8 页／32 MiB。全部自有 source、CPU／GPU、geometry、metadata 和未真正退出的取消任务进入同一 **128 MiB native 软件账本**，它不代表 Qt 字体引擎、驱动缓存或进程 RSS 的物理上限。本轮保留原 Shelf、shader 和 source 效果，没有引入 guillotine 分配器或扩大预算。

### 当前 target 的严格 halo 剔除

真实 DPR 2 失败帧在分配 3,522,583 个 padded pixels 时已有 2,148,487 个完全落在当前 target 之外；单换 packing 只延后失败。生产实现改为用**当前 render pass 的真实 projection**，将完整 `Plan.back` 模糊支持范围投影：只有四角均有限、w>0 且处于同一 NDC 外侧才不分配该 halo。跨边界、负／零 w 和非有限投影均保守保留。body 绘制与原有 node bounds 不缩小，后续不同 sourceRect、target 或 RenderControl pass 仍可显露该字形。

新增永久回归以 196 个离屏实例加 1 个窗口内实例制造真实容量压力，并以负 sourceRect 显露一个离屏字形。旧生产两种 DPR 都仅在 197 实例用例报原 field capacity 错误；单 captured-glyph 对照本来就 RGB 0。候选两种 DPR 均通过，capture 与窗口图 RGB 最大差为 0。取样使用真实 `scheduledUpdateCompleted` 和随后一次 `frameSwapped`，再单次 grab，不按像素变绿反复等待。另有 ink 已在窗口外、40 px halo 支持仍交窗口的平移回归，RGB 最大差也为 0。

早期该新夹具采用 256 px 行间距，下一行字形因 baseline 上扩而在 capture 的 y=234…255 合法可见，造成 RGB 255；修正为 512 px 网格和对应负起点后，两图各自只含同一个完整字形。原始／ready PNG、事件顺序、旧容量 RED 以及无效夹具均保留，没有改实例数、字号、halo 半径或 RGB 0 门槛。

### 相同逻辑歌词与歌曲外观

FumeLayout 不把不同 QObject／revision 名称当作歌词内容身份。仅当字体、视口、offset 与完整布局上下文仍等于已接受输入时，分片读取新 ReadModel，并由原 worker 对照其已完成 job 的全部规范化歌词行，包括逐词、逐音节时序与 metadata。每次仍最多 64 行／65536 UTF16；不新增全局 LRU 或 GUI 全歌复制。校验期间保留文章，`sourceCurrent` 使内容 ready 保持 false；全匹配才恢复 ready。真实行编辑、modelReset、字体／几何变化仍沿原失效路径处理，generation 隔离旧回复，隐藏时取消并销毁 worker。

SongHandoff 的 holding 通知早于 epoch；原实现此时给出 `{}`，主题名短暂回退到 `light`，而真实 Folia 以 theme.name 作为布局 seed，不能忽略这个字段。现在在非 holding 阶段预持最新外观克隆，进入 holding 即可读取 A 的完整 metadata，原 epoch 冻结继续生效。

永久 CPU QML 回归覆盖完整相同源保留、最后一行逐音节／翻译变化、真实 modelReset、字体／视口失效、旧 generation 回复与隐藏取消；同源旧 4 pass／5 fail →新 9/9。外观两项旧 2 pass／2 fail →新 4/4；Node worker 协议旧失败→新通过，原有 Fume 数学／源码流测试与新协议合计 13/13。实际 A/B80 两种 DPR 私有运行各 3/3：同 A 文章保持、真实 held 像素可读、暂停配对时钟冻结，完成后 B 的 80 行与新 marker 正确。原 1500 ms fallback、10 s handoff 和 5 s completion 门未改变；原生资源最终归零。

### 本轮证据与尚待统一验证

最后同一私有 binary 的 DPR 1 主进程 13/13（含 DPR 2 source 子进程，共 528 帧），DPR 2 非重复矩阵全组 12/12。不同 size／sourceRect、samples=4、双节点与 12 帧位移均 RGB 0；同一 RenderControl beginFrame 内第二 target 显露另一个 halo，RGB 0。40 代资源回归在 DPR 1 零拒绝，DPR 2 仍有两次原 native 容量拒绝，真实 drain 后仅一次相同输入重交均恢复，peak 分别 84,779,269／133,978,817 B，最终 native 租约归零；未宣称 DPR 2 全无拒绝。

A/B80 的每帧相关 observedAggregatePeak 为 DPR 1 的 82,838,073 B、DPR 2 的 84,511,564 B；native 原子 peak 为 87,043,961／90,543,294 B。此结果是 F archives／E QML runner object／实际 seek FFI `7724b319…` 的明确混合诊断检查点，不能冒称新正式包。正式 E 另有实际双模式结果，详见其历史证据。

本轮 managed 证据位于 `build/folia-fume-source-identity/`：`f-cull/render-tests/final-runs/`、`layer-ready-runs/`、`production-h-freeze/`、`production-p-freeze/`，以及 `build/folia-fume-production-qa/f-cull-handoff/`。均记录 checked build、exe／producer／FFI SHA 与 owned 进程退出。原 field／UBO／sampleCount／identity／主题 seed 的 RED、guillotine 反证及无效探针没有删除。

永久测试为宿主 `GlyphRunCanvasRenderingTest.cpp` 和插件 `tst_FoliaFumeSourceIdentity.qml`、`tst_FoliaSongHandoffAppearance.qml`、`tst_FoliaFumeHandoffCensus.qml`、`folia-fume-worker.test.mjs`。80 行 PCM 用例须在独立进程设置 `FOLIA_HANDOFF_ONLY=1`；默认测试集只跳过该真实 PCM 用例，不启动第二个音频引擎。

此前 80 行资源抓图包含锁屏检查；本轮最后 capture 专项实际观测 window active=true／ApplicationActive。两类均不能替代编译、后台任务停止后的前台安静性能。最终统一模块、插件包、80 行／双模式／A/B 的正式复验仍待 root 的统一构建，不能沿用旧 executable／dylib 假设。跨模式四项文章 LRU 仍未实现；本轮只复用同一实例已有的完成 job，不宣称与上游相同的暖启动性能。

## C／E 修复前集成记录（历史检查点）

以下保存修复前的正式检查点、当时的待办与锁屏状态；不表示本轮仍处于相同阶段。当前状态以文首为准。

### 2026-10-29 早期检查点

正式 C 版已通过固定源码像素、通用资源恢复和原有 static 回归；实际播放索引下的 80 行亮正文也已验证。随后真实双模式捕获发现多 render pass 的纹理分配与 UBO 覆盖问题，歌曲交接另发现 FumeBatch 异步代次错配。修复及永久回归现已冻结到 E 候选，等待统一构建后重新验收；私有修复结果不替代 E 的正式结论。前台性能仍未测量。以下区分正式检查点、私有验证和历史负例。

### 参考与原门槛

固定 source oracle 在采样前后由 CDP 记录 **Chrome 156.0.8078.73 / Graphite Dawn Metal**，`getContext('2d')` 没有传 options；这描述参考生成时的浏览器，不代表此刻安装版本。该固定语料在 156 重生后与旧 155 默认结果逐项一致，只证明这些输入的一致性。对应 Skia 为 `a65b5cc03a5131808aec172085b7074fc66625b9`，采用 Graphite 的浮动中心、边界重采样与最多 σ4 的两轴模糊；不能以旧 Ganesh `GrBlurUtils` 解释默认 Canvas。

永久 `GlyphRunCanvasRenderingTest` 读取受版本管理的 `tests/fixtures/glyph-run/folia-default-canvas-matrix.json`，保留完整字体、字号、alpha、CTM 与默认 Canvas 来源。正式 post-format 模块在 DPR 1 主进程及 DPR 2 子进程通过全部 528 帧；另一个 DPR 2 主进程也通过全部用例。

| 语料                                                    | DPR 1／2 总帧数 | 原门槛与结果                                       |
| ------------------------------------------------------- | --------------: | -------------------------------------------------- |
| 7 blur × 3 scale × 4 alpha                              |             168 | mass／σX／σY 均 <15%，X/Y 重心偏差 ≤1 logical px   |
| scale／整数 blur／fill alpha／shadow alpha 连续联合变化 |             240 | 同门槛全部通过，含原 density bank 的 8 个 RED pose |
| blur 0/1/2/4/8 × 3 scale × 4 alpha（含 0）              |             120 | 同门槛全部通过，零 alpha 无残留                    |

两种 DPR 均逐帧检查真实 `(1024 × DPR)²` readback。120 帧连续变化期间 immutable ink uploads 与 revision 不变；每组只有 4 次 source 上传，结束后 native 软件租约归零。正式可执行文件 SHA-256 为 `1172a1c80bfd1224402269293d4876a7c30b994ab10a9759434bea9ac1ab9724`；全部生产源、9 个规范化 shader、实际 QSB 和 fixture 的 SHA 及完整日志位于 managed `build/folia-fume-production-qa/formal-C-postformat/`。DPR 1、DPR 2 主进程各 7/7，通过的 528 帧不是旧原型结果的外推。

此前唯一有效重心 RED 是 DPR 1／scale .22／blur 170.4／alpha .5 的 1.001874 px。根因是 `ceil(logicalRect × density)` 后仍把完整物理图压回未取整的 logicalRect；改为 `QSizeF(imageSize) / density` 映射真实像素范围后，原 case 为 0.881473 px。没有改字体、像素、位置、alpha、gain 或门槛。旧失败、em-middle／physical-grid 反证、强制 `willReadFrequently:true` 的 CPU 负例及新旧 fixture 映射均保留。另一次 probe 漏设窗口最小尺寸，造成 DPR 1 的 1024×1018 与 DPR 2 的 1920×1018 裁字，整批标为无效，不能引用其中任意绿项。

原 `GlyphRunTest::largeHaloBudgetsKeepEnergyMomentsAndFrameCache` 已改用真实 `haloSampling: "canvas"`，保留三档 fractional blur 127.8/170.4/213、15% energy／σX、PNG 与 120 帧稳定性检查。原 static 超容量拒绝仍为独立 validator，同 ink 数学专项继续使用自己的 oracle。正式 C 构建的原 `glyph-run` 与 `image-capture` CTest 均通过，原 45 s 超时不变，日志在同一 `formal-C-postformat/`。

### 有界准备与生命周期

每个 window 共享 4 个无 depth／stencil、无 MSAA 的目标：3 张 1024² RGBA8 和 1 张 1024² RGBA16F，color 合计 20 MiB。透明清边 CPU 图、metadata、curve 与各 item 动态 UBO 共同受原 32 MiB effects 约束；ink 仍最多 8 张 1024² RGBA8／32 MiB。immutable source／outline、CPU／GPU、排队及未实际退出的取消任务进入同一 128 MiB native 软件账本。该账本不表示 Qt 字体引擎、驱动缓存或进程 RSS 的物理上限。

字体准备共用单一 worker，最多 32 个排队／运行任务；完整 QFont 在 worker 重建，QTextLayout／QRawFont 不跨线程，只发布像素、路径、指标与标量。唯一 running job 预留 40 MiB scratch。字体线程约束依据 [Qt QRawFont 文档](https://doc.qt.io/qt-6/qrawfont.html#details)：QRawFont 归创建它的线程，换线程必须重建。

永久 CPU 测试覆盖重型字段同步原子拒绝、完整中阿 emoji 字体测量、64 代取消真实 drain、完成／取消通知重入、异步容量失败清空当前派生资源，以及隐藏后清理和配置更新不排队、显示后才准备。修前同源 9 pass／3 fail，修后 12/12；正式 post-format `glyph-run-canvas-preparation` CTest 通过。GUI 同步输入拒绝保留已接受状态；后台准备失败清空当前渲染并报错，保留请求配置，二者不是相同回滚契约。

永久 RHI 回归还覆盖 parent scale 1e12 在规划前明确拒绝、font styleName 在序列化前纳入有界输入、GPU errorChanged 同步重交新一代恢复，以及保留同一 window pin 的连续 40 代换字和错误恢复。DPR 1 无预算拒绝，peak 为 84,777,125 B；DPR 2 在第 16、33 代各发生一次明确的 native 预算拒绝，真实 drain 到同一 pin 的 58,930,060 B 后，只允许一次完全相同 run／font／pose 的显式重交，均恢复。DPR 2 peak 为 133,976,673 B，低于 134,217,728 B，最终均归零。没有把 DPR 2 宣称为 40 代零拒绝；最初假定永不拒绝的 RED 仍保留。

### 多 render pass 与异步发布（E 候选，尚待统一验收）

实际 C、D runner 的 DPR 2 完整 80 行 Fume→Monet 捕获均触发 halo texture capacity 错误。独立回归进一步记录同一节点在多个离屏目标与主目标间重复 prepare；4 张共享 halo field 原本只在 beforeFrameBegin 清空，而普通 grabWindow 的独立 QRhi 帧没有该信号，导致重复分配。只修复 field 复用后容量错误消失，但不同投影的 capture 与参考图 RGB 最大差仍达 170。原 Dynamic UBO 的 offset 0 被后续 pass 覆写是独立的像素问题，不能只修分配记录。

E 候选在同 pass 全部节点 prepare 后，等 render 消费，再允许下一 pass 复用 halo fields；每个节点在一帧内保留不同 UBO／SRB 槽，下一真实帧才复用。每帧最多 32 槽，兼容的 render-pass descriptor／sampleCount 管线缓存最多 32 项，并继续受原 32 MiB effects 和 128 MiB native 总账限制；没有预分配 32 份或增加预算。原 4 MiB 透明 CPU 图、4 个 effects target、shader 和源效果均保留。另一独立 samples=4 capture 使旧单管线出现 RGB 最大差 127，按 descriptor 兼容性与 sampleCount 选择管线后，DPR 1／2 均为 0。

普通窗口使用每次 beforeRendering 作为槽复用起点：Qt 6.12 的 [threaded grab](https://github.com/qt/qtdeclarative/blob/v6.12.0/src/quick/scenegraph/qsgthreadedrenderloop.cpp#L411) 自行 beginFrame／renderSceneGraph／endFrame。RenderControl 则使用 beforeFrameBegin：[beginFrame](https://github.com/qt/qtdeclarative/blob/v6.12.0/src/quick/items/qquickrendercontrol.cpp) 只发一次该信号，同一 QRhi frame 内可以多次 render，并多次发 beforeRendering。新增永久回归分别覆盖两节点、三个不同 sourceRect／target size、12 帧位移、samples=4，以及同一次 RenderControl beginFrame 内两个不同投影的早期结果。私有前三类 DPR 1／2 RGB 最大差 0、source uploads／revision 不变并真实 drain；新增 RenderControl 用例目前仅编译成功，须待正式 E 实跑。

FumeBatch 的独立同 key 回归还确认：0→160 的新 runs 已 accepted、preparing=true，但 publish 仍读旧 metrics／halo limits，立即报「This run has no halo texture budget」；反向 160→0 原本通过，没有将其虚构成 RED。E 候选拒绝准备期间 publish，以已发布 signature 隔离新旧指标和 poses；Fume.renderReady 同时要求实际 posesCurrent。私有两向、两种 DPR 全部通过，准备时不报告内容 ready，新 metrics 成功发布后才恢复可见。CPP 已在 runs 改变时清 poses，没有增加无根据的重复清理。

记录位于 managed `build/folia-fume-multipass/`：`diagnostic-red-*`、`fields-only-*`、`slots-*`、`two-nodes-*`、`sample-red-*`、`rp-green-*`、`moving-green-*` 及各自 checked build／producer SHA。`batch-generation-red/` 与 `batch-generation-green/` 保存真实新旧 signature／runs／metrics／preparing／poses 状态。正式 E 冻结清单为 `build/folia-update-20261028-r2/canvas-E-freeze.json`，不能将较早私有 checkpoint 的绿项冒称最终 E。

### 实际 80 行与剩余边界

正式 C QML runner `6bf96fab1fe99e99616a05a70441eb3156bc1b78ab619745d532b9f51b5f08f4` 在 Cocoa／Metal 下运行真实 ReadModel／ICU 的两篇完整 80 行文章，保留默认 glow=1、第二场 glow=0、4 列与 hero、119／84 次 native measurement、5／4 次 refinement、8／7 组和每组 16 个完整 context。准备 60 s、native-ready 30 s 原 deadline 不变。窗口使用独立真实 QQuickWindow，在显示前固定 min=max=1100×820，逐场严格确认 DPR 1 的 1100×820 与 DPR 2 的 2200×1640 抓图，避免 QuickTest view 被屏幕压缩裁字。

| 环境        | 两篇准备至全部 GPU ready | native 账本 peak | 隐藏 100 ms 后 |
| ----------- | ------------------------ | ---------------: | -------------- |
| DPR 1，锁屏 | 15.018 s／8.720 s        |     85,596,389 B | 两场均 0 B     |
| DPR 2，锁屏 | 15.112 s／8.901 s        |     90,959,917 B | 两场均 0 B     |

两端各 3/3，日志、输入 SHA、每个实际 fragment／font／pose／共享池总账和单调时钟位于 managed `build/folia-fume-census/canvas-C-locked/initial-preprint-resource-proof/`。这些 time=0 帧证明真实资源与未来低 alpha 文字存在，不替代活动正文、真实歌曲／模式过渡或前台性能。额外 seek=12 的截图必须同时提供正确 sourceIndex；旧 fixture 的 currentIndex=-1 保持总览相机，会把已打印前 4 行放在视口外，相关亮度失败独立保留，不能据此推断字形丢失。

补齐 sourceIndex=3、time=12 后，再让实际音乐 pose 时钟自然前进以完成相机 retarget，正式 C 亮正文测试 DPR 1／2 各 3/3。四张图最大通道为 241／233，RGB>32 像素分别为 DPR 1 的 18,679／7,169，DPR 2 的 64,604／24,379；完整物理尺寸不变。native peak 为 87,219,311／90,993,977 B，两场隐藏 100 ms 后均为 0。输入、实际生产 SHA、单调时钟和 PNG 位于 `build/folia-fume-census/canvas-C-clocked-index/`，先前错误索引、冻结相机时钟与重复递归测试发现的无效 fixture 均保留。

D 的私有 Canvas UBO／field 修复 checkpoint（尚非最终 E）通过完整 80 行 Fume→Monet→Fume 两种 DPR，各 3/3；真实 hasFrame、新 swap、加载卡、正文和全部效果保留。每帧相关总账 observedAggregatePeak 为 DPR 1 的 **81,651,721 B**、DPR 2 的 **110,294,068 B**，含实际 native、Fume decor、Monet 与 transition textures，最终 native 均为 0。不能使用较低的离散 census 事件最大值 78,396,244 B 代替 DPR 2 的真实峰值。证据为 `build/folia-fume-multipass/dual-slots-d1/` 与 `dual-slots/`，保留原 D2 RED 和精确私有 archive 替换来源。

真实 A/B 歌曲使用同一个 Fume renderer 的 SongHandoff hold／project；Fume 不启用仅 Monet 使用的 active songHandoff。QA 已修正误读该 active-only 属性和不存在的 Fume.songTitle，改查实际 foliaSongHandoff 对象、Stage 元数据、outgoing lyrics 与完整文章；无效探针独立保留。最新 D 的 A/B 仍有原 10 s handoff-wait deadline RED，未归因或放宽，等待完整 E 重新观察实际 native／cue 状态。

当前机器锁屏。以上抓图与软件资源门是程序化 Cocoa／Metal 检查，**不作为前台性能结论**。原 1500 ms fallback 没有增加：上游允许长歌超时后显示 Hourglass，timedOut 不表示空白，forced start 也不表示歌词已 ready。最终 E 仍须重跑永久质量门、80 行、实际 A/B 与模式切换，不能沿用旧 archive／动态库假设。

### 文章 LRU 与准备卡语义（只读源码核对）

固定上游 `VisualizerFume.tsx:39–50` 的模块级 Map 最多保留四篇完整文章；`191–211` 在命中时复用文章，未命中仍执行同一 `buildArticleLayout`。`fumeArticleLayout.ts:170–198` 的键包含视口、字体/主题、歌词字号、heroScale 及歌词内容摘要，刻意不包含播放位置、暂停和音频帧。它是暖启动优化，不是布局或打印内容算法必需的输入。

当前 `FumeLayout.qml:64–96` 与 `worker.mjs:51–74` 每次重新读取、分词并运行全文准备，没有跨模式文章 LRU。`prepare-job.mjs:19–55` 在完整原生测量收敛、没有 pending measurements 后才发布文章。缺少 LRU 会增加切回 Fume 的准备时间及加载卡停留时间；在同一歌词、几何、字体和 ICU 输入下，不因重新运行 worker 改变内容算法。不能据此宣称与上游相同的暖启动性能，也未以缓存绕过冷启动 80 行验收。

后续若补缓存，保守方案是仅存已完成的纯文章数据，由当前 presentation 持有，跨模式复用但在 scope 关闭、账号退役及歌词模型失效时清空；不缓存 worker、operation、原生字体、renderer 或 GPU 对象。四项 LRU 还须有独立的软件字节预算，超预算只放弃缓存并走原完整准备，不截断文章。键需核对完整有效字体、视口/几何、原始歌词和逐词/逐音节时序、转换/偏移及模型代际，不能只凭曲目 ID 或旧 source hash 命中。该方案尚未实现，不算现有资源或性能结论。

原 `VisualizerFume.tsx:197–201` 在提交 article 时结束 `isLayoutPending`，加载卡只由该 pending 控制（`352–395`）；Canvas effect 同步 `draw()` 后才单独报告首帧（`321–324`、`useFumeCanvasStage.ts:281`）。因此源码没有要求准备卡额外等待独立 GPU-ready 状态。Qt 的 `FumeLayout.qml:145–149` 同样在文章提交时结束 busy，但原生字形仍有额外异步准备；`Fume.qml:42` 的内容 `renderReady` 与 `461–468` 的 busy 加载卡应分别观察。只有真实像素证明这段缺少可见内容时，才需单独调整加载覆盖，不能改写 busy、放宽内容/性能就绪门，或把原 1500 ms fallback 当作已提交歌词帧。

## 历史实现记录

以下保留 2026-10-23 各阶段的结论与失败来源。涉及「当前」「交付」或未实现项时，均指其章节日期的检查点；本轮状态以文首为准。

## 顺序全文准备的自然事件循环回归（2026-10-23）

旧QtTest同步函数把“默认辉光80行→另一首80行”的第二场准备误判超时：完整RED为271.687s，临时禁AppNap后仍127.953s超时，均保留在`build/folia-fume-sequence-{step-trace,activity}-dpr2.log`。没有以增加timeout、减少原效果或跳过refinement处理。

独立Worker内计时与macOS sample确认主要延迟是GUI往返：坏运行前10.52s仅917ms用于57次iterator.next，主线程95%采样在`QtTest::qWait→nanosleep`，Worker2095/2161采样在poll空闲。Qt6.12官方`QtTest/TestCase.qml:571–600`的tryVerify每次`wait(50)`、仅累计50计数；后台实际间隔约200ms，60s参数会膨胀到约240s墙钟。SignalSpy.wait也使用同类轮询，不构成独立修复。GC不是主占比，未改变产品算法或Worker生命周期。

`tests/qml/tst_FoliaFumeWholeArticle.qml`先在Qt外层事件循环中顺序驱动两个真实Fume场景，使用真实ReadModel/ICU/GlyphRun测量、80行全曲、默认光晕、全部原分组与缓存限制、seek及设置不重测，隐藏后立即与100ms均核对groups/cache/article释放；完成后才使TestCase.when为true。原准备60s和原生就绪30s各自作为实际Timer deadline。通过现有原生fixture的QElapsedTimer记单调起止，另记Date.now墙钟起止；日志`FUME_WHOLE_ARTICLE_TIMING`才是准备时长，**QtTest Totals只覆盖之后的断言，不包含准备墙钟**。旧`tst_FoliaFume.qml`移出这两个重case，保留其余单项；不将旧同步combined suite虚报为绿。

产品只移除临时workerStepCount/continuationBatches诊断，step(16)、8ms切片、32轮上限、所有source布局/测量/效果和128MiB预算完全保留。Node源oracle12/12通过。自然循环无debug/no activity的首次生产目录DPR2对照为30.842s+26.999s，4轮/84native批和8/7真实groups保持；tracked专项的最新DPR1/2数字见下方交付验证记录。诊断脚本、坏调度sample和所有失败日志均在ignored `build/folia-fume-diagnostic/`，不进入产品。

### 历史交付检查点（2026-10-23）

最终同一tracked自然测试文件与实际Fume业务目录，Cocoa Metal、不加载activity.dylib：

| 场景 | 单调总时长（含seek/设置/退役） | 两篇文章准备+GPU就绪 |          两篇实际CPU缓存 | 结果       |
| ---- | -----------------------------: | -------------------: | -----------------------: | ---------- |
| DPR1 |                        47.217s |    28.169s / 17.603s |   9,977,468 / 8,349,168B | 3/3、exit0 |
| DPR2 |                        56.943s |    30.806s / 24.495s | 31,687,504 / 28,871,392B | 3/3、exit0 |

两端保留119/84 native batches、5/4 refinement rounds、8/7 groups（每组完整16 contexts，尾组4/12），显式确认每组glowEnabled与1/0源配置相同，hidden立即及100ms groups/cache/article均释放。DPR1/2进程峰footprint分别见`whole-verified-dpr1-time.log`与`whole-final-dpr2-time.log`，DPR2为496,027,160B。原剩余轻量suite完整DPR1 16/16、23.436s，DPR2 16/16、26.108s；包括24行真实像素、80→8取消、暂停不重shape、1858px measurementOnly、拒绝分组重试与128MiB超限释放。两套Node source oracle合并19/19。日志路径均为`build/folia-fume-diagnostic/`。

Fume产品37文件最终冻结SHA256（排序name+NUL+bytes）：`d5a5765c0f7fa3ded7898e0efde21031ad1812a1bf452ee2216ea8854bdd1c23`。本节只确认准备/生命周期/既有原生回归，不替代下文Canvas宽halo、字体及其他平台的像素边界。

## 默认辉光与首帧修复（2026-10-23）

真实Release矩阵首次暴露默认辉光问题，同时探针在等待期间跨事件循环持有旧renderer指针而崩溃；这两件事分别处理。探针改为每次查询当前视觉树。真实QML专项复现出初始commands在Component.onCompleted之前即被原生atlas拒绝，`onBudgetRejected`的completed门控丢掉拆分请求；owned Timer现在无条件排队、触发时检查组件存活与池成员身份。缓存汇总也移到owned Timer，避免在cacheBytes绑定通知中销毁正在计算的池。

原来每个body和line-glow都预留512、本来没有阴影的waiting static也预留160。现从未修改的source draw公式求每个context的完整shadowBlur上界，并以source `CAMERA_SCALE_MIN × DPR`换算local sigma，选择能容纳它的既有原生半径档；没有修改实际blur、透明度、文字、相机、顺序或任何效果开关。body上界覆盖active/passed两分支，line-glow覆盖全部envelope，static snapshot按其实际固定blur；不随帧进度重新shape。显式越过1024仍报错，不能夹取。renderReady另要求全部groups均接受且无错误，避免把部分字形的首帧当作完整就绪。

新Node source-envelope专项先RED（waiting 160≠0），修复后整个Fume Node12/12。实际80行、中英混排、默认辉光专项DPR1通过（28.245s，缓存9,977,468B），DPR2同项通过（31,687,504B）；显式初始effects容量拒绝拆分在DPR2通过（3/3，2.089s），保留全部16个完整context及顺序。测试夹具手动pool没有article，故用完整接受的原生metrics与真实拆分检查；不把其renderReady误当成true。DPR2整套和重新打包后的性能仍在继续，旧宽halo像素门槛仍未解除。

固定参考：Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`。本模式使用整曲文章、多列布局、hero、逐字打印、上下文淡化与相机；没有用单行视图代替整曲文章。`sources.json` 记录原文件 SHA-256、编译器与复用模块的 SHA-256。

## 来源与算法

| 原始路径（`src/components/visualizer/fume/`） | 保留内容                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `fumeArticleLayout.ts:201,484`                | 每个 block 后 yield 的完整文章 generator；列数选择、8 次 density 搜索、确定性洗牌、hero 跨列和较矮列放置          |
| `fumeTextMeasure.ts:275–395`                  | pretext pre-wrap 测量、24px 以上的 fit guess、半像素 regime、8 次字号搜索；最终及前缀宽度全部来自真实原生 shaping |
| `fumeReveal.ts`                               | 原始 word/syllable 时刻、EGC 打印数量、frontier、renderEnd 与下一有效行 cutoff                                    |
| `fumeCamera.ts`、`fumeCameraStep.ts`          | smooth/stepped、段间桥接、overview、弹性与速度上限、源 `.22..2.24` camera scale                                   |
| `fumeBlockFrame.ts`、`fumeTextStyle.ts`       | waiting/active/passed、双静态层淡化、textHoldRatio、overview 恢复                                                 |
| `fumeCanvasText.ts`                           | 原始完整 segment 绘制与每 EGC 样式、line glow、打印矩形；适配器只记录绘制指令                                     |
| `FumeBackground.ts`                           | 原始 ring/square/cross/spark、确定性分布、视差、渐变、真实音频分段响应                                            |
| `VisualizerFume.tsx:182,338`                  | 已完成布局重建的 96ms debounce、首字前 `.985` / 首字后 `1` 的 450ms presentation scale、准备卡片                  |
| `useFumeCanvasStage.ts`                       | 可见区域 overscan、源 draw/暂停职责、背景与正文层次                                                               |

`build-folia-fume.mjs` 固定检查参考 HEAD。文章生成器通过已有 TypeScript 5.9.3 编译成标准迭代器状态机：Qt 6.12 QV4 在这个复杂原生 generator 中出现 SIGSEGV，已保留 `build/folia-fume-native/crash-*.txt` 和 LLDB 回溯。状态机保留每次 yield、返回值、throw/return 协议；不是同步重跑或假异步。完整字段 oracle 继续与未经改写的原始 generator 比较。

pretext 0.0.9 使用独立的 per-Worker 测量上下文。复用已固定的 Cadenza Unicode17 property ranges、字体栈、颜色和 word coloring；未新增应用依赖，没有复制整个 node_modules。所有运行时 `.mjs` 必须通过 Acorn ES2016。

## 公开输入与准备边界

标准 Stage 输入：`preparedLines`、`currentIndex`（允许 -1）、唯一播放时间 `timeSeconds`、`baseFont`、`settings`、主题色、`dark/live/motionEnabled/paused`。

Fume 额外接收：

- `lyricSource: EchoPluginReadModel`：真实 `page.player.lyrics`，只调用公开 `row(index)`。
- `lyricCount: int`：公开 `LyricTimeline.information.count`，不依赖 SDK 未列出的模型继承方法。
- `lyricOffsetMs: real` 与 `trackRevision: string`：分别绑定 timeline offset 和 `player.revision:offset:count` sourceKey。
- `textService: EchoPluginText`：真实 ICU4C 78.2 word pieces；不存在 QtWord 或 Intl 近似。
- `themeName: string`：宿主真实 `appearance.selectedTheme` id，未选择时明确映射为 dark/light；不冒充 Folia 同名主题。
- `avatarSeed: string`：宿主曲名种子；`backgroundColor` 供准备卡片使用。
- `audioBands: var`：真实规范化完整频段 map；与 `bassPower/vocalPower/audioPower` 一样在边界转换成源 0..255。缺失频段为 0，不以 bass 代替其他频段。

全文每轮读取最多 64 行 / 65536 UTF16，Qt sequences 先 JSON 转成 plain 数据；`Adapter.toFoliaLine` 保持行 startMs 已带 offset、parser words/syllables 再加 offset 的真实契约。filtered/空文本不排版，保留原始 `sourceIndex`；只有真实 boolean `isChorus` role 才传入，当前宿主缺失该角色时不推断副歌。

完整文章 ready 后自行从原始 sourceIndex 序列取得下一有效行时刻，避免稀疏 preparedLines 误序。camera focus 直接使用原始 sourceIndex，允许 currentIndex=-1；没有把过滤后的数组下标写回播放索引。

`ArticlePreparation.step(16)` 在 Worker 运行原始 iterator，每轮约 8ms 截止。未知宽度只返回下一轮 `{phase:'measure', requests}`，临时文章不会发布；原生隐藏 GlyphRun 按每轮最多 64 runs / 1024 UTF16 测量，一条完整 context 可单独达到 8192 UTF16。真实宽度返回 Worker，再进行下一轮原始算法。字号按原生 QFont 整数像素规则取整，保留完整前缀 shaping，不能估计字符宽度或缩放错误字体的宽度。

原始 fit guess 可超过最终字号范围：真实三行“星”/“a”、1100×820、lyricsScale1.4/hero1.32 的最大 query 为 **1850.0083286591862px**，最终文章字号仍小于 152px。必须使用显式禁 GPU 的原生 `measurementOnly` 高字号能力；旧的 256px run 上限会明确失败，不夹取 guess。

每个请求携带 generation 与 trackRevision。modelReset/dataChanged/rowsInserted/rowsRemoved、offset/count/revision 改变会取消 ICU、清除旧文章并重启。geometry 改变保留上一个可用文章并 debounce；live=false 或 visible=false 立即销毁 Worker、取消操作、释放可见 renderer。

Worker 每个 message 入口先 JSON deep-clone 为 Worker 自有纯数据，再保存跨轮 state；Qt WorkerScript 的入站 backing 数据不能作为多轮任务的持久值。原生 generator 在加入这条所有权边界后仍复现崩溃，因此当前同时保留标准 iterator 降级，未将两个问题混为一因。

硬预算：全文 8192 原始行 / 1Mi UTF16、65536 独立 width queries、32 refinement rounds；可见池最多 32 GlyphRun 组，每组最多 16 完整 shaping contexts，普通批次 1024 UTF16；原生自身的 runs/clusters/8 正文页/4 effects 页限制继续原子拒绝。跨池公开 `totalCacheBytes`，每个 GUI turn 只创建一组。全部组已保留 CPU atlas images 的合计阈值为 **128MiB**；超过即报告整体错误并释放所有组，不截断可见歌词。原生单组无预留 API，新建一组自身上限 64MiB，因此检测前瞬时边界为 **192MiB**，并非从不超过128MiB的分配器硬限；GPU 纹理副本不包含在该 CPU cacheBytes 统计中。实测 DPR2 压力输入在 144,793,600 bytes 检出并释放至 0，常规80行 glow=0 DPR1为12,428,388 bytes。全文几何为纯 JS 数据，GUI 不为全曲创建 Text/GlyphRun。

## 时钟、绘制和阴影单位

词/音节打印、active/passed、颜色尾迹、overview 的语义时刻均来自唯一 `timeSeconds`。原始 source 暂停后停止 requestAnimationFrame；此适配同样暂停绘制循环，但 seek 或静态输入变化仍可重绘。相机弹性 dt 与 ambient 的本地 presentation 时间仅用于 UI 数值收敛/漂移，不推进播放进度。loading pulse 和入场 scale 是独立 UI presentation。

可见 blocks 保留完整 pretext segment 的一次 native shaping，随后只改安全 cluster poses。静态层使用整 renderLine shaping；live 层保留原始 segment shaping context。同一 shaping context/font/预算未改变时不重传 runs，暂停改颜色/相机强度也不重新排字。

`utils/glowBlurQuantize.ts:62,75` 明确 Canvas `shadowBlur` 的 Gaussian σ为 rawBlur/2，且不跟随 CTM。原生 halos 半径是 σ，因此 Fume 使用：

```
localSigma = sourceShadowBlur / (2 * cameraScale * devicePixelRatio)
```

这与 Cadenza 的 CSS text-shadow 随元素 transform 缩放不同。line glow 与前景 glyph shadow 分层；原始 fill alpha × shadow color alpha × globalAlpha 只乘一次。源最大合法最终字体保守上界 `58×1.4×1.42×1.32=152.20128`；line rawBlur 最大 213.374 device px，camera≥.22，因此 DPR≥1 时 local σ≤484.941，512 可覆盖。DPR<1 或外部越界参数超过能力时明确报错。没有把 radius 夹到 160/512。

真实原生测量文章产生的 Chrome 参考指令：`build/folia-fume-native/canvas-reference.json`；font151.540719、weight780、原始 source lineGlow raw213、fillAlpha.756，camera=.22 是明确标注的合法保守投影。CSS40 / Canvas raw40 的独立 Chrome 单位参考见 Cadenza 文档。大的低分辨率 Gaussian atlas 与 Chrome 8bit 尾部不声称逐像素相同。

## 必须保留的差异

- Canvas 边界把 TAB/LF/VT/FF/CR/U+2028/U+2029 逐 UTF16 单位替换为空格，保留长度；真实 Chrome 测量这些控制字符与空格同宽。仅用于原生测量与绘制，不改 pretext 的 pre-wrap 输入、ICU indices 或 Unicode EGC。NEL/NBSP/其他 Unicode 空白没有泛化替换。
- Qt/Chromium 字体回退、字体 raster、原生整数像素字号与浏览器小数 CSS px 不同；使用真实 Qt 宽度不代表会得到相同 Chromium 换行。源码 fit regime/优化原样保留。配置 font fallback chain 取真实宿主 QFont，CSS stack 保留为来源元数据。
- 参考源码 live `drawRenderTextRun` 在完整 segment 上执行矩形 clip，连同阴影裁切。适配器保留每个区间的完整 `clipRect`，当前原生安全 cluster 以最早 EGC 取样，不能把同一 ligature 切成多个不安全字形。需要通用原生 clip/多实例支持才能保留同一安全 cluster 的多个颜色片；目前不声称这类连字、斜体 overhang 与 Canvas 裁切等价。
- clipRect 相对 source fillText 起点（middle baseline）：`{x:prefixLeft,y:-max(width,1)-64,width,height:max(128+width*2,256)}`；若映射到原始 run 左上，y 再加 `metrics.baseline-(metrics.emAscent-metrics.emDescent)/2`。clip 必须在 Gaussian 后裁切正文和 halo。
- 原生 whole-run middle baseline 使用主字体 em-box 中点；fallback 字形会改变 QTextLayout 行框，不能用 `height/2` 代替。原生 em 指标与 Blink 主字体 OS/2 归一／1/64px 规则已独立对照，字形栅格本身仍存在平台差异。
- Canvas 几何背景及打印矩形使用 Qt Canvas，原始数值/层次/色彩保留；其 blur/渐变 raster 与 Chromium 不声明像素等价。loading Hourglass 是原生路径适配，不复制外部图标包。
- 原版跨页面文章 LRU 为 4，此实例仅保留当前文章及进行中的纯数值准备；隐藏即释放。默认共享字幕仍由 Stage 的统一 SubtitleOverlay 实现。
- ICU版本/Unicode17已固定，locale为空使用真实宿主服务默认；不声称未运行的参考 Electron locale 与宿主默认必然相同。

## 设置

| flat key                         | 默认   | 来源范围                                     |
| -------------------------------- | ------ | -------------------------------------------- |
| `fumeHidePrintSymbols`           | false  | boolean                                      |
| `fumeDisableGeometricBackground` | true   | boolean                                      |
| `fumeBackgroundObjectOpacity`    | .5     | 0..1                                         |
| `fumeTextHoldRatio`              | 1      | 0..1；1永久保留，其余全曲比例 clamp2.4..130s |
| `fumeCameraTrackingMode`         | smooth | stepped / smooth                             |
| `fumeCameraSpeed`                | 1      | .55..1.85                                    |
| `fumeGlowIntensity`              | 1      | 0..1.8                                       |
| `fumeHeroScale`                  | 1      | .82..1.32                                    |

共享 `lyricsFontScale/fontWeight/wordColors/animationIntensity/showText`；无额外 Fume fontScale。界面 step 可采用 .01 或 .05，但并非源码声明的 step。

## 验证与许可

Node oracle 对照原始完整文章字段（16/80行、两种 viewport）、smooth/stepped 共 200 camera frames、全部 Canvas draw 指令以及 clip rectangles，另验证 measurement refinement 的最终数据与直接精确宽度的结果一致。原始 Worker 原生 generator 的失败与 TypeScript 状态机的实际 Worker 成功都有证据。

真实 readmodel/native QuickTest 覆盖 80 行全文、model reset、sourceIndex、currentIndex=-1、暂停静态重绘、拒绝保持及恢复和真实 Metal RGB。80行实测 2 read batches / 42 native batches / 2 refinement rounds；整套早期无 glow 功能测试约 13.7s。最终 measurementOnly / halo / clip 状态以交付时的新鲜测试结果为准；没有把旧 256px 短行失败或尚未支持的 clip 标为通过。

### 历史冻结边界（2026-10-23）

本轮冻结源码／生成脚本／默认配置清单，**Fume 尚未注册为已完成模式**。全文 Worker、原生 measurementOnly、完整文章／相机／打印指令及 glow=0 原生 RGB 已有测试；仍须完成：

1. 将当前完整 source clip 指令接入正在开发的通用原生 post-Gaussian clip／ordered instance API，同一安全 shape context 保持原样。
2. 宽 halo 与真实 Chrome 源指令的 alpha／二阶矩验收。原生作者目前的512级结果仍不符合参考，不能宣称已通过，也没有以夹取或增益补偿掩盖。
3. 新原语冻结后重新执行完整 DPR1／DPR2、最大 glow 与正常80行总 cache 测量。

上述是待完成依赖；本轮不把早期功能结果替代最终像素验收。

Folia 派生文件 AGPL-3.0-only，保留项目 `THIRD_PARTY_NOTICES.md` 与原参考 commit。pretext 0.0.9 MIT 许可随模式保留 `PRETEXT-LICENSE.txt`；Unicode17 数据许可位于 `shared/text/UNICODE-LICENSE.txt`，property helpers 复用 Cadenza 固定产物。TypeScript 5.9.3 仅构建期生成 iterator compatibility helpers，随包保留 `TYPESCRIPT-LICENSE.txt`（Apache-2.0），无 TypeScript 运行时依赖。

## 原生接线与 GPU 装饰（2026-10-23 当前检查点）

宿主正式开发构建已提供 ordered `instance` 和 run-local `clip`。FumeBatch 现在每个源颜色范围绘制完整 shaping context 后裁切正文/halo，移除按最早 cluster 选色的近似。原生阿拉伯“لا”共享字簇先 RED（只有一段），接线后两段红/蓝真实像素均存在；改色不增加 maskRevision/textureUploads。DPR2 完整专项 16/16，包括逐组容量拆分与聚合压力。源允许的152px压力输入在DPR1实测137023920 bytes、DPR2实测140189696 bytes触128MiB阈值后整池释放。每组初次原生拒绝会改用更小的完整 context 分组，保持字形上下文、全部特效与绘制顺序；单个context仍无法容纳时明确报错。

原整页 QML Canvas 已移除。`vector.mjs` 录制未改算法的原背景 draw stream：miter polygon offset／圆弧 round-cap 转填充轮廓，由 QtShapes CurveRenderer 直接绘制四站渐变；大几何无中间位图。最多12个小spark只用各自局部RGBA8表面执行两pass Gaussian，导入前计算物理尺寸与合计字节，4096px边／32MiB逻辑GPU纹理预算拒绝超限；打印矩形以Gaussian积分直接着色，无离屏表面。该数字不包含驱动对齐及其他字形缓存，也不是进程physical footprint。真实scene改变只更新现有delegate，关闭后矢量、阴影表面和stamp全部释放。

新增源背景指令oracle在横竖屏、3时刻×3频谱值逐字段深等，Node 11/11；DPR2原生装饰4/4（包含先拒绝超大表面），DPR1出图与资源清理通过。原始Canvas同条件800×400、DPR1/2、0/1/3秒共6对图：前景RGB平均绝对差DPR1为3.69–4.52/255、DPR2为2.67–3.13/255，仍有细线抗锯齿差异，不能用空白背景均值宣称逐像素相等。复现脚本`build-folia-fume-reference.mjs`与现有capture工具，图位于build/folia-fume-{reference,vector-native}。字形宽halo的两项Chrome差异仍未通过；Fume已进入开发选择器并在真实安装包验证，尚不宣称最终视觉或性能验收完成。

## Canvas middle 接线修正（2026-10-23）

`FumeBatch.qml` 原用 fallback shaping 行框 `height/2` 定位 Canvas middle，现改为 `baseline-(emAscent-emDescent)/2`，源 post-blur clip 的 run-local y 同步使用此偏移。字号、字形、完整 shaping context、颜色、halo 和绘制顺序均不变。主字体 em 指标缺失时明确报错，不回退为行框近似。

先以实际原生指标取得失败，再以独立 Chrome155 Arial40 `alphabeticBaseline=11.03125` 常量定位同一完整 `Ag星😀` shaping context，连同 16px 高的 source clip 比较真实像素。旧实现最大 RGB 差108/255，新实现 DPR1/2 都为0；Latin／CJK／emoji／空白及80.5px浮点字号的主字体 em 与 clip 回归共4/4。日志 `build/folia-fume-native/em-middle-{red,pixels-red,green-dpr1,green-dpr2}.log`，Node原有12/12。该对照隔离的是同字形定位，不将 Qt 和 Chrome 字形栅格本身视为相同。

宽 halo 的原有15%能量／二阶矩门槛继续保留：2026-10-23 检查点的 Chrome155.0.8059.86 重生的8张 source PNG与旧参考逐字节相同；旧 image/globalAlpha 同 ink 路径最大半径能量差15.8752%，后经下述独立文本 alpha 反证更正；端到端源指令 DPR1 仍失败。此基线修正不代表宽 halo 验收通过。

## 宽 halo 严格像素诊断（2026-10-23，原语未改）

2026-10-23 检查点的 Chrome155.0.8059.86 与旧8张源参考PNG逐字节一致，排除浏览器版本漂移。独立 alpha 反证证明：真实 `fillText` 的 fill/global paint alpha 与 `drawImage/globalAlpha` 并非同一路径。三档源文字与“opaque shadow、shadowColor.a=.756，再画 body.a=.756”拆分投影最大 RGB 差都为0；PNG图像的两种路径却差8–9/255。宿主同 ink 测试现采用已证实的文本投影，并每档额外断言该真实文字投影逐像素0差，原5%／15%门槛不变。生产 `GlyphRun.cpp`／shader 算法未改时 DPR1/2 同 ink 均通过；旧 image 反证保留于 `canvas-alpha-split-moments.json`。

源 E2E fixture 同步修为真实151.54071925781247字号与 em-middle，原始参考及15%门槛不变。DPR2通过；DPR1能量仍为203905／196368／207949，对应原Chrome245398／254645／249151，维持失败。Chrome自身同font的直接CTM文字与全尺寸PNG再缩小，也出现正文114741 vs103149和halo最多14.19%差异，故不可把源device-size raster与不可变字形位图视作等价；也未无据新增每帧重建的 rasterScale。

私有候选只在宿主 build 目录：固定8级、双RGBA16F tile、相同4页／32MiB effects上限、W3C三box核，以及线性／四点Lagrange插值。各级不是Fume query硬编码；该核来源为 [SVG1.1 Gaussian三box近似](https://www.w3.org/TR/SVG11/filters.html#feGaussianBlurElement)，偶数前两pass使用相反半像素相位。新候选的低density／级间插值仍属数值近似，没有声称与device-space源逐点相等。线性与cubic候选的DPR1前两点仍越原15%门槛，因此**均未落入生产原语**。不添加gain、dither，不降低字号／分辨率／效果，不提高任何缓存上限。

私有真实缓存测量：151.54px、512预算，1／9／24字分别为 DPR1 738864／7704480／18050816 bytes、DPR2 972928／9415696／23350272 bytes；对应24字准备113／154ms。每种120次实际window抓帧后maskRevision和textureUploads保持不变，hidden后cache为0。该结果仅说明候选满足单池surface预算，不是正常80行跨pool或最终性能验收；额外CPU／GPU成本与残余RED均已报告。现有生产仍为4级缓存。日志位于宿主 `build/folia-halo-kernel-probe/dense-{skia,cubic}-dpr{1,2}.log`。

源动态边界：raw shadowBlur每帧随原envelope计算再round为整数，localσ还除连续cameraScale×DPR，不能假定三个固定σ代表完整运行时。source `fumeLiveRaster.ts` 的每octave48级路径仅在Lab/Linux开关下使用；默认Mac路径仍直接device-size绘制。任何后续精确缓存方案必须先证明生命周期／总字节／排空与稳定帧零重传，不能把每帧blur移到GUI。

上述 middle／clip 生产修复最终完整功能回归为 DPR1 18/18（18.927s）、DPR2 18/18（20.254s），含真实80行／ICU／原生测量／暂停seek／Arabic裁切／128MiB聚合错误释放，Node12/12。日志 `build/folia-fume-native/em-middle-full-dpr{1,2}.log`。Qt6.12已独立证实的 WorkerScript QJSEngine-null connect 警告保持原样，没有过滤。
