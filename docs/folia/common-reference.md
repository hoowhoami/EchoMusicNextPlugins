# Folia 普通背景

固定来源 `a8da4437cf19723555bd75e4685ca20815fe5b82` 的 `backgrounds/common/{entry,GeometricBackground,FluidBackground}`，包括原 CSS；AGPL-3.0-only。`scripts/build-folia-common.mjs` 提取源随机场景并记录 SHA，不重新设计形状、随机分布或运动。

## 原生实现

15 个几何图形、20 个粒子及最多 6 个图标槽保留原随机调用顺序。原 `seed` 只使 React useMemo 重建，并不是 PRNG 种子；原生同样在曲目身份变化时新建场景。真正未提供主题图标的宿主显示源代码的普通图形，未虚构图标元数据。

漂移分两段线性执行，保持 ±15/±30px、360° 旋转、原时长与延迟；粒子上移 100px 并保持三点透明度。独立的 300/30 spring 接真实 PCM 频带，按源 10..200 映射到 0.95..1.45。共享边界的归一化频带乘回源 0..255，静音/暂停不注入呼吸假信号。暂停保持漂移相位。

圆/方使用原生 Rectangle，三角/十字使用 CurveRenderer，暗角是 farthest-corner 圆径向 shader。没有视口 CPU Canvas。换曲的新几何层立即显示，旧层按源 easeInOut 退场 600ms；快速切换最多两层，退出清空。宿主关闭动效时按源 staticMode 卸载几何层及暗角。

封面沿用桌面源的 640px 输入、320px 宽缓冲、等比高度、object-cover×1.5 和 `40*1.5*320/cssWidth` 的实际 Gaussian σ。水平中间图有 3σ overscan，纵向输出裁回源缓冲，避免先裁切再模糊的边缘错误。两张 RGBA8 FBO 仅在封面/尺寸变化时更新；主题颜色使用 GPU uniform，在源 1000ms 内变化。对角渐变、预乘透明与 overlay 0.4 使用真实公式。

完整输入的第一帧由异步 Image 解码；原 Fluid 的 createImageBitmap 不播放 GIF。先解码再入栈，第一张在完成绘制后立即显示，后续按源 easeInOut 淡入 1500ms，失败保留上一张；最多保留当前顶层与新图。所有纹理/定时器归视图所有，live=false 移除图像及离屏图。

单层计划预算包含两张 RGBA8 FBO 与最多 640² 输入图；每层 32MiB、每边 4096、核半径最多 256，超限明确报错，不静默改变源分辨率或模糊。正常 800×400 的两张 FBO 为 769,024 B；640² 解码上限另计 1,638,400 B。两封面层及准备探针可能同时持有输入图；这些是逻辑容量，不能冒充进程 RSS、GPU 驱动或 codec 暂存峰值。

## 设置与证据

`commonUseCoverColorBg=false`、`commonOpacity=.75`、`commonDisableVignette=false`、`commonDisableGeometricBackground=false`。透明度范围 0..1、步长 .05。该背景与歌词样式独立选择，默认背景仍为源 Latent。

- Node 源 oracle 2/2：真实上游 React 组件在 12 组相同随机输入上的全部场景记录一致；CSS 关键点、延迟、循环和频带映射检查通过。
- Cocoa/Metal：DPR1/DPR2 各 9/9，包含真实几何/暗角、暂停、换曲层数、失败保留、完整横竖屏、叠色、120 帧主题更新不重烘与退出 FBO=0。日志 `build/folia-common-native-grab-dpr{1,2}.log`。
- `capture-folia-common-reference.mjs` 在 Chrome 真 Canvas 执行未改写的源 `bakeBlurredCover/drawCover`；`compare-folia-common-reference.py` 对比 8 对原生画面。每通道 8bit 的 MAE 均低于 1，详细值为 `build/folia-common-reference/comparison.json`。高对比红蓝封面由本仓库创作；原生 Gaussian 与 Skia 栅格并非逐像素相同。
- Qt 窗口截图会在 Retina 桌面可用高度处裁切竖图，因此对照使用真实 Item.grabToImage 捕获完整原生层，未缩小输出。该离线读回仅在测试，生产不读回 GPU 像素。

尚未以这些受控测试替代完整 Release 页的持续动画、CPU/GPU/物理内存与重复退出基线。
