pragma ComponentBehavior: Bound
import QtQuick

ShaderEffect {
    property var source: null
    property vector2d uvOffset: Qt.vector2d(0, 0)
    property vector2d uvScale: Qt.vector2d(1, 1)
    visible: source !== null
    readonly property real cacheBytes: 0
    fragmentShader: Qt.resolvedUrl('texture.frag.qsb')
}
