# 动画图片后台帧准备

## 已确认的问题

Qt 6.12 的 `QQuickAnimatedImage::load()` 在所属界面线程创建 `QMovie`，后续计时器直接调用 `QImageReader::read()`；该实现没有消费 `asynchronous` 属性。`sourceSize` 控制输出帧尺寸，不能把原始 GIF 解码搬离 GUI。参考固定版本原始实现：[QQuickAnimatedImage](https://raw.githubusercontent.com/qt/qtdeclarative/v6.12.0/src/quick/items/qquickanimatedimage.cpp)、[QMovie](https://raw.githubusercontent.com/qt/qtbase/v6.12.0/src/gui/image/qmovie.cpp)、[GIF codec](https://raw.githubusercontent.com/qt/qtbase/v6.12.0/src/plugins/imageformats/gif/qgifhandler.cpp)。

本机 Cocoa/Metal 真 Qt 探针使用本仓库创作的 4096×4096、4 帧、100ms 间隔 GIF，仅显示 80×80，设置 `cache:false/asynchronous:true`。最初探针最大 GUI 间隔 78ms；接入后的同一私有 runner、同一输入及 50ms 门槛对照如下，均核验真实 Metal RGB：

| 路径                    | 最大 GUI 间隔 | 2 秒内真实帧变化 | 稳态主进程 resident | 稳态主进程 physical footprint |
| ----------------------- | ------------- | ---------------- | ------------------- | ----------------------------- |
| 原 QQuickAnimatedImage  | 80ms（RED）   | 18               | 210,370,560 B       | 164,857,152 B                 |
| 后台帧准备 + 异步 Image | 15ms（GREEN） | 20               | 143,179,776 B       | 139,642,056 B                 |

证据为 `build/folia-gif-comparison-{legacy,native}-current.log`，探针源码为 `tests/performance/folia-gif/tst_GifGui.qml`。采样包括准备阶段，退出后另取内存点；单次退出后的 allocator/driver 留存不能直接判为泄漏。这里没有计入 helper 峰值，也不是完整 Release 播放页性能基线。

## 采用的通用边界

- 公开 `assets.animation(source,width,height,fit)` 返回 scope 所有的 `EchoPluginAssetAnimation` 租约。source 限制沿用图片采样的当前封面、包内图片及本安装素材。
- 复用现有隔离解码进程和每安装最多两个准备任务。原件保留；后台将完整帧转为有界PNG序列，记录真实帧时长。QML只使用真正支持后台读取的`Image`加载小PNG帧。
- 相同scope、来源和尺寸共享准备缓存，多处显示各持租约；退出后停时钟并释放引用。仅剩最后引用时删除临时缓存；目录清理也在后台，计入`isDrained()`。
- 沿用 8MiB 原始图像、4096 边长、256 帧和 64M 累计原始帧像素限制；请求尺寸为 1..4096。内接/外接均不放大原件，外接保留实际较长边后再裁切，防止先缩小后放大的画质损失。
- 每 facade 128 租约、每安装 32 项缓存，已接受与等待清理的 PNG 合计 64MiB。另有最多两个准备任务各 64MiB PNG + 8MiB 输入暂存，故这一路径最多 208MiB 额外临时磁盘，原有持久资产另计 64MiB；这些数字不代表物理 RSS 或 GPU 副本上限。
- 所有准备任务支持取消、scope退场和封面revision隔离；迟到结果不能恢复已销毁的视图。异常明确报错，保留原始GIF和动画行为，不能用静态首帧掩盖。

## 已验证

1. 原生测试 9/9：公开 scope 租约、PNG 与原 codec 逐帧对照、真实时长、有限循环、共享时钟/独立暂停、最后引用清理、内接/外接分辨率、不放大原件、缓存/租约限额、非法来源/尺寸、退出取消。日志 `build/folia-animation-fit-native.log`。
2. 实际 QML 资产流程 7/7：真实选择器导入、跨集合刷新、颜色 Worker、字体注册、GIF 第二帧经过群唱遮罩显示、隐藏停止、取消与单图替换。日志 `build/folia-assets-animation-fit.log`。
3. 最新素材 QML 9/9：追加真实选择器 16 张批次溢出清理、位置顺序/移除/清空；Monet 肖像真实 GIF 第二帧、暂停、每帧不新增层、失败保留与退出租约释放均通过。日志 `build/folia-assets-monet-pool-second.log`。
4. 原有资产后端在最新版正式库重新回归 16/16，包括字体、网络期限、跨 scope、取消与预算，日志 `build/folia-assets-native-regression-current.log`。

后续仍需完整 Release 页、重复切换/安装退出、helper 及 GPU 峰值和跨平台安装包验证。不能用本探针结果替代整页验收。
