pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    required property bool animated
    required property real speed
    required property url atlas
    required property var layers
    Item {
        id: stage
        width: 1380
        height: 780
        scale: Math.max(root.width / width, root.height / height)
        anchors.centerIn: parent
        Repeater {
            model: root.layers
            Item {
                id: sprite
                required property var modelData
                property real phase: 0
                readonly property real progress: modelData.linear ? phase : 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
                readonly property real angle: modelData.start + (modelData.end - modelData.start) * progress
                width: modelData.crop[2]
                height: modelData.crop[3]
                x: modelData.x + (modelData.mode === "translate" ? modelData.travel[0] * progress : 0)
                y: modelData.y + (modelData.mode === "translate" ? modelData.travel[1] * progress : 0)
                NumberAnimation on phase {
                    from: 0
                    to: 1
                    duration: Math.max(1, sprite.modelData.duration * (sprite.modelData.linear ? 1 : 2) / root.speed)
                    loops: Animation.Infinite
                    running: root.animated && sprite.modelData.duration > 0
                }
                transform: [
                    Rotation {
                        origin.x: sprite.modelData.pivot[0]
                        origin.y: sprite.modelData.pivot[1]
                        angle: sprite.modelData.mode === "rotate" ? sprite.angle : 0
                    },
                    Matrix4x4 {
                        readonly property real shear: sprite.modelData.mode === "skew" ? Math.tan(sprite.angle * Math.PI / 180) : 0
                        matrix: Qt.matrix4x4(1, shear, 0, -shear * sprite.modelData.pivot[1], 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
                    }
                ]
                Image {
                    anchors.fill: parent
                    source: root.atlas
                    sourceClipRect: Qt.rect(sprite.modelData.crop[0], sprite.modelData.crop[1], sprite.width, sprite.height)
                    asynchronous: true
                }
            }
        }
    }
}
