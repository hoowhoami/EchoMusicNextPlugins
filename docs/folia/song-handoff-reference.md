# 实际 A/B 歌曲交接

固定参考为 Folia `a8da4437cf19723555bd75e4685ca20815fe5b82`。本项将真实音频输出的 A/B 呈现接入 14 样式：保持 A 到 settle，只有 Monet 的文字按真实 cue 提前切 B，页层和声始终保持 A 到 settle。不创建播放器、不猜测 `queue+1`，也不复制音频时钟。新增公开元数据与 14 样式/TTML 专项仍须在下一次一致的宿主构建后验收，不能借用此前 Monet 测试扩写完成范围。

## 数据、位置与 cue

- `PlaybackTransitionPresentation` 只接受原生 prepare 请求、实际 A/B sequence、account revision 和 epoch 匹配的投影。A 保留实际已解析歌词，B 使用原 LyricSource/LyricText 预取，native adopt 后由 B 的实际解析器接管。
- `player.transition` 是 typed、只读投影。queued 阶段没有 incoming position；不能把当前 A 歌词伪装成 B。所有 u64 身份是十进制字符串。A/B 的 `id/hash/songId` 与现 Player.snapshot.track 使用相同公开元数据和单位，在非法状态/呈现退休时遮蔽；中途挂载也可从真实 A 计算源几何 seed。
- native `cueElapsedMs/cueDurationMs/crossover` 来自当前 runner 同一生效 GainDb 曲线及实际输出坐标；交点在初始化的有界计算中求出，不在 RT 回调中求解。它表示安排的 gain envelope，不宣称是 EQ/echo 后的声学响度交点。
- `handoff-clock.mjs` 原样保留 `services/automix/handoffProgress.ts:13,18`：先把音频交点对齐视觉 .5，再用 smoothstep。原生线性 overlap progress 不直接驱动画面。
- 唯一 `PresentationClock` 内的原 `LyricClock` 继续采样 B，结合 native 同一快照的 A/B 锚点、tempo ratio 和 output speed 求 A 位置及 cue。completed 冻结 A/cue，B 继续正常走时。
- 暂停后迟到的普通 position 遥测不能重设已冻结时钟；typed seek/trackchange、坐标变化及重新启用仍显式重新定位。真实 RED 记录见 `build/folia-native-handoff-anchor-trace-dpr1.log`：native A/B/cue 完全不动，但旧代码因迟到的 player position 把 268.4036ms 回摆到 253.7497ms。
- 无有意义交点的模板返回 `cueReady=false` 和原因；例如 EchoTail 没有 paired gain envelope，不制造 .5 或声称它已具有完整的动画交接。

## Monet 与背景

`SongHandoff.qml` 的两套有界 PreparedLyrics/LyricTimeline 都读取实际 typed ReadModel。`useVisualizerRendererModel.ts:99..112` 的 selectDisplay 语义用于全部样式，`monetSongHandoff.ts:20,23` 的特殊规则保留：Monet 名称、歌词、索引、歌词时间与主题在视觉 .5 一起改用 B；此前保留 A。A/B seed 都从各自保留的公开歌曲身份计算，completed 不重播一次 intro。无 cue 或减少动作时保留 A 到 settle，不猜一个交点。

`HarmonyIndex` 新增 nullable typed transitionTrack，默认路径仍为当前歌词；交接时只读真实 A 的行与 paired A 时间。其 Workers、8192 主行/65536 声部/4Mi UTF16 容量及取消规则保持。transition 的 compact lyricsInfo 没有 hasBackgroundVocals 标志，因此对真实保留行做原有有界扫描，绝不伪造和声。Monet 已跨到 B 时，页层和声仍按 `VisualizerRenderer.tsx:89` 读取 A。

立绘从交接开始请求真实 B 地址，先实际解码再加入栈。保留源码最多四层、900ms easing、迟到解码 `progressSince`、同交接地址替换继承起点、取消时退回底图、失败不打洞；内部不可见的 MultiEffect source 仍以 live 驱动准备。实际热缓存命中可一直保持 Image.Ready 而没有 statusChanged，必须监听新 native lease 并用 owned 0ms Timer 等 frame 绑定就绪；隐藏同时取消该 Timer。

`BackgroundPresentation` 保留 source-key、最多双层、真实 first-frame 与 styleWaits。新层就绪后以 `progressSince` 跟随同一 cue；下方 A 不先淡空。没有剩余 cue 的迟到内容使用原 80+520ms softFocus 完成。取消可复用真正显示的 A；完成与隐藏取消 owned Timer 并释放临时采样纹理。

背景首地址逻辑原样来自 `useHandoffCover.ts:26..46`，同 B identity 期间保留首次非空地址。不能用错误素材构造权限缺口：宿主仅在 catalog cover 为空时采用 embedded APIC（`PlaybackService.cpp:330`），非空 cover 不会被 APIC 替换；`PlaybackService.h:cover()` 始终优先 catalog cover。

资产权限仍只允许同有效 epoch 的 A/B 和当前实际封面；seek 后旧 A 拒绝，当前 B 仍允许，presentation scope 退休后读取返回 ScopeClosed。未为假设中的地址替换扩大白名单。

## 验证方式与证据

`tests/folia-song-handoff.test.mjs` 直接加载固定上游 oracle，5/5：14 样式 held-A 与无 cue 策略、视觉曲线、唯一采样的 paired 坐标、Monet crossover 与四层取消、keep-first/revoke/cancel。

`tests/qml/tst_FoliaMonetHandoff.qml` 使用安装包内真实授权的两张自撰封面，比较原生 source-over 的实际像素、迟到解码起点、替换和取消。没有伪播放器。

`tests/qml/tst_FoliaNativeHandoff.qml` 使用 QA-only 私有 Host，实际静音 40s PCM、两组 80 行内嵌 LRC、真实 A/B 队列及 B 内嵌 APIC。保留原设置并在结束恢复，测试不触及用户队列。它需要独立进程，因为 Rust FFI 每进程只允许一个音频引擎；普通共享 QML 进程显式跳过该专项，不能计作通过。

```sh
FOLIA_HANDOFF_ONLY=1 QT_QPA_PLATFORM=cocoa QSG_RHI_BACKEND=metal QT_SCALE_FACTOR=1 \
  build/folia-handoff-qml/folia-qml-test -input tests/qml/tst_FoliaNativeHandoff.qml
```

首轮 DPR1 完整专项 5/5（21.090s）：真实 A/B rows、实际字形批次、跨 cue 后 B 文本和图像到屏、精确暂停、paused seek、completed 背景一层且 transitionBytes=0、queued 取消复用 A、隐藏资源释放，以及 epoch/scope 授权。随后两处 build 被外部删除，DPR2 进程 exit0 但来不及回读 Totals，不声称其精确通过数；残存结果与源码 hash 记录在 managed host 的 `build/folia-handoff-surviving-20261023/pre-generic-held-a-evidence.json`。

恢复后，同目录 `native-generic-dpr1.log` 为原完整 5/5（22.537s）；新增 wrapper ID 后的全套结果仍待统一构建。独立立绘实际像素、取消、迟到和热缓存替换为 DPR1 4/4（3.070s）、DPR2 4/4（3.252s）；DPR2 原背景 9/9（4.317s）、Stage 13/13（7.627s）。`portrait-hot-cache-red.log` 保留 Ready=true 但未发布的真实 RED，GREEN 及回归日志也在该 managed 目录。

`tst_FoliaNativeHandoffHarmony.qml` 需要额外 `FOLIA_HANDOFF_TTML=1`，从实际 WAV 的 USLT 中解析 80 行 TTML 和 80 个有词时间的背景声部；验真实 A 和声在 Monet 跨 cue 后保持 A，settle 后才改为 B。14 模式专项验证真实组件的 A ReadModel/时间/metadata/seed 接线，不能替代各样式独立的完整准备和像素验收。

保留失败记录：旧 SDK 缺少 typed transition、第二个音频引擎的错误 fixture、非空 catalog cover 被 APIC 替换的错误前提、真实 paused 遥测回摆。Qt WorkerScript 官方 QJSEngine nullptr 警告及 FFmpeg 对 WAV attached PNG 的 probe 提示原样保留；TypeError、binding loop、invalid context 等仍会让测试失败。
