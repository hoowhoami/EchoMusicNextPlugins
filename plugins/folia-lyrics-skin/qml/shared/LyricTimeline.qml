// Only compact timing metadata is projected; no text/glyph objects for offscreen rows.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "timelineIndex.mjs" as Timeline

Item {
    id: root
    required property EchoPluginViewContext page
    property EchoPluginTransitionTrack transitionTrack: null
    property bool live: true
    property real timeSeconds: 0
    readonly property var player: page ? page.player : null
    readonly property EchoPluginReadModel readSource: transitionTrack ? transitionTrack.lyrics : player ? player.lyrics : null
    readonly property var information: transitionTrack ? transitionTrack.lyricsInfo : player ? player.lyricsInfo : ({
            count: 0,
            offsetMs: 0
        })
    readonly property bool active: live && page !== null && page.active
    readonly property string sourceKey: (transitionTrack ? transitionTrack.lyricRevision : player ? player.revision : "") + ":" + information.offsetMs + ":" + information.count
    readonly property var state: Timeline.timelineState(_index, timeSeconds)
    readonly property int activeIndex: state.activeIndex
    readonly property int recentIndex: state.recentIndex
    readonly property int cursorIndex: state.cursorIndex
    readonly property var nextIndices: state.nextIndices
    // Missing key: timing not ready. Null: the complete model confirms the last line.
    readonly property var nextStartBySourceIndex: _index ? _index.nextStartBySourceIndex : ({})
    readonly property var lineMetadata: _index ? _index.lineMetadata : []
    readonly property var metadataBySourceIndex: _index ? _index.metadataBySourceIndex : ({})
    readonly property bool ready: _index !== null
    property var _index: null
    property var _rows: []
    property int _generation: 0
    property var _worker: null
    property var _pending: null
    property bool _completed: false

    function invalidate(): void {
        ++_generation;
        chunks.stop();
        _index = null;
        _rows = [];
        _pending = null;
        if (!_completed)
            return;
        if (!active) {
            if (_worker) {
                _worker.destroy();
                _worker = null;
            }
            return;
        }
        if (!_worker)
            _worker = workerComponent.createObject(root);
        chunks.restart();
    }
    function readChunk(): void {
        if (!active)
            return;
        const last = Math.min(information.count, _rows.length + 64);
        for (let i = _rows.length; i < last; ++i)
            _rows.push(Timeline.timingRow(readSource.row(i), information.offsetMs, i));
        if (_rows.length < information.count) {
            chunks.restart();
        } else {
            _pending = {
                generation: _generation,
                rows: _rows
            };
            flush();
        }
    }
    function flush(): void {
        if (active && _worker && _worker.ready && _pending) {
            _worker.sendMessage(_pending);
            _pending = null;
            _rows = [];
        }
    }
    function receive(reply: var): void {
        if (active && reply.generation === _generation)
            _index = reply.index;
    }
    onSourceKeyChanged: invalidate()
    onActiveChanged: invalidate()
    Component.onCompleted: {
        _completed = true;
        invalidate();
    }
    Timer {
        id: chunks
        interval: 0
        onTriggered: root.readChunk()
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
    readonly property Component workerComponent: Component {
        WorkerScript {
            source: Qt.resolvedUrl("timelineWorker.mjs")
            onReadyChanged: if (root)
                root.flush()
            onMessage: reply => {
                if (root)
                    root.receive(reply);
            }
        }
    }
}
