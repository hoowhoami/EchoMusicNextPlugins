// Folia volume surface, a8da4437 (AGPL-3.0). Uses the existing scoped volume command.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme

Item {
    id: root
    required property EchoPluginViewContext page
    property var appearance: ({})
    property font baseFont: Theme.font(14, 500)
    property bool dragging: false
    property real sliderVolume: page ? Math.min(100, page.player.volume) : 0
    property var lastOperation: null
    property string errorMessage: ""
    readonly property color primaryColor: appearance.text !== undefined ? appearance.text : Theme.floating.text
    readonly property color secondaryColor: appearance.secondaryText !== undefined ? appearance.secondaryText : Theme.floating.secondaryText
    readonly property bool daylight: appearance.dark !== undefined ? !appearance.dark : !Theme.dark
    signal closeRequested
    signal operationIssued(var operation)
    focus: true
    Component.onCompleted: forceActiveFocus()
    Keys.onEscapePressed: event => {
        root.closeRequested();
        event.accepted = true;
    }
    function issue(command: string, args: var): void {
        if (!page || !page.active)
            return;
        errorMessage = "";
        lastOperation = page.command(command, args || {});
        operationIssued(lastOperation);
        inspectResult();
    }
    function inspectResult(): void {
        if (lastOperation && lastOperation.state === EchoPluginOperation.Failed)
            errorMessage = lastOperation.errorMessage || qsTr("操作未完成");
    }
    function setVolume(value: real): void {
        sliderVolume = value;
        issue("volume", {
            value: Math.round(value)
        });
    }
    Connections {
        target: root.lastOperation
        function onCompleted(): void {
            root.inspectResult();
        }
    }
    Connections {
        target: root.page ? root.page.player : null
        function onChanged(): void {
            if (!root.dragging && root.page)
                root.sliderVolume = Math.min(100, root.page.player.volume);
        }
    }
    Rectangle {
        anchors.fill: parent
        color: Qt.rgba(0, 0, 0, .6)
    }
    MouseArea {
        anchors.fill: parent
        onClicked: root.closeRequested()
    }
    FoliaFont {
        id: headingFont
        base: root.baseFont
        pixelSize: 16
        weight: 500
    }
    FoliaFont {
        id: hintFont
        base: root.baseFont
        pixelSize: 12
        weight: 400
    }
    EchoFloatingSurface {
        objectName: "foliaCapsulePanel"
        anchors.centerIn: parent
        width: Math.max(0, Math.min(512, root.width - 32))
        height: Math.min(root.height - 32, content.implicitHeight + 64)
        radius: 16
        color: root.daylight ? Qt.rgba(1, 1, 1, .7) : Qt.rgba(0, 0, 0, .4)
        border.color: root.daylight ? Qt.rgba(0, 0, 0, .05) : Qt.rgba(1, 1, 1, .1)
        MouseArea {
            anchors.fill: parent
        }
        Flickable {
            anchors.fill: parent
            anchors.margins: 24
            contentHeight: content.implicitHeight
            clip: true
            boundsBehavior: Flickable.StopAtBounds
            ColumnLayout {
                id: content
                width: parent.width
                spacing: 24
                RowLayout {
                    Layout.fillWidth: true
                    EchoIcon {
                        Layout.preferredWidth: 22
                        Layout.preferredHeight: 22
                        name: "volume"
                        color: root.primaryColor
                    }
                    Label {
                        Layout.fillWidth: true
                        text: qsTr("音量")
                        textFormat: Text.PlainText
                        color: root.primaryColor
                        font: headingFont.value
                    }
                    EchoIconButton {
                        objectName: "foliaCapsulePanelClose"
                        glyph: "x"
                        text: qsTr("关闭")
                        foreground: root.primaryColor
                        onClicked: root.closeRequested()
                    }
                }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    RowLayout {
                        Layout.fillWidth: true
                        EchoSlider {
                            id: volumeSlider
                            objectName: "foliaCapsuleVolumeSlider"
                            Layout.fillWidth: true
                            from: 0
                            to: 100
                            stepSize: 1
                            value: root.sliderVolume
                            enabled: root.page && root.page.active
                            onMoved: root.setVolume(value)
                            onPressedChanged: root.dragging = pressed
                            Accessible.name: qsTr("音量百分比")
                        }
                        Label {
                            text: Math.round(root.sliderVolume) + "%"
                            color: root.primaryColor
                            font: headingFont.value
                        }
                    }
                    Label {
                        Layout.fillWidth: true
                        text: qsTr("使用宿主当前音量，调整后立即生效。")
                        textFormat: Text.PlainText
                        wrapMode: Text.Wrap
                        color: root.secondaryColor
                        font: hintFont.value
                    }
                }
                Label {
                    objectName: "foliaCapsulePanelError"
                    visible: text.length > 0
                    Layout.fillWidth: true
                    text: root.errorMessage
                    textFormat: Text.PlainText
                    color: Theme.floating.dangerText
                    font: hintFont.value
                    wrapMode: Text.Wrap
                }
            }
        }
    }
}
