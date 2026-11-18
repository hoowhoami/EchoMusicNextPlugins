pragma ComponentBehavior: Bound
import QtQml
import EchoMusic.PluginSdk
import "../../entry.mjs" as Backend

QtObject {
    id: root
    required property EchoPluginContext plugin
    readonly property var snapshot: plugin.ui.state.foliaConfiguration || ({})
    readonly property var values: snapshot.values || Backend.defaults
    readonly property bool active: plugin.active && snapshot.active === true
    readonly property bool busy: _pending !== null || snapshot.busy === true
    readonly property string errorMessage: _error || snapshot.errorMessage || ""
    property string _error: ""
    property EchoPluginOperation _pending: null
    property Connections completion: Connections {
        target: root._pending
        function onCompleted(): void {
            root.complete();
        }
    }
    function patch(patch: var): bool {
        if (!active)
            return false;
        const checked = Backend.validate(Object.assign({}, values, patch));
        if (checked !== true) {
            _error = (checked.errors || []).join("\n");
            return false;
        }
        _error = "";
        _pending = plugin.executeCommand("folia.studio.patch", patch);
        if (_pending.state >= EchoPluginOperation.Succeeded)
            complete();
        return true;
    }
    function complete(): void {
        const operation = _pending;
        if (!operation)
            return;
        if (operation.state === EchoPluginOperation.Failed)
            _error = operation.errorMessage || qsTr("未能保存设置");
        _pending = null;
    }
}
