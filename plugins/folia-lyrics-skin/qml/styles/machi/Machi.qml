// Original Machi runtime and native scene graph. Playback is a read-only input.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../lumiere" as Native
import "../../shared"
import "stage.mjs" as Stage
import "rhi-replay.mjs" as Replay
import "../../shared/render-quality.mjs" as Quality

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
    property bool previewMode: false
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
    readonly property real resolution: Screen.devicePixelRatio
    readonly property bool active: live && visible && width > 0 && height > 0
    // Current submissions have their own completion/error identity. A report
    // from an obsolete persistent graph must not cancel its replacement.
    readonly property string errorString: program.errorString || layout.errorString || sources.errorString || _replayError || (canvas && canvas.status.state === 'error' ? canvas.status.reason || 'Machi native render failed' : '')
    readonly property bool renderReady: _firstFramePresented && !layout.busy && !errorString && canvas && canvas.status.available && canvas.status.state !== 'error'
    readonly property real totalCacheBytes: canvas ? canvas.status.nativeBudgetUsed || 0 : 0
    readonly property bool workerAlive: program.workerAlive || layout.workerAlive
    readonly property int workerFrameRevision: layout.frameRevision
    readonly property var workerFrameTiming: layout.workerFrameTiming
    property int presentationTimingRevision: 0
    property var presentationTiming: null
    property var _frameTiming: null
    property real _frameStarted: 0
    readonly property string rebuildKey: JSON.stringify([program.revision, width, height, resolution, sourceTheme, tuning, Quality.globalQuality(settings), settings.showText !== false, previewMode])
    readonly property var canvas: surface.item
    property var _options: null
    property var _replay: null
    property var _recording: null
    property var _queue: []
    property var _operation: null
    property var _present: []
    property bool _ingested: false
    property bool _gpuBusy: false
    property bool _firstFramePresented: false
    property int _sceneEpoch: -1
    property string _replayError: ""
    signal settingsPatchRequested(var patch)
    property var _pointerEvents: []
    property int _inputSequence: 0
    property var _viewChange: null
    function pointer(type: string, x: real, y: real, button: int, delta: real): void {
        const event = {
            type,
            sequence: ++_inputSequence,
            clientX: x,
            clientY: y,
            button,
            deltaY: delta
        };
        const values = _pointerEvents.slice();
        if (type === 'pointermove' && values.length && values[values.length - 1].type === type)
            values.pop();
        values.push(event);
        _pointerEvents = values.slice(-64);
    }
    function configure(): void {
        _options = program.program && active ? {
            width,
            height,
            resolution,
            previewMode,
            program: program.program,
            theme: sourceTheme,
            tuning,
            renderQuality: Quality.globalQuality(settings),
            seed,
            showText: settings.showText !== false,
            metadata: {
                title: songTitle,
                artist: songArtist,
                album: songAlbum
            }
        } : null;
    }
    function release(): void {
        next.stop();
        continueFrame.stop();
        commitView.stop();
        _viewChange = null;
        if (_operation)
            _operation.cancel();
        _operation = null;
        _queue = [];
        _recording = null;
        _present = [];
        _gpuBusy = false;
        _ingested = false;
        _firstFramePresented = false;
        _sceneEpoch = -1;
        surface.active = false;
        preparationSurface.active = false;
        sources.clear();
        if (_replay)
            _replay.destroy();
        _replay = null;
        _replayError = '';
        restore.restart();
    }
    function beginFrame(): void {
        if (!active || !canvas || !layout.frame || errorString)
            return;
        // A new exact-metrics discovery round recreates the source runtime.
        // Its complete frame replaces the old resource namespace as one unit.
        if (_replay && _sceneEpoch !== layout.frame.sceneEpoch)
            release();
        _recording = layout.frame;
        _frameTiming = {
            replayMs: 0,
            enqueueMs: 0,
            presentMs: 0,
            queuedBatches: 0
        };
        _frameTiming.sourceEvents = _recording.events.length;
        _frameTiming.sourceCanvases = _recording.events.filter(event => event.kind === "canvas").length;
        _frameStarted = Date.now();
        _sceneEpoch = _recording.sceneEpoch;
        preparationSurface.active = _recording.events.some(event => ['canvas', 'gradient'].indexOf(event.kind) >= 0 || event.mipmaps);
        _gpuBusy = true;
        _ingested = false;
        sources.events = _recording.events;
        next.start();
    }
    function advance(): void {
        if (!active || !canvas || !canvas.status.available || !_recording || errorString)
            return;
        try {
            if (_operation) {
                if (_operation.state < EchoPluginOperation.Succeeded)
                    return;
                if (_operation.state !== EchoPluginOperation.Succeeded)
                    throw Error(_operation.errorMessage || 'Machi GPU submission canceled');
                _operation = null;
            }
            if (!_ingested) {
                if (!sources.ready)
                    return;
                if (preparationSurface.active && (!preparationSurface.item || !preparationSurface.item.status.available))
                    return;
                if (!_replay)
                    _replay = Replay.createMachiReplay(graphicsService, 'qml/styles/machi/shaders/', _recording.width, _recording.height);
                const replayStarted = Date.now();
                _frameTiming.sourceWaitMs = replayStarted - _frameStarted;
                const preparation = _replay.ingest(_recording.events, sources.sources, preparationSurface.item, _recording), graph = _replay.frame(_recording);
                _frameTiming.replayMs += Date.now() - replayStarted;
                const limit = graphicsService.capabilities.limits.maxCommands || 32;
                _queue = [];
                for (let i = 0; i < preparation.length; i += limit)
                    _queue.push({
                        preparation: true,
                        passes: preparation.slice(i, i + limit)
                    });
                _present = [graph.present];
                if (_firstFramePresented && graph.chunks.length === 1) {
                    // A complete graph can replace the previous graph in one
                    // submission. Keep stable pipelines and avoid a completion
                    // readback unless resource preparation or batching needs it.
                    _present = graph.chunks[0];
                } else {
                    _queue = _queue.concat(graph.chunks.map(passes => ({
                                preparation: false,
                                passes
                            })));
                }
                if (_queue.length && _firstFramePresented && !canvas.submit({
                    passes: [graph.present]
                }))
                    throw Error(graphicsService.errorMessage || 'Machi native presentation rejected');
                _ingested = true;
            }
            if (_queue.length) {
                const command = _queue.shift(), destination = command.preparation ? preparationSurface.item : canvas;
                const enqueueStarted = Date.now();
                _operation = destination.enqueue({
                    passes: command.passes
                });
                _frameTiming.enqueueMs += Date.now() - enqueueStarted;
                ++_frameTiming.queuedBatches;
                if (!_operation)
                    throw Error(graphicsService.errorMessage || 'Machi command list rejected');
                if (_operation.state >= EchoPluginOperation.Succeeded)
                    next.start();
            } else {
                const presentStarted = Date.now();
                const submitted = canvas.submit({
                    passes: _present
                });
                _frameTiming.presentMs += Date.now() - presentStarted;
                if (!submitted)
                    throw Error(graphicsService.errorMessage || 'Machi native presentation rejected');
                presentationTiming = _frameTiming;
                presentationTiming.totalMs = Date.now() - _frameStarted;
                ++presentationTimingRevision;
                // Imports belong only to this short-lived preparation surface.
                // Main rendering owns the copied textures and never acquires
                // a provider that is about to retire.
                preparationSurface.active = false;
                _replay.finishPreparation();
                sources.clear();
                _present = [];
                _firstFramePresented = true;
                const needsFrame = _recording.needsFrame;
                _viewChange = _recording.viewChange;
                _recording = null;
                _gpuBusy = false;
                if (_viewChange)
                    commitView.restart();
                else if (needsFrame)
                    continueFrame.restart();
            }
        } catch (error) {
            _replayError = String(error.message || error) + '\n' + String(error.stack || '');
        }
    }
    function inspect(): var {
        return {
            program: program.program !== null,
            programBusy: program.busy,
            layoutBusy: layout.busy,
            workerWorking: layout._working,
            measuring: layout._measuring,
            measurementCursor: layout._cursor,
            measurementQueries: layout._queries.length,
            measurementCount: layout.measurementCount,
            pendingPieces: layout._segmentTexts.length,
            family: layout._family,
            frameRevision: layout.frameRevision,
            sourceScene: layout.frame ? layout.frame.scene : '',
            sourceEpoch: _sceneEpoch,
            gpuBusy: _gpuBusy,
            queued: _queue.length,
            sourceCount: sources.sources.size,
            sources: sources.inspect(),
            replayError: _replayError,
            preparing: preparationSurface.item ? preparationSurface.item.status : {},
            scene: canvas ? canvas.status : {}
        };
    }
    FontInfo {
        id: fontInfo
        font: root.baseFont
    }
    Native.LumiereProgram {
        id: program
        workerSource: Qt.resolvedUrl('program-worker.mjs')
        lyricSource: root.lyricSource
        previewRows: root.previewRows
        previewMode: root.previewMode
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
        frameRequestsEnabled: !root._gpuBusy && !root.errorString
        runtimeParameters: ({
                paused: root.paused,
                presented: root._firstFramePresented,
                motionEnabled: root.motionEnabled,
                pointerEvents: root._pointerEvents
            })
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
    CanvasSources {
        id: sources
        x: root.width / 2
        y: root.height / 2
        width: 1
        height: 1
        live: root.active
        baseFont: root.baseFont
        onChanged: if (ready)
            next.start()
    }
    Loader {
        id: preparationSurface
        x: root.width / 2
        y: root.height / 2
        width: 1
        height: 1
        active: false
        sourceComponent: EchoGpuSurface {
            graphics: root.graphicsService
            continuous: false
            fps: 0
        }
    }
    Connections {
        target: preparationSurface.item
        function onStatusChanged() {
            next.start();
        }
    }
    Loader {
        id: surface
        anchors.fill: parent
        active: root.active
        sourceComponent: EchoGpuSurface {
            graphics: root.graphicsService
            paused: !root.active
            continuous: false
            fps: 0
        }
    }
    Timer {
        id: next
        interval: 0
        onTriggered: root.advance()
    }
    Timer {
        id: continueFrame
        interval: 0
        onTriggered: if (root.active && !root._gpuBusy)
            layout.requestFrame()
    }
    Timer {
        id: commitView
        interval: 0
        onTriggered: {
            const value = root._viewChange;
            root._viewChange = null;
            if (!value || !root.active)
                return;
            const patch = {
                machiCamera: 'custom'
            }, scene = value.scene;
            for (const key of ['azimuth', 'elevation', 'zoom', 'panX', 'panZ'])
                patch['machi' + scene[0].toUpperCase() + scene.slice(1) + key[0].toUpperCase() + key.slice(1)] = value.view[key];
            root.settingsPatchRequested(patch);
        }
    }
    MouseArea {
        objectName: 'machiCameraInput'
        anchors.fill: parent
        enabled: root.active && !root.previewMode
        acceptedButtons: Qt.LeftButton | Qt.RightButton | Qt.MiddleButton
        function button(value: int): int {
            return value === Qt.RightButton ? 2 : value === Qt.MiddleButton ? 1 : 0;
        }
        onPressed: mouse => root.pointer('pointerdown', mouse.x, mouse.y, button(mouse.button), 0)
        onPositionChanged: mouse => {
            if (pressed)
                root.pointer('pointermove', mouse.x, mouse.y, button(pressedButtons), 0);
        }
        onReleased: mouse => root.pointer('pointerup', mouse.x, mouse.y, button(mouse.button), 0)
        onCanceled: root.pointer('pointercancel', mouseX, mouseY, 0, 0)
        onWheel: wheel => {
            root.pointer('wheel', wheel.x, wheel.y, 0, -wheel.angleDelta.y / 120 * 100);
            wheel.accepted = true;
        }
    }
    Timer {
        id: restore
        interval: 0
        onTriggered: surface.active = root.active
    }
    Connections {
        target: root.canvas
        function onStatusChanged() {
            if (root.canvas && root.canvas.status.available)
                next.start();
        }
    }
    Connections {
        target: root._operation
        function onCompleted() {
            next.start();
        }
    }
    Connections {
        target: layout
        function onFrameChanged() {
            root.beginFrame();
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
    Component.onCompleted: configure()
    Component.onDestruction: release()
}
