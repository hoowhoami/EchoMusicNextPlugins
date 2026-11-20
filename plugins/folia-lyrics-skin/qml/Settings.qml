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
    property EchoPluginOperation opening: null
    spacing: 14
    Label {
        Layout.fillWidth: true
        text: qsTr("在歌词样式设置中选择样式、预览效果并调整参数。")
        wrapMode: Text.Wrap
        color: Theme.floatingSecondaryText
    }
    EchoSoftButton {
        objectName: "foliaOpenStyleStudio"
        Layout.fillWidth: true
        text: qsTr("歌词样式设置")
        colors: Theme.floating
        enabled: root.configuration.active && !root.opening
        onClicked: root.opening = root.plugin.executeCommand("folia.studio.open", {})
    }
    Connections {
        target: root.opening
        function onCompleted(): void {
            const operation = root.opening;
            root.opening = null;
            if (operation.state === EchoPluginOperation.Succeeded && operation.result === true)
                root.page.closeSkinSettings();
        }
    }
}
