# Folia 文本准备

本目录实现插件自己的文本准备，不访问宿主私有歌词模型，不修改源歌词时间或宿主设置。参考 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`；运行层没有 Node、浏览器 DOM、Intl、Unicode 属性正则依赖。

## 版本与重建

- 实测 Node **24.15.0**：ICU **78.2**、Unicode **17.0**。构建器拒绝其他 Unicode 版本。
- 参考项目安装的 Electron npm 包为 **43.7.5**；该安装没有 Electron 可执行文件，故没有实测其运行时 ICU/Unicode，不能将 Node 结果冒充 Electron 结果。
- `scripts/build-folia-text.mjs` 从官方 Unicode **17.0.0** 文件生成分类、Script、Grapheme_Cluster_Break、Indic_Conjunct_Break 和 Extended_Pictographic 范围。`unicode-sources.json` 记录完整 URL 和 SHA-256；脚本将这七份原件的预期摘要固定在代码内，先核验全部缓存或下载字节再写生成物，拒绝变化，坏下载不写缓存。下载缓存在 `build/folia-text/`，运行时只读生成数据。EGC 使用 UAX #29 默认扩展字素规则，包括 GB9c、GB11、GB12/13，保留 UTF-16 索引及未配对代理项。
- 字典由参考项目现有 Vite 数据插件在构建期生成，复用其现有 `opencc-js`、BudouX 包及本仓库现有 esbuild。没有新增应用依赖，没有复制整个 node_modules。字典 349,045 词，压缩词频解码为 381,029 字节；生成的字典模块约 4.25 MB、HMM 模块约 0.50 MB，日本语模型约 24 KB。

```sh
node scripts/build-folia-text.mjs --reference ../folia-major
node --test tests/folia-unicode.test.mjs
QT_QPA_PLATFORM=offscreen /absolute/Qt/6.12/bin/qmltestrunner -input tests/qml/tst_FoliaText.qml -o -,txt
```

需要 Node 24 且参考仓库固定在上述提交；构建命令先准备官方测试数据及 QML 语料 fixture，随后可离线运行测试。`--unicode-only` 仅重建官方 Unicode 范围，不准备 Folia 或完整测试 fixture。

## 可调用接口

`qml/shared/text/unicode.mjs` 导出 `UNICODE_VERSION`、`graphemeSegments(text)`（`{ segment, index }[]`，index 为 UTF-16 code unit）和 `splitLyricGraphemes(text)`（string[]）。还导出 `categoryOf(codePoint)`、`hasCategory(codePoint, category)`、`hasScript(codePoint, script)`、`isEcmaWhitespace(codePoint)`，以及 Folia 所需的 `isPunctuationOnly`、`isWhitespaceOnly`、`hasLetterOrNumber`、`endsWithLetterOrNumber`、`isCjPiece`、`hasKana`、`isAlphabeticWord`、`hasInlineContraction`。Script 接口仅接受 Han、Hiragana、Katakana、Hangul、Latin。

- `\p{L}`、`\p{M}`、`\p{N}`、`\p{P}`、`\p{S}`使用完整 Unicode 类别，Script 使用 `Script` 而非 `Script_Extensions`。`\s` 保留 ECMAScript 集合：包括 FEFF，不包括 0085。孤立组合附标与零宽格式字符不属于“仅标点”，不能用“含字母数字”替代这一判断。
- `graphemeTiming.mjs` 保留 `buildWordGraphemeTimings(word, wordIndex?)`、`buildLineGraphemeTimeline(line)`。音节优先；没有音节时在 word 内平均分配字素；全行空白/标点缺口使用上游零时长规则。数值单位沿用调用者输入，同一行须保持一致。
- `wordSegmentation.mjs` 保留上游全部导出：保存边界必须精确重构 fullText，优先级为 wordSegments、autoWordSegments；保存边界只移出边缘空白，保留内部短语及粘附标点。`segmentTextWords` 明确是上游无 Segmenter 时的**字素回退**，不是 ICU 分词。正式动态布局应先完成 Worker 准备，避免落入该回退。
- `cjkSemanticLayout.mjs` 保留 `buildPostLyricLayoutUnits`、`buildCjkSemanticLayoutUnits`、`createSingleWordLayoutUnits`、`applyStickyPunctuationLayoutUnits`、`buildDisplayWordsFromLayoutUnits`。CJK 门限仍是上游有限 BMP 范围；对不齐 parser words 时保留逐 parser word 回退。语义单元保留原词及计时；粘连的非语义单元合并显示 Word，和上游一样不保留子词 syllables。
- `icuFolia.mjs` 的 `segmentWithIcuFolia(text, engines, icuPieces)` 必须显式传入能精确重构原文的 ICU string[]。不使用 Qt Word 或默认 UAX29 word 代替 ICU。中文仍使用繁简逐字符映射、原 jieba 图/概率/HMM、二字 HMM 限制、增补/降权词、尾助词规则；日文仍用 BudouX 0.9.3 jaModel；保留原连字符归并。

## Worker 与主线边界

创建 `text/TextPreparation.qml`，绑定 `trackRevision`（字符串）与 `active`。调用 `prepare(lines, icuPieces, options?)` 返回请求号，接收 `prepared(requestId, trackRevision, result)` 或 `failed(requestId, trackRevision, message)`；`cancel()` 使未完成结果失效。`icuPieces` 是按行排列的 string[] 或 `{ segment, index, isWordLike }[]；对象索引须与 UTF-16 累计偏移一致。已经携带有效保存/自动边界的行可不传对应 ICU pieces。

`lines` 必须是 Folia 形状 `{ fullText, words, startTime, endTime, ... }`；每个词为 `{ text, startTime, endTime, syllables? }`。结果为 `{ unicodeVersion, segmentation: 'icu-folia', lines }`，每个结果行为 `{ line, graphemes, wordSegments, timeline, layoutUnits, displayWords }`。options 默认 `{ semantic: true, sticky: true }`，也可传上游布局选项。

主线先通过公开原生 ICU 批量接口取得词边界，再将纯值批量传给 Worker。Worker 不接收、调用或跨线程共享 ctx/QObject。WorkerScript 在第一次 prepare 时才创建，字典静态 import、解码、引擎初始化及整批分词都在真实工作线程执行；GUI 不 import engines。待脚本 ready 前只保留最新请求；已发送结果用请求号与 trackRevision 双重过滤。停用/销毁会断开结果通道；cancel 不强行打断已在执行的 JavaScript。字体测量和渲染仍由主线 Qt 引擎负责，此层不伪造浏览器字体宽度。

`shared/PreparedLyrics.qml` 已连接真实 `plugin.text.segmentWords` 与只读 `page.player.lyrics`，默认当前行前后各 16 行；缓存最多 64 行、131072 个文本 UTF-16 单元。每次 ICU 请求最多 64 行、65536 单元，顺序衔接 Worker；换行窗口、模型替换、偏移变化与 scope 撤销会取消交付。输出是以源行下标索引的稀疏 `preparedLines`，未进入窗口的行不创建对象。真实宿主专项测试已验证中文、英文、emoji 字素、单次偏移、100 行模型中的 33 行窗口、同曲替换与退役后清空；此项不代替实际音频和动态渲染验收。

宿主 lineText/startMs/durationMs 转成上述形状时，startMs 已含生效 offset；words.start_ms 为源绝对时间，需要**加一次**生效 offset。不可对行再加 offset，亦不可把 global/track 再重复相加。宿主当前标准解析结构没有 Folia 的 syllables、saved/auto wordSegments、backgroundVocals、alternateTexts、renderHints；缺失值保留缺失，不能把 romanization_segments 当成计时音节。renderHints 为上游呈现推导层，可由主线从最终时间重建。

## 验证与已知差异

先新增测试并确认因缺少实现失败，再实施。Node 与真实 QV4 均通过官方 Unicode 17 GraphemeBreakTest **766/766**；全部 0..10FFFF 的 L/M/N/P/S 与 Han/Hiragana/Katakana/Hangul 属性和 Node Unicode 17 属性正则一致。Node 和真实 Worker 均通过 Folia **120 条 GOLDEN＋6 条 KNOWN_GAPS** 原结果。另覆盖 emoji/Indic/未配对代理项、音节计时、保存短语、CJK/缩写粘连、ICU 缺失报错与跨曲迟到结果丢弃。

Qt 6.12 Worker 初始化会输出 `QObject::connect(QJSEngine, QtObject): invalid nullptr parameter`；测试仍全部通过，没有屏蔽该警告。官方源码 `qquickworkerscript.cpp:243/344` 创建独立 QV4 引擎并初始化 QML global；`qqmlbuiltinfunctions.cpp:272` 的 QtObject 构造尝试连接空 jsEngine。此层不修补 Qt，也不把该警告作为成功证据。来源：[WorkerScript 实现](https://github.com/qt/qtdeclarative/blob/v6.12.0/src/qmlworkerscript/qquickworkerscript.cpp#L243)、[QtObject 构造](https://github.com/qt/qtdeclarative/blob/v6.12.0/src/qml/qml/qqmlbuiltinfunctions.cpp#L268)。

Folia 自身的已知中日混排、全汉字日文及其他分词缺口继续保留；本层不擅自“纠正”上游算法。不同 ICU 版本/locale 的初始词边界可能不同，原生接口须公布真实 backend/version/locale，不能仅靠 Unicode 版本声称一致。

## 许可与来源

- Folia 的 jieba 实现、布局、计时和词典覆盖规则采用上游 AGPLv3；本目录集成代码采用 **AGPL-3.0-only**，随插件根 `LICENSE` 分发。生成文件首行标注提交与来源，不改变仓库其他插件许可。
- jieba 词典/HMM 来自上游记录的 `fxsjy/jieba@67fa2e36e72f69d9134b8a1037b83fbb070b9775`，MIT；保留 `JIEBA-LICENSE.txt`。
- BudouX **0.9.3** parser 与 jaModel，Copyright 2021 Google LLC，Apache-2.0；保留源文件许可头、`BUDOUX-LICENSE.txt`、`BUDOUX-NOTICE.txt`。没有引入 HTML parser 或其他语言模型。
- 构建期 OpenCC-JS **1.4.2** 代码采用 MIT，保留 `OPENCC-JS-LICENSE.txt`；逐 BMP 字符 t→cn 映射来自该包的 opencc-data 字典（Apache-2.0），保留官方包内 `THIRD_PARTY_LICENSES.md` 的逐字节副本 `OPENCC-THIRD-PARTY-LICENSES.txt` 及 `LICENSES/Apache-2.0.txt` 的副本 `OPENCC-DATA-LICENSE.txt`。生成器每次复制这三份原文。这不是宿主 OpenCC 短语转换接口，两者不能替代。
- Unicode **17.0.0** 数据，保留 `UNICODE-LICENSE.txt`；具体官方数据来源与摘要见 `unicode-sources.json`。[UAX #29](https://www.unicode.org/reports/tr29/)、[Unicode 17 官方数据](https://www.unicode.org/Public/17.0.0/ucd/)。当前许可证是已核验并随包保留的 Unicode License V3（Copyright 1991–2026），SHA-256 为 `e7a93b009565cfce55919a381437ac4db883e9da2126fa28b91d12732bc53d96`；它的官方来源 `https://www.unicode.org/license.txt` 未版本化，故缺少缓存时读取此固定本地原件并验证，不再下载浮动许可证，也不将它称为 Unicode 17 发布当年的许可证快照。

## 共享播放页的紧凑投影

`shared/lineTiming.mjs` 从固定源码 `parserCore.ts` 提取 `buildTimedWords`。真实逐字词保留原时间；只有普通 LRC 的 words 缺失时使用 Folia 相同的显示插值，并标为 `timingSource: 'line-interpolated'`。这不是音节或人声分析结果。行 offset 已包含于 startMs，真实词仅加一次 offset。

`LyricTimeline` 分 turn 读取每批 64 行，独立 Worker 建立时序树、下一句时间表和轻量 metadata。输出只有 sourceIndex、原始/呈现时间、timingClass、codepointCount、compactCodepointCount、isInterlude，以及真实存在的 agentId。compactCodepointCount 精确保留 Folia 去除 ECMAScript 空白后按 codepoint 计数；不把 UTF-16 长度或 EGC 数替代它。全曲 metadata 不缓存正文或 GUI 字形对象。Cappella 通过 `requiredSourceIndicesKey` 为最多 20 个候选加 1 个预热行请求稀疏准备；Fume 独立在 Worker 中构建全文数值几何，仍只建立 viewport 有界字形对象。

## Qt 6.12 字符串集合兼容（2026-10-23）

实际 GUI 和 WorkerScript 都测得：`Array.from("😀")` 产生两个 UTF-16 项，而 `for..of` 与 `codePointAt` 保留完整码点。新增 `codepoints.mjs` 轻量适配，只替换 jieba/繁简映射中原本用于拆字符串的 Array.from；数组、Qt sequence、Map/Set 和 array-like 用法不变。生成脚本同步适配，算法/频率表/词典没有变化。

真实 Worker 的 `cutChinese("𠮷 😀")` 先失败（emoji 拆开），修正后与 Node 原算法同为三项；原生文本专项 8/8，包括完整 126 项分词语料和 766 项 Unicode 17 字素案例、换歌迟到结果拒绝。日志 `build/folia-qv4-codepoints-{red,current}.log`，独立 GUI/Worker 探针 `build/folia-unicode-probe/acceptance.log`。这项结论不延伸为所有 Qt 集合操作都不安全。
