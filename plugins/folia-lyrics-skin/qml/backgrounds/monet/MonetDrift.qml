import QtQuick
import "drift.mjs" as Drift

Item {
    id: root
    default property alias contentData: transformed.data
    readonly property Item contentItem: transformed
    property bool live: true
    property bool motionEnabled: true
    property bool staticMode: false
    property bool driftEnabled: true
    property real strength: .5
    property real phase: 0
    readonly property bool moving: live && visible && motionEnabled && !staticMode && driftEnabled && strength > 0
    readonly property var track: moving ? Drift.prepareMonetDrift(strength) : null
    readonly property var pose: track ? Drift.sampleMonetDrift(track, phase) : Drift.MONET_DRIFT_IDENTITY
    readonly property int keyframeCount: track ? track.frames.length : 0
    readonly property bool animationRunning: phaseAnimation.running
    property bool _complete: false
    function restartAnimation() {
        if (!_complete)
            return;
        phaseAnimation.stop();
        phase = 0;
        phaseAnimation.to = track ? track.frames.length - 1 : 0;
        phaseAnimation.duration = track ? track.durationMs : 240000;
        if (moving)
            phaseAnimation.start();
    }
    onTrackChanged: restartAnimation()
    Component.onCompleted: {
        _complete = true;
        restartAnimation();
    }
    Item {
        id: transformed
        anchors.fill: parent
        transform: Matrix4x4 {
            matrix: Qt.matrix4x4(root.pose.scale, 0, 0, root.width * root.pose.xPercent / 100 + (1 - root.pose.scale) * root.width / 2, 0, root.pose.scale, 0, root.height * root.pose.yPercent / 100 + (1 - root.pose.scale) * root.height / 2, 0, 0, 1, 0, 0, 0, 0, 1)
        }
    }
    NumberAnimation {
        id: phaseAnimation
        target: root
        property: "phase"
        from: 0
        to: 156
        duration: 240000
        loops: Animation.Infinite
        easing.type: Easing.Linear
    }
}
