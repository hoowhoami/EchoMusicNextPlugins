// Bounded visible-window preparation: exact ICU -> source Worker -> native QFont measurements.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "layout-job.mjs" as Job

Item {
    id: root
    property var items: []
    property int lineCount: 0
    property real target: -1
    property real viewportWidth: 0
    property real viewportHeight: 0
    property font baseFont
    property font subtitleFont: baseFont
    property var settings: ({})
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
    property var _requests: []
    property var _batch: []
    property var _measurements: []
    property var _runs: []
    property int _cursor: 0
    property bool _subtitle: false
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
        const key = JSON.stringify([items, lineCount, target, viewportWidth, viewportHeight, baseFont, subtitleFont, settings]);
        if (live && key === _key)
            return;
        _key = key;
        stop();
        errorString = "";
        if (!live || !items.length || viewportWidth <= 0 || viewportHeight <= 0) {
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
        errorString = message;
    }
    function begin(): void {
        if (!live || !busy)
            return;
        _texts = Job.requestedTexts(JSON.parse(JSON.stringify(items)), settings);
        _textCursor = 0;
        _pieces = [];
        requestPieces();
    }
    function requestPieces(): void {
        if (!live || !busy || _operation)
            return;
        if (!textService || !textService.available) {
            fail("Pendolo requires exact ICU word segmentation");
            return;
        }
        if (_textCursor >= _texts.length) {
            send({
                phase: "layout",
                fontKey: JSON.stringify([baseFont, subtitleFont]),
                items: JSON.parse(JSON.stringify(items)),
                count: lineCount,
                target,
                width: viewportWidth,
                height: viewportHeight,
                settings: JSON.parse(JSON.stringify(settings)),
                pieces: _pieces
            });
            return;
        }
        _textBatch = [];
        let units = 0;
        while (_textCursor < _texts.length && _textBatch.length < 64) {
            const text = _texts[_textCursor];
            if (text.length > 8192) {
                fail("Pendolo line exceeds 8192 UTF16 units");
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
            for (let i = 0; i < _textBatch.length; i++)
                _pieces.push({
                    text: _textBatch[i],
                    pieces: values[i]
                });
            step.restart();
        } else if (op.errorCode === "Busy") {
            _textCursor -= _textBatch.length;
            retry.restart();
        } else
            fail(op.errorMessage || "Pendolo ICU operation canceled");
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
        _subtitle = _requests[_cursor].subtitle;
        while (_cursor < _requests.length && _batch.length < 64 && _requests[_cursor].subtitle === _subtitle) {
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
                    maxHaloRadius: 0,
                    maxWidth: 4096,
                    lineHeight: Math.max(1, v.size * 1.5)
                }));
        scheduleMeasurements();
    }
    function acceptMeasurements(): void {
        if (!_measuring || !live || !busy)
            return;
        if (measure.errorString) {
            fail("Pendolo native measurement: " + measure.errorString);
            return;
        }
        if (measure.metrics.length !== _batch.length)
            return;
        for (let i = 0; i < _batch.length; i++) {
            if (measure.metrics[i].key !== "p" + _generation + ":" + i)
                return;
            _measurements.push({
                key: _batch[i].key,
                width: measure.metrics[i].width
            });
        }
        _measuring = false;
        scheduleMeasureNext();
    }
    onItemsChanged: invalidate()
    onLineCountChanged: invalidate()
    onTargetChanged: invalidate()
    onViewportWidthChanged: invalidate()
    onViewportHeightChanged: invalidate()
    onBaseFontChanged: invalidate()
    onSubtitleFontChanged: invalidate()
    onSettingsChanged: invalidate()
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
        interval: 16
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
            source: Qt.resolvedUrl("worker.mjs")
            onReadyChanged: root.flush()
            onMessage: reply => root.receive(reply)
        }
    }
    GlyphRun {
        id: measure
        objectName: "pendoloMeasure"
        visible: false
        measurementOnly: true
        font: root._subtitle ? root.subtitleFont : root.baseFont
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
