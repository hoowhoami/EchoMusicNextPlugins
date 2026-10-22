# 第三方来源

- 参考项目：[Folia](https://github.com/chthollyphile/folia-major)，作者 chthollyphile 及贡献者。
- 固定提交：`a8da4437cf19723555bd75e4685ca20815fe5b82`，参考版本 `0.7.21`。
- 代码许可：上游根 LICENSE 的 AGPLv3 文本，副本随本插件的 `LICENSE` 分发。本插件代码采用 AGPL-3.0-only，独立于作者仓库根 MIT 许可。
- `qml/styles/still/Still.qml` 是 `src/components/visualizer/still/VisualizerStill.tsx` 的 Qt Quick 移植，保留三行、字号/字重、行距、译文、暗角和关闭动态背景的行为。
- `qml/shared/timing.mjs` 将 `src/utils/lyrics/renderHints.ts`、`glowWordTiming.ts` 和 `GlowWord.tsx` 的呈现时序转换为毫秒，保留短行/微行阈值、显示时长、前瞻和结束边界，不修改源时间戳。
- 字体来自当前操作系统与宿主字体链，插件不分发字体文件。宿主提供的 Qt 与共享控件沿用宿主自身许可材料。
- `assets/previews/still.png` 由实际 Still QML 组件生成，使用本仓库编写的测试文字；仅证明组件预览，不是实际音频播放或 Folia 视觉一致性验收。
- 本阶段不分发上游头像、表情包、模型、照片、音乐、歌词文件或账号数据；将来引入这些资源时分别核验并保留许可。
