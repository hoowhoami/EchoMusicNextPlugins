// Folia a8da4437 CSS geometry on native QSG. No viewport CPU bitmap.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Shapes
import "../../shared"
import "scene.mjs" as Scene
import "motion.mjs" as Motion

Item {
    id: root
    property var bands: ({})
    property color secondaryColor: "#999999"
    property color accentColor: "#6699ff"
    property bool hideShapes: false
    property bool disableVignette: false
    property bool paused: false
    property bool motionEnabled: true
    property bool live: true
    property real elapsedSeconds: 0
    property var shapes: []
    property var particles: []
    readonly property int shapeCount: shapes.length
    readonly property int particleCount: particles.length
    readonly property string errorString: vignette.status === ShaderEffect.Error ? vignette.log : ""
    clip: true
    ColorBlend {
        id: secondary
        targetColor: root.secondaryColor
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
    // Shared audio is normalized; the original MotionValues are in 0..255.
    PresentationSpring {
        id: bass
        targetValue: (root.bands.bass || 0) * 255
        stiffness: 300
        damping: 30
        enabled: root.live && root.motionEnabled
    }
    PresentationSpring {
        id: lowMid
        targetValue: (root.bands.lowMid || 0) * 255
        stiffness: 300
        damping: 30
        enabled: root.live && root.motionEnabled
    }
    PresentationSpring {
        id: mid
        targetValue: (root.bands.mid || 0) * 255
        stiffness: 300
        damping: 30
        enabled: root.live && root.motionEnabled
    }
    PresentationSpring {
        id: treble
        targetValue: (root.bands.treble || 0) * 255
        stiffness: 300
        damping: 30
        enabled: root.live && root.motionEnabled
    }
    function scaleFor(shape: var): real {
        const key = Scene.getShapeScaleKey(shape);
        return Motion.bandScale(key === "bass" ? bass.value : key === "lowMid" ? lowMid.value : key === "mid" ? mid.value : treble.value);
    }
    function reset(): void {
        shapes = live ? Scene.makeShapes() : [];
        particles = live ? Scene.makeParticles() : [];
        elapsedSeconds = 0;
    }
    onLiveChanged: reset()
    Component.onCompleted: reset()
    FrameAnimation {
        running: root.live && root.visible && !root.paused && root.motionEnabled && !root.hideShapes
        onTriggered: root.elapsedSeconds += frameTime
    }
    Repeater {
        model: root.live && !root.hideShapes ? root.shapes : []
        Item {
            id: face
            required property var modelData
            readonly property var pose: Motion.drift(modelData, root.elapsedSeconds)
            x: root.width * modelData.initialX / 100 + pose.x
            y: root.height * modelData.initialY / 100 + pose.y
            width: modelData.size
            height: modelData.size
            rotation: pose.rotation
            Item {
                anchors.fill: parent
                scale: root.scaleFor(face.modelData)
                opacity: face.modelData.opacity
                Rectangle {
                    anchors.fill: parent
                    visible: face.modelData.type === "circle" || face.modelData.type === "square"
                    radius: face.modelData.type === "circle" ? width / 2 : 0
                    color: face.modelData.filled ? secondary.value : "transparent"
                    border.width: face.modelData.filled ? 0 : 1
                    border.color: secondary.value
                    antialiasing: true
                }
                Shape {
                    width: 100
                    height: 100
                    scale: face.width / 100
                    transformOrigin: Item.TopLeft
                    visible: face.modelData.type === "triangle" || face.modelData.type === "cross"
                    preferredRendererType: Shape.CurveRenderer
                    ShapePath {
                        strokeWidth: 0
                        strokeColor: "transparent"
                        fillColor: secondary.value
                        PathSvg {
                            path: face.modelData.type === "triangle" ? "M50 0L0 100L100 100Z" : "M20 0L0 20L30 50L0 80L20 100L50 70L80 100L100 80L70 50L100 20L80 0L50 30Z"
                        }
                    }
                }
            }
        }
    }
    Repeater {
        model: root.live && !root.hideShapes ? root.particles : []
        Rectangle {
            required property var modelData
            readonly property var pose: Motion.rise(modelData, root.elapsedSeconds)
            width: modelData.size
            height: modelData.size
            radius: width / 2
            color: accent.value
            x: root.width * modelData.left / 100
            y: root.height * modelData.top / 100 + pose.y
            opacity: pose.opacity
            antialiasing: true
        }
    }
    ShaderEffect {
        id: vignette
        anchors.fill: parent
        visible: root.live && !root.disableVignette
        property vector2d resolution: Qt.vector2d(root.width, root.height)
        fragmentShader: "vignette.frag.qsb"
    }
}
