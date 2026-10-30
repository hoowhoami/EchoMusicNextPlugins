# Folia GPU 迁移边界

更新：2026-10-30。宿主整合上游 `2f501b4`，作者仓库整合 `c9c1f8e`。已完成真实 Release 构建、SDK 导出和第一个 Latent GPU 切片；尚未完成 Fume 等其余绘制后端的全量迁移。旧包的验收不能代替本轮结果。

## 职责

| 插件负责                                                  | 宿主负责                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| 十四种样式的布局、逐字揭示、相机、动画曲线、歌词时间映射  | 唯一播放状态、只读歌词及呈现时钟                                 |
| Shader、几何、过滤、pass 规划、裁剪与绘制顺序             | 通用 buffer/texture/pipeline 执行、平台 RHI                      |
| Fume Canvas 绘图语义、阴影参数、范围颜色、clip-after-blur | 完整 QFont shaping、fallback、字形度量和 ink/atlas 准备          |
| 可见集合、批次和释放时机                                  | 编码、受控资源租约、预算、线程归属、scope/账号撤销及迟到结果隔离 |

普通 Text、控件、Qt Quick ShaderEffect 和字体服务本来就是通用载体，不必为了使用新 API 强制全部换成离屏 pass。宿主不应出现 Folia 模式分支或 Fume 专属接口。FloatTexture、PointMesh、NativeShaderEffect 的执行职责可在实际消费者迁移并验收后收拢，不能先删后补。

## 已实施：Latent

插件持有 208 字节参数打包、两个源的命令图和全部 shader。两张 `EchoGpuSurface` 按原 `1280×720` 面积预算固定物理尺寸，输出 RGBA8；原 CSS soft-light、滤镜和最终全窗口合成继续在插件的 Quick ShaderEffect 中执行。源 shader 将预乘 sRGB 转线性，宿主 SDR 输出编码还原，再进行原空间的 CSS 合成。

这是一条绘制链，不保留旧背景回退。最终合成不创建全窗 RHI 目标，因而不因 4K 逻辑窗口、DPR 2 而触发全窗 4096/8MP 离屏限制，也未压低最终输出分辨率。Qt effect 引用隐藏源 surface；隐藏时解绑捕获、detach GPU、dispose 三个逻辑句柄，恢复时重建。

正式构建由 `plugin.config.json` 编译三项 RHI shader 和一项 Quick shader。生成器从固定 Paper/Folia 输入再生成 shader 源码，临时目录回归逐字节比较 16 项输出；不向源码目录写 QSB。原 Paper 原文、LICENSE、NOTICE 保留。

Qt 6.12 缓存命中后，ShaderEffect 的实例 metadata 状态可停留 Uncompiled；本轮红灯已复现。就绪改为源 GPU ready/frames、无 Quick Error，以及源就绪后的真实窗口呈现帧。隐藏、设备代际、尺寸、模式、配色与 scope 撤销会使该证明失效，普通逐帧状态不持续额外请求窗口更新。

## 已有能力与缺口

- 最新 GPU 支持有序提交、传输、viewport/scissor、MRT、间接绘制和多维纹理；局部 HDR 实屏仍不可用。详见 [GPU 绘图](../graphics.md)、[提交](../gpu-submissions.md)。
- createTexture 仍只接尺寸、格式和数据，没有 GlyphRun atlas、QQuickItem/ShaderEffectSource 或受控图片的纹理导入口；不能把旧 QRhiTexture 裸指针交给 JS。
- 仅借用现有 provider 指针还不能保证同帧依赖：QQuickRhiItem 在 beforeRendering 执行，动态 SES 通常在 preprocess 更新。未验证通用调度前，保留字体/Canvas 原生后端；可评审插件 Quick 过滤或通用 scenegraph carrier，不能将指针借用冒充已完成纹理桥。
- 后续桥须限制同窗口、同 scope、只读采样，并明确准备、UV/度量、源销毁、DPR、scenegraph invalidation、代际撤销和 inflight 资源账本。不得以逐帧 readback→编码→重传替代。
- 新 frame 时间为 surface elapsed time，不是歌词听觉时钟；保留现有只读 A/B 原生时钟和 cue。旧 Quick uniform ABI 也不能直接套用新 96 字节 frame。
- GPU blend 当前是 none/alpha/add，不能把 screen 混合替成 add。Fume 具体 blur/rescale/compose 策略仍在旧原生 Canvas 后端，字体准备本身应继续复用。
- ImageCapture 负责异步 PNG/JPEG、URL 租约和回收，raw readback 不能替代它。

## 本轮验证边界

正式开发包 `artifacts/folia-lyrics-skin-1.0.0.echomod` 为 20,051,434 字节、866 项，SHA-256 `0000dfe77c8f04c23f7cdd84afc2a101779535467bcf577799525aa34e34ce9a`。相对执行主体原生回归的 `d363efc9…`，ZIP payload 仅 README 更新，代码和 shader 字节相同；最终设置验收直接安装本包。版本保持 1.0.0，未发布。

证据目录为 `build/folia-gpu-migration-20261030/`；宿主同名目录保存 Release、Rust、Qt 和整合记录。

- Release app/runtime-test 构建、真实 sdk-sync/sdk-check、作者类型及格式检查通过。
- Rust：374 audio + 17 FFI 通过，5 项既有 ignored；seek 快速确认及消费/停止在等待前发生的回归均本轮执行通过，header 与自有 crate 格式通过。
- 宿主与作者格式工具通过。暂存区完整 whitespace 检查保留一个精确来源例外：新 `latent/gpu/dithering.frag:121` 的空白行属于逐字保留的 Paper 算法体；旧原件和算法体哈希、临时再生成相等证明在 `whitespace-provenance.json`，不修改原件、不放宽算法测试，也未更改全局 whitespace 设置。排除此固定文件后的其余暂存区检查通过。
- 作者 Node 全套 336/336；Latent 定向 8/8、固定源再生成与正式 QSB 烘焙通过。
- Metal 通用 GPU 六项、播放时钟/元数据/歌词生命周期三项通过；字体准备、呈现 scope、歌词 A/B、TTML 与受控资产五组 Qt 通过。
- Latent DPR 1/2 各 6/6（含 init/cleanup）；覆盖实际像素、静态缓存首帧、大尺寸输出、暂停、隐藏释放与恢复。
- 同一新宿主与迁移前正式包的 18 帧对照：抖动单层完全相同，网格/混合平均通道差 ≤ 0.0183、最大差 2/255；见 `latent-old-new-dpr{1,2}.json`。
- 固定原版 Paper 浏览器对照为 Chrome 151，18 帧平均单通道误差 0.224–0.402/255，p95 ≤ 2，局部最大差 192。该对照保留局部差异，不是逐像素一致或新的全画面误差通过门槛。
- 生产十四模式回归首轮在 Sonnet 读取 length 时失败；加入阶段/stack 诊断后整套 5/5 通过，首次间歇性异常尚未定位。定向压力测试另复现旧 scene worker 错误污染新 token，修正过滤顺序后原生 15/15。修复后的整套生命周期已再次 5/5，通过所有十四模式实际关闭与重开；保留所有失败记录。
- 新链路真实 PCM 的 LRC A/B 呈现首轮 5/6，queued 状态门未通过；同门槛隔离原样 3/3，未定位偶发根因，不标整套通过。TTML A/B 双声部实际时钟与退休 3/3。测试包 fixture 同步声明 graphics 并复制正式烘焙产物，没有模拟播放器或放宽时间门。
- 最终正式包的实际设置预览/按住调整/一次保存/关闭/reload 恢复 4/4 通过。
- 三端、HDR 和其余新 GPU 绘制路径尚未验收。前台性能旧包基线因窗口失活/失去 exposure 被拒绝，DPR2 的大视口也被系统缩小；720×480 的保守重试仍失活，未形成有效前后对照，未放宽门槛。官方默认 offscreen 作者宿主验收 36/36；额外 Cocoa 验收为 37/38，进程权限用例失败；相关实现/测试相对最新主线无改动，隔离重试 60s 未完成，未将其标作通过。

## 后续顺序

1. 最新源码已通过十四模式关闭/重开、设置和官方 Spectrum/SDK 默认验收；保留首轮 Sonnet 与额外 Cocoa 权限失败，并继续独立跟踪，不能以重跑抹去风险。
2. 审查最小通用纹理桥，先通过 scope、窗口、源销毁、DPR 与资源预算测试，再迁移 Fume 过滤策略。
3. 保留原 sigma、完整 shaping 上下文和 source-over 顺序，复验原 528 样本、DPR 1/2、80 行、双 actor、capture 和预算拒绝恢复，不扩大预算或降低门槛。
4. 按真实闭包迁移 Sora/Diorama 载体及其它滤镜，最后删除没有消费者的旧执行原语；重新打包对应源码与产物，并补前台性能证据。

## 作者接手清单

用户已决定按当前已验证的状态提交 PR，后续工作由宿主作者接手；本次交接不代表全量 GPU 迁移或完整验收完成。

- 保留现有字体、Canvas、图像捕获服务；先解决动态纹理的同帧依赖与 scope/window/代际租约，再收拢 Fume 等剩余绘制后端。不要直接删除仍有消费者的通用能力。
- 前台性能需要稳定的活动窗口及相同物理视口，重新获取有效的迁移前后对照。已有失败采样不作性能结论。
- 跟踪首轮 Sonnet length 异常、LRC A/B queued 时序偶发失败，以及额外 Cocoa 进程权限用例失败；不把隔离通过或随后通过当作已定位根因。
- 补 Windows/Linux、HDR 与连续真实音乐播放的实机验收；未覆盖项保留未完成状态。

代码、正式开发包和索引在本次 PR 中一并交付。没有合并主线、创建正式 release 或提升版本。
