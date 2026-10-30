// A true source texture frame, including neighbouring glyph overhang inside the slice.
pragma ComponentBehavior: Bound
import QtQuick

ShaderEffect {
    id: root
    required property var source
    required property var texture
    property color tint: "white"
    property rect frame: Qt.rect(0, 0, texture.width, texture.height)
    property vector4d uUvRect: Qt.vector4d(frame.x / texture.width, frame.y / texture.height, frame.width / texture.width, frame.height / texture.height)
    property vector3d uTint: Qt.vector3d(tint.r, tint.g, tint.b)
    width: frame.width
    height: frame.height
    fragmentShader: Qt.resolvedUrl('texture-slice.frag.qsb')
}
