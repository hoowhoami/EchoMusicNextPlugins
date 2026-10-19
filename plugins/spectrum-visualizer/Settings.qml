pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme

ColumnLayout {
    id: settingsRoot
    objectName: "spectrumVisualizerSettings"
    required property EchoPluginContext plugin
    readonly property var s: plugin.ui.state
    readonly property var status: plugin.audio.spectrum.status
    property EchoPluginOperation pending: null
    property string errorMessage: ""
    spacing: 14
    function patch(key: string, value: var): void {
        let values = {};
        values[key] = value;
        pending = plugin.executeCommand("settings.patch", values);
    }
    Connections {
        target: settingsRoot.pending
        function onCompleted(): void {
            settingsRoot.errorMessage = settingsRoot.pending && settingsRoot.pending.state === 3 ? settingsRoot.pending.errorMessage : "";
        }
    }
    Rectangle {
        Layout.fillWidth: true
        radius: 16
        color: Theme.floating.elevated
        border.color: Theme.floatingBorder
        implicitHeight: Math.max(80, overview.implicitHeight + 28)
        RowLayout {
            id: overview
            anchors.fill: parent
            anchors.margins: 14
            spacing: 14
            Rectangle {
                Layout.preferredWidth: 52
                Layout.preferredHeight: 52
                radius: 16
                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop {
                        position: 0
                        color: "#42f5b3"
                    }
                    GradientStop {
                        position: 1
                        color: "#a86dff"
                    }
                }
                Row {
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 13
                    spacing: 3
                    Repeater {
                        model: [10, 19, 27, 19, 10]
                        delegate: Rectangle {
                            required property real modelData
                            width: 3
                            height: modelData
                            radius: 2
                            color: "#f7ffffff"
                            anchors.bottom: parent.bottom
                        }
                    }
                }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Label {
                    Layout.fillWidth: true
                    text: "让频谱融入播放器"
                    font: Theme.font(13, 700)
                    color: Theme.floatingText
                }
                Label {
                    Layout.fillWidth: true
                    text: settingsRoot.status.running ? "正在根据当前播放音频的频谱数据实时绘制" : settingsRoot.status.reason || "开启任一显示位置后，将按需订阅当前播放音频的频谱数据"
                    font: Theme.font(12, Theme.regularWeight)
                    color: Theme.floatingSecondaryText
                    wrapMode: Text.Wrap
                }
            }
            EchoTag {
                text: settingsRoot.status.running ? "捕获中" : settingsRoot.status.available ? "未运行" : "不可用"
                tone: settingsRoot.status.running ? EchoTag.Accent : EchoTag.Neutral
            }
        }
    }
    SettingsSection {
        Layout.fillWidth: true
        heading: "显示位置"
        subtitle: "选择频谱参与界面的范围"
        body: Component {
            ColumnLayout {
                spacing: 0
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "启用频谱"
                    hint: "关闭后停止订阅与绘制"
                    switchRow: true
                    editor: Component {
                        EchoSwitch {
                            checked: !!settingsRoot.s.enabled
                            enabled: true
                            objectName: "spectrumEnabledSwitch"
                            Accessible.name: "启用频谱"
                            onToggled: settingsRoot.patch("enabled", checked)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "播放栏背景"
                    hint: ""
                    switchRow: true
                    editor: Component {
                        EchoSwitch {
                            checked: !!settingsRoot.s.showPlayerBar
                            enabled: true
                            Accessible.name: "播放栏背景"
                            onToggled: settingsRoot.patch("showPlayerBar", checked)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "Mini 播放器背景"
                    hint: ""
                    switchRow: true
                    editor: Component {
                        EchoSwitch {
                            checked: !!settingsRoot.s.showMiniPlayer
                            enabled: true
                            Accessible.name: "Mini 播放器背景"
                            onToggled: settingsRoot.patch("showMiniPlayer", checked)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "歌词页控制栏上方"
                    hint: ""
                    switchRow: true
                    editor: Component {
                        EchoSwitch {
                            checked: !!settingsRoot.s.showLyricControls
                            enabled: true
                            Accessible.name: "歌词页控制栏上方"
                            onToggled: settingsRoot.patch("showLyricControls", checked)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "背景光晕"
                    hint: "增加一层低对比度渐变底色"
                    switchRow: true
                    editor: Component {
                        EchoSwitch {
                            checked: !!settingsRoot.s.showBackdrop
                            enabled: true
                            Accessible.name: "背景光晕"
                            onToggled: settingsRoot.patch("showBackdrop", checked)
                        }
                    }
                }
            }
        }
    }
    SettingsSection {
        Layout.fillWidth: true
        heading: "视觉表现"
        subtitle: "调整样式、色彩与空间占比"
        body: Component {
            ColumnLayout {
                spacing: 0
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "显示样式"
                    hint: ""
                    switchRow: false
                    editor: Component {
                        SelectSetting {
                            options: [
                                {
                                    "label": "柱状",
                                    "value": "bars"
                                },
                                {
                                    "label": "波形",
                                    "value": "wave"
                                },
                                {
                                    "label": "混合",
                                    "value": "hybrid"
                                },
                                {
                                    "label": "雾状",
                                    "value": "mist"
                                },
                                {
                                    "label": "中心频谱",
                                    "value": "centered"
                                }
                            ]
                            value: settingsRoot.s.mode
                            onValueEdited: nextValue => settingsRoot.patch("mode", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: settingsRoot.s.mode === "mist"
                    title: "雾气浓度"
                    hint: "控制雾带的可见程度"
                    switchRow: false
                    editor: Component {
                        SliderSetting {
                            from: 35
                            to: 100
                            stepSize: 1
                            suffix: "%"
                            value: Number(settingsRoot.s.mistIntensity)
                            enabled: true
                            onCommitted: nextValue => settingsRoot.patch("mistIntensity", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: settingsRoot.s.mode === "mist"
                    title: "雾化柔度"
                    hint: "数值越高，雾带边缘越柔和"
                    switchRow: false
                    editor: Component {
                        SliderSetting {
                            from: 20
                            to: 100
                            stepSize: 1
                            suffix: "%"
                            value: Number(settingsRoot.s.mistSoftness)
                            enabled: true
                            onCommitted: nextValue => settingsRoot.patch("mistSoftness", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: settingsRoot.s.mode === "mist"
                    title: "流动速度"
                    hint: "只影响漂移速度，不影响音频响应"
                    switchRow: false
                    editor: Component {
                        SliderSetting {
                            from: 0
                            to: 100
                            stepSize: 1
                            suffix: "%"
                            value: Number(settingsRoot.s.mistMotion)
                            enabled: true
                            onCommitted: nextValue => settingsRoot.patch("mistMotion", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: settingsRoot.s.mode === "centered"
                    title: "频谱条宽度"
                    hint: "数值越小，柱条越细密"
                    switchRow: false
                    editor: Component {
                        SliderSetting {
                            from: 1
                            to: 8
                            stepSize: 1
                            suffix: "px"
                            value: Number(settingsRoot.s.centeredBarWidth)
                            enabled: true
                            onCommitted: nextValue => settingsRoot.patch("centeredBarWidth", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "配色方案"
                    hint: "应用到频谱与背景光晕"
                    switchRow: false
                    editor: Component {
                        SelectSetting {
                            options: [
                                {
                                    "label": "跟随主题",
                                    "value": "theme"
                                },
                                {
                                    "label": "极光",
                                    "value": "aurora"
                                },
                                {
                                    "label": "余烬",
                                    "value": "ember"
                                },
                                {
                                    "label": "冰蓝",
                                    "value": "ice"
                                },
                                {
                                    "label": "单色",
                                    "value": "mono"
                                }
                            ]
                            value: settingsRoot.s.palette
                            onValueEdited: nextValue => settingsRoot.patch("palette", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "不透明度"
                    hint: "控制整体存在感"
                    switchRow: false
                    editor: Component {
                        SliderSetting {
                            from: 18
                            to: 92
                            stepSize: 1
                            suffix: "%"
                            value: Number(settingsRoot.s.opacity)
                            enabled: true
                            onCommitted: nextValue => settingsRoot.patch("opacity", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "填充高度"
                    hint: "频谱可使用的垂直空间"
                    switchRow: false
                    editor: Component {
                        SliderSetting {
                            from: 35
                            to: 100
                            stepSize: 1
                            suffix: "%"
                            value: Number(settingsRoot.s.fill)
                            enabled: true
                            onCommitted: nextValue => settingsRoot.patch("fill", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "歌词页高度"
                    hint: "歌词控制栏上方的频谱区域"
                    switchRow: false
                    editor: Component {
                        SliderSetting {
                            from: 48
                            to: 150
                            stepSize: 1
                            suffix: "px"
                            value: Number(settingsRoot.s.lyricHeight)
                            enabled: true
                            onCommitted: nextValue => settingsRoot.patch("lyricHeight", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "HDR 峰值高光"
                    hint: "当前宿主未提供 HDR 绘图能力，保留普通频谱"
                    switchRow: true
                    editor: Component {
                        EchoSwitch {
                            checked: !!settingsRoot.s.hdrHighlights
                            enabled: settingsRoot.plugin.supports("graphics.hdr")
                            Accessible.name: "HDR 峰值高光"
                            onToggled: settingsRoot.patch("hdrHighlights", checked)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "高光强度"
                    hint: "增强柱顶、波形峰值或雾带亮边，保留普通频谱主体"
                    switchRow: false
                    editor: Component {
                        SliderSetting {
                            from: 0
                            to: 100
                            stepSize: 5
                            suffix: "%"
                            value: Number(settingsRoot.s.hdrIntensity)
                            enabled: settingsRoot.s.hdrHighlights && settingsRoot.plugin.supports("graphics.hdr")
                            onCommitted: nextValue => settingsRoot.patch("hdrIntensity", nextValue)
                        }
                    }
                }
            }
        }
    }
    SettingsSection {
        Layout.fillWidth: true
        heading: "频谱采样"
        subtitle: "较高参数会增加多区域同时绘制时的负担"
        body: Component {
            ColumnLayout {
                spacing: 0
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "刷新率"
                    hint: "雾状模式最高按 24 FPS 绘制"
                    switchRow: false
                    editor: Component {
                        SelectSetting {
                            options: [
                                {
                                    "label": "15 FPS · 节能",
                                    "value": 15
                                },
                                {
                                    "label": "24 FPS · 平衡",
                                    "value": 24
                                },
                                {
                                    "label": "30 FPS · 流畅",
                                    "value": 30
                                }
                            ]
                            value: settingsRoot.s.fps
                            onValueEdited: nextValue => settingsRoot.patch("fps", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "频段数量"
                    hint: "中心频谱会使用至少 128 个频段以保留细节"
                    switchRow: false
                    editor: Component {
                        SelectSetting {
                            options: [
                                {
                                    "label": "32",
                                    "value": 32
                                },
                                {
                                    "label": "64",
                                    "value": 64
                                },
                                {
                                    "label": "96",
                                    "value": 96
                                },
                                {
                                    "label": "128",
                                    "value": 128
                                }
                            ]
                            value: settingsRoot.s.binCount
                            onValueEdited: nextValue => settingsRoot.patch("binCount", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "FFT 精度"
                    hint: ""
                    switchRow: false
                    editor: Component {
                        SelectSetting {
                            options: [
                                {
                                    "label": "1024",
                                    "value": 1024
                                },
                                {
                                    "label": "2048",
                                    "value": 2048
                                },
                                {
                                    "label": "4096",
                                    "value": 4096
                                },
                                {
                                    "label": "8192",
                                    "value": 8192
                                }
                            ]
                            value: settingsRoot.s.fftSize
                            onValueEdited: nextValue => settingsRoot.patch("fftSize", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "平滑度"
                    hint: ""
                    switchRow: false
                    editor: Component {
                        SliderSetting {
                            from: 0
                            to: 95
                            stepSize: 1
                            suffix: "%"
                            value: Number(settingsRoot.s.smoothing)
                            enabled: true
                            onCommitted: nextValue => settingsRoot.patch("smoothing", nextValue)
                        }
                    }
                }
                SettingRow {
                    Layout.fillWidth: true
                    visible: true
                    title: "频率分布"
                    hint: ""
                    switchRow: false
                    editor: Component {
                        SelectSetting {
                            options: [
                                {
                                    "label": "对数",
                                    "value": "log"
                                },
                                {
                                    "label": "Mel",
                                    "value": "mel"
                                },
                                {
                                    "label": "线性",
                                    "value": "linear"
                                }
                            ]
                            value: settingsRoot.s.scale
                            onValueEdited: nextValue => settingsRoot.patch("scale", nextValue)
                        }
                    }
                }
            }
        }
    }
    RowLayout {
        Layout.fillWidth: true
        spacing: 16
        Label {
            Layout.fillWidth: true
            text: "恢复样式、显示位置和采样参数的初始设置。"
            font: Theme.font(12, Theme.regularWeight)
            color: Theme.floatingSecondaryText
            wrapMode: Text.Wrap
        }
        EchoButton {
            objectName: "spectrumResetSettings"
            text: "恢复默认"
            colors: Theme.floating
            onClicked: settingsRoot.pending = settingsRoot.plugin.executeCommand("settings.reset")
        }
    }
    Label {
        Layout.fillWidth: true
        visible: settingsRoot.errorMessage.length > 0
        text: settingsRoot.errorMessage
        wrapMode: Text.Wrap
        color: Theme.colors.danger
        font: Theme.font(12, Theme.regularWeight)
    }
}
