// Whole-song plain data stays in a Worker; GUI text shaping is sliced into bounded native batches.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "../../shared/lyricAdapter.mjs" as Adapter
import "native-measure.mjs" as Input

Item {
    id: root
    property EchoPluginReadModel lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    property EchoPluginText textService: null
    property real viewportWidth: 0
    property real viewportHeight: 0
    property font baseFont
    property var geometry: ({})
    property bool live: true
    property var article: null
    property bool busy: false
    property string errorString: ""
    property int layoutRevision: 0
    property int measurementBatches: 0
    property int readBatches: 0
    property int refinementRounds: 0
    property real maxRequestedFontSize: 0
    property int _generation: 0
    property bool _ready: false
    property string _key: ""
    property var _worker: null
    property var _pending: null
    property var _operation: null
    property int _row: 0
    property var _lines: []
    property var _requests: []
    property var _measurements: []
    property var _batch: []
    property var _runs: []
    property int _cursor: 0
    property bool _measuring: false
    property bool _checkingSource: false
    readonly property bool sourceCurrent: !_checkingSource
    property string _preparationIdentity: ""
    property string _acceptedIdentity: ""
    signal ready(var result)
    function stop(): void {
        ++_generation;
        if (_operation)
            _operation.cancel();
        _operation = null;
        step.stop();
        piecesTask.stop();
        measurementTask.stop();
        nextMeasurementTask.stop();
        retry.stop();
        debounce.stop();
        _pending = null;
        _measuring = false;
        _checkingSource = false;
        _runs = [];
        _requests = [];
        _measurements = [];
        _lines = [];
        busy = false;
    }
    function invalidate(force: bool): void {
        invalidateSource(force, false);
    }
    function invalidateSource(force: bool, checkIdentity: bool): void {
        if (!_ready)
            return;
        const key = JSON.stringify([trackRevision, lyricCount, lyricOffsetMs, previewRows, geometry, viewportWidth, viewportHeight, baseFont]);
        if (!force && key === _key)
            return;
        const identity = JSON.stringify([lyricCount, lyricOffsetMs, geometry, viewportWidth, viewportHeight, baseFont]);
        const checkPrevious = checkIdentity && article !== null && _worker && identity === _acceptedIdentity;
        const keepPrevious = !force && article !== null;
        _key = key;
        stop();
        if (!keepPrevious && !checkPrevious) {
            article = null;
            _acceptedIdentity = "";
        }
        errorString = "";
        if (!live || (previewRows === null && !lyricSource) || viewportWidth <= 0 || viewportHeight <= 0) {
            article = null;
            if (_worker) {
                _worker.destroy();
                _worker = null;
            }
            return;
        }
        if (previewRows !== null && (!Array.isArray(previewRows) || previewRows.length !== 4 || lyricCount !== 4)) {
            fail("Preview requires exactly four authored rows");
            return;
        }
        if (lyricCount > 8192) {
            fail("Fume whole-article budget exceeded (8192 source rows)");
            return;
        }
        _row = 0;
        _preparationIdentity = identity;
        if (checkPrevious) {
            _checkingSource = true;
            send({
                phase: "identify",
                identityKey: identity
            });
            return;
        }
        busy = true;
        if (keepPrevious)
            debounce.restart();
        else
            send({
                phase: "reset"
            });
    }
    function fail(message: string): void {
        stop();
        errorString = message;
        article = null;
    }
    function send(value: var): void {
        if (value.phase === "reset")
            value.identityKey = _preparationIdentity;
        value.generation = _generation;
        value.trackRevision = trackRevision;
        _pending = value;
        if (!_worker)
            _worker = workerComponent.createObject(root);
        flush();
    }
    function flush(): void {
        if (live && (busy || _checkingSource) && _worker && _worker.ready && _pending) {
            const request = _pending;
            _pending = null;
            _worker.sendMessage(request);
        }
    }
    function receive(reply: var): void {
        if ((!busy && !_checkingSource) || !live || reply.generation !== _generation || reply.trackRevision !== trackRevision)
            return;
        if (reply.error) {
            fail(reply.error);
            return;
        }
        if (reply.phase === "identity-read") {
            step.restart();
        } else if (reply.phase === "identity-match") {
            _checkingSource = false;
        } else if (reply.phase === "identity-different") {
            _checkingSource = false;
            invalidate(true);
        } else if (reply.phase === "read")
            step.restart();
        else if (reply.phase === "continue") {
            send({
                phase: "step"
            });
        } else if (reply.phase === "measure") {
            refinementRounds = reply.round;
            for (const request of reply.requests)
                maxRequestedFontSize = Math.max(maxRequestedFontSize, request.size);
            _requests = reply.requests;
            _cursor = 0;
            _measurements = [];
            scheduleMeasureNext();
        } else if (reply.phase === "complete") {
            const value = reply.article;
            if (value) {
                value.blockBySourceLineIndex = new Map(value.blocks.map(block => [block.sourceLineIndex, block]));
                value.chronologicalBlocks = value.blocks.slice().sort((a, b) => a.sourceLineIndex - b.sourceLineIndex);
            }
            article = value;
            _acceptedIdentity = value ? _preparationIdentity : "";
            busy = false;
            _runs = [];
            ++layoutRevision;
            ready(value);
        }
    }
    function readNext(): void {
        if ((!busy && !_checkingSource) || !live)
            return;
        if (_row >= lyricCount) {
            if (_checkingSource) {
                send({
                    phase: "identity-append",
                    lines: [],
                    last: true
                });
                return;
            }
            send({
                phase: "prepare",
                context: {
                    viewport: {
                        width: viewportWidth,
                        height: viewportHeight
                    },
                    theme: geometry.theme,
                    lyricsFontScale: geometry.lyricsFontScale,
                    tuning: geometry.tuning
                }
            });
            return;
        }
        _lines = [];
        let units = 0, read = 0;
        while (_row < lyricCount && read < 64) {
            const row = JSON.parse(JSON.stringify(previewRows !== null ? previewRows[_row] : lyricSource.row(_row)));
            if (!row || typeof row.lineText !== "string") {
                fail("Fume lyric row is not ready: " + _row);
                return;
            }
            if (row.lineText.length > 65536) {
                fail("Fume line exceeds ICU UTF16 budget");
                return;
            }
            if (read && units + row.lineText.length > 65536)
                break;
            const line = Adapter.toFoliaLine(row, lyricOffsetMs, _row);
            if (typeof row.isChorus === "boolean")
                line.isChorus = row.isChorus;
            ++_row;
            ++read;
            units += row.lineText.length;
            if (!line.filtered && line.fullText.trim().length)
                _lines.push(line);
        }
        ++readBatches;
        if (_checkingSource) {
            send({
                phase: "identity-append",
                lines: _lines,
                last: _row >= lyricCount
            });
            return;
        }
        if (!_lines.length) {
            send({
                phase: "append",
                lines: [],
                pieces: []
            });
            return;
        }
        requestPieces();
    }
    function requestPieces(): void {
        if (!busy || !live || _operation)
            return;
        if (!textService || !textService.available) {
            fail("Fume requires exact ICU word segmentation");
            return;
        }
        _operation = textService.segmentWords(_lines.map(line => Input.normalize(line.fullText)), "");
        if (_operation.state >= EchoPluginOperation.Succeeded)
            schedulePieces();
    }
    function piecesFinished(): void {
        const operation = _operation;
        if (!operation || !busy || !live || operation.state < EchoPluginOperation.Succeeded)
            return;
        _operation = null;
        if (operation.state === EchoPluginOperation.Succeeded) {
            const pieces = JSON.parse(JSON.stringify(operation.result.lines));
            send({
                phase: "append",
                lines: _lines,
                pieces: _lines.map((line, index) => ({
                            text: Input.normalize(line.fullText),
                            pieces: pieces[index]
                        }))
            });
        } else if (operation.errorCode === "Busy")
            retry.restart();
        else
            fail(operation.errorMessage || "Fume ICU operation canceled");
    }
    function measureNext(): void {
        if (!busy || !live)
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
            const request = _requests[_cursor];
            if (_batch.length && units + request.text.length > 1024)
                break;
            if (request.text.length > 8192) {
                fail("Fume native measurement exceeds 8192 UTF16");
                return;
            }
            _batch.push(request);
            units += request.text.length;
            ++_cursor;
        }
        ++measurementBatches;
        _measuring = true;
        _runs = _batch.map((request, index) => ({
                    key: "m" + _generation + ":" + index,
                    text: request.text,
                    size: request.size,
                    weight: request.weight,
                    spacing: 0,
                    maxBlur: 0,
                    maxHaloRadius: 0
                }));
        scheduleMeasurements();
    }
    function acceptMeasurements(): void {
        if (!_measuring || !busy || !live)
            return;
        if (measure.errorString) {
            fail("Fume native font measurement (largest request " + maxRequestedFontSize + "px): " + measure.errorString);
            return;
        }
        if (measure.metrics.length !== _batch.length)
            return;
        for (let i = 0; i < _batch.length; i++) {
            if (measure.metrics[i].key !== "m" + _generation + ":" + i)
                return;
            if (!Number.isFinite(measure.metrics[i].advance)) {
                fail("Fume requires native text advance metrics");
                return;
            }
            _measurements.push({
                key: _batch[i].key,
                width: measure.metrics[i].advance
            });
        }
        _measuring = false;
        scheduleMeasureNext();
    }
    onLyricSourceChanged: invalidateSource(true, true)
    onPreviewRowsChanged: invalidate(true)
    onLyricCountChanged: invalidate(true)
    onLyricOffsetMsChanged: invalidate(true)
    onTrackRevisionChanged: invalidateSource(true, true)
    onGeometryChanged: invalidate(false)
    onViewportWidthChanged: invalidate(false)
    onViewportHeightChanged: invalidate(false)
    onBaseFontChanged: invalidate(false)
    onTextServiceChanged: invalidate(true)
    onLiveChanged: invalidate(true)
    Component.onCompleted: {
        _ready = true;
        invalidate(true);
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
        interval: 96
        onTriggered: root.send({
            phase: "reset"
        })
    }
    Timer {
        id: step
        interval: 0
        onTriggered: root.readNext()
    }
    Timer {
        id: retry
        interval: 50
        onTriggered: root.requestPieces()
    }
    Connections {
        target: root.lyricSource
        function onModelReset(): void {
            root.invalidate(true);
        }
        function onDataChanged(): void {
            root.invalidate(true);
        }
        function onRowsInserted(): void {
            root.invalidate(true);
        }
        function onRowsRemoved(): void {
            root.invalidate(true);
        }
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
            onMessage: messageObject => root.receive(messageObject)
        }
    }
    FumeFont {
        id: measurementFont
        base: root.baseFont
    }
    GlyphRun {
        id: measure
        objectName: "fumeMeasure"
        measurementOnly: true
        visible: false
        font: measurementFont.value
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
