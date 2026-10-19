pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Theme

Rectangle {
    id: section
    property string heading: ""
    property string subtitle: ""
    property Component body
    radius: 16
    color: Theme.floating.elevated
    border.color: Theme.floatingBorder
    implicitHeight: layout.implicitHeight
    ColumnLayout {
        id: layout
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        spacing: 0
        ColumnLayout {
            Layout.fillWidth: true
            Layout.leftMargin: 18
            Layout.rightMargin: 18
            Layout.topMargin: 15
            Layout.bottomMargin: 12
            spacing: 3
            Label {
                Layout.fillWidth: true
                text: section.heading
                font: Theme.font(13, 700)
                color: Theme.floatingText
            }
            Label {
                Layout.fillWidth: true
                text: section.subtitle
                font: Theme.font(12, Theme.regularWeight)
                color: Theme.floatingSecondaryText
                wrapMode: Text.Wrap
            }
        }
        Loader {
            Layout.fillWidth: true
            sourceComponent: section.body
        }
    }
}
