// The source CSS chain applies its second Gaussian to the first composited result.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property Item source
    property bool live: true
    property bool effectEnabled: false
    property bool cascade: true
    property real sigma1: 4
    property real sigma2: 12
    property color color1: "white"
    property color color2: color1
    property real opacity1: .65
    property real opacity2: .3
    readonly property int padding: Math.ceil((sigma1 + (cascade ? sigma2 : 0)) * 3) + 2
    Loader {
        x: -root.padding
        y: -root.padding
        width: root.width + 2 * root.padding
        height: root.height + 2 * root.padding
        active: root.effectEnabled && root.live && root.width > 0 && root.height > 0
        sourceComponent: Item {
            ShaderEffectSource {
                id: sourceTexture
                sourceItem: root.source
                sourceRect: Qt.rect(-root.padding, -root.padding, root.width + 2 * root.padding, root.height + 2 * root.padding)
                textureSize: Qt.size(Math.ceil(parent.width * Screen.devicePixelRatio), Math.ceil(parent.height * Screen.devicePixelRatio))
                hideSource: true
                live: root.live
                visible: false
            }
            PendoloShadowPass {
                id: first
                width: parent.width
                height: parent.height
                input: sourceTexture
                sigma: root.sigma1
                tint: root.color1
                strength: root.opacity1
                present: !root.cascade
                live: root.live
            }
            Loader {
                anchors.fill: parent
                active: root.cascade
                sourceComponent: PendoloShadowPass {
                    anchors.fill: parent
                    input: first.output
                    sigma: root.sigma2
                    tint: root.color2
                    strength: root.opacity2
                    present: true
                    live: root.live
                }
            }
        }
    }
}
