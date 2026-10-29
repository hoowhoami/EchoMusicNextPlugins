# Still 源组件运行对照

来源固定为 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`。本次在只读参考仓库按 lockfile 执行 `npm ci --ignore-scripts`，使用其 Vite 8.3.1 与已有 `dev-probe.html?probe=visualizerMemory&vis=still&freeze=1&cjk=1&lines=30`，没有改动上游业务文件。服务只监听 `127.0.0.1:3001`，没有触碰占用 3000 的其他项目。

Chrome 155 / macOS，viewport 为 1100×820、DPR 1、深色、未启用减少动效。冻结探针的当前行是 12，时刻 37.5 秒。它是源组件夹具，不是上游实际歌曲播放或完整 App/背景/播放胶囊验收。

实际计算样式：

| 文本     | 字号 / 行高 | 字重 | 字距   | 透明度 | 阴影                 |
| -------- | ----------- | ---- | ------ | ------ | -------------------- |
| 主行     | 40 / 50 px  | 700  | 0.8 px | 1      | 0 3px 3px，黑色 0.12 |
| 相邻行   | 30 / 36 px  | 600  | 0.6 px | 0.3    | 同主行               |
| 主行译文 | 24 / 32 px  | 500  | 0.6 px | 0.8    | 0 1px 2px，黑色 0.15 |
| 相邻译文 | 20 / 28 px  | 400  | 0.5 px | 0.3    | 同主行译文           |

另外在独立浏览器上下文直接挂载**未修改的上游 Still 组件**，传入与 `tests/qml/PreviewStill.qml` 相同的三句原创夹具、背景 `#15181e`、主色 `#f1f3f6`、次色 `#b0b6c1`。主字号倍率与字幕倍率均设为 1.4：浏览器计算得到主文字 `scale=1.4`、字幕 `scale=1.96`，原始行高仍为 36/50 和 28/32 px，没有重排。Qt 实现据此修正先前预留放大高度与反向缩窄排版宽度的偏差；缩放围绕各文字中心，保持源行为。

单行夹具在倍率 1 时，三行组合高度 302 px，列顶部 y=227；这两个真实源几何值已加入 Qt 回归测试。相同倍率下的 Qt/Chromium截图仍有字体回退、字形栅格和纹理采样差异，尚未取得像素一致性或用户视觉认可，不把行盒通过当作视觉完成。

Qt 原生截图可复现：

```sh
QT_QPA_PLATFORM=cocoa /absolute/Qt/bin/qml tests/qml/PreviewStill.qml -- \
  scale=1.4 subtitleScale=1.4 font=Arial output=/absolute/comparison.png
```

浏览器截图已在当前任务中直接查看；浏览器连接器拒绝写入本任务目录，因此没有声称本地保存成功，也没有写入其他项目。完整共享页和其余 13 种样式的源运行对照仍待执行。

## 纳入共享十四样式过渡（2026-10-23）

`StillPresentation.qml`只适配公开readmodel的三行、原source effectiveIndex和四个完整QFont；原Still字形/行高/颜色/阴影实现保持独立。Page不再用单独Loader硬切Still。VisualizerStage对十四种模式共享首帧、softFocus和至多两个actor，BackgroundPresentation对Still创建不绘制内容的空状态并真实退役旧背景；静止后无背景renderer、无过渡FBO。动态模式的资产/PCM/准备只保留到其离场actor退休；Still稳定后不跑全文准备与连续帧投影。后续真实Harmony若存在活跃声部可复用同一宿主投影，不产生第二个时钟。

新增Stage与无背景专项均先RED再GREEN；DPR2完整Stage13/13、背景8/8，Page/Dynamic/Stage/StillAdapter/Background的qmllint退出0。中途返回测试先暂停真实partial enter再发延迟切换，避免繁忙线程在两次采样间正常推进引起误判。新的生产包与软件后端仍待统一新SDK宿主验证，不能用之前独立Still的生产页记录替代。
