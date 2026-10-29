import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: test
    name: "FoliaLayerImageCommit"
    when: windowShown
    property var images: []
    property bool persistenceBusy: false
    property string persistenceError: ""
    property bool persistenceActive: true
    property bool accepted: true
    property var pending: null
    property var removed: []
    property int calls: 0
    property int committed: 0
    Component {
        id: operationComponent
        QtObject {
            property int state: 2
            property var result: ({})
            property string errorMessage: ""
            signal completed()
            function cancel() {}
        }
    }
    QtObject {
        id: assetService
        function list(collection) {
            return operationComponent.createObject(test, {result: {assets: [{handle: "old"}]}});
        }
        function remove(handle) {
            test.removed = test.removed.concat([handle]);
            return operationComponent.createObject(test);
        }
    }
    Component {
        id: draftComponent
        LayerImageDraft {
            service: assetService
            entries: test.images
            depth: "back"
            frequency: .6
            commitPatch: patch => {
                ++test.calls;
                if (!test.accepted)
                    return false;
                test.persistenceError = "";
                test.persistenceBusy = true;
                test.pending = patch;
                return true;
            }
            onCommitted: ++test.committed
            Component.onCompleted: {
                // Also runs against the previous component to demonstrate its
                // premature deletion before these persistence inputs existed.
                if ("commitBusy" in this) {
                    commitBusy = Qt.binding(() => test.persistenceBusy);
                    commitError = Qt.binding(() => test.persistenceError);
                    commitActive = Qt.binding(() => test.persistenceActive);
                }
            }
        }
    }
    function init() {
        failOnWarning(/invalid context|TypeError|ReferenceError|Binding loop/);
        images = [{id: "old", name: "Old", align: "free", verticalAlign: "bottom", scale: .7, opacity: 1}];
        persistenceBusy = false;
        persistenceError = "";
        persistenceActive = true;
        accepted = true;
        pending = null;
        removed = [];
        calls = 0;
        committed = 0;
    }
    function complete(success) {
        if (success)
            images = pending.temperaLayerImages;
        else
            persistenceError = "Cannot persist appearance configuration";
        persistenceBusy = false;
    }
    function editedDraft() {
        const draft = createTemporaryObject(draftComponent, test);
        verify(draft);
        tryVerify(() => !draft.busy);
        draft.open();
        draft.clear();
        return draft;
    }
    function test_originalsWaitForPublishedPersistence() {
        const draft = editedDraft();
        verify(draft.close());
        compare(calls, 1);
        compare(removed.length, 0, "Queued writes must retain the old originals");
        compare(committed, 0);
        verify(draft.busy);
        complete(true);
        tryVerify(() => !draft.busy && !draft.opened);
        compare(committed, 1);
        compare(removed, ["old"]);
    }
    function test_failedWriteRetainsOldOriginalsAndCanRetry() {
        const draft = editedDraft();
        verify(draft.close());
        complete(false);
        tryVerify(() => !draft.busy && draft.errorString.length > 0);
        verify(draft.opened);
        compare(images.length, 1);
        compare(removed.length, 0);
        compare(committed, 0);
        verify(draft.close());
        compare(calls, 2);
        compare(removed.length, 0);
        complete(true);
        tryVerify(() => !draft.busy && !draft.opened);
        compare(removed, ["old"]);
        compare(committed, 1);
    }
    function test_destroyedPendingCommitCannotDeleteOrCallBack() {
        const draft = editedDraft();
        verify(draft.close());
        draft.destroy();
        wait(10);
        complete(true);
        wait(20);
        compare(removed.length, 0);
        compare(committed, 0);
    }
    function test_rejectedPatchRetainsDraftAndOriginals() {
        const draft = editedDraft();
        accepted = false;
        verify(!draft.close());
        verify(draft.opened);
        verify(!draft.busy);
        compare(removed.length, 0);
        compare(committed, 0);
    }
    function test_outerCloseQueuesBehindUnrelatedAcceptedWrite() {
        const draft = editedDraft();
        persistenceBusy = true;
        verify(!draft.close(), "The interactive editor stays busy");
        verify(typeof draft.commitBeforeClose === "function" ? draft.commitBeforeClose() : draft.close(), "Ordinary outer close must queue its idle draft before permission revocation");
        compare(calls, 1);
        compare(removed.length, 0);
        complete(true);
        tryVerify(() => !draft.busy && !draft.opened);
        compare(removed, ["old"]);
    }
}
