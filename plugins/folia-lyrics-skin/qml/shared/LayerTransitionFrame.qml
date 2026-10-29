// Folia softFocus frame: opacity, Gaussian blur(8px) and scale(1.02).
// Only a running change owns full-size GPU buffers; rest draws the original item.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property Item sourceItem: null
    // 0 = the source soft-focus look; 1 = its normal, ungrouped look.
    property real progress: 1
    property bool live: true
    readonly property real density: Screen.devicePixelRatio
    readonly property int padding: 24
    readonly property size pixels: Qt.size(Math.ceil((width + 2 * padding) * density), Math.ceil((height + 2 * padding) * density))
    readonly property bool changing: live && sourceItem !== null && progress < 1
    readonly property real plannedBytes: buffers.active ? pixels.width * pixels.height * 8 : 0
    readonly property TransitionBuffers rendered: buffers.item as TransitionBuffers
    readonly property string errorString: changing && (pixels.width > 8192 || pixels.height > 8192 || pixels.width * pixels.height * 8 > 256 * 1024 * 1024) ? "Soft-focus buffers exceed the 256MiB / 8192px GPU budget" : rendered ? rendered.errorString : ""
    scale: 1 + .02 * (1 - Math.max(0, Math.min(1, progress)))
    visible: changing
    Loader {
        id: buffers
        anchors.fill: parent
        active: root.changing && root.visible && root.pixels.width > 0 && root.pixels.height > 0 && root.pixels.width <= 8192 && root.pixels.height <= 8192 && root.pixels.width * root.pixels.height * 8 <= 256 * 1024 * 1024
        sourceComponent: TransitionBuffers {}
    }
    component TransitionBuffers: Item {
        readonly property string errorString: horizontal.status === ShaderEffect.Error ? horizontal.log : vertical.status === ShaderEffect.Error ? vertical.log : ""
        ShaderEffectSource {
            id: captured
            sourceItem: root.sourceItem
            sourceRect: Qt.rect(-root.padding, -root.padding, root.width + 2 * root.padding, root.height + 2 * root.padding)
            textureSize: root.pixels
            hideSource: true
            visible: false
            live: root.live
            smooth: true
        }
        ShaderEffect {
            id: horizontal
            width: root.width + 2 * root.padding
            height: root.height + 2 * root.padding
            property var source: captured
            property vector2d extent: Qt.vector2d(width, height)
            property real density: root.density
            property real sigma: 8 * (1 - root.progress)
            property real padding: root.padding
            property real vertical: 0
            property real outputOpacity: 1
            fragmentShader: "../shaders/transition-blur.frag.qsb"
        }
        ShaderEffectSource {
            id: horizontalTexture
            sourceItem: horizontal
            textureSize: root.pixels
            hideSource: true
            visible: false
            live: root.live
            smooth: true
        }
        ShaderEffect {
            id: vertical
            x: -root.padding
            y: -root.padding
            width: horizontal.width
            height: horizontal.height
            property var source: horizontalTexture
            property vector2d extent: horizontal.extent
            property real density: root.density
            property real sigma: horizontal.sigma
            property real padding: root.padding
            property real vertical: 1
            property real outputOpacity: Math.max(0, Math.min(1, root.progress))
            fragmentShader: "../shaders/transition-blur.frag.qsb"
        }
    }
}
