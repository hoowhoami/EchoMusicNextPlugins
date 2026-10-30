# Cappella 源码对照

参考固定为 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`，实现代码按 AGPL-3.0-only 归属。这里只消费真实歌词、标题、封面和可选用户素材，不生成聊天演示数据。

## 输入与全曲编排

`Cappella.qml` 接收共享的稀疏 `preparedLines`、`lineMetadata`、`metadataBySourceIndex`、`currentIndex`（允许 -1）、播放秒数、完整 `baseFont`、主题、设置和生命周期状态。额外公开 `songTitle/coverUrl/avatarSeed/customAvatarImages/customEmojiImages`。输出 `requiredSourceIndicesKey` 请求最多20个候选消息与1个预热行的真实源索引；宿主仍负责读取与 Worker 准备。

完整歌曲只有轻量 metadata 进入独立 `conversationWorker.mjs`：start/end/renderEnd、timingClass、sourceIndex、compactCodepointCount、isInterlude 和真实存在的 agentId。短行严格按 `Array.from(fullText.replace(/\s/g,''))` 的 codepoint 数 <=12；既不是 UTF-16 长度，也不是 EGC 数。metadata 不含全文。首个不同的真实 agent 在右侧，其余在左侧轮换；少于两个不同 agent 时使用源 FNV-1a 确定性序列，不伪造 agent。

发送者 carry、每 N 行强制右侧并重置游标、侧向翻转、间奏、随机表情回复概率/间隔/全曲上限来自 `cappellaMessages.ts:12-225`、`cappellaMessageSenders.ts:24-82`。三种强度的完整参数来自 `cappellaIntensity.ts:8-149`。`messages.mjs/intensity.mjs/senders.mjs/constants.mjs` 是这些固定源码的 ES2016 移植。sourceIndex 保留稀疏原模型映射；every-N 使用有效行顺序。

间奏只匹配完整正文 `......`。随机表情只附加于 normal timing 行，activationStart 为原 endTime，activationEnd 至少晚 .08s；间奏至少 .12s，并受下一行 start 截止。消息仍按源顺序排列。Worker 构建 range-min 索引，GUI 每次仅查询最新至多20条合格消息，避免遍历全曲；预热按有序歌词时间二分，源窗口为提前 .18..1.1 秒。

## 原生布局与动效

基础字号 `clamp(18*lyricsFontScale,15,26)`，面板宽最多896、横向扣32；宽>=640使用68%气泡组，否则78%；正文最大宽 `max(96,floor(panelWidth*ratio-56))`，顶部48/64/80px对应<640、>=640、>=1024。头像40px、间距12px。源 `cappellaMessageLayout.ts:35-122` 的高度筛选保留至少两条上下文，最多20条；只实例化20候选加1预热/退场，快速 seek 在此上限内提前退休最老退场。

可见正文是一个完整上下文 `GlyphRun` paragraph：原生 QTextLayout 执行 word-boundary-or-anywhere 换行、BiDi、回退与联字；无 GUI 估宽/粗换行，也无每字 Text、Canvas 或 MultiEffect。字体保留完整 QFont，只覆盖源字号与字重。段落行距 `round(fontPx*1.45)`，垂直 leading 由真实 FontMetrics 得到。

源 `cappellaBubbleMetrics.ts:96-215` 会预计算全部前缀尺寸。这里用一个隐藏的原生 `PrefixPreparation` 分 turn 测量完整安全 cluster 前缀，每 turn 最多4个，不分配 mask/纹理。缓存原生前缀尺寸与 BiDi 坐标，之后只平移已缓存完整上下文字形。最多32个缓存项，合计65536条前缀位置；超限显式 error，不截尾、不缩字体冒充成功。拒绝的 layout 不发布 poses，避免有效 pose 更新清掉拒绝错误。

源 `cappellaReveal.ts:44-208` 的 EGC timeline、至少40ms fade、220ms缺省、200ms气泡尺寸提前量与最后字淡入完成后的时间戳均保留。安全联字 cluster 不拆开：当其首 EGC 到达时整体出现，并用最长所含 fade。源 ActiveCappellaText 的 codepoint spans 在组合字符/ZWJ 上不安全；此处遵守宿主 EGC/联字契约，明确不声称逐 span 像素等价。

角色、显隐与 reveal 阈值由播放时钟驱动；row 进入/退出、宽高 .2s ease-out、avatar spring（normal 340/28/.72）、opacity/scale/marginTop 与暂停后仍能结束的文字淡入由 UI 时钟驱动。回退 seek 取消后续字，不重传全文纹理。时间戳11px medium、opacity .62、偏移4px进入、格式按原 endTime floor 到分:秒。

气泡圆角24，下方发送侧圆角6；直线 RGB 混色保留源主题公式。active gradient保留0/.23/.34/.5/.73/.84/1 stops、200%宽循环、105°方向与强度。阴影仅每个气泡一次 GPU MultiEffect，头像使用独立圆裁剪与阴影。Qt阴影核、原生整数像素字号、数值积分弹簧与 Framer 速度继承仍存在引擎差异，不能声称浏览器逐像素相同。

`live=false`、不可见或销毁立即取消 preparation、销毁 Worker/行、清空缓存；恢复重新建立。Worker generation 丢弃迟到结果。source `cappellaConstants.ts:9-26` 的32项 LRU、20条消息、预热窗口均有对应上限。

## 素材与通用服务边界

`assets/avatar/` 的15张 PNG与 `assets/emo/` 的9张 PNG，逐字节复制自固定源目录；两个 README 完整保留源作者的独立授权，允许使用、修改与分发，且作者明确将图片排除于代码 AGPL 之外。README 关于 AI/版权的判断是源作者原文，并非本项目的法律结论。头像按源文件名字典顺序、seed、side和index稳定选择，左右不重复；封面为源3×3网格裁剪，color模式使用源主题渐变。

用户资源由外层宿主通用 assets 服务提供已授权 URL列表，component 接受 string 或 `{id,name,url}` 项，最多128个。空custom pack回退builtin。组件不自行打开文件选择器、持久化文件或安装字体。主线负责service、设置菜单及SDK公开契约；本目录不增加依赖。

## 验证

`node --test tests/folia-cappella.test.mjs`：9/9。包含固定源码30行 oracle（carry/reset/两个随机回复/间奏）、agent、稀疏索引、重叠时间、虚拟窗口、UTF-16/联字cluster、lookahead/暂停fade、完整强度与头像选择。

真实静态宿主 SDK QuickTest：`QSG_RHI_BACKEND=metal QT_QPA_PLATFORM=cocoa build/folia-native-qml/folia-qml-test -input tests/qml/tst_FoliaCappella.qml -o -,txt`，DPR1/2各9/9（含7行为）。覆盖真实段落RGB、圆头像角像素、maskRevision/uploads稳定、稀疏/-1、表情agent、预热cacheBytes=0、8193 UTF-16拒绝/恢复、生命周期和窗口/缓存上限。Qt6.12 WorkerScript 初始化产生已知 QObject::connect(QJSEngine,QtObject) 警告；LLDB栈定位在QtObject构造，既有FoliaText同样复现，没有屏蔽。offscreen软件SG仅用于逻辑，不能验收自定义材质像素。

彩色字体原生RGBA支持正在同轮通用GlyphRun实现，补齐前emoji正文仅有alpha轮廓；独立图片表情已为原图。正式assets服务、安装包及跨平台仍需主线集成验收。
