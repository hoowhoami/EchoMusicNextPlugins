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

官方索引只收录 id/repo/ref/path；应用从作者 manifest.json 的 distribution 读取最新包地址和哈希，作者升级无需修改官方源。完整字段与发布顺序见[发布指南](../../docs/plugin-packages.md)。

```sh
# 先发布实际包，再用其内容生成作者 manifest 的发布字段。
echo-plugin publish-manifest dist/my-plugin-1.0.0.echomod \
  --artifact https://github.com/author/my-plugin/releases/download/v1.0.0/my-plugin-1.0.0.echomod \
  --out my-plugin/manifest.json
# 仅首次收录时提交生成的定位。
echo-plugin index-entry dist/my-plugin-1.0.0.echomod \
  --repo https://github.com/author/my-plugin --path my-plugin
```

命令只生成本地文件，不上传或推送。`prepare-index` 自动准备本仓库的包与作者 manifest 并保留第三方定位；`check-index` 离线校验定位，`check-published` 校验远端 manifest、包哈希和完整清单。

`test-host <package.echomod>` 直接验证独立作者的实际包，无需官方源或本地构建清单；省略包路径才批量构建本仓库插件。索引类型为 SDK 的 `PluginSourceIndex` / `PluginSourceEntry`。

GPU 着色器可在 plugin.config.json 的 shaders 中声明 source/output/target（rhi 或 quick），由匹配宿主 Qt 版本的 qsb 编译并验证跨后端包。设置 ECHO_QSB 或将 qsb 放入 PATH。编译失败保留旧产物，发布信息与包仍执行哈希校验。详见[GPU 绘图](../../docs/graphics.md)。
