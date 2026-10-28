# EchoMusicNextPlugins

EchoMusicNext的独立插件仓库：公开类型SDK、开发工具、文档、官方插件和插件索引。插件运行在Qt6.12 / Qt Quick宿主中，采用可信扩展模型。

## 开发与构建

安装Node.js24（只用于开发），独立克隆本仓库即可执行：

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
```

正式产物为`dist/<pluginId>-<version>.echomod`，并保留`dist/<pluginId>/`开发目录；包含manifest.json、entry.mjs及声明资源，可直接由宿主加载，不携带Node/node_modules/浏览器页面。TypeScript/async源码转换为Qt支持的ES2016模块。

```sh
/absolute/echomusicnext \
  --plugin-dir /absolute/EchoMusicNextPlugins/dist/spectrum-visualizer-1.0.0.echomod
```

宿主正式设置“插件→管理面板”提供已安装与在线插件、自定义源、安装/更新/卸载、开发目录/.echomod拖入、设置和分享；默认官方源为本仓库。echo-plugins.json及dist索引使用schema2，记录manifest目录、.echomod产物路径和SHA-256；元数据始终来自manifest。官方仓库的源目录必须含已构建的ES2016入口：

```sh
npm run prepare:source
npm run check:published
```

prepare:source同时构建dist、artifacts/*.echomod和源目录发布入口；生成入口由工具维护、随源码提交，不能手改。宿主从GitHub HEAD读索引/manifest，下载索引指定的.echomod、验证SHA-256并再次核对清单。当前仅在本地生成，未自动推送远端。将产物提交发布后，管理页刷新才会取得真实目录。

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
