// Folia TemperaImageLayerControls draft and single-write gate (a8da4437, AGPL-3.0).
pragma ComponentBehavior: Bound
import QtQuick
import "asset-archive/tempera-format.mjs" as Format

Item {
    id: root
    required property var service
    property var entries: []
    property string depth: "back"
    property real frequency: .6
    property var commitPatch: null
    property bool commitBusy: false
    property string commitError: ""
    property bool commitActive: true
    property var assets: []
    property var draft: Format.beginDraft([], "back", .6)
    property bool opened: false
    property string errorString: ""
    property string notice: ""
    readonly property bool busy: commitBusy || _commitPlan !== null || _operation !== null || _lease !== null
    property var _commitPlan: null
    property var _operation: null
    property string _action: ""
    property var _lease: null
    property var _plan: null
    property string _mode: "append"
    property var _cleanup: []
    property string _removing: ""
    property bool _ready: false
    property bool _destroying: false
    signal committed(var patch)

    function observe(operation: var, action: string): void {
        _operation = operation;
        _action = action;
        // A rejected native request can already be terminal on return. Process
        // it within this component's context; no detached callLater callbacks.
        if (operation && operation.state >= 2)
            finish(operation);
    }
    function reload(): void {
        if (!_ready || busy)
            return;
        observe(service.list("tempera.images"), "list");
    }
    function open(): void {
        if (busy)
            return;
        draft = Format.beginDraft(entries, depth, frequency);
        errorString = "";
        notice = "";
        opened = true;
    }
    function close(): bool {
        return finishDraft(false);
    }
    function commitBeforeClose(): bool {
        // An accepted commit already drains with its installation. Do not issue
        // another one while this presentation is about to be retired.
        return _commitPlan !== null || finishDraft(true);
    }
    function finishDraft(beforeClose: bool): bool {
        if (!opened)
            return true;
        // On ordinary outer close an unrelated configuration write can still
        // be busy. The authoritative writer accepts this next patch in order.
        // An active import/export itself is canceled by teardown as before.
        if (beforeClose ? _operation !== null || _lease !== null : busy)
            return false;
        const plan = Format.commitPlan(draft, entries, depth, frequency);
        if (plan.patch && !commitActive) {
            errorString = qsTr("设置已失效；原图片仍保留。");
            return false;
        }
        if (plan.patch) {
            // patch() accepts a queued write. Values are published only after
            // the actual QSaveFile commit, so originals must survive that wait.
            _commitPlan = plan;
            if (commitPatch && commitPatch(plan.patch) === true) {
                checkCommitTask.restart();
                return true;
            }
            _commitPlan = null;
            errorString = qsTr("图片池设置未能保存；原图片仍保留，请重试。");
            return false;
        }
        opened = false;
        cleanup(plan.discarded);
        return true;
    }
    function checkCommit(): void {
        if (_destroying || !_commitPlan || commitBusy)
            return;
        const plan = _commitPlan;
        const persisted = Format.commitPlan({
            images: plan.patch.temperaLayerImages,
            depth: plan.patch.temperaLayerImageDepth,
            frequency: plan.patch.temperaLayerImageFrequency,
            added: []
        }, entries, depth, frequency).patch === null;
        _commitPlan = null;
        if (!commitActive || commitError || !persisted) {
            errorString = commitError || qsTr("图片池设置未能保存；原图片仍保留，请重试。");
            return;
        }
        errorString = "";
        opened = false;
        committed(plan.patch);
        cleanup(plan.discarded);
    }
    function scheduleCommitCheck(): void {
        if (_ready && _commitPlan && !_destroying)
            checkCommitTask.restart();
    }
    onEntriesChanged: scheduleCommitCheck()
    onDepthChanged: scheduleCommitCheck()
    onFrequencyChanged: scheduleCommitCheck()
    onCommitErrorChanged: scheduleCommitCheck()
    onCommitActiveChanged: scheduleCommitCheck()
    onCommitBusyChanged: {
        scheduleCommitCheck();
        if (!commitBusy && !_commitPlan && _ready && !opened && !_destroying)
            reload();
    }
    Timer {
        id: checkCommitTask
        interval: 0
        onTriggered: root.checkCommit()
    }
    function cleanup(handles: var): void {
        _cleanup = Array.from(new Set(_cleanup.concat(handles)));
        cleanupNext();
    }
    function cleanupNext(): void {
        if (_destroying || busy || !_cleanup.length)
            return;
        const id = _cleanup[0];
        _cleanup = _cleanup.slice(1);
        _removing = id;
        observe(service.remove(id), "cleanup");
    }
    function edit(id: string, patch: var): void {
        if (busy || !opened)
            return;
        draft = Object.assign({}, draft, {
            images: draft.images.map(image => image.id === id ? Object.assign({}, image, patch) : image)
        });
    }
    function setTuning(patch: var): void {
        if (!busy && opened)
            draft = Object.assign({}, draft, patch);
    }
    function remove(id: string): void {
        if (!busy && opened)
            draft = Format.removeImage(draft, id);
    }
    function clear(): void {
        if (!busy && opened)
            draft = Object.assign({}, draft, {
                images: []
            });
    }
    function add(): void {
        if (busy || !opened || draft.images.length >= 16)
            return;
        errorString = "";
        observe(service.importImages("tempera.images", {
            partial: true,
            maxCount: 16 - draft.images.length
        }), "add");
    }
    function acceptDrop(operation: var): void {
        if (!operation)
            return;
        if (_destroying || !_ready || !commitActive || busy || !opened) {
            operation.cancel();
            return;
        }
        errorString = "";
        observe(operation, "add");
    }
    function acceptArchiveDrop(lease: var): void {
        if (!lease)
            return;
        if (_destroying || !_ready || !commitActive || busy || !opened) {
            lease.dispose();
            return;
        }
        errorString = "";
        _mode = "append";
        _lease = lease;
        inspectArchive();
    }
    function importArchive(mode: string): void {
        if (busy || !opened)
            return;
        errorString = "";
        _mode = mode;
        _lease = service.openImageArchive(["meta.json", "pool.json"]);
        inspectArchive();
    }
    function inspectArchive(): void {
        if (!_lease)
            return;
        if (_lease.errorString || !_lease.active) {
            errorString = _lease.errorString || "";
            const previous = _lease;
            _lease = null;
            previous.dispose();
            return;
        }
        if (!_lease.ready)
            return;
        try {
            _plan = Format.importPlan(_lease, _mode === "append" ? draft.images.length : 0);
            if (!_plan.rows.length) {
                notice = _plan.truncated ? qsTr("图片池已满；未导入 %1 张。").arg(_plan.truncated + _plan.skipped) : qsTr("这份备份里没有可用的图片。");
                const previous = _lease;
                _lease = null;
                previous.dispose();
                return;
            }
            observe(_lease.importInto("tempera.images", _plan.selections), "import");
        } catch (error) {
            errorString = String(error.message || error);
            const previous = _lease;
            _lease = null;
            previous.dispose();
        }
    }
    function exportArchive(): void {
        if (busy || !opened || !draft.images.length)
            return;
        try {
            const plan = Format.exportPlan(draft.images, assets);
            if (!plan.entries.length)
                throw new Error(qsTr("图片原件已丢失，无法导出。"));
            _plan = plan;
            errorString = "";
            observe(service.exportImageArchive("tempera.images", plan.entries, plan.jsonFiles, "Folia-画布图片备份.zip"), "export");
        } catch (error) {
            errorString = String(error.message || error);
        }
    }
    function finish(operation: var): void {
        if (!operation || operation !== _operation)
            return;
        const action = _action, state = operation.state, result = operation.result || {};
        _operation = null;
        _action = "";
        if (action === "import") {
            // Native import consumes its lease. Do not dispose it mid-operation.
            const previous = _lease;
            _lease = null;
            if (previous && previous.active)
                previous.dispose();
        }
        if (state === 3) {
            errorString = operation.errorMessage || qsTr("图片操作失败");
            // Keep cleanup bounded and report the first failed deletion. A later
            // panel load will enumerate and retry unreferenced managed handles.
            if (action === "cleanup")
                _cleanup = [];
        } else if (state === 2) {
            if (action === "list") {
                assets = Array.from(result.assets || []);
                if (!opened)
                    cleanup(assets.filter(asset => !entries.some(image => image.id === asset.handle)).map(asset => asset.handle));
            } else if (action === "add") {
                const added = Array.from(result.assets || []), before = draft.images.length;
                assets = assets.concat(added);
                draft = Format.addImages(draft, added);
                notice = qsTr("已添加 %1 张，未添加 %2 张。").arg(draft.images.length - before).arg(Array.from(result.rejected || []).length + added.length - (draft.images.length - before));
                if (draft.images.length === before && Array.from(result.rejected || []).length > 0)
                    errorString = notice;
            } else if (action === "import") {
                const added = Array.from(result.assets || []);
                assets = assets.concat(added);
                try {
                    const images = Format.acceptImported(_plan, added);
                    draft = Object.assign({}, draft, {
                        images: (_mode === "append" ? draft.images : []).concat(images),
                        added: draft.added.concat(added.map(asset => asset.handle))
                    });
                    notice = qsTr("已导入 %1 张，未导入 %2 张。").arg(images.length).arg(_plan.skipped + _plan.truncated);
                } catch (error) {
                    errorString = String(error.message || error);
                    cleanup(added.map(asset => asset.handle));
                }
            } else if (action === "cleanup") {
                assets = assets.filter(asset => asset.handle !== _removing);
            } else if (action === "export") {
                notice = qsTr("已导出 %1 张；缺少原件 %2 张。").arg(_plan.exported).arg(_plan.skipped);
            }
        }
        if (!_destroying)
            cleanupNext();
    }
    function teardown(): void {
        if (_destroying)
            return;
        // An idle unscoped close commits once. Scoped settings flush earlier
        // through page.aboutToClose; accepted configuration writes still drain
        // in the host. Only an in-flight asset import/export is canceled here.
        if (opened && !busy)
            close();
        _destroying = true;
        _ready = false;
        checkCommitTask.stop();
        _commitPlan = null;
        const operation = _operation, lease = _lease;
        _operation = null;
        _lease = null;
        if (operation)
            operation.cancel();
        if (lease)
            lease.dispose();
    }
    Component.onCompleted: {
        _ready = true;
        reload();
    }
    Component.onDestruction: teardown()
    Connections {
        target: root._operation
        function onCompleted(): void {
            root.finish(root._operation);
        }
    }
    Connections {
        target: root._lease
        function onChanged(): void {
            if (!root._operation)
                root.inspectArchive();
        }
    }
}
