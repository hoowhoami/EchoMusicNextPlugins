# Folia 共享播放胶囊

固定参考为 Folia `a8da4437`，派生代码保持 AGPL-3.0-only。此文描述精简后的当前范围，旧包与已移除协议的历史验收不作为本版证据。

## 布局与生命周期

`PlayerCapsule.qml` 保留展开/折叠、响应式布局、标题前后曲预览、进度条、两个动作槽和懒加载歌词时间轴。宽布局为播放键、标题/进度及槽位；窄布局分三行。完整字体链由宿主提供，胶囊只覆盖局部字号与字重。

`PlayerCapsuleState.qml` 保留 20 ms 展开、100 ms 收起、640/768 px 断点、32 px 底距与按高度夹取的定位范围。`PlayerCapsuleSpring.qml` 使用质量1、刚度280、阻尼24的物理解，静止后停止 FrameAnimation。定位编辑不回写配置，保存才 patch，取消或失活回滚呈现位置。

共享显隐策略、指针保护、页面失焦与退出资源回收不变。音量弹层和时间轴使用 Loader，仅在需要时建立真实控件/模型视图；关闭或 scope 失活后退出。

## 当前播放器与命令

胶囊的标题、进度、收藏和所有控制均来自 `page.player` 的 native current。只读 A/B 投影继续服务歌词、和声和背景，不成为第二个播放器或选源恢复协议。

可选槽位为 `loop`、`prev`、`next`、`like`、`lyrics-timeline`、`volume`、`queue`。对应宿主已有 `mode`、`previous`、`next`、`favorite`、`volume`、`queue` 命令；播放键使用 `toggle`。进度条拖动只预览位置，松手提交一次已有 `seek`；捕获手势开始时的 revision，旧曲命令由宿主校验。没有裸路径、独立音频源、队列写副本或额外选源命令。

`PlayerCapsulePanel.qml` 仅提供现有 `volume` 控制，调整即生效和保存；没有预览租约、提交/撤销协议或离开页面自动回滚音量的承诺。歌词时间轴直接读取 native current 的公开只读歌词模型，行点击携带 revision 通过普通 seek。动态歌词的 outgoing A 尚在显示时拒绝行点击，包括 native 已切 B 而 GUI handover 通知尚未到达的窗口；Monet 已切到 incoming B 后和普通当前源继续使用原 seek。

相邻标题由原队列 `isCurrent/title` 读取，只缓存呈现标题；one/off 不跨越端点，all 可环绕，FM 不预测尚未获取的歌曲。标题稳定键使用已有只读 resourceId，不使用额外队列 identity role 或选源权限。

## 配置与验证边界

保留四项配置：`playerBottomBarOffset`、`playerControlSlotPrimary`、`playerControlSlotSecondary`、`alwaysShowTrackSwitchButtons`。设置页通过现有 `closeSkinSettings()` 与共享 UI 请求进入位置编辑，消费序号防止重新挂载时重复进入。

状态、弹簧、字体、真实父级销毁和原有生命周期回归保留；精简后的音量/普通 seek 与当前曲接线须在新的统一宿主上复验。当前阶段只进行 Node、TypeScript 和 QML 静态验证，不将旧模型分析/选源/队列墙结果移作本版通过证明。整体状态由 [验证记录](verification.md) 维护。
