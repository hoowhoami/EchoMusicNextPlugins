import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: test
    name: "FoliaSettingsDraft"
    when: windowShown
    property var stored: ({ size: 1, glow: 1, other: false })
    property var accepted: null
    property bool busy: false
    property string error: ""
    property bool active: true
    property var writes: []
    Component {
        id: component
        SettingsDraft {
            committedValues: test.stored
            commitBusy: test.busy
            commitError: test.error
            commitActive: test.active
            commitPatch: patch => {
                test.writes = test.writes.concat([patch]);
                test.accepted = patch;
                test.busy = true;
                return true;
            }
        }
    }
    function init() {
        failOnWarning(/invalid context|TypeError|ReferenceError|Binding loop/);
        stored = {size: 1, glow: 1, other: false};
        accepted = null;
        busy = false;
        error = "";
        active = true;
        writes = [];
    }
    function complete(success) {
        if (success)
            stored = Object.assign({}, stored, accepted);
        else
            error = "Actual disk write failed";
        busy = false;
    }
    function test_dragOnlyPreviewsAndCommitsOnce() {
        const draft = createTemporaryObject(component, test);
        verify(draft.values === stored, "No draft preserves the source settings identity");
        draft.hold();
        for (let index = 0; index < 100; index++)
            verify(draft.save({size: index / 100 + 1}));
        verify(draft.save({glow: 2}));
        compare(writes.length, 0);
        compare(stored.size, 1);
        compare(draft.values.size, 1.99);
        draft.release();
        compare(writes, [{size: 1.99, glow: 2}]);
        compare(draft.values.size, 1.99, "accepted overlay stays until actual publication");
        complete(true);
        compare(draft.values, stored);
        verify(draft.values === stored);
        draft.release();
        compare(writes.length, 1);
    }
    function test_keyboardIsImmediateAndFailedSaveReverts() {
        const draft = createTemporaryObject(component, test);
        verify(draft.save({size: 1.2}));
        compare(writes.length, 1);
        compare(draft.values.size, 1.2);
        complete(false);
        compare(draft.values.size, 1);
        compare(draft.errorString, error);
    }
    function test_resetDropsOnlyItsHeldFields() {
        const draft = createTemporaryObject(component, test);
        draft.hold();
        draft.save({size: 1.4, glow: 2});
        draft.reset({size: 1});
        compare(writes, [{size: 1}]);
        complete(true);
        compare(draft.values.size, 1);
        compare(draft.values.glow, 2);
        draft.release();
        compare(writes[1], {glow: 2});
        complete(true);
    }
    function test_ordinaryCloseSavesHeldValue() {
        const draft = component.createObject(test);
        verify(draft);
        draft.hold();
        draft.save({size: 1.3});
        draft.destroy();
        tryCompare(test, "busy", true);
        compare(writes, [{size: 1.3}]);
        complete(true);
    }
    function test_retiredScopeDropsWithoutWriting() {
        const draft = createTemporaryObject(component, test);
        draft.hold();
        draft.save({size: 1.3});
        active = false;
        draft.release();
        compare(writes.length, 0);
        verify(!draft.save({size: 1.4}));
        compare(draft.values, stored);
    }
}
