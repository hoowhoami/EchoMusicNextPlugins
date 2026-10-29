// Typed public read-model snapshot; ≤64 rows/turn, real ICU and dictionary in Worker.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "../../shared/lyricAdapter.mjs" as Adapter

Item {
    id: root
    property EchoPluginReadModel lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    property string seed: "lumiere"
    property bool seamless: true
    property EchoPluginText textService: null
    property bool live: true
    property bool busy: false
    property var program: null
    property string signature: ""
    property var sourceIndices: []
    property string errorString: ""
    property int revision: 0
    property int readBatches: 0
    readonly property bool workerAlive: _worker !== null
    property var _worker: null
    property var _pending: null
    property var _operation: null
    property var _lines: []
    property int _row: 0
    property int _generation: 0
    property bool _completed: false
    function stop(): void {
        ++_generation;
        if (_operation)
            _operation.cancel();
        _operation = null;
        piecesCompletion.stop();
        retry.stop();
        step.stop();
        debounce.stop();
        _pending = null;
        _lines = [];
        busy = false;
        if (_worker) {
            _worker.destroy();
            _worker = null;
        }
    }
    function invalidate(): void {
        if (!_completed)
            return;
        stop();
        program = null;
        sourceIndices = [];
        errorString = "";
        readBatches = 0;
        if (!live || (previewRows === null && !lyricSource))
            return;
        if (previewRows !== null && (!Array.isArray(previewRows) || previewRows.length !== 4 || lyricCount !== 4)) { fail("Preview requires exactly four authored rows"); return; }
        if (lyricCount < 0 || lyricCount > 4096) {
            fail("Lumiere full-song snapshot exceeds 4096 lines");
            return;
        }
        busy = true;
        debounce.restart();
    }
    function fail(message: string): void {
        stop();
        program = null;
        sourceIndices = [];
        errorString = message;
    }
    function begin(): void {
        if (!live || !busy)
            return;
        _row = 0;
        send({
            phase: "reset",
            seed,
            seamless
        });
    }
    function send(value: var): void {
        if (!live || !busy)
            return;
        value.request = _generation;
        value.trackRevision = trackRevision;
        _pending = value;
        if (!_worker)
            _worker = workerComponent.createObject(root);
        flush();
    }
    function flush(): void {
        if (_worker && _worker.ready && _pending && busy && live) {
            const message = _pending;
            _pending = null;
            _worker.sendMessage(message);
        }
    }
    function receive(message: var): void {
        if (!live || !busy || message.request !== _generation || message.trackRevision !== trackRevision)
            return;
        if (message.error) {
            fail(message.error);
            return;
        }
        const result = JSON.parse(message.payload);
        if (result.phase === 'reset' || result.phase === 'appended')
            step.restart();
        else if (result.phase === 'program') {
            signature = result.signature;
            program = result.program;
            sourceIndices = result.sourceIndices;
            busy = false;
            ++revision;
        }
    }
    function readNext(): void {
        if (!live || !busy)
            return;
        if (_row >= lyricCount) {
            send({
                phase: "complete"
            });
            return;
        }
        _lines = [];
        let read = 0, units = 0;
        while (_row < lyricCount && read < 64) {
            const row = JSON.parse(JSON.stringify(previewRows !== null ? previewRows[_row] : lyricSource.row(_row)));
            if (!row || typeof row.lineText !== "string") {
                fail("Lumiere lyric row is not ready: " + _row);
                return;
            }
            if (row.lineText.length > 8192) {
                fail("Lumiere line exceeds 8192 UTF16");
                return;
            }
            if (read && units + row.lineText.length > 65536)
                break;
            const line = Adapter.toFoliaLine(row, lyricOffsetMs, _row);
            for (const key of ['isChorus', 'songPart', 'blockIndex'])
                if (row[key] !== undefined)
                    line[key] = row[key];
            if (Array.isArray(row.wordSegments))
                line.wordSegments = JSON.parse(JSON.stringify(row.wordSegments));
            if (Array.isArray(row.autoWordSegments))
                line.autoWordSegments = JSON.parse(JSON.stringify(row.autoWordSegments));
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
                icuPieces: []
            });
            return;
        }
        requestPieces();
    }
    function requestPieces(): void {
        if (!live || !busy || _operation)
            return;
        if (!textService || !textService.available) {
            fail("Lumiere requires exact ICU word segmentation");
            return;
        }
        _operation = textService.segmentWords(_lines.map(line => line.fullText), "");
        if (_operation.state >= EchoPluginOperation.Succeeded)
            piecesCompletion.restart();
    }
    function piecesFinished(): void {
        if (!_completed)
            return;
        const op = _operation;
        if (!op || !live || !busy || op.state < EchoPluginOperation.Succeeded)
            return;
        _operation = null;
        if (op.state === EchoPluginOperation.Succeeded)
            send({
                phase: "append",
                lines: _lines,
                icuPieces: JSON.parse(JSON.stringify(op.result.lines))
            });
        else if (op.errorCode === 'Busy')
            retry.restart();
        else
            fail(op.errorMessage || "Lumiere ICU operation canceled");
    }
    onLyricSourceChanged: invalidate()
    onPreviewRowsChanged: invalidate()
    onLyricCountChanged: invalidate()
    onLyricOffsetMsChanged: invalidate()
    onTrackRevisionChanged: invalidate()
    onSeedChanged: invalidate()
    onSeamlessChanged: invalidate()
    onTextServiceChanged: invalidate()
    onLiveChanged: invalidate()
    Component.onCompleted: {
        _completed = true;
        invalidate();
    }
    Component.onDestruction: {
        _completed = false;
        stop();
    }
    Timer {
        id: piecesCompletion
        objectName: "lumierePiecesCompletion"
        interval: 0
        onTriggered: if (root._completed)
            root.piecesFinished()
    }
    Timer {
        id: debounce
        interval: 16
        onTriggered: root.begin()
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
            root.invalidate();
        }
        function onDataChanged(): void {
            root.invalidate();
        }
        function onRowsInserted(): void {
            root.invalidate();
        }
        function onRowsRemoved(): void {
            root.invalidate();
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
            onMessage: message => root.receive(message)
        }
    }
}
