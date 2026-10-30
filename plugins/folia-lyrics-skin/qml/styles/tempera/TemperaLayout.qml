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
    property var frame: null
    property real timeSeconds: 0
    property bool _framePending: false
    property var _extraPieces: []
    property var _pieceQueue: []
    property bool _refining: false
    property bool busy: false
    property string errorString: ""
    property int layoutRevision: 0
    property int paragraphCount: 0
    property int cachedParagraphs: 0
    property int measurementBatches: 0
    property int readBatches: 0
    property int refinementRounds: 0
    property real maxRequestedFontSize: 0
    property int _generation: 0
    property bool _ready: false
    property string _key: ""
    property string _tuningKey: ""
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
    property int _batchToken: 0
    signal ready(var result)
    function stop(): void {
        ++_generation;
        refineDeferred.stop(); tuningDeferred.stop(); frameDeferred.stop();
        piecesDeferred.stop(); acceptDeferred.stop(); measureDeferred.stop();
        if (_operation)
            _operation.cancel();
        _operation = null;
        step.stop();
        retry.stop();
        debounce.stop();
        _pending = null;
        _measuring = false;
        _runs = [];
        _requests = [];
        _measurements = [];
        _lines = [];
        _framePending = false;
        _extraPieces = [];
        _pieceQueue = [];
        _refining = false;
        busy = false;
    }
    function invalidate(force: bool): void {
        if (!_ready)
            return;
        const rebuild = JSON.parse(JSON.stringify(geometry));
        if (rebuild.tuning) {
            for (const field of ["cameraIntensity", "glyphMotion", "showCornerMarks"])
                delete rebuild.tuning[field];
            rebuild.tuning.layerImages = (rebuild.tuning.layerImages || []).map(image => ({
                        id: image.id,
                        align: image.align,
                        verticalAlign: image.verticalAlign
                    }));
        }
        const key = JSON.stringify([trackRevision, lyricCount, lyricOffsetMs, previewRows, rebuild, viewportWidth, viewportHeight, baseFont]);
        if (!force && key === _key) {
            requestTuning();
            return;
        }
        const keepPrevious = live && frame !== null;
        _key = key;
        stop();
        if (!keepPrevious)
            frame = null;
        errorString = "";
        if (!live || (previewRows === null && !lyricSource && !geometry.instrumental) || viewportWidth <= 0 || viewportHeight <= 0) {
            frame = null;
            if (_worker) {
                _worker.destroy();
                _worker = null;
            }
            return;
        }
        if (previewRows !== null && (!Array.isArray(previewRows) || previewRows.length !== 4 || lyricCount !== 4)) { fail("Preview requires exactly four authored rows"); return; }
        if (lyricCount > 8192) {
            fail("Tempera whole-article budget exceeded (8192 source rows)");
            return;
        }
        _row = 0;
        busy = true;
        _refining = false;
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
        frame = null;
        if (_worker) {
            _worker.destroy();
            _worker = null;
        }
    }
    function send(value: var): void {
        value.generation = _generation;
        value.trackRevision = trackRevision;
        _pending = value;
        if (!_worker)
            _worker = workerComponent.createObject(root);
        flush();
    }
    function flush(): void {
        if (live && (busy || _framePending) && _worker && _worker.ready && _pending) {
            const request = _pending;
            _pending = null;
            _worker.sendMessage(request);
        }
    }
    function receive(reply: var): void {
        if ((!busy && !_framePending) || !live || reply.generation !== _generation || reply.trackRevision !== trackRevision)
            return;
        if (reply.error) {
            fail(reply.error);
            return;
        }
        if (reply.phase === "read")
            step.restart();
        else if (reply.phase === "continue")
            send({
                phase: "step"
            });
        else if (reply.phase === "native") {
            busy = true;
            _refining = true;
            _pieceQueue = reply.pieces || [];
            _extraPieces = [];
            refinementRounds = reply.round;
            for (const request of reply.requests)
                maxRequestedFontSize = Math.max(maxRequestedFontSize, request.size);
            _requests = reply.requests;
            _cursor = 0;
            _measurements = [];
            refineDeferred.restart();
        } else if (reply.phase === "frame") {
            paragraphCount = reply.paragraphCount;
            cachedParagraphs = reply.cachedParagraphs;
            reply.frame.epoch = _generation;
            frame = reply.frame;
            busy = false;
            _framePending = false;
            _runs = [];
            ++layoutRevision;
            ready(frame);
            if (JSON.stringify(geometry.tuning) !== _tuningKey)
                tuningDeferred.restart();
            else if (frame.time !== timeSeconds)
                frameDeferred.restart();
        }
    }
    function requestTuning() {
        if (!live || busy || !frame || _framePending)
            return;
        const key = JSON.stringify(geometry.tuning);
        if (key === _tuningKey)
            return;
        _tuningKey = key;
        _framePending = true;
        send({
            phase: "tuning",
            tuning: geometry.tuning,
            time: timeSeconds
        });
    }
    function requestFrame() {
        if (!live || busy || !frame || _framePending)
            return;
        _framePending = true;
        send({
            phase: "frame",
            time: timeSeconds
        });
    }
    onTimeSecondsChanged: requestFrame()

    function readNext(): void {
        if (!busy || !live)
            return;
        if (_row >= lyricCount || geometry.hideLyrics) {
            if (geometry.waitForLyrics && !geometry.hideLyrics)
                return;
            _tuningKey = JSON.stringify(geometry.tuning);
            send({
                phase: "prepare",
                time: timeSeconds,
                context: Object.assign({}, geometry, {
                    width: viewportWidth,
                    height: viewportHeight
                })
            });
            return;
        }
        _lines = [];
        let units = 0, read = 0;
        while (_row < lyricCount && read < 64) {
            const row = JSON.parse(JSON.stringify(previewRows !== null ? previewRows[_row] : lyricSource.row(_row)));
            if (!row || typeof row.lineText !== "string") {
                fail("Tempera lyric row is not ready: " + _row);
                return;
            }
            if (row.lineText.length > 65536) {
                fail("Tempera line exceeds ICU UTF16 budget");
                return;
            }
            if (read && units + row.lineText.length > 65536)
                break;
            const line = Adapter.toFoliaLine(row, lyricOffsetMs, _row);
            if (typeof row.isChorus === "boolean")
                line.isChorus = row.isChorus;
            for (const key of ["isChorus", "blockIndex", "songPart", "wordSegments"])
                if (row[key] !== undefined)
                    line[key] = row[key];
            ++_row;
            ++read;
            units += row.lineText.length;
            if (!line.filtered && line.fullText.trim().length)
                _lines.push(line);
        }
        ++readBatches;
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
            fail("Tempera requires exact ICU word segmentation");
            return;
        }
        let values = _lines.map(line => line.fullText);
        if (_refining) {
            values = [];
            let units = 0;
            for (const text of _pieceQueue) {
                if (text.length > 65536) {
                    fail("Tempera fragment exceeds ICU UTF16 budget");
                    return;
                }
                if (values.length && (values.length === 64 || units + text.length > 65536))
                    break;
                values.push(text);
                units += text.length;
            }
        }
        _operation = textService.segmentWords(values, "");
        if (_operation.state >= EchoPluginOperation.Succeeded)
            piecesDeferred.restart();
    }
    function piecesFinished(): void {
        const operation = _operation;
        if (!operation || !busy || !live || operation.state < EchoPluginOperation.Succeeded)
            return;
        _operation = null;
        if (operation.state === EchoPluginOperation.Succeeded) {
            const pieces = JSON.parse(JSON.stringify(operation.result.lines));
            if (_refining) {
                const count = pieces.length;
                for (let i = 0; i < count; i++)
                    _extraPieces.push({
                        text: _pieceQueue[i],
                        pieces: pieces[i]
                    });
                _pieceQueue = _pieceQueue.slice(count);
                refineDeferred.restart();
                return;
            }
            send({
                phase: "append",
                lines: _lines,
                pieces: _lines.map((line, index) => ({
                            text: line.fullText,
                            pieces: pieces[index]
                        }))
            });
        } else if (operation.errorCode === "Busy")
            retry.restart();
        else
            fail(operation.errorMessage || "Tempera ICU operation canceled");
    }
    function refinePieces() {
        if (!busy || !live)
            return;
        if (_pieceQueue.length)
            requestPieces();
        else
            measureNext();
    }
    function measureNext(): void {
        if (!busy || !live || _measuring)
            return;
        if (_cursor >= _requests.length) {
            _runs = [];
            send({
                phase: "measurements",
                measurements: _measurements,
                pieces: _extraPieces
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
                fail("Tempera native measurement exceeds 8192 UTF16");
                return;
            }
            _batch.push(request);
            units += request.text.length;
            ++_cursor;
        }
        ++measurementBatches;
        ++_batchToken;
        _measuring = true;
        _runs = _batch.map((request, index) => ({
                    key: "m" + _generation + ":" + _batchToken + ":" + index,
                    text: request.text,
                    size: request.size,
                    weight: request.weight,
                    spacing: 0,
                    maxBlur: 0,
                    maxHaloRadius: 0
                }));
        acceptDeferred.restart();
    }
    function acceptMeasurements(): void {
        if (!_measuring || !busy || !live)
            return;
        if (measure.errorString) {
            fail("Tempera native font measurement (requested range " + Math.min(..._batch.map(request => request.size)) + ".." + Math.max(..._batch.map(request => request.size)) + "px): " + measure.errorString);
            return;
        }
        if (measure.metrics.length !== _batch.length)
            return;
        for (let i = 0; i < _batch.length; i++) {
            if (!Number.isFinite(measure.metrics[i].advance) || !Number.isFinite(measure.metrics[i].inkLeft) || !Number.isFinite(measure.metrics[i].inkRight)) {
                fail("Tempera requires native advance/ink text metrics");
                return;
            }
            if (measure.metrics[i].key !== "m" + _generation + ":" + _batchToken + ":" + i)
                return;
            _measurements.push({
                key: _batch[i].key,
                width: measure.metrics[i].width,
                advance: measure.metrics[i].advance,
                inkLeft: measure.metrics[i].inkLeft,
                inkRight: measure.metrics[i].inkRight,
                inkTop: measure.metrics[i].inkTop,
                inkBottom: measure.metrics[i].inkBottom,
                height: measure.metrics[i].height,
                baseline: measure.metrics[i].baseline
            });
        }
        _measuring = false;
        measureDeferred.restart();
    }
    onLyricSourceChanged: invalidate(true)
    onPreviewRowsChanged: invalidate(true)
    onLyricCountChanged: invalidate(true)
    onLyricOffsetMsChanged: invalidate(true)
    onTrackRevisionChanged: invalidate(true)
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
        stop();
    }
    Timer { id: refineDeferred; interval: 0; onTriggered: if (root._ready) root.refinePieces() }
    Timer { id: tuningDeferred; interval: 0; onTriggered: if (root._ready) root.requestTuning() }
    Timer { id: frameDeferred; interval: 0; onTriggered: if (root._ready) root.requestFrame() }
    Timer { id: piecesDeferred; interval: 0; onTriggered: if (root._ready) root.piecesFinished() }
    Timer { id: acceptDeferred; interval: 0; onTriggered: if (root._ready) root.acceptMeasurements() }
    Timer { id: measureDeferred; interval: 0; onTriggered: if (root._ready) root.measureNext() }
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
    TemperaFont {
        id: measurementFont
        base: root.baseFont
    }
    GlyphRun {
        id: measure
        objectName: "temperaMeasure"
        measurementOnly: true
        visible: false
        font: measurementFont.value
        runs: root._runs
        onLayoutChanged: if (root._ready) acceptDeferred.restart()
    }
}
