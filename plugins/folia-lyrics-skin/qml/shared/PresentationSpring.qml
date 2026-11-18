// Seconds-based spring for UI geometry. Never advances playback time.
pragma ComponentBehavior: Bound
import QtQuick

QtObject {
    id: root
    property real targetValue: 0
    property real stiffness: 280
    property real damping: 28
    property bool enabled: true
    property real value: 0
    property real velocity: 0
    property bool running: false
    property bool ready: false
    function settle(): void {
        value = targetValue;
        velocity = 0;
        running = false;
    }
    function startFrom(origin: real): void {
        value = origin;
        velocity = 0;
        running = enabled;
        if (!enabled)
            settle();
    }
    function advance(seconds: real): void {
        if (!running || !Number.isFinite(seconds) || seconds <= 0)
            return;
        const decay = damping / 2;
        const discriminant = stiffness - decay * decay;
        const displacement = value - targetValue;
        let motion;
        let speed;
        if (discriminant > .000001) {
            const frequency = Math.sqrt(discriminant);
            const sineWeight = (velocity + decay * displacement) / frequency;
            const sine = Math.sin(frequency * seconds);
            const cosine = Math.cos(frequency * seconds);
            const attenuation = Math.exp(-decay * seconds);
            motion = attenuation * (displacement * cosine + sineWeight * sine);
            speed = attenuation * (-decay * (displacement * cosine + sineWeight * sine) + frequency * (-displacement * sine + sineWeight * cosine));
        } else if (discriminant < -.000001) {
            const frequency = Math.sqrt(-discriminant);
            const first = -decay + frequency;
            const second = -decay - frequency;
            const a = (velocity - second * displacement) / (first - second);
            const b = displacement - a;
            motion = a * Math.exp(first * seconds) + b * Math.exp(second * seconds);
            speed = first * a * Math.exp(first * seconds) + second * b * Math.exp(second * seconds);
        } else {
            const b = velocity + decay * displacement;
            const attenuation = Math.exp(-decay * seconds);
            motion = (displacement + b * seconds) * attenuation;
            speed = (b - decay * (displacement + b * seconds)) * attenuation;
        }
        velocity = speed;
        value = targetValue + motion;
        if (Math.abs(value - targetValue) < .01 && Math.abs(velocity) < .01)
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
    property FrameAnimation animation: FrameAnimation {
        running: root.enabled && root.running
        onTriggered: root.advance(frameTime)
    }
}
