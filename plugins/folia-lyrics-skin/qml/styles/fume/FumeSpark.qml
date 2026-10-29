// Only the small, glowing spark receives local GPU surfaces. Large gradient
// geometry is rendered directly by FumeVectorPath without intermediate textures.
pragma ComponentBehavior: Bound
import QtQuick
import "frame.mjs" as Frame
import "vector.mjs" as Vector

Item {
    id: root
    required property var command
    required property real devicePixelRatio
    readonly property var geometry: Vector.sparkGeometry(command, devicePixelRatio)
    readonly property real projectedScale: geometry.scale
    readonly property real angle: geometry.angle
    readonly property real sigma: geometry.sigma
    readonly property real extent: geometry.extent
    readonly property var shadow: Frame.rgba(command.shadow)
    readonly property real textureBytes: geometry.bytes
    x: command.matrix[4] - extent
    y: command.matrix[5] - extent
    width: geometry.size
    height: width
    Item {
        id: ink
        anchors.fill: parent
        FumeVectorPath {
            x: root.extent
            y: root.extent
            scale: root.projectedScale
            rotation: root.angle * 180 / Math.PI
            transformOrigin: Item.TopLeft
            command: root.command
        }
    }
    ShaderEffectSource {
        id: inkTexture
        sourceItem: ink
        hideSource: true
        visible: false
        textureSize: Qt.size(Math.max(1, Math.ceil(root.width * root.devicePixelRatio)), Math.max(1, Math.ceil(root.height * root.devicePixelRatio)))
        smooth: false
    }
    ShaderEffect {
        id: horizontal
        anchors.fill: parent
        property var source: inkTexture
        property vector2d direction: Qt.vector2d(1 / Math.max(1, root.width * root.devicePixelRatio), 0)
        property real sigma: root.sigma * root.devicePixelRatio
        fragmentShader: "shadow-pass.frag.qsb"
    }
    ShaderEffectSource {
        id: blurredTexture
        sourceItem: horizontal
        hideSource: true
        visible: false
        textureSize: inkTexture.textureSize
        smooth: false
    }
    ShaderEffect {
        anchors.fill: parent
        property var source: blurredTexture
        property var inkSource: inkTexture
        property vector2d direction: Qt.vector2d(0, 1 / Math.max(1, root.height * root.devicePixelRatio))
        property real sigma: root.sigma * root.devicePixelRatio
        property vector4d shadow: Qt.vector4d(root.shadow.r, root.shadow.g, root.shadow.b, root.shadow.a)
        fragmentShader: "shadow-compose.frag.qsb"
    }
}
