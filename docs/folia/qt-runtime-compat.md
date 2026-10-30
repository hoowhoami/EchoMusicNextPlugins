# 固定 Qt 6.12 运行时差异

以下来自实际原生运行，不将 Node/浏览器通过视为 QV4 自动通过。

| 项目          | 实际表现与处理                                                                                                                                                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 字符串迭代    | `Array.from("😀")` 在本机 QV4 产生两个 UTF-16 片段，而 `for..of`/codePointAt 正确。已为已知字符串边界使用共享 codePoints，保持原 Unicode17 EGC，不改普通 Qt sequence/Map 的 Array.from。                                                                                                                  |
| Map 迭代删除  | `for..of map` 同时删除当前元素，200 项最小探针仅删除 100。退役/剪枝采用 Array.from(map.entries/keys) 快照再删；原 Map.forEach 删除已实测可删完 200 项，保持不变。Partita、Pendolo、Tempera、Lumiere 对应路径已处理。                                                                                      |
| 小数字号      | QFont.setPixelSize 及 setPointSizeF 在本机 CoreText 的实际 engine 字号均取整；仅改 setter 无法保留 .896906px。GlyphRun 对非整 run.size 保留整段/fallback shaping，再以真实浮点 QRawFont 原生栅格；整数默认路径不变。说明及原生证据见宿主 folia-glyph-run.md；不宣称所有光学字号/hint 与 Chrome 完全一致。 |
| AnimatedImage | Qt6.12 QMovie 在 GUI 推进原 GIF 解码，asynchronous 不能改变此路径。后台有界帧准备的同条件探针由 80ms 间隔降至 15ms，真实帧仍前进；见 animated-assets.md。                                                                                                                                                 |

同一个普通/箭头函数有两个对象解构形参时，Qt6.12 的 inline、module、Worker 最小探针均把首个值错误绑定为 undefined；仅单个对象 pattern 正常。已对 Lumiere 原 songHandover 模块等价降绑定语法，并保留独立原函数 oracle。全部运行时模块的 AST 审计未发现其他同类形参，package 测试持续守门，没有全局降级原算法。独立复现为 `build/qt-destructuring-probe/`。

## Scene 退役与异步上下文

Sonnet 原 shot tracking 的 WeakMap 在 scene 退休、GC、重建后触发的 QV4 崩溃已由官方裸 qmltestrunner 独立复现。插件在该有界 source cache 增加显式 `clearShotTrackingCache()` 退役边界，未更改跟踪数学；实际 Sonnet 三轮退休与 GC、重新准备在 DPR1/2 均通过。pretext 的另一 WeakMap 问题采用 round-local strong Map，并保留原 `clearCache()`；两项处理不混为一类。

`Qt.callLater()` 的函数值可能比创建它的动态组件存活更久。实际 Monet 连续24次颜色变化的性能探针曾在 AssetImage 销毁后执行旧 prepare，报 invalid QML context。AssetImage、AssetCollection 和 VisualizerStage 的延迟准备/刷新改用随组件销毁的零间隔 Timer，销毁时停止并关闭 completed gate。原生资源仍按原 scope 取消、排空，不在 GUI 析构中 join。Stage 的20次快速创建/切换/销毁测试通过，AssetCollection 的真实两请求配额竞争通过。

正式十四种切换曾进一步复现 Classic 的失效 `runsMatch` 回调。八种较早样式及 Monet、Tempera、Lumiere 的相关排队任务现均由组件拥有的零间隔 Timer 驱动。真实 GlyphRun 的60轮 Loader退役原回归先失败，修复后通过；没有改变字体/源时序数学或用异常捕获吞掉回调。

## Worker 浮点传输

固定 Qt6.12 Worker 不序列化 ArrayBuffer/TypedArray；`String.fromCharCode.apply(null, typedArray)` 的独立探针还将非零数据变成全NUL。Diorama 的有界传输按8192个 UTF16单元分块，以 `Array.from(chunk)` 后再 apply，保留原Float32位。原生公开 `FloatTexture.uploadPacked` 校验长度、有限值与预算后原子接收；全部65536个UTF16单元的真实Worker往返已覆盖。不能把空缓冲上传成功当成几何正确。

## Worker 初始化警告

`QObject::connect(QJSEngine, QtObject): invalid nullptr parameter` 已在**官方 Qt 6.12 qmltestrunner** 独立复现：只有 QtQuick、QtTest、WorkerScript 和一行 echo.mjs，没有加载任何宿主/插件模块，roundtrip 3/3 通过但同样输出警告。复现材料为 `build/qt-worker-probe/{tst_Worker.qml,echo.mjs,acceptance.log}`。

固定源码的 [Worker engine 创建](https://raw.githubusercontent.com/qt/qtdeclarative/v6.12.0/src/qmlworkerscript/qquickworkerscript.cpp) 使用独立 QV4 ExecutionEngine，并初始化 Qt 全局对象；[QtObject 构造](https://raw.githubusercontent.com/qt/qtdeclarative/v6.12.0/src/qml/qml/qqmlbuiltinfunctions.cpp) 对 jsEngine 的语言变更连接没有空值 guard。这与最小复现相符。未修改 Qt、过滤日志或把它冒称已经修复；不得将它与插件自身已销毁 QML context、空纹理 provider 或 TypeError 混为一类。
