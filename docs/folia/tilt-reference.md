# Folia 倾诉模式

固定来源：Folia `a8da4437` 的 `VisualizerTilt.tsx`、`tilt/tuning.ts` 与 `utils/lyrics/sentenceLayout.ts`，AGPL-3.0-only。

## 实现与验收计划

- [x] 记录原源数值 oracle，覆盖 1–4 行、片段 ICU 重切、1.6 溢出阈值、颜色与词/音节时序；运行缺失实现的红灯。
- [x] 移植纯布局与有界异步片段缓存；只有全部原始 ICU 片段和真实字体测量齐备后才发布布局。分段使用独立完整 QFont 与原生 GlyphRun，正文不申请 blur/halo 缓存。
- [x] 以真实静态宿主和 ICU 执行 QML 测试，覆盖 GPU 像素、动画期间不可重建 mask、暂停/seek 的 wall clock 出入场、失活取消与资源释放。

接口固定为任务单要求的 `Tilt.qml` 输入；不读播放器私有状态、不保存设置、不复制用户词表。等待真实 ICU 时不显示源内部 catch 产生的临时 fallback。

## 来源参数

`kernel.mjs` 保留源 `log(charCount + 4) / log(24)`、随机扰动 `seededRandom(seed,1) * 0.6 + 0.7` 和 `[0.45,1.05,1.7]` 行数阈值。seed 使用原行 `startTime`，长度和片段偏移保持源 UTF-16 语义。正文仅在最多四段中挑选一个斜体段；只含省略号的行不进行句子切分。

默认 `tiltSplitProbability=0.75`、`tiltStyleProbability=0.35`、`tiltColorScheme=default`。概率夹取到 0–1；色彩完整支持 `default`、`swap`、`accentAll`、`primaryAll`。共享 `fontWeight=null` 时正常段 400、斜体段 300，完整克隆宿主 QFont 家族链；缩放使用 `lyricsFontScale`，正文开关使用 `showText`。

测量字号保持 `max(viewportWidth * 0.06875, 90 * fontScale)`，可用宽度为 `max(320, viewportWidth) * 0.85`。测量值来自正常/斜体两个真实 GlyphRun 的 shaping metrics；溢出达到 1.6 后按可用宽度的 1.45 倍重切，最多四段。正常和斜体的缩放下限分别为 0.55、0.5；保留源重切后优先检查斜体段的分支。显示字号为 `clamp(50, viewportWidth * 0.06875, 90) * scale`，符合条件的末尾短行再乘 1.18。

正常/斜体字距为 0.08/0.15 em，空格最小宽度为 0.25/0.35 em；行高为 1.35/1.25，段间距在 640 px 处从 12 切到 16 px。斜体非空字形按视觉序号交替上下偏移，幅度保留源 `min(viewportWidth * 0.06875, 90) * scale / 6`。

## 文本与异步边界

`sentenceLayout.mjs` 保留五级标点、括号、西文块、中日韩空格和特殊字符规则，以及原始 ICU secondary split 与最短相邻合并。注入的 segmenter 只读取片段自身的原始 ICU 记录，不读取 `prepared.wordSegments`、jieba/BudouX 或保存分词。缺失时先收集当前层候选，暂停在原源 fallback 之前，异步填充后重新执行；所有记录齐备后的决策与原源一致。

每个准备世代最多缓存 32 个片段、65536 个 UTF-16 单元，只发一个操作，宿主 `Busy` 时 50 ms 后重试。字体测量也分批遵守 GlyphRun 每项 8192 单元的上限，完成后清空测量 runs，释放临时 mask。换行、字体/设置/宽度改变、失活和销毁均取消操作并隔离世代；旧结果不填入新缓存。真实分词不可用、输入超过原生字形容量或操作失败时显示可见错误，布局保持空值。

段时序通过全文中的 UTF-16 范围定位原始 words；有 syllables 时使用原始音节字素时序，否则按 word 时长分配。计数不吻合时保留源按段时长均分的分支。显示前瞻为 0.25 秒，整行边界为 start−0.1 到 `renderHints.renderEndTime`。原生连字或连接脚本始终保持 shaping cluster 完整，合并其相交的源字素时序，避免重排单个字素。

## 动画与生命周期

出入场使用呈现 wall clock，暂停音乐也会继续完成。正常/斜体段时长为 0.55/0.6 秒，初始 y 为 20/24 px，退出 y 为 −12/−16 px；斜体入场 scale 0.92，退出 0.95。字素 opacity 用 0.5 秒和视觉序号 ×0.04/0.05 秒延迟，缓动均为 `[0.25,0.46,0.45,0.94]`。

pulse 只读取 `timeSeconds`：时长夹取到 0.2–0.9 秒，正弦波后在 1.2 倍时长内缓升到 0.25 余辉，正常/斜体强度为 0.15/0.18；保留 60 ms CSS ease-out 平滑。每帧只发布 poses，`runs` 和字体只在布局变更时重建；正文 `maxBlur=0`、`maxHaloRadius=0`。最多保留四个切换图层，退出后 0.6 秒销毁，失活立即释放。关闭动画后立即更新终态，不保留退出图层。

## 验证

`node --test tests/folia-tilt.test.mjs` 覆盖源数值、实际 Node 24 ICU 片段 oracle、重切缩放、UTF-16/音节 pulse、缓存缺失与旧世代拒收。原始源通过只读 `git show a8da4437:<path>` 在独立内存模块中求得黄金值，测试不依赖参考仓库存在。

`scripts/test-folia-native-qml.py --host-build <真实Release宿主> --qt-bin <Qt6.12/bin> --input tests/qml/tst_FoliaTilt.qml --platform cocoa` 注入真实 Host scope 的 ICU 服务并使用 Metal。覆盖实际像素、斜体完整字体/颜色、320 px 四段重切、测量缓存释放、逐帧 mask/texture 不变、暂停延迟入场、快速 seek 的有界退出、失活/恢复和请求通知期间取消竞态。像素证据位于 `build/folia-native-qml/tilt-{body,icu-layout,narrow-layout}.png`。offscreen 软件后端不绘制此 GPU 材质，不能替代该像素验收。

当前验证限于本机 macOS、Qt 6.12 与 ICU 78.3；Windows/Linux GPU 和屏幕阅读器尚未验收。共享字幕、背景与准确 active index 由主线传入和挂载，本组件没有另建这些业务状态。
