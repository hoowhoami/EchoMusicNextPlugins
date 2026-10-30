# Qt 组件纹理接入 GPU

声明 `graphics.textureSources` feature 和 `graphics` capability。`surface.importTextureSource(item)` 返回只读 `EchoGpuResource`，由当前画布持有；相同画布重复导入同一对象复用租约。输入必须是同一插件激活、同一窗口的真实 Qt Quick 对象，包含 `plugin` 呈现上下文；普通 JS 对象不能代替它。

先为插件自己的源组件明确设置 `layer.enabled: true`，或提供完整的非 atlas texture provider，再导入。宿主不修改源的父级、layer、显隐和输入。插件可以管理自己位于视口外的缓存层；导入不等于窗口截图，不包含父级变换、裁剪或最终根 opacity。

```qml
Item {
    id: sourceLayer
    property var plugin: root.plugin
    width: 320
    height: 64
    layer.enabled: true
    Text { text: "Hello 星"; font.pixelSize: 28 }
}
EchoGpuSurface {
    id: effect
    graphics: root.plugin.graphics
    property var sourceTexture
    Component.onCompleted: sourceTexture = importTextureSource(sourceLayer)
    // Pass sourceTexture.id as a texture binding with an ordinary sampler.
}
```

`ready` 对借用源表示 Qt 纹理已经可采样；对自建资源表示定义可用于提交，并不保证当前设备已分配资源。先安装持久图，等待源 ready 后再做一次性 enqueue；未就绪的源不会用 CPU 截图代替。provider 内容变化按需唤醒画布，`continuous: false` 也能更新；重新配置 provider 后可再次 import/requestFrame。字体组件自己的准备完成状态仍须独立检查，纹理 ready 不保证已有非空字形或屏幕已经呈现。

GPU 使用在渲染线程借用 Qt 的 QRhiTexture，必要时先更新动态 layer；没有 grabToImage、PNG 编码或 CPU 上传往返。纹理所有权仍归 Qt，借用不会重复计入插件自建 GPU 分配；这不代表源 layer/字体缓存没有成本，源所有者仍需限制其缓存。

源只允许 sampled binding。不能 CPU 写入、存储图像写入、作为渲染/传输目标、直接 readback/copy 或导出分享 token；需要处理后的副本时先渲染至插件自建目标，再按已有接口读回/传输。每个消费者分别导入源。4096物理像素单边、8M像素、最多4096项的源子树；不接受包含 EchoGpuSurface 的源或自身/祖先反馈。不支持跨窗口、跨RHI或外部原生句柄。Image 的 atlas 子区域需要显式完整 layer，不能按0..1误采整张图集。

源销毁/换窗口、源上下文退休、消费者销毁/更换 graphics、账号变化及停用使租约失效。暂停/隐藏消费者回收其 GPU 状态和订阅；恢复重新解析 provider，底层资源更换时 generation 增长。源自身及其 Qt 缓存的创建和释放仍由源组件管理；已经编码的 GPU 工作不能回滚。

## 色彩与 alpha

采样保留源 texel 原值，不隐式转换颜色空间。常规 Qt Quick RGBA8 layer 是预乘的编码颜色；现有插件 GPU 工作纹理使用预乘线性值。将这种源送入现有线性输出链前，先解预乘、解码 sRGB，再乘 alpha：

```glsl
vec4 p = texture(sourceImage, uv);
vec3 c = p.rgb / max(p.a, 0.000001);
vec3 linear = mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
                  greaterThan(c, vec3(0.04045)));
color = vec4(linear * p.a, p.a);
```

自定义线性/浮点 provider 按自身的采样约定处理，不能重复解码。默认 HDR、普通窗口和 Windows 合成路径没有变更。

## 与 GlyphRun / ImageCapture 的关系

GlyphRun 仍负责字体回退、连字、原生指标、准备和绘制。组件纹理导入不提供字形 atlas、UV 或字形实例表；需要直接采样字形时使用 [字形图集 API](gpu-glyph-atlases.md)，两者不互相替代。启用原生文字层后可在此基础上增加 RHI 后处理；应同时等文字组件与借用纹理就绪。ImageCapture 的编码文件用于持久资产/导出，职责也继续保留。
