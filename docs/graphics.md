# GPU 绘图

`ctx.graphics` 管理绘图资源，`EchoGpuSurface` 在 Qt 场景图中执行渲染和计算。插件交付 QML、JavaScript 和 `.qsb` 着色器；不链接 Qt 私有库，也不取得 QRhi 指针。

manifest 声明 capability `graphics`，按使用情况声明 `graphics.rhi`、`graphics.compute`、`graphics.readback`。feature 表示宿主实现了接口；实际后端、计算支持和 HDR 输出应读取 `surface.status`。没有 GPU 的软件/Null 后端会明确返回不可用，作者可提供 QML 矢量回退。

## 作用域与就绪

`graphics.active` 是只读生命周期状态，`activeChanged` 仅在实际变化时通知。作用域有效、声明了 `graphics` 能力且服务未关闭时为 true；第一个 GPU 画布创建之前也可以为 true，适合安排逻辑资源准备。

它不表示窗口可见、设备可用或纹理已上传。设备和后端状态看画布的 `status` / `capabilities`，上传看纹理的 `ready` / `errorString`。每次操作仍会在宿主重新验证作用域；不要把预先读到的 true 当作后续操作必定成功。

账号切换时，激活 façade 会关闭后重新开放；旧 presentation、资源句柄及数据保持失效，不能等 active 再次变 true 后继续使用。active 不是账号 epoch 或取消令牌。隐藏/关闭页面仍按该 presentation 的既有生命周期处理。

## 资源与命令

- `createBuffer({size, usage, format?}, data?)`：uniform、vertex、index、storage 缓冲区。size 按 4 字节对齐；uniform 不与其它 usage 混用。format 为 float32/float16/uint8/uint16/uint32，默认 float32。
- `createTexture({width,height,format?,usage}, data?)`：rgba8、rgba16f、rgba32f、r32f 的二维纹理；usage 为 sampled、render-target、storage、readback。上传必须覆盖完整尺寸；初始空内容清零。
- `createSampler({minFilter?,magFilter?,u?,v?})`：nearest/linear，clamp/repeat/mirror。
- `createRenderPipeline({vertexShader,fragmentShader,vertexLayout?,topology?,blend?,cull?,depthTest?,depthWrite?})`：顶点/片元 `.qsb`、多顶点流、逐实例属性、浮点/整数/半精度/normalized颜色及矩阵列、索引/实例绘制、深度、剔除和混合。blend 为 none/alpha/add，alpha 使用预乘颜色。
- `createComputePipeline({computeShader})`：`.comp.qsb` 计算管线。
- `writeBuffer(handle,data,byteOffset?)`、`writeTexture(handle,data)` 更新 CPU 镜像，下一次绘制上传。

资源返回 `EchoGpuResource`，命令使用其 `id`。句柄仅用于所属 presentation/context；跨上下文使用会拒绝。`dispose()` 立即使其失效，随后在渲染线程释放原生资源；不要继续解引用已销毁的 Qt 句柄。

大块数据使用已正确打包的 `TypedArray.buffer`。numeric array/TypedArray 按 format 转换，最多 65536 个元素；ArrayBuffer 直接表示字节。rgba16f 的 ArrayBuffer 需要已经编码为半精度浮点，不是 float32 字节。

`EchoGpuSurface` 是 `EchoMusic.PluginSdk` 中的 QML Item：

```qml
EchoGpuSurface {
    id: canvas
    anchors.fill: parent
    graphics: plugin.graphics
    dynamicRange: "sdr" // 默认；auto / hdr 仅请求本画布的扩展亮度处理
    continuous: false
    fps: 30
}
```

`fps`为正数时按1–120节流；设为0且`continuous: true`时跟随窗口帧继续绘制，不启用轮询计时器。实际呈现仍受Qt窗口与显示设备调度限制；隐藏、最小化、暂停或作用域退休时停止。

`submit({passes})` 提交有序命令图；重复的相同图复用管线。每个 render pass 包含 pipeline、bindings、draws，可指定 target（默认 `surface`）、clear 和 loadOp（clear/load）。可先渲染到纹理，再由后续 pass 采样；不能在同一 pass 读写颜色附件。draw 支持 count、first、instances、vertexBuffer、vertexOffset（字节）、indexBuffer、indexFormat。

compute pass 包含 pipeline、bindings、groups `[x,y,z]`。bindings 显式指定 binding、kind（uniform/texture/storage-buffer/storage-image）、resource，采样纹理另带 sampler，storage 另带 access（read/write/read-write）。宿主检查资源所有权、usage、着色器反射、uniform 大小、storage image 格式及设备 dispatch 限制。

生产用法见 [频谱 GpuLayer.qml](../plugins/spectrum-visualizer/GpuLayer.qml) 与 [着色器](../plugins/spectrum-visualizer/shaders/gpu)。五种模式、GPU 插值、完整 8192 点波形、纹理采样共用此接口；HDR控制受实际局部输出能力限制。

## Frame uniform

binding 使用 `{binding:0,kind:"uniform",resource:"frame"}` 时，宿主提供 96 字节 std140 数据：

```glsl
layout(std140,binding=0) uniform Frame {
    vec4 viewport;   // 画布像素宽、高、窗口 DPR、渲染器存续秒数
    vec4 outputInfo; // 输出模式、HDR headroom、SDR white nits、framebuffer Y-up
    mat4 correction; // QRhi clipSpaceCorrMatrix，列主序
} frame;
```

viewport 始终是画布尺寸；离屏 pass 的纹理尺寸使用 textureSize/imageSize 查询。

输出模式为 -1（显式 SDR）、0（请求 HDR，但按 SDR 映射）。当前嵌入式后端不输出模式1。顶点先生成 OpenGL 约定的裁剪坐标，再乘 correction。采样渲染目标时按 framebuffer Y-up 处理 OpenGL 的上下方向差异；上传纹理按自身数据行顺序采样。

## 局部 HDR 请求与显示边界

`dynamicRange` 默认为 `sdr`。`auto`/`hdr` 请求只作用于插件画布：线性浮点颜色在画布自己的输出 pass 进行 SDR 色调映射，不修改父窗口格式、普通界面颜色、透明度或系统毛玻璃，不创建整窗合成层，也不重挂载宿主 UI。

当前 Qt 6.12 嵌入式 `QQuickRhiItem` 后端没有独立 HDR 显示通道。因此 status 明确提供 `hdrRequested`（是否请求）、`localHdrSupported:false`、`hdr:false`、`dynamicRange:"sdr"`；请求时 reason 为 `local-hdr-presentation-unavailable`。浮点纹理仍可用于计算、离屏绘制和读回，其值超过1不表示屏幕正在输出 HDR。宿主不公布 `graphics.hdr` feature；需要真正 HDR 的插件不能因此被误判为兼容。局部浮点处理/SDR 映射属于 `graphics.rhi`，不能用浮点支持代替实际输出能力检查。

官方频谱的 HDR 默认关闭；局部输出不受支持时关闭并禁用该控件，普通频谱照常运行，既有持久设置不会改写或触发父窗口 HDR。真正局部 HDR 实屏输出尚需独立的原生合成后端，同时验证透明、裁剪、遮挡和输入，当前不宣称完成。

Qt 官方说明普通场景不是逐资产色彩管理管线，并建议用专用 HDR 子窗口隔离普通界面，见 [Window embedding in Qt Quick](https://www.qt.io/blog/window-embedding-in-qt-quick)。这里不以原生子窗口冒充普通透明 Item，也不通过切换宿主整窗绕过限制。

## 生命周期与预算

隐藏、最小化、paused 或 scope 关闭后停止时钟和提交。原生资源在渲染线程停止/场景图失效时回收；Qt 的普通窗口/场景图缓存仍按 Qt 生命周期管理。恢复时重建原生资源并重放 CPU 镜像，status.generation 递增。GPU 计算产生的临时内容需要由命令图重新生成，频谱已自动处理。

停用、重载、账号变化使旧资源和回读失效。根 facade 可在新账号创建新资源，旧 presentation 不复活。readback 返回可取消的 `EchoPluginOperation`，最多 5 秒，结果为 data ArrayBuffer、width、height、format。只允许自己的纹理/缓冲区或本画布；不读取其它插件或宿主画面。动态 uniform buffer 不支持读回。

预算按整个插件共享：64 MiB 逻辑数据、128 MiB 原生数据估算、256 MiB 活动画布预算、32 MiB 回读暂存预算；最多 256 个资源和 16 个画布。纹理单边最多 4096，画布最多 8M 像素，单次回读最多 16 MiB、最多 8 个排队请求，frame 最多 32 passes，draw 最多 100 万顶点实例积，compute 最多 6400 万 invocations。设备较低限制仍优先。`capabilities.limits` 提供限额；这不是对驱动缓存或可信插件全部内存的安全沙盒。

## 编译与发布

开发机器安装匹配 SDK 的 Qt 6.12.0 Shader Tools，将 qsb 加入 PATH 或设置 ECHO_QSB。`plugin.config.json`：

```json
{
  "entry": "src/entry.ts",
  "assets": ["Layer.qml", "shaders"],
  "shaders": [
    { "source": "shaders/draw.vert", "output": "shaders/draw.vert.qsb" },
    { "source": "shaders/draw.frag", "output": "shaders/draw.frag.qsb" },
    { "source": "shaders/update.comp", "output": "shaders/update.comp.qsb" },
    { "source": "shaders/effect.frag", "output": "shaders/effect.frag.qsb", "target": "quick" }
  ]
}
```

默认 rhi 目标生成 GLSL 300es/330（compute 310es/430）、HLSL 5.0、MSL 1.2 和 SPIR-V；quick 保留 Qt Quick ShaderEffect 的旧 GLSL 目标，不用于 compute。源码和 include 必须留在包内，输出不能覆盖资产。编译/验证失败保留上一次完整产物。正式包仍为 `.echomod`，索引和宿主继续校验 SHA-256。

宿主封装层使用固定 Qt 构建的 GuiPrivate；发布时 Qt 库与宿主来自同一 SDK。作者插件不包含这些 C++ 头文件或本机 ABI。

资源分享、同RHI设备边界及多流布局见[gpu-submissions](gpu-submissions.md)。

Qt组件layer/texture provider的只读GPU借用见[纹理源](gpu-texture-sources.md)；原生字体 ink/UV/指标直导见[字形图集](gpu-glyph-atlases.md)。持久图像捕获继续归图像导出路径。

## ShaderEffect 的原始浮点输入与混合

`graphics.floatTexture` 提供 `FloatTexture`，将原始 RGBA32F 数据直接作为 Qt `ShaderEffect` 纹理源，不进行图像编码或颜色转换。先绑定当前插件的 `graphics`；`upload(width, height, arrayBuffer)` 只接受 ArrayBuffer，`uploadPacked(width, height, utf16Words)` 接受按小端 uint16 打包的相同字节。声明 `graphics.floatTexture.base64` 后可用 `uploadBase64(width, height, base64)` 原生解码标准 ASCII Base64，避免在 QML 中逐字节复制；输入须规范编码、正确填充且无空白，尺寸必须与解码字节数相符。每像素严格 16 字节，所有 float32 必须有限；每轴 1–8192、每纹理最多 16 MiB，共享当前 scope 的 native 预算，最多 256 个在用或待退休的纹理。拒绝的输入保留上一份有效内容。

`sourceBytes` 表示保留的源字节，`cacheBytes` 表示已上传 GPU 字节，`ready` 表示存在已上传且没有错误的纹理。更新排队期间仍可使用上一份纹理，`ready` 不保证最新数据已经呈现；同尺寸更新复用原生分配。纹理在被 ShaderEffect 采样时上传，因此不要用 `ready` 来阻止唯一采样者的创建。`textureUploads` 累计实际上传数，`errorString` 提供错误。相同数据不会重复上传。数据源本身不画像素，其坐标可在裁切视口外；离屏回收按最近有尺寸的父呈现项判断。隐藏、全透明、最小化、停用和会话失效会清理数据；恢复后由调用者重新上传，不能用失效账号的数据自动恢复。`clear()` 主动释放，GPU 资源在所属渲染线程退休。

`graphics.shaderComposition` 提供 `NativeShaderEffect`，沿用原生 ShaderEffect 的 shader、mesh、uniform 与 sampler 绑定。`composition` 支持 `source-over`（默认）、`additive` 和 `screen`，输入使用预乘 alpha；RGB 分别计算 `S + D*(1-Sa)`、`S+D`、`S+D*(1-S)`。alpha 对 source-over/screen 使用 `Sa+Da*(1-Sa)`，additive 使用 `Sa+Da`。它只改变该绘图项的混合，不改变窗口合成或 HDR 设置。

`graphics.blendEquations` adds `max` and `exclusion` to both
`NativeShaderEffect.composition` and RHI pipeline `blend`/`blends`.
`max` takes the componentwise maximum of premultiplied RGBA. `exclusion`
computes RGB `S*(1-D)+D*(1-S)` and alpha `Sa+Da*(1-Sa)`.
Declare the feature when either mode is required. Per-attachment modes retain
the existing MRT and independent blending checks.

## 离屏深度与多重采样

需要这些接口时声明 `graphics.depthMsaa`。`createTexture` 的 `depth32f`
只支持基础二维纹理，usage 必须包含 `render-target`，可同时包含 `sampled`。
不接受 CPU 初始数据、writeTexture、storage、mipmap、传输或直接 readback；
尚未绘制的深度纹理会在 GPU 上初始化为远平面 1。

离屏 render pass 可指定 `depthTarget: { texture: depth.id }`，与颜色附件尺寸相同。
`colorTargets: []` 加显式深度附件可执行仅深度绘制，此时片元着色器不得输出颜色。
显式深度和颜色附件均不能与同一 pass 的 shader binding 别名。
默认 `surface` 不接受显式深度或额外 samples。

`samples: 1 | 2 | 4 | 8` 默认 1，实际支持见 `surface.status.sampleCounts`。
深度采样支持见 `depthTextures`，多重采样深度解析另需 `depthResolve`。
颜色和显式深度解析到调用者提供的单采样纹理，之后的 pass 可以采样。
设备不支持的组合会明确失败；插件应按实际能力选择其支持的质量配置。
多重采样附件及隐式深度均计入现有原生 GPU 预算，随隐藏、作用域和账号退休释放。

同一组附件、相同 samples 的连续 `loadOp: 'load'` pass 组成绘制序列，
解析在序列末尾执行。解析后的 MSAA 深度内容已失效，不能跨不相邻 pass
或跨帧从该 MSAA 深度继续 load；下一组应从 clear 开始。
单采样解析结果仍可正常采样。隐藏后恢复也从 clear 重建 GPU 内容。

Render pipelines accept `depthCompare` (`less` by default; also `less-equal`, `greater`, `greater-equal`, `equal`, `not-equal`, `always`, `never`) and `frontFace` (`ccw` by default, or `cw`). `depthCompare` only applies with `depthTest: true`; `depthWrite` remains independent. Unknown values are rejected. `graphics.pipelineState` indicates these optional pipeline fields.

`graphicsLimits` can declare four explicit positive integer limits: `logicalBytes`, `nativeBytes`, `renderTargetBytes`, and `maxCommands`. The hard maxima are 256 MiB, 512 MiB, 768 MiB, and 128 respectively. All four fields are required when this object is present, together with the `graphics` capability and `graphics.limits` feature. Omission uses the host defaults of 64 / 128 / 256 MiB and 32 commands. Limits are fixed when the activation is created; account and presentation children share that activation's budget. `graphics.capabilities.limits` reports the actual values. Declared limits do not preallocate memory.

Resource count (256), surfaces (16), texture axis (4096), readback (32 MiB) and submission snapshots (64 MiB) retain their separate fixed limits. Snapshots charge actual retained CPU upload data, shader bytes and conservative bounded command metadata. GPU-only target capacity is charged by the separate GPU budgets. A large empty target therefore does not itself consume the CPU snapshot quota; queued upload data still can exhaust it and are rejected. There are no named profiles or legacy accounting branches.

## 原生着色器预编译

插件打包可通过 `ECHO_NATIVE_SHADER_PACKS` 导入同一插件的完整预编译缓存。Windows 阶段编译 DXBC，macOS 阶段编译 Metal 库（最低 macOS 14.4），Linux 阶段验证 SPIR-V；三端产物用 Qt6.12.0 的 QShader 合并，保留原有入口、资源绑定及 GLSL/HLSL/MSL 源变体。缓存必须覆盖包内全部 `.qsb`，源码/反射指纹、文件哈希或任一后端不一致都会停止打包。驱动最终管线创建仍由运行设备负责；OpenGL 继续使用 GLSL。

`packages/tools/native/shader-pack` 是独立构建工具，需要相同版本 Qt 的 GuiPrivate 开发包，不进入插件或宿主运行时。配置其路径后可执行三端阶段及合并：

```sh
cmake -S packages/tools/native/shader-pack -B build/shader-tool -DCMAKE_PREFIX_PATH=/path/to/Qt/6.12.0
cmake --build build/shader-tool --config Release
# 设置 ECHO_SHADER_PACK_TOOL 为生成的 echo-plugin-shader-pack 可执行文件。
node scripts/precompile-plugin-shaders.mjs stage plugins/folia-lyrics-skin --backend macos --out build/native-macos
node scripts/precompile-plugin-shaders.mjs merge --windows build/native-windows --macos build/native-macos --linux build/native-linux --out build/portable-packs/folia-lyrics-skin
ECHO_NATIVE_SHADER_PACKS=build/portable-packs npm run prepare:source
```

Windows/macOS 阶段分别在对应系统运行，并要求 FXC/Metal 编译器实际可执行；`--backend linux` 使用离线 SPIR-V。在 GitHub Actions 中手动运行 `Plugin SDK and packages`，即可依次生成三端缓存、合并并在各平台重建检查插件；推送及 PR 不自动触发。`echo-plugin.build.json` 的 `nativeShaderPlugins` 列表要求发布准备必须提供完整缓存；普通 `build` 不导入缓存时仅供本地开发。预编译不调整插件版本，也不自动提交或发布。

CI 的 Qt 安装统一使用 `.github/actions/setup-qt`。Windows 固定 Python 3.12、aqtinstall 3.3.0 和 MSVC2022 x64 SDK，通过 `scripts/qt_download.py` 解析 Qt 6.12.0 的独立 MSVC 元数据目录，下载、校验及解压仍由 aqt 执行。
