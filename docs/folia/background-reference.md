# 共享背景源码与受控对照

更新：2026-10-28。固定 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`。本页记录背景专项证据，不能代替完整播放页、全部歌词样式或性能验收。

## Latent（隐现）

2026-10-30 更新：Latent 已改接插件持有的两个有界 RHI 源和 Quick 最终合成，源码生成与正式 QSB 烘焙分离；当前实现、资源账本及新鲜验证见 [GPU 迁移边界](gpu-migration.md)。下述 2026-10-28 纹理用量与原生数据为旧链路历史记录。新链路在同一最新宿主上与旧正式包重新比较了 DPR1/2 共 18 帧：抖动单层逐像素一致，网格/混合平均单通道差不超过 0.0183、最大差 2/255。它们只证明该切片受控输入，没有替代前台性能或全部样式验收。

源为 `backgrounds/latent/LatentBackground.tsx`、`tuning.ts`、`types.ts`、`colorPalette.ts` 和锁定的 Paper `0.0.80`。构建脚本提取原始 shader/helper/defaults，生成 QSB 与源 SHA；运行时没有浏览器、DOM、Canvas 或 Node。

保留原始 mesh+dithering 两层、soft-light、滤镜、尺度、动态速度/能量/起音响应、暂停减速和全部 14 项设置。每层沿源的 `1280×720` 像素面积预算缩放，两张 RGBA8 GPU 纹理总计约 7.4 MB；这只限制背景源面，不降低歌词或窗口分辨率。减少动效冻结时间，隐藏卸载组件。封面由宿主受控解码，原始 weighted median-cut 在 Worker 中提取颜色。

受控夹具：800×400 逻辑像素，原创六色封面调色板和主题，无音频；t=0 为初始滤镜，t=1/3 保留源零音频静态滤镜、独立 shader 时间。分别对 both、mesh、dithering，DPR 1/2 捕获完整画面，共 18 对。浏览器跑未修改的原始 Paper shader；原生跑实际 Release 模块、Qt 6.12 Cocoa/Metal。

| DPR | 模式      | 三时刻平均单通道误差范围（0–255） | 95% 分位误差 |
| --- | --------- | --------------------------------- | ------------ |
| 1   | both      | 0.366–0.404                       | 1            |
| 1   | mesh      | 0.291–0.352                       | 1            |
| 1   | dithering | 0.352–0.361                       | 2            |
| 2   | both      | 0.337–0.379                       | 1            |
| 2   | mesh      | 0.286–0.343                       | 1            |
| 2   | dithering | 0.224–0.230                       | 1            |

首次 DPR 2 浏览器只有 CSS emulation，ResizeObserver 的 device-pixel-content-box 仍回报 800×400，导致与原生 1358×679 源纹理比较条件不同。现启动 Chromium 同时设置真实进程 scale-factor，逐场景保存原始 canvas 尺寸/renderScale；双方均为 1358×679。没有通过修改原生 shader 或放宽指标掩盖差异。Qt 的显式 textureSize 不再乘 DPR，已查阅 [Qt 6.12 实现](https://raw.githubusercontent.com/qt/qtdeclarative/6.12/src/quick/items/qquickshadereffectsource.cpp)。

复现：`node scripts/build-folia-latent-reference.mjs <固定Folia目录>`；设置已有 Playwright 模块路径 `FOLIA_PLAYWRIGHT_MODULE` 后执行 `node scripts/capture-folia-latent-reference.mjs`。原生用 `scripts/test-folia-native-qml.py --input tests/qml/tst_FoliaLatent.qml`，分别令 QT_SCALE_FACTOR=1/2，FOLIA_CAPTURE_DIR 指向已创建的输出目录。再用 `scripts/compare-folia-latent-reference.py <native> <browser>` 比较完整 RGB；Python 的 Pillow/NumPy 仅用于验收，没有加入插件依赖。

日志/截图/精确统计位于 `build/folia-latent-reference/`，`comparison-dpr1.json`、`comparison-dpr2.json` 对应 `browser-forced/` 的正式同条件结果。旧的 retina ROI 与默认 browser/ 目录是排查过程，不作为最终证据。

## Sora（空）

源码 `backgrounds/sora/SoraBackground.tsx` 的 150 个点、hash、位移、波动、大小、闪烁与配色公式保留。Metal 使用通用、有界的 `PointMesh` 保留原 GL_POINTS 和 gl_PointSize，150 点的静态顶点数据为 2400 字节；原生离屏坐标方向与原浏览器点光栅方向配对。其他 RHI 后端保留原四边形移植路径，尚未实机取得同等视觉证据。没有 150 个动画委托或逐帧 CPU 位图。原始 twgl 未传 DPR multiplier，故保留逻辑像素 GPU 源面，再按窗口 DPR 采样。纯色设置不创建星点 renderer。

超大窗口显式拒绝超过 8192 边长或 8 Mi 像素的源面（RGBA8 最大 32 MiB），不暗中缩减全局分辨率。暂停、隐藏、纯色与减少动效均停止星点时间；隐藏和纯色销毁源纹理。`build-folia-sora.mjs` 同时生成原始 GL_POINTS 浏览器夹具，正在核对 DPR、点覆盖和动画帧。当前 Cocoa/Metal 基础专项 4/4 通过；完整视觉矩阵和逐帧参考尚待完成。

## 共享接线与未完成项

Common、Monet、Nomand 已实现并接共享背景选择器；各自设置、原数学/图像生成及专项证据见 `common-reference.md`、`monet-background-reference.md`、`nomand-reference.md`。URL 的网页嵌入路径与本任务禁止 WebView 的约束冲突，保留为已登记中断项。背景模式切换的两层首帧与 soft-focus 已接，歌曲 A/B 交接正在以真实输出 cue 继续补齐；完整连续性能未验收，不能将本页受控静态对照当作全部通过。

2026-10-23 补充：Sora 原始 GL_POINTS 与 native quad 在两种 DPR、0/1/3s、深浅/纯色共24对完整画面已经采集。纯色完全一致；星点全画面均值0.13–0.17不能代表前景一致（稀疏背景占绝大多数），局部最大差218–255，位置/采样差仍待核查，未用低均值宣布视觉完成。`build/folia-sora-reference/comparison-dpr{1,2}.json` 保留 changedPixels 和峰值，原始 shader hash 仍一致。Native 生命周期/源帧专项现两种DPR各5/5。

后续定位更新：上述旧浏览器图来自 Chrome151；在同一 M4 上用当前 Chrome155.0.8059.86 重跑完全相同的原始 GLSL，DPR1 星点位置与 Qt 对齐，t0 的92个可见星点均在0.081px内。剩余 t0/t1/t3 最大 RGB 差为10/8/11，深浅六帧各12–39像素超过原 gate=3，纯色六帧逐像素相同；严格门槛仍未通过，不能因均值低标绿。原浏览器和新浏览器证据均保留，未静默替换旧结果。

`build/folia-sora-diagnosis/evidence.json` 记录新鲜原生/浏览器12帧、来源 SHA 和反证实验。六个 hash 及 NDC x/y、blink 在 WebGL1/2 的 high/低位900值探针均一致；这只证明该量化探针，不宣称所有 Float32 bit 相同。显式 fragment 坐标、点尺寸/中心量化、真正 QSG DrawPoints、直接 NDC 及禁 FMA/precise sin 的私有候选均未通过原 gate，未加入生产或新增 SDK。初次 MSL 试验还暴露 qsb replace 将入口设为 main 的工具行为；失败/空白帧已拒绝，后续 Qt QShader 保留原入口后才纳入候选比较。当前残差继续调查，不能把未验证假说当作根因。

进一步的精确位探针不再依赖浮点量化：Chrome155 WebGL2 transform feedback 直接读150点的 Float32，原生 shader 以 uintBits 编入两张不透明 RGB PNG。0/1/3s 共1800值中，`ndc_x`、`ndc_y`、`blink` 全部逐位相同；`pointSize` 每帧19/150不同，最大绝对差4.76837158203125e-7。证据与两端探针在 `build/folia-sora-diagnosis/float-bits/`；初轮误将 QtTest image.save() 的 void 返回值断言为 true 的夹具错误已单列保留，修复后3/3，并逐张检查600×4尺寸、opaque alpha、有限数和完整150列。该结果排除了这组条件下位置/闪烁公式的浮点差异，没有解决光栅化/合成后的RGB残差。

共享颜色交接现保留原 `useBlendedColors` 的 OutCubic、从当前画面颜色中途改目标、首次直接设置以及减少动效/隐藏停止。源 softFocus 的80ms delay+520ms duration决定600ms颜色时长；独立原生专项4/4。这里不包含尚未补齐的背景切换柔焦和AutoMix交接。

### 2026-10-28：Metal 生产点图元路径

前述四边形和只改 DrawPoints 的候选失败已保留。新的逐分量实验确认：原 GLSL 的位置、blink 和颜色输出相同，点图元的 Y 光栅方向及离屏呈现方向必须成对处理。生产 vertex 仅适配 Qt 顶点输入、保留原 gl_PointSize 并翻转 clip Y；`ShaderEffectSource.NoMirroring` 在 GPU 呈现阶段还原方向。原 fragment 的 gl_PointCoord 与透明合成保留，没有增加取整、颜色增益或近似 hash。通用 PointMesh 限制 4096 点 / 64 KiB 顶点数据，声明与能力协商仍须由重建后的真实 SDK 导出验证。

`managed host/build/folia-sora-raster-new/production-verified-20261028/` 保存生产 `Sora.qml`、生成 shader 和实际 `PointMesh.cpp` 的 SHA256、逐帧日志、PNG 及 `comparison.json`。独立纯 Qt6.12 / Cocoa / Metal 程序直接注册生产 PointMesh 并加载实际 Sora 组件，尺寸 800×400，DPR1/2、深浅色、0/1/3秒共12帧；对照 Chrome155.0.8059.86 原 GLSL100 的 GL_POINTS 输出，深色 RGB 最大差 0，浅色最大差 1，所有像素均满足原门槛 3。源面仍是逻辑像素，不随 DPR 增大。这是生产组件的受控视觉结果，完整宿主模块注册、安装与新 SDK 尚待统一构建，不能据此宣布全插件完成。

首次生产私有探针因漏含 QQuickItem 编译失败，脚本仍执行旧程序且 QML 使用无效绝对 import，产生空白 PNG；其全部输出归档于 `invalid-production-20261023/`，明确标为无效。修正后的程序在编译失败、QML 错误或尺寸不符时直接失败，上述12帧均来自新编译程序。独立生产 PointMesh 原生测试 6/6，覆盖点数/容量、顶点布局、场景图所有权、零点及重入销毁；不代替整包生命周期验收。

生产组件现增加120帧网格身份稳定、超大源面原子拒绝/恢复、暂停、隐藏和纯色卸载的 QtQuickTest；独立纯 Qt6.12 原生运行 DPR1/2 各6/6。`production-qml-dpr{1,2}-20261028-r1/` 保存完整日志、源码SHA与24张星点/纯色捕获，12张星点仍保持上述最大差0/1，纯色逐像素一致。首轮仅因历史硬编码截图目录不存在失败，已改用调用方提供的capture目录并保留原RED日志；未降低视觉或生命周期断言。

浏览器自动更新后，以实际 `browser.version()` 记录的 Chrome156.0.8078.73 重跑原 GL_POINTS；同条件12帧与旧155原图逐像素相同，原生门槛仍保持0/1。另以809×431奇数视口、DPR1/2、深浅色、0/1/3s共12帧验证生产点网格，最大RGB差仍为0/1，无像素超过3；尺寸逐张断言809×431或1618×862。实际版本、原图和比较保存于 `current-browser-version.json`、`current-browser-comparison.json`、`odd-browser-version.json` 及 `odd-production-20261028/comparison.json`。这不外推其他浏览器后端或其它视觉效果。
