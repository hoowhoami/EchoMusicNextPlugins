// Four authored raw rows -> actual ICU -> original source preparation Worker.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../shared/text"
import "../shared/lyricAdapter.mjs" as Adapter

Item {
    id: root
    required property EchoPluginText textService
    property var rows: []
    property string sampleKey: ""
    property bool live: true
    property var preparedLines: []
    property string errorString: ""
    property bool busy: false
    property var _operation: null
    property var _lines: []
    property int _request: -1
    property bool _completed: false
    function cancel(): void {
        startLater.stop(); completionLater.stop(); retry.stop();
        preparation.cancel();
        const previous = _operation;
        _operation = null;
        if (previous) previous.cancel();
        busy = false;
    }
    function invalidate(): void {
        if (!_completed) return;
        cancel(); preparedLines = []; errorString = "";
        if (live) startLater.restart();
    }
    function begin(): void {
        if (!live) return;
        if (!Array.isArray(rows) || rows.length !== 4 || rows.some(row => typeof row.lineText !== 'string' || row.lineText.length > 8192)) {
            errorString = "Preview requires exactly four bounded authored rows"; return;
        }
        busy = true;
        _lines = rows.map((row, index) => Adapter.toFoliaLine(JSON.parse(JSON.stringify(row)), 0, index));
        _operation = textService.segmentWords(_lines.map(line => line.fullText), "");
        if (_operation.state >= EchoPluginOperation.Succeeded) completionLater.restart();
    }
    function segmented(): void {
        const operation = _operation;
        if (!operation || !live) return;
        _operation = null;
        if (operation.state === EchoPluginOperation.Succeeded) {
            _request = preparation.prepare(_lines, JSON.parse(JSON.stringify(operation.result.lines)), { semantic: true, sticky: true });
        } else if (operation.errorCode === "Busy") retry.restart();
        else { busy = false; errorString = operation.errorMessage || "Preview segmentation was cancelled"; }
    }
    onRowsChanged: invalidate()
    onSampleKeyChanged: invalidate()
    onLiveChanged: invalidate()
    Component.onCompleted: { _completed = true; invalidate(); }
    Component.onDestruction: { _completed = false; cancel(); }
    Timer { id: startLater; interval: 0; onTriggered: root.begin() }
    Timer { id: completionLater; interval: 0; onTriggered: if (root._completed) root.segmented() }
    Timer { id: retry; interval: 50; onTriggered: root.begin() }
    Connections {
        target: root._operation
        function onCompleted(): void { completionLater.restart(); }
    }
    TextPreparation {
        id: preparation
        active: root.live
        trackRevision: root.sampleKey
        onPrepared: (requestId, trackRevision, result) => {
            if (root.live && requestId === root._request) {
                root.preparedLines = result.lines; root.busy = false;
            }
        }
        onFailed: (requestId, trackRevision, message) => {
            if (root.live && requestId === root._request) { root.errorString = message; root.busy = false; }
        }
    }
}
