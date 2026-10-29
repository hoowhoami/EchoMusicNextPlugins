// Scope-owned operations; files and font registrations remain native host resources.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    required property EchoPluginContext plugin
    required property string collection
    property bool fonts: false
    property bool live: true
    property var assets: []
    property string errorString: ""
    readonly property bool busy: _operation !== null || retry.running || _reloadQueued
    property EchoPluginOperation _operation: null
    property string _action: ""
    property bool _completed: false
    property bool _mutationAwaitingList: false
    property var _retainedHandles: null
    property string _removedHandle: ""
    property bool _refreshPending: false
    property bool _reloadQueued: false
    signal imported(var added)
    signal emptied
    signal removed(string handle)
    function cancel(): void {
        retry.stop();
        reloadDeferred.stop();
        finishDeferred.stop();
        _reloadQueued = false;
        const previous = _operation;
        _operation = null;
        if (previous)
            previous.cancel();
    }
    function queueReload(): void {
        if (!_completed)
            return;
        _reloadQueued = true;
        reloadDeferred.restart();
    }
    function flushReload(): void {
        if (_reloadQueued)
            reload();
    }
    function observe(operation: EchoPluginOperation, action: string): void {
        _action = action;
        _operation = operation;
        if (operation && operation.state >= EchoPluginOperation.Succeeded)
            finishDeferred.restart();
    }
    function reload(): void {
        if (!_completed)
            return;
        cancel();
        if (!live || !plugin.active) {
            _mutationAwaitingList = false;
            assets = [];
            return;
        }
        observe(plugin.assets.list(collection), "list");
    }
    function importFiles(): void {
        if (!live || !plugin.active || busy)
            return;
        errorString = "";
        observe(fonts ? plugin.assets.importFonts(collection) : plugin.assets.importImages(collection), "import");
    }
    function remove(handle: string): void {
        if (!live || !plugin.active || busy)
            return;
        errorString = "";
        _removedHandle = handle;
        observe(plugin.assets.remove(handle), "remove");
    }
    function clear(): void {
        if (!live || !plugin.active || busy)
            return;
        errorString = "";
        _removedHandle = "";
        observe(plugin.assets.clear(collection), "remove");
    }
    // Single-image editors select the new handle first, then retire superseded
    // collection entries through the same cancellable, bounded native API.
    function retainOnly(handle: string): void {
        retainHandles([handle]);
    }
    function retainHandles(handles: var): void {
        _retainedHandles = Array.from(handles || []).slice(0, 128);
        if (!_operation)
            queueReload();
    }
    function finish(operation: EchoPluginOperation): void {
        if (!operation || operation !== _operation)
            return;
        const action = _action;
        if (!live || !plugin.active) {
            _operation = null;
            return;
        }
        if (operation.state === EchoPluginOperation.Failed) {
            _operation = null;
            if ((action === "list" || action === "retain") && operation.errorCode === "Busy")
                retry.restart();
            else
                errorString = operation.errorMessage;
            if (_refreshPending) {
                _refreshPending = false;
                queueReload();
            }
            return;
        }
        if (operation.state !== EchoPluginOperation.Succeeded) {
            _operation = null;
            return;
        }
        errorString = "";
        if (action === "list") {
            assets = Array.from(operation.result.assets || []);
            if (_retainedHandles !== null) {
                const discarded = assets.find(asset => _retainedHandles.indexOf(asset.handle) < 0);
                if (discarded) {
                    // Replace the finished operation without an idle gap: a
                    // preview must not reopen a file between list and removal.
                    _removedHandle = discarded.handle;
                    observe(plugin.assets.remove(discarded.handle), "retain");
                    return;
                }
                _retainedHandles = null;
            }
            if (_mutationAwaitingList) {
                _mutationAwaitingList = false;
                if (!assets.length)
                    emptied();
            }
        } else {
            _mutationAwaitingList = action === "remove" || action === "retain";
            if (action === "import")
                imported(Array.from(operation.result.assets || []));
            else if (action === "remove" || action === "retain")
                removed(_removedHandle);
            queueReload();
        }
        if (_refreshPending) {
            _refreshPending = false;
            queueReload();
        }
        _operation = null;
    }
    onLiveChanged: reload()
    onCollectionChanged: {
        _mutationAwaitingList = false;
        _retainedHandles = null;
        reload();
    }
    Component.onCompleted: {
        _completed = true;
        reload();
    }
    Component.onDestruction: {
        _completed = false;
        cancel();
    }
    Timer {
        id: reloadDeferred
        interval: 0
        onTriggered: root.flushReload()
    }
    Timer {
        id: finishDeferred
        interval: 0
        onTriggered: root.finish(root._operation)
    }
    Timer {
        id: retry
        interval: 50
        onTriggered: root.reload()
    }
    Connections {
        target: root._operation
        function onCompleted(): void {
            if (root)
                root.finish(root._operation);
        }
    }
    Connections {
        target: root.plugin.assets
        function onChanged(): void {
            if (!root)
                return;
            // An unrelated collection notification must not close a live
            // picker or cancel the next file in a replacement's cleanup.
            if (root._operation && root._action !== "list")
                root._refreshPending = true;
            else
                root.queueReload();
        }
    }
}
