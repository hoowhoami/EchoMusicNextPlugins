pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Controls
import EchoMusic.Theme

RowLayout {
    id: row
    property real value: 0
    property real from: 0
    property real to: 100
    property real stepSize: 1
    property string suffix: "%"
    signal committed(real nextValue)
    spacing: 10
    EchoSlider {
        id: slider
        Layout.fillWidth: true
        from: row.from
        to: row.to
        stepSize: row.stepSize
        value: row.value
        onPressedChanged: if (!pressed)
            row.committed(value)
        Keys.onReleased: event => {
            row.committed(value);
            event.accepted = true;
        }
    }
    Label {
        Layout.preferredWidth: 45
        horizontalAlignment: Text.AlignRight
        text: Math.round(slider.value) + row.suffix
        font: Theme.font(12, Theme.regularWeight)
        color: Theme.floatingSecondaryText
    }
}
