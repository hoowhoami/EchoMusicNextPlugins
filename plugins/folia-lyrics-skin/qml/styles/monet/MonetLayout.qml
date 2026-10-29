// Exact source model in Worker; native complete-string metrics, bounded per GUI turn.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "layout-job.mjs" as Job

Item {
    id: root
    property var entries: []
    property real viewportWidth: 0
    property real viewportHeight: 0
    property font baseFont
    property font subtitleFont: baseFont
    property var settings: ({})
    property color primaryColor: "white"
    property EchoPluginText textService: null
    property bool live: true
    property bool manual: false
    property var result: []
    property var geometry: null
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
    property var _inlineQuery: null
    property bool _subtitle: false
    property bool _measuring: false
    property int _generation: 0
    property bool _ready: false
    property string _key: ""
    function stop(): void {
        ++_generation;
        piecesDeferred.stop(); measureDeferred.stop(); acceptDeferred.stop();
        if (_operation)
            _operation.cancel();
        _operation = null;
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
        const key = JSON.stringify([entries, viewportWidth, viewportHeight, baseFont, subtitleFont, settings, String(primaryColor), manual]);
        if (live && key === _key)
            return;
        _key = key;
        stop();
        errorString = "";
        if (!live || !entries.length || viewportWidth <= 0 || viewportHeight <= 0) {
            result = [];
            geometry = null;
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
        geometry = null;
        errorString = message;
    }
    function begin(): void {
        if (!live || !busy)
            return;
        try {
            _texts = Job.requestedTexts(JSON.parse(JSON.stringify(entries)), settings);
        } catch (error) {
            fail(String(error.message || error));
            return;
        }
        _textCursor = 0;
        _pieces = [];
        requestPieces();
    }
    function requestPieces(): void {
        if (!live || !busy || _operation)
            return;
        if (!textService || !textService.available) {
            fail("Monet requires exact ICU word segmentation");
            return;
        }
        if (_textCursor >= _texts.length) {
            send({
                phase: "layout",
                manual,
                entries: JSON.parse(JSON.stringify(entries)),
                width: viewportWidth,
                height: viewportHeight,
                settings: JSON.parse(JSON.stringify(settings)),
                primaryColor: String(primaryColor),
                pieces: _pieces
            });
            return;
        }
        _textBatch = [];
        let units = 0;
        while (_textCursor < _texts.length && _textBatch.length < 64) {
            const text = _texts[_textCursor];
            if (text.length > 8192) {
                fail("Monet line exceeds 8192 UTF16 units");
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
            piecesDeferred.restart();
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
            fail(op.errorMessage || "Monet ICU operation canceled");
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
    function receive(message: var): void {
        if (!live || !busy || message.generation !== _generation)
            return;
        if (message.error) {
            fail(message.error);
            return;
        }
        const reply = JSON.parse(message.payload);
        if (reply.phase === "measure") {
            _requests = reply.requests;
            _cursor = 0;
            _measurements = [];
            measureDeferred.restart();
        } else if (reply.phase === "complete") {
            result = reply.entries;
            geometry = reply.geometry;
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
        const inlineMode = _requests[_cursor].inlineBox === true;
        while (_cursor < _requests.length && _batch.length < (inlineMode ? 16 : 64) && _requests[_cursor].subtitle === _subtitle && (_requests[_cursor].inlineBox === true) === inlineMode) {
            const value = _requests[_cursor];
            if (value.text.length > 8192) {
                fail("Monet native context exceeds 8192 UTF16");
                return;
            }
            if (_batch.length && units + value.text.length > 1024)
                break;
            _batch.push(value);
            units += value.text.length;
            ++_cursor;
        }
        _measuring = true;
        ++measurementBatches;
        const runs = [];
        for (let i = 0; i < _batch.length; i++) {
            const value = _batch[i], run = {
                key: "m" + _generation + ":" + i,
                text: value.text,
                size: value.size,
                weight: value.weight,
                spacing: 0,
                maxBlur: 0,
                maxHaloRadius: 0
            };
            if (value.inlineBox) {
                _inlineQuery = value;
                minContent.text = value.text;
                minContent.forceLayout();
                value.boxWidth = Math.min(Math.max(minContent.contentWidth, value.availableWidth), minContent.implicitWidth);
                value.paragraph = value.boxWidth <= 4096;
                if (!value.paragraph && /[\r\n\u2028\u2029]/.test(value.text)) {
                    fail("Monet multiline inline-block exceeds native 4096px paragraph budget");
                    return;
                }
                if (value.paragraph) {
                    run.maxWidth = Math.max(1, value.boxWidth);
                    run.lineHeight = value.lineHeight;
                }
            }
            runs.push(run);
        }
        _runs = runs;
        acceptDeferred.restart();
    }
    function acceptMeasurements(): void {
        if (!_measuring || !live || !busy)
            return;
        if (measure.errorString) {
            fail("Monet native measurement: " + measure.errorString);
            return;
        }
        if (measure.metrics.length !== _batch.length)
            return;
        for (let i = 0; i < _batch.length; i++) {
            const metric = measure.metrics[i];
            if (metric.key !== "m" + _generation + ":" + i)
                return;
            if (!Number.isFinite(metric.advance) || !Number.isFinite(metric.inkTop) || !Number.isFinite(metric.inkBottom)) {
                fail("Monet requires real native advance and ink metrics");
                return;
            }
            const value = _batch[i], result = {
                key: value.key,
                width: metric.advance,
                actualBoundingBoxAscent: -metric.inkTop,
                actualBoundingBoxDescent: metric.inkBottom,
                nativeHeight: metric.height,
                nativeBaseline: metric.baseline
            };
            if (value.inlineBox) {
                result.boxWidth = value.boxWidth;
                result.lineCount = metric.lineCount;
                result.boxHeight = metric.lineCount * value.lineHeight;
                result.paragraph = value.paragraph;
            }
            _measurements.push(result);
        }
        _measuring = false;
        measureDeferred.restart();
    }
    onEntriesChanged: invalidate()
    onManualChanged: invalidate()
    onViewportWidthChanged: invalidate()
    onViewportHeightChanged: invalidate()
    onBaseFontChanged: invalidate()
    onSubtitleFontChanged: invalidate()
    onSettingsChanged: invalidate()
    onPrimaryColorChanged: invalidate()
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
        stop();
    }
    Timer { id: piecesDeferred; interval: 0; onTriggered: if (root._ready) root.piecesFinished() }
    Timer { id: measureDeferred; interval: 0; onTriggered: if (root._ready) root.measureNext() }
    Timer { id: acceptDeferred; interval: 0; onTriggered: if (root._ready) root.acceptMeasurements() }
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
    MonetFont {
        id: mainFont
        base: root.baseFont
    }
    MonetFont {
        id: subFont
        base: root.subtitleFont
    }
    MonetFont {
        id: inlineFont
        base: root._subtitle ? root.subtitleFont : root.baseFont
        pixelSize: root._inlineQuery ? root._inlineQuery.size : 1
        weight: root._inlineQuery ? root._inlineQuery.weight : 600
    }
    Text {
        id: minContent
        visible: false
        width: 1
        wrapMode: Text.WordWrap
        textFormat: Text.PlainText
        font: inlineFont.value
    }
    GlyphRun {
        id: measure
        objectName: "monetMeasure"
        visible: false
        measurementOnly: true
        font: root._subtitle ? subFont.value : mainFont.value
        runs: root._runs
        onLayoutChanged: if (root._ready) acceptDeferred.restart()
    }
}
