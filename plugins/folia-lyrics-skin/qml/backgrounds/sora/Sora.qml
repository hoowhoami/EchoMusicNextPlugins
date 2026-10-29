// Folia a8da4437 Sora. One immutable GPU mesh for the original 150 particles.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../../shared"

Item {
    id: root
    objectName: "foliaSoraBackground"
    property color primaryColor: "white"
    property color accentColor: "#6699ff"
    property bool dark: true
    property bool blank: false
    property bool paused: false
    property bool motionEnabled: true
    property bool live: true
    property int colorBlendMs: 0
    property real elapsedSeconds: 0
    readonly property int particleCount: 150
    readonly property var renderer: stars.item
    readonly property bool sizeAccepted: width <= 8192 && height <= 8192 && width * height <= 8 * 1024 * 1024
    readonly property string errorString: !sizeAccepted ? qsTr("星空背景尺寸超出绘制预算") : renderer ? renderer.errorString : ""
    clip: true
    ColorBlend {
        id: primary
        targetColor: root.primaryColor
        durationMs: root.colorBlendMs
        live: root.live && root.visible
        motionEnabled: root.motionEnabled
    }
    ColorBlend {
        id: accent
        targetColor: root.accentColor
        durationMs: root.colorBlendMs
        live: root.live && root.visible
        motionEnabled: root.motionEnabled
    }
    FrameAnimation {
        running: root.live && root.visible && !root.blank && !root.paused && root.motionEnabled
        onTriggered: root.elapsedSeconds += frameTime
    }
    Rectangle {
        anchors.fill: parent
        color: root.dark ? "black" : "white"
    }
    Loader {
        id: stars
        anchors.fill: parent
        active: root.live && root.visible && !root.blank && root.sizeAccepted
        sourceComponent: Item {
            readonly property string errorString: shader.status === ShaderEffect.Error ? shader.log : ""
            ShaderEffect {
                id: shader
                readonly property bool nativePoints: GraphicsInfo.api === GraphicsInfo.Metal
                anchors.fill: parent
                property vector2d u_resolution: Qt.vector2d(root.width, root.height)
                property real u_time: root.elapsedSeconds
                property color u_particle_color: primary.value
                property color u_particle_accent_color: accent.value
                mesh: nativePoints ? points : Qt.size(597, 1)
                PointMesh {
                    id: points
                    pointCount: root.particleCount
                }
                vertexShader: nativePoints ? "sora-points.vert.qsb" : "sora.vert.qsb"
                fragmentShader: nativePoints ? "sora-points.frag.qsb" : "sora.frag.qsb"
            }
            // twgl.resizeCanvasToDisplaySize uses multiplier 1 in the original.
            // Retain that logical-pixel star surface even on a Retina display.
            ShaderEffectSource {
                anchors.fill: parent
                sourceItem: shader
                hideSource: true
                live: root.live && root.visible
                textureSize: Qt.size(Math.max(1, Math.round(root.width)), Math.max(1, Math.round(root.height)))
                textureMirroring: shader.nativePoints ? ShaderEffectSource.NoMirroring : ShaderEffectSource.MirrorVertically
                smooth: true
            }
        }
    }
}
