# 双仓库契约

| 责任                                               | 唯一维护位置                                          |
| -------------------------------------------------- | ----------------------------------------------------- |
| Qt/C++对象、qmltypes、操作适配器、运行时和业务状态 | EchoMusicNext原生模块和应用服务                       |
| 作者TypeScript绑定/环境类型                        | packages/sdk/index.d.ts、globals.d.ts                 |
| 实际Qt导出                                         | 宿主--export-plugin-sdk：静态元对象及包版本/能力      |
| 契约快照/manifest schema                           | packages/sdk/host-contract.json、manifest.schema.json |
| 工具、作者文档、官方插件和索引                     | packages/tools、docs、plugins、echo-plugins.json      |

两个仓库都能独立构建；原生契约刷新、QML编辑器工具及实际运行验收需要已构建宿主。运行时不依赖同级源码，宿主安装包为独立内容摘要副本。

## 修改API

1. 修改宿主实际Qt类型/线程/所有权/会话/停用行为及测试、迁移表。
2. 构建宿主并sdk:check。比较实际元对象的属性类型/readonly、方法参数/返回类型、信号参数、操作枚举值；还拒绝声明不存在的native成员，不靠正则读取C++头。
3. 更新作者绑定和兼容版本；sdk:sync先验证绑定，再有意更新实际快照，不自动放宽错误。
4. 同批修改插件、文档、类型负例和原生验收。快照不含路径/凭证/用户数据。

快照是开发目标，运行时以真实宿主为准。manifest不是沙盒，升级Qt仍需实际组件/设备验证。

## 发布边界

SDK/tools已有workspace及本地打包/安装能力，未发布npm。构建不发布GitHub Release/插件市场。schema2 索引支持作者 repo/ref、根或子目录、正式 .echomod 路径或 HTTPS 下载地址及 SHA-256。echo-plugin.build.json 只列本地构建源码，prepare:source 仅更新这些本地插件并保留跨仓库条目；check:published 联网检查实际远端清单/包/哈希，CI 同样检查。源码entry必须与发布entry不同，工具拒绝覆盖作者入口。宿主已接通正式.echomod/开发目录与完整安装提交、激活失败回滚及卸载，其他扩展按宿主完整迁移表实施。宿主GPL许可与本仓库MIT许可分别保留。

2026-10-18：正式插件包与依赖协议见[plugin-packages.md](plugin-packages.md)。prepare:source还生成并核对artifacts/*.echomod；官方源安装不再下载整个仓库ZIP。
