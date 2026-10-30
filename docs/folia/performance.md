# Folia Release 性能采集

本轮尚未完成最终矩阵。以下说明真实采集路径和已排除的探针偏差，不将开发过程中的并发运行结果称为基线。

## 历史探针数据（2026-10-23，已失效）

`build/folia-release-performance-visual-r1-20261023/summary.json` 是历史记录：后续审查发现该探针的前景被背景遮住，不能用这一轮判断完整页面开销，也不能作为原生基线或最终样式对比。原始表格仅保留用于解释后续排查方向；部分 build 证据随后被外部清理，本次没有用旧数字补作新验收。修正前景层次后的正式 Release DPR1/2 重复矩阵仍待执行。

| 样式     | CPU（单核%） | GPU p95（ms） | 可见 footprint 抽样峰值（MiB） | 隐藏1秒 footprint（MiB） | 首次准备（ms） |
| -------- | -----------: | ------------: | -----------------------------: | -----------------------: | -------------: |
| native   |        13.34 |         0.524 |                          186.9 |                    146.1 |              4 |
| classic  |        29.34 |         1.260 |                          392.8 |                    249.8 |            846 |
| cadenza  |        47.94 |         1.366 |                          422.8 |                    257.7 |            909 |
| partita  |        33.72 |         1.331 |                          396.7 |                    260.1 |            857 |
| tilt     |        30.08 |         1.026 |                          388.1 |                    243.2 |            847 |
| claddagh |        31.14 |         1.152 |                          402.3 |                    263.9 |            855 |
| cappella |        38.14 |         1.864 |                          334.1 |                    258.6 |            159 |
| monet    |        49.57 |         2.779 |                          462.8 |                    299.3 |           1118 |
| pendolo  |        33.80 |         1.132 |                          448.1 |                    277.6 |            953 |
| fume     |         无效 |             — |                              — |                        — |              — |
| tempera  |        72.80 |         3.546 |                         1671.4 |                    654.1 |           5589 |
| lumiere  |       125.97 |         2.530 |                          888.2 |                    345.8 |           8903 |
| sonnet   |        97.57 |         1.286 |                          747.8 |                    374.9 |           3004 |
| diorama  |       111.81 |         2.067 |                          667.7 |                    334.6 |           1376 |
| still    |         3.10 |         0.357 |                          201.9 |                    158.1 |            106 |

历史探针中普通关闭/最后最小化后，动态Stage、运行中的FrameAnimation、GlyphRun、FloatTexture均为0。因为上述遮挡问题，这只作为旧对象退休观察；Qt/驱动的池化分配仍体现在隐藏后的RSS/footprint，尚不能据此宣称长期内存无增长。Lumiere、Sonnet、Diorama的单核CPU接近或超过100%，Tempera可见footprint超过1GiB；这些是后续采样定位与保留效果优化的重点。

Fume的原始崩溃报告保留；`QObject::property → folia-performance.cpp:321`指向跨事件循环持有的旧renderer。探针已改为每次轮询重新查询实际视觉树，尚待对新正式库重链后复测。同期真实QML专项测试已复现默认辉光下原生atlas容量拒绝，需要验证分组拆分和缓存通知是否能正确收敛，不把probe修复当作产品修复。

## 同条件原生程序

`tests/native/folia-performance.cpp` 通过真实安装包、原生 PlaybackPage、生产播放器与输出 PCM 运行；每个 mode 使用新进程。`native` 安装相同插件但保留宿主内置皮肤，之后依次运行十四种 Folia 样式。没有注入虚拟播放时钟或降低刷新率。

固定场景：720×480 逻辑尺寸、DPR1/2、同一屏幕刷新率、本仓库创作的600秒PCM与80行中英混合歌词/译文、原生seek到12秒、播放音量1%。两组显式选择覆盖夹具中英字符的同一主family（本机默认PingFang SC，`--font`可指定真实已安装字体），Folia仍保留源fallback。各模式字号、字重和构图保持原设计默认；这是实际产品负载对照，不能称为相同布局或相同绘制工作量。

代码和初始准备不计入6秒稳态CPU计时，单列 `initialPreparationMs`；准备完成后自然事件循环预热2秒。GUI心跳使用4ms PreciseTimer。采样期间没有 QtTest `qWait` 轮询：该函数的轮询曾把100Hz屏幕人为测成约80帧，已改为自然事件循环。所有定时期限使用 PreciseTimer，避免默认粗粒度Timer提前约5%结束测量。

## 有效样本门槛

原生组也必须等到真实可见歌词的 `LyricLine.renderBatches > 0`；Folia 必须保持原生内容隐藏、指定 mode、唯一已呈现 actor、无错误及真实绘制资源。Still 检查非空可见文字与首帧；Diorama、Lumiere 检查已完成的烘焙资源/节点和缓存计数，不能要求已退休的整形 GlyphRun 仍存在。每次准备就绪后还要观察一个实际新 `frameSwapped`。初次准备仍为60秒、换歌轮次仍为30秒，失败保留 RED。

seek 先等待生产 `PlaybackService.seekCompleted` 与真实位置确认，再按原来的2秒（后续轮次1.2秒）预热，重新获取当前页面并验证就绪；不保留跨事件循环的裸 renderer。六秒采样开始前固定当前页面/renderer 的 `QPointer` 身份；采样中复用100ms内存定时器检查这些固定对象、实际播放状态、mode、错误和回退，不逐帧扫描对象树。采样结束再核对身份与错误，并在计时外等待一个就绪首帧，单列 `postSampleReadyWaitMs`。该观察范围不保证捕获小于100ms且自行恢复的所有瞬态。

`sampleValidity` 是结果的必要部分。旧报告、错误 mode、未确认 seek、未就绪、身份失效或有错误的报告，即使进程返回0也不能成为成功样本。前台门要求原生窗口与应用均处于活动状态，并在采样期间继续检查；已用真实原生程序负测确认锁屏状态会被拒绝，CPU 协议回归13/13通过。对应记录为宿主 `build/folia-update-20261028-r2/performance-foreground-native-negative.log` 与 `performance-foreground-protocol-green.log`。D版探针正在重新编译、链接，正式 Release DPR1/2 性能矩阵尚未运行；锁屏拒绝和协议夹具不代表真实渲染负载或 GPU 性能验收。

## 指标与边界

- `getrusage` 的 user+system 累计CPU毫秒与实际墙钟毫秒；`cpuPercentOneCore` 可超过100%，不能当作整机百分比。
- 原生进程CPU包含4ms心跳、100ms内存/有效性检查、渲染线程时间戳与向量/mutex记录的开销。两组使用同一探针，尚未单独标定探针成本，不能把差值称为纯插件CPU。
- macOS `task_vm_info` 分别报告RSS、physical footprint、进程历史RSS峰值；采样阶段每100ms另取可见峰值。历史峰值包括初始化，不能代替稳态峰值。
- `frameSwapped` 在渲染线程收集真实呈现间隔，统计中位数、p95、p99和最大值；不把它当作GPU执行耗时。
- Qt6.12 `QQuickGraphicsConfiguration.setTimestamps(true)` 对两组同时启用；在渲染线程从当前swapchain command buffer读取 `lastCompletedGpuTime()`，按源码的秒转换为毫秒。结果异步，可能属于之前2–3帧或重复上一有效值；零值不当作零GPU耗时。依据[固定Qt源码](https://raw.githubusercontent.com/qt/qtbase/v6.12.0/src/gui/rhi/qrhi.cpp)。
- 隐藏1秒后的内存与呈现资源计数、随后2秒后台CPU；同进程另做三轮真实换歌/打开/关闭，最终轮最小化，记录每轮可见与退休后的数值。公开渲染器/GlyphRun/FloatTexture的缓存计数仅为各自报告值，不能与RSS或彼此重复相加冒充总物理内存。
- 隔离宿主临时目录的文件数与逻辑字节，包括创作WAV、安装包、设置与歌词缓存；不声称覆盖系统缓存或驱动分配。
- Python runner每250ms观察本进程和后代的RSS及helper名称。共享页面可能重复计数，也可能漏掉短暂进程，因此单独标注为抽样RSS和，不冒充physical footprint或严格峰值。

## 可复现运行

先完成一致的正式Release宿主构建，再用 `scripts/test-folia-host.py` 对同批头文件、生成元对象与库链接探针。`--gui-private`从实际FloatTexture编译记录读取同一版QtGuiPrivate的头文件位置；QRhi仅用于这个固定版本的测试程序，不进入插件包。链接过程只读编译/Ninja元数据，不启动第二个宿主构建。开发分析材料仅允许 canonical appDir 位于正式 `build/release/` 中的程序使用，因此探针输出放在其 `folia-acceptance/` 下；这不能代替实际安装包自带材料的验收。

示例（在插件仓库根目录运行，将 `<host-build>` 和 `<qt-bin>` 替换为实际正式 Release 构建目录与对应 Qt 的 `bin` 目录）：

```sh
FOLIA_HOST_BUILD="<host-build>"
FOLIA_QT_BIN="<qt-bin>"
FOLIA_PACKAGE="$PWD/artifacts/folia-lyrics-skin-1.0.0.echomod"
FOLIA_PERF_OUT="$FOLIA_HOST_BUILD/folia-acceptance/performance"
python3 scripts/test-folia-host.py \
  --host-build "$FOLIA_HOST_BUILD" --qt-bin "$FOLIA_QT_BIN" \
  --package "$FOLIA_PACKAGE" \
  --source tests/native/folia-performance.cpp --gui-private --compile-only \
  --output-dir "$FOLIA_PERF_OUT"
python3 scripts/measure-folia-performance.py \
  --executable "$FOLIA_PERF_OUT/folia-performance-test" \
  --package "$FOLIA_PACKAGE" \
  --output build/folia-release-performance-final \
  --scales 1,2 --repeats 2 --cycles 3
```

编译器生成同名 `folia-performance-test.build.json`，绑定顶层CPP与可执行文件SHA-256、实际编译/链接命令、各阶段耗时；测量器强制校验该sidecar。它不声称覆盖所有传递头文件和宿主静态库，一致宿主构建记录须另外保留。源码改动后必须重新编译。`test-folia-host.py --timeout` 是整个测试进程总上限，默认仍90秒、只接受有限正数；十四模式组合可单独配置适当总上限，不改变case的准备期限。矩阵测量器另有每个进程默认240秒上限，未设置全矩阵总期限。

两个通用原生验收运行器通过 `folia_owned_process.py` 为每次测试创建独立进程组，并在正常退出、超时、SIGTERM 或 SIGINT 后清理该组的残留后代；清理不会按进程名扫描其他会话。标准输出直接写入 `acceptance.log`，即使孙进程持有输出句柄，也不会把测试主体的正常退出误判为超时。`execution.json` 保留主体原始退出码、运行器退出码、超时或中断信号、主体耗时和进程组清理观察；超时返回124，中断返回128加信号编号。`test-folia-native-qml.py --timeout` 默认仍为300秒。清理观察不等同于驱动GPU内存归零证明。

runner串行执行；失败/超时保留日志并继续下一mode。每轮保存日志、JSON、包/可执行文件/探针源码/采集脚本/sidecar的前后SHA-256、实际DPR、Qt版本、PID、GPU名及屏幕刷新率。每轮与中断均原子保存部分汇总和结束hash；不能仅凭一个exit0认定成功。前后hash不是对运行期间每一瞬间的不可变监视。正式测量窗口须暂停本任务其它原生图形/Chrome/构建工作；不终止用户原有应用，记录这些应用可能带来的外部负载。

## 已发现的平台与工具边界

在固定Qt6.12/macOS27组合，直接 `showMinimized → showNormal` 后visibility恢复Windowed但 `isExposed` 不恢复；独立仅Qt的QQuickWindow测试也先失败。未改产品Qt或把隐藏替代最小化冒称通过。当前矩阵将最小化安排在最后一轮，只测其真实退休；正常关闭/隐藏/重新显示继续测。直接最小化恢复保留RED，复现材料 `build/folia-window-minimize.cpp`、`build/folia-window-minimize-probe.log`。Qt的独立Worker初始化警告见 qt-runtime-compat，不与插件context错误混为一类。

本机没有xctrace，已改用实际可获取的QRhi时间戳；不虚构驱动级GPU内存。开发试跑原生/Classic及三轮关闭/最小化均已产出真实数据，但当时仍有其它任务并发运行，不作为最终性能结论。

宿主构建元数据另有早期并发留下的重复path id：`.ninja_deps` 的ICU `ubrk.h`路径重复使用9015，而顺序期望9044。Ninja1.13.2恢复时保留了出错记录，导致每轮丢掉其后新的依赖并重复全编。按[官方实现](https://raw.githubusercontent.com/ninja-build/ninja/v1.13.2/src/deps_log.cc)核实后，备份该日志并执行 `ninja -t recompact`，随后dry-run不再出现恢复警告；没有改源文件/目标文件或删除缓存。下一次正式构建仍需刷新此前丢失的依赖，之后再检查增量行为。
