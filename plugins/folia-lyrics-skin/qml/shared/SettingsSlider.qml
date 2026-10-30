// A held settings slider previews locally and commits once on release/unmount.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.Controls

EchoSlider {
    id: root
    signal editStarted()
    signal editCommitted()
    onPressedChanged: if (pressed)
        editStarted()
    else
        editCommitted()
    Component.onDestruction: if (pressed)
        editCommitted()
}
