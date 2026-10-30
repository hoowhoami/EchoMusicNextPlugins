// Native bounded decode, then source median-cut on a worker. Cover changes cancel stale work.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk

Item {
    id: root
    required property EchoPluginContext plugin
    property url source
    property string trackRevision: ""
    property bool live: true
    readonly property var snapshot: _snapshot
    readonly property var colors: _snapshot.colors
    readonly property string colorsSource: _snapshot.source
    property var _snapshot: ({
            source: "",
            colors: []
        })
    property string errorString: ""
    property EchoPluginOperation _operation: null
    property var _worker: null
    property var _pending: null
    property int _generation: 0
    property bool _completed: false
    function reset(): void {
        if (!_completed)
            return;
        ++_generation;
        retry.stop();
        finishDeferred.stop();
        const old = _operation;
        _operation = null;
        if (old)
            old.cancel();
        _pending = null;
        errorString = "";
        if (!live || !plugin.active || !source.toString()) {
            _snapshot = {
                source: "",
                colors: []
            };
            if (_worker) {
                _worker.destroy();
                _worker = null;
            }
            return;
        }
        if (!_worker)
            _worker = workerComponent.createObject(root);
        request();
    }
    function request(): void {
        if (!live || !plugin.active)
            return;
        _operation = plugin.assets.sampleImage(source, 50, 50);
        if (_operation.state >= EchoPluginOperation.Succeeded)
            finishDeferred.restart();
    }
    function finish(operation: EchoPluginOperation): void {
        if (!operation || operation !== _operation)
            return;
        _operation = null;
        if (!live || !plugin.active)
            return;
        if (operation.state === EchoPluginOperation.Failed) {
            if (operation.errorCode === "Busy")
                retry.restart();
            else
                errorString = operation.errorMessage;
            return;
        }
        if (operation.state !== EchoPluginOperation.Succeeded)
            return;
        _pending = {
            generation: _generation,
            pixels: Array.from(operation.result.pixels)
        };
        flush();
    }
    function flush(): void {
        if (_worker && _worker.ready && _pending) {
            _worker.sendMessage(_pending);
            _pending = null;
        }
    }
    onSourceChanged: reset()
    onTrackRevisionChanged: reset()
    onLiveChanged: reset()
    Component.onCompleted: {
        _completed = true;
        reset();
    }
    Component.onDestruction: {
        _completed = false;
        finishDeferred.stop();
        retry.stop();
        if (_operation)
            _operation.cancel();
    }
    Timer {
        id: finishDeferred
        interval: 0
        onTriggered: root.finish(root._operation)
    }
    Timer {
        id: retry
        interval: 50
        onTriggered: root.request()
    }
    Connections {
        target: root._operation
        function onCompleted(): void {
            if (root)
                root.finish(root._operation);
        }
    }
    readonly property Component workerComponent: Component {
        WorkerScript {
            source: Qt.resolvedUrl("paletteWorker.mjs")
            onReadyChanged: root.flush()
            onMessage: reply => {
                if (root.live && reply.generation === root._generation)
                    root._snapshot = {
                        source: String(root.source),
                        colors: reply.colors
                    };
            }
        }
    }
}
