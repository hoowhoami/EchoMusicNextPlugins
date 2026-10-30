# 四种样式的主题图标

参考固定 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`。公开的 `snapshot.themeMetadata.lyricsIcons` 经 appearance、`DynamicPresentation.shownAppearance` 与 `VisualizerStage.bindInputs` 传入 Sonnet、Lumiere、Pendolo、Monet。换歌持有 A 的主题时沿用同一个 shownAppearance，不额外读取当前 B 的图标。宿主限制列表最多64项、每项1..128 UTF-16；未知名字原样保留，让样式按自己的源行为处理。

| 样式    | 固定源码                                                  | 实际行为                                                                                                                         |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Sonnet  | `sonnet/sonnetIcons.ts`、`services/lucideIconResolver.ts` | 列表大小写不敏感，按原表优先级规范化并去重；无有效图标时 Flower。沿现有粒子、纹理键、原生矢量路径，不另写布局。                  |
| Lumiere | `lumiere/lineart/themeIcons.ts`、`iconPaths.ts`           | 相同列表规范化，无有效项时空数组；原随机种子、文字避让、折线、节点和描线时序不变。`stage.mjs` 传入实际列表，不再清空。           |
| Pendolo | `pendolo/VisualizerPendolo.tsx:445,554`                   | 仅精确查找首项，失败回退 Star；后面有效的项不能替代未知首项。尺寸仍 `max(14,baseRadius*.13)`，strokeWidth1.2、accent alpha .62。 |
| Monet   | `monet/MonetFloatingDecor.tsx`、`VisualizerMonet.tsx:217` | 原10槽经过原过滤实际为8槽（id1,2,3,4,5,6,7,9），按原列表顺序及重复项分配。未知的精确名字只留空内容，没有 Flower/Star 回退。      |

`ThemeIcon.qml` 供 Pendolo/Monet 使用，复用已分发的 Sonnet Lucide1.48.0 全量固定矢量与别名表。只接受精确图标导出名，不接受外部 SVG。原 SVG 的 path、line、circle、ellipse、rect、polyline、polygon 转为原生 PathSvg；新增直接图标路径保留圆角矩形的椭圆弧。Sonnet 既有纹理转换没有随之更换。大小缩放后保留源 absoluteStrokeWidth、round cap/join；不创建图片缓存或下载依赖。`__proto__` 等对象继承属性不能成为导出名；列表中的大小写别名按原 Map 优先级去重。

Monet 的 `decor-frame.mjs` 读取原五段 x/y/rotation/opacity 关键值、20..39秒周期及各槽 delay，复用 Classic 已移植的 Motion easeInOut/easeOut。精确关键帧避免 delay 浮点抵消引入的 Bezier 端点偏移；精确周期边界保留最后关键值，下一周期继续原循环。根层2.2秒 easeOut 入场随 introRevision 重置，位置在海报内容之下且裁切。动画只用 UI 帧间隔，暂停仍推进；全局 motionEnabled=false 按现有插件的减弱动画规则立即静态。隐藏/live=false 停止 owned FrameAnimation，showText=false/退出销毁 Loader 和槽位。空图标列表不创建装饰对象。

## 证据与范围

- `node --test tests/folia-theme-icons.test.mjs`：5项，包括完整固定图标名表对照原 resolver/Sonnet 的回退，实际 Lumiere TS 线稿相等，原 Monet TS 的粒子、空槽、关键帧、周期及静态分支。oracle 只替换 React/动态加载环境，不替换上述源算法。
- 同时运行 `folia-{theme-icons,sonnet,lumiere,pendolo,monet}.test.mjs`：62/62。原型名字、大小写别名和圆角弧的实际 RED 留在本轮 ignored 证据中，没有降低断言。
- `tests/native/qml/tst_FoliaThemeIcons.qml`：Qt6.12 offscreen/software 7/7，强制断言 GraphicsInfo.Software。实际 Stage→四组件的动态主题替换、原生矢量解析、Pendolo 首槽回退、Monet Loader/showText退役、8槽与 owned clock 均验证；不是 GPU 或像素等价测试。
- 已冻结的旧 F 包 `f18be9f0…` 解出860份原始 QML 材料，在同一软件 runner 的 Stage/Lumiere 实际输入断言中2通过/2失败；相同断言仅改材料根地址后，候选4/4。原始日志、包 SHA 与逐文件摘要保留在宿主 `build/folia-update-20261028-r2/theme-icons/`。

原有 Qt used-before-declared、Worker 空 QJSEngine 与字体别名警告未被屏蔽。本文不声称新的四样式图标通过 GPU 截图、搬迁安装包、完整14样式或前台性能验收；这些由统一候选构建继续验证。

Folia 派生代码采用 AGPL-3.0-only；固定 Lucide 数据的 ISC 及 Feather 派生图标 MIT 原文沿用 `styles/sonnet/LUCIDE-LICENSE.txt`，其他现有副本保持原字节。Monet 复用的 Motion easing 保留 `styles/classic/MOTION-LICENSE.txt`。没有新增依赖、设置或宿主私有调用。
