# Folia 歌词皮肤

开发中的 Qt Quick 插件。宿主换肤抽屉只注册一个 **Folia** 入口，选中后在播放页右上角选择 Folia 内部样式；安装与注册不会自动改变当前皮肤。

当前接入 `still`（静止）：当前及相邻共三行歌词、译文、字号、字体链和暗角。它直接使用宿主当前歌词模型和呈现 scope，不创建播放器、歌词来源或播放时钟。其余 13 种样式仍按 [任务清单](../../docs/folia/plan.md) 开发，没有用占位组件登记成可用样式。

配置通过宿主注入的 configuration 持久化。共享字段直接逐键 patch；后续专属设置采用 mode 前缀键，避免嵌套对象替换覆盖另一模式的参数。设置面板使用宿主共享控件和滚动容器。

## 本地验证

在仓库根目录使用 Node.js 24：

```sh
npm run check
npm test
npx echo-plugin build plugins/folia-lyrics-skin --out dist
```

包需要实际宿主已经实现的 `ui.lyricsPage`、`playback.context`、`appearance.snapshot` 和 `appearance.fonts` 等能力。作者契约须从本次真实宿主同步；不能通过删除 manifest 能力绕过旧快照。

组件级测试可使用 Qt 6.12 的 qmltestrunner：

```sh
npm run test:folia:qml -- --qt-bin /absolute/Qt/bin
```

组件测试不代替原生验收。已有 Release 构建及 `echo-plugin-runtime-test` 链接依赖时，可复用它的实际库验证本插件包：

```sh
python3 scripts/test-folia-host.py --host-build /absolute/EchoMusicNext/build/release \
  --qt-bin /absolute/Qt/bin --package dist/folia-lyrics-skin-1.0.0.echomod
```

该工具只读取 Ninja/编译元数据，在插件仓库 `build/folia-native` 编译独立验收程序，不修改宿主构建树；使用临时存储、原生 PlaybackPage/换肤抽屉和本仓库创作的 PCM/歌词。验证一个候选、选择、设置保存/恢复、真实播放/暂停/seek/恢复、关闭、停用与卸载。macOS 可增加 `--platform cocoa` 检查 Metal，并在对应平台目录保留日志与截图。这些不是完整 Folia 视觉对照或性能验收，完整状态见 [验证记录](../../docs/folia/verification.md)。

## 参考与许可

Folia `a8da4437`，AGPLv3；移植文件与素材的对应关系见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，许可证全文见 [LICENSE](LICENSE)。作者仓库根许可与宿主根许可不变。
