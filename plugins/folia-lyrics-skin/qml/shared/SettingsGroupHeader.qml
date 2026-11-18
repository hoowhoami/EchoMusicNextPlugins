pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Controls
import EchoMusic.Theme

RowLayout {
    id: root
    required property string title
    property var resetValues: ({})
    signal resetRequested(var patch)
    Layout.fillWidth: true
    Label {
        Layout.fillWidth: true
        text: root.title
        color: Theme.floatingText
        font: Theme.font(14, 600)
    }
    EchoSoftButton {
        objectName: root.objectName + "Reset"
        colors: Theme.floating
        text: qsTr("复位")
        enabled: Object.keys(root.resetValues).length > 0
        onClicked: root.resetRequested(JSON.parse(JSON.stringify(root.resetValues)))
    }
}
