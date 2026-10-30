// All source triangles are immutable retained GPU paths. RAF changes only 21 part transforms.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Shapes
import QtQml.WorkerScript
import "clockwork-scene.mjs" as Scene
import "native-scene.mjs" as Native
import "clockwork-meshes.mjs" as Mesh
import "../../shared" as Shared

Item {
    id: root
    property var geometry
    property var tuning
    property var motion
    property color primaryColor: "white"
    property color accentColor: "#ff4f86"
    property color backgroundColor: "black"
    property url coverUrl
    property bool live: true
    property var lyricsIcons: []
    readonly property var box: Scene.resolvePendoloClockworkBox(geometry.centerX, geometry.centerY, geometry.baseRadius, geometry.lyricRingRadius, width, height, tuning.showCenterGradient)
    readonly property var input: ({
            centerX: geometry.centerX - box.left,
            centerY: geometry.centerY - box.top,
            baseRadius: geometry.baseRadius,
            lyricRingRadius: geometry.lyricRingRadius,
            primaryTextColor: String(primaryColor),
            accentTextColor: String(accentColor),
            backgroundColor: String(backgroundColor),
            showGearDecor: tuning.showGearDecor
        })
    readonly property string sceneKey: Mesh.buildPendoloClockworkCacheKey(input)
    readonly property var transforms: Native.resolveTransforms(input, motion)
    readonly property int partCount: scene ? scene.parts.length : 0
    readonly property int vertexCount: scene ? scene.vertexCount : 0
    readonly property int pathBytes: scene ? scene.pathBytes : 0
    readonly property bool resourcesActive: content.active
    property var scene: null
    property int sceneRevision: 0
    property string errorString: ""
    property var _worker: null
    property var _pending: null
    property int _generation: 0
    property bool _ready: false
    function sync(): void {
        if (!_ready)
            return;
        ++_generation;
        _pending = null;
        scene = null;
        errorString = "";
        if (!live || tuning.showGearDecor === "none") {
            if (_worker) {
                _worker.destroy();
                _worker = null;
            }
            return;
        }
        if (!_worker)
            _worker = workerComponent.createObject(root);
        _pending = {
            phase: "geometry",
            input,
            generation: _generation
        };
        flush();
    }
    function flush(): void {
        if (live && _worker && _worker.ready && _pending) {
            const request = _pending;
            _pending = null;
            _worker.sendMessage(request);
        }
    }
    function receive(reply: var): void {
        if (!live || reply.generation !== _generation)
            return;
        if (reply.error)
            errorString = reply.error;
        else {
            scene = reply.scene;
            ++sceneRevision;
        }
    }
    onSceneKeyChanged: sync()
    onLiveChanged: sync()
    Component.onCompleted: {
        _ready = true;
        sync();
    }
    Component {
        id: workerComponent
        WorkerScript {
            source: Qt.resolvedUrl("worker.mjs")
            onReadyChanged: root.flush()
            onMessage: reply => root.receive(reply)
        }
    }
    Loader {
        id: content
        x: root.box.left
        y: root.box.top
        width: root.box.width
        height: root.box.height
        active: root.live && (root.tuning.showGearDecor !== "none" || root.tuning.showCenterGradient || root.tuning.showCoverOnWatchFace)
        sourceComponent: Item {
            id: clock
            Item {
                id: ink
                anchors.fill: parent
                Loader {
                    anchors.fill: parent
                    active: root.tuning.showCenterGradient
                    sourceComponent: ShaderEffect {
                        property vector2d size: Qt.vector2d(width, height)
                        property vector2d center: Qt.vector2d(root.input.centerX, root.input.centerY)
                        property real radius: root.input.baseRadius * 1.65
                        property color tint: root.backgroundColor
                        fragmentShader: Qt.resolvedUrl("gradient.frag.qsb")
                    }
                }
                Loader {
                    active: root.tuning.showCoverOnWatchFace && String(root.coverUrl).length > 0
                    x: root.input.centerX - root.input.baseRadius * .88
                    y: root.input.centerY - root.input.baseRadius * .88
                    width: root.input.baseRadius * 1.76
                    height: width
                    sourceComponent: ShaderEffect {
                        property var source: Image {
                            id: cover
                            objectName: "pendoloCover"
                            source: root.live ? root.coverUrl : ""
                            asynchronous: true
                            cache: false
                            autoTransform: true
                            readonly property int decodeSize: Math.min(2048, Math.ceil(root.input.baseRadius * 1.76 * Screen.devicePixelRatio))
                            sourceSize: Qt.size(decodeSize, decodeSize)
                            fillMode: Image.Stretch
                            visible: false
                        }
                        opacity: cover.status === Image.Ready ? .42 * (root.tuning.showGearDecor === "full" ? 1 : .6) : 0
                        fragmentShader: Qt.resolvedUrl("watchface.frag.qsb")
                    }
                }
                Repeater {
                    model: root.scene ? root.scene.parts : []
                    delegate: Item {
                        id: part
                        required property var modelData
                        required property int index
                        readonly property var pose: root.transforms[index] || ({
                                x: 0,
                                y: 0,
                                rotation: 0
                            })
                        objectName: "pendoloPart:" + modelData.key
                        x: pose.x
                        y: pose.y
                        rotation: pose.rotation
                        transformOrigin: Item.TopLeft
                        width: 1
                        height: 1
                        Repeater {
                            model: part.modelData.paths
                            delegate: Shape {
                                id: pathShape
                                required property var modelData
                                width: 1
                                height: 1
                                preferredRendererType: Shape.CurveRenderer
                                ShapePath {
                                    strokeColor: pathShape.modelData.stroke ? Qt.rgba(pathShape.modelData.stroke[0], pathShape.modelData.stroke[1], pathShape.modelData.stroke[2], pathShape.modelData.stroke[3]) : "transparent"
                                    strokeWidth: pathShape.modelData.width
                                    fillColor: pathShape.modelData.fill ? Qt.rgba(pathShape.modelData.fill[0], pathShape.modelData.fill[1], pathShape.modelData.fill[2], pathShape.modelData.fill[3]) : "transparent"
                                    fillRule: ShapePath.WindingFill
                                    joinStyle: ShapePath.MiterJoin
                                    miterLimit: 10
                                    capStyle: ShapePath.FlatCap
                                    PathSvg {
                                        path: pathShape.modelData.path
                                    }
                                }
                            }
                        }
                    }
                }
            }
            PendoloShadow {
                anchors.fill: parent
                source: ink
                live: root.live
                effectEnabled: root.tuning.enableLineGlow
                color1: root.accentColor
                color2: root.accentColor
            }
            Loader {
                active: root.tuning.showGearDecor !== "none"
                x: root.input.centerX + root.input.baseRadius * .2 - Math.max(14, root.input.baseRadius * .13) / 2
                y: root.input.centerY - root.input.baseRadius * .75 - Math.max(14, root.input.baseRadius * .13) / 2
                width: Math.max(14, root.input.baseRadius * .13)
                height: width
                sourceComponent: Shared.ThemeIcon {
                    objectName: "pendoloBalanceStar"
                    iconName: root.lyricsIcons.length ? root.lyricsIcons[0] : ""
                    fallbackName: "Star"
                    color: Qt.rgba(root.accentColor.r, root.accentColor.g, root.accentColor.b, .62)
                    strokeWidth: 1.2
                    live: root.live
                }
            }
        }
    }
}
