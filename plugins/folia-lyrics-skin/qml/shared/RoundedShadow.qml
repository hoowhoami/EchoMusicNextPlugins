// The same analytic rounded Gaussian as the portrait, for CSS outer box shadows.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property real corner: 0
    property real sigma: 6
    property vector2d offset: Qt.vector2d(0, 4)
    property color color: Qt.rgba(0, 0, 0, .12)
    property bool live: true
    readonly property int padding: Math.ceil(3 * sigma + Math.max(Math.abs(offset.x), Math.abs(offset.y)) + 1)
    readonly property int textureBytes: 0
    readonly property bool rendererActive: renderer.active
    readonly property string errorString: renderer.item && renderer.item.status === ShaderEffect.Error ? renderer.item.log : ""
    Loader {
        id: renderer
        x: -root.padding
        y: -root.padding
        width: root.width + 2 * root.padding
        height: root.height + 2 * root.padding
        active: root.live && root.visible && root.width > 0 && root.height > 0
        sourceComponent: ShaderEffect {
            property vector2d boxSize: Qt.vector2d(root.width, root.height)
            property real padding: root.padding
            property real corner: Math.max(0, Math.min(root.corner, root.width / 2, root.height / 2))
            property real square: 2
            property color primaryColor: "transparent"
            property color accentColor: "transparent"
            property color backgroundColor: "transparent"
            property vector2d shadowOffset: root.offset
            property real shadowSigma: root.sigma
            property color shadowColor: root.color
            fragmentShader: "../styles/monet/portrait-frame.frag.qsb"
        }
    }
}
