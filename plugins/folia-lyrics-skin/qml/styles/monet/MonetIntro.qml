// Source cubic-bezier poster entrance, wall-clock presentation only.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property int revision: 0
    property bool live: true
    property bool motionEnabled: true
    property int delay: 0
    property int duration: 1200
    property real startX: 0
    property real startY: 0
    property real startScale: 1
    property real startRotation: 0
    property real progress: motionEnabled ? 0 : 1
    opacity: progress
    transform: [
        Translate {
            x: root.startX * (1 - root.progress)
            y: root.startY * (1 - root.progress)
        },
        Scale {
            xScale: root.startScale + (1 - root.startScale) * root.progress
            yScale: xScale
            origin.x: root.width / 2
            origin.y: root.height / 2
        },
        Rotation {
            angle: root.startRotation * (1 - root.progress)
            origin.x: root.width / 2
            origin.y: root.height / 2
        }
    ]
    function restart(): void {
        entrance.stop();
        if (!live)
            return;
        if (!motionEnabled) {
            progress = 1;
            return;
        }
        progress = 0;
        entrance.start();
    }
    onRevisionChanged: restart()
    onLiveChanged: restart()
    onMotionEnabledChanged: restart()
    Component.onCompleted: restart()
    SequentialAnimation {
        id: entrance
        PauseAnimation {
            duration: root.delay
        }
        NumberAnimation {
            target: root
            property: "progress"
            to: 1
            duration: root.duration
            easing.type: Easing.BezierSpline
            easing.bezierCurve: [.25, 1, .5, 1, 1, 1]
        }
    }
}
