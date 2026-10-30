# Sonnet 源码移植与原生绘制

参考仓库固定 `a8da4437cf19723555bd75e4685ca20815fe5b82`。生成脚本 `scripts/build-folia-sonnet.mjs` 校验提交、Node24/Unicode17，并记录原文件 SHA256；生成模块标注 Folia 的 AGPL-3.0-only。pretext0.0.9 复用现有 MIT 源移植，保留全文许可，隔离本模式的测量模块和缓存状态。

## 当前完成与边界

已经移植段落程序、七种排版、全部100种 MG、八种 HUD、真实场景构建、片尾字幕、三种转场、原始镜头、逐字与完整后处理。可见绘制使用持久 Qt Shape 与完整上下文 GlyphRun；20项专有设置已进入共享配置，Sonnet 已加入单一 Folia 皮肤的页面选择器。Node 数值 oracle 与真实 Metal 场景测试均通过；完整原 Folia 连续画面对照、生产安装与 Release 性能仍待完成。

## 程序与生命周期

`sonnetProgram.ts:26-34` 保留 editorial-column、type-impact、fragment-collage、tracking-ribbon、mask-reveal、poster-blocks、quiet-tableau 七种模板。段落 gap threshold 是正间隙中位数×2.5、clamp1.25..3.5；blockIndex/songPart 真变化优先划分。超过六行/18秒时按源最大间隙拆分；源算法只继续处理剩余部分，已输出部分可能超过六行，不能把六行当成硬上限。shot 沿原四行/6秒规则，镜头种类按原 UTF16 FNV 和 seed 选择并避免直接重复。短呼吸和 chorus 的模板修正规则保留。

`sonnetSemantic.ts` 使用原 timeline 与已保存/ICU 分词，标点粘到前词，完整 UTF16 offsets 与 timing 都保留。不是空格分词或人为构造逐字时间。`sonnetSceneBuilder.ts` 的基字号为 clamp((W/max(7,wordCount×2.15))×heroScale×lyricsScale,24,112)，原 packing 通过实际测量尺寸布局；glyph 与原段落/shot 的时间全部依赖绝对播放时刻，seek 不使用上一帧累计积分。

`createSonnetPixiRuntime.ts` 只显示一个活动 paragraph 和其中一个 shot；native 最多保留三个段落数值树，GPU actor 按当前镜头创建/退役。source 真正换歌使用 wall-clock560ms dissolve，在35%阶段预建，50%提交，暂停时仍推进；普通 seek/主题修改不伪造换歌。片尾 credits、outro blur 和 showOnlyText 的关系保留；无歌词时需真实确认播放后才显示原60条五线谱。

## 原设置

所有字段从 settings 根的 `sonnet` 前缀同名键读取（例如 `sonnetCameraIntensity`），默认值和 clamp 直接取 `types.ts:535-586`、`sonnet/tuning.ts:16-47`。

| source 字段                                                       |      默认 | 合法范围            |
| ----------------------------------------------------------------- | --------: | ------------------- |
| cameraIntensity / typographyMotion / mgDensity                    | 1 / 1 / 1 | 0..2                |
| showOnlyText                                                      |     false | boolean             |
| showGuide / showBackgroundMg / showFixedGeo                       |      true | boolean             |
| showGiantDecorativeText / showBackgroundDecor / enableTransitions |      true | boolean             |
| outerFrameMode                                                    |      full | none / frame / full |
| textureResolution                                                 |       1.5 | .5..4               |
| postProcessEnabled                                                |     false | boolean             |
| postProcessGrain / postProcessContrast                            |    .2 / 0 | 0..1                |
| postProcessRgbShift / postProcessHalftone                         |     0 / 0 | 0..1                |
| postProcessVignette                                               |       .85 | 0..2                |
| postProcessLensDistortion / postProcessLensDispersion             |   .3 / .6 | 0..2 / 0..1         |

normal/calm/chaotic motion scale 为1/.65/1.35。原 haloLayer 的 BlurFilter 配置仍在源树中，但该固定版本的 glyphView.halo 全为 null，实际层为空；不人为给空层添加光。可见 bodyText 的原 dropShadow 与 CA screen copies 分别保留。scene 后处理顺序为 lens→grain→contrast→RGB shift→halftone→vignette，转场 blur/glitch 在其后。

## 原生能力

文本使用完整 QFont 和 full-context GlyphRun。源码 decoration/ghost 是真正 stroke-only：`sonnetTextViewBuilder.ts:152-182` 的 fill 为透明，stroke 为 clamp(fontSize×.006,1,8)；最大 decoration 112×5.5=616px。已由通用原语支持 run.strokeWidth0..8、可见字号至1024、按需2048 ink页，总ink仍32MiB。实际 type-impact / brightest 装饰词616px、weight300、stroke3.696 的独立原生 DPR2 cache 为13,725,056bytes。不能以实心低透明度或低字号mask放大代替。

Sonnet 通过 run.strokeBitmap='fill' 明确保留原始彩色位图字形；不伪造不存在的 outline。正文完整 RGBA 及 EGC/ligature 的 native cluster 映射保留，pose.tint 在 body+halo 合成后乘 RGB，pose.opacity 只乘一次。GlyphRun 接受真实小数字号；仍不宣称 Qt 与 Chrome 字体 AA 恒等。

MG 保留为持久 GPU Shape 曲线路径；source AnimatedGraphics 的黄金比例 stagger、局部 cubic easing、arc/cubic 裁段以及 progress1 停止更新均保留。120帧变形/染色测试直接验证同一 Shape、ShapePath、GradientStop 身份保留，避免 Repeater 模型重建全部对象。screen、lens 与整组后处理使用有界 GPU render targets/qsb；不使用全窗 CPU Canvas.Image。单个原生 scene glyph cache 上限128MiB，顶层所统计的 glyph/filter cache 上限384MiB，超限明确报错；它们不等于整个进程峰值或 GPU 驱动占用。

## 已执行验证

- `node24 scripts/build-folia-sonnet.mjs`：生成成功，固定 SHA、Unicode17。
- `node24 --test tests/folia-sonnet.test.mjs`：14/14，另有共享默认值 oracle。涵盖原 TS 七种 packing、全部场景构建、原 MG 指令、原生完整 advance/ink 注入、片尾 word wrap、instrumental 门槛与换歌阶段。
- 实际 Qt6.12/Cocoa/Metal DPR1/2 均13/13：真实 Worker+ICU+GlyphRun、实际 RGB、seek/暂停、全部设置与后处理链、片尾、三轮 scene 退役/GC、无歌词门槛及暂停换歌。日志 `build/folia-sonnet-final-dpr{1,2}-fixed.log`。持久 vector 修改后 DPR2 再13/13，日志 `build/folia-sonnet-retained-final-dpr2.log`。
- 共享 vector 测试7/7，且旧安装包基线真实 RED：`build/folia-retained-vector-production-baseline-red.log`、`build/folia-retained-vector-current.log`；Tempera 使用相同组件的 DPR2 全量14/14复核。

主题 lyricsIcons 已接公开 themeMetadata，保留源码列表规范化/去重与空列表 Flower 回退，详见 [主题图标](theme-icons-reference.md)。可选模型分析支路已从生成与运行代码移除；保留现有频谱响应及普通转场，歌词模型缺失的 chorus/songPart/blockIndex 不推测补齐。Qt6.12 WeakMap 在 scene 退休/GC 后的同一崩溃已由官方最小 runner 复现，原 shot tracking cache 增加显式退休边界，详见 qt-runtime-compat.md。独立 Fume 宽 halo 在 DPR1 仍有 Chrome gate 失败；完整 Sonnet 连续源画面与 Release 验收仍需继续，不据这些专项声称最终发布就绪。
