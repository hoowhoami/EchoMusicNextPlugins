// Folia a8da4437 VisPlaygroundSettingsPanel: ownFontSizeNoticeKey disables this editor.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Theme

ColumnLayout {
    id: root
    property string mode: "classic"
    property real value: 1
    readonly property bool automatic: ["sonnet", "tempera", "lumiere"].indexOf(mode) >= 0
    signal valueEdited(real value)
    signal editStarted()
    signal editCommitted()
    spacing: 8
    Label {
        objectName: "foliaAutomaticFontSizeNotice"
        Layout.fillWidth: true
        visible: root.automatic
        text: qsTr("此样式根据歌词布局自动计算字号。")
        textFormat: Text.PlainText
        color: Theme.floatingSecondaryText
        wrapMode: Text.Wrap
    }
    SettingsSlider {
        objectName: "foliaLyricsFontScale"
        Layout.fillWidth: true
        colors: Theme.floating
        from: .85
        to: 1.4
        stepSize: .05
        showValue: true
        value: root.value
        enabled: !root.automatic
        onMoved: root.valueEdited(value)
        onEditStarted: root.editStarted()
        onEditCommitted: root.editCommitted()
    }
}
