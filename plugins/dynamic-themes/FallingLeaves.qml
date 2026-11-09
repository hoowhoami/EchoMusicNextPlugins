pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    required property bool animated
    required property real speed
    property real phase: 0
    NumberAnimation on phase {
        from: 0
        to: 1
        duration: 16000 / root.speed
        loops: Animation.Infinite
        running: root.animated
    }
    // Eight staggered leaves: 15 seconds visible, one second offscreen.
    Repeater {
        model: 8
        Image {
            required property int index
            readonly property real age: (root.phase + index / 8) % 1
            readonly property real start: root.width * ((index * 0.137 + 0.08) % 1)
            x: start - root.width * 0.25 * age + 22 * Math.sin(age * Math.PI * 2 + index)
            y: -90 + (root.height + 180) * age / (15 / 16)
            width: 43 * (1.2 + 0.8 * index / 7)
            height: width * sourceSize.height / Math.max(1, sourceSize.width)
            source: "assets/autumn/leaf.png"
            sourceSize: Qt.size(128, 128)
            rotation: age * (index % 2 ? 360 : -280)
            opacity: Math.min(0.9, age / 0.12 * 0.9, Math.max(0, (15 / 16 - age) / 0.1125 * 0.9))
        }
    }
}
