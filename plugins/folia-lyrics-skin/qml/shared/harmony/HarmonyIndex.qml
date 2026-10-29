// A single generation-owned full-track projection; no offscreen shaping or frame scan.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "index.mjs" as Index

Item {
    id: root
    required property EchoPluginViewContext page
    property EchoPluginTransitionTrack transitionTrack: null
    property bool live: true
    property real timeSeconds: 0
    readonly property EchoPluginReadModel readSource: transitionTrack ? transitionTrack.lyrics : page ? page.player.lyrics : null
    readonly property var information: transitionTrack ? transitionTrack.lyricsInfo : page ? page.player.lyricsInfo : ({
            count: 0,
            offsetMs: 0
        })
    // The transition's compact metadata does not include this optional flag;
    // scan its real bounded rows rather than guessing background voices.
    readonly property bool active: live && page !== null && page.active && (transitionTrack !== null || information.hasBackgroundVocals === true)
    readonly property string sourceKey: (transitionTrack ? transitionTrack.lyricRevision : page ? page.player.revision : "") + ":" + information.count + ":" + information.offsetMs
    readonly property var index: _index
    readonly property real nextStart: Index.nextHarmonyStart(_index, timeSeconds) === null ? Infinity : Index.nextHarmonyStart(_index, timeSeconds)
    readonly property bool busy: _pending !== null || (_worker !== null && _index === null && active)
    property string errorString: ""
    property var _index: null
    property var _vocals: []
    property int _cursor: 0
    property int _units: 0
    property int _generation: 0
    property var _worker: null
    property var _pending: null
    property bool _completed: false
    function invalidate() {
        ++_generation;
        chunks.stop();
        _index = null;
        _vocals = [];
        _cursor = 0;
        _units = 0;
        _pending = null;
        errorString = "";
        if (!_completed)
            return;
        if (!active) {
            if (_worker) {
                _worker.destroy();
                _worker = null;
            }
            return;
        }
        if (information.count > 8192) {
            errorString = "Harmony source exceeds 8192 main rows";
            return;
        }
        if (!_worker)
            _worker = workerComponent.createObject(root);
        chunks.restart();
    }
    function readChunk() {
        if (!active)
            return;
        const end = Math.min(information.count, _cursor + 64);
        for (; _cursor < end; ++_cursor) {
            const row = JSON.parse(JSON.stringify(readSource.row(_cursor)));
            if (row.filtered)
                continue;
            const voices = Index.backgroundRow(row, information.offsetMs);
            for (const vocal of voices) {
                _units += vocal.text.length;
                if (_units > 4194304 || _vocals.length >= 65536) {
                    errorString = "Harmony track exceeds its source budget";
                    _vocals = [];
                    return;
                }
                _vocals.push(vocal);
            }
        }
        if (_cursor < information.count)
            chunks.restart();
        else {
            _pending = {
                generation: _generation,
                vocals: _vocals
            };
            flush();
        }
    }
    function flush() {
        if (active && _worker && _worker.ready && _pending) {
            _worker.sendMessage(_pending);
            _pending = null;
            _vocals = [];
        }
    }
    function receive(reply) {
        if (!active || reply.generation !== _generation)
            return;
        if (reply.error)
            errorString = reply.error;
        else
            _index = JSON.parse(JSON.stringify(reply.index));
    }
    onActiveChanged: invalidate()
    onSourceKeyChanged: invalidate()
    Component.onCompleted: {
        _completed = true;
        invalidate();
    }
    Component.onDestruction: {
        _completed = false;
        chunks.stop();
    }
    Timer {
        id: chunks
        interval: 0
        onTriggered: root.readChunk()
    }
    Connections {
        target: root && root.active ? root.readSource : null
        function onModelReset() {
            if (root)
                root.invalidate();
        }
        function onDataChanged() {
            if (root)
                root.invalidate();
        }
    }
    Component {
        id: workerComponent
        WorkerScript {
            source: Qt.resolvedUrl("index-worker.mjs")
            onReadyChanged: if (root)
                root.flush()
            onMessage: reply => {
                if (root)
                    root.receive(reply);
            }
        }
    }
}
