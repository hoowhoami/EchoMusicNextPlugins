// Folia common entry: optional Fluid, theme colour overlay, one geometric scene.
pragma ComponentBehavior: Bound
import QtQuick
import "../../shared"

Item {
    id: root
    objectName: "foliaCommonBackground"
    property var settings: ({})
    property var bands: ({})
    property url coverUrl
    property string seed: "default"
    property color backgroundColor: "#111111"
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: "#6699ff"
    property bool live: true
    property bool paused: false
    property bool motionEnabled: true
    readonly property bool useCover: settings.commonUseCoverColorBg === true
    readonly property Fluid fluidRenderer: fluid.item as Fluid
    readonly property GeometricLayers geometryRenderer: geometry.item as GeometricLayers
    readonly property bool renderReady: !useCover || !!fluidRenderer && fluidRenderer.renderReady
    readonly property string errorString: (fluidRenderer ? fluidRenderer.errorString : "") || (geometryRenderer ? geometryRenderer.errorString : "")
    Loader {
        id: fluid
        anchors.fill: parent
        active: root.live && root.useCover
        sourceComponent: Fluid {
            coverUrl: root.coverUrl
            backgroundColor: root.backgroundColor
            primaryColor: root.primaryColor
            secondaryColor: root.secondaryColor
            live: root.live
            motionEnabled: root.motionEnabled
        }
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
    Rectangle {
        anchors.fill: parent
        color: background.value
        opacity: root.useCover ? (root.settings.commonOpacity === undefined ? .75 : root.settings.commonOpacity) : 1
    }
    Loader {
        id: geometry
        anchors.fill: parent
        active: root.live && root.motionEnabled
        sourceComponent: GeometricLayers {
            seed: root.seed
            bands: root.bands
            secondaryColor: root.secondaryColor
            accentColor: root.accentColor
            paused: root.paused
            live: root.live
            hideShapes: root.settings.commonDisableGeometricBackground === true
            disableVignette: root.settings.commonDisableVignette === true
        }
    }
}
