# Folia 原生场景滤镜

Sonnet 与 Tempera 共用同一份真实 source shader。来源固定为 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82` 与其 lockfile 的 Pixi 8.21.0；Folia 文件为 AGPL-3.0-only，Pixi 内核保留 `PIXI-LICENSE.txt`。`scripts/build-folia-filters.mjs` 逐文件记录 SHA-256，抽取原始 GLSL body，编译 Qt 的 GLSL/HLSL/MSL QSB。没有新增第三方运行时。

## 接口

`FilterChain.qml` 输入：

- `source`：纹理提供者，默认 `sourceIsTextureProvider=true`；直接传普通场景 Item 时设为 false。
- `inputUvScale`：输入纹理的有效画面范围，默认 `(1,1)`；连接另一个 chain.output 时使用其 `outputUvScale`。
- `passes`：按原源码顺序排列的描述数组，uniform 使用原名称。`kernel.postProcessPasses(amounts,seed)` 生成 lens→noise→contrast→RGB→halftone→vignette；转场 blur/glitch 由调用方按原顺序追加。
- `width/height`：逻辑 frame 大小；`resolution` 是真实物理 texels/逻辑 pixel，**不再乘 DPR**。Sonnet 与 Tempera 的不同 pass resolution 仍由各自源策略决定，调用方传该 filter 数组实际采用的最小值。
- `targetResolution`：最后一个 pass 所绘入的原 canvas 像素比例，默认等于 resolution。`finalTargetIsRoot=true` 时最后 pass 按此实际分辨率计算，输出像素尺寸按源 TextureSource.resize 的 round 规则；噪点/网点不会先在低分辨率计算后放大。它同时保留根画布 fragment 的 Y 方向。离屏中间层设为 false。
- `canvasSize`：真实原 canvas 逻辑大小，默认等于本链 width/height；处理 padding ROI 时应传原 viewport。`registeredScreens` 可显式给出全部源 canvas 物理 `{width,height}`（含当前 canvas）；空数组默认只注册当前 canvas。
- `present=false`：仅向下游提供结果，不重复绘到窗口；`live=false` 或 `visible=false` 则立即撤下整条链。

公开输出为 `output`（纹理提供者）、`outputUvScale`（有效 frame UV）、`outputFrameSize`（对应 UV 的实际逻辑 frame）、`passCount`（展开后的原生 pass 数）、`cacheBytes`、`allocationRevision`、`ready` 和 `errorString`。中间输出保留 source pool padding；有 pass 的 root 输出按实际 canvas 尺寸裁切，UV 为 `(1,1)`。uniform、种子或强度改变时保留原 target；只有实际 pool/根 target 尺寸或 pass 结构改变才重新分配。调用方应在无 filter 时直接使用原场景；空 passes 仍允许用一个 input target 取得统一纹理输出。

| kind                            | 参数                                                                 |
| ------------------------------- | -------------------------------------------------------------------- |
| `lens`                          | `uDistortion`、`uDispersion`                                         |
| `noise`                         | `uNoise`、`uSeed`（原工厂为 `(seed % 10000)/10000`）                 |
| `contrast`                      | `uContrast`（Pixi additive amount，0 为恒等；内部对比度为 1+amount） |
| `rgb` / `halftone` / `vignette` | `uAmount`                                                            |
| `glitch`                        | `uAmount`、`uSeed`                                                   |
| `blur`                          | `strength`、`quality`（默认 2）、`kernelSize`（默认 5）              |

`ScreenBlend.qml` 接收两份纹理 `sourceA/sourceB`、`uvScaleA/B`、`uvOffsetA/B`、`amountA/B` 和 `live`。严格采用 Pixi 的预乘 screen factors：RGB=`A+B−A*B`，alpha=`a+b−a*b`，支持将已模糊的 halo 与正文合成。它本身不分配离屏纹理；需要继续过滤时，将其作为普通 Item 输入 FilterChain，设置 `sourceIsTextureProvider=false`。

halo 的边界和 padding 由调用方按源节点 bounds 提供，不凭 viewport 猜测字形范围。若用扩大了 padding 的画面，ScreenBlend 用 UV offset/scale 取回中央 viewport。每逻辑单位对应 `chain.outputUvScale / chain.outputFrameSize`，因此可准确计算 padding 的 UV 偏移。

## 保留的 source 算法

lens 的 barrel 系数 0.32、dispersion 0.012 和细线 neutral core；RGB 的 25°轴与 3 px 强度；halftone 的 5 px cell、15°/75°/0°三色屏；vignette 的 0.52/1.08 阈值；glitch 的 26/110 行带、0.095/0.035 平移及灰度 tear 均来自原 GLSL。

Noise 与 ColorMatrix 先反预乘、着色后再预乘。contrast 对角线为 1+amount、偏置为 −0.5*amount，保留原 alpha。GLSL 的 `gl_FragCoord` 显式适配物理 frame/根画布 Y 方向，不能用逻辑 viewport 坐标替代。Pixi 8.21 的 pool input、有效 frame UV 和物理 half-texel clamp 都保留。实际 ViewSystem 注册 canvas 物理尺寸后，pool 每轴取 min(POT, 最小可容纳的已注册 screen)，并非始终 POT；这与 Folia 自己较早的 POT 注释不同。

Pixi BlurFilter 不是直接把 strength 当成 Gaussian σ。它使用 5/7/9/11/13/15 固定 kernel，quality 多轮的初始 strength 为 `strength/sqrt(sum(0.5^(2*i)))`，随后每轮减半，先完成所有 X 轮，再所有 Y 轮。原 vertex 的仿射采样偏移移到 fragment 内，数值公式与原权重不变。Canvas shadowBlur→σ/2、CSS filter blur→σ 的规则不适用于该 Pixi 固定内核。

## 资源与验证

最多 16 个描述、32 个展开 pass，blur quality 最多 8、strength 绝对值最多 128。计划纹理边长最多 16384 px，输入及展开 pass 的 RGBA8 target 总额最多 256 MiB；超限返回错误并撤下 output，不静默降采样。`cacheBytes` 表示该明确的颜色 target 计划，不包含调用方输入、框架缓存、管线和在途 GPU 命令，也不表示进程 RSS。退出后 Qt 在渲染线程排放其资源。

`node --test tests/folia-filters.test.mjs` 验证 7 项：原独立 factory 的顺序/参数/种子、实际 Pixi 原方法的 1–8 档初始 blur strength、完整 kernel、POT/registered-screen/half-texel 与源码 provenance。独立 source oracle 保存在测试文件中，运行不依赖参考 checkout。

真实 Cocoa/Metal/DPR 2 的 `tests/qml/tst_FoliaFilters.qml` 验证每一种实际 shader 都产生不同像素、固定 source/seed 重绘一致、预乘 contrast、半透明 screen 合成、padding UV crop、两条链连续采样、root 画布实际分辨率与物理网点密度、uniform 更新保留 target、超预算拒绝、失活释放。offscreen 软件后端不作为 GPU 证明。跨平台 GPU 和浏览器逐像素对照仍未覆盖；不同后端的 sin/hash 舍入可能改变 grain/glitch 的具体随机像素，原公式和种子均保持。

## 共用矢量记录层

同级 `../scene-graph.mjs` 的 `createSceneGraph({measureText})` 返回原源码所调用的 Container/Graphics/Text/TextStyle/Sprite/FillGradient/Filter/UniformGroup 等记录接口。它只保留源几何、字体、顺序与变换，由 Qt 绘制；不启动 Pixi renderer。`measureText({text,style,nativeContext,node})` 必须提供真实 `{width,height}`，缺失时报错，不估算字体宽高；也可稍后 `pixi.setTextMeasurer(callback)`。Sprite 原样保留调用方 texture 载体及 source/frame，纹理解码与合法 URL 校验由各宿主输入层负责。

`localMatrix(node)` 为 `[a,c,tx,b,d,ty]`；`qtMatrix(matrix)` 转成 Qt.matrix4x4 所需的 16 项，保留 rotation/skew/scale/pivot。`snapshot(root)` 输出平铺 `nodes`（id/parent/kind/matrix/paths/style/texture/anchor 等）、pathCount/pathBytes；`poseSnapshot(root)` 只输出姿态与 geometryRevision。动画若改 Graphics 几何，消费者读取其新 paths；固定 Tempera 构图只更新姿态。`snapshot` 默认至多 32768 节点、65536 绘制 primitive、64 MiB SVG 路径；pathBytes 仅表示路径字符串，绝非进程或 GPU 总内存。

`../SonnetVector.qml` 接受 `paths` 与 `live`，逐 primitive 保留 fill/stroke 顺序、独立 alpha、线端与尖角、各形状局部渐变，输出 pathCount/geometryBytes；它不重复施加节点姿态，调用方的 Item 挂 Matrix4x4。隐藏或 live=false 撤下全部 Shape。

镂空沿用实际 lockfile 的 earcut 3.2.3 ISC 算法与 source 索引，不将孔替换成背景色。内嵌完整 ISC 许可与源 SHA；`scripts/build-folia-scene-graph.mjs` 可重生成。同一 fill 中的多个 shape 分开绘制，因此半透明相交仍按原 alpha 累积。真实 Pixi 8.21.0 Graphics 的几何边界/样式 golden 已嵌入 Node 测试，CI 不需要参考 checkout。Cocoa/Metal、DPR 2 测试还验证孔穿透真实蓝色底、重叠 alpha、局部渐变、原 pivot/scale/rotation 矩阵与隐藏释放。

`createSceneGraph({maxNodes})` 可额外限制仍存活的 source Container/Text/Graphics/Sprite 对象数；`nodeCount` 只计仍未 destroy 的对象，重复 destroy 不重复释放。未传时不改变现有消费者行为；Tempera 明确使用 98,304 上限。此项属于 JS 对象数约束，不是进程 RSS 上限。

`SonnetVector.tint` 默认白色，按 Pixi packed RGB 逐通道乘 fill、stroke 与 gradient stop 的 RGB，保留原 paint alpha，忽略 tint 自身的 alpha；改变 tint 不替换静态 SVG paths。
