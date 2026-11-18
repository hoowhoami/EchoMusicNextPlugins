// Bounded visible-window preparation: exact ICU -> source Worker -> native QFont measurements.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "layout-job.mjs" as Job

Item {
    id: root
    property var items: []
    property real fontPx: 20
    property int fontWeight: 500
    property font baseFont
    property EchoPluginText textService: null
    property bool live: true
    property var result: []
    property string errorString: ""
    property bool busy: false
    property int revision: 0
    property int measurementBatches: 0
    property var _worker: null
    property var _pending: null
    property var _operation: null
    property var _texts: []
    property var _textBatch: []
    property var _pieces: []
    property int _textCursor: 0
    property int _pieceCount: 0
    property var _requests: []
    property var _batch: []
    property var _measurements: []
    property var _runs: []
    property int _cursor: 0
    property bool _measuring: false
    property int _generation: 0
    property bool _ready: false
    property string _key: ""
    function stop(): void {
        ++_generation;
        if (_operation)
            _operation.cancel();
        _operation = null;
        piecesTask.stop();
        measurementTask.stop();
        nextMeasurementTask.stop();
        retry.stop();
        step.stop();
        debounce.stop();
        _pending = null;
        _requests = [];
        _batch = [];
        _measurements = [];
        _runs = [];
        _texts = [];
        _pieces = [];
        _measuring = false;
        busy = false;
    }
    function invalidate(): void {
        if (!_ready)
            return;
        const key = JSON.stringify([items, fontPx, fontWeight, baseFont]);
        if (live && key === _key)
            return;
        _key = key;
        stop();
        errorString = "";
        if (!live || !items.length) {
            result = [];
            if (_worker) {
                _worker.destroy();
                _worker = null;
            }
            return;
        }
        busy = true;
        debounce.restart();
    }
    function fail(message: string): void {
        stop();
        result = [];
        if (_worker) {
            _worker.destroy();
            _worker = null;
        }
        errorString = message;
    }
    function begin(): void {
        if (!live || !busy)
            return;
        try {
            _texts = Job.requestedTexts(JSON.parse(JSON.stringify(items)));
        } catch (error) {
            fail(String(error.message || error));
            return;
        }
        _textCursor = 0;
        _pieces = [];
        _pieceCount = 0;
        requestPieces();
    }
    function requestPieces(): void {
        if (!live || !busy || _operation)
            return;
        if (!textService || !textService.available) {
            fail("Harmony requires exact ICU word segmentation");
            return;
        }
        if (_textCursor >= _texts.length) {
            send({
                phase: "layout",
                vocals: JSON.parse(JSON.stringify(items)),
                size: fontPx,
                weight: fontWeight,
                pieces: _pieces
            });
            return;
        }
        _textBatch = [];
        let units = 0;
        while (_textCursor < _texts.length && _textBatch.length < 64) {
            const text = _texts[_textCursor];
            if (text.length > 8192) {
                fail("Harmony line exceeds 8192 UTF16 units");
                return;
            }
            if (_textBatch.length && units + text.length > 65536)
                break;
            _textBatch.push(text);
            units += text.length;
            ++_textCursor;
        }
        _operation = textService.segmentWords(_textBatch, "");
        if (_operation.state >= EchoPluginOperation.Succeeded)
            schedulePieces();
    }
    function piecesFinished(): void {
        const op = _operation;
        if (!op || !live || !busy || op.state < EchoPluginOperation.Succeeded)
            return;
        _operation = null;
        if (op.state === EchoPluginOperation.Succeeded) {
            const values = JSON.parse(JSON.stringify(op.result.lines));
            for (let i = 0; i < _textBatch.length; i++) {
                _pieceCount += values[i].length;
                if (_pieceCount > 1048576) {
                    fail("Harmony ICU prefix pieces exceed 1048576 entries");
                    return;
                }
                _pieces.push({
                    text: _textBatch[i],
                    pieces: values[i]
                });
            }
            step.restart();
        } else if (op.errorCode === "Busy") {
            _textCursor -= _textBatch.length;
            retry.restart();
        } else
            fail(op.errorMessage || "Harmony ICU operation canceled");
    }
    function send(value: var): void {
        if (!live || !busy)
            return;
        value.generation = _generation;
        _pending = value;
        if (!_worker)
            _worker = workerComponent.createObject(root);
        flush();
    }
    function flush(): void {
        if (live && busy && _worker && _worker.ready && _pending) {
            const value = _pending;
            _pending = null;
            _worker.sendMessage(value);
        }
    }
    function receive(reply: var): void {
        if (!live || !busy || reply.generation !== _generation)
            return;
        if (reply.error) {
            fail(reply.error);
            return;
        }
        if (reply.phase === "measure") {
            _requests = reply.requests;
            _cursor = 0;
            _measurements = [];
            scheduleMeasureNext();
        } else if (reply.phase === "complete") {
            result = reply.items;
            busy = false;
            _runs = [];
            _requests = [];
            _pieces = [];
            _texts = [];
            _measurements = [];
            ++revision;
        }
    }
    function measureNext(): void {
        if (!live || !busy)
            return;
        if (_cursor >= _requests.length) {
            _runs = [];
            send({
                phase: "measurements",
                measurements: _measurements
            });
            return;
        }
        _batch = [];
        let units = 0;
        while (_cursor < _requests.length && _batch.length < 64) {
            const value = _requests[_cursor];
            if (_batch.length && units + value.text.length > 8192)
                break;
            _batch.push(value);
            units += value.text.length;
            ++_cursor;
        }
        _measuring = true;
        ++measurementBatches;
        _runs = _batch.map((v, i) => ({
                    key: "p" + _generation + ":" + i,
                    text: v.text,
                    size: v.size,
                    weight: v.weight,
                    spacing: v.spacing,
                    maxBlur: 0,
                    maxHaloRadius: 0
                }));
        scheduleMeasurements();
    }
    function acceptMeasurements(): void {
        if (!_measuring || !live || !busy)
            return;
        if (measure.errorString) {
            fail("Harmony native measurement: " + measure.errorString);
            return;
        }
        if (measure.metrics.length !== _batch.length)
            return;
        for (let i = 0; i < _batch.length; i++) {
            if (measure.metrics[i].key !== "p" + _generation + ":" + i)
                return;
            _measurements.push({
                key: _batch[i].key,
                width: measure.metrics[i].advance
            });
        }
        _measuring = false;
        scheduleMeasureNext();
    }
    onItemsChanged: invalidate()
    onFontPxChanged: invalidate()
    onFontWeightChanged: invalidate()
    onBaseFontChanged: invalidate()
    onTextServiceChanged: {
        _key = "";
        invalidate();
    }
    onLiveChanged: invalidate()
    Component.onCompleted: {
        _ready = true;
        invalidate();
    }
    Component.onDestruction: {
        _ready = false;
        piecesTask.stop();
        measurementTask.stop();
        nextMeasurementTask.stop();
        if (_operation)
            _operation.cancel();
    }
    Timer {
        id: debounce
        interval: 0
        onTriggered: root.begin()
    }
    Timer {
        id: step
        interval: 0
        onTriggered: root.requestPieces()
    }
    Timer {
        id: retry
        interval: 50
        onTriggered: root.requestPieces()
    }
    Connections {
        target: root._operation
        function onCompleted(): void {
            root.piecesFinished();
        }
    }
    Component {
        id: workerComponent
        WorkerScript {
            source: Qt.resolvedUrl("layout-worker.mjs")
            onReadyChanged: root.flush()
            onMessage: reply => root.receive(reply)
        }
    }
    GlyphRun {
        id: measure
        objectName: "harmonyMeasure"
        visible: false
        measurementOnly: true
        font: root.baseFont
        runs: root._runs
        onLayoutChanged: root.scheduleMeasurements()
    }

    // Deferred work belongs to this component and cannot outlive its QML context.
    function schedulePieces(): void {
        if (_ready)
            piecesTask.restart();
    }
    Timer {
        id: piecesTask
        interval: 0
        onTriggered: if (root._ready)
            root.piecesFinished()
    }
    function scheduleMeasurements(): void {
        if (_ready)
            measurementTask.restart();
    }
    Timer {
        id: measurementTask
        interval: 0
        onTriggered: if (root._ready)
            root.acceptMeasurements()
    }
    function scheduleMeasureNext(): void {
        if (_ready)
            nextMeasurementTask.restart();
    }
    Timer {
        id: nextMeasurementTask
        interval: 0
        onTriggered: if (root._ready)
            root.measureNext()
    }
}
