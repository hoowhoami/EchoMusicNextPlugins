# GPU资源与有序提交

声明 `graphics.rhi` / `graphics.resources` / `graphics.submissions` 与 `graphics` capability；计算或回读同时声明 `graphics.compute` / `graphics.readback`。始终检查画布实际capabilities，不从feature声明推断当前设备可用。

`EchoGpuSurface.submit(frame)` 安装可重复执行的渲染/计算图，适合实时可视化；`enqueue({passes})` 提交一次有序命令，适合资源初始化、离散计算和拷贝。资源与CPU数据在提交时保存不可变快照，之后的CPU写入排在它后面。单次图最多32条命令，每画布8项、每插件32项/64MiB快照；超限返回Busy，调用者应等待完成再提交。每个原生帧最多执行一项，持久图随后继续。

支持按顺序混合render、compute、upload-buffer、upload-texture、copy-buffer、copy-texture、generate-mips。GPU缓冲复制要求双方storage usage与四字节对齐，不允许自拷贝；设备须支持compute。纹理拷贝要求同格式、不同资源，明确mip/原点/大小；纹理上传可指定行跨度。上传总量每提交32MiB，单纹理上传16MiB。uniform上传必须在本提交第一次读取它之前，后续读取期间不覆盖同一uniform。

```ts
import { awaitOperation } from 'echo:plugin-sdk';
const texture = ctx.graphics.createTexture({
  width: 32,
  height: 32,
  format: 'rgba8',
  usage: ['sampled', 'readback'],
  mipmaps: true,
});
if (!texture) throw new Error(ctx.graphics.errorMessage);
const submitted = surface.enqueue({
  passes: [
    {
      type: 'upload-texture',
      destination: texture.id,
      origin: [0, 0],
      size: [1, 1],
      data: new Uint8Array([255, 0, 0, 255]).buffer,
    },
    { type: 'generate-mips', texture: texture.id },
  ],
});
if (!submitted) throw new Error('画布未连接GPU服务');
const completed = await awaitOperation(submitted);
// completed.serial/generation/frame/backend：GPU完成后交付，不能当作屏幕已呈现。
const read = surface.readback(texture, { level: 1, x: 0, y: 0, width: 1, height: 1 });
if (read) await awaitOperation(read);
```

逻辑资源在每个画布拥有独立原生实例；GPU派生内容不跨画布自动共享。纹理仍为2D；`mipmaps:true` 分配完整链，sampler支持mipFilter。`writeTexture`写整个基础层，`writeBuffer`更新可恢复的CPU定义；enqueue上传/计算/拷贝产生GPU暂存内容，不自动变成CPU持久副本。设备重建后CPU定义重建，观察generation后重新提交自己的GPU派生内容。

render pass支持物理像素viewport/scissor（左上原点）、load/clear、depth与混合；draw支持firstInstance/baseVertex，uniform binding支持offset/size，偏移遵守实际uniformBufferAlignment。仅改变draw/groups/clear/viewport/scissor时复用管线，内部GPU拷贝管线每个设备代际复用，不随上传重编译。底层没有把设备未支持的baseVertex/baseInstance当作成功。

readback支持buffer字节区间、纹理mip和矩形，16MiB/8项及共享32MiB预算，返回ArrayBuffer；`yUp`说明原生帧缓冲行方向。单次提交与回读均为可取消operation。隐藏/暂停/最小化、撤换graphics、账号变化、停用和设备丢失取消待执行工作；已经进入GPU的命令不能回滚。完成确认来自GPU回读，不是GUI定时器。无GUI线程GPU等待。

HDR仍默认关闭且局限插件画布。浮点纹理、计算能力与真正局部HDR输出分开报告；普通窗口格式/Windows透明和毛玻璃路径不参与GPU提交。

MRT 声明 `graphics.mrt`，mip 视图声明 `graphics.textureViews`，并检查画布的 `multipleRenderTargets`、`independentBlend`、`renderMipmaps` 和 `deviceLimits.colorAttachments`。

```ts
const rendered = surface.enqueue({
  passes: [
    {
      type: 'render',
      pipeline: pipeline.id,
      colorTargets: [
        { texture: first.id, level: 1 },
        { texture: second.id, level: 1 },
      ],
      loadOp: 'clear',
      clear: [0, 0, 0, 0],
      bindings,
      draws,
    },
  ],
});
```

`colorTargets` 与 `target` 互斥，最多8项并受设备实际限制。各附件须是不同的 render-target 纹理，所选 mip 的尺寸一致；不能同时作为本 pass 的 shader 输入或存储图像。fragment 输出 location 必须落在颜色附件范围内。每个附件使用同一 `clear` / `loadOp`，后续 pass 可保留结果。深度纹理由第一颜色纹理、layer 及 mip 拥有，按实际尺寸计入预算，随其释放。

管线 `blend` 默认应用所有附件；可用 `blends: ['none', 'add']` 明确每个附件，长度必须与附件数一致。不同模式需要设备的 independentBlend。storage-image binding 的 `level` 选择具体 mip，其他 binding 不接受该字段。普通 sampled texture 仍按 sampler/mipmap 自动选择，不将它冒充受限 mip 范围的采样视图。内置 `frame` uniform 始终描述画布；附件/mip 尺寸需要自己计算并通过 uniform 提供。

跨画布GPU派生资源共享及真正局部HDR仍需另行实现；设备验收范围另列。

## GPU 参数驱动的绘制

`graphics.indirect` 支持 `usage: ['storage', 'indirect']` 缓冲。计算 pass 写入参数后，同一次 `enqueue` 的 render pass 可直接消费：

```ts
const argumentsBuffer = graphics.createBuffer({
  size: 160,
  usage: ['storage', 'indirect'],
  format: 'uint32',
});
const draw = {
  vertexBuffer: vertices.id,
  indirect: { buffer: argumentsBuffer.id, offset: 16, drawCount: 2, stride: 32 },
};
```

`offset`、`stride` 为字节，须4字节对齐；默认 offset=0、drawCount=1。无 indexBuffer 时每条记录为4个uint32：vertexCount、instanceCount、firstVertex、firstInstance（16字节）；有 indexBuffer 时为 indexCount、instanceCount、firstIndex、int32 vertexOffset、firstInstance（20字节）。默认 stride 等于记录大小；可增加 stride 夹带其它数据。每条记录必须完整落在同scope的indirect缓冲中，每pass直接与间接命令总数最多256。

间接draw与 count/first/instances/baseVertex/firstInstance 互斥。GPU参数的顶点/索引范围和工作量由作者写入有效值，零count或零instanceCount跳过绘制；直接draw的drawVertices限制不代表宿主会读回并裁剪GPU参数。非零base vertex/instance沿用对应设备能力。不能在同一render pass将绘制所读缓冲作为可写storage绑定。

先查 capabilities.indirectDraw；不支持时资源分配/提交明确失败。nativeMultiDrawIndirect表示原生批量能力，原生批量还要求默认stride；自定义stride由Qt逐条执行。无原生批量时宿主仍逐条记录GPU间接绘制，不读回参数。底层ABI与设备条件见[Qt间接绘制](https://doc.qt.io/qt-6/qrhicommandbuffer.html#drawIndirect)。支持compute→indirect、GPU copy→indirect及CPU上传→indirect；隐藏/停用/账号变化撤销未完成operation，恢复后按scope资源快照重建，GPU计算结果需重新提交计算。

## 二维纹理数组

`graphics.textureArrays` 提供 `dimension: '2d-array', layers: 4`，width/height/format/usage/mipmaps与普通2d相同。layers为1..256并服从limits.textureArrayLayers、deviceLimits.textureArrayLayers与统一内存预算；capabilities.textureArrays反映当前设备。默认普通2d不接受layers。

创建数据与writeTexture覆盖所有层的base mip，按layer连续紧密排列；enqueue可用upload-texture.layer独立写入某层，copy-texture.sourceLayer/destinationLayer跨资源复制，generate-mips生成所有层。colorTargets的layer/level选择渲染子资源，readback(texture,{layer,level})读回指定层并在结果中返回layer。省略layer为0。相同数组的不同层仍遵循同pass附件不重复纹理的规则，深度内容及预算分别按layer/mip保存。

sampled绑定使用sampler2DArray，storage-image使用image2DArray并以level选择mip、在shader里选择layer。反射检查shader维度与资源维度，错误提交后可重新提交正确图；不把单层2d当作只有一层的数组。纹理数组是一个完整资源，挂载、账号和停用回收沿同一scope；恢复上传CPU快照，各层GPU修改需重新提交生成。

## 立方体与三维纹理

`graphics.textureDimensions` 增加 `dimension: 'cube'` 和 `dimension: '3d', depth: 8`。cube的width/height必须相同，固定6面，`layer`依次为+X、-X、+Y、-Y、+Z、-Z；3d各轴1..2048，`layer`表示所选mip的z切片。二者不接受layers，cube也不接受depth。

创建数据与writeTexture连续排列全部base面/切片；上传/拷贝/渲染/读回沿用layer/level字段，每次传输一个二维面或切片。cube使用samplerCube，volume使用sampler3D及image3D；sampler支持u/v/w三个寻址轴，默认clamp。便携storage图像维度为2d、2d-array、3d；cube可从计算结果纹理复制到各面，或逐面渲染，类型与宿主均拒绝cube storage usage。

先检查cubeTextures、volumeTextures、volumeMipmaps、renderVolumeSlices；非base mip渲染/读回还须对应已有能力。generation/隐藏/账号/停用规则与其它纹理相同。恢复CPU快照后，GPU生成的面/切片需重提生成命令。

固定Qt的QRhi mip层数为`1 + floor(log2(max(width,height)))`；3d的每层深度为`max(1, depth >> level)`。深度大于宽高时末级仍可能有多个切片，SDK按这条实际链计费、生成和验证索引，不宣称总会缩为1×1×1。最大读回区域与内存/提交预算继续有效。
