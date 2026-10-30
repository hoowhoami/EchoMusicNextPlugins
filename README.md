# EchoMusicNextPlugins

EchoMusicNext的独立插件仓库：公开类型SDK、开发工具、文档、官方插件和插件索引。插件运行在Qt6.12 / Qt Quick宿主中，采用可信扩展模型。

## 开发与构建

安装Node.js24（只用于开发），独立克隆本仓库即可执行：

```sh
npm ci --ignore-scripts
npm ci --prefix source/folia-reference --ignore-scripts --no-audit --no-fund
npm run check
npm test
npm run build
```

Folia 的源码对照测试使用 `source/folia-reference` 中的独立锁。第二步将 45 个构建和验收依赖安装到该目录，不加入插件运行包；固定源码及完整重建步骤见[对应源码说明](docs/folia/source-rebuild.md)。

正式产物为`dist/<pluginId>-<version>.echomod`，并保留`dist/<pluginId>/`开发目录；包含manifest.json、entry.mjs及声明资源，可直接由宿主加载，不携带Node/node_modules/浏览器页面。TypeScript/async源码转换为Qt支持的ES2016模块。

```sh
/absolute/echomusicnext \
  --plugin-dir /absolute/EchoMusicNextPlugins/dist/spectrum-visualizer-1.0.0.echomod
```

宿主正式设置“插件→管理面板”提供已安装与在线插件、自定义源、安装/更新/卸载、开发目录/.echomod拖入、设置和分享；默认官方源为本仓库。echo-plugins.json 支持同仓插件与独立作者仓库，条目为 id/repo/ref/path/artifact/sha256；安装以 manifest、.echomod 和 SHA-256 为准。频谱继续同仓维护，本地构建集合单独声明在 echo-plugin.build.json。

```sh
npm run prepare:source
npm run check:published
```

prepare:source 只构建/发布本地清单并保留第三方条目；check:published 检查远端作者资源，不重建第三方源码。生成入口只需进入正式包。命令不自动推送或发布，提交产物与索引后远端才会更新。

## 文档和插件

- [开发指南](docs/plugin-development.md)：类型SDK、构建、资源、生命周期与宿主验收。
- [已实现SDK](docs/sdk.md)：真实API、能力和限制。
- [双仓库契约](docs/repository-contract.md)：宿主导出、SDK检查和版本维护。
- [频谱可视化](plugins/spectrum-visualizer/README.md)：真实播放器 PCM、五种模式、播放栏/Mini/歌词页与持久设置。

## 许可证

保留原有[MIT License](LICENSE)。SDK、工具和频谱可视化携带各自许可证副本；依赖保留各自许可证。EchoMusicNext宿主继续为GPL-3.0-only，本仓库不改变宿主许可。

## 正式插件格式与依赖

SDK/tools当前1.0.0，正式包使用`.echomod`。依赖/可选依赖/冲突/加载顺序和typed跨插件服务见[插件指南](docs/plugin-packages.md)。官方频谱可视化直接使用宿主类型化频谱服务，不需要依赖演示插件。完整EchoMusic扩展能力继续按宿主65项对照推进，不将本阶段记为全部完成。

业务、侧栏/卡片/歌曲菜单、快捷键/通知/滚动、任务中心及歌词动效见[扩展接口](docs/ecosystem.md)。

结构化持久数据见 [SQLite](docs/sqlite.md)。

备份与存储提供者见 [备份 API](docs/backups.md)。
