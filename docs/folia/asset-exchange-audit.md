# S13：SVG 与图片集合 ZIP 交换审计（实现前）

状态：此文保留实施前审计快照；后续已获授权实施，当前接口、验证结果与差异见 [asset-exchange-reference.md](asset-exchange-reference.md)。以下“当前/建议/待实施”均指审计时点，并非最终状态。Folia 固定 `a8da4437cf19723555bd75e4685ca20815fe5b82`；宿主为隔离工作树 `folia-skin-api/EchoMusicNext`。本轮未运行构建、Chrome、Cocoa 或原生验证，避免主线性能窗口；下文测试均为待实施的 RED 清单。

## 上游真实格式与编辑语义

| 源文件与行号                                                            | 真实行为                                                                                                                                                                   |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/visualizer/tempera/TemperaSettingsPanel.tsx:80–87`      | 图片池、前后层与出现频率一起交给专用控件，非普通文件夹。                                                                                                                   |
| `TemperaImageLayerControls.tsx:74–81,94–145,180–250`                    | 编辑持有 draft，关闭一次提交；添加/导入共用 busy；外层卸载先 abort，新增 blob 回滚。正在写时不提交旧 draft。                                                               |
| `TemperaImageLayerControls.tsx:276–318,323–342,375–390`                 | 导出当前 draft；追加/替换由用户选择，替换非空池先确认；旧文件只记录待删，draft 正式提交时删除。深度/频率不从 ZIP 恢复。                                                    |
| `TemperaImageLayerDialog.tsx:151–169,339–359`                           | 图片 picker 接受 PNG/JPEG/WebP/GIF/SVG，多选；ZIP picker 单选；拖入 ZIP 默认追加。                                                                                         |
| `src/types.ts:645–662`                                                  | 最多16张；placement 为 `{id,name,align,verticalAlign,scale,opacity}`；默认 `free/bottom/.7/1`。                                                                            |
| `src/services/visualizerImageAsset.ts:12,34–45`                         | 按 image MIME 或扩展名初筛，原 Blob 原样保存；ID 为时间戳和文件名。初筛不是安全解码验证。                                                                                  |
| `src/services/temperaLayerImages.ts:51–81,84–117`                       | 仅预览副本最长边256、WebP质量.82；小图不重编码，预览失败仍保存原图。渲染和备份均用原 Blob。                                                                                |
| `src/components/visualizer/tempera/temperaImageTextures.ts:13–29,48–74` | 正常路径只调用一次 `createImageBitmap(blob)`，一次 `Texture.from(source)`；SVG等失败时回落 `Image`，创建 runtime 统一纹理池，销毁时释放。不启动 GIF 播放器或逐帧纹理更新。 |

GIF 的正常路径是 ImageBitmap 静态快照；原始 GIF 字节仍保存、导出。不能因此把 Cappella/Monet 的 HTML 图片动画语义套给 Tempera。SVG fallback 的 HTML 图片加载时刻和浏览器支持范围另有差异，不能把任意动画 SVG 宣称为精确 t=0 静帧。

`src/services/temperaImageArchive.ts:110–137` 的 ZIP 根结构：

```text
meta.json       {kind:"folia-tempera-pool",schemaVersion:1,imageCount:N}
pool.json       {layerImages:[placement,...]}
images/<id>.<ext>  原件字节，非缩略图或渲染快照
```

导出依 placement 原数组顺序；丢失 Blob 的项从清单排除，返回 `exported/skipped`。压缩为 fflate 异步入口、level6；ZIP 容器字节并无恒等要求。`temperaImageArchive.ts:145–221` 先探中央目录声明总大小，超过512MiB拒绝，再异步全量解压；检查 kind/version，逐张重建并保存，失败/取消清理本次已写 ID；超过池剩余容量计 `truncated`。当前异步 zip/unzip 返回的 terminator 没有被调用（91–100），AbortSignal 只阻止后续发布/写入并回滚，不代表浏览器压缩 worker 立即停止。

`src/services/temperaImageArchiveFormat.ts:38–44,58–76,102–121` 必须保留的兼容项：

- 扩展名按 MIME 明确写入；导入兼容旧 `images/<id>` 无后缀条目。
- ID trim、非空、≤512字符，不含斜杠/反斜杠/控制字符；非法 alignment 回默认；scale钳 `.05..2`，opacity钳 `0..1`，非有限数回默认。
- 找不到文件、非法 placement 或不支持类型计 skipped。导入重铸 ID，原池 ID 碰撞不覆盖；名称与 placement 保留。
- 历史备份中的 depth/frequency 被忽略（archive.ts:164–166）。
- 源 MIME 检测先信扩展名再看魔数（format.ts:79–92）；宿主必须继续以实际解码/内容确认类型，不能复制这个信任边界。

当前插件 `qml/shared/LayerImagesPanel.qml:37–60,69–74` 在每次修改时直接 patch，导入立即追加，删除立即删除，尚无独立 draft/ZIP。`Settings.qml:507–514` 直接承接这些 patch；这与上游“关闭一次提交”的差异真实存在。S13 插件侧需单独移植 draft/忙锁/追加替换/结果计数，不能只加三个按钮就宣称完成。

## 宿主已有能力与不可直接复用部分

宿主路径均相对 `/Users/huanggenji/.codex/worktrees/folia-skin-api/EchoMusicNext`。

| 路径与行号                                                                                | 可复用能力 / 边界                                                                                                                                               |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/EchoMusic/PluginSdk/EchoPluginAssets.h:20–42`                                    | scope所属 typed API，安装持久 store，opaque handle；已有 import/list/remove/clear/sample/animation，无 ZIP 导入导出。                                           |
| `EchoPluginAssets.cpp:198–266,580–620`                                                    | 真实非阻塞 QFileDialog，只接受当次用户选择的本地文件；后台64KiB快照复制；固定 helper，15秒期限、取消后 kill/reap，stdout/stderr各64KiB。                        |
| `EchoPluginAssets.cpp:138–195,398–445,501–547`                                            | 图片原件≤8MiB，安装≤128资产/64MiB，单次≤16；两个pending（picker也算），唯一picker；QtConcurrent准备和原子发布前重检。                                           |
| `EchoPluginAssets.cpp:740–955,1180–1199,1214–1232`                                        | account epoch/scope拒迟到；同盘rename、小型QSaveFile索引事务；失败撤销新文件，后台staging清理计drain，scope不join。已有 `changed()` 跨active facade通知。       |
| `modules/EchoMusic/PluginSdk/AssetImageWorker.cpp:62–85,96–143,182–186`                   | 内容检测仅PNG/JPEG/GIF/WebP；4096边/16Mi像素；完整动画≤256帧、累计64Mi像素；sample只取第一帧；Qt128MiB分配限制只设helper，非总RSS上限。SVG现在明确拒绝。        |
| `EchoPluginAssets.cpp:448–454`                                                            | 公共描述返回受管理url，未提供任意路径读取。新API也只返回handle/受管理预览，不返回原用户路径、选中ZIP路径或导出目标路径。                                        |
| `services/plugins/PluginPackage.cpp:20–28`、`crates/echo-ffi/src/plugin_archive.rs:12–77` | 已锁Rust zip，空私有stage、128MiB输入/解压、8192条目、拒traversal/Windows分隔符/冒号/NUL/链接特殊文件/case重复，限流核对实际size。                              |
| `include/echo_ffi.h:330–339`                                                              | 当前解包FFI同步、worker-only、没有取消参数/导出入口；不能把此函数本身称为完整可取消资产交换API。应复用同crate和验证规则，新增独立资产协议，保持包解压行为不动。 |
| `modules/EchoMusic/Settings/SettingsBackupArchive.cpp:21–34,373–418`                      | 自有ECHONEXTBACKUP格式，非ZIP。可参考QSaveFile/分块取消/校验习惯，不能拿其输出冒充上游ZIP。                                                                     |

## SVG 的必要安全边界

Qt模块已经存在：根 `CMakeLists.txt:32–45` 固定Qt6.12.0并要求Svg；asset-worker当前只链接Gui（PluginSdk/CMakeLists.txt:98–104），实施需给该worker显式链接现有 `Qt6::Svg`，由主线改CMake。不是新增Qt版本或第三方应用依赖。

不能仅靠 `QSvgRenderer::load(QByteArray)`、不设置 `AssumeTrustedSource` 或关闭动画保证无文件读取。官方[QtSvg v6.12.0 qsvghandler.cpp](https://github.com/qt/qtsvg/blob/v6.12.0/src/svg/qsvghandler.cpp) 已只读核对：1961–1982的image节点允许data或QImage(filename)，绝对文件可被读取；4238–4265的xml-stylesheet PI可QFile读外部CSS。该结论来自源码，尚未执行独立恶意引用probe。

推荐导入管线为：私有快照→同隔离helper的XML预验证→QtSvg静态渲染→受控PNG派生。原始SVG只保留在私有store供再次导出；QML Image/animation/sample不再解析用户SVG，公共url指向经过验证的PNG。描述保留源 `mimeType/image/svg+xml`、原件字节数，并明确另有render MIME/派生字节；安装64MiB与staging预算必须同时计原件和派生。老v1索引兼容读取，SVG新增索引字段须校验双文件hash/长度，不能让sidecar绕过quota或留下孤儿文件。

XML验证采用流式token与明确静态白名单，不能依赖原始字符串regex删标签：

- 拒DTD、实体声明、非XML声明PI（尤其xml-stylesheet）、script/foreignObject/事件处理属性、外部namespace行为、外链href/xlink:href/xml:base。
- href只允许本文件 `#id`；CSS仅允许本地fragment的url，拒@import/@font-face、外部或相对URL、CSS转义绕过。须用有限语法校验，未知引用语法明确拒绝，不“忽略后继续”。普通class stylesheet/inline style、gradients/masks/clips需有真实正向用例，不能无证全部删掉。
- 如允许嵌入raster data URL，只准严格base64的PNG/JPEG/GIF/WebP，解码后走同一有界raster验证；拒嵌套SVG/HTML/font/data递归。建议首版支持此受控支路，避免大量含嵌入位图的常见SVG完全失效；若阶段性不做，必须公开不支持而非漏验。
- 原件≤8MiB、XML深度≤128、元素≤100000、属性≤500000、path数字/命令token≤1000000、嵌入图累计解码≤64Mi像素；所有计数先验再交QtSvg。无效/非有限/过大固有尺寸拒绝；输出≤4096边/16Mi像素，不静默缩小超尺寸输入。
- 设置 `QtSvg::DisableAnimations`、`setAnimationEnabled(false)`，不要开启AssumeTrustedSource；用bytes输入，无文件base URL。输出编码必须有界QIODevice、先检查已写字节再写磁盘。复杂SVG的CPU/RSS仍由隔离进程和期限兜底，不能把Qt单次分配限制说成总RSS硬限。

QtSvg支持范围与浏览器SVG/CSS字体、filters、色彩和单位解析可能不同。应发布“Qt6.12静态SVG子集”，用Chrome/Qt真实对照记录；不得宣称任意SVG逐像素一致，也不为补支持而引入WebEngine。动画SVG只保留原件，展示禁动画静帧，这与HTML fallback首次纹理上传时间未必恒等。

## 推荐的最小通用API（待主线批准）

1. `assets.importImages(collection)` 保持现签名，额外接受上述受控SVG。现有raster原件/GIF动画保留规则不变。
2. `assets.openImageArchive(jsonPaths)` 返回scope所有的 `EchoPluginAssetArchive` 租约，内部打开真实ZIP picker。只读 `active/ready/errorString/entries[{path,bytes}]/jsonFiles`，加 `changed()/dispose()`。jsonPaths是至多4个安全相对JSON名称；host不内置meta/pool/images字样。ready只指安全中央目录和所请求JSON已检查，尚未发布任何资产。
3. `archive.importInto(collection, entries[{path,name?}])` 返回 `EchoPluginOperation`。只接受本lease中真实条目，最多16张、按请求顺序完整解码、原子追加；结果 `{assets:[{...descriptor,entryPath}]}` 与请求一一对应。需要时同path可复制为独立handle，次数和字节均计预算，以保留重复placement重铸ID能力。成功后消费lease；失败/取消不发布部分结果。name仅显示文本并按现有128字符限制，不参与文件系统路径。
4. `assets.exportImageArchive(collection, entries[{handle,path}], jsonFiles, suggestedName)` 返回Operation。仅限本安装本collection图片；真实saveDialog；后台验证hash并快照原件，使用受限相对entry名和有界JSON值构造ZIP；成功只返回 `{exported,bytes}`，不返回文件系统路径。按用户明确选择保存，可QSaveFile原子替换，失败/取消保留原目标。空包/丢失或篡改handle明确失败；插件可在调用前统计丢失项并保留上游skipped反馈。

租约是必要的两阶段边界：插件先验证实际meta.kind/version、运行原placement normalization/旧bare-id匹配、统计skipped/truncated/按剩余空间选条目，然后才调用importInto。无须传递整个ZIP给WorkerScript，无须宿主知道Folia schema。插件负责原格式序列化和重铸ID映射，host不处理Tempera频率/深度。

替换模式仍先导入新集合资产，plugin draft正式提交时才删除旧handle。新旧一起超过既有64MiB时拒绝并保留旧池；不得偷偷先删旧文件腾空间。要实现“满额64MiB旧池仍能原子换为另一64MiB池”需要额外的资产/config跨域事务，不属于最小S13；当前方案如实保留这项容量差异。导入完成而配置验证失败时应清理本次新handle，旧配置/旧文件保持；设置卸载取消、等待drain、迟到结果不patch新scope。

## 拟固定配额与取消语义

| 资源          | 建议硬限                                                                                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 安装资产      | 沿用128项、16字体、64MiB（含SVG原件+PNG派生）、图片原件8MiB、单次导入16项；不从上游512MiB扩大。                                                                                                                                                                            |
| ZIP输入/输出  | 各72MiB（给64MiB原件+元数据/容器开销留界），所有实际读写流逐块计数，声明与实际不符失败。                                                                                                                                                                                   |
| ZIP目录       | ≤256条目，路径UTF-8≤2048字节；拒绝非UTF8、NUL/控制字符、绝对/drive/UNC/冒号/反斜杠、空/dot/dotdot组件、链接/特殊文件、加密、非Store/Deflate；原名与NFC+casefold冲突均拒。目录可验证后忽略，不依用户entry名创建路径，提取为私有生成名。                                     |
| 展开          | 所有中央目录声明总额≤64MiB+256KiB；所有实际流计数再验。仅读取请求JSON和选中图，不inflate整包；不给未选条目潜在膨胀机会。没有任意压缩比阈值，依硬总量/单项/时间限额拒bomb。                                                                                                 |
| JSON          | ≤4文件，每个64KiB，总256KiB，深度≤64；导出JSON与entry总名空间冲突拒绝。                                                                                                                                                                                                    |
| 并发/临时磁盘 | 全应用最多2个archive slot、每安装最多1个（picker/ready lease/后台清理都占slot），无队列，超限Busy；每slot先保守预留144MiB=72MiB ZIP+72MiB staging，总288MiB。同时仍占安装现2 pending中的一个，导入在同slot续跑。此为新增archive磁盘边界，非全host RSS或原有动画cache总量。 |
| 期限/撤销     | picker由用户决定时长；后台archive阶段60秒绝对deadline，单图decoder沿用15秒。atomic cancel每64KiB检查；隔离helper超时/取消可kill/reap。dispose/active=false/账号epoch变化取消全部，清理完成才释放slot/字节预留并记drain；不在GUI join。                                     |

导出snapshot取得后内容不可变，源文件/handle途中被修改必须hash失败；不能读取后来替换的文件。检查、流式解压/压缩和SVG解析都在受控helper或后台执行，GUI只picker/轻量参数和原子发布。Rust新资产archive分支应复用已锁zip crate，放在现有可终止helper进程边界；避免新增不可终止GUI/后台线程解压路径。若helper显式链接现有echo_ffi，部署需验证该动态库运行时路径，不能依开发目录fallback。

## 先RED的必要验证

- 公共picker SVG正常rect/path/gradient/clip/mask/class/inlineCSS、带嵌入PNG；现实现先RED“不支持SVG”。核对原件SHA保持，公共url只为PNG、sample/静态显示均一致，重启索引/删除清理两个文件。
- DTD/实体炸弹、xml-stylesheet读临时CSS、absolute/relative/file/http href、CSS大小写/实体/转义url、nested data-SVG、script/foreignObject/onload、超深/超token/非有限/巨大尺寸，均不得读取外部哨兵或发网络、不发布文件。
- 原代码独立format oracle：4种align/verticalAlign、NaN/越界、缺失文件、bare-id与显式5类扩展、重复placement、已有ID碰撞；保存完整原有顺序与skipped/truncated，不恢复depth/frequency。
- 真实Folia格式ZIP→本插件→ZIP→原Folia collect/import oracle；raster/GIF/SVG原件SHA逐字节相同，GIF显示是静态但导出仍包含全部原帧；ZIP容器压缩字节不要求相等。
- ZIP traversal/drive/UNC/NUL/Unicode/case冲突、symlink/特殊mode、加密、未知compression、伪尺寸/CRC/截断、256+条目、72MiB与64MiB展开/JSON预算、超限SVG派生、跨安装handle全部失败且旧池不变。
- 真saveDialog取消/覆盖、未授权路径不可传入；保存途中取消/源hash变更/磁盘写失败不损坏旧目标。受限output设备在超过72MiB前失败，不能先写无限文件再检查。
- inspect/import/export每个阶段scope退休/epoch变更/窗口卸载；2全局slot/1安装slot/现pending与picker竞争、cancel后立即新请求；等待真实cleanup/drain后文件/预留归零，无迟到config patch。
- 同一runner GUI heartbeat：大SVG/高压ZIP处理后台，不将异步promise包装GUI循环。结束后才申请主线允许的Cocoa/Chrome对照窗口，不抢正式性能采样。

建议实施范围是新SVG验证文件、新archive lease/worker分支、EchoPluginAssets小型接线、独立Rust asset_archive模块及内部FFI声明、专项测试/文档；CMake/SDK导出/features/插件包契约由主线统筹。**不碰TTML文件、EchoPluginPlayer.cpp、既有包解压语义和正式Ninja目录。** 插件LayerImagesPanel的draft与备份适配需另获明确文件授权。

## 实际依赖与许可

- Qt6.12.0 Core/Gui/Widgets/Concurrent/Network与现有QtSvg；`qsvgrenderer.h/qtsvgglobal.h`已经在固定本机SDK，root CMake也已要求Svg。QtSvg公开flags可在load前设置，官方[QSvgRenderer说明](https://doc.qt.io/qt-6/qsvgrenderer.html)支持QImage绘制和关闭动画；没有承诺通用安全清洗。项目现有Qt许可选择/部署材料见host `docs/third-party-notices.md:9`。
- `zip 8.6.0` 已在 `crates/echo-ffi/Cargo.toml:25`，`default-features=false, features=["deflate"]`；`Cargo.lock:6711–6722` 锁checksum `2d04a6b5381502aa6087c94c669499eb1602eb9c5e8198e534de571f7154809b`。MIT原文已在host `docs/licenses/zip-8-MIT.txt`；不新增或升级zip版本。
- 上游 `fflate 0.8.3` MIT只作兼容oracle，现有安装位于reference node_modules；生产ZIP使用同锁Rust库，不把fflate worker全量打进QML。若复制其代码而非只调用测试，必须随相应产物附原许可；目前建议无需复制其运行时。
- Folia格式校验/编辑行为移植属于原AGPL-3.0-only派生，留在插件；host新增API仅通用图片/归档能力，不内嵌Folia字段。QtSvg内部实现仅审计、不复制源码。

待批准项：上述公开lease方法名/配额、SVG受控嵌入raster支持、插件LayerImagesPanel独立draft范围，以及host新文件/CMake统筹时点。没有以本审计宣称任何新增能力已完成或通过测试。

## 实施后补充（原审计快照之外）

主线已公开独立通用feature `assets.staticSvg` 与 `assets.imageArchives`，插件manifest显式要求；精确API和配额见[实施说明](asset-exchange-reference.md)及host `docs/plugin-assets.md`。安全复核后首版SVG子集进一步收窄：独立gradient/clip/单mask/class/inline paint保留；filter/fe*、pattern/use/symbol、href继承、marker和递归离屏链明确拒绝。ZIP在第三方库分配前有界扫描原始central records，避免count预分配与同名IndexMap覆盖，并阻止向payload旧EOCD回退。完整NFC/casefold覆盖目录及文件。此补充取代上文旧建议中的filter/pattern支持和“仅在库index后检查目录”的路径。
