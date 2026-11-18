// Folia a8da4437 tuningDraft save gate, with native async persistence publication.
// The settings sample alone reads values; playback keeps the committed configuration.
import QtQml

QtObject {
    id: root
    required property var committedValues
    required property var commitPatch
    property bool commitBusy: false
    property string commitError: ""
    property bool commitActive: true
    readonly property var values: !commitActive || (!Object.keys(_waiting).length && (!commitBusy || !Object.keys(_accepted).length)) ? committedValues : Object.assign({}, committedValues, commitBusy ? _accepted : {}, _waiting)
    readonly property bool held: _held
    readonly property string errorString: _error || commitError
    property bool _held: false
    property var _waiting: ({})
    property var _accepted: ({})
    property string _error: ""
    property bool _ready: false
    property Timer _reconcileTask: Timer {
        interval: 0
        onTriggered: root.reconcile()
    }

    function hold(): void {
        if (commitActive)
            _held = true;
    }
    function save(patch: var): bool {
        if (!commitActive)
            return false;
        const snapshot = JSON.parse(JSON.stringify(patch));
        if (!Object.keys(snapshot).length)
            return true;
        if (_held) {
            _waiting = Object.assign({}, _waiting, snapshot);
            return true;
        }
        const accepted = commitPatch(snapshot);
        _error = accepted ? "" : commitError || qsTr("未能保存皮肤设置");
        if (accepted) {
            _accepted = Object.assign({}, _accepted, snapshot);
            scheduleReconcile();
        }
        return accepted;
    }
    function release(): void {
        if (!_held)
            return;
        _held = false;
        const waiting = _waiting;
        _waiting = ({});
        if (commitActive)
            save(waiting);
    }
    function reset(patch: var): bool {
        // A held value of the reset group must never overwrite its defaults later.
        const remaining = Object.assign({}, _waiting);
        for (const key of Object.keys(patch))
            delete remaining[key];
        _waiting = remaining;
        const heldBefore = _held;
        _held = false;
        const accepted = save(patch);
        _held = heldBefore;
        return accepted;
    }
    function reconcile(): void {
        if (!commitActive) {
            _held = false;
            _waiting = ({});
            _accepted = ({});
            return;
        }
        const remaining = {};
        if (commitBusy) {
            for (const key of Object.keys(_accepted || {}))
                if (JSON.stringify(committedValues[key]) !== JSON.stringify(_accepted[key]))
                    remaining[key] = _accepted[key];
        }
        _accepted = remaining;
    }
    function scheduleReconcile(): void {
        if (_ready)
            _reconcileTask.restart();
    }
    // Native inputs can initialize lazily while values is being read. Mutating
    // its dependencies synchronously from those notifications reenters it.
    onCommittedValuesChanged: scheduleReconcile()
    onCommitBusyChanged: scheduleReconcile()
    onCommitActiveChanged: scheduleReconcile()
    Component.onCompleted: {
        _ready = true;
        scheduleReconcile();
    }
    Component.onDestruction: {
        release();
        _ready = false;
        _reconcileTask.stop();
    }
}
