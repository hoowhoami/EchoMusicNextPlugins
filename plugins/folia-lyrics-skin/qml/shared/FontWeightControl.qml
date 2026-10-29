// Folia a8da4437 VisPlaygroundSettingsPanel: nullable weight + remembered manual slider.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Controls
import EchoMusic.Theme

ColumnLayout {
    id: root
    property var weight: null
    property bool subtitle: false
    property real _manualWeight: 400
    readonly property bool automatic: weight === null || weight === undefined
    readonly property string controlPrefix: subtitle ? "foliaSubtitleFontWeight" : "foliaFontWeight"
    signal weightEdited(var value)
    signal editStarted()
    signal editCommitted()
    spacing: 8
    onWeightChanged: if (Number.isFinite(weight))
        _manualWeight = weight
    RowLayout {
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("自动字重")
            color: Theme.floatingText
        }
        EchoSwitch {
            objectName: root.controlPrefix + "Auto"
            colors: Theme.floating
            checked: root.automatic
            onToggled: root.weightEdited(checked ? null : root._manualWeight)
        }
    }
    Loader {
        Layout.fillWidth: true
        active: !root.automatic
        sourceComponent: SettingsSlider {
            objectName: root.controlPrefix
            colors: Theme.floating
            from: 100
            to: 900
            stepSize: 10
            showValue: true
            value: root._manualWeight
            onMoved: {
                root._manualWeight = value;
                root.weightEdited(value);
            }
            onEditStarted: root.editStarted()
            onEditCommitted: root.editCommitted()
        }
    }
    Component.onCompleted: if (Number.isFinite(weight))
        _manualWeight = weight
}
