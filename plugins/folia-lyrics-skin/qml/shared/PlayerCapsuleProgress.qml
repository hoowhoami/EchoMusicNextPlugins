// Folia ProgressBar, a8da4437 (AGPL-3.0), using the host's accessible slider.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme

Item {
    id: root
    required property EchoPluginViewContext page
    property bool controlsEnabled: true
    property color primaryColor: Theme.floating.text
    property color secondaryColor: Theme.floating.secondaryText
    property color trackColor: Qt.rgba(1, 1, 1, 0.1)
    property font baseFont: Theme.font(10, Theme.mediumWeight)
    readonly property real positionMs: page ? page.player.positionMs : 0
    readonly property real durationMs: page ? page.player.durationMs : 0
    readonly property string revision: page ? page.player.revision : ""
    property real heldFraction: 0
    signal operationIssued(var operation)
    implicitHeight: 15
    function time(milliseconds: real): string {
        const seconds = Number.isFinite(milliseconds) ? Math.max(0, Math.floor(milliseconds / 1000)) : 0;
        return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
    }
    function rememberFraction(): void {
        if (durationMs > 0 && !slider.pressed)
            heldFraction = Math.max(0, Math.min(1, positionMs / durationMs));
    }
    function seek(value: real): void {
        if (page && page.active && controlsEnabled && durationMs > 0)
            operationIssued(page.command("seek", {
                value: Math.max(0, Math.round(value)),
                revision: slider.dragRevision || revision
            }));
    }
    onPositionMsChanged: rememberFraction()
    onDurationMsChanged: rememberFraction()
    Component.onCompleted: rememberFraction()
    Label {
        id: currentTime
        width: 32
        anchors.left: parent.left
        anchors.verticalCenter: parent.verticalCenter
        text: root.time(slider.pressed ? slider.value : root.positionMs)
        horizontalAlignment: Text.AlignRight
        textFormat: Text.PlainText
        color: root.secondaryColor
        opacity: 0.6
        font: root.baseFont
    }
    EchoSlider {
        id: slider
        objectName: "foliaCapsuleSeek"
        property string dragRevision: ""
        property int gesture: 0
        property real scrubPosition: 0
        anchors.left: currentTime.right
        anchors.right: totalTime.left
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        anchors.verticalCenter: parent.verticalCenter
        height: 15
        implicitHeight: 15
        topPadding: 0
        bottomPadding: 0
        leftPadding: 0
        rightPadding: 0
        progress: true
        enabled: root.controlsEnabled && root.page && root.page.active && root.page.player.hasTrack && root.durationMs > 0
        from: 0
        to: Math.max(1, root.durationMs)
        stepSize: 100
        Accessible.name: qsTr("播放进度")
        onPressedChanged: if (pressed) {
            ++gesture;
            gestureReset.stop();
            dragRevision = root.revision;
            scrubPosition = value;
        } else {
            root.seek(scrubPosition);
            gestureReset.completedGesture = gesture;
            gestureReset.restart();
        }
        onMoved: {
            scrubPosition = value;
            if (!pressed)
                root.seek(value);
        }
        Binding {
            target: slider
            property: "value"
            value: root.positionMs
            when: !slider.pressed
            restoreMode: Binding.RestoreBindingOrValue
        }
        background: Rectangle {
            x: slider.leftPadding
            y: slider.topPadding + slider.availableHeight / 2 - height / 2
            width: slider.availableWidth
            height: 6
            radius: 3
            color: root.trackColor
            Rectangle {
                width: (root.durationMs > 0 ? slider.visualPosition : root.heldFraction) * parent.width
                height: parent.height
                radius: parent.radius
                color: root.primaryColor
            }
        }
        // The reference's thumb exists but stays transparent unless a plugin styles it.
        handle: Item {}
    }
    Timer {
        id: gestureReset
        interval: 0
        property int completedGesture: -1
        onTriggered: if (!slider.pressed && completedGesture === slider.gesture)
            slider.dragRevision = ""
    }
    Label {
        id: totalTime
        width: 32
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        text: root.time(root.durationMs)
        textFormat: Text.PlainText
        color: root.secondaryColor
        opacity: 0.6
        font: root.baseFont
    }
}
