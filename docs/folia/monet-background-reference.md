# Monet 共享背景源码对照

固定源版本 `a8da4437cf19723555bd75e4685ca20815fe5b82`。原生入口为 `qml/backgrounds/monet/MonetBackground.qml`；包含完整 1920×1080 静态画图、原异步队列/缓存/180ms Layer effect、full/half 布局、800ms 图片切换与157帧漂移。catalog/config 与外层切歌交接由主线持有。

## 来源与生成

`scripts/build-folia-monet-background.mjs` 校验源 HEAD，生成13项默认/归一化、实际 SettingsCard JSX七项SliderRow范围/步长、完整 drift/painter/pipeline；来源与SHA256在 `sources.json`。来源为 `src/types.ts` 及 `src/components/visualizer/{backgrounds/monet,monet}/` 的 `MonetBackgroundLayer.tsx/monetBackgroundDrift.ts/MonetBackgroundSettingsCard.tsx/tuning.ts/entry.tsx/monetBackgroundPaint.ts/monetBackgroundPipeline.ts/monetBackground.worker.ts`。

运行时严格 ES2016，原 async 工厂复用现有 TypeScript 降为 Promise/迭代状态机；仅把无初始化的 helper t 声明移前、原 ensurePainter 改等价函数声明，避免 QV4 静态预声明警告。没有新运行依赖。

## 入口与就绪契约

`MonetBackground.qml` 接收 `settings/assetsService/coverUrl/customBackgroundImages/backgroundColor/primaryColor/secondaryColor/accentColor/dark/paused/motionEnabled/live`，可选 `staticMode/transparentBackground`。customBackgroundImages首项的真实handle映射原customImage.id，url沿用受控资产URL。全部13个tuning读扁平monet前缀设置。

- `sourceKey`：实际 `resolveMonetSourceUrl`，和原 entry.song 相同；颜色/布局/drift不改变外层歌曲key。
- `renderReady`：首次effect准备前false，处理图片期间false；对应原生presentation图片完整异步解码、shader节点已创建且无错误后true。透明/无源的已完成fallback也可ready。并不声称 `ShaderEffect.Compiled` 是可靠的跨窗口首帧信号；外层协调器仍须观察实际窗口frameSwapped。
- `pictureDrawn()`：已完成状态对应的显示图可用后发出，透明/无源立即完成；`pipelinePending`保留原ARRIVING_MARK语义。
- `pictureCount/cacheBytes/reservedTextureBytes/driftRunning/pipelineController/errorString`供实际资源和错误观测。隐藏/live=false停止Timer、取消元数据/捕获、释放缓存租约和所有图片；恢复重新准备。

外层按sourceKey创建新actor并冻结旧actor输入，等待pictureDrawn/真实frame，再同时切换；该部分由共享BackgroundPresentation实现，不把本组件的普通cover属性更新当作外层交接验收。

## 原异步工厂与实际端点

`createMonetPipeline(environment,{maxEntries=16})`保留原完整异步解码、一个active painter、排队wanted检查/丢弃、holder幂等release、处理结果解码及cache key。Qt端点由 `createNativeMonetEnvironment` 与 `MonetPipeline.qml` 注入：

1. 输入经真实 `assets.sampleImage(source,1,1)` 取得同一后台解码器给出的autoTransform后sourceWidth/sourceHeight；不能拿输出1×1样本尺寸当原件尺寸。元数据队列≤32、同时一个操作，Busy以owned50ms Timer重试。
2. 一个静态GPU painter执行源数学，完成后 `ImageCapture.encode(output,1920,1080,'jpeg',92)`；width/height是最终物理像素，DPR不重复乘。
3. scope自己的JPEG URL由一个异步QML Image完整解码，之后才完成原工厂promise。临时捕获文件不会送进受控Assets源校验，也没有放宽文件权限。
4. 原Blob URL端点映射不可变捕获lease，原revoke释放该lease；工厂dispose/迟到decode/Worker替代端点terminate均有回归，不会在销毁context后再启动painter。

原无界cache扩展为16项（纯工厂参数最多32），仅淘汰无holder的条目；全部被占用则明确报错。按插入顺序淘汰，不称作LRU。ImageCapture另有跨scope的16租约/64MiB编码文件等原生配额；失败保留errorString并按源逻辑显示raw/fallback。

`createMonetLayerState({pipeline,setTimeout,clearTimeout,onChange?,pictureDrawn?})`保留180ms语义：新来源先取得early holder，仍等timed holder发布；同源滑块在180ms后才取，连续变更合并；首张成功处理图直接显示，其后800ms easeInOut切换。迟到结果按effect清理隔离。

## GPU图像与两种布局

`MonetPainter.qml`固定1920×1080，source RGBA纹理与静态RGBA16F水平pass，垂直pass、8bit处理及叠加由最终capture执行。没有GUI像素循环/缩图/编码，也没有每帧viewport Canvas。

- 填主题底色、原cover居中crop、仅图像Canvas filter blur；gray/saturation保留原顺序，wash仍基于处理前亮度，custom/theme accent及shadow/highlight亮度排序不变。
- 原Math.round/clamp8bit、三组渐变和18条1px streak均保留；Canvas gradient按straightRGBA插值。Chrome独立红色alpha1→蓝色alpha0中点为[126,0,126,128]，曾以此纠正错误的premultiplied插值。
- Gaussian使用离散归一权重，在ceil(4σ)截断；这是一种有测量误差的Canvas blur实现，不能声称Gaussian有4σ硬support或等同Skia内部算法。Canvas filter参数是σ，未套用text-shadow的除二规则。
- 原件aspect来自真实元数据，输入decode最长边≤4096且不放大小图。原件超过此尺寸时会由Qt预缩放后采样，和浏览器全图采样可能有细节差异；未声称任意极端图像逐像素相等。

full-overlay：完整居中cover，图像/底色一起在漂移坐标中，readability为静态外层。half-pane-gradient：<640/640..1023/≥1024分别72%/68%/60%，固定外层mask1/.94/.46/0对应0/48/74/100%；图像opacity为昼.7/夜.3+overlay*.16，object-position clamp(50+offset,10,90)%。保留fallback135度三色渐变、raw cover渐变、half附加水平/圆形渐变和最后readability。

`MonetPicture.qml`按源800ms easeInOut（Motion12次二分cubicBezier）做整体图层alpha；相同target不重启动画，退役幂等，快速A→B→A复活旧A并使B从当前alpha退出。最多4张显示/退场图片，极快切换超出即释放最老层，这是明确的GPU预算扩展。

漂移为原240000ms无限周期、157个精确transform、lattice76、最大行程3.4%与额外.01过扫描。`NumberAnimation`只推进0..156相位，三个数值线性插值，shader用逆矩阵采样；half mask保持在外层不随漂移移动。暂停音乐仍继续；staticMode/reduced motion/disabled/strength0/hidden停止。与WAAPI compositor调度存在Qt GUI少量位姿求值的差异，未新增播放时钟。

## 资源边界

跨全部图片与painter的声明纹理预约合计≤128MiB：图片按实际decodeSize预约；painter开始前按input RGBA8+水平RGBA16F计算，超过剩余额度在decode/readback前拒绝。viewport改变也重新核验预约；没有按group乘出多份预算。cacheBytes另报已就绪的声明纹理量。GPU释放要经过后续场景图同步，驱动复制/缓存、窗口framebuffer、Qt解码CPU QImage和原生ImageCapture临时预约不包含在该统计，不能将其解释为整个进程RSS硬上限。

常规64×48参考图：σ0/6/60 painter分别16,601,088 / 17,338,368 / 23,973,888 bytes；JPEG完成后该painter全部释放。ImageCapture自身最终尺寸/租约/线程/全局并发配额见宿主 `docs/plugin-image-capture.md`。

## 冻结的 flat 设置建议

| key                            | 默认          | 范围/步长                         |
| ------------------------------ | ------------- | --------------------------------- |
| monetBackgroundSource          | cover-derived | cover-derived / uploaded-global   |
| monetBackgroundLayout          | full-overlay  | full-overlay / half-pane-gradient |
| monetBackgroundBlurPx          | 6             | 0..60 / 2                         |
| monetBackgroundOverlayOpacity  | .74           | 0..1 / .02                        |
| monetBackgroundGrayscale       | 0             | 0..1 / .02                        |
| monetBackgroundSaturation      | 1.05          | 0..2 / .05                        |
| monetBackgroundWash            | .34           | 0..1 / .02                        |
| monetBackgroundHalfPaneOffsetX | 0             | -40..40 / 2                       |
| monetBackgroundWashColorMode   | theme         | theme / custom                    |
| monetBackgroundWashCustomColor | #8fb7ff       | 六位 hex                          |
| monetBackgroundDriftEnabled    | true          | bool                              |
| monetBackgroundDriftStrength   | .5            | 0..1 / .05                        |
| monetBackgroundStreaksEnabled  | true          | bool                              |

主线持有 catalog/config/资产选择面板；本目录不修改这些共享文件。

## 可重现验证与限制

```sh
node scripts/build-folia-monet-background.mjs --chrome-oracle
node --test tests/folia-monet-background.test.mjs tests/folia-package.test.mjs
# 使用最新版真实host静态库的私有QuickTest runner
QT_QPA_PLATFORM=cocoa QSG_RHI_BACKEND=metal QT_SCALE_FACTOR=2 build/folia-monet-bg-native/folia-qml-test -input tests/qml/tst_FoliaMonetBackgroundNative.qml -o -,txt
```

Chrome oracle只在显式--chrome-oracle时运行；真实源Canvas和hooked TSX tree分别生成PNG与原CSS DOM，输出在build/folia-monet-background-oracle，不进入插件包。

- Node12项+完整包AcornES2016共13/13；原157帧、13默认/7slider、54组原painter命令/bytes、完整原异步cache/queue、实际React hook180ms/迟到/首次、原TSX布局/断点/opacity/position/mask、typed端点取消和GPU预算/alpha。官方Qt基础5/5。
- Native Cocoa/Metal最终DPR1 11/11（11.906s）、DPR2 11/11（15.048s），日志 `build/folia-monet-background-final-dpr{1,2}-current.txt`。
- Native真实picker→元数据→GPU→JPEG92→完整解码，两holder共用1paint/1readback/1encode；120个真实frameSwapped使bake/textureUpdates/readbacks/encodes不增长；滑块合并、800ms退出/快速返回、12次不同时点Loader立即退役、hidden/resume、预算拒绝均有专项。
- 原Canvas σ0/6/60对原生DPR1平均RGB差0.651/0.660/0.606 byte、max6/5/4；DPR2平均0.522/0.510/0.523、max7/5/3。比较先经精确1920PNG捕获，再用相同Qt Image展示；并非JPEG字节恒等。
- 实际原TSX→Chrome四图full、half639夜offset-40、half640昼offset+40、half1024夜：DPR1平均RGB差0.491/0.791/0.753/0.828 byte，max4/4/5/3；DPR2平均0.310/0.327/0.334/0.328，max8/3/4/3。包含完整fallback/mask/radial/readability及断点，不是手写参考布局。

Qt/Skia重采样、颜色量化、AA及JPEG编码器有平台差异；巨大原件的预缩放、Windows/Linux及跨屏DPR仍需平台验收。主线外层source-key切歌/正式页面集成尚需生产验收；本文不把底层组件测试等同共享交接已完成。

## 许可

Folia源文件/派生模块保留AGPL-3.0-only和插件现有版权/可提供源代码义务，固定提交/路径/hash/生成脚本可追溯。TypeScript实际生成async/iterator helpers，随包保留Apache-2.0原文LICENSE.TypeScript.txt，sources.json.thirdParty.typescript记录版本/hash。构建复用现有TypeScript/esbuild/Prettier，不复制node_modules、不新增运行依赖；React/Framer Motion只供构建期独立原组件oracle，不进入运行时。
