# Cadenza（心象）移植依据

Folia 固定提交 `a8da4437cf19723555bd75e4685ca20815fe5b82`。此模式使用真实 pretext 换行、跨行词片段、单个完整词 hero 与碰撞散落布局。Cadenza 本身逐句切换；多列文章模式属于 Fume。

## 源码与许可

参考目录：`/Users/huanggenji/Work/mine/folia-major/src/components/visualizer/cadenza/`。

| 固定来源                     | 保留内容                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `entry.tsx:9`                | mode fontScale 先乘共享 lyricsFontScale                                        |
| `cadenzaPreparedState.ts:12` | 字数／词密度字号惩罚、24–132px、CJK 行高、viewport 行宽压缩                    |
| `cadenzaFragments.ts:17`     | pretext cursor → EGC 索引、原词查找、跨行片段和原 syllable 时序                |
| `cadenzaPlacements.ts:9`     | 完整词 hero、确定性行种子、碰撞 band／椭圆候选搜索、passed drift               |
| `cadenzaEnvelopes.ts:39`     | normal／fast／instant、renderHints、行入退场、逐 EGC glow                      |
| `VisualizerCadenza.tsx:182`  | 当前／下一句预取                                                               |
| `VisualizerCadenza.tsx:265`  | 唯一播放秒数、音量浮动、waiting→passed→active 排序、八通道指数过渡             |
| `VisualizerCadenza.tsx:387`  | chorus 圆环与字形实际 ascent、正文混色、三个固定 CSS 40px 阴影（Gaussian σ20） |
| `tuning.ts:18`               | beam 已退休，存取均强制 0                                                      |

Folia 派生模块与 QML 按 AGPL-3.0-only 发布，完整许可在插件根 `LICENSE`。`@chenglou/pretext` 固定 **0.0.9**，完整分析、bidi、line-break、line-text 与 layout 算法打包到 `styles/cadenza/pretext.mjs`；MIT 原文随包保存在 `PRETEXT-LICENSE.txt`。Unicode 17.0 官方 Arabic／emoji 范围使用 `qml/shared/text/UNICODE-LICENSE.txt`，不包含字体文件。各源 SHA-256 在 `styles/cadenza/sources.json`；构建只复用已有 esbuild／prettier 和参考 node_modules，无新应用依赖。

## Stage 契约

`Cadenza.qml` 接收标准 `preparedLines/currentIndex/timeSeconds/baseFont/settings/primaryColor/secondaryColor/accentColor/dark/live/motionEnabled`，可选 `paused:bool=false`、`audioPower:real=0`、`textService:EchoPluginText=null`。

`preparedLines` 是按 **sourceIndex 稀疏**排列的 `{line,...}`，有空位；`currentIndex=-1` 表示没有活动句。当前正索引尚未准备时不擅自寻找别的焦点。下一句按可用源索引选择，空白前奏也准备第一句；较近下一句晚到时替换旧预取。`line.words` 使用源 parser 原词，保留 `syllables/startTime/endTime`，不是 worker 的 semantic displayWords。时序读取 `renderHints`，没有时保留源 Cadenza 的 raw end 默认。

公开只读 `layout/busy/layoutRevision/measurementBatches/renderers/renderer/errorString` 用于观察。歌词更新不会创建播放时钟。FrameAnimation 的 dt 只供八通道 UI 收敛，暂停时也能收敛；所有 reveal、字素点亮、波纹进度、漂移目标和垂直正弦仍来自外部 `timeSeconds`。`motionEnabled=false` 立即发布静态目标，停用装饰浮动／旋转漂移和额外 blur。

`audioPower` **只接受归一化 0..1**，对应源 `audioPower/255`。目前独立 renderer 测试使用确定性输入；Stage 由主线接入通用宽频数据。bass／vocal 和 Rust 对数峰值谱不能当作源 WebAudio 连续 FFT 字节均值的等价输入。尚无相同分析契约时保持默认 0。

## 全部设置

这些是扁平 key。默认精确来自源 `types.ts:410`；源调参模块没有数值 slider 边界，下面范围／step 是插件的保守界面建议，不能称为原源范围。

| key                    | 默认 | 建议 min / max / step | 作用                                          |
| ---------------------- | ---- | --------------------- | --------------------------------------------- |
| `cadenzaFontScale`     | 1.12 | 0.5 / 2 / 0.01        | 与共享 lyricsFontScale 相乘后进入源字号 clamp |
| `cadenzaWidthRatio`    | 0.72 | 0.3 / 1 / 0.01        | 进入源长度压缩与可用宽度 clamp                |
| `cadenzaMotionAmount`  | 1    | 0 / 2 / 0.05          | pulse、音量浮动幅度                           |
| `cadenzaGlowIntensity` | 1    | 0 / 2 / 0.05          | 原 40px 三阴影强度；内部 intensity 上限 1.6   |
| `cadenzaBeamIntensity` | 0    | 固定 0，不展示控件    | 源已退休                                      |

共享 `lyricsFontScale/fontWeight/wordColors/animationIntensity/showText` 均实际使用。fontWeight 缺失／null 回落 700，100..900 取最近 10。accent 使用实时主题 property；不写持久颜色冒充主题。

## 计算与生命周期

纯 JS 接口（均 ES2016，无 Intl／属性正则／DOM）：

- `prepare.normalize(text) -> normalizedText`：保留 pretext normal whitespace 语义。
- `prepare.discover(line, context, icuPieces) -> {texts:string[],fontPx:number}`：仅产生真实 measureText 请求；**不返回临时 layout**。
- `prepare.complete(line, context, icuPieces, measurements) -> PreparedState`：`measurements:[{text,width}]` 缺任一项即失败。
- context 为 `{showText,viewport:{width,height},theme:{fontFamily,fontFamilyStack,fontWeight,animationIntensity,accentColor,wordColors},tuning:{fontScale,widthRatio}}`；这里 fontScale 已应用入口共享乘数。
- `icuPieces:[{segment,index,isWordLike}]` 必须精确覆盖 normalizedText，索引是 UTF-16。

`CadenzaLayout.qml` 通过真实宿主 `segmentWords([normalizedText], '')` 异步取 ICU pieces。随后 WorkerScript 发现测量清单；GUI 只做原生 GlyphRun 完整字符串测量，每 turn 最多 64 runs／1024 UTF-16，单个不可切的较长测量串保持完整上下文并受 8192 总容量限制。隐藏测量器 `visible=false/cacheBytes=0`，不生成 GPU atlas。最终 pretext／fragment／placement 计算回到真实 Worker；原生 QObject 不进入 worker。

Worker 按 generation／完整当前输入隔离过期响应。缓存至多 **当前＋下一句两个准备态**；下一句到达顺序变化也重查。`live=false/visible=false/showText=false` 停帧、取消 operation、销毁 worker、清缓存并卸载 GlyphRun。每句最多 128 源词／128 包装片段、8192 UTF-16；超限或原生 atlas 拒绝公开为 errorString，不能被有效空 poses 抹掉。恢复有效输入后可继续。

每个显示 fragment 用完整原生 GlyphRun 排版，以 QML Item 顺序实现源状态 z 排序，逐帧只改 cluster poses／item 变换。所有 pose.start 来自原生 `clusterStart`，不会拆开合字或 Indic shaping；合并 cluster 采用最早 EGC 的 glow 时序。底层 atlas 各自有原生容量上限，隐藏／卸载释放。

## 明确保留的差异

- 算法 oracle 使用同一组测量宽度，证明换行／几何／时序算法一致，**没有证明 Canvas 与 Qt 字体像素相同**。Qt GlyphRun 采用完整 baseFont 回退链，字号取整数；源 Canvas／DOM 允许小数字号，CSS 字体安装与 kerning 也可能不同，断行临界点会变化。
- 原生 `inkTop/inkBottom` 是完整 run 的实际 glyph ink，相对 alphabetic baseline。`-inkTop` 用作源 actualBoundingBoxAscent；只有真实零 ink 时才保留源显式 `fontPx*.78` 分支，缺失字段直接报错。CSS line-height:1 的半 leading 使用原生 font height/baseline 换算；不同字体引擎仍可能有基线像素差。
- pretext 采用源码 Chromium engine profile。Canvas 与 DOM emoji 宽度校准在原生同一字体引擎中固定 0；不把浏览器 emoji correction 推断为 Qt 行为。
- Unicode 属性／EGC 固定 17.0；实际验证 Node24.15（Unicode17／ICU78.2）与宿主 ICU4C78.2。参考 Electron npm 包为43.7.5，未安装可执行文件，不能宣称逐位验证了该 Electron 内置 Intl。
- 原生高斯预缓存的 body blur／独立 σ20 halo（CSS text-shadow 原始 40px） 与 Qt MultiEffect 整行 blur 保留范围和层数；它们是采样近似，不声称和 Chromium CSS 阴影像素相同。源 blurScale 参数未使用，本移植同样不擅自扩大源 CSS 40px（σ20）。
- 源普通 GUI 的 styleTransition 由共享 Stage 负责，Cadenza 不复制背景、字幕、播放胶囊或模式切换容器。

## 验证与复现

```sh
node scripts/build-folia-cadenza.mjs --reference ../folia-major
node --test tests/folia-cadenza.test.mjs tests/folia-package.test.mjs
python3.12 scripts/test-folia-native-qml.py --host-build /Users/huanggenji/.codex/worktrees/folia-skin-api/EchoMusicNext/build/release --qt-bin ../EchoMusicNext/build/qt-official/6.12.0/macos/bin --input tests/qml/tst_FoliaCadenza.qml --platform cocoa
QT_SCALE_FACTOR=2 QSG_RHI_BACKEND=metal QT_QPA_PLATFORM=cocoa build/folia-native-qml/folia-qml-test -input tests/qml/tst_FoliaCadenza.qml -o -,txt
```

构建／Node 需 Node24（本次24.15.0）。Node 10/10：42 组原 a8da pretext 几何逐字段 oracle，Unicode17 全码点属性，全部包络与原 draw-loop 八通道／paused seek oracle，入口字号乘数。另有全包 ES2016 acorn 校验。

native QuickTest：普通 Cocoa／Metal **12/12**，`QT_SCALE_FACTOR=2` 完整 **12/12**，覆盖真实 ICU／Worker、稀疏 sourceIndex 与 -1、前奏预取、迟到较近下一句、快速 seek／隐藏卸载、原生 ink／合字、拒绝保持与恢复、静态重绘、mask／upload 不随帧增加和实际 RGB／三层 CSS 40px／native σ20 halo。Qt 官方 WorkerScript 启动仍输出一次 `QObject::connect(QJSEngine, QtObject): invalid nullptr parameter`，未抑制。offscreen 后端为 software，不能替代 Cocoa／Metal 像素验证。

截图：`build/folia-native-qml/cadenza-hero.png`、`cadenza-halo.png`、`cadenza-body.png`。已目视 hero／scattered 与独立 bloom，并保留实际 RGB 差分回归。

### CSS 阴影单位复核（2026-10-22）

`cadenzaEnvelopes.ts:280–290` 的三层值是 CSS `text-shadow: 0 0 40px`，不是 `filter: blur(40px)`；`motion.halos()` 在原生 Gaussian σ接口传 **20**。原始生成的 `buildDomTextShadow()` 保留源码 40px 字符串，三层强度／颜色不变。

真实 Chrome headless 同字体、同 120px「光」字的透明 PNG 二阶矩：`text-shadow 40px` 扣除正文方差后有效 σx=19.088、σy=19.094；Canvas `shadowBlur=40` 完全相同；CSS `filter:blur(20px)` 为 19.064／19.081。8bit 高斯尾部量化使有效值稍低于理论 20。证据在 `build/folia-cadenza-shadow/reference.html`、`reference.png`、`moments.json`。这组 Chrome 测量纠正了早期把 CSS raw40 直接作为 native σ40 的错误。

专项像素测试保持真实 RGB halo 与 σ20 字段断言，将错误的“距fragment原点 >120px”改成距实际 body ink bbox 的 RGB coverage 回归检查。上界使用 3×20×父级实际 scale + 4 logical px 的经验范围（含本次 DPR2 栅格误差额外 1 logical px），只用于防止旧的两倍半径回归；Gaussian 没有 3σ 硬边界，16/40 atlas 邻级插值、RGB 阈值与 AA 会改变可见尾部，因此这不是 Gaussian 精确 support 声称。Chrome 二阶矩是单位转换的独立依据；字体 raster、原生低分辨率 atlas 与浏览器仍不声称逐像素相同。

真实缓存复核：DPR2、24个CJK原词时，源码形成23个 placements。顺序时刻的可见组实际合计 **2,516,360 bytes**；全部24词同为1..8秒、t=4的全active压力点实际合计 **5,261,480 bytes**（23×228760），没有把每字对象数乘以整页上限当作实际占用。专项为 `test_twentyFourCjkWordsReportActualNativeCache`；本轮该函数加init/cleanup实际3/3。Chrome参考版本155.0.8059.86。
