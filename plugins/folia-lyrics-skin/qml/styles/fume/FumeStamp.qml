// Gaussian convolution of the source's axis-aligned print rectangle is separable
// and analytic; stamps need no offscreen surface or CPU bitmap.
pragma ComponentBehavior: Bound
import QtQuick
import "frame.mjs" as Frame

ShaderEffect {
    id: root
    required property var command
    required property real cameraX
    required property real cameraY
    required property real cameraScale
    required property real viewportWidth
    required property real viewportHeight
    required property real devicePixelRatio
    readonly property real sigmaValue: command.blur / (2 * Math.max(devicePixelRatio, .001))
    readonly property real padding: Math.ceil(sigmaValue * 3 + 2)
    readonly property var fillValue: Frame.rgba(command.fill)
    readonly property var shadowValue: Frame.rgba(command.shadow)
    x: viewportWidth * .5 + (command.x - cameraX) * cameraScale - padding
    y: viewportHeight * .5 + (command.y - cameraY) * cameraScale - padding
    width: command.width * cameraScale + padding * 2
    height: command.height * cameraScale + padding * 2
    opacity: command.alpha
    property vector2d surfaceSize: Qt.vector2d(width, height)
    property vector2d bodySize: Qt.vector2d(command.width * cameraScale, command.height * cameraScale)
    property real sigma: sigmaValue
    property vector4d fill: Qt.vector4d(fillValue.r, fillValue.g, fillValue.b, fillValue.a)
    property vector4d shadow: Qt.vector4d(shadowValue.r, shadowValue.g, shadowValue.b, shadowValue.a)
    fragmentShader: "stamp.frag.qsb"
}
