pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import EchoMusic.Controls
import EchoMusic.Theme

EchoFloatingSurface {
    id: root
    property Item backdropSource: null
    property real captureWidth: width
    property real captureHeight: height
    // The source is the presentation tree, before controls. Capturing the whole
    // page would feed this surface's previous frame back into itself.
    frostedEnabled: false
    readonly property bool backdropActive: resourceActive && shaderEffectsSupported && Theme.store.floatingFrosted && backdropSource !== null
    readonly property point sourceOrigin: Qt.point(sourceAnchor.rect.x + (width - captureWidth) / 2 - 72, sourceAnchor.rect.y - 72)
    EchoPopupAnchor {
        id: sourceAnchor
        item: root.backdropActive ? root : null
        coordinateItem: root.backdropActive ? root.backdropSource : null
    }
    Loader {
        active: root.backdropActive
        z: -.25
        x: (root.width - root.captureWidth) / 2 - 72
        y: -72
        width: root.captureWidth + 144
        height: root.captureHeight + 144
        sourceComponent: Item {
            ShaderEffectSource {
                id: capture
                visible: false
                sourceItem: root.backdropSource
                sourceRect: Qt.rect(root.sourceOrigin.x, root.sourceOrigin.y, root.captureWidth + 144, root.captureHeight + 144)
                textureSize: Qt.size(Math.ceil((root.captureWidth + 144) / 4), Math.ceil((root.captureHeight + 144) / 4))
                live: true
                smooth: true
            }
            Rectangle {
                id: mask
                visible: false
                width: root.captureWidth + 144
                height: root.captureHeight + 144
                color: "transparent"
                layer.enabled: true
                Rectangle {
                    x: (root.captureWidth - root.width) / 2 + 72
                    y: 72
                    width: root.width
                    height: root.height
                    radius: root.radius
                    color: "white"
                    antialiasing: true
                }
            }
            MultiEffect {
                objectName: "foliaCapsuleBackdrop"
                anchors.fill: parent
                source: capture
                blurEnabled: true
                blurMax: 32
                blur: 1
                saturation: .4
                autoPaddingEnabled: false
                maskEnabled: true
                maskSource: mask
                maskThresholdMin: .5
                maskSpreadAtMin: 1
            }
        }
    }
}
