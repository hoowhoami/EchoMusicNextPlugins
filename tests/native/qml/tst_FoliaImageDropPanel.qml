// CPU-only integration with real scoped native assets and the actual settings panel.
import QtQuick
import QtTest
import "../../../plugins/folia-lyrics-skin/qml/shared" as Shared

TestCase {
    id: testCase
    name: "FoliaImageDropPanel"
    when: windowShown
    visible: true
    width: 900
    height: 760
    function initTestCase() {
        compare(GraphicsInfo.api, GraphicsInfo.Software, "this diagnostic must stay CPU-only");
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|Binding loop|is not a function/);
    }
    Component {
        id: panelComponent
        Shared.LayerImagesPanel {
            width: 640
            plugin: foliaTestPlugin
        }
    }
    function test_actualPanelBindsTheNativeReceiverAndCapacity() {
        const panel = createTemporaryObject(panelComponent, testCase);
        verify(panel);
        tryCompare(panel, "busy", false);
        panel.open();
        tryCompare(panel, "editorOpen", true);
        const dialog = panel.dialogs.imageEditor;
        const drop = findChild(dialog, "tempera.imagesDrop");
        verify(drop);
        compare(drop.assets, foliaTestPlugin.assets);
        compare(drop.collection, "tempera.images");
        compare(drop.maxCount, 16);
        compare(Array.from(drop.archiveJsonPaths), ["meta.json", "pool.json"]);
        verify(drop.enabled);
        compare(drop.containsDrag, false);
        compare(drop.busy, false);
        verify(panel.closeEditor());
        tryCompare(panel, "editorOpen", false);
        panel.entries = Array.from({
            length: 16
        }, (_, index) => ({
                    id: "asset:" + ("00000000000000000000000000000000" + index).slice(-32),
                    name: "image" + index,
                    align: "free",
                    verticalAlign: "bottom",
                    scale: .7,
                    opacity: 1
                }));
        panel.open();
        compare(panel.draftImages.length, 16);
        compare(drop.maxCount, 0);
        verify(drop.enabled, "full pools retain archive drop inspection and explicit skipped counts");
        verify(panel.closeEditor());
        compare(panel.errorString, "");
    }
}
