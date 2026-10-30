# Claddagh 回环移植

参考 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`；派生代码保留 AGPL-3.0-only 归属。

## 文件与边界

`qml/styles/claddagh/kernel.mjs` 保存纯布局、时间与动画计算；`Claddagh.qml` 接受 worker 的 preparedLines，通过公开 `EchoMusic.PluginSdk.GlyphRun` 输出缓存原生文字及每帧 GPU poses。
只创建 `index-1..index+2` 内已经准备的有效源行，最多四行；不在帧循环中分词、调用 TextMetrics、构造每字 Text/MultiEffect 或绘制 Canvas.Image。
GlyphRun 完整文本 shaping 后提供 EGC advance 和安全 clusterStart；联字 cluster 合并为一个 pose，其时间范围取首尾 EGC，保留原 UTF-16 源映射。

## 输入契约

必需 `preparedLines`：worker result.lines 按 sourceIndex 投影的稀疏数组，每项含 `{line,graphemes,wordSegments,timeline,layoutUnits,displayWords}`。空位、过滤行和尚未准备的记录不创建 delegate。所有环形角度继续采用原 sourceIndex，不压缩为空位过滤后的下标；正值 currentIndex 始终保留，即使该行仍在准备中。currentIndex=-1 时，按可用记录的 sourceIndex 倒序找 `timeSeconds > line.endTime` 的最近完成行，与参考 runtime 默认 raw endTime 一致；renderHints.renderEndTime 不参与焦点选择。
使用 line.fullText/startTime/endTime/isChorus/renderHints，使用现成 timeline，绝不重写源词/音节时间。
其余属性为 currentIndex、timeSeconds、baseFont、settings、primaryColor、secondaryColor、dark、live、motionEnabled。
附加可选输入为 accentColor（默认 primaryColor）、wordColors（默认空）、bassPower/vocalPower（默认0）、animationIntensity（默认normal）、paused（默认false）、exiting（默认false）和 nextStartBySourceIndex。音频来自宿主真实公开数据，未生成假音频；bass/vocal 明确是 **0..1 normalized PCM 能量**，非有限值归零，越界夹到0..1，不逐帧猜测0..255，也不冒称完整保留源的 sticky raw-scale 兼容逻辑。paused 只按源码把轴线音频归零，不用它停止歌词时钟、环形弹簧或把最后一个真实 PCM 帧伪造成新采样。
baseFont 保留完整 QFont 字体链；宿主应传入源默认700或用户实际选择的字重。模式只覆盖源字号 72×lyricsFontScale。

`nextStartBySourceIndex` 是宿主完整轻量 timing 索引：按 sourceIndex 查值，number 为下一有效源行的 startTime，null 表示确证没有后继，undefined 表示尚未准备好。有元数据时 undefined 只 hold 到当前行 raw/renderHints end，不能把缺项当末句并擅加10秒；null 才使用源码末句 end+10秒。完全未提供元数据时可用已准备的有效后继，仍保留 sourceIndex；没有可用后继同样只 hold。主线应把准确 next2 加入 prepared 的 extraIndices，覆盖连续 filtered 行导致下一有效行距当前索引超过±16窗口的情形。时序索引变化只更新 pose，不修改 clock、源歌词或字形 atlas。

读取扁平设置：claddaghFocusScaleRatio 默认.65/范围0..1.5，claddaghRadiusScale 默认1/范围.5..1.5，claddaghEllipseTiltDeg 默认45/范围0..60，claddaghShowAxisLine 默认true，claddaghLetterSpacingOffset 默认0/范围-5..20。
全局使用 lyricsFontScale 与 showText。默认值和设置面板由主线集成，此组件不私存配置。

## 源算法

- `claddaghLayout.ts:8-87`：实际 advance 累积，加 .04em 字距、.18em tracking 和额外像素；focus 间距倍率 `(1+focus)/1.65`；弧长封顶4.25rad。
- `VisualizerCladdagh.tsx:174-224`：Rx=min(.44W,560)×radiusScale；相邻行隔π，换行 spring(55,14,mass.9)，跳超过一行直接定位。
- `CladdaghRingLine.tsx:292-403`：实际短轴是 .09Rx，旋转 -ellipseTiltDeg；按 cosψ 推导 depth，按 |ψ|/.48 与行距推导 focus；字缩放、[-38,38]切线旋转、透明度及0..8px景深模糊均保留。
- `claddaghTimeline.ts:31-95`：零时长空白尽量各借60ms，邻字保留至少40ms；不修改输入。
- `claddaghTimeline.ts:103-191`：按相邻 startTime 插值行旋转；末字继续向前漂移至下一行前.34s，末句到end+10s；后一行跟随 active word角*.28 与 π*.52 的进度轨道。
- `CladdaghRingLine.tsx:407-483`：15倍速度的颜色 snap、前40%时间的flashPop、普通24F²/副歌(36+24power)F^1.5光晕及.35/1/1.6三层半径；最大外层158.4px直接交给原语 halos，不改成强度。
- `VisualizerCladdagh.tsx:61-148`：bass spring150/25、vocal spring120/24；300×4px渐隐轴线按90-tilt旋转，随音频伸缩并混色。只在轴线这一个图元上用GPU MultiEffect光晕。
- `VisualizerCladdagh.tsx:251-255`：整场 opacity0→1、scale.96→1、blur4→0，退出 opacity0、scale1.04、blur4；时长.8秒，cubic(.16,1,.3,1)。通过独立有界 presentation FrameAnimation 驱动，不推进播放秒数；仅在该过渡期间启用一个整场 GPU blur layer。

采用解析弹簧解，保留速度和帧率独立性；等待帧只在需要重绘、弹簧/音频未稳定或轴辉光过渡时驱动。时间回退到0但旧index尚未提交时保持上一帧，收到index0后解除。
窗口高度、主题颜色/强度、准确 next timing 或真实字体输入改变时请求一次合并的 pose 更新，静态模式也不依赖下一次播放 tick。高度和颜色变化不重建 mask；字体改变只做必要的 shaping/atlas 重建，native layoutChanged 后再 publish。初始化测试排空 callLater，避免一次未执行的初始刷新掩盖此问题。
可见模式退场由 exiting=true 启动，至.8秒发送一次 exitFinished，由外层最多保留当前模式和一个退场模式。live=false 或 Item 隐藏会立即停止 presentation、隐藏文字/轴线并释放缓存，不等待.8秒，也不借退场延长已经撤销的 scope。播放暂停不会停止可见 UI 过渡。间奏 currentIndex=-1 时环形仍围绕最近完成行，但轴线 chorus 辉光取 activeLine，按源码退回普通轴线。
QML 将源 CSS center-center pivot 精确换算为 GlyphRun baseline pivot，避免放大/旋转后文本偏离环形落点。
源 keyword 范围按 CJK 较长短语优先、英文完整单词匹配，按 UTF-16 与 native cluster 相交赋色；无原型表避免 constructor/**proto** 等合法关键词撞上 Object.prototype。颜色按 source colorMix 的线性 RGB 混合并取整8位通道，不能改成 Classic/Motion 的平方 RGB 混合。
每行独立保留 preparationError；rebuild 拒绝时核对已接受 runs，跳过 pose 提交，避免成功的空 poses 清掉准备失败。下一次有效布局清错后重新发布；单次 pose 错误仍可由后续有效 pose 恢复。错误经 renderError 交给外层展示，不截断超限文本或冒称绘制成功。

## 验证

初始6项 kernel 测试先见红；正式接入审阅又为稀疏窗口、rawEnd、三态 next timing、normalized PCM、8位颜色/关键词和.8秒 presentation 补回归，当前共13项通过。曲线中段采样对照真实参考 motion-utils 13.3.0，非仅验证起止值：

```sh
node --test tests/folia-claddagh.test.mjs
```

实际 Qt6.12/macOS Metal 的最小 native QML runner 编译同一 GlyphRun 源与 qsb，只注册真实原语，无 QML mock；随后使用链接正式 SDK 静态模块的 runner 重新验证。

```sh
cmake --build /tmp/echo-claddagh-qml/build -j 3
QSG_RHI_BACKEND=metal QT_QPA_PLATFORM=cocoa \
  build/folia-native-qml/folia-qml-test -input tests/qml/tst_FoliaCladdagh.qml -o -,txt
```

正式 SDK runner 最终 Cocoa/Metal **17通过、0失败、0跳过**（含初始化/清理）。涵盖 QV4、四行窗口、EGC/ZWJ、native安全cluster、真实RGB halo、60帧缓存稳定、seek/reset、稀疏索引、rawEnd、静态输入、paused、.8秒presentation、8193 UTF-16拒绝/恢复、间奏轴线及准确 timing。上述新增正式输入用例先分别见红再通过；不能以 offscreen 的属性测试替代实际像素。
可见 TestCase 在黑色背景上比较正文 RGB 和移除 halo 前后的扩散像素，验证副歌 .35/1/1.6 三层半径、缓存和上传计数；图像保存到 `build/folia-native-qml/claddagh-{body,halo}.png`。Qt offscreen 平台会选择软件场景图，无法绘制自定义 QSG 材质，不能作为此原语的 GPU 像素验收环境。
独立 GlyphRun 测试总10项通过，并经 ASan/UBSan 检查；40/158.4px像素二阶矩、三层独立RGB色、120帧无重传、页预算拒绝、隐藏/销毁均已验证。

## 集成与待验收

主线仍需挂载页面、注册正式样式、设置面板、原真实PCM/appearance输入、公共字幕层、正式宿主runner与全仓构建。
本组件没有冒充完成其余样式。原语 halo 在16/40/80/160px有限等级间插值，低分辨率half-float缓存保留大半径和弱透明度，但与浏览器 Gaussian 并非像素等价，仍需与原源截图量化对照。
字体测量由完整上下文 Qt shaping 替代浏览器前缀测量；对联字和双向文字保留原生安全cluster，不拆开破坏上下文。两者字形/advance差异属于跨引擎实际验收项目。
整场 MultiEffect 也属于 Qt 的 GPU blur，而非 Chromium 的逐半径 Gaussian。UI cubic 数学核来源为 Motion/Motion-utils 的 MIT 实现，完整 Copyright 2024 Motion B.V. 与许可保留在 `qml/styles/claddagh/MOTION-LICENSE.txt`；其余 Folia 派生代码仍为 AGPL-3.0-only，没有新增应用依赖。
