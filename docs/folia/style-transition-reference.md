# 歌词 Stage 首帧与 softFocus

固定 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`。只改变共享 `VisualizerStage.qml` 与 `DynamicPresentation.qml` 的模式交接，不修改各样式算法、播放时钟、catalog 或宿主原语。

## 原状态与输入

Stage 直接使用主线从 `src/components/visualizer/styleTransition/layerTransition.ts` 提取的 `transitions/layers.mjs:nextShownLayers/startedLayers`。每个actor保留源key/value/leaving/comesIn/waits；最多两个actor。等待时A→B→C保留真正显示中的A、替换未就绪B；等待时返回A撤销新层；进入期间返回A复用旧actor，B从当前progress退出。初次挂载没有过渡，和原useShownLayers初态一致。

外部 `preparedLines/currentIndex/timeSeconds/fonts/settings/colors/metadata/textService/assetsService/audio` 保持原公共绑定；离场样式继续读取同一宿主播放时间与真实参数。去除旧的 showText:false 替换、exiting=true二次内部退出和固定800ms删除。离场只由外层softFocus包裹；seek/settingsPatch仍仅当前非离场actor可上送。

## 首帧与就绪

模式切换时新actor立即挂载、progress0；旧actor保持原画面，双方waits同时为true。

- 有renderReady时严格读取该值；否则有busy时等busy=false；两者均未声明的普通样式按原unclaimed样式处理。
- 以上只产生candidate，须在实际Window.frameSwapped观察到candidate后才标hasFrame并同时开始两层过渡。pictureDrawn/renderReadyChanged/busyChanged等只触发探测，不能直接伪造换帧。
- 原 `VisualizerStyleTransition.tsx:FIRST_FRAME_LIMIT_MS=1500` 为上限。到期仅强制开始交接、标timedOut；不改renderer.renderReady，也不把hasFrame改成true。准备仍可继续，和源上限后允许显示加载状态的语义一致。
- 只当前等待key可开始；已替换/隐藏/析构的actor立即停止Timer、动画与Loader，迟到信号不起新交接。所有延迟工作由actor或Stage持有的Timer承担。

Qt比React的unclaimed layout effect额外等待一个实际窗口换帧；Qt NumberAnimation按GUI动画驱动求值，与浏览器WAAPI compositor在长主线程任务中的调度不同，不能声称任意调度时长逐帧相等。

## softFocus 与释放

进入delay80ms、duration520ms、cubic-bezier(.16,1,.3,1)；离开duration360ms、cubic-bezier(.4,0,1,1)。时间和曲线直接读原 `Layers.softFocus`；离场从当前progress到0，不重置到1。源leave fallback另有1000ms裕量，只兜底漏掉的完成事件。

复用主线 `LayerTransitionFrame.qml`：progress0为blur σ8、scale1.02、整体alpha0，progress1恢复普通未分组渲染；临时capture/blur纹理只在变更期间存在。使用shader最终alpha，避免QQuickItem.opacity0剪除新样式的QSG子树。rest/hidden transitionBytes为0。原语的256MiB/8192px限制和Gaussian像素验证由其专属测试负责；Stage累计报告transitionBytes，不把各renderer自身cache计入该数。

motionEnabled=false直接使用源无动画状态机、切至一层；hidden/live=false立即释放全部actor，不以播放秒数判断销毁。暂停不冻结UI交接。

## 对外契约与验证

Stage与DynamicPresentation均公开readonly transitionWaits，供背景同一交接协调；Stage另公开actors/layerCount/renderer/loadedMode/transitionBytes/errorString。只读actors用于诊断和专项验证，不是隐藏renderer池。

- `tests/folia-transitions.test.mjs` 对真实源模块5000次中断/返回/关闭动画序列、softFocus和源hash；加完整包Acorn共3/3。
- `tests/qml/tst_VisualizerStage.qml` 包含真实Classic/Tilt字体、即时卸载，以及仅测试目录中的可控制就绪Rectangle。后者验证慢首帧、1500ms上限不伪造ready、A→B→C/返回A、从中途progress退出、motion关闭、hidden、真实旧/新RGB和rest纹理0。
- 静态旧实现先RED（transitionWaits缺失且旧策略立即退出），offscreen首轮11/11；最终Cocoa/Metal DPR1为12/12（6.348s），DPR2为12/12（6.117s），记录于 `build/folia-stage-ready-native-dpr{1,2}.txt`。原Qt Worker的QJSEngine nullptr上游警告仍保留；invalid context/TypeError等会失败。

正式插件页面、背景styleWaits协调及全部注册模式的生产切换由主线做独立验收，不将测试fixture当作实际样式移植证据。Folia派生状态/曲线沿用AGPL-3.0-only；未新增依赖。
