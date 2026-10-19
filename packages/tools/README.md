# @echomusicnext/plugin-tools

开发用echo-plugin CLI，依赖固定TypeScript/esbuild/Acorn/Ajv。工具不进入宿主运行时。

```sh
echo-plugin build ./my-plugin --out ./dist
echo-plugin validate ./dist/org.example.my-plugin-1.0.0.echomod
echo-plugin build-index --root ./
echo-plugin check-sdk --host /absolute/echomusicnext
echo-plugin sdk-sync --host /absolute/echomusicnext
echo-plugin test-host --host /absolute/echomusicnext --runtime-test /absolute/echo-plugin-runtime-test
```

build先严格类型检查，再bundling/transpile，资源仅复制config.assets，校验成功后替换前一份工具产物；失败保留上次可用目录，不执行插件构建脚本。validate检查manifest/版本/能力、ES2016模块图、activate导出、路径/链接、文件数/字节限额与原生QML声明。QML组件和生命周期需真实Qt验收。SDK按npm包名解析，workspace和独立打包安装均可用。

1.0.0的build正式输出.echomod并保留开发目录；validate同时支持两者，容器验证包含CRC/路径/链接/预算。源schema2的产物/哈希及插件依赖见[插件指南](../../docs/plugin-packages.md)。
