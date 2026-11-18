// Original Hanabi compiler/scene, public host snapshots and bounded native textures.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../lumiere" as Native
import "stage.mjs" as Stage
import "../../shared/render-quality.mjs" as Quality
import "../../shared"

Item {
    id: root
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: primaryColor
    property color backgroundColor: "#111111"
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property string seed: songTitle
    property string songTitle: ""
    property string songArtist: ""
    property string songAlbum: ""
    property var lyricsIcons: []
    property LyricProjection lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    property EchoPluginText textService: null
    property EchoPluginGraphics graphicsService: null
    readonly property var tuning: Stage.tuning(settings)
    readonly property var sourceTheme: Stage.theme(settings, baseFont.family, primaryColor, secondaryColor, accentColor, backgroundColor, lyricsIcons)
    readonly property var quality: Quality.styleQuality(settings, "hanabi", Math.min(2, Screen.devicePixelRatio))
    readonly property real resolution: quality.pixelRatio
    readonly property bool active: live && visible && width > 0 && height > 0
    readonly property string errorString: program.errorString || layout.errorString || view.errorString
    readonly property bool renderReady: program.program !== null && view.ready && !layout.busy && !errorString
    readonly property real totalCacheBytes: view.cacheBytes
    readonly property int nodeCount: view.nodeCount
    readonly property bool workerAlive: program.workerAlive || layout.workerAlive
    readonly property int workerFrameRevision: layout.frameRevision
    readonly property var workerFrameTiming: layout.workerFrameTiming
    readonly property string rebuildKey: JSON.stringify([program.revision, width, height, resolution, sourceTheme, settings.lyricsFontScale || 1, settings.showText !== false, Stage.geometryTuning(tuning), tuning.sky >= .5 && !tuning.textOnly])
    property var _options: null
    property int preparationRevision: 0
    function configure(): void {
        _options = program.program && active ? {
            width: width,
            height: height,
            resolution: resolution,
            program: program.program,
            theme: sourceTheme,
            tuning: tuning,
            showText: settings.showText !== false,
            fontScale: settings.lyricsFontScale || 1,
            metadata: {
                title: songTitle,
                artist: songArtist,
                album: songAlbum
            }
        } : null;
        ++preparationRevision;
    }
    onRebuildKeyChanged: configure()
    onActiveChanged: configure()
    Component.onCompleted: configure()
    function inspect(): var {
        return {
            program: program.program !== null,
            programBusy: program.busy,
            layoutBusy: layout.busy,
            frameRevision: layout.frameRevision,
            scene: view.inspect()
        };
    }
    clip: true
    Native.LumiereProgram {
        id: program
        workerSource: Qt.resolvedUrl('program-worker.mjs')
        lyricSource: root.lyricSource
        previewRows: root.previewRows
        lyricCount: root.lyricCount
        lyricOffsetMs: root.lyricOffsetMs
        trackRevision: root.trackRevision
        seed: root.seed
        textService: root.textService
        live: root.active
        seamless: false
    }
    Native.LumiereSceneLayout {
        id: layout
        workerSource: Qt.resolvedUrl('scene-worker.mjs')
        runtimeMode: true
        options: root._options
        runtimeParameters: ({
                tuning: root.tuning
            })
        textService: root.textService
        baseFont: root.baseFont
        timeSeconds: root.timeSeconds
        trackRevision: root.trackRevision
        live: root.active
    }
    Native.LumiereSceneView {
        id: view
        anchors.fill: parent
        frame: layout.frame
        baseFont: root.baseFont
        resolution: root.resolution
        live: root.active && program.program !== null
        textureFactory: sourceTexture
        glyphTextureFactory: sourceTexture
        flattened: true
        forceRaster: root.quality.antialiasEnabled
        samples: root.quality.antialiasEnabled ? 4 : 1
        leafFactory: sourceLeaf
    }
    Component {
        id: sourceTexture
        StaticCanvasTexture {}
    }
    Component {
        id: sourceLeaf
        HanabiLeaf {
            graphicsService: root.graphicsService
            resourceParent: root
            fallbackSource: whiteTexture
        }
    }
    Rectangle {
        id: white
        width: 1
        height: 1
        color: 'white'
    }
    ShaderEffectSource {
        id: whiteTexture
        sourceItem: white
        textureSize: Qt.size(1, 1)
        hideSource: true
        visible: false
        live: false
    }
}
