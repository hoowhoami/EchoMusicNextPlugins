import QtQml
import QtQml.WorkerScript

QtObject {
    id: root
    property string trackRevision: ""
    property bool active: true
    readonly property bool ready: _worker !== null && _worker.ready
    property int _sequence: 0
    property var _worker: null
    property var _pending: null
    signal prepared(int requestId, string trackRevision, var result)
    signal failed(int requestId, string trackRevision, string message)

    onTrackRevisionChanged: cancel()
    onActiveChanged: {
        if (!active) {
            cancel();
            if (_worker) {
                _worker.destroy();
                _worker = null;
            }
        }
    }

    function cancel() {
        _sequence++;
        _pending = null;
    }
    function prepare(lines, icuPieces, options) {
        const requestId = ++_sequence;
        if (!active)
            return requestId;
        _pending = { requestId, trackRevision, lines, icuPieces, options };
        if (!_worker)
            _worker = workerComponent.createObject(root);
        _flush();
        return requestId;
    }
    function _flush() {
        if (!active || !_worker || !_worker.ready || !_pending)
            return;
        const request = _pending;
        _pending = null;
        _worker.sendMessage(request);
    }
    function _receive(reply) {
        if (!active || reply.requestId !== _sequence || reply.trackRevision !== trackRevision)
            return;
        if (reply.error)
            failed(reply.requestId, reply.trackRevision, reply.error);
        else
            prepared(reply.requestId, reply.trackRevision, reply.result);
    }
    readonly property Component workerComponent: Component {
        WorkerScript {
            source: Qt.resolvedUrl("worker.mjs")
            onReadyChanged: root._flush()
            onMessage: messageObject => root._receive(messageObject)
        }
    }
}
