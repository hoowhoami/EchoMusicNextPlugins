// Folia CONTROL_LAYOUT_SPRING, a8da4437 (AGPL-3.0).
// Qt SpringAnimation uses different units. Solve x'' + 24x' + 280x = 0
// in seconds instead, preserving momentum when the layout target changes.
pragma ComponentBehavior: Bound
import QtQuick

QtObject {
    id: root
    property real targetValue: 0
    property bool enabled: true
    readonly property real stiffness: 280
    readonly property real damping: 24
    property real value: 0
    property real velocity: 0
    property bool running: false
    property bool ready: false
    property FrameAnimation animation: FrameAnimation {
        running: root.running && root.enabled
        onTriggered: root.advance(frameTime)
    }
    function settle(): void {
        value = targetValue;
        velocity = 0;
        running = false;
    }
    function advance(seconds: real): void {
        if (!running || !Number.isFinite(seconds) || seconds <= 0)
            return;
        const decay = damping / 2;
        const frequency = Math.sqrt(stiffness - decay * decay);
        const displacement = value - targetValue;
        const sineWeight = (velocity + decay * displacement) / frequency;
        const sine = Math.sin(frequency * seconds);
        const cosine = Math.cos(frequency * seconds);
        const attenuation = Math.exp(-decay * seconds);
        const motion = displacement * cosine + sineWeight * sine;
        velocity = attenuation * (-decay * motion + frequency * (-displacement * sine + sineWeight * cosine));
        value = targetValue + attenuation * motion;
        if (Math.abs(value - targetValue) < 0.01 && Math.abs(velocity) < 0.01)
            settle();
    }
    onTargetValueChanged: if (!ready || !enabled)
        settle()
    else
        running = true
    onEnabledChanged: if (!enabled)
        settle()
    Component.onCompleted: {
        ready = true;
        settle();
    }
}
