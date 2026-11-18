// Original Nebbia scene, public host snapshots and bounded native textures.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../lumiere" as Native
import "stage.mjs" as Stage
import "rhi-replay.mjs" as Replay
import "../../shared/render-quality.mjs" as Quality
import "../../shared"

Item {
    id: root
    required property var preparedLines
    property int currentIndex: -1
    property real audioPower: 0
    property var audioBands: ({
            bass: 0,
            treble: 0
        })
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
    readonly property var sourceTheme: Stage.theme(settings, JSON.stringify(fontInfo.family), primaryColor, secondaryColor, accentColor, backgroundColor, lyricsIcons)
    readonly property real resolution: Quality.styleQuality(settings, "nebbia", Math.min(2, Screen.devicePixelRatio)).pixelRatio
    readonly property bool active: live && visible && width > 0 && height > 0
    readonly property string errorString: program.errorString || layout.errorString || _replayError || (canvas && canvas.status.state === 'error' ? canvas.status.reason : '')
    readonly property bool renderReady: program.program !== null && sceneView.ready && !layout.busy && !errorString
    readonly property real totalCacheBytes: sceneView.cacheBytes
    readonly property int nodeCount: 0
    readonly property bool workerAlive: program.workerAlive || layout.workerAlive
    readonly property int workerFrameRevision: layout.frameRevision
    readonly property var workerFrameTiming: layout.workerFrameTiming
    readonly property string rebuildKey: JSON.stringify([program.revision, width, height, resolution, sourceTheme, settings.lyricsFontScale || 1, settings.showText !== false, tuning])
    property string _submittedGraph: ""
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
            daylight: !dark,
            seed: seed,
            metadata: {
                title: songTitle,
                artist: songArtist,
                album: songAlbum
            }
        } : null;
        ++preparationRevision;
    }
    Component.onCompleted: configure()
    function inspect(): var {
        return {
            program: program.program !== null,
            programBusy: program.busy,
            layoutBusy: layout.busy,
            workerWorking: layout._working,
            measuring: layout._measuring,
            measurementCursor: layout._cursor,
            measurementCount: layout._queries.length,
            pixelQueryCount: layout._pixelQueries.length,
            pixelComplete: layout._pixelsComplete,
            active: active,
            graphicsActive: graphicsService ? graphicsService.active : false,
            hasFrame: layout.frame !== null,
            hasReplay: _replay !== null,
            drawCalls: _drawCalls,
            acceptedDraws: _acceptedDraws,
            preparationRevision: preparationRevision,
            canvasGraphics: canvas && canvas.graphics !== null,
            canvasPaused: canvas ? canvas.paused : null,
            canvasVisible: canvas ? canvas.visible : null,
            canvasOpacity: canvas ? canvas.opacity : null,
            canvasSize: canvas ? [canvas.width, canvas.height] : null,
            phase: _drawPhase,
            lastOperation: _lastOperation,
            localError: _replayError,
            logicalResources: graphicsService ? graphicsService.capabilities.logicalResources : 0,
            firstEvents: _firstEvents,
            frameRevision: layout.frameRevision,
            firstFrame: _firstFramePresented,
            mipsPending: _mipOperation !== null,
            firstFramePending: _firstFrameOperation !== null,
            scene: sceneView.inspect()
        };
    }
    clip: true
    FontInfo {
        id: fontInfo
        font: root.baseFont
    }
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
        frameRequestsEnabled: root._mipOperation === null && root._firstFrameOperation === null && !root._replayError
        options: canvas && canvas.status.available ? root._options : null
        runtimeParameters: ({
                tuning: root.tuning,
                paused: root.paused,
                motionEnabled: root.motionEnabled
            })
        pixelPreparer: pixelPreparation
        textService: root.textService
        baseFont: root.baseFont
        timeSeconds: root.timeSeconds
        audio: ({
                bass: root.audioBands.bass || 0,
                treble: root.audioBands.treble || 0,
                power: root.audioPower
            })
        trackRevision: root.trackRevision
        live: root.active
    }
    Component {
        id: pixelPreparation
        PixelPreparation {}
    }
    Item {
        id: sceneView
        anchors.fill: parent
        readonly property bool ready: root._firstFramePresented && root._mipOperation === null && root._firstFrameOperation === null && !errorString && root._replay !== null
        readonly property string errorString: root._replayError || (canvas && canvas.status.state === 'error' ? canvas.status.reason : '')
        readonly property real cacheBytes: canvas ? canvas.status.nativeBudgetUsed || 0 : 0
        function inspect(): var {
            return canvas ? canvas.status : {};
        }
        Loader {
            id: canvasLoader
            anchors.fill: parent
            active: root.active
            sourceComponent: EchoGpuSurface {
                objectName: 'nebbiaGpu'
                graphics: root.graphicsService
                paused: !root.active
                continuous: false
                fps: 0
            }
        }
    }
    readonly property var canvas: canvasLoader.item
    Timer {
        id: restoreSurface
        interval: 0
        onTriggered: canvasLoader.active = root.active
    }

    property bool _firstFramePresented: false
    property var _firstFrameOperation: null
    property var _firstFrameCommands: null
    property var _replay: null
    property var _mipOperation: null
    property var _pendingCommands: null
    property string _replayError: ''
    property int _drawCalls: 0
    property int _acceptedDraws: 0
    property string _drawPhase: ''
    property var _lastOperation: null
    property var _firstEvents: null
    function release(): void {
        _submittedGraph = "";
        _firstEvents = null;
        canvasLoader.active = false;
        restoreSurface.restart();
        if (_mipOperation)
            _mipOperation.cancel();
        if (_firstFrameOperation)
            _firstFrameOperation.cancel();
        _firstFrameOperation = null;
        _firstFrameCommands = null;
        _mipOperation = null;
        _pendingCommands = null;
        if (_replay)
            _replay.destroy();
        _replay = null;
        _firstFramePresented = false;
        _replayError = '';
    }
    function draw(): void {
        ++_drawCalls;
        if (!active || !canvas || !layout.frame || !graphicsService || !graphicsService.active)
            return;
        ++_acceptedDraws;
        if (_firstEvents === null)
            _firstEvents = layout.frame.events.map(event => [event.type, event.id]);
        _drawPhase = 'building';
        try {
            if (!_replay)
                _replay = Replay.createNebbiaReplay(graphicsService, 'qml/styles/nebbia/shaders/', Math.round(width * resolution), Math.round(height * resolution));
            const commands = _replay.frame(layout.frame);
            layout.acknowledgeResources(layout.frame.resourceRevision || 0);
            _drawPhase = 'built:' + commands.passes.length;
            if (commands.mips.length) {
                _pendingCommands = {
                    passes: commands.passes
                };
                _mipOperation = canvas.enqueue({
                    passes: commands.mips
                });
                _lastOperation = _mipOperation ? [_mipOperation.state, _mipOperation.errorMessage] : 'null-mips';
                if (_mipOperation && _mipOperation.state >= EchoPluginOperation.Succeeded)
                    mipsReady.restart();
                return;
            }
            submitFrame({
                passes: commands.passes
            });
        } catch (error) {
            _replayError = String(error.message || error) + '\n' + String(error.stack || '');
        }
    }
    function submitFrame(commands: var): void {
        const key = JSON.stringify(commands);
        if (!_firstFramePresented || key !== _submittedGraph) {
            _firstFrameCommands = commands;
            _firstFrameOperation = canvas.enqueue(commands);
            _lastOperation = _firstFrameOperation ? [_firstFrameOperation.state, _firstFrameOperation.errorMessage] : 'null-first';
            if (_firstFrameOperation && _firstFrameOperation.state >= EchoPluginOperation.Succeeded)
                firstFrameReady.restart();
        } else {
            canvas.requestFrame();
        }
    }
    function finishFirstFrame(): void {
        const operation = _firstFrameOperation;
        if (!operation || operation.state < EchoPluginOperation.Succeeded || !active)
            return;
        if (operation.state !== EchoPluginOperation.Succeeded)
            _replayError = operation.errorMessage || 'Nebbia first frame canceled';
        else {
            if (!canvas.submit(_firstFrameCommands))
                _replayError = graphicsService.errorMessage;
            else {
                _submittedGraph = JSON.stringify(_firstFrameCommands);
                _firstFramePresented = true;
            }
        }
        _firstFrameCommands = null;
        _firstFrameOperation = null;
    }
    Timer {
        id: firstFrameReady
        interval: 0
        onTriggered: root.finishFirstFrame()
    }
    Connections {
        target: root._firstFrameOperation
        function onCompleted() {
            firstFrameReady.restart();
        }
    }
    function finishMips(): void {
        const operation = _mipOperation;
        if (!operation || operation.state < EchoPluginOperation.Succeeded || !active)
            return;
        if (operation.state !== EchoPluginOperation.Succeeded)
            _replayError = operation.errorMessage || 'Nebbia mip preparation canceled';
        else if (_pendingCommands) {
            submitFrame(_pendingCommands);
        }
        _pendingCommands = null;
        _mipOperation = null;
    }
    Timer {
        id: mipsReady
        interval: 0
        onTriggered: root.finishMips()
    }
    Connections {
        target: root._mipOperation
        function onCompleted() {
            mipsReady.restart();
        }
    }
    Connections {
        target: layout
        function onFrameChanged() {
            root.draw();
        }
    }
    onRebuildKeyChanged: {
        release();
        configure();
    }
    onActiveChanged: {
        if (!active)
            release();
        configure();
    }
    Component.onDestruction: release()
}
