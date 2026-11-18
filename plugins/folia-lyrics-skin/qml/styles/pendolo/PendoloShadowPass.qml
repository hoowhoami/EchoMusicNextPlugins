// One CSS drop-shadow: separable Gaussian sigma in logical pixels, source-over body.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property var input
    property real sigma: 4
    property color tint: "white"
    property real strength: .65
    property bool live: true
    property bool present: true
    readonly property var output: outputTexture
    readonly property real pixelRatio: Screen.devicePixelRatio
    ShaderEffect {
        id: horizontal
        anchors.fill: parent
        visible: false
        property var source: root.input
        property vector2d direction: Qt.vector2d(1 / Math.max(1, width), 0)
        property real sigma: root.sigma
        property real pixelRatio: root.pixelRatio
        fragmentShader: Qt.resolvedUrl("gaussian.frag.qsb")
    }
    ShaderEffectSource {
        id: hTexture
        sourceItem: horizontal
        live: root.live
        hideSource: true
        textureSize: Qt.size(Math.ceil(root.width * root.pixelRatio), Math.ceil(root.height * root.pixelRatio))
        visible: false
    }
    ShaderEffect {
        id: vertical
        anchors.fill: parent
        visible: false
        property var source: hTexture
        property vector2d direction: Qt.vector2d(0, 1 / Math.max(1, height))
        property real sigma: root.sigma
        property real pixelRatio: root.pixelRatio
        fragmentShader: Qt.resolvedUrl("gaussian.frag.qsb")
    }
    ShaderEffectSource {
        id: vTexture
        sourceItem: vertical
        live: root.live
        hideSource: true
        textureSize: hTexture.textureSize
        visible: false
    }
    ShaderEffect {
        id: composite
        anchors.fill: parent
        visible: root.present
        property var source: root.input
        property var blurred: vTexture
        property color tint: root.tint
        property real strength: root.strength
        fragmentShader: Qt.resolvedUrl("shadow.frag.qsb")
    }
    ShaderEffectSource {
        id: outputTexture
        sourceItem: composite
        live: root.live
        hideSource: !root.present
        textureSize: hTexture.textureSize
        visible: false
    }
}
