// Source CSS box shadows: square 36/80/.45 + 20/42/.22, rectangle 24/60/.35.
pragma ComponentBehavior: Bound
import QtQuick
import "../../shared"

Item {
    id: root
    property bool square: true
    property bool live: true
    property bool motionEnabled: true
    property color primaryColor: "white"
    property color accentColor: "#8b5cf6"
    property color backgroundColor: "#111111"
    readonly property real corner: Math.min(square ? 32 : 34.4, width / 2, height / 2)
    readonly property int padding: square ? 160 : 120
    readonly property bool rendererActive: graph.active
    readonly property int textureBytes: 0
    readonly property string errorString: graph.item && graph.item.status === ShaderEffect.Error ? graph.item.log : ""
    ColorBlend {
        id: primary
        targetColor: root.primaryColor
        durationMs: 1000
        easingType: Easing.BezierSpline
        easingCurve: [.4, 0, .2, 1, 1, 1]
        live: root.live
        motionEnabled: root.motionEnabled
    }
    ColorBlend {
        id: accent
        targetColor: root.accentColor
        durationMs: 1000
        easingType: Easing.BezierSpline
        easingCurve: [.4, 0, .2, 1, 1, 1]
        live: root.live
        motionEnabled: root.motionEnabled
    }
    ColorBlend {
        id: background
        targetColor: root.backgroundColor
        durationMs: 1000
        easingType: Easing.BezierSpline
        easingCurve: [.4, 0, .2, 1, 1, 1]
        live: root.live
        motionEnabled: root.motionEnabled
    }
    Loader {
        id: graph
        x: -root.padding
        y: -root.padding
        width: root.width + 2 * root.padding
        height: root.height + 2 * root.padding
        active: root.live && root.width > 0 && root.height > 0
        sourceComponent: ShaderEffect {
            property vector2d boxSize: Qt.vector2d(root.width, root.height)
            property real padding: root.padding
            property real corner: root.corner
            property real square: root.square ? 1 : 0
            property color primaryColor: primary.value
            property color accentColor: accent.value
            property color backgroundColor: background.value
            property vector2d shadowOffset: Qt.vector2d(0, 0)
            property real shadowSigma: 0
            property color shadowColor: "transparent"
            fragmentShader: "portrait-frame.frag.qsb"
        }
    }
}
