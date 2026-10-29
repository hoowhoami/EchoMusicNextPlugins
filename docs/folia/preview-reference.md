# S11 独立预览

固定对照：Folia `a8da4437cf19723555bd75e4685ca20815fe5b82` 的 `PreviewPlaceholder.ts`、`preview/usePreviewClock.ts`、`preview/useVisPlaygroundPreviewPlayback.ts`、`preview/previewScale.ts` 与 `window/VisPlaygroundSampleStage.tsx`。

## 已确认设计

- `PreviewPlayground.qml` 仅接收外部 `settings` 草稿、真实插件服务和样式目录；Settings 集成由共享设置层负责。预览明确标为“预览示例”，不修改正式播放器、歌词模型或呈现时钟。
- 按需 Loader 内只有一个 SampleClock。源时间线循环、暂停、样式/样例重置、Fume 的 18.4 秒起始偏移取模，以及模拟频段/64 桶频谱保留；它们是示例信号，不声称来自真实 PCM。
- 用真实 VisualizerStage、BackgroundPresentation、SubtitleOverlay、ICU 与原生 GlyphRun。整曲样式新增 nullable `previewRows`；缺省 null 仍读取原 typed `EchoPluginReadModel`。显式预览只有四行快照，复用原测量、Worker 算法、容量限制与取消生命周期。
- 源 frameStage 填充数学保留，普通预览缩放 1.15，Monet 为 1.3；离场 actor 保留自身构图，不随新模式改变。
- 原两张 placeholder JPG 没有找到独立资产授权说明，原歌词样例也不用于本插件。使用明确标注的自撰四行及原创 SVG 封面，属于素材差异；不取用户当前歌曲、封面或歌词。

## 验收计划

- Node 对照原模拟频段/频谱函数及原 frameStage 数学，核对暂停、循环、重置、四行与毫秒行接口。
- 原生 Cocoa/Metal 覆盖十四种真实样式、实际字体测量与非空文字输出；验证预览暂停/样例切换、外部设置草稿、隐藏及 Loader 销毁。
- 同时记录正式播放器 revision、歌词行及位置，证明预览没有替换或 seek 正式播放链。保留失败证据，未完成项不标通过。

## 接入与生命周期

入口为 `qml/preview/PreviewPlayground.qml`：必需 `plugin`，接收外部 `settings`、`styles`、`appearance`、`viewportSize`；可绑定 `live`、`paused`、`motionEnabled`。公开 `sampleIndex`、`sampleClock`、`previewScene`、`renderReady`、`errorString`。`settings` 只读用于绘图，组件不持有配置写入口，不调用播放器命令。

Settings 应把 `live` 绑定到预览在滚动视口内且页面有效；组件再检查实际窗口显示/最小化状态。非活动时整个 Scene Loader 销毁，ICU operation、Worker、owned Timer、原生纹理及唯一 SampleClock 随作用域退役。软件或 Null 图形后端显示明确的原生图形需求，不以空帧冒充预览成功。`renderReady` 同时等待共享 Stage 的实际 `hasFrame`。

示例声部经过原 Harmony 索引与 HarmonyOverlay：第一组有三条、第二组有两条 background voice，均有毫秒逐字时间。封面和配色仅来自原创 SVG；用户选定的头像、表情、肖像、层图和全局背景仍使用同安装的实际资产集合与授权解码，不读取当前歌曲素材。模拟频段数学和 64 桶频谱与源函数相等；QML 用唯一 FrameAnimation 的单调帧增量驱动，模拟波形相位以该预览自身开始为原点。

`preview-scale.mjs` 从固定源 `previewScale.ts` 经现有 esbuild `transformSync({loader:'ts',format:'esm',target:'es2016'})` 生成，保留数学运算，再用仓库现有 Prettier 格式化。Node 每次直接编译固定源并 deepEqual 全组纵横比/缩放结果。

## 实测与边界

- Node `node --test tests/folia-preview.test.mjs tests/folia-package.test.mjs`：7/7，通过原频段、频谱、frameStage、起始偏移/暂停/循环、源 active-line 边界、两组四行/和声及包内 ES2016 AST 门禁。
- `tst_FoliaPreviewModes.qml` 在 QtTest 测试函数外的自然 GUI 事件循环逐个准备十四种实际 Stage 渲染器。每项记录 `QElapsedTimer` 的 `elapsedMs`，不能把 QtTest Totals 当单项准备耗时。暂停在示例 5.4 秒后，检查实际 native glyph metrics，再对同一冻结画面隐藏前景比较真实 GPU 像素，要求多列分布。此差分证明实际前景可见，包含样式装饰；不把全图均值或它单独当作逐字形一致性 oracle。
- Diorama 在冻结 linear 纹理后已释放 CPU atlas，读取其保留的实际 `measuredMetrics`；不要求已释放的 GlyphRun 继续驻留。Still 原实现使用原生 Text，单独豁免 GlyphRun 指标，仍要求实际前景像素差分。
- `tst_FoliaPreview.qml` 验证真实鼠标暂停、键盘示例选择、和声开关的像素变化、字体草稿实际进入 native runs、隐藏/关闭后整 Loader 释放与重新显示；对照真实播放器 revision/positionMs、80 行数及首行内容保持不变。另覆盖 Sonnet `sceneReady` 同步失效时的 generation/token/program 守卫。
- 通用 native runner 的插件是临时 `test.runtime` 安装，源码目录的外部 SVG 被真实拒绝；该 RED 保存在 `build/folia-preview-modes-source-permission-red.log`。测试 fixture 先把两张原创 SVG 复制进实际临时包再 import，以安装后真实包 URL 验收，未放宽宿主权限。正式 Folia 安装包中打开 Settings 的集成验收由共享设置层另行完成。
- DPR2 首轮 Lumiere 合法示例触发单 GlyphRun 八页容量限制，RED 保存在 `build/folia-preview-modes-capacity-red-dpr2.log`；由 Lumiere 有界原生绘制池修复，保留原字号、Canvas 命令、原纹理分辨率和宿主单批容量。最终结果见下方冻结记录。

### 预览冻结记录

2026-10-23：DPR1 十四样式 42/42（25.977 秒），DPR2 十四样式 42/42（56.549 秒）；逻辑框均 700×450，物理图分别 700×450 与 1400×900。DPR2 Lumiere 保留 175 条实际 native metrics、释放 atlas 后 batch=0，前景差分 246173 个采样点/8 列；Diorama 保留 10 条 metrics、batch=0，前景差分 8389 点/7 列。各项使用真正的前景隐藏对照。DPR2 同轮 Classic 墙钟 32.536 秒，期间有其他原生窗口与 Rust 编译，因此这组时间只记录验收墙钟，不作为安静环境下的性能结论。

UI/生命周期专项 DPR1 4/4（2.854 秒）、DPR2 4/4（3.006 秒）；Stage 默认生产路径 13/13（7.629 秒），TransitionFrame 4/4（0.442 秒）。日志为 `build/folia-preview-{modes,lifecycle}-dpr{1,2}.log`、`build/folia-preview-stage-regression.log` 与 `build/folia-preview-transition-regression.log`。`build/folia-preview-freeze-evidence.json` 保存非容量冻结时的源码与实际 runner 哈希；Lumiere 的最终容量修复由其专项单独记录。随后 generic fixture 的真实文件选择器交互由共享测试层修复，不能把新的 helper 源码哈希冒充此前 runner 的编译来源。
