# Folia 字形图集接入

`glyph-atlas.patch` 对应作者 PR #1 的 `f54a0148569ac4e566b6d0675062f097f5089607`。在该 PR 分支的仓库根目录运行 `git apply /path/to/glyph-atlas.patch`，宿主使用包含 `graphics.glyphAtlases` 的新版代码。

补丁给现有 FumeBatch 增加 `importAtlas(surface)`，直接借用同一个 `nativeGlyph` 的准备结果；声明 graphics 能力和图集 feature。默认 `atlasOnly: false` 保留原生 Canvas 字体、字形指标、实例顺序、clip 与 halo。只有 GPU 客户端实际拥有完整绘制时才设为 true，不能接管一部分后把其它效果删掉。

`importAtlas` 返回的租约就绪后可将 `pages[level.page].id` 用于普通 GPU texture binding；UV、局部位置、字形范围和代际来自同一租约。客户端负责按原 Fume 绘制顺序构造实例；变更 `revision/generation` 后重建命令，停用后释放租约。详细约定见 [图集 API](../../docs/gpu-glyph-atlases.md)。

该补丁修改的 Folia 组件来自 AGPL-3.0-only 插件，保留相邻 LICENSE，不套用本仓库根 MIT。原 PR 的其它源文件和第三方说明保持不变。本目录不是官方源中的新插件条目，也不表示整个 Folia PR 或十四样式已合并验收。
