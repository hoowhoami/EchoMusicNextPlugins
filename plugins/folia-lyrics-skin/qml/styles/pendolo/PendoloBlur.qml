// Separable Gaussian for the source CSS blur() of the chorus background.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property Item source
    property real sigma: 10
    property bool live: true
    readonly property int padding: Math.ceil(sigma * 3) + 2
    Item {
        x: -root.padding
        y: -root.padding
        width: root.width + 2 * root.padding
        height: root.height + 2 * root.padding
        ShaderEffectSource {
            id: input
            sourceItem: root.source
            sourceRect: Qt.rect(-root.padding, -root.padding, parent.width, parent.height)
            textureSize: Qt.size(Math.ceil(parent.width * Screen.devicePixelRatio), Math.ceil(parent.height * Screen.devicePixelRatio))
            live: root.live
            hideSource: true
            visible: false
        }
        ShaderEffect {
            id: horizontal
            anchors.fill: parent
            visible: false
            property var source: input
            property vector2d direction: Qt.vector2d(1 / Math.max(width, 1), 0)
            property real sigma: root.sigma
            property real pixelRatio: Screen.devicePixelRatio
            fragmentShader: Qt.resolvedUrl("gaussian.frag.qsb")
        }
        ShaderEffectSource {
            id: middle
            sourceItem: horizontal
            textureSize: input.textureSize
            live: root.live
            hideSource: true
            visible: false
        }
        ShaderEffect {
            anchors.fill: parent
            property var source: middle
            property vector2d direction: Qt.vector2d(0, 1 / Math.max(height, 1))
            property real sigma: root.sigma
            property real pixelRatio: Screen.devicePixelRatio
            fragmentShader: Qt.resolvedUrl("gaussian.frag.qsb")
        }
    }
}
