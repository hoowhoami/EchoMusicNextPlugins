pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Theme

Item {
    id: row
    objectName: "spectrumSettingsRow"
    property string title: ""
    property string hint: ""
    property bool switchRow: false
    property bool divider: true
    readonly property bool followsVisibleRow: {
        if (!parent)
            return false;
        let previous = false;
        for (const sibling of parent.children) {
            if (sibling === row)
                return previous;
            previous = previous || sibling.visible;
        }
        return false;
    }
    property Component editor
    implicitHeight: Math.max(58, 20 + Math.max(copy.implicitHeight, control.implicitHeight))
    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 18
        anchors.rightMargin: 18
        anchors.topMargin: 10
        anchors.bottomMargin: 10
        spacing: 24
        ColumnLayout {
            id: copy
            Layout.fillWidth: true
            Layout.minimumWidth: 0
            spacing: 2
            Label {
                Layout.fillWidth: true
                text: row.title
                color: Theme.floatingText
                font: Theme.font(13, 650)
                wrapMode: Text.Wrap
                lineHeight: 1.35
            }
            Label {
                Layout.fillWidth: true
                visible: row.hint.length > 0
                text: row.hint
                color: Theme.floatingSecondaryText
                font: Theme.font(12, Theme.regularWeight)
                wrapMode: Text.Wrap
                lineHeight: 1.4
            }
        }
        Loader {
            id: control
            Layout.preferredWidth: row.switchRow ? 44 : Math.min(250, Math.max(120, row.width * .46))
            Layout.fillHeight: false
            sourceComponent: row.editor
        }
    }
    Rectangle {
        objectName: "spectrumSettingsDivider"
        visible: row.divider && row.followsVisibleRow
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        height: 1
        color: Theme.floatingBorder
    }
}
