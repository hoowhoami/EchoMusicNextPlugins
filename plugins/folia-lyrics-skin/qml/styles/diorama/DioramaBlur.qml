pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property var source: null
    property real sigma: 10.24
    property bool live: true
    readonly property var statuses: [horizontal.status, vertical.status, live]
    readonly property var output: verticalTexture
    readonly property bool ready: horizontal.status !== ShaderEffect.Error && vertical.status !== ShaderEffect.Error
    readonly property real cacheBytes: width * height * 8
    ShaderEffect {
        id: horizontal
        anchors.fill: parent
        property var source: root.source
        property vector2d stepUv: Qt.vector2d(1 / root.width, 0)
        property real sigma: root.sigma
        fragmentShader: Qt.resolvedUrl('blur.frag.qsb')
    }
    ShaderEffectSource {
        id: horizontalTexture
        sourceItem: horizontal
        hideSource: true
        visible: false
        live: root.live
        textureSize: Qt.size(root.width, root.height)
    }
    ShaderEffect {
        id: vertical
        anchors.fill: parent
        property var source: horizontalTexture
        property vector2d stepUv: Qt.vector2d(0, 1 / root.height)
        property real sigma: root.sigma
        fragmentShader: Qt.resolvedUrl('blur.frag.qsb')
    }
    ShaderEffectSource {
        id: verticalTexture
        sourceItem: vertical
        hideSource: true
        visible: false
        live: root.live
        textureSize: Qt.size(root.width, root.height)
    }
}
