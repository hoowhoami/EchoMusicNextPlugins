// One bounded viewport scene: native full-context metrics, exact ICU and source Worker math.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "../sonnet" as Sonnet

Item {
    id: root
    property var options: null
    property bool runtimeMode: false
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
    property bool _dirtyFrame: false
    property var _runs: []
    property string _family: ""
    property bool _runtimeParametersDirty: true
    function frameParameters(): var {
        const value = _runtimeParametersDirty ? JSON.parse(JSON.stringify(runtimeParameters)) : {};
        _runtimeParametersDirty = false;
        value.nowMs = presentationTimeMs;
        return value;
    }
    function stop() {
        ++_generation;
        frameRequest.stop();
        measurementCompletion.stop();
        piecesCompletion.stop();
        piecesRequest.stop();
        debounce.stop();
        step.stop();
        retry.stop();
        if (_operation)
            _operation.cancel();
        _operation = null;
        _pending = null;
        _queries = [];
        _measured = [];
        _pieces = [];
        _segmentTexts = [];
        _runs = [];
        _working = false;
        _measuring = false;
        _dirtyFrame = false;
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
        if (!_complete || !live || !options || !_worker)
            return;
        if (_working || busy) {
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
        const result = JSON.parse(message.payload);
        if (result.phase === 'measure') {
            busy = true;
            _queries = result.measurements;
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
            requestPieces();
            return;
        }
        const query = _queries[_cursor];
        if (query.text.length > 8192 || query.size > 16384 || query.size < 1 / 64) {
            fail('Lumiere native font query exceeds budget');
            return;
        }
        _family = query.fontFamily;
        _measuring = true;
        _runs = [
            {
                key: 'm' + _generation + ':' + _cursor,
                text: query.text,
                size: query.size,
                weight: query.weight,
                spacing: 0,
                maxBlur: 0,
                maxHaloRadius: 0
            }
        ];
        measurementCompletion.restart();
    }
    function acceptMeasurement() {
        if (!_complete || !live || !busy || !_measuring)
            return;
        if (measure.errorString) {
            fail(measure.errorString);
            return;
        }
        const metric = measure.metrics[0];
        if (!metric || metric.key !== 'm' + _generation + ':' + _cursor)
            return;
        for (const name of ['advance', 'inkLeft', 'inkRight', 'inkTop', 'inkBottom', 'emAscent', 'emDescent'])
            if (!Number.isFinite(metric[name])) {
                fail('Lumiere requires native ' + name + ' metric');
                return;
            }
        const query = _queries[_cursor], result = JSON.parse(JSON.stringify(metric));
        result.key = query.key;
        _measured.push(result);
        ++measurementCount;
        ++_cursor;
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
        send({
            phase: 'resolve',
            input: {
                measurements: _measured,
                runtimeFrame: frameParameters(),
                pieces: _pieces,
                time: timeSeconds,
                layer: JSON.parse(JSON.stringify(layerFrame)),
                audio: JSON.parse(JSON.stringify(audio))
            }
        });
    }
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
            root.requestFrame()
    }
    Timer {
        id: measurementCompletion
        objectName: "lumiereMeasurementCompletion"
        interval: 0
        onTriggered: if (root._complete)
            root.acceptMeasurement()
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
        interval: 220
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
    Component {
        id: workerComponent
        WorkerScript {
            source: Qt.resolvedUrl('scene-worker.mjs')
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
        runs: root._runs
        onLayoutChanged: if (root._complete)
            measurementCompletion.restart()
    }
}
