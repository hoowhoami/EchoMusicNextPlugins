# Folia Nomand 图像背景

## 状态与来源

固定 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`，实际 Paper / Paper React `0.0.80`。五套完整 GLSL、原始 vertex image-fit、颜色解析、默认 preset、Folia JSX 参数和 overscan 已生成；不是静态替代图。来源 SHA 在 `qml/backgrounds/nomand/sources.json`，Folia 保留 AGPL-3.0-only，Paper 保留 Apache-2.0 LICENSE/NOTICE。

**当前像素 gate 已解决并冻结：**普通 64×32 渐变/透明图、2048×1024 双像素高频/透明纹理，对照未修改的原 Paper WebGL 程序。Qt Metal / DPR2 为 16/16；DPR1 包括 320×240 和 321×241 奇数物理尺寸，为 26/26。全部 30 组真实 Chrome ANGLE Metal 网格保留逐通道 3/255 gate，没有删除旧样本、调高阈值或 expected-failure。旧 DPR2 的 10 组 source samples 与重新生成的对应数组逐项相同。PaperTexture 高频最大误差从 80 降至 1，LensDistortion 从 6 降至 1；三组尺寸下两者最大误差均为 1。模式注册与正式安装包集成由主线处理。

## 原始实现矩阵

| 输入                                   | 保留内容                                               | 原生载体                                   |
| -------------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| NomandBackgroundLayer / tuning / types | 图片优先级、五型 JSX 参数、日间反转、overlay           | 纯 ES2016 profile 与 QML                   |
| ImageDithering                         | 原 Bayer 2×2/4×4/8×8、量化、原色/反转                  | 完整 QSB fragment                          |
| FlutedGlass                            | 原 lines/prism、阴影/高光/边缘/模糊和 image mipmaps    | 完整 QSB fragment                          |
| PaperTexture                           | 原 folds/crumples/fiber/drops/noise、源 overscan       | 完整 QSB fragment + 原始 128×128 noise PNG |
| HalftoneDots                           | 原 hex/gooey、采样循环、grain、半色调反转              | 完整 QSB fragment                          |
| LensDistortion                         | 原 bulge/focus/swirl/dispersion 与 32 次 overscan 二分 | 完整 QSB fragment                          |
| Paper vertex / ShaderMount             | cover fit、原点/缩放/旋转、minDPR/max pixels、纹理采样 | 原 image UV 数学与有界离屏纹理             |

fragment 仅替换接口声明、QML 颜色的反预乘、物理 fragment 坐标和最后的 Qt opacity；vertex / 最后 copy 配对保留 WebGL 离屏光栅朝向并翻回 Qt 显示方向。原函数与采样循环保留。GLSL/MSL/HLSL 各 backend 均由 Qt 6.12 `qsb` 生成，没有运行时浏览器、WebView、Canvas.Image 或 CPU 逐帧图片渲染。

原 noise PNG 按 Paper base64 原件解码，未替换成新噪声。FlutedGlass、PaperTexture、LensDistortion 请求原 image mipmaps；另外两型不请求。源 WebGL 上传 straight RGBA 后生成 mipmaps，所以 QML 先用 `blending:false` 的反预乘 pass 再生成 mip chain。普通图像原生/浏览器对照包含透明像素。

## 接口与预算

入口 `qml/backgrounds/nomand/Nomand.qml`：`settings`、`coverUrl`、`backgroundImageUrl`、`backgroundColor/primaryColor/secondaryColor/accentColor`、`dark/live/paused/motionEnabled/colorBlendMs`，以及可选公开 `EchoPluginAssets assetsService`。本背景始终静态（原 speed/frame 均 0），不申请音频、动画图片租约或 FrameAnimation。`paused/motionEnabled/colorBlendMs` 保留共同背景接口，没有添加源中不存在的颜色动画。

`cover-derived` 优先公开 cover URL，缺失时回退共享上传图；`uploaded-global` 反向优先。无图时仅主题背景色。GIF 使用标准异步 Image 的静态首帧，符合该源图像纹理用法。

只建立当前一种真实 shader。live/visible=false 立即销毁 Loader 中的图片、反预乘/结果纹理和 shader 对象；新 URL 使用标准 Image 的取消/世代处理，`retainWhileLoading:false`。输入 URL 由主线公开封面/共享资产绑定提供，不新增任意路径 API。

像素目标保留 ShaderMount：DPR 至少 1，按 `min(1,sqrt(1920*1080)/sqrt(round(w)*round(h)*DPR²))` 缩放，再分别 round 两轴。极端长宽导致目标边大于 16384 时明确失败，不偷偷改 source 比例。源图请求最多 4096×4096，并按实际原图比例限制中间纹理；源超过此尺寸会缩小，这是明确的宿主资源边界。

`renderReady/errorString/physicalSize/physicalBudget/sourceTextureMipmap/renderer/cacheBytes` 供主线诊断。`cacheBytes` 是请求的 RGBA8 source/反预乘/mip/结果/noise 计划，**不是进程 RSS**；不包括 QImageReader 临时解码、Qt 最小 FBO 补齐、driver、管线、在途命令等。这里没有声称标准 Image 的网络传输 bytes 或总进程内存受到同一上限约束。失败图片与尺寸预算有可见错误字符串。QSB 的缓存实例可能保持 `Uncompiled` 状态却实际绘画，因此数据就绪不以该枚举作为 GPU 像素成功证据，真实像素由专项测试验证。

## flat 设置

全部为 `nomand` 加以下后缀，数值范围和步长取原设置组件。

| 后缀                                              | 默认          | 范围 / 步长                                                                |
| ------------------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| ImageSource                                       | cover-derived | cover-derived / uploaded-global                                            |
| Effect                                            | dithering     | dithering / fluted-glass / paper-texture / halftone-dots / lens-distortion |
| DitheringType                                     | 8x8           | 2x2 / 4x4 / 8x8                                                            |
| Size                                              | 3             | 0.5–20 / 0.5                                                               |
| ColorSteps                                        | 4             | 1–7 / 1                                                                    |
| OriginalColors / Inverted                         | false         | 布尔                                                                       |
| FlutedGlassSize                                   | 0.5           | 0.1–1 / 0.05                                                               |
| FlutedGlassDistortion                             | 0.5           | 0–1 / 0.05                                                                 |
| FlutedGlassBlur                                   | 0.08          | 0–1 / 0.01                                                                 |
| PaperTextureContrast                              | 0.32          | 0–1 / 0.01                                                                 |
| PaperTextureRoughness                             | 0.42          | 0–1 / 0.01                                                                 |
| PaperTextureFiber                                 | 0.3           | 0–1 / 0.05                                                                 |
| HalftoneDotsSize                                  | 0.5           | 0.1–1 / 0.05                                                               |
| HalftoneDotsRadius                                | 1.25          | 0.1–2 / 0.05                                                               |
| HalftoneDotsContrast                              | 0.4           | 0–1 / 0.05                                                                 |
| HalftoneDotsOriginalColors / HalftoneDotsInverted | false         | 布尔                                                                       |
| LensDistortionSpread                              | 0.45          | 0–1 / 0.05                                                                 |
| LensDistortionBulge                               | 0.3           | −1–1 / 0.05                                                                |
| LensDistortionDispersion                          | 0.65          | 0–1 / 0.05                                                                 |
| OverlayEnabled                                    | true          | 布尔                                                                       |
| OverlayOpacity                                    | 0.35          | 0–1 / 0.05                                                                 |

## 可复现验证与待办

`node scripts/build-folia-nomand.mjs` 从固定源重新生成；`--browser-oracle` 额外运行本机实际 Chrome ANGLE Metal，用未修改 Paper WebGL shader、原 sampler/image 上传方法生成独立 640×480 参考网格。浏览器仅为离线 QA 生成器依赖，不进入插件运行时。小渐变/高频 PNG 和所有 oracle 只在 tests/fixtures，正式包只包含必需的原 Paper noise PNG。

`node --test tests/folia-nomand.test.mjs`：4/4，包括全部默认/预算、30 组真实 React factory uniform oracle、完整 shader/noise/mipmap 来源，以及五型/两图/三尺寸像素参考完整性。

真实私有 Host runner `build/folia-nomand-native/folia-qml-test` 已重链正式 coherent SDK。分别以 `QT_SCALE_FACTOR=1|2 QT_QPA_PLATFORM=cocoa QSG_RHI_BACKEND=metal ... -input tests/qml/tst_FoliaNomand.qml -o -,txt` 执行：DPR1 26/26（9.558s）、DPR2 16/16（7.385s）。日志 `build/folia-nomand-dpr1-green.log`、`build/folia-nomand-dpr2-green.log`；原始 true RED 为 `build/folia-nomand-current-red.log`（14/2）。普通 DPR2 最大误差依次为 0/1/1/2/1，高频为 0/1/1/0/1；DPR1 两种尺寸的所有网格最大误差不超过 1。

通过项包括原五种静态 GPU 结果、overlay、真实输入优先级、GIF 首帧、隐藏零引用、8192px 源按比例限制到 4096px、实际失败图片/尺寸预算。没有新增表面、提高纹理预算或改为每帧重绘。

## 高频采样根因与最小修复

旧桥接只数值翻转 `gl_FragCoord.y` 和 image UV，未保留原 WebGL 光栅方向。`implicit texture()` 的实际采样不能用某一像素手算的 fine derivative / LOD 近似替代。原 source 下采样/纹理内容仍正确：固定 mip 1/2/3 和固定坐标采样一致，但原生 / 浏览器 implicit sample 大幅不同。

位级探针位于 `build/nomand-f32/`：用高/低各 16 位、两帧 RG8 输出恢复完整 Float32。原生/浏览器 (112,404) 的 UV 为 `(0.3071227967739105, 0.8113929033279419)`，`dFdx/dFdy` 和推导 LOD 均逐位相同；implicit raw R 仍分别为 0.9002451 / 0.6497549。固定 mip 1 时两端均为 0.9267157；实际 textureSize 均为 2048×1024。此前仅 16 位 UV/LOD 的诊断无法得出采样路径等价。

修复保持所有源数学、原 noise、sampler 和 implicit LOD：`image.vert` 在离屏绘制时反向 clip Y，fragment 直接使用该表面的 `gl_FragCoord.xy`，最终 `copy.frag` 反向采样还原显示。三个改动共同构成光栅桥接；不能只保留其中一个。原 gate 的 80/6 RED 先在私有副本复现并转 1/1 GREEN，再由构建器生成正式产物；额外 DPR1 / 奇数高度的原始 WebGL oracle 排除仅对偶数 480 高度的偶然匹配。这里没有将特定硬件的 implicit 导数行为概括成所有后端的保证。

未覆盖：不同硬件/Windows/Linux GPU、超过 4096 源图与极小图的跨 API 像素对照、正式安装包集成与跨背景首帧切换。这些不以 Node/source oracle 冒充完成。
