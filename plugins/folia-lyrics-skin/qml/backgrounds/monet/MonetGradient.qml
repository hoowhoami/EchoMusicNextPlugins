// Original CSS fallback/readability gradients; no intermediate texture.
pragma ComponentBehavior: Bound
import QtQuick

ShaderEffect {
    id: root
    property color backgroundColor: '#111111'
    property color primaryColor: 'white'
    property color accentColor: '#8fb7ff'
    property bool halfPane: false
    property bool overlay: false
    property vector2d frameSize: Qt.vector2d(width, height)
    property vector4d background: Qt.vector4d(backgroundColor.r, backgroundColor.g, backgroundColor.b, backgroundColor.a)
    property vector4d primary: Qt.vector4d(primaryColor.r, primaryColor.g, primaryColor.b, primaryColor.a)
    property vector4d accent: Qt.vector4d(accentColor.r, accentColor.g, accentColor.b, accentColor.a)
    property real paneMode: halfPane ? 1 : 0
    property real overlayPass: overlay ? 1 : 0
    fragmentShader: Qt.resolvedUrl('scene-gradient.frag.qsb')
}
