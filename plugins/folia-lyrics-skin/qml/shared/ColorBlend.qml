// Folia useBlendedColors easeOut(t)=1-(1-t)^3, with native color animation.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    required property color targetColor
    property int durationMs: 0
    property int easingType: Easing.OutCubic
    property var easingCurve: []
    property bool live: true
    property bool motionEnabled: true
    property color value: targetColor
    property bool _completed: false
    function retarget(): void {
        transition.stop();
        if (!_completed || !live || !motionEnabled || durationMs <= 0)
            value = targetColor;
        else {
            transition.from = value;
            transition.to = targetColor;
            transition.restart();
        }
    }
    onTargetColorChanged: retarget()
    onLiveChanged: if (!live)
        retarget()
    onMotionEnabledChanged: if (!motionEnabled)
        retarget()
    onDurationMsChanged: if (durationMs <= 0)
        retarget()
    Component.onCompleted: {
        value = targetColor;
        _completed = true;
    }
    ColorAnimation {
        id: transition
        target: root
        property: "value"
        duration: root.durationMs
        easing.type: root.easingType
        easing.bezierCurve: root.easingCurve
    }
}
