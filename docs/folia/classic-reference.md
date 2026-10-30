# Folia Classic 渲染对照

参考提交固定为 `a8da4437cf19723555bd75e4685ca20815fe5b82`。实现位于 `plugins/folia-lyrics-skin/qml/styles/classic/`，通过公开 `EchoMusic.PluginSdk.GlyphRun` 绘制完整 shaping 后的字形，不读取宿主私有模型，也不自行选择歌曲或创建播放时钟。本阶段不把尚未完成实际绘制验收的模式加入 styles 注册。

## 输入和生命周期

入口 `Classic.qml` 接收：

| 属性                                      | 语义                                                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `preparedLines`                           | 文本 Worker 的 `result.lines`，允许按源索引排列的稀疏数组；每项含 `line/graphemes/wordSegments/timeline/layoutUnits/displayWords` |
| `currentIndex`                            | 调用者已经确定的当前源行；负值、越界或缺项时没有主歌词                                                                            |
| `timeSeconds`                             | 呈现时间，单位秒；line、word、syllable 和 renderHints 必须全部使用秒                                                              |
| `baseFont`                                | 完整 QFont，交给 GlyphRun 保留原生字体回退、kerning 和字形特性；run 仅覆盖源码确定的字号和字重                                    |
| `settings`                                | 下述扁平设置；由调用者校验、持久化                                                                                                |
| `primaryColor/secondaryColor/accentColor` | 实际主题正文、次级、强调颜色；accent 不作为本模式私有持久设置                                                                     |
| `dark`                                    | 保留公共入口；Classic 主字形颜色直接采用主题颜色，不由 dark 再推导                                                                |
| `live/motionEnabled`                      | live 表示可见有效 scope；motionEnabled 控制动画，停用后静态呈现当前时序状态                                                       |

设置为 `animationIntensity`、`lyricsFontScale`、`fontWeight`、`wordColors`、`showText`，以及 `classicEnableWordRotation`、`classicBreathingFloatMultiplier`、`classicUseLegacyLayout`、`classicWordSpacing`。默认 Classic 值为 `true/1/false/0.7`，float/spacing 限制为 0..2；没有 `classicTuning` 嵌套对象。关键词着色仍按 Folia 的有限 BMP CJK 门限及英文 `\w` 清理规则，不能改写成全 Unicode 智能匹配。

当前行及尚未完成的离场行分别持有 GlyphRun，key 沿用 `line.startTime`。只变 time 不重建 runs。关闭 showText 走 0.2 秒淡出；替换行走对应 profile 的缩放/模糊离场。`live=false` 或 Item 隐藏会销毁全部行，原生层进一步负责窗口隐藏、最小化和 GPU 线程资源释放；恢复后重新准备当前行。极快切换时最多保留最新 **4** 层，超限立即释放最旧层。这是明确的 GPU 资源边界，与浏览器任意数量 AnimatePresence 临时退出层不同。

FrameAnimation 累加可见有效期间的 presentation/UI 时间，驱动行 enter/exit、active 弹簧、passed 的 0.5 秒变换/5 秒旋转、chorus ripple 和整行 breathing。播放暂停时这些 UI 过渡仍会完成，退出层按 UI 时间自然销毁；它不是第二播放时钟，不会切换歌词。word waiting/active/passed 状态、正文点亮相位及逐字 glow 只采用外部 timeSeconds，暂停时点亮不自行向后续字素推进。关闭动画时清除离场层、呼吸和 halo，并保留静态词状态。空态等待文案、翻译、下一行字幕、背景和播放器 chrome 由外层负责；这里覆盖源码当前行与其对应过渡。

## 源码和保留参数

路径均相对只读参考仓库 `folia-major/`：

| 源文件                                                                                | 本实现                           | 保留内容                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/visualizer/classic/Visualizer.tsx:46`、`:133`、`:145`、`:273`、`:311` | `layout.mjs`、`Classic.qml`      | tuning、legacy/parser 或 semantic+sticky displayWords、startTime seed、三档随机布局、动态 margin、70vh 中心场景的 32px 内边距、1152px 最大宽度、300px 最小高度、flex-wrap、1.22 行高和 breathing |
| `src/components/visualizer/GlowWord.tsx:69`、`:83`、`:119`、`:164`                    | `ClassicLine.qml`、`model.mjs`   | waiting/active/passed、音节优先字素时序、正文与 glow 独立、chorus 圆环                                                                                                                           |
| `src/components/visualizer/glowWordTiming.ts:23`、`:43`、`:54`、`:66`                 | `motion.mjs`                     | 0.15/0.08/0.03 秒 lookahead，normal/fast/instant activeEnd、最短显示时间和行过渡                                                                                                                 |
| `src/components/visualizer/glowWordVariants.ts:9`、`:56`                              | `motion.mjs`                     | active 弹簧 k=200/d=20/m=1、waiting 位姿、passed 0.5 秒与旋转 5 秒、正文颜色和 blur 持续时间                                                                                                     |
| `src/components/visualizer/wordGlow.ts:67`、`:94`、`:176`                             | `motion.mjs`、`model.mjs`        | instant 14/24px、fast 18/32px、normal 20/40px 双层 halo，原 peaks/times、字素 delay、字时长×6 和 passed fade                                                                                     |
| `src/utils/lyrics/graphemeTiming.ts:51`                                               | `shared/text/graphemeTiming.mjs` | 优先 syllables；缺失时按真正 EGC 分配词时长                                                                                                                                                      |
| `src/components/visualizer/wordColoring.ts:189`                                       | `layout.mjs`                     | 第一个匹配项优先、CJK target-contains-token、英文 token 清理                                                                                                                                     |

主字号保留 CSS 的 `clamp(2.25rem,6vw,4.5rem)×lyricsFontScale`，rem 基准为 16px；同样保留源码三位小数的 CSS 参数及测量计算不取整的区别。几何宽度由 native metrics 提供，绝不采用字符数估计。普通 seed 的 spread/rotation 为 20px/5°，calm 为 0/0，chaotic 为 60px/30°；passedRotate 即使 calm 也沿用源码，除非关闭旋转。精确 `fullText === "......"` 使用源码 interlude 分支。chorus 的 1.5..3.5 rippleScale 按源码每次挂载采样一次 Math.random，不能冒称确定性 seed。

Motion 参考安装版 `motion-dom 13.4.2`、`motion-utils 13.3.0`。cubic-bezier 使用原十二次二分、easeInOut/easeOut 和默认 `[0.25,0.1,0.35,1]`；正常行 scale 使用 k=550/d=30/restSpeed=10，正文颜色按平方 RGB 混合后取整为 8 位通道。测试保存从实际参考 useMemo 和 spring generator 计算的数值 oracle，不仅检查参数是否存在。

## 原生映射及必须保留的差异

每个完整 displayWord 交给一次 GlyphRun/QTextLayout。Native metrics 的 graphemes 可能因联字、Indic 上下文或 cursor 安全性共享 `clusterStart`；每个安全 cluster 仅发一个 pose，start 为原文 **UTF-16** 起点。Unicode 17 的 source EGC 时序按 UTF-16 区间映射，合并 cluster 采用覆盖字素的最早 startTime 到最后 endTime。body 使用整词动画，变换锚点从整词中心换算到 native cluster 的 advance 中心/baseline；不会按 UTF-16 字符拆开 shaping。

源码的 glow 层会单独放置 EGC span，可能改变联字/上下文；这里保留完整 shaping，因此合并 cluster 内不会逐 EGC 分离发光。Qt 的实际字体回退、行度量和整数像素字号与 Chromium Canvas/DOM 不完全相同；因此换行临界点也可能不同。字体很大、超长行或异常数据超出原语预算会由 GlyphRun 报错，不截断、伪造宽度或把它当成功。

每次布局更新按字段核对原语已经接受的 runs，并比较完整 QFont；Qt.callLater 等原生属性更新完成后才启用 poses Binding。拒绝布局时暂停发布 poses、隐藏旧字形并保留公开 errorString，避免有效帧更新清掉此前的拒绝；合法文本或字体恢复后才继续绘制。metrics/words 的临时错配不参与布局与帧合成。不能直接比较两个 JSON 字符串：原生 QVariantMap 的键顺序与 JS 对象不同。
来自设置的 wordColors 在 QML 边界仅正规化一次为 JS 数组，保留真实 QVariantList sequence 的关键词颜色；不能因 Array.isArray 返回 false 而静默丢弃。

run 声明 `maxBlur:32`、`maxHaloRadius:80`，双层 halo 的颜色独立于正文。20/40px 等源码逻辑半径不会缩到 8px；与行 blur 合成时使用方差相加的平方根。原生预缓存 16/40/80/160px、低分辨率 half-float halo mask 并插值，正文独立预模糊。它与 CSS text-shadow 的逐半径 Gaussian 不是像素等价；同时不是 Folia Linux 开关采用的连续两次 drop-shadow 链。父级整行 blur 用每个片段的 blur/halo 合成，重叠词之间的滤波结果可能不同。

物理 spring 和 bezier 的数值核保留，UI 过渡从状态变更时记录的 presentation 时间采样，退出/返回 waiting 或 seek 返回 active 均从当时位姿继续，不能跳回透明/半尺寸的 waiting 位姿。现在保留上一实际 presentation 帧的位姿和时间，按 MotionValue 的 30 ms 分母上限计算四个变换的继承速度；active 的物理弹簧在重复 waiting/active/passed 重定向时使用该速度。waiting、passed、active opacity/filter 的默认缓动为 animateMotionValue 实际采用的 easeOut，passed 正文颜色仍是源码明确指定的 easeInOut。没有复制完整 Framer 运行时调度；浏览器与 Qt 的实际帧到达时刻及最后 settle 帧仍可能不同。按宿主单一歌词时钟契约，字素 glow 和 active 正文点亮不跟随独立 UI 时钟，因而暂停时与 Framer 自行走完该段渐变不同。上游 React 初始状态等到 MotionValue change 才从 waiting 切换，这里直接按当前时间确定状态，避免挂载后停在 waiting。这些差异不能写成完整 Framer 执行器等价。

## 验证

先确认缺失模块、颜色取整、行 spring 阈值、关闭动画旧层残留、暂停 seek 层无限累计，以及缺失原生 halo 属性等有意义红灯，再实现。`tests/folia-classic.test.mjs` 覆盖源码数值 oracle、native advance 换行、profiles、音节 glow、UTF-16/联字 cluster 和 Motion 颜色。

```sh
node --test tests/folia-classic.test.mjs tests/folia-package.test.mjs
QSG_RHI_BACKEND=metal python3.12 scripts/test-folia-native-qml.py \
  --host-build /absolute/host/build/release \
  --qt-bin /absolute/Qt/6.12.0/macos/bin \
  --input tests/qml/tst_FoliaClassic.qml --platform cocoa
```

QML 测试加载真实静态 PluginSdk，验证原生 metrics、emoji/联字 cluster、GPU textureUploads 非零、pose 更新不改变 maskRevision/uploads、暂停 breathing/自然离场、隐藏释放、设置与行退出分支及最大 4 层。补充8193 UTF-16/非法字体拒绝后的错误保持与合法恢复、稀疏source index和-1、24字中文真实RGB/预算、真实QtSequence关键词输入。Cocoa/Metal 的 DPR1 与 `QT_SCALE_FACTOR=2` 最终均 **15/15**；Node Classic **9/9**，另通过产物 ES2016/acorn 校验。像素测试保存 `build/folia-native-qml/classic-halo.png` 和 `classic-body.png`，独立检查正文非空、20/40px halo 产生正文外差分，同时不重建 atlas；`classic-bilingual.png` 保存音节计时、中英混排、换行与 chorus 场景。

QuickTest 截图含不透明窗口底色，差分以 RGB 检查，不能比较始终为255的alpha；检测坐标采用实际DPR并裁到截图物理尺寸，测试窗口可能受屏幕可用区限制。对比正文和halo前先快照真实source poses并冻结UI motion，避免live Binding在两张图间重写手动隔离的halos。Qt QVariantList/font属性读出的是live value view，快照必须复制数值与颜色；单独保存属性wrapper并不会冻结其值。

旧 runner 缺失 halo 属性时首先确认红灯；正式冻结重建后，offscreen 截图仍为空。最小直接 GlyphRun probe 和 `QSG_INFO=1` 最终定位：macOS 的 offscreen 平台使用 **software** 场景图，不绘制这个 GPU 自定义材质，但 textureUploads/renderBatches 仍可能非零。因此单靠这些计数不能声称实际效果；布局测试可以 offscreen，像素组须使用上述 Cocoa/Metal 命令，不能 skip。真实 Metal 的最小 probe、正文和独立 halo 像素均通过，未为此修改或放宽原语。Windows/Linux、不同 DPR、真实歌曲播放及与参考 Electron 的像素误差仍需相应环境验收。

2026-10-29 补充：实际 Motion 13.4.2 的 `animateMotionValue`、`MotionValue` 与 `spring` 生成器采集了 6 组含非零初速的 under/critical/overdamped 弹簧，以及 8 段重复重定向的数值 oracle；固定夹具记录原源文件 SHA，不依赖作者的 node_modules 运行测试。旧核心两项 RED，修后 Node Classic 11/11；真实 QML 直接操作上一帧、seek 和 native GlyphRun 的专项旧 F 包 2 通过/1 失败，候选 3/3，重复 32 次不改变 maskRevision。初次独立夹具缺依赖树/ICU 分词的设置失败保留，未计为有效 RED。该专项为 Software 布局/绑定检查，不等同 GPU 像素或完整 Framer 调度验收。证据位于宿主 `build/folia-update-20261028-r2/classic-interruptions-*`。

## 许可

Classic/GlowWord/计时/布局派生代码采用 **AGPL-3.0-only**，随插件根 `LICENSE` 分发，参考作者与提交保留在文件头和本记录。MIT 的 Motion 数学核来源为上述安装版本；完整 Copyright 2024 Motion B.V. 和 MIT 许可随 `qml/styles/classic/MOTION-LICENSE.txt` 保留。不新增应用依赖，不复制 framer-motion 运行时或整个 node_modules。
