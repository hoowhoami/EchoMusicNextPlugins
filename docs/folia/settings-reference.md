# Folia 共享设置与预览验收

对照 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82` 的 `window/VisPlaygroundSettingsPanel.tsx`、`useTuningDrafts`、registry 与随机样式选择。一个插件只注册一个 Folia 候选，14 种模式在其内部选择；当前默认 Classic，不自动修改用户选择。

## 随机池与持久化

`src/random.ts` 使用源 registry 顺序，池为空或旧值无效时恢复全池；正常编辑至少保留一种。有其他候选时不抽中当前项。选择只观察稳定歌曲身份，不因暂停、seek、同曲 revision 或元数据水合重复触发。`entry.ts` 在激活作用域观察唯一 player，不要求先打开皮肤；手动选择模式关闭随机，独立命令可再次抽取。原生 Qt sequence 在 JSON 边界规范化后校验，不能用 `Array.isArray` 误判合法池。

证据：`tests/folia-random.test.mjs` 5/5；真实 20 秒 FLAC、页面关闭条件下 `tests/native/folia-random.cpp` 3/3。原 Qt sequence 导致选出池外 Sonnet 的 RED 保留；修复后只从实际池选择，持久化回读通过。

## 当前设置范围

本轮只保留十四种歌词样式、共享字体/字幕、原生背景和资产设置；不提供模型分析、智能节拍、歌曲墙或插件睡眠选项。

## 拖动草稿与关闭

`SettingsDraft.qml` 仅供设置正文预览；正式播放页继续读取 authoritative configuration。范围控件按住期间累积本地 patch，松手后提交一次；键盘编辑立即提交。组复位只清理该组 held 字段。异步写入中保留 accepted overlay，失败回退实际已提交值；无草稿时复用原 committed object identity。

宿主新增通用 `ui.presentationClosing`，普通关闭/隐藏/替换在权限撤销前同步发 `page.aboutToClose`；插件停用或账号/scope 已退役时不发。回调不等待异步任务；接受后的配置由既有原子 writer 排空。LayerImageDraft 的 `commitBeforeClose()` 同步接入此边界，允许自己的闲置图片草稿排在无关数字设置写入之后；图片导入/导出/租约仍拒绝中断提交，旧 originals 仍只在持久化发布后清理。

证据：草稿 QML 7/7、图片 pre-close QML 7/7。安装包的真实 PlaybackPage、实际鼠标控件、QSaveFile JSON 回读覆盖：拖动不写入，松手仅一次 busy→idle，普通外层关闭提交 held 数值和图片池调参，停用丢弃 held 数值。Cocoa 3/3（`build/folia-settings-preview-native-cocoa.log`，2338ms），offscreen 先前 3/3；本轮 Cocoa 同时覆盖下述实际预览。

原生测试最初保留了被正常外观替换销毁的 raw 控件/抽屉指针，已用 QPointer 并在事件轮次后重新查找真实实例。早期 SettingsDraft 的 committedValues 初始化重入则是产品绑定循环，已由组件拥有的 deferred reconcile 修复，两者不混为一项。Qt 官方 WorkerScript 初始化警告仍原样输出，出处和独立复现见 [固定运行时差异](qt-runtime-compat.md)。

## 显式示例预览

`preview/PreviewPlayground.qml` 复用全部真实样式与背景，使用两套明确标记的自撰四行文案、原 SVG 封面、独立示例时钟与模拟音频；不修改实际 player 或实际歌词。支持暂停、选择示例、和声以及 settings 草稿。源预览的尺寸/缩放、Fume 起始比例和各样式 framing 保留，专项见 [preview-reference.md](preview-reference.md)。

正式 Settings.qml 默认折叠该预览，`PresentationScope` 检查原生祖先裁剪、几何和窗口显隐；被卷出视口后 Loader 销毁整个预览及示例时钟。它只提供有效几何可见 bool，不向插件暴露宿主祖先。原生容器 offscreen 4/4、Cocoa 4/4，正式 Release target 4/4；真实安装包展开预览→滚至字体滑块→旧时钟与旧预览均销毁断言通过。声明、SDK 真实导出与只读作者类型同步，无版本递增。

本轮 Node 全套 256/256；TS 作者类型通过。预览原生 14 种与 DPR2 Lumiere 容量修复分别由专属测试记录，不能用本页一个 Still 示例的安装验收代替。最终跨模式连续视觉、整包生命周期和 Release 性能矩阵仍待完成。
