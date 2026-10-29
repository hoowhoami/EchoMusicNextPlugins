# S13 图片池、SVG 与 ZIP 交换

Folia 固定 `a8da4437cf19723555bd75e4685ca20815fe5b82`。源码位置及实施前证据见 [审计快照](asset-exchange-audit.md)。此页记录实际实现边界；首轮完整宿主已统一构建通过；追加安全修复已在真实Host私有overlay与新helper验证，最终统一正式包与配置持久化门闩仍待主线收口，不以私有 helper 成功冒充发布包验收。

## 插件格式与草稿

`qml/shared/asset-archive/tempera-format.mjs` 对应上游 `src/services/temperaImageArchiveFormat.ts:38–121`，以其真实模块作 Node oracle；不是 QtWord、扩展名列表或空白 ZIP 占位实现。ZIP 使用以下真实结构，图片字节由 native opaque handle 读取，不把用户路径交给插件：

```text
meta.json  {kind:"folia-tempera-pool",schemaVersion:1,imageCount:N}
pool.json  {layerImages:[{id,name,align,verticalAlign,scale,opacity},...]}
images/<id>.<png|jpg|webp|gif|svg>  原件
```

兼容旧 `images/<id>`，保留 manifest 顺序、重复 placement、缺失条目 skipped、容量尾部 truncated。ID trim/非法字符、alignment fallback、scale `.05..2`、opacity `0..1` 与源码一致。归档导出将native `asset:` namespace从archive-local ID去掉，避免冒号路径；重复placement共用一个原件entry、保留全部manifest行。导入由 native 重铸 handle，再按请求顺序恢复 placement；ZIP 中历史 depth/frequency 忽略。导出排除列表中原件已不可达项并报告数量，ZIP 容器压缩字节无恒等要求。native 仍以实际图片内容验证，而不信任 source 格式层按扩展名推断的 MIME。

`LayerImageDraft.qml` 持有图片、前后层、出现频率；默认 back/.6，frequency 步长 .05。`LayerImagesPanel.qml` 提供真实管理对话框、普通图片 picker、ZIP 追加/替换确认/导出；busy 同时锁所有写入与关闭。编辑、删除、清空不立即 patch 或删除旧原件；配置 `patch()` 的 true 仅表示排队接受，不能据此删除旧原件；主线正在补真实 `configuration.busy/values/error` 持久化完成门闩，确认新值成功发布后才串行删除不用的原件。写盘失败必须保留原池与草稿，显示错误并允许重试。`Settings.qml` 仅将这两个字段移入草稿并绑定真实 `configuration.patch` 布尔结果。

外层设置卸载：空闲草稿按源码提交一次；正在写时取消 native 操作，未发布文件由 native 回滚。与 React 卸载后可继续 IDB promises 的差异：QML 创建上下文销毁后不继续串行回调；尚未删除的、配置不再引用的受管理文件在下次打开图片面板列举时重试安全清理。因此不承诺外层强制卸载后立即零孤儿文件；安装原有 128 项/64MiB 配额始终包含它们。正常关闭保留组件直到清理结束并显示真实 busy/error。

普通图片批次已接显式 partial 与剩余槽位上限，坏图跳过并报告实际计数，旧默认入口仍整批原子。真实图片/ZIP 拖放使用通用 typed 原生 grant，没有读取任意路径的 invokable；内部 Qt 拖拽不能伪造外部授权。混合列表首个 ZIP 优先且固定追加，ZIP 在提取前按剩余容量裁剪；满池只检查/报告，不提取。协议、生命周期与本轮 CPU 证据见 [原生拖放](tempera-drop-reference.md)。

GIF 保留完整原字节并原样 ZIP 往返，但 Tempera 正常源路径仅一次 createImageBitmap/Texture 快照，此面板和运行时不播放 GIF。SVG 原件保留，展示经过验证的静态 PNG；QtSvg 与浏览器 SVG/font/filter/色彩支持范围有差异，动画 SVG 的任意浏览器首纹理时刻不宣称精确等价。

## 受控宿主 API

公共 feature 为 `assets.staticSvg` 与 `assets.imageArchives`，插件 manifest 显式要求。`assets.importImages(collection)` 增加静态 SVG 子集，公共 SVG 资产仍报告原 `mimeType/bytes`，`url` 指向经过验证的 PNG，另有 `renderMimeType/renderBytes`。导出读取私有 SVG 原件；sample/preview 不再次让 QML 解析原 SVG。

- `assets.openImageArchive(jsonPaths)`：真实 ZIP picker，返回 `EchoPluginAssetArchive`。只读 `active/ready/errorString/entries[{path,bytes,mimeType?}]/jsonFiles`；`changed()` 和 `dispose()`。ready 仅代表安全目录/请求 JSON，尚未发布图片；MIME 是受限头部提示，提取后还要完整解码。
- `lease.importInto(collection,[{path,name?}])`：选择本租约中的最多16条，按请求顺序验证并原子追加；结果 `assets[]` 含 `entryPath`。可请求同路径多次，每次原字节/派生/数量都计预算。成功、失败或取消消费并排空租约；调用参数立即拒绝时客户端仍须 dispose。
- `assets.exportImageArchive(collection,[{handle,path}],jsonFiles,suggestedName)`：真实 saveDialog，只限当前安装/collection 的受管理原件，后台快照/hash/压缩，QSaveFile 成功才替换目标；结果仅 `{exported,bytes}`。无输入/输出用户绝对路径。

API 不知道 Folia kind/pool/placement。FFI `echo_asset_archive` 是固定 helper 的内部有界文件协议，不是插件任意文件 API。原有包 ZIP 提取和 TTML 未改。

## 实际硬限与任务生命周期

| 资源          | 实现上限                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 图片资产      | 每原件8MiB、4096边/16Mi像素；动画256帧/累计64Mi像素；安装128项/64MiB含 SVG 原件和 PNG 派生；一次导入16项。                                                                    |
| SVG           | 8MiB源、深度128、100000元素、500000属性、1000000 path 数字/命令token；embedded raster 仅严格base64 PNG/JPEG/GIF/WebP，实际MIME/全部帧/累计64Mi像素验证；输出4096边/16Mi像素。 |
| ZIP           | 输入/输出72MiB；≤256条，UTF8路径≤2048字节；全目录声明展开≤64MiB+256KiB。仅 inflate 请求JSON/受限头部/选中图，选中图实际原件总≤64MiB；CRC/声明实际大小不符失败。               |
| JSON/协议     | ≤4 JSON，各64KiB，深度64；单独私有 request/result 文件≤2MiB并核 SHA/长度，stdout/stderr仍各64KiB。已实测120263B元数据，不截断进旧stdout。                                     |
| 并发/临时磁盘 | 全应用2 slot、每安装1，picker/ready/工作/清理均占位；每 slot 预留144MiB、全局288MiB，无等待队列。原有每安装2 pending/唯一picker继续生效。                                     |
| 导出分相      | 原件快照≤64MiB+ZIP≤72MiB+有界元数据；创建最终 QSaveFile 副本前删除全部快照/协议文件。第二相 ZIP≤72MiB+QSaveFile≤72MiB。原件提取复用同stage，不复制到第二stage。               |
| 时间/取消     | 后台归档阶段60秒绝对期限，单图helper15秒；分块64KiB检查 cancel，固定helper超时kill/reap；dispose/scope/账号epoch阻止迟到发布。GUI不join，不做解码/压缩循环。                  |

拒 traversal、absolute/drive/UNC/冒号/反斜杠/control、dot/空组件、非UTF8、链接/特殊mode、加密、非Store/Deflate。完整 NFC+Unicode17 C/F casefold 去重在任何提取前进行：Qt6.12自身 `toCaseFolded` 对 ß 不展开，不能用它冒充完整折叠。目录验证采用固定官方1585映射+Qt Unicode17 NFC，覆盖raw文件和目录，含 astral，不拆UTF16。第三方库前先检查EOCD/ZIP64与所有raw records，拒条数/长度不一致、分卷/trailing data/超过64KiB ZIP64扩展及central中的额外结束标记；metadata构造期屏蔽payload旧结束标记，之后恢复原件字节/CRC。

SVG 使用 streaming XML canonicalization 后再 QtSvg，拒DTD/实体/PI、script/foreignObject、事件/xml:base、外部namespace执行节点、外链及CSS转义/at规则；style内child节点明确拒绝，CDATA/text拼接后校验；class/inline paint/独立gradient/clip/单mask、受控嵌入PNG有真实正例。filter/fe*、pattern/use/symbol、非image href继承、marker及容器非1 opacity明确拒绝；CSS非1 opacity/mask/clip/marker声明拒绝。mask仅1定义+资源外paint leaf的1处属性引用；资源不递归clip，leaf不含渲染children。ID必须唯一，所有URL都按fill/stroke→gradient、clip→clipPath、mask→mask验证目标类型；未知URL property拒绝。仅本地fragment URL；SMIL节点剥离，renderer禁动画。父进程和worker在Qt启动前都强制QT_IMAGEIO_MAXALLOC=128，避免环境0禁用检查；Qt allocator单surface限制和隔离helper期限不是全进程RSS硬限，复杂合法SVG仍可能被期限拒绝。

cleanup 真实后台结束后才释放144MiB预留并记drain。若删除stage失败，目录与全局slot仍保留收费，最多两项，后续请求Busy；不假称磁盘已经释放。安装旧池+新池必须同时满足64MiB，未先删旧件腾空间；不支持两份各64MiB的跨配置原子替换事务。

## 已有证据与未完成验证

- 真实旧runner：`openImageArchive` undefined RED；旧worker SVG明确拒绝 RED。
- 独立Qt6.12 SVG33/33；style子节点绕过先RED再拒绝GREEN。真实worker UTF8、UTF16、5000前导空格SVG均输出同16×8 PNG。
- Rust asset_archive 7/7、doc0；实际helper inspect/extract/export 原件逐字节一致、UTF8 astral路径、安全路径拒绝；目录元数据120263B、stdout小响应+SHA通过。
- Unicode17全1585官方full mappings、NFC/ß/astral实际QtCore全过；追加新helper真实Host归档10/10，含文件及目录NFC/ß/ligature/astral提取前拒绝。
- Node真实source格式/draft oracle5/5；普通官方qmltestrunner草稿8/8（拒绝租约泄漏先RED→GREEN）。真实QML SVG+两帧GIF→导出draft→删净旧件→ZIP restore链4/4；宿主publication通知原651断言先RED，cleanup continuation后资产全16/16 GREEN。env0启动worker实际allocationLimit=128。最终正式移动bundle、GUI心跳与真实异步配置写盘失败回归由主线继续，未以旧同步bool fixture宣称落盘事务完成。

## 依赖与许可

插件格式与编辑逻辑派生自 Folia AGPL-3.0-only，沿插件原许可证发布并保留源码对照。测试调用参考现有 esbuild/fflate，只作 oracle；未复制 fflate runtime。宿主复用已锁 zip8.6.0（MIT）、serde_json1.0.151 和本机/项目既有 QtSvg6.12.0；没有新增应用依赖版本。

新增 Unicode 数据/生成器位于 host `modules/EchoMusic/PluginSdk/asset-archive/`：官方 `CaseFolding-17.0.0.txt`（1585 C/F映射，T/S不用于默认full folding）、生成 `CaseFold.h`、`generate-casefold.py` 与 `UNICODE-LICENSE.txt`（Unicode License V3）。Python仅离线生成，不是运行/构建依赖。Qt/zip既有许可由host notices保留。主线已证明 macdeployqt 会将 Rust load command/ID 重定位为 bundle内loader/executable相对路径；追加安全修复后仍须最终helper移动bundle复验。开发树 helper 可运行不代表移动发布包已通过。
