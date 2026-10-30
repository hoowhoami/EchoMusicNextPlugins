# Folia 钟摆（Pendolo）

固定只读来源为 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`，AGPL-3.0-only。`scripts/build-folia-pendolo.mjs` 校验该 commit、记录原文件 SHA-256，再生成 ES2016 纯模块、独立源码 oracle 和跨后端 QSB。运行时仅使用公开插件接口、Qt Quick Shapes、GlyphRun 与 GPU ShaderEffect。

## 源码对应

| 固定源码（`src/components/visualizer/pendolo/`）                                      | 实际移植                                                                     |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `VisualizerPendolo.tsx`、`PendoloRotatingLine.tsx`                                    | `Pendolo.qml`、`PendoloLine.qml`：弧形歌词、手动浏览、跳转、弹簧、留白与副歌 |
| `pendoloGeometry.ts`、`pendoloTimeline.ts`                                            | `geometry.mjs`、`timeline.mjs`：行高碰撞、窗口、间奏与未绕回角度淡出         |
| `pendoloMotionProfile.ts`、`pendoloClockworkMotion.ts`                                | 三档完整参数表、低频平滑、擒纵与秒轮状态                                     |
| `pendoloClockworkScene.ts`、`pendoloClockworkMeshes.ts`                               | 原样纯数学 mesh；相同构造步骤另生成保留齿形的原生矢量                        |
| `pendoloClockworkDraw2d.ts`、`pendoloClockworkWebGL.ts`、`PendoloClockworkCanvas.tsx` | `PendoloClockwork.qml`：所有齿轮、线条、调色、封面、中心渐变及 CSS 阴影      |
| `PendoloActiveLyricSweep.tsx`、`pendoloTextLayout.ts`、`pendoloColorRuns.ts`          | 真正字体测量、原 pretext 排版、完整 shaping cluster、关键词与字素时序扫色    |
| `pendoloSubtitleTracks.ts`、共用 alternateText/subtitleTrackStyle                     | `subtitle-tracks.mjs`：可读字幕、双轨顺序、字号、字重、间距及透明度          |
| `tuning.ts`、`PendoloSettingsPanel.tsx`、`types.ts`                                   | 下表默认值、resolver 范围及设置面板步长                                      |

## 设置与组件接口

| flat 设置                     | 默认值   | resolver 范围              | 原设置面板步长            |
| ----------------------------- | -------- | -------------------------- | ------------------------- |
| `pendoloArcRadius`            | `0.42`   | 0.25–0.80                  | 0.01                      |
| `pendoloArcAngleDeg`          | `100`    | 40–160                     | 5                         |
| `pendoloWheelCenterX`         | `0`      | −0.30–0.50                 | 0.01；原面板为 −0.20–0.40 |
| `pendoloWheelCenterY`         | `0.50`   | 0.20–0.80                  | 原面板未提供此滑块        |
| `pendoloTickSnappiness`       | `2`      | 0.5–2                      | 0.1                       |
| `pendoloActiveScale`          | `1.25`   | 1–1.6                      | 0.05                      |
| `pendoloShowGearDecor`        | `subtle` | `none` / `subtle` / `full` | 枚举                      |
| `pendoloShowCenterGradient`   | `true`   | 布尔                       | —                         |
| `pendoloShowCoverOnWatchFace` | `false`  | 布尔                       | —                         |
| `pendoloEnableLineGlow`       | `false`  | 布尔                       | —                         |

入口 `styles/pendolo/Pendolo.qml` 接收 `preparedLines`（按 sourceIndex 的稀疏数组）、准确 `currentIndex`、秒单位 `timeSeconds`、完整 `baseFont`、独立完整 `subtitleFont`、扁平 `settings`、主色/次色/强调色/背景色、`dark`、`live`、`motionEnabled`、`paused`、真实 Stage `bassPower`/`audioBands`、公开 `coverUrl`、`trackRevision`、全曲精简 `lineMetadata` 与公开 `EchoPluginText textService`。

`seekRequested(seconds)` 只请求跳转；由主线核对当前 actor 后执行带 player revision 的 typed seek 并呈现操作失败。组件不读取播放器私有对象，不复制播放时钟、配置或背景。原内嵌字幕由本组件渲染，主线应关闭该模式的共享底部字幕。诊断属性包括 `requiredSourceIndices`、`lineCount`、`partCount`、`vertexCount`、`geometryBytes`、`sceneRevision`、`glyphRowCount`（主歌词行数）、`busy`、`errorString` 与 `resourcesActive`。

共享设置使用 `fontWeight`（null 回退 400）、`lyricsFontScale`、`subtitleFontScale`、`subtitleFontWeight`、`subtitleContentMode`、`hideTranslationSubtitle`、`animationIntensity`、`wordColors` 和 `showText`。两套 QFont 的 family/fallback/italic/变量轴等保留，仅按原样式局部覆盖字号、字重与字距。

## 几何、动态与字体

半径为 `min(width,height) * arcRadius`；歌词环外移短边的 0.06。文字最大宽度保留 `max(140,min(width*0.46,width-centerX-baseRadius-48))`。弧步长为 arcAngle/8，显示窗口 ±8 行，行高准备窗口 ±10 行；多行块的相邻角度至少为 `(h1+h2+24)/(2R)`。硬淡出角为 ±110°，末 28° 平滑淡出，保持未绕回的角度。

21 个真实机械部件保留 36 齿主轮、12 齿太阳轮、3 个 14 齿行星轮、20 齿摆轮、3.5 圈游丝、24 齿传动轮、15 齿秒轮、10 齿惰轮、宝石/铆钉/刻度/装饰线等完整构造。1100×820、full 模式的原 mesh 为 34881 顶点；原生保留矢量为 205 条路径、117604 UTF-16 字节。每帧仅更新 21 个部件的位移与旋转；齿形与几何不会随时钟重建。

UI 棘轮使用源 `k=180*snappiness*profileSpring`、`c=(18+4/max(0.5,snappiness))*profileDamping`、mass=0.8。几何旋转与文字反向 0.65 倍修正保持源公式。机械 phase 使用真实低频和源平滑/强度表；秒轮逐秒跨一齿并使用原 92/13 弹簧。暂停冻结 phase/秒轮，UI 弹簧与浏览复位仍按 wall clock 完成。鼠标每 90 px、触摸每 60 px 跨一行，每事件最多 5 行，方向改变清积累，2500 ms 自动回到播放行。手动跳转保持待确认锚点，直到准确 active index 到达该行。

焦点正文为 28 px、非焦点为 22 px，再乘共享字号比例并取整。焦点扫色行高为 `round(fontPx*1.2)`；非焦点继承原页面 1.5 倍行高，并保留 0.01em 字距。字幕焦点/非焦点为 16/12 px，第二轨字号乘 0.88 再取整，未指定独立/继承字重时回退为 500/400、第二轨 opacity=0.82，全部继承 1.5 倍行高。该差异已通过真实 QFont RED→GREEN 回归。字幕默认继承主歌词的显式字重；主字重 null 时保留两轨各自的回退，关闭继承才使用独立字幕字重。

Worker 用原 pretext 0.0.9 的 Unicode 17 排版规则，整行主文和实际字幕由公开 ICU 分词。缺少真实 ICU 时显示错误，未知测量不会发布临时结果。GlyphRun 的 `measurementOnly:true` 只提供真实 shaping 宽度，纹理上传和 cacheBytes 均为 0。扫色使用原 grapheme timeline 和真实前缀宽度，改变播放时间只改变 GPU mask；字体纹理与静态机械几何保持不变。

## GPU 效果与资源

封面使用真实公开 URL 异步解码，上限 2048×2048，保持 source 的正方形拉伸和圆形裁剪；原透明度为 full=0.42、其他=0.252。中心渐变保留 0/0.35/0.7/1 的 0.72/0.52/0.20/0 色阶。

齿轮 CSS `drop-shadow` 使用 σ=4/12、alpha=0.65/0.30；第二层确实作用在第一层合成结果上。副歌前景保留 source 的字号相关双阴影，背景 CSS blur 使用 σ=`round(10*profileGlow)`。CSS filter blur 参数直接为 σ；原 Canvas shadowBlur 如后续用于鼓击效果，需除以 2 转换，不能混用。Gaussian 在 ±3σ 截止并归一化，较大 σ 采用有界自适应采样；Qt Shapes 的抗锯齿与浏览器仍可能有逐像素差异。

长正文只实例化可见中心附近的真实文本行。副歌背景保持完整径向渐变坐标，仅对可见区域制作中间模糊纹理；1020 UTF-16、3 倍字号测试从实际 1308×24604 的纹理超限修为可见区域，正文/字号/时序没有缩减。

每个窗口最多 21 行，每个文本最多 8192 UTF-16，窗口正文与字幕累计最多 262144 UTF-16；ICU 每批最多 64 文本/65536 UTF-16。宽度 refinement 最多 32 轮，宽度缓存/请求最多 16384 项，单轮待量文本最多 8 MiB；原生测量每批最多 64 run/8192 UTF-16。矢量路径最多 512 条/8 MiB。超限明确给出可见错误。这些是输入、缓存和中间目标边界，不是进程 RSS 保证。

`live=false`、`visible=false` 或 track revision 变化立即撤下旧 actor，取消 ICU 操作并销毁 Worker/字体/封面/FX 对象；generation 检查拒绝旧回复。持久设置由主线负责，不留隐藏样式池。

Qt 6.12 的真实 Worker 多消息回归曾崩在 `sharedLineTextCaches.get(prepared)`。无 Glyph/Shapes 的重放同样崩溃，排除了 GPU 字体链路；仅将原 round-local WeakMap 载体改为 Map，保留原 `clearCache()` 每轮清理，源码布局公式不变。Worker 入口另做 JSON owned copy，避免跨消息保留临时包装对象。预录回归保留实际 ICU 与 Menlo→Arial 字体测量值，重复结构用等值构造减少测试资产。

## 验证与已知缺口

`node --test tests/folia-pendolo.test.mjs` 共 12 项，包含固定原源码独立生成的 oracle：所有强度、420 帧机械动态、分数锚点/间奏、行高碰撞、完整 Float32 mesh 逐值相等、全部 9 个齿轮轮廓的 Canvas 世界坐标，以及 10000 行元数据的有界窗口。运行测试不要求存在参考 checkout；重新生成 oracle 才需要固定参考仓库。

真实原生入口为 `scripts/test-folia-native-qml.py --host-build <Release宿主> --qt-bin <Qt6.12/bin> --input tests/qml/tst_FoliaPendolo.qml --platform cocoa`。独立已链接 runner 用 `QT_SCALE_FACTOR=2 QT_QPA_PLATFORM=cocoa QSG_RHI_BACKEND=metal` 验证 16 项：原生图像、齿形/纹理稳定、真实点击 seek、暂停与浏览复位、隐藏/换曲释放、双字幕/字体变更、长副歌纹理边界、320 px 与 Gaussian 阴影、公开封面/关键词。截图在 `build/folia-native-qml/pendolo-{native,glow}.png`。offscreen 的软件后端仅用于逻辑隔离，未当作 GPU 证据。

专用模型鼓点路径已从本版运行代码、生成器与首选原件中移除，普通表盘与谱响应继续保留。主题自定义 `lyricsIcons[0]` 已接公开 themeMetadata 与共享固定 Lucide 矢量；只取首项并精确匹配，未知/空列表使用原 Star，保留绝对 strokeWidth1.2、原尺寸及 accent 的 .62 alpha，详见 [主题图标](theme-icons-reference.md)。全局 aggressive-GC 额外探针没有得到通过结果（超时后终止），不计入正常回归。QA 回放与封面测试图位于 `tests/fixtures/pendolo/`，不进入正式插件目录。Qt Worker 创建仍有 `QObject::connect(QJSEngine, QtObject): invalid nullptr parameter` 警告，未抑制。Windows/Linux GPU、浏览器逐像素对照和正式安装包集成由后续验收覆盖。

本轮保留正常表盘、机械结构、弧形歌词、逐字与现有频谱驱动；专用鼓点分析、鼓面、halo 与其生成原件不属于交付范围。精简后的原生验收待统一宿主构建。
