// Pinned CSS geometry and Gaussian shadows; native GPU image masking.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import EchoMusic.PluginSdk
import "../../shared"

Item {
    id: root
    property url source
    property var songHandoff: null
    property EchoPluginAssets assetsService: null
    property bool square: true
    property bool live: true
    property bool motionEnabled: true
    property color primaryColor: "white"
    property color accentColor: "#8b5cf6"
    property color backgroundColor: "#111111"
    property var backdropSources: []
    readonly property int layerCount: graph.item ? graph.item.layerCount : 0
    readonly property string errorString: decoration.errorString || backdrop.errorString || (graph.item ? graph.item.errorString : "")
    readonly property real inset: square ? 0 : 6
    readonly property real corner: square ? 32 : 34.4
    readonly property int shadowTextureBytes: decoration.textureBytes
    readonly property real backdropTextureBytes: backdrop.plannedBytes
    BackdropBlur {
        id: backdrop
        anchors.fill: parent
        sources: root.backdropSources
        baseColor: root.backgroundColor
        corner: root.corner
        sigma: 8
        live: root.live && !root.square
    }
    MonetFrameDecoration {
        id: decoration
        objectName: "monetPortraitDecoration"
        anchors.fill: parent
        square: root.square
        live: root.live
        motionEnabled: root.motionEnabled
        primaryColor: root.primaryColor
        accentColor: root.accentColor
        backgroundColor: root.backgroundColor
    }
    Loader {
        id: graph
        anchors.fill: parent
        active: root.live && root.visible
        sourceComponent: Item {
            readonly property int layerCount: portrait.layerCount
            readonly property string errorString: portrait.errorString
            Rectangle {
                anchors.fill: mask
                radius: mask.radius
                visible: !root.square
                color: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .08)
                Behavior on color { ColorAnimation { duration: root.motionEnabled ? 1000 : 0; easing.type: Easing.BezierSpline; easing.bezierCurve: [.4, 0, .2, 1, 1, 1] } }
            }
            Rectangle {
                id: mask
                anchors.fill: parent
                anchors.margins: root.inset
                radius: root.square ? 32 : 29.6
                color: "white"
                layer.enabled: true
                visible: false
            }
            MonetPortrait {
                id: portrait
                anchors.fill: mask
                source: root.source
                songHandoff: root.songHandoff
                assetsService: root.assetsService
                live: root.live
                motionEnabled: root.motionEnabled
                visible: false
            }
            MultiEffect {
                anchors.fill: mask
                source: portrait
                maskEnabled: true
                maskSource: mask
                autoPaddingEnabled: false
            }
        }
    }
}
