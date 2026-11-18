pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Controls
import EchoMusic.Theme

ColumnLayout {
    id: root
    required property var styles
    required property var settings
    property bool wide: true
    signal selected(string mode)
    readonly property var choices: styles.concat([
        {
            id: "__random__",
            title: qsTr("随机")
        }
    ])
    spacing: 8
    Label {
        text: qsTr("歌词样式 · %1").arg(root.styles.length)
        color: Theme.floatingSecondaryText
        font: Theme.font(13, 600)
    }
    GridView {
        id: grid
        objectName: "foliaStudioStyleShelf"
        Layout.fillWidth: true
        Layout.fillHeight: true
        Layout.minimumHeight: 150
        clip: true
        model: root.choices
        cellWidth: width / (root.wide ? 7 : 4)
        cellHeight: cellWidth * .6 + 28
        boundsBehavior: Flickable.StopAtBounds
        reuseItems: true
        delegate: EchoActionButton {
            id: choice
            required property var modelData
            required property int index
            objectName: "foliaStudioStyle-" + modelData.id
            width: grid.cellWidth
            height: grid.cellHeight
            readonly property bool selected: root.settings.randomVisualizerModePerSong ? modelData.id === "__random__" : modelData.id === root.settings.mode
            text: modelData.title
            onClicked: root.selected(modelData.id)
            background: Rectangle {
                anchors.fill: parent
                anchors.margins: 3
                radius: Theme.itemRadius
                color: choice.selected ? Theme.floating.selected : choice.hovered ? Theme.floating.mutedSurface : Theme.floating.card
                border.width: 1
                border.color: choice.selected ? Theme.floating.accent : Theme.floatingBorder
            }
            contentItem: ColumnLayout {
                spacing: 3
                Image {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    source: choice.modelData.id === "__random__" ? "" : Qt.resolvedUrl("../../assets/previews/" + choice.modelData.id + ".png")
                    asynchronous: true
                    sourceSize: Qt.size(280, 180)
                    fillMode: Image.PreserveAspectFit
                    visible: choice.modelData.id !== "__random__"
                }
                EchoIcon {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    name: "shuffle"
                    color: Theme.floating.accent
                    visible: choice.modelData.id === "__random__"
                }
                Label {
                    Layout.fillWidth: true
                    text: choice.text
                    horizontalAlignment: Text.AlignHCenter
                    color: Theme.floatingText
                    font: Theme.font(12, choice.selected ? 600 : 400)
                }
            }
        }
        ScrollBar.vertical: EchoScrollBar {
            wheelView: grid
        }
    }
}
