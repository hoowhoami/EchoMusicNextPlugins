# Folia 对应源码与可移植重建

Folia 皮肤的对应源码包含本仓库的生成器、原生适配层、测试和
`source/folia-reference/` 中的首选上游输入。快照固定于
[`a8da4437cf19723555bd75e4685ca20815fe5b82`](https://github.com/chthollyphile/folia-major/tree/a8da4437cf19723555bd75e4685ca20815fe5b82)。
该目录位于插件运行目录之外，随单独的对应源码归档交付；`.echomod` 中不加入
`src`、`source` 或 `node_modules`。

## 输入与许可证

`SOURCE.json` 记录原始文件的路径、字节数和 SHA-256，以及构建输入包的版本、
锁定地址、npm integrity 和安装文件 SHA-256。快照包含 Folia 的 TypeScript/
TSX/CSS 输入、`dev/icuFolia` 字典及生成器、歌词测试语料、原始 AGPL 许可证、
上游 package 元数据、Pretext 0.0.9 首选 TypeScript 源码及 MIT 许可证，
以及固定摘要的 Unicode 17.0.0 数据和许可证。

独立 `package-lock.json` 从完整的上游锁文件离线剪枝产生。45 个包保留上游锁中的
实际安装位置、版本和 integrity，包括嵌套依赖。它们只在重建或生成验收参考时
使用：其中 twgl.js 7.0.0 用于 Sora 的浏览器参考，fflate 0.8.3 用于原始
图片归档解析的源码对照测试；均不加入原生插件运行依赖。
`npm ci` 按锁获取包时同时取得各包的原始许可证；包文件不能被本地修改后继续使用。
无需安装 Folia 的 Electron 应用，也不随源码归档复制整个 `node_modules`。

`folia-reference.mjs` 在每次构建前核对快照原件、实际安装的包文件及版本、
独立锁与上游锁，并拒绝未记录的源码、配置和包文件、越界链接、路径穿越、
Windows 盘符及大小写冲突。npm 的 `.bin` 和安装隐藏锁仅作为安装记录排除，
生成器不从该目录执行工具。快照文件使用 Git `-text` 并排除 Prettier，保留原始
换行与许可字节。源码归档本身的传输完整性由发布时的归档 SHA-256 校验。

## 从对应源码归档重建

使用 Node 24（Unicode 17；本次验证为 24.15.0，建议使用该版本）、本仓库
锁定的开发工具，以及 Qt 6.12.0 的 `qsb`、`qmlformat`、Gui/GuiPrivate 开发组件。
还需要 CMake ≥3.25、Ninja 和支持 C++20 的编译器。Diorama 的生成器会编译
一个独立的 QtGui 着色器包处理工具，不构建宿主应用。

在解压后的作者仓库根目录执行；目录可以包含空格，无需 Git：

```sh
npm ci --ignore-scripts
export FOLIA_REFERENCE="$PWD/source/folia-reference"
export FOLIA_QT_BIN="/path/to/Qt/6.12.0/bin"
export QT_HASH_SEED=0
(cd "$FOLIA_REFERENCE" && npm ci --ignore-scripts --no-audit --no-fund)

for name in text cadenza fume pendolo sonnet tempera lumiere monet diorama \
  backgrounds common nomand sora monet-background filters scene-graph \
  harmony transitions tuning-fixture fume-reference latent-reference
do
  case "$name" in
    lumiere|monet|monet-background)
      node "scripts/build-folia-$name.mjs" --qt-bin "$FOLIA_QT_BIN" || exit $? ;;
    *) node "scripts/build-folia-$name.mjs" || exit $? ;;
  esac
done
npm run format:write
node --test tests/folia-reference.test.mjs tests/folia-text-generator.test.mjs
```

Cadenza 必须先于 Fume、Pendolo、Sonnet 和 Lumiere；Sonnet 读取 Fume 的独立
Pretext 适配，Tempera 读取 Pendolo 的适配，Monet 先运行 Lumiere，
scene-graph 和 filters 在 Sonnet 之后执行。这 21 项生成器同时包含只生成验收参考代码的
脚本；不启动浏览器或 GPU。可选 Chrome 截图参数不属于生成运行文件的必要步骤。
生成器从归档中已有的适配源码接缝重建，保留这些手写文件后运行命令。

各原始输入摘要保持不变；生成清单使用逻辑相对路径。esbuild 的来源注释保留
既有的 `../folia-major/` 逻辑标签，它不用于定位实际文件。QSB 逐字节比较须使用
相同平台和 Qt 工具版本；跨平台产物需在对应平台重新验证。

## 维护者更新快照

快照采集需要上述固定提交的干净 Folia Git 检出、其锁定安装，以及已校验的
Unicode 数据缓存。输出目录必须不存在，失败不会发布半成品：

```sh
node scripts/prepare-folia-source.mjs --reference /path/to/folia-major \
  --output build/folia-source-inputs
```

采集器先核对已记录的输入、原始锁及实际包，再离线剪枝独立锁并记录包文件。
发布默认 `source/folia-reference/` 前应在私有副本中完成安装、无 Git 搬迁重建、
运行模块/QSB 字节比较、来源摘要和许可证原件核对。更新后重新生成对应源码归档
及摘要，与相应 `.echomod` 一并提供。
