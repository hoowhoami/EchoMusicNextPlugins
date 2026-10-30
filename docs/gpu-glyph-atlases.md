# 原生字形图集与 GPU 采样

声明 `text.glyphs`、`graphics.glyphRun.canvas`、`graphics.rhi`、`graphics.glyphAtlases`，以及 `graphics` capability。QML 导入 `EchoMusic.PluginSdk`；`GlyphRun` 负责完整 QFont、回退字体、连字、组合字符、RTL、原生指标和不可变 ink 准备。`EchoGpuSurface.importGlyphAtlas(glyphRun)` 将这些实际 GPU ink 页借用为只读采样资源，不经过组件 layer、截图、像素读回或逐帧上传。

## 准备与接管

生产者与画布须归属同一活动插件、账号和窗口。Canvas 模式使用原生异步字体准备；设置实际需要的 `maximumRasterScale`，提供有稳定 key 的完整 shaping context。不要把一个连字拆成几个独立字符串重新塑形。

```qml
GlyphRun {
    id: text
    haloSampling: "canvas"
    maximumRasterScale: 1
    atlasOnly: true
    runs: [{key: "line", text: "Folia 星😀", size: 40, maxBlur: 0}]
}
EchoGpuSurface {
    id: canvas
    graphics: plugin.graphics
    // 在组件入窗后调用 canvas.importGlyphAtlas(text)。
    // 监听租约 changed，并在 ready 后创建/更新自己的 GPU graph。
}
```

`atlasOnly: true` 保留字体准备、metrics、poses 和错误语义，停止默认文字绘制；仅当 GPU 客户端拥有完整 body/halo/clip 合成时启用。默认 false 保留 PR 的原生绘制；导入与默认绘制复用原生 ink 页。现有原生字体准备及复杂效果路径不用删除。`measurementOnly` 不生成可采样的 ink。

## 同一快照

租约 `ready` 后同时读取 `pages`、`fragments`、`metrics`、`pixelRatio`、`revision` 和 `generation`：

- `pages` 是宿主 EchoGpuResource，只能 sampled/read；不能写、作 render/storage target、再次分享或直接读回。需要导出图片时，先采样到自有目标再读回。
- 每个 fragment 包含 run key、UTF-16 start/length、anchor、首行 baseline 和各 level 的 `{page, uv, rect, color, coverage}`。一个连字保持完整 cluster；彩色/轮廓分片可能共享同一个范围，须全部绘制。
- `uv` 是标准化 `[x,y,width,height]`；`rect` 是 run 局部逻辑坐标，包含边距与栅格取整。用 rect 定位，不能用字素 advance 当 ink 边界。`metrics` 保留原生 shaping 和 primary-face em 指标。
- Canvas 提供 DPR、DPR/2、DPR/4、DPR/8 四个现有 ink 级别；static 提供原有 full-DPR ink。原生 halo 中间目标和曲线几何不作为公开页，继续由原生效果路径拥有。

采样坐标为 `level.uv.xy + uv * level.uv.zw`，无隐式 Y 翻转。普通字形使用 `coverage` 指定的线性覆盖率通道（当前为 R），其它通道可以是内部/不透明数据，不能一律按 alpha 或 sRGB 解码覆盖率。彩色字形为预乘编码 RGBA、coverage 为 alpha。插件工作目标使用线性预乘 RGBA：普通覆盖直接乘线性前景色；彩色 ink 先解预乘、sRGB 解码，再预乘，alpha 不做 gamma 转换。维持已有最终输出链与 SDR 默认，不修改普通窗口合成。

## 生命周期

`changed` 既可报告准备/就绪/错误，也会报告新代际。只在 ready 时使用整组数据；布局变化或设备恢复后，宿主撤下画布旧命令，新的图集与 UV 确认前不绘制。客户端据 `revision/generation` 重建自己的顶点/实例和命令；异步请求发生在代际切换中可能取消或失败，不能无限等待旧命令。

图集池按插件激活和账号隔离，同窗口同账号消费者复用真实原生页。`textureUploads` 统计本租约实际触发的上传；稳定 poses 不重塑形或重新上传。多个画布各自调用 import，不能把某个画布的租约资源当成跨窗口共享令牌。

画布隐藏、移出呈现范围、透明为零、暂停或最小化会释放其 GPU 参与；atlasOnly 的最后一个使用者退出时取消字体准备并清理派生 CPU 数据。恢复时按配置重建。默认原生文字仍可见时，其原生绘制继续拥有自己需要的准备结果。换窗、源销毁、账号切换、授权撤销和停用撤下租约；账号切换清除旧准备文本，迟到 worker 不能发布。`dispose()` 不销毁生产者，生产者仍由原 QML 所有者管理。

本机 Metal 已验证实际着色器采样、static/Canvas 复用、连字/emoji 范围、账号/隐藏/停用及上下文重建。Windows/Linux 和真实驱动设备丢失仍需目标机验收。Fume 接入补丁见 [contrib/folia](../contrib/folia/README.md)；保留原 PR 的整包与视觉验收边界。
