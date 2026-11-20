// One bounded viewport scene: native full-context metrics, exact ICU and source Worker math.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "../sonnet" as Sonnet
import "scene-packets.mjs" as Packets

Item {
    id: root
    property var options: null
    property Component pixelPreparer: null
    property var _paths: new Map()
    property var _pixelQueries: []
    property var _pixelResults: []
    property bool _pixelsComplete: true
    property url workerSource: Qt.resolvedUrl("scene-worker.mjs")
    property bool runtimeMode: false
    property bool frameRequestsEnabled: true
    property bool coalesceFrameChanges: false
    property var runtimeParameters: ({})
    property real presentationTimeMs: 0
    property var pieces: []
    property string trackRevision: ""
    property real timeSeconds: 0
    property var layerFrame: ({
            alpha: 1,
            scale: 1,
            blur: 0
        })
    property var audio: ({
            bass: 0,
            treble: 0,
            power: 0
        })
    property font baseFont
    property EchoPluginText textService: null
    property bool live: true
    property var frame: null
    property bool busy: false
    property string errorString: ""
    property int frameRevision: 0
    property var workerFrameTiming: null
    property int measurementCount: 0
    readonly property bool workerAlive: _worker !== null
    readonly property real measurementCacheBytes: measure.cacheBytes
    property var _worker: null
    property var _pending: null
    property var _operation: null
    property var _queries: []
    property var _segmentTexts: []
    property var _measured: []
    property var _pieces: []
    property int _cursor: 0
    property int _generation: 0
    property int _sequence: 0
    property int _expectedSequence: 0
    property bool _working: false
    property bool _measuring: false
    property bool _complete: false
    property bool _hasPrepared: false
    property bool _dirtyFrame: false
    property var _runs: []
    property string _family: ""
    property bool _runtimeParametersDirty: true
    property real _resourceAck: 0
    function acknowledgeResources(revision: real): void {
        _resourceAck = Math.max(_resourceAck, revision);
    }
    function frameParameters(): var {
        const value = _runtimeParametersDirty ? JSON.parse(JSON.stringify(runtimeParameters)) : {};
        _runtimeParametersDirty = false;
        value.nowMs = presentationTimeMs;
        value.resourceAck = _resourceAck;
        return value;
    }
    function stop() {
        ++_generation;
        frameRequest.stop();
        piecesCompletion.stop();
        piecesRequest.stop();
        debounce.stop();
        step.stop();
        retry.stop();
        if (_operation)
            _operation.cancel();
        _operation = null;
        _pending = null;
        _paths.clear();
        _queries = [];
        _measured = [];
        _pieces = [];
        _segmentTexts = [];
        _runs = [];
        measure.runs = [];
        pixelPreparation.active = false;
        _pixelQueries = [];
        _pixelResults = [];
        _pixelsComplete = true;
        _working = false;
        _measuring = false;
        _dirtyFrame = false;
        _resourceAck = 0;
        if (_worker) {
            _worker.destroy();
            _worker = null;
        }
        busy = false;
    }
    function fail(message: string) {
        stop();
        frame = null;
        errorString = message;
    }
    function invalidate() {
        if (!_complete)
            return;
        stop();
        frame = null;
        errorString = "";
        measurementCount = 0;
        if (live && options) {
            busy = true;
            debounce.restart();
        }
    }
    function send(value: var) {
        if (!_complete || !live)
            return;
        value.generation = _generation;
        value.trackRevision = trackRevision;
        value.sequence = ++_sequence;
        _expectedSequence = value.sequence;
        _pending = value;
        _working = true;
        if (!_worker)
            _worker = workerComponent.createObject(root);
        flush();
    }
    function flush() {
        if (live && _worker && _worker.ready && _pending) {
            const value = _pending;
            _pending = null;
            _worker.sendMessage(value);
        }
    }
    function prepare() {
        _hasPrepared = true;
        _runtimeParametersDirty = true;
        send({
            phase: 'prepare',
            input: {
                options: JSON.parse(JSON.stringify(options)),
                runtime: runtimeMode,
                runtimeFrame: frameParameters(),
                pieces: JSON.parse(JSON.stringify(pieces)),
                time: timeSeconds,
                layer: JSON.parse(JSON.stringify(layerFrame)),
                audio: JSON.parse(JSON.stringify(audio))
            }
        });
    }
    function requestFrame() {
        if (coalesceFrameChanges) {
            if (!_complete || !live || !options || !_worker)
                return;
            _dirtyFrame = true;
            if (frameRequestsEnabled && !_working && !busy && !frameRequest.running)
                frameRequest.start();
            return;
        }
        flushFrame();
    }
    function flushFrame() {
        if (!_complete || !live || !options || !_worker)
            return;
        if (!frameRequestsEnabled || _working || busy) {
            _dirtyFrame = true;
            return;
        }
        _dirtyFrame = false;
        send({
            phase: 'frame',
            runtimeFrame: frameParameters(),
            time: timeSeconds,
            layer: JSON.parse(JSON.stringify(layerFrame)),
            audio: JSON.parse(JSON.stringify(audio))
        });
    }
    function receive(message: var) {
        if (!_complete || !live || message.generation !== _generation || message.trackRevision !== trackRevision || message.sequence !== _expectedSequence)
            return;
        _working = false;
        if (message.error) {
            fail(message.error);
            return;
        }
        const parseStarted = Date.now();
        const result = JSON.parse(message.payload);
        if (message.spriteRows)
            _paths = Packets.restoreSceneResources(result.frame.leaves, message.spriteRows, _paths);
        if (message.resourceData && message.resourceData.length) {
            const data = message.resourceData;
            for (const event of result.frame.events) {
                for (const item of [event, ...(event.streams || [])]) {
                    for (const key of ["vertex", "index", "data"])
                        if (typeof item[key] === "number")
                            item[key] = data[item[key]];
                }
            }
        }
        if (message.objectRows) {
            const rows = message.objectRows;
            for (let i = 0; i < rows.length; ++i)
                if (rows[i])
                    result.frame.passes[i].objects = rows[i];
        }
        workerFrameTiming = message.timing ? Object.assign({}, message.timing, {
            parseMs: Date.now() - parseStarted
        }) : null;
        if (result.phase === 'measure') {
            busy = true;
            _queries = result.measurements;
            _pixelQueries = result.pixels || [];
            _pixelResults = [];
            _pixelsComplete = _pixelQueries.length === 0;
            pixelPreparation.active = false;
            _segmentTexts = result.texts;
            _measured = [];
            _pieces = [];
            _cursor = 0;
            step.restart();
        } else if (result.phase === 'frame') {
            frame = result.frame;
            busy = false;
            ++frameRevision;
            if (_dirtyFrame)
                frameRequest.restart();
        }
    }
    function measureNext() {
        if (!live || !busy || _working || _measuring)
            return;
        if (_cursor >= _queries.length) {
            _runs = [];
            measure.runs = [];
            requestPieces();
            return;
        }
        _family = _queries[_cursor].fontFamily;
        const batch = [];
        let characters = 0;
        for (let index = _cursor; index < _queries.length && batch.length < 64; ++index) {
            const query = _queries[index];
            if (query.text.length > 8192 || query.size > 16384 || query.size < 1 / 64) {
                fail('Lumiere native font query exceeds budget');
                return;
            }
            if (query.fontFamily !== _family || characters + query.text.length > 8192)
                break;
            characters += query.text.length;
            batch.push({
                key: 'm' + _generation + ':' + index,
                text: query.text,
                size: query.size,
                weight: query.weight,
                spacing: 0,
                maxBlur: 0,
                maxHaloRadius: 0
            });
        }
        _measuring = true;
        _runs = batch;
        measure.runs = batch;
        acceptMeasurement();
    }
    function acceptMeasurement() {
        if (!_complete || !live || !busy || !_measuring)
            return;
        if (measure.errorString) {
            fail(measure.errorString);
            return;
        }
        const metrics = measure.metrics;
        if (metrics.length !== _runs.length || metrics.some((metric, index) => metric.key !== _runs[index].key)) {
            fail("Incomplete native scene measurements");
            return;
        }
        for (const metric of metrics) {
            for (const name of ['advance', 'inkLeft', 'inkRight', 'inkTop', 'inkBottom', 'emAscent', 'emDescent'])
                if (!Number.isFinite(metric[name])) {
                    fail('Lumiere requires native ' + name + ' metric');
                    return;
                }
            _measured.push({
                key: _queries[_cursor].key,
                advance: metric.advance,
                inkLeft: metric.inkLeft,
                inkRight: metric.inkRight,
                inkTop: metric.inkTop,
                inkBottom: metric.inkBottom,
                emAscent: metric.emAscent,
                emDescent: metric.emDescent
            });
            ++measurementCount;
            ++_cursor;
        }
        _measuring = false;
        step.restart();
    }
    function requestPieces() {
        if (!_segmentTexts.length) {
            resolve();
            return;
        }
        if (_operation || !live || !busy)
            return;
        if (!textService || !textService.available) {
            fail('Lumiere requires exact ICU text service');
            return;
        }
        const batch = _segmentTexts.slice(_pieces.length, _pieces.length + 64);
        if (!batch.length) {
            resolve();
            return;
        }
        _operation = textService.segmentWords(batch, '');
        if (_operation.state >= EchoPluginOperation.Succeeded)
            piecesCompletion.restart();
    }
    function piecesFinished() {
        if (!_complete)
            return;
        const operation = _operation;
        if (!operation || !live || !busy || operation.state < EchoPluginOperation.Succeeded)
            return;
        _operation = null;
        if (operation.state === EchoPluginOperation.Succeeded) {
            const lines = JSON.parse(JSON.stringify(operation.result.lines));
            for (let i = 0; i < lines.length; i++)
                _pieces.push({
                    text: _segmentTexts[_pieces.length],
                    pieces: lines[i]
                });
            piecesRequest.restart();
        } else if (operation.errorCode === 'Busy')
            retry.restart();
        else
            fail(operation.errorMessage || 'Lumiere ICU operation canceled');
    }
    function resolve() {
        if (!_pixelsComplete) {
            if (!pixelPreparer) {
                fail('Native pixel preparation is required by this scene');
                return;
            }
            pixelPreparation.active = true;
            return;
        }
        send({
            phase: 'resolve',
            input: {
                measurements: _measured,
                pixels: _pixelResults,
                runtimeFrame: frameParameters(),
                pieces: _pieces,
                time: timeSeconds,
                layer: JSON.parse(JSON.stringify(layerFrame)),
                audio: JSON.parse(JSON.stringify(audio))
            }
        });
    }
    onFrameRequestsEnabledChanged: if (frameRequestsEnabled && _dirtyFrame)
        requestFrame()
    onOptionsChanged: invalidate()
    onRuntimeModeChanged: invalidate()
    onRuntimeParametersChanged: {
        _runtimeParametersDirty = true;
        requestFrame();
    }
    onPiecesChanged: invalidate()
    onTrackRevisionChanged: invalidate()
    onBaseFontChanged: invalidate()
    onTextServiceChanged: invalidate()
    onLiveChanged: invalidate()
    onTimeSecondsChanged: requestFrame()
    onLayerFrameChanged: requestFrame()
    onAudioChanged: requestFrame()
    Component.onCompleted: {
        _complete = true;
        invalidate();
    }
    Component.onDestruction: {
        _complete = false;
        stop();
    }
    Timer {
        id: frameRequest
        objectName: "lumiereFrameRequest"
        interval: 0
        onTriggered: if (root._complete)
            root.flushFrame()
    }
    Timer {
        id: piecesCompletion
        objectName: "lumierePiecesCompletion"
        interval: 0
        onTriggered: if (root._complete)
            root.piecesFinished()
    }
    Timer {
        id: piecesRequest
        objectName: "lumierePiecesRequest"
        interval: 0
        onTriggered: if (root._complete)
            root.requestPieces()
    }
    Timer {
        id: debounce
        interval: root._hasPrepared ? 220 : 0
        onTriggered: root.prepare()
    }
    Timer {
        id: step
        interval: 0
        onTriggered: root.measureNext()
    }
    Timer {
        id: retry
        interval: 50
        onTriggered: root.requestPieces()
    }
    Connections {
        target: root._operation
        function onCompleted() {
            root.piecesFinished();
        }
    }
    Loader {
        id: pixelPreparation
        active: false
        sourceComponent: root.pixelPreparer
        onLoaded: item.prepare(root._pixelQueries)
    }
    Connections {
        target: pixelPreparation.item
        function onFinished(results: var) {
            root._pixelResults = results;
            root._pixelsComplete = true;
            pixelResolve.restart();
        }
        function onFailed(message: string) {
            root.fail(message);
        }
    }
    Timer {
        id: pixelResolve
        interval: 0
        onTriggered: {
            pixelPreparation.active = false;
            if (root._complete && root.live && root.busy)
                root.resolve();
        }
    }
    Component {
        id: workerComponent
        WorkerScript {
            source: root.workerSource
            onReadyChanged: root.flush()
            onMessage: message => root.receive(message)
        }
    }
    Sonnet.SonnetFont {
        id: measureFont
        base: root.baseFont
        familyStack: root._family
    }
    GlyphRun {
        id: measure
        objectName: 'lumiereMeasurement'
        visible: false
        measurementOnly: true
        font: measureFont.value
    }
}
