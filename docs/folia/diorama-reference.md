# Diorama（镜台）源码与原生移植

固定上游：`/Users/huanggenji/Work/mine/folia-major`，提交 `a8da4437cf19723555bd75e4685ca20815fe5b82`。全部 Diorama 源码、设置面板、共用设置装配及 Three 0.185.1 原文哈希见 `qml/styles/diorama/sources.json`。Folia 代码为 AGPL-3.0-only，内嵌 Three 数学与场景对象为 MIT，许可证保存在 `THREE-LICENSE.txt`；运行产物不包含 React、DOM、Electron、Three WebGL renderer 或新的 npm 依赖。

## 实际行为

- 路径每行推进 8 世界单位；有界 yaw/pitch 的确定性 turtle 生成 right/up/forward 基。歌词另有横纵偏移、scale、roll、yaw 与构图 look 偏移。相机取景始终以真实字幕宽度和 5.2 单位 hero 距离计算，音频不进入相机。
- 保留原始 13 镜头：pushIn、pullBack、orbit、track、crane、hold、swell、spiral、pendulum、flyby、arc、float、glide。原权重读取 chorus、段落、词数、长音与短促词长，避免重复最近两次基准选择。三档动效改变镜头选择和 move/drift/weave/smooth/audio 系数。
- `CameraRig.mjs`、`DioramaScene.mjs`、`DioramaParticleField.mjs` 保留原组件与原 `useFrame` 函数；`react.mjs` 只提供 ref/memo/effect/state 生命周期和 Three 场景树装配。保留 SmoothDamp 速度、阅读对齐、视锥限制、四元数低通、hold settle、seek snap、flight arc/bank/sweep。原始 Three Vector/Quaternion/Matrix/Color 运算保持原实现。
- 3D 文本最多挂载当前行前 3、后 2 行，飞行时另保留离开位置后 2、前 1 行。当前行按原 Unicode 字簇时间线拆分：CJK 每字、其他文字按原 wordIndex 聚合。整行与前缀均由实际原生字体测量，字身、普通辉光、灵魂副本为独立平面；渐变和关键词只改变唱到后的目标颜色。
- `dioramaTextRaster` 原始 128px Canvas 指令被记录为不可变文本纹理。原生 GlyphRun 以相同 font stack/weight/小数 size 和 em middle baseline 绘制。普通辉光保持离屏纯 shadow 的四次 lighter：blur20.48 的 .95/.85 两次，blur40.96 的 .55、blur59.392 的 .3；使用独立 GPU 可分离 Gaussian 缓存，sigma 为 Canvas shadowBlur 的一半，不用清晰字身替代 halo。
- 点云保留 box、cylinder（源代码称 sphere）、tetrahedron（称 cone）、torus 的焊接 lattice、连续法线、Y 拉伸密度、碰撞与字轨避让。corridor 保留半径 7.4、前 7 后 6 span 和段尾延伸；切歌两条 corridor 各自延伸，不跨 46 单位 graft 间隙。
- 背景尘埃固定 8 行环形缓冲，上限 1536 点；圆周与径向是独立的两轴。源 geometry 上限 65536 点，每 cloud 最多 1024、每 span 最多 2048 请求点。按实际 lattice spacing 计算 Nyquist 上限。
- 音频读取宿主共享的真实 0–255 bands。保留快慢包络、valley/peak、Schmitt onset、三 band 各 3 ripple、独立弹簧、播放时钟 flow、seek 清池、形成/散开与主题颜色阻尼。仅使用已有 audio.spectrum 的 band onset 路径；模型节拍支路已从生成器和运行代码中删除。
- 新歌在歌词就绪后建立偏移段；空歌词在确认 playback reset 后播放至 2s 或 8s 墙钟上限才提交 96 个每 5s 的无字 phantom frame。单曲回顶沿同一 corridor 飞回，无黑幕或淡出替代。晚到歌词原位更新，段 key/globalStart 保留。间奏 `......` 不成为相机目标；片尾保持最后真实歌词并缓慢回正，尘埃和 corridor 延伸继续存在。源 Diorama 没有独立片尾 credits。

## 通用原生能力

`FloatTexture` 是无颜色转换、nearest、无 atlas 的 RGBA32F provider。`upload(w,h,ArrayBuffer)` 原子校验 active、visible、尺寸 1…8192、总计不超过 16MiB、精确 `w*h*16` 字节和所有 float32 有限值。相同内容不重复上传。WorkerScript 不支持 ArrayBuffer 的 Qt 6.12 serializer，因此 `uploadPacked(w,h,string)` 以原始 UTF16 16bit 字对承载同一 float32 bit pattern；包括 NUL、代理码位，不能按 Unicode codepoint 遍历、规范化或转 UTF8。当前支持平台均为 little-endian，写端明确采用 little-endian 字对，读端逐字还原；没有 RGBA16F/8 fallback。Qt 6.12 的 `String.fromCharCode.apply(null, Uint16Array)` 实测会生成全 NUL；每 8192 units 先 `Array.from` 成普通数组再调用，实测全部 65536 种 UTF16 units 经实际 WorkerScript 往返无损。

每点原始属性是 `position3 + normal3 + anchor3 + scale3 + phase1 + style3 + wave2`，共 18 floats，按 5 个 RGBA32F texel（80B）排列。每块最多 8192 点/655360B；数据仅在几何或尘埃窗口改变时上传。GridMesh 每粒采用四行，跨粒三角形严格退化，形成独立 billboard。顶点完整执行原 GLSL 位移、ripple、散开、色彩、透视与尺寸计算；原 `gl_PointSize` 的物理像素范围变成同范围 quad，尘埃另保留 GL_POINTS 最小 1 物理像素再除 DPR 的光栅化规则，fragment 直接采用原 `gl_PointCoord` 径向 core/halo 公式。

`NativeShaderEffect` 保留 Qt 的 uniform/sampler/GridMesh，添加 `source-over`/`additive`。shader 输出 premultiplied RGB，additive 使用 RGB `ONE,ONE`、alpha `ONE,ONE`，等价于 Three 原 straight 输出的 RGB `SRC_ALPHA,ONE`、alpha `ONE,ONE`。Qt 原材质仍由节点成员管理；wrapper 只借用原对象并转发采样/常量更新，仅 wrapper 由节点拥有。shader type 由不可变 shader 字节和 composition 隔离。

所有原始材质 `depthWrite=false`，当前文字另有 `depthTest=false`；场景没有其他不透明写深度的对象，所以按原透明 `renderOrder`/深度次序合成即可。相机 near/far 为 .1/1000，fov55；实际 MVP/clip w 传给 GPU 文本平面，透视校正插值保留。文字与尘埃执行原 Three 标准材质顺序：ACESFilmic tone mapping（exposure=1），转 sRGB，再与转成输出 sRGB 的 fogColor 按 `smoothstep(12,30,-viewZ)` 混合；源自定义粒子 shader 不注入 Three fog，只使用原距离 lifecycle，不能额外套雾。

## 全部设置

实际配置共有 24 个独立 flat 字段：下表 18 个 scalar 字段加 `dioramaGeometryEnabled/Mode/Strands/Blobs/Ribbons/Rings` 六项（默认 true / clouds / true / true / true / true）。scalar 键为字段首字母大写后加 `diorama`。kernel 将六项组装为原 `geometryVisibility` 对象，保留源 resolver；旧嵌套对象仅兼容 fixture，不作为公开配置。

| 字段                                                       | 默认             | 范围/语义                                       |
| ---------------------------------------------------------- | ---------------- | ----------------------------------------------- |
| cameraSpeed / motionAmount / audioReactivity               | 1 / 1 / 1        | .55…1.85 / .4…1.6 / 0…1.5，均步.05              |
| geometryVisibility                                         | 全开、clouds     | clouds/corridor 互斥；四族仅 clouds 显示        |
| particleDensity / particleScale                            | 576 / 1          | 96…1536、步24 / .65…1.6、步.05                  |
| particleGlowEnabled / particleGlowIntensity                | true / .65       | .1…1.5、步.05                                   |
| showParticles                                              | true             | 独立背景尘埃                                    |
| backgroundParticleCircumference / backgroundParticleRadial | 28 / 2           | 4…48、步2 / 1…4、步1                            |
| glowEnabled / glowIntensity                                | true / 1         | 独立普通辉光，.1…1.5、步.05                     |
| soulEnabled / soulIntensity / soulActiveEnabled            | true / 1 / false | 独立灵魂副本、强度.1…1.5、步.05、当前字是否漂移 |
| gradientEnabled / gradientIntensity                        | false / 1        | 独立逐单元渐变，.1…1.5、步.05                   |
| keywordColoringEnabled                                     | true             | 主题 wordColors 的位置范围匹配，未唱到前隐藏    |

设置组默认折叠，展开与启用互相独立；父关闭时子参数禁用。参数改变走原 tuning resolver；无需重新读取全歌曲即可更新 geometry/音频/效果。

## 已执行验证与边界

- 指定 Node24 执行 `scripts/build-folia-diorama.mjs`，验证固定提交与 Unicode17，所有原始模块和独立 source oracle 可重建；全部 runtime 持续接受 Acorn ES2016 检查。
- `node --test tests/folia-diorama.test.mjs`：原 13 镜头、3 seed×3动效×96行×5时间点、formation、四族密度/拉伸、corridor Float32 缓冲、46单位换歌、晚到歌词和2400音频帧与独立固定源码 oracle 一致。
- 私有最小 QtQuick fixture 不依赖正在变更 ABI 的 HostTestHarness。Cocoa Metal DPR1/DPR2 已通过真实 RGBA32F 负数、小数、>1、alpha0、重复上传、原子拒绝、clear/hidden；4/16/1000 叠加 sprite 的 RGB/alpha、父透明度、composition 切换与隐藏恢复。
- 完整 3D native fixture 已验证真实 GlyphRun 字体测量、原场景 Worker、Metal 透视字形平面/point cloud、暂停 flow、seek、clouds→corridor、切歌双段/原始 epoch、隐藏 actor/resource/cache 清零。证据在 `build/folia-diorama-sdk-fixture/scene-dpr{1,2}.log`。
- 正式统一 ABI 的 full helper，Cocoa Metal DPR1/DPR2：80 行实际 ReadModel、ICU、CJK/emoji/组合音标/阿拉伯语长行、设置热更新不重读、暂停 seek 第60行、换歌双段、隐藏重建和 busy 中三次销毁，8/8 通过、exit0。所有组件延迟任务使用 owned 0ms Timer，销毁取消；窗口迁移测试先停旧 sampler，迁回原 QObject owner 后销毁，无引擎 GC 崩溃。证据 `build/folia-diorama-full-native/dpr{1,2}.log`。
- 实际上游 React Three Fiber + Three WebGLRenderer，60 个确定帧，在第15/30/45/60帧分别与原生对照，DPR1/2 共8组。相机最大误差 2.657e-6 世界单位，四元数最大分量误差 9.72e-17。透明 WebGL 必须先合成同一 #101018 背景；云团独立区域活跃像素 MAE 为 5.59…8.01/255，文字区域 15.04…24.35/255，最大文字像素差145，不能据此宣称跨字体渲染逐像素相等。保留 CoreText/Skia 字体光栅化、GL_POINTS 与 quad 覆盖边缘差异；尘埃活跃区 MAE16.38…24.11/255。原始PNG与拆区数据在 `build/folia-diorama-webgl-oracle/pixel-difference.json`，没有用透明背景全图平均值掩盖差异。
- 生产单插件14样式整页由 root 集成验证；其他平台实机仍未验证，本记录不将私有 fixture 等同整体发布验收。

## 最终 Metal 快照验证

linear/mip/4x与轴向point载体落入正式Diorama目录后，指定Node source oracle7/7；完整真实host helper Cocoa Metal DPR1为10/10、38.150s，DPR2为10/10、44.693s，均exit0。另在DPR1补验证busy中窗口隐藏5.2s取消deadline与新窗口重烘3/3、6.607s。包括实际80行全歌词、ICU混合长行、全部65536 UTF16 Worker往返、RGBA32F精度、4/16/1000 additive/opacity、真实SG/新窗口字形纹理重建、settings/seek/songflight与hidden释放；无provider、binding-loop或timeout警告。记录位于`build/folia-diorama-linear-fixture/business-final-dpr{1,2}.log`及`business-hidden-final-dpr1.log`。QtObject空context的既有通用Worker启动警告单列保留，不作为像素/采样成功依据。

Diorama业务76文件冻结SHA256（排序name+NUL+bytes）：`05f4b9922913ac497d765afe055fe13a3f225637b2eaa10cd66ea192979f2832`；未继续改动宿主。其余驱动平台与真实字体像素残差仍按本文边界报告，不将这些Metal回归泛化为所有平台。

## 原 RGBA8 管线的历史容量记录

以下是改进前原 RGBA8 管线的历史证据，不能视作新 linear+mip 管线的当前数字。可变资源 gate 为 256MiB，统计 `memoryBreakdown.poolTotal`：GlyphRun CPU 图集、按其页面字节等量估算的 GPU 图集、base/6级 Gaussian/最终 glow 捕获目标、FloatTexture CPU/GPU 及 GUI packed 字符串。GPU 图集为估算，驱动和 Qt 纹理池不包含；这是可归属缓存预算，不是进程硬内存上限。

DPR2 的合法长混合行、全部效果、双段换歌：初始 181,724,000B；seek 旧段 116,764,768B；flight 245,509,792B（glyph CPU/GPU 各82,577,344，captures77,689,504，Float CPU/packed各1,314,880，采样当时Float GPU35,840）；source outgoing=null 后211,725,536B；隐藏立即及100ms均0。glyph textures 143→127→0，point textures 4→3→0。无缩字、截文本或禁用效果绕过容量。

单独 ReadModel/ICU/销毁场景 `/usr/bin/time -l`：10.46s wall，4.48s user，.29s sys，RSS峰608,468,992B，峰 memory footprint631,146,248B；包含 Qt/Worker/驱动池。证据 `build/folia-diorama-full-native/memory-dpr2{,-time}.log`。

## Metal 光栅与标准材质对照补充

原 R3F Canvas 实测默认 ACESFilmic、SRGBColorSpace、4x MSAA。View 保留实际 DPR 物理尺寸，使用 samples=4，NoMirroring 使离屏 MSAA 样本方向与源 GL framebuffer 一致；Qt 默认图像代理保持 UI 正常朝向。标准 PointsMaterial 的同色同位置原 GL 输出，在距离 5/21/30 的独立 RGBA 对照经 ACES→sRGB→fog 修正后全部 exact0，新增持久原生回归覆盖三个深度。

同机 Chrome/ANGLE Metal 的 GL_POINTS 实测规则：先 clamp 请求物理尺寸到硬件范围1…511；GL 左下坐标的 `low=center-size/2`、`high=center+size/2`，`origin=round(low*256)/256`，横纵跨度分别为 `span=(round(high*16)-round(low*16))/16`；carrier 几何边界为 `origin→origin+span`，pointCoord按该矩形插值。初始120组 `.1/.7/.95/1/1.01/1.4/2/2.5/3.5/8` 尺寸误以为统一1/8量化；扩大到1.4/3.3/8.3/13.57/25.9/63.8与非对称中心后证伪，因此保留旧失败记录而采用独立轴向规则。126组方形/core/halo，DPR1/2均125组RGBA exact0，剩余只有单通道1LSB；12组专门边界挑战DPR1/2全部exact0，错误的“origin→round(high*256)/256”方案最高差64。当前仅 Qt.platform.os=osx 且 GraphicsInfo.api=Metal 启用，没有推广到其他OpenGL/Vulkan/D3D驱动。证据 `build/folia-diorama-point-carrier/diff-dpr{1,2}.json`、`build/folia-diorama-point-edge/diff-dpr{1,2}.json`。

动态原 React/Three 连续60帧、播放时间1→2、独立正弦bands、gradient+soulActive：448尘埃和12388云粒的全部18项 Float32 属性逐位一致，全部原 uniforms 一致（仅两标量浮点差<=4.45e-16）。独立GPU transform feedback采样256粒，clip坐标 exact0，size差<=7.14e-7、color<=3.61e-7、alpha/reaction<=1.5e-7。修正轴向载体及纹理采样前，全场景第15/30/45/60帧，cloud活跃像素MAE1.57…2.99/255，局部max58，仍在隔离；尘埃独立区多个帧 exact0。文字活跃MAE5.08…14.51/255，真实CoreText/Skia字形与采样分别核对，不能把局部差统一称为抗锯齿。证据 `build/folia-diorama-dynamic/quantized-difference.json` 与 `build/folia-diorama-feedback/feedback.png`。

原 CanvasTexture 为 SRGB8、generateMipmaps=true、LinearMipmapLinear、anisotropy=4。旧 Qt premult sRGB 捕获后解码与原 SRGB 纹理“解码再过滤”的次序不同；同一 authoredRGBA 高频颜色纹理缩小RGB MAE为[36.86,34.0,5.64]/255，alpha exact。新 Metal 路径先在逐源texel处unpremultiply/解码，输出不混合的straight-linear RGBA16F纹理并生成mipmap，再由plane执行原 tint/ACES/sRGB/fog。固定4x Metal sampler 后，同一 authored white-alpha与彩色mip对照DPR1/2逐通道max1，活跃MAE约.05… .1；SRGB8原mip量化与half-float链仍有1LSB边界，不宣称逐像素完全相等。其他backend保留原RGBA8/原plane路径；强制legacy分支与旧GlyphTexture的plain/glow逐像素max0，尚无真实非Metal设备验收。

采用新点载体与linear/mip/4x后，真实完整场景的第15/30/45/60帧，DPR1/2云区活跃MAE分别.177… .219/.136… .196，局部max2…16；尘埃多帧exact0，其余max1。真实字形区活跃MAE为DPR1 3.05…4.09、DPR2 3.86…5.14，max63，CoreText/Skia实际字形尚不完全一致；相同authoredRGBA纹理已单独隔离投影/采样，不能用大面积透明背景稀释误差。证据 `build/folia-diorama-linear-fixture/continuous-difference.json`。

## MSAA 固定附件预算与实际峰值

固定 MSAA 绘制成本与可变资源池分开：每 actor 目标单轴上限8192、附件上界1GiB。每物理像素按RGBA8×4样本16B + resolve4B + Depth32FloatStencil8×4样本32B =52B，`memoryBreakdown.msaaColor/msaaResolve/msaaDepthUpper/msaaTotal` 分列；`total=poolReserved+msaaTotal`（旧管线就绪后poolReserved=poolTotal）。超限明确报错，不改变 DPR、字号或效果。Apple Metal 深度附件实际memoryless，Qt可按尺寸/样本共享depth目标，52B是保守上界；驱动/Qt池与GPU atlas估算必须另计。

以下为改进前原RGBA8缓存管线的实际视口成本；新冻结mip管线的池容量另见下节。

| 视口           | pool flight GPU就绪 | MSAA附件上界 | 可归属计划总额 | 进程峰footprint |
| -------------- | ------------------: | -----------: | -------------: | --------------: |
| 1100×820 DPR1  |        128,725,336B |  46,904,000B |   175,629,336B |    671,565,624B |
| 1100×820 DPR2  |        246,788,832B | 187,616,000B |   434,404,832B |    915,572,656B |
| 1920×1080 DPR2 |        246,788,832B | 431,308,800B |   678,097,632B |  1,017,497,472B |

均是实际80行 ReadModel/ICU、混合长行、全效果、暂停seek/双段flight/隐藏重建的Cocoa Metal3/3测试，隐藏立即及100ms归零。1100×820 DPR2双独立actor、各自双段flight：pool合计493,577,664B + attachments375,232,000B =868,809,664B；逐个隐藏总额434,404,832→0，实际进程峰footprint1,425,819,712B。证据 `build/folia-diorama-largeviewport/*{,-time}.log`。这些数值均非256MiB硬进程上限。

## 采样能力调研：拒绝未被 RHI 消费的 anisotropy 属性

原拟增加通用 `samplerAnisotropy` 的方案在继续阅读底层后被否决，未修改 host/header/库。Qt 6.12 `QRhiSampler` 没有 anisotropy/maxAnisotropy 字段；同版本 `qrhimetal.mm::QMetalSampler::create` 只设置 min/mag/mip/address/compare，不写 Metal maxAnisotropy。只暴露 QSGTexture 的枚举无法证明 RHI 实际使用了4x采样，不能作为完成能力交付。以下保留所有权风险分析供后续参考，但不实施此属性。

Qt 6.12 `QSGRhiShaderEffectMaterialShader::updateSampledImage` 先获取 provider 的 QSGTexture、提交上传、按 Qt 原协议移出 atlas，然后返回借用的纹理；provider 的 textureChanged/destroyed 继续由 Qt 原 material/node 连接，不能另建 GUI 线程连接替代其失效协议。QSGTexture 的 filtering/mipmap/wrap/anisotropy 都属于同一个可共享纹理对象，直接对返回纹理调用 setAnisotropyLevel 会污染同源其他 ShaderEffect，不能采用。

拟给每个 BlendMaterial、每个实际 binding 懒建一个轻量 QSGTexture sampler view，由 wrapper 在渲染线程独占并销毁。delegate 完成上述上传和 atlas 选择后，view 同步原纹理的 QRhiTexture 借用句柄、comparisonKey、尺寸、alpha/mipmap、subrect/atlas 元数据及 filtering/mipmap/wrap，仅在 view 自身设置目标 anisotropy。view 不拥有、不删除、不重新上传原 QRhiTexture，不保存可跨帧解引用的 provider/QSGTexture 裸指针；rhiTexture 等 getter 返回本次 delegate 回调同步的快照。commitTextureOperations 不重复 delegate 已完成的上传。默认1与源相同可直接返回原纹理，另有 anisotropy 的共享源通过独立 view 降至1，不修改原对象。

材质 compare 先比较 anisotropy，再转发原 compare，防止同字节 shader、同图像但不同 sampler 被错误合批；shader type 仍由不可变 shader 字节+composition 决定。view 归属于 node wrapper，不放入静态表；shader 对象可被 Qt 按 type 共享，不能让 shader 级全局 view 指向最后一个 material。属性变化调用 update，sync 阶段更新 wrapper，原 provider dirty/销毁仍使下一次 updateSampledImage 更新或返回 Qt dummy；hide、sceneGraphInvalidated、窗口重建只触发 node/view 渲染线程退役，不持有 GPU 源资源。

验收需在同一 provider 上同时显示1×和4×两个 effect，独立与原 GL 1/4 oracle 对比，调换绘制顺序、切换 composition、替换源、清除/隐藏/销毁源、重建窗口并证明不会交叉污染 sampler。保持 source-over 默认、FloatTexture nearest/RGBA32F exact、4/16/1000 additive sprite、opacity 与 shader 类型隔离原回归。独立 authored white-alpha oracle 已把 source anisotropy4→1 单因素控制：linear RGBA16F+mipmap 的每通道最大差从5降到1、活跃MAE约.07，确证剩余差异主要为各向异性采样；SRGB8 mip量化与 half-float 链仍需单列误差，不能宣称采样逐像素完全相同。

## 固定 Metal 4x shader 生成与冻结缓存

`qsb -r` 直接替换会把entry改为`main`，Metal禁止该名称；MSL1.2也不支持constexpr sampler的`max_anisotropy`。这些失败记录保存在`build/folia-diorama-standard-oracle/aniso-dpr1.log`。独立Metal编译probe确认MSL2.0…3.0支持后，仅plane-linear包使用MSL2.0。`scripts/build-folia-diorama.mjs`先以qsb生成完整GLSL/HLSL/MSL12包，再在ignored私有目录构建QtGui-only QShader helper；它验证唯一`source.sample(sourceSmplr,in.vUv)`和`main0`，插入固定`max_anisotropy(4)`，保留entry、reflection、native binding map、separate sampler mapping、nativeShaderInfo，并逐字节检查全部非MSL代码；将旧MSL恢复后QShader整体比较必须相等。`QT_HASH_SEED=0`使容器序列化可复现。无新host API，不修改共享provider sampler，不手改唯一qsb字节。非Metal代码保持原包字节，且实际不选择linear路径。

Metal字形缓存按`pending→layout→capture→freeze→retire→ready`运行：先为所有最终RGBA16F mip链预留精确逐级8B/texel，再调度单一layout预留64MiB；实际layout后改为CPU atlas+等量GPU atlas+原base/6blur/glow目标+原语8MiB几何上界。capture至少三个真实frameSwapped；先live=false且source仍有效，等scheduledUpdateCompleted，再销毁整个输入GlyphRun/blur链，保留三帧退役预留后才ready。没有把ShaderEffect.status==Compiled作为条件：Qt6.12命中shaderInfoCache时不会调用prepareShaderCode，合法已绘制effect可能仍报Uncompiled。Error、实际帧完成、scheduled ack及真实像素共同验收。超5s明确报错，不无限defer；owned Timer随隐藏/销毁取消，presentation在pending阶段保持。

实际plain/glow字形，对冻结前同一linear烘焙链的初始图与两次强制SG销毁重建，DPR1/2共12组RGBA max0；临时GlyphRun为空而真实metrics保留，ink有效像素分别6597/23173（DPR1）与24316/90126（DPR2）。证据`snapshot-correct-dpr{1,2}.log`；Qt-only fixture显式关闭persistent SG/graphics后releaseResources，确认每窗口3次initialized/2次invalidated，未把普通hide当SG销毁。

全80行实际服务DPR2，新池初始152,457,208B→双段flight199,051,368B→完成退役165,014,344B→隐藏立即/100ms均0。包含临时烘焙的全程最坏预留268,004,696B，小于268,435,456B（256MiB），没有扩大门槛。最终纹理149,495,128→195,106,728→163,042,024B，ready时CPU/GPU GlyphRun图集均释放。`memoryBreakdown.poolReserved`包括尚未分配的最终纹理和退役预留；`poolTotal`使用实际Float上传计数，`captureGpu`包含线性最终纹理与预留余量，`linearMipReserved`/`bakeTemporaryReserved`另列避免混淆。这仍是可归属缓存计划，不含Qt/驱动池，不是进程硬上限。进程峰footprint738,330,328B，证据`queued-peak-dpr2{,-time}.log`。保留最初全并行linear超预算RED和retire Loader未释放导致provider警告的RED日志；修正后无provider、binding-loop或timeout警告。

## 归一化目标的混合前钳位

实际原GL RGBA8对颜色>1/负数、alpha>1、source-over/additive、1/4/16叠加的24组独立对照：旧premult转换15/24 exact、最大差166；先钳位straight RGB/alpha再乘alpha后24/24 RGBA exact0。业务自定义粒子保留全部原颜色/热色/halo计算，只在输出载体对sRGB钳位到0…1后premultiply；原alpha由原算法已在范围内。该修正单独用于完整场景时只轻微改善，主要云区残差由轴向栅格规则解决，不能把微小修正冒作全场景答案。证据`build/folia-diorama-preblend/{source.json,native.json,native.log}`。
