# @echomusicnext/plugin-tools

开发用echo-plugin CLI，依赖固定TypeScript/esbuild/Acorn/Ajv。工具不进入宿主运行时。

```sh
echo-plugin build ./my-plugin --out ./dist
echo-plugin validate ./dist/org.example.my-plugin-1.0.0.echomod
echo-plugin build-index --root ./
echo-plugin check-sdk --host /absolute/echomusicnext
echo-plugin sdk-sync --host /absolute/echomusicnext
echo-plugin test-host ./dist/my-plugin-1.0.0.echomod --host /absolute/echomusicnext --runtime-test /absolute/echo-plugin-runtime-test
```

build先严格类型检查，再bundling/transpile，资源仅复制config.assets，校验成功后替换前一份工具产物；失败保留上次可用目录，不执行插件构建脚本。validate检查manifest/版本/能力、ES2016模块图、activate导出、路径/链接、文件数/字节限额与原生QML声明。QML组件和生命周期需真实Qt验收。SDK按npm包名解析，workspace和独立打包安装均可用。

1.0.0的build正式输出.echomod并保留开发目录；validate同时支持两者，容器验证包含CRC/路径/链接/预算。源schema2的产物/哈希及插件依赖见[插件指南](../../docs/plugin-packages.md)。

跨仓库收录使用 schema2：`id` 为预期插件 ID，`repo` 为作者 GitHub 仓库（省略为当前源），`ref` 默认为 HEAD，`path` 为 manifest 目录（空字符串表示根），`artifact` 为仓库根的相对 .echomod 路径或 HTTPS 下载地址，`sha256` 绑定包字节。名称、描述、版本和能力来自 manifest；下载后同时核对哈希与完整清单。官方收录源与作者仓库分别记录，仓库按钮打开作者地址。

作者构建后运行 `echo-plugin index-entry dist/plugin-1.0.0.echomod --repo https://github.com/author/plugin --ref v1.0.0 --path "" --artifact https://github.com/author/plugin/releases/download/v1.0.0/plugin-1.0.0.echomod` 生成条目，提交到官方源的 plugins 数组即可。命令不上传或发布。

本地构建清单在 `echo-plugin.build.json`，与公开索引分开。`build-index` 构建其中明确列出的本地插件；`prepare-index` 更新同仓插件的 artifacts 与索引，保留第三方条目；`check-index` 不读取第三方本地源码；`check-published` 联网校验每条作者清单和实际包。频谱仍在本仓库维护，第三方可独立维护仓库。生成入口只需放在 .echomod 内。

`test-host <package.echomod>` 直接验证独立作者的实际包，无需官方源或本地构建清单；省略包路径才批量构建本仓库插件。索引类型为 SDK 的 `PluginSourceIndex` / `PluginSourceEntry`。

GPU 着色器可在 plugin.config.json 的 shaders 中声明 source/output/target（rhi 或 quick），由匹配宿主 Qt 版本的 qsb 编译并验证跨后端包。设置 ECHO_QSB 或将 qsb 放入 PATH。编译失败保留旧产物，包与索引仍执行哈希校验。详见[GPU 绘图](../../docs/graphics.md)。
