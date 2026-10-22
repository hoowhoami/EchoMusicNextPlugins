pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Theme
import EchoMusic.Controls

ColumnLayout {
    id: root
    objectName: "foliaSettings"
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property AppearanceConfiguration configuration
    readonly property var settings: configuration.values
    spacing: 16
    enabled: configuration.active

    Label {
        Layout.fillWidth: true
        text: qsTr("Folia")
        color: Theme.floatingText
        font: root.plugin.fonts.build([], 18, 700)
    }
    Label {
        Layout.fillWidth: true
        text: qsTr("在播放页右上角切换样式。以下偏好在 Folia 样式间共用。")
        wrapMode: Text.Wrap
        color: Theme.floatingSecondaryText
        font: root.plugin.fonts.build([], 12)
    }
    Label {
        text: qsTr("播放控件")
        color: Theme.floatingText
    }
    EchoSelect {
        objectName: "foliaChromeVisibilityMode"
        Layout.fillWidth: true
        colors: Theme.floating
        options: [
            {
                label: qsTr("始终显示"),
                value: "always-visible"
            },
            {
                label: qsTr("自动隐藏"),
                value: "auto-hide"
            },
            {
                label: qsTr("始终隐藏"),
                value: "always-hidden"
            }
        ]
        value: root.settings.playerChromeVisibilityMode
        onValueEdited: nextValue => root.configuration.patch({
                playerChromeVisibilityMode: nextValue
            })
    }
    RowLayout {
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("显示歌词")
            color: Theme.floatingText
        }
        EchoSwitch {
            colors: Theme.floating
            checked: root.settings.showText
            onToggled: root.configuration.patch({
                showText: checked
            })
        }
    }
    RowLayout {
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("隐藏译文字幕")
            color: Theme.floatingText
        }
        EchoSwitch {
            colors: Theme.floating
            checked: root.settings.hideTranslationSubtitle
            onToggled: root.configuration.patch({
                hideTranslationSubtitle: checked
            })
        }
    }
    Label {
        text: qsTr("歌词字号")
        color: Theme.floatingText
    }
    EchoSlider {
        objectName: "foliaLyricsFontScale"
        Layout.fillWidth: true
        colors: Theme.floating
        from: 0.85
        to: 1.4
        stepSize: 0.01
        showValue: true
        value: root.settings.lyricsFontScale
        onMoved: root.configuration.patch({
            lyricsFontScale: value
        })
    }
    Label {
        text: qsTr("译文字号")
        color: Theme.floatingText
    }
    EchoSlider {
        objectName: "foliaSubtitleFontScale"
        Layout.fillWidth: true
        colors: Theme.floating
        from: 0.85
        to: 1.4
        stepSize: 0.01
        showValue: true
        value: root.settings.subtitleFontScale
        onMoved: root.configuration.patch({
            subtitleFontScale: value
        })
    }
    Label {
        text: qsTr("字体")
        color: Theme.floatingText
    }
    EchoSelect {
        objectName: "foliaFontFamilies"
        Layout.fillWidth: true
        colors: Theme.floating
        filterable: true
        multiple: true
        maxTagCount: 2
        options: [
            {
                label: qsTr("跟随宿主"),
                value: "follow"
            }
        ].concat(root.plugin.fonts.families.map(family => ({
                    label: family,
                    value: family
                })))
        value: root.settings.fontFamilies
        onValueEdited: nextValue => root.configuration.patch({
                fontFamilies: nextValue.length ? nextValue : ["follow"]
            })
    }
}
