pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    required property var gains
    required property var source
    property bool firstPass: false
    property bool lastPass: false
    property bool horizontal: false
    readonly property var output: texture
    readonly property bool valid: effect.status !== ShaderEffect.Error
    readonly property string errorString: effect.status === ShaderEffect.Error ? effect.log : ""
    ShaderEffect {
        id: effect
        anchors.fill: parent
        blending: false
        property var gains: root.gains
        property var source: root.source
        property vector2d direction: root.horizontal ? Qt.vector2d(1, 0) : Qt.vector2d(0, 1)
        property real firstPass: root.firstPass ? 1 : 0
        property real lastPass: root.lastPass ? 1 : 0
        fragmentShader: Qt.resolvedUrl("blur.frag.qsb")
    }
    ShaderEffectSource {
        id: texture
        sourceItem: effect
        sourceRect: Qt.rect(0, 0, root.width, root.height)
        textureSize: Qt.size(root.width, root.height)
        format: ShaderEffectSource.RGBA32F
        hideSource: true
        visible: false
        live: true
        smooth: true
    }
}
