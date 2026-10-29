// Only bounded native text batches run on the GUI thread; the programme stays in a lazy Worker.
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
    property string seed: trackRevision
    property EchoPluginText textService: null
    property font baseFont
    property var geometry: ({})
    property bool live: true
    property int requestedIndex: 0
    property real timeSeconds: 0
    property bool watching:false
    property bool instrumental:false
    property var program: null
    property var scene: null
    property int sceneIndex: -1
    property string errorString: ""
    property bool busy: false
    property int readBatches: 0
    property int measurementBatches: 0
    readonly property int cachedSceneCount: _cache.length
    property int _generation: 0
    property int _sceneToken: 0
    property int _row: 0
    property bool _ready: false
    property bool _reading: false
    property bool _preparing: false
    property var _worker: null
    property var _pending: null
    property var _operation: null
    property var _lines: []
    property var _pieceTexts: []
    property var _pieceBatch: []
    property var _pieces: []
    property int _pieceCursor: 0
    property var _queries: []
    property var _measurements: []
    property int _queryCursor: 0
    property var _batch: []
    property var _runs: []
    property string _familyStack: ""
    property var _cache: []
    property var _preheat: []
    signal sceneReady(int index, var value)

    function stop(keepWorker): void {
        ++_generation;
        ++_sceneToken;
        readStep.stop(); retry.stop(); sceneStep.stop();measureStep.stop();acceptStep.stop();piecesStep.stop();requestPiecesStep.stop();
        if (_operation) _operation.cancel();
        _operation = null;
        _pending = null; _reading = false; _preparing = false;
        _lines = []; _queries = []; _runs = []; _pieces = []; _measurements = [];
        _pieceTexts = []; _pieceBatch = []; _cache = []; _preheat = [];
        busy = false;watching=false;
        if (_worker && !keepWorker) { _worker.destroy(); _worker = null; }
    }
    function fail(message: string): void {
        stop();
        errorString = message;
        program = null; scene = null; sceneIndex = -1;
    }
    function invalidate(): void {
        if (!_ready) return;
        stop(live); program = null; scene = null; sceneIndex = -1; errorString = "";
        if (!live || (previewRows === null && !lyricSource) || geometry.width <= 0 || geometry.height <= 0) return;
        if (previewRows !== null && (!Array.isArray(previewRows) || previewRows.length !== 4 || lyricCount !== 4)) { fail("Preview requires exactly four authored rows"); return; }
        if (lyricCount > 8192) { fail("Sonnet whole-song budget exceeded (8192 rows)"); return; }
        _reading = true; busy = true; _row = 0;
        send({ phase: "reset" });
    }
    function send(value: var): void {
        value.generation = _generation;
        value.trackRevision = trackRevision;
        value.sceneToken = _sceneToken;
        _pending = value;
        if (!_worker) _worker = workerComponent.createObject(root);
        flush();
    }
    function flush(): void {
        if (live && _worker && _worker.ready && _pending) {
            const request = _pending; _pending = null; _worker.sendMessage(request);
        }
    }
    function receive(reply: var): void {
        if (!live || reply.generation !== _generation || reply.trackRevision !== trackRevision) return;
        if (reply.error) { fail(reply.error); return; }
        if (reply.phase === "read") readStep.restart();
        else if(reply.phase==="watch"){_reading=false;watching=true;busy=false;}
        else if (reply.phase === "program") {
            _reading = false;watching=false;instrumental=reply.instrumental===true; program = reply.program; busy = false; requestScene();
        } else if (reply.sceneToken !== _sceneToken) return;
        else if (reply.phase === "native") {
            _queries = reply.measurements; _pieceTexts = reply.segmentations;
            _pieceCursor = 0; _queryCursor = 0; _pieces = []; _measurements = [];
            requestPieces();
        } else if (reply.phase === "scene") {
            _runs = []; _preparing = false;
            _cache = _cache.filter(value => value.index !== reply.index).concat([reply]).slice(-3);
            if (reply.index === requestedIndex) {
                const acceptedGeneration = _generation, acceptedToken = _sceneToken, acceptedProgram = program;
                scene = reply; sceneIndex = reply.index; sceneReady(reply.index, reply);
                // The renderer's synchronous sceneReady handler can invalidate
                // this program when newly bound preview inputs arrive.
                if (!live || _generation !== acceptedGeneration || _sceneToken !== acceptedToken || program !== acceptedProgram || !program) return;
                _preheat = [reply.index + 1, reply.index - 1].filter(index => index >= 0 && index < program.paragraphs.length);
            }
            busy = false;
            sceneStep.restart();
        }
    }
    function readNext(): void {
        if (!_reading || !live) return;
        if (_row >= lyricCount) { send({ phase: "compile", seed,wallMs:Date.now() }); return; }
        _lines = [];
        let count = 0, units = 0;
        while (_row < lyricCount && count < 64) {
            const row = JSON.parse(JSON.stringify(previewRows !== null ? previewRows[_row] : lyricSource.row(_row)));
            if (!row || typeof row.lineText !== "string") { fail("Sonnet lyric row is not ready: " + _row); return; }
            if (row.lineText.length > 65536) { fail("Sonnet lyric line exceeds ICU UTF16 budget"); return; }
            if (count && units + row.lineText.length > 65536) break;
            const line = Adapter.toFoliaLine(row, lyricOffsetMs, _row);
            if (typeof row.isChorus === "boolean") line.isChorus = row.isChorus;
            if (typeof row.songPart === "string") line.songPart = row.songPart;
            if (Number.isFinite(row.blockIndex)) line.blockIndex = row.blockIndex;
            ++_row; ++count; units += row.lineText.length;
            if (!line.filtered && line.fullText.trim().length) _lines.push(line);
        }
        ++readBatches;
        _pieceTexts = _lines.map(line => Input.normalize(line.fullText));
        _pieceCursor = 0; _pieces = [];
        requestPieces();
    }
    function requestPieces(): void {
        if (!live || _operation) return;
        if (_pieceCursor >= _pieceTexts.length) {
            if (_reading) send({ phase: "append", lines: _lines, pieces: _pieces.map(value => value.pieces) });
            else measureStep.restart();
            return;
        }
        if (!textService || !textService.available) { fail("Sonnet requires exact ICU segmentation"); return; }
        _pieceBatch = [];
        let units = 0;
        while (_pieceCursor < _pieceTexts.length && _pieceBatch.length < 64) {
            const text = _pieceTexts[_pieceCursor];
            if (text.length > 65536) { fail("Sonnet native ICU query exceeds 65536 UTF16"); return; }
            if (_pieceBatch.length && units + text.length > 65536) break;
            _pieceBatch.push(text); units += text.length; ++_pieceCursor;
        }
        _operation = textService.segmentWords(_pieceBatch, "");
        if (_operation.state >= EchoPluginOperation.Succeeded) piecesStep.restart();
    }
    function piecesFinished(): void {
        const operation = _operation;
        if (!operation || !live || operation.state < EchoPluginOperation.Succeeded) return;
        _operation = null;
        if (operation.state === EchoPluginOperation.Succeeded) {
            const result = JSON.parse(JSON.stringify(operation.result.lines));
            for (let index = 0; index < _pieceBatch.length; ++index) _pieces.push({ text: _pieceBatch[index], pieces: result[index] });
            requestPiecesStep.restart();
        } else if (operation.errorCode === "Busy") {
            _pieceCursor -= _pieceBatch.length;
            retry.restart();
        } else fail(operation.errorMessage || "Sonnet ICU operation canceled");
    }
    function requestScene(): void {
        if (!live || _reading || _preparing || !program || !program.paragraphs.length) return;
        const cached = _cache.find(value => value.index === requestedIndex);
        if (cached && sceneIndex !== requestedIndex) { scene = cached; sceneIndex = cached.index; sceneReady(cached.index, cached); }
        let index = requestedIndex;
        if (cached) {
            while (_preheat.length && _cache.some(value => value.index === _preheat[0])) _preheat.shift();
            if (!_preheat.length) return;
            index = _preheat.shift();
        }
        if (index < 0 || index >= program.paragraphs.length) { scene = null; sceneIndex = -1; return; }
        _preparing = true; busy = true; ++_sceneToken;
        send({ phase: "scene", index, context: geometry });
    }
    function measureNext(): void {
        if (!live || !_preparing) return;
        if (_queryCursor >= _queries.length) {
            _runs = [];
            send({ phase: "measurements", measurements: _measurements, pieces: _pieces });
            return;
        }
        _batch = [];
        let units = 0;
        const family = _queries[_queryCursor].fontFamily;
        while (_queryCursor < _queries.length && _batch.length < 64) {
            const query = _queries[_queryCursor];
            if (query.text.length > 8192) { fail("Sonnet native font query exceeds 8192 UTF16"); return; }
            if (_batch.length && (units + query.text.length > 8192 || query.fontFamily !== family)) break;
            _batch.push(query); units += query.text.length; ++_queryCursor;
        }
        ++measurementBatches;
        _familyStack = family;
        _runs = _batch.map((query, index) => ({ key: "m" + _sceneToken + ":" + index,
            text: query.text, size: query.size, weight: query.weight, spacing: 0, maxBlur: 0, maxHaloRadius: 0 }));
        acceptStep.restart();
    }
    function acceptMeasurements(): void {
        if (!live || !_preparing || !_runs.length) return;
        if (measure.errorString) { fail("Sonnet native font measurement: " + measure.errorString); return; }
        if (measure.metrics.length !== _batch.length) return;
        for (let index = 0; index < _batch.length; ++index) {
            const metric = measure.metrics[index];
            if (metric.key !== "m" + _sceneToken + ":" + index) return;
            _measurements.push({ key: _batch[index].key, width: metric.width, height: metric.height,
                advance: metric.advance, inkLeft: metric.inkLeft, inkRight: metric.inkRight,
                emAscent: metric.emAscent, emDescent: metric.emDescent,
                baseline: metric.baseline, inkTop: metric.inkTop, inkBottom: metric.inkBottom,
                graphemes: JSON.parse(JSON.stringify(metric.graphemes)) });
        }
        _runs = [];
        measureStep.restart();
    }
    onLyricSourceChanged: invalidate()
    onPreviewRowsChanged: invalidate()
    onLyricCountChanged: invalidate()
    onLyricOffsetMsChanged: invalidate()
    onTrackRevisionChanged: invalidate()
    onTextServiceChanged: invalidate()
    onGeometryChanged: invalidate()
    onBaseFontChanged: invalidate()
    onSeedChanged: invalidate()
    onLiveChanged: invalidate()
    onRequestedIndexChanged: requestScene()
    Component.onCompleted: { _ready = true; invalidate(); }
    Component.onDestruction: { _ready=false;stop(); }
    Timer{id:watchStep;interval:16;repeat:true;running:root.live&&root.watching;onTriggered:root.send({phase:"watch",timeSeconds:root.timeSeconds,wallMs:Date.now()})}
    Timer{id:sceneStep;interval:0;onTriggered:root.requestScene()}
    Timer{id:measureStep;interval:0;onTriggered:root.measureNext()}
    Timer{id:acceptStep;interval:0;onTriggered:root.acceptMeasurements()}
    Timer{id:piecesStep;interval:0;onTriggered:root.piecesFinished()}
    Timer{id:requestPiecesStep;interval:0;onTriggered:root.requestPieces()}
    Timer { id: readStep; interval: 0; onTriggered: root.readNext() }
    Timer { id: retry; interval: 50; onTriggered: root.requestPieces() }
    Connections {
        target: root._operation
        function onCompleted(): void { root.piecesFinished(); }
    }
    Connections {
        target: root.lyricSource
        function onModelReset(): void { root.invalidate(); }
        function onDataChanged(): void { root.invalidate(); }
        function onRowsInserted(): void { root.invalidate(); }
        function onRowsRemoved(): void { root.invalidate(); }
    }
    Component {
        id: workerComponent
        WorkerScript {
            source: Qt.resolvedUrl("worker.mjs")
            onReadyChanged: root.flush()
            onMessage: messageObject => root.receive(messageObject)
        }
    }
    SonnetFont { id: measurementFont; base: root.baseFont; familyStack: root._familyStack }
    GlyphRun {
        id: measure
        measurementOnly: true
        visible: false
        font: measurementFont.value
        runs: root._runs
        onLayoutChanged: acceptStep.restart()
    }
}
