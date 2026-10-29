// Scope-local, bounded view data. The host remains the sole playback/lyric owner.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "text"
import "lyricAdapter.mjs" as Adapter

Item {
    id: root
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    property EchoPluginTransitionTrack transitionTrack: null
    property bool live: true
    property int radius: 16
    property int focusIndex: -1
    property string extraIndicesKey: ""
    readonly property var player: page ? page.player : null
    readonly property EchoPluginReadModel readSource: transitionTrack ? transitionTrack.lyrics : player ? player.lyrics : null
    readonly property var information: transitionTrack ? transitionTrack.lyricsInfo : player ? player.lyricsInfo : ({
            count: 0,
            currentIndex: -1,
            offsetMs: 0
        })
    readonly property int currentIndex: Math.max(0, focusIndex >= 0 ? focusIndex : information.currentIndex)
    readonly property string sourceKey: (transitionTrack ? transitionTrack.lyricRevision : player ? player.revision : "") + ":" + information.offsetMs + ":" + information.count
    readonly property bool active: live && page !== null && page.active
    property var preparedLines: []
    property string errorMessage: ""
    property bool busy: false
    property int _generation: 0
    property var _cache: ({})
    property var _order: []
    property int _cacheUnits: 0
    property var _batches: []
    property var _batch: []
    property var _operation: null
    property int _workerRequest: -1
    property int _requestGeneration: -1

    function cancel(): void {
        ++_generation;
        refresh.stop();
        retry.stop();
        if (_operation)
            _operation.cancel();
        _operation = null;
        preparation.cancel();
        _batches = [];
        _batch = [];
        busy = false;
    }
    function invalidate(): void {
        cancel();
        _cache = ({});
        _order = [];
        _cacheUnits = 0;
        preparedLines = [];
        if (active)
            refresh.restart();
    }
    function schedule(): void {
        if (active)
            refresh.restart();
    }
    function wantedIndices(): var {
        const range = Adapter.lineWindow(currentIndex, information.count, radius);
        const wanted = [];
        for (let index = range.first; index <= range.last; ++index)
            wanted.push(index);
        if (extraIndicesKey) {
            for (const value of extraIndicesKey.split(",")) {
                const index = Number(value);
                if (Number.isInteger(index) && index >= 0 && index < information.count && wanted.indexOf(index) < 0)
                    wanted.push(index);
            }
        }
        return wanted;
    }
    function project(): void {
        const lines = [];
        for (const index of wantedIndices())
            if (_cache[index])
                lines[index] = _cache[index];
        preparedLines = lines;
    }
    function start(): void {
        cancel();
        if (!active)
            return;
        errorMessage = "";
        const missing = [];
        for (const index of wantedIndices()) {
            if (!_cache[index]) {
                const row = readSource.row(index);
                if (!row.filtered)
                    missing.push(Adapter.toFoliaLine(JSON.parse(JSON.stringify(row)), information.offsetMs, index));
            }
        }
        project();
        try {
            _batches = Adapter.batchLines(missing);
        } catch (error) {
            errorMessage = String(error.message || error);
            return;
        }
        busy = _batches.length > 0;
        nextBatch();
    }
    function nextBatch(): void {
        if (!active || !_batches.length) {
            busy = false;
            return;
        }
        _batch = _batches.shift();
        _requestGeneration = _generation;
        _operation = plugin.text.segmentWords(_batch.map(line => line.fullText), "");
        if (_operation.state >= EchoPluginOperation.Succeeded)
            segmentationFinished();
    }
    function segmentationFinished(): void {
        const operation = _operation;
        if (!operation || !active || _requestGeneration !== _generation)
            return;
        _operation = null;
        if (operation.state === EchoPluginOperation.Succeeded) {
            // QVariantList is a Qt sequence; WorkerScript accepts plain JSON values.
            const pieces = JSON.parse(JSON.stringify(operation.result.lines));
            _workerRequest = preparation.prepare(_batch, pieces, {
                semantic: true,
                sticky: true
            });
        } else if (operation.errorCode === "Busy") {
            _batches.unshift(_batch);
            retry.restart();
        } else {
            busy = false;
            errorMessage = operation.errorMessage || qsTr("歌词分词已取消");
        }
    }
    function accept(requestId: int, result: var): void {
        if (!active || requestId !== _workerRequest || _requestGeneration !== _generation)
            return;
        for (const prepared of result.lines) {
            const index = prepared.line.sourceIndex;
            if (_cache[index])
                continue;
            _cache[index] = prepared;
            _order.push(index);
            _cacheUnits += prepared.line.fullText.length;
        }
        // Both entry count and text size bound the cached object graph.
        while (_order.length > 64 || _cacheUnits > 131072) {
            const index = _order.shift();
            _cacheUnits -= _cache[index].line.fullText.length;
            delete _cache[index];
        }
        project();
        nextBatch();
    }

    onSourceKeyChanged: invalidate()
    onCurrentIndexChanged: schedule()
    onRadiusChanged: schedule()
    onExtraIndicesKeyChanged: schedule()
    onActiveChanged: invalidate()
    Component.onCompleted: schedule()
    Component.onDestruction: cancel()
    Timer {
        id: refresh
        interval: 0
        onTriggered: root.start()
    }
    Timer {
        id: retry
        interval: 50
        onTriggered: root.nextBatch()
    }
    Connections {
        target: root._operation
        function onCompleted(): void {
            if (root)
                root.segmentationFinished();
        }
    }
    Connections {
        target: root && root.active ? root.readSource : null
        function onModelReset(): void {
            if (root)
                root.invalidate();
        }
        function onDataChanged(): void {
            if (root)
                root.invalidate();
        }
    }
    TextPreparation {
        id: preparation
        active: root.active
        trackRevision: root.sourceKey
        onPrepared: (requestId, trackRevision, result) => {
            if (root)
                root.accept(requestId, result);
        }
        onFailed: (requestId, trackRevision, message) => {
            if (root && requestId === root._workerRequest && root.active) {
                root.errorMessage = message;
                root.busy = false;
            }
        }
    }
}
