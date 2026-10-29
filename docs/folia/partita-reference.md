# Folia 云阶（Partita）

固定只读来源：Folia `a8da4437` 的 `VisualizerPartita.tsx`、`partitaLayout.ts`、`PartitaChunk.tsx`、`tuning.ts` 与共用 GlowWord，AGPL-3.0-only。

## 计划

- [x] 对只读固定源码进行内存求值，记录 chunk 切分、随机参数、字体、时序和缓存 key 数值 oracle，先确认测试红灯。
- [x] 原样移植 semantic/sticky 布局与设置；以原生 GlyphRun 测量 word，保持稳定单列分块，引导线与正文共享真实 wall clock 状态。
- [x] 使用真实宿主和 Cocoa/Metal 检验像素、正文/独立高光、引导线、缓存复用与暂停/seek/失活生命周期。

源码实际仅创建一个 column；`getTargetColumnCount` 未被调用，不将这个未执行的辅助函数当成正式多列行为。页面、配置、字幕、背景和准确 active index 保持主线所有。

## 公开配置与组件

| flat 字段                  | 默认值 | 范围/步长                 |
| -------------------------- | ------ | ------------------------- |
| `partitaShowGuideLines`    | `true` | 布尔                      |
| `partitaUseSemanticLayout` | `true` | 布尔                      |
| `partitaStaggerMin`        | `20`   | 有限数，0–180，设置步长 1 |
| `partitaStaggerMax`        | `100`  | 有限数，0–180，设置步长 1 |

源 resolve 对两个 stagger 值先夹取再排序，较小值作为 min、较大值作为 max。共享字段使用 `animationIntensity`（calm/normal/chaotic）、`lyricsFontScale`、`fontWeight`（null 时 700）、`wordColors`、`showText`。Partita 的词旋转与整体漂浮保持自身源语义，不受 Classic 专属开关影响。

`Partita.qml` 输入与 Classic 一致：`preparedLines`、准确 `currentIndex`、`timeSeconds`、完整 `baseFont`、`settings`、三种文字颜色以及 `live`、`motionEnabled`、`dark`。只消费准备好的全文分词和原始 word/syllable 时序，不读取播放器、宿主私有对象或另一份分词服务。诊断输出为 `layout`、`chunks`、`chunkCount`、`renderer`、`layoutCacheSize`、`layerCount` 与 `errorString`。

## 布局与字体

`layout.mjs` 直接移植 `partitaLayout.ts` 的实际路径，复用已移植的 `buildPostLyricLayoutUnits`。语义布局可采用原始 ICU/jieba/BudouX 的整行准备结果和用户保存分词；关闭语义时仍保留 sticky 标点/缩写规则。Qt QVariant 初始属性与配置中的列表可能是 Qt Sequence，进入纯 JS semantic 和词色边界前仅在输入变化时正规化，避免 `Array.isArray` 失败后静默退化。

目标 chunk 数为 `max(1, floor(windowHeight * 0.65 / 100))`，实际数量取该值与 layout units 数的较小值。以原行 `startTime` 作为递增 seed，用 `sin(seed++) * 10000` 的小数部分不均匀分配 units。偶数 chunk 向左错位，奇数向右，幅度在 staggerMin–Max 内；普通/混沌 scale 取 `0.8 + random * 0.9`，calm 为 1，混沌再乘最多 1.05 的字数系数，并交替旋转 −3/+3 度。普通/混沌 y 为居中行序 ×2.5，calm 为 0。

单列居中，横向 12 px 内边距、最小宽度 60.8 px、最小高度 384 px；外层宽度上限 1024 px，页面左右共留 64 px。chunk 按字体 shaping 得到的真实 word 宽度自然排列，每词右边距 12.8 px，chunk 内边距为横向 8、纵向 3.2 px；普通下边距 9.6 px，混沌为 6.4 px。词本身的随机位移/旋转保留 source `firstWord.startTime + index * 7.13` 与 offset 1/2/3/8 的取样。

主字号使用 `clamp(40, viewportWidth * 0.055, 72) * lyricsFontScale`，保留源 CSS 三位小数写法的数值；非空白字素与原始 word 数的较大值超过 40 时整体乘 0.8。完整宿主 QFont 家族链保留，局部字号与 700 默认字重由 GlyphRun 的 run 参数覆盖；行高为字号 ×1.22。

缓存与源一致，按插入顺序淘汰最早项，最多 48 项，并不是命中时刷新顺序的 LRU。key 包含原行 start/end/text/word 数、用户/自动分词边界 key、强度、字重、24 px 高度 bucket 和四个独有设置。新准备对象替换相同 key 时重新布局，避免新时序仍引用旧 words。未来行在 0.18–1.2 秒前瞻范围预热，一轮输入下只准备一次；逐帧不会重切或测量文字。

## 动画与引导线

`motion.mjs` 保留 chunk waiting/active/passed 三态：waiting opacity 0、scale 0.85，并在左右错位上再偏移 40 px；active 用 200/20 弹簧回到源位置与 scale 1，opacity 用 0.1 秒；其他切换用 0.4 秒 ease-out。状态边界复用共用 GlowWord profile 的 0.15/0.08/0.03 秒前瞻和正常/short/micro 行处理。

`PartitaChunk.qml` 复用 Classic 共用 GlowWord 的正文颜色/blur、完整 shaping cluster、逐音节高光、200/20 词弹簧、5 秒 passed 旋转和 chorus 0.5 秒涟漪。每个原生 run 固定 `maxBlur=32`、`maxHaloRadius=80`，内外高光保持独立原生半径和颜色，逐帧只修改 poses。chunk 和行变换、漂浮/入场/退出使用呈现 wall clock，暂停播放仍完成过渡；高光取样读取准确播放时间。

引导线左右交替，垂直线为 1×32 px、底部延伸 16 px；水平线宽度为 chunk+36 px、高度 1 px、底部延伸 8 px，保留左侧 x=−16 与右侧 x=−20 的不对称。两线以相应边缘为原点在 0.4 秒内展开，active 使用整个 chunk 的关键词颜色，passed/waiting 为白色 alpha 0.22/0.14；active 阴影半径 10 px、alpha 分别 69/255 与 53/255。光晕/模糊由 GPU MultiEffect 承担，没有 Canvas 或 WebView。

整体漂浮使用 calm 10 px/8.5 秒、normal 14 px/7 秒、chaotic 18 px/5.8 秒，保留 `[0,−distance,0,distance*0.45,0]` 和 `[1,1.01,1,0.995,1]` 序列。行切换复用共用 GlowWord 正常/short/micro 出入场；隐藏文字只淡出 0.2 秒，不放大/加模糊。最多保留四个退出图层；失活立即销毁原生节点并清空缓存，关闭动画时立即切换终态。

## 验证与边界

`node --test tests/folia-partita.test.mjs` 覆盖完整源模块与依赖通过固定 commit 只读内存打包求得的黄金数值，包括三个强度下的 chunk/text/config、词内 jitter、保存分词优先级、缓存 key/淘汰、字体密度、真实 metrics 几何、guide 坐标和时序。测试本身不依赖参考仓库存在。

真实静态宿主 runner 使用 `scripts/test-folia-native-qml.py --host-build <Release宿主> --qt-bin <Qt6.12/bin> --input tests/qml/tst_FoliaPartita.qml --platform cocoa`。Cocoa/Metal 验证 9 项通过，包括实际正文/独立高光像素、真实字形纹理不随帧重建、原始 saved/auto 分词跨 QVariant、41 字密度、预热对象复用、关键词引导线/涟漪、暂停/seek 与失活资源释放。截图为 `build/folia-native-qml/partita-{guides,body,halo}.png`。

本机验证为 macOS、Qt 6.12、Metal；Windows/Linux GPU 与屏幕阅读器尚未验收。宿主 GlyphRun 的公开容量限制仍适用，错误通过 `errorString` 与可见文字呈现。准确 active index、共享字幕与背景由主线提供，本组件不复制这些业务状态。
