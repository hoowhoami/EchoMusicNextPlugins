# GPU 绘图

`ctx.graphics` 管理绘图资源，`EchoGpuSurface` 在 Qt 场景图中执行渲染和计算。插件交付 QML、JavaScript 和 `.qsb` 着色器；不链接 Qt 私有库，也不取得 QRhi 指针。

manifest 声明 capability `graphics`，按使用情况声明 `graphics.rhi`、`graphics.compute`、`graphics.readback`。feature 表示宿主实现了接口；实际后端、计算支持和 HDR 输出应读取 `surface.status`。没有 GPU 的软件/Null 后端会明确返回不可用，作者可提供 QML 矢量回退。

## 资源与命令

- `createBuffer({size, usage, format?}, data?)`：uniform、vertex、index、storage 缓冲区。size 按 4 字节对齐；uniform 不与其它 usage 混用。format 为 float32/float16/uint8/uint16/uint32，默认 float32。
- `createTexture({width,height,format?,usage}, data?)`：rgba8、rgba16f、rgba32f、r32f 的二维纹理；usage 为 sampled、render-target、storage、readback。上传必须覆盖完整尺寸；初始空内容清零。
- `createSampler({minFilter?,magFilter?,u?,v?})`：nearest/linear，clamp/repeat/mirror。
- `createRenderPipeline({vertexShader,fragmentShader,vertexLayout?,topology?,blend?,cull?,depthTest?,depthWrite?})`：顶点/片元 `.qsb`、单顶点流的 float/float2/float3/float4 属性、索引/实例绘制、深度、剔除和混合。blend 为 none/alpha/add，alpha 使用预乘颜色。
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
