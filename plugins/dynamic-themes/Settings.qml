pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme

ColumnLayout {
    id: root
    objectName: "dynamicThemeSettings"
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property AppearanceConfiguration configuration
    spacing: 16
    RowLayout {
        objectName: "dynamicThemeEnabledRow"
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("动态效果")
            font: Theme.font(13, Theme.regularWeight)
            color: Theme.floatingText
        }
        EchoSwitch {
            objectName: "dynamicThemeEnabled"
            checked: root.configuration.values.enabled
            enabled: !root.configuration.busy
            onToggled: root.configuration.patch({
                enabled: checked
            })
        }
    }
    RowLayout {
        objectName: "dynamicThemeSpeedRow"
        Layout.fillWidth: true
        spacing: 16
        Label {
            objectName: "dynamicThemeSpeedLabel"
            Layout.preferredWidth: 104
            text: qsTr("动画速度")
            font: Theme.font(13, Theme.regularWeight)
            color: Theme.floatingText
        }
        EchoSlider {
            id: speed
            objectName: "dynamicThemeSpeed"
            Layout.fillWidth: true
            from: 0.5
            to: 2
            stepSize: 0.1
            value: root.configuration.values.speed
            enabled: !root.configuration.busy
            onPressedChanged: if (!pressed)
                root.configuration.patch({
                    speed: value
                })
            Keys.onReleased: event => {
                root.configuration.patch({
                    speed: value
                });
                event.accepted = true;
            }
        }
        Label {
            Layout.preferredWidth: 42
            text: speed.value.toFixed(1) + "×"
            horizontalAlignment: Text.AlignRight
            font: Theme.font(12, Theme.regularWeight)
            color: Theme.floatingSecondaryText
        }
    }
}
