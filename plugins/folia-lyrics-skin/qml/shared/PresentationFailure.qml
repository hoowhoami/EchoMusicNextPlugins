pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Controls
import EchoMusic.Theme

Rectangle {
    id: root
    property string detail: ""
    property string mode: ""
    property string message: qsTr("歌词效果暂时无法显示")
    property bool canRetry: true
    property bool showSettings: true
    signal retryRequested
    signal settingsRequested
    implicitHeight: content.implicitHeight + 32
    height: implicitHeight
    radius: 10
    color: Theme.floatingCard
    border.color: Theme.floating.border
    visible: detail.length > 0
    onDetailChanged: if (detail)
        console.warn("Folia presentation failed:", mode, detail)
    ColumnLayout {
        id: content
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12
        Label {
            Layout.fillWidth: true
            text: root.message
            textFormat: Text.PlainText
            wrapMode: Text.Wrap
            color: Theme.floating.text
        }
        RowLayout {
            spacing: 8
            EchoSoftButton {
                objectName: "foliaRenderRetry"
                text: qsTr("重试")
                enabled: root.canRetry
                colors: Theme.floating
                onClicked: root.retryRequested()
            }
            EchoSoftButton {
                objectName: "foliaRenderSettings"
                visible: root.showSettings
                text: qsTr("样式设置")
                colors: Theme.floating
                onClicked: root.settingsRequested()
            }
        }
    }
}
