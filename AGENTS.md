# EchoMusicNextPlugins开发约定

- 本仓库承接公开作者SDK、开发工具、文档、官方插件和插件索引。Qt/C++实现、运行时和应用状态归EchoMusicNext；不复制业务状态、账号凭证或应用数据库。
- Qt6.12.0、Qt Quick/QML、可信插件模型；能力声明不等于安全沙盒。产物不依赖Node/Electron/DOM，npm/TypeScript/esbuild仅用于开发。
- 保留MIT许可，新依赖/插件保留各自许可证；第三方资产不自动适用根许可。宿主GPL-3.0-only不在此修改。
- 类型声明唯一维护位置为packages/sdk/index.d.ts。host-contract.json只能从真实宿主--export-plugin-sdk导出，经绑定检查后同步；不手造Qt契约或重复复制宿主类。
- 修改API先修改宿主实际Qt类型/生命周期，再同步绑定、快照、文档和原生验收。未公开阶段不因开发增量自动升版本；未实现的65项继续保留宿主迁移表，required能力不足明确拒绝，不用假成功或演示替代。
- 源 schema2 索引为 id/repo/ref/path/artifact/sha256，repo 可省略、空 path 表示仓库根，展示元数据来自 manifest；包由工具构建，不打入src/node_modules或其它安装身份数据。
- 修改后运行npm run format:write、npm run check、npm test、npm run build；协议/构建/生命周期变更还运行真实宿主test:host（指定host/runtime-test），区分静态、本机、三端验收。
- 保留dirty工作树，不自动提交/推送/npm发布，不改旧EchoMusic/EchoMusicPlugins对照仓库。

## .echomod 插件协议（2026-10-18）

- 正式分发单元为.echomod，manifest显式format=echomod；保留开发目录，不将普通ZIP作为正式包。源 schema2 支持独立作者 repo/ref 和根/子目录，安装直接取 .echomod 产物并校验索引哈希与清单。
- SDK1.0.0支持必需/可选依赖、版本、冲突、确定性加载顺序和typed插件服务；消费者后激活/先排空，账号与scope取消保护保留。缺失依赖如实显示未就绪，不静默从另一来源下载或启用。
- .echomod和依赖不是完整65项等价的完成证明；保留原扩展能力清单及原生DSP独立生命周期，完整UI parts/皮肤/主题等未实现项不得删减或伪装。

- 2026-10-18 用户确认项目尚未公开，无需逐次升版本：SDK/tools/官方插件统一初始1.0.0，不再自行升号；宿主应用版本仍0.1.0。产品与作者文档统一称插件，.echomod仅为安装包格式；协作API统一为ctx.plugins/pluginService。

- 2026-10-18 删除无意义音量/依赖示例，官方源仅分发参考旧频谱插件的正式频谱可视化；保留五模式、三位置、实际播放器PCM与持久设置，HDR缺失明确禁用。依赖和服务API及隔离测试继续保留，不为演示分发额外插件。

- 2026-10-18 用户最终要求插件ID只保留功能名称、不加前缀，频谱ID为spectrum-visualizer；源manifest是插件ID唯一声明，工具/测试/包名/索引同步。插件ID保持唯一，由各插件清单声明。SDK npm包名和QML模块URI独立，不因插件ID变化重命名或升版。

- 2026-10-18 频谱设置分隔线按旧源仅在相邻可见行之间绘制，不在分组底部多画横线；设置正文由宿主共享弹窗负责滚动，不在插件内再嵌套整页滚动。

- 2026-10-19 频谱动态绘制使用Qt Quick Shapes CurveRenderer与GPU光晕/模糊/边缘遮罩，禁止恢复Canvas.Image逐帧软件栅格。保留源五模式/路径/配色/参数，普通柱状/波形随帧更新；性能须有Release真实PCM、生产三个挂载和相同刷新率的累计CPU/墙钟前后对照，不能通过降帧或删除效果替代优化。

- 2026-10-19 用户要求消除mod/plugin命名混用：扩展单元统一称插件 / Plugin，仅.echomod作为包格式标识保留；跨插件协作统一ctx.plugins / EchoPluginRegistry / pluginService及PluginService类型，feature使用plugins.dependencies/plugins.services。发布包归artifacts/，编辑源码归plugins/，公开包指南为plugin-packages.md。不保留旧API别名、不做用户数据迁移、不自动升版本；宿主真实契约导出后同步作者SDK，验证依赖、取消、更新回滚及官方频谱包。

- 2026-10-19 公开插件文档只说明作者需要的操作与API；插件ID规则在开发指南单处简述，不重复应用ID、安装UUID、前缀争论或开发决策过程。

- 2026-10-29 用户澄清频谱不迁出；用 echo-plugin.build.json 明确本地构建集合，公开 echo-plugins.json 可同时收录第三方独立仓库。prepare-index 只发布明确的本地插件并保留第三方条目；index-entry 从实际包生成收录条目，check-index 离线校验索引，check-published 联网检查作者资源与包，不重建第三方源码。不保留旧目录/索引兼容，不自行升版本。
