# Tempera 图片批次与原生拖放

固定参考 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`：`TemperaImageLayerControls.tsx:180–245` 的单写入门、支持类型筛选、剩余槽位、逐项失败计数；`TemperaImageLayerDialog.tsx:158–171` 的拖放路由。混合列表含 ZIP 时优先第一个 ZIP，并固定追加；无 ZIP 才添加图片。关闭草稿后的配置原子提交保持原有落盘确认门，不因导入成功提前删除旧图片。

## 公开接口与输入授权

旧 `assets.importImages(collection)` 保留原 C++ 符号、Qt 方法与整批原子语义。新增可选 `{partial:true,maxCount:1..16}` 返回 `{assets,rejected}`。每条拒绝记录只含最长128 UTF-16 的 basename、固定 code/message，没有原输入路径。普通 picker 最多128个输入；实际支持的候选槽位最多16，损坏候选占用原槽位，不将已超限的尾项前移。已知后缀或工作线程的 QtCore MIME 头识别用于筛选；真实图片解析/解码仍由隔离 helper 完成，有效 PNG 不因 `.data` 后缀被误拒。

`EchoPluginImageDropArea` 是真实 QQuickItem，仅其受保护的原生拖放事件可授予文件输入。它绑定 typed `assets`、`collection`、`maxCount`，没有接受路径、URL 数组、MIME 或任意 QObject 的 invokable。`event.source()!=nullptr` 或实际 MIME `inherits("QQuickDragMimeData")` 都拒绝；不能把内部拖拽的 source=null 当外部授权。

组件默认 `archiveJsonPaths=[]`，只处理图片；Tempera 显式绑定 `["meta.json","pool.json"]`，收到 ZIP 时发出 typed `archiveDropped(EchoPluginAssetArchive*)`。其私有入口复用已有 InspectArchive、原件快照、路径/Unicode/CRC 校验与租约，不新增 ZIP 解析器，也不把路径交给 QML。`collection/maxCount` 控制普通图片批次；归档由调用者按现有 lease/importPlan 选择项目，再调用 `importInto`。

原生 drop 的 maxCount 可为0：不复制、解码外部图片，只返回跳过计数；公开 picker 的 maxCount 仍严格1..16。满池的拖放区保持可用，ZIP 可检查并报告未导入数量；Tempera 在 native 提取前按剩余容量裁剪，满池不会提取或增加资产。ZIP 拖放固定追加，替换仍走明确的 picker/确认流程。

## 生命周期与预算

每个 drop 控件最多持有一个操作或一个归档租约。隐藏、窗口离开、assets/collection 改变或销毁取消 owned 操作并释放租约；busy 的 Qt 通知也在退役时发出，重新显示不会保留过期的 busy 绑定。析构阻断普通状态信号，保留 QObject 的 destroyed 语义。取消、账号 epoch、旧 scope、存储读写/提交失败走整批回滚；显式 partial 才逐项跳过损坏、格式或容量拒绝。全部拒绝时界面显示错误计数，混合成功显示实际加入/未加入数。

沿用单图8 MiB、安装资产64 MiB/128项；每安装同时最多两个 asset 请求、每批顺序解码，不超过16个解码在途。拒绝列表最多128项。ZIP 沿原72 MiB输入、144 MiB staging reservation、全进程最多两个 reservation，以及既有 JSON/提取预算。64 MiB 是安装资产预算，不是整个进程、所有 staging 或驱动的峰值保证。文件读取、快照、MIME、解码与清理在工作线程/helper；GUI 只沿已有有界 rename/index 原子发布路径完成结果。

## 本轮验证范围

- 真实 picker 同选有效 PNG 与损坏图片：旧实现显式 partial 实际 RED，默认原子行保持通过；新实现保留有效图并返回拒绝记录。有效 `.data` PNG 也先 RED 再修正；默认入口、严格 options、槽位、原子存储失败、取消/账号 epoch 均保留断言。
- 原生测试使用实际 Qt 创建的 source=null 内部 QQuickDragMimeData，并在测试过滤器为同一真实 MIME 加入 URI，避免无 URL 掩盖错误的类判断；图片与 ZIP 两类均不能授予输入。标准外部 QDropEvent 证明图片导入、ZIP 优先/typed lease、隐藏和账号取消、reservation 归零。
- Qt 软件后端验证 actual `LayerImagesPanel` 的真实 scoped assets、原生类型、归档配置和满池状态；草稿用例覆盖追加、重叠/迟到拒绝、满池不提取，以及真实持久确认门。此次只计 CPU/Software 与原生事件证据，不计物理桌面拖放、GPU 图像、跨平台或最终安装包验收。

本轮宿主资产测试32/32、既有归档测试10/10、草稿 QML 15/15、真实 Panel 绑定3/3，以及 Tempera/资产交换 Node 11/11 均通过；TypeScript、clang-format、Prettier 与改动空白检查通过。宿主资产完整组用时29.65秒，保留原45秒外限。两处共享 FFI dylib 均保持 `7724b319ced23882664a02e8f7963bf01f0019067765e57ea5593c951a56c4e3`，未修改 Rust/FFI。

原始 RED/GREEN、命令、原生输出、FFI 摘要与最终文件清单保留在宿主 `build/folia-update-20261028-r2/tempera-batches-drop/`。正式主应用、实际 SDK 导出和插件包仍由统一构建接续，不能用旧 F 包的验收替代新接口。

没有新增依赖；QtCore/Quick/Widgets 与隔离资产 helper 均沿用现有宿主能力。插件侧 Folia 派生控制逻辑保留原 AGPL-3.0-only 许可，未修改上游原件、模型或运行时数学。
