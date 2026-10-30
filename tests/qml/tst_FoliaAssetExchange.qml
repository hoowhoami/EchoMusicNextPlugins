import QtQuick
import QtTest
import EchoMusic.PluginSdk
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: test
    name: "FoliaAssetExchange"
    when: windowShown
    visible: true
    width: 800
    height: 700
    property var images: []
    property string depth: "back"
    property real frequency: .6
    property int commits: 0
    Component {
        id: panelComponent
        LayerImagesPanel {
            plugin: foliaTestPlugin
            entries: test.images
            depth: test.depth
            frequency: test.frequency
            commitPatch: patch => {
                test.images = patch.temperaLayerImages;
                test.depth = patch.temperaLayerImageDepth;
                test.frequency = patch.temperaLayerImageFrequency;
                ++test.commits;
                return true;
            }
        }
    }
    function test_publicArchiveProtocolExists() {
        verify(typeof foliaTestPlugin !== "undefined");
        compare(typeof foliaTestPlugin.assets.openImageArchive, "function");
        compare(typeof foliaTestPlugin.assets.exportImageArchive, "function");
    }
    function test_realSvgGifOriginalZipAndDraftRoundtrip() {
        const panel = createTemporaryObject(panelComponent, test, {
            width: 700
        });
        verify(panel);
        const draft = findChild(panel, "temperaImageStore");
        verify(draft);
        tryVerify(() => !panel.busy, 15000);
        panel.open();
        draft.add();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept("svg"));
        tryVerify(() => !panel.busy && panel.draftImages.length === 1, 15000);
        compare(panel.errorString, "");
        const first = panel.draftImages[0].id;
        const vector = panel.assets.find(asset => asset.handle === first);
        compare(vector.mimeType, "image/svg+xml");
        verify(vector.url.toString().endsWith(".png"));
        verify(vector.renderBytes > 0);
        panel.update(first, {
            align: "left",
            verticalAlign: "top",
            scale: 1.31,
            opacity: .37
        });
        draft.setTuning({
            depth: "front",
            frequency: .85
        });
        draft.add();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept("gif"));
        tryVerify(() => !panel.busy && panel.draftImages.length === 2, 15000);
        const originalIds = panel.draftImages.map(image => image.id);
        const gif = panel.assets.find(asset => asset.handle === originalIds[1]);
        compare(gif.mimeType, "image/gif");
        compare(gif.frameCount, 2);
        verify(gif.animated);
        compare(images.length, 0);
        // Export the uncommitted draft through the real native save dialog.
        draft.exportArchive();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept("archive"));
        tryVerify(() => !panel.busy, 20000);
        compare(panel.errorString, "");
        verify(panel.notice.indexOf("2") >= 0);
        compare(images.length, 0);
        verify(panel.closeEditor());
        tryVerify(() => !panel.busy, 15000);
        compare(images.length, 2);
        compare(commits, 1);
        compare(depth, "front");
        compare(frequency, .85);
        // Delete all managed originals before restoring: a successful restore
        // cannot accidentally resolve files left in the current collection.
        panel.open();
        draft.clear();
        verify(panel.closeEditor());
        tryVerify(() => !panel.busy && panel.assets.length === 0, 15000);
        compare(images.length, 0);
        compare(commits, 2);
        depth = "back";
        frequency = .25;
        panel.open();
        draft.importArchive("append");
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept("archive"));
        tryVerify(() => !panel.busy, 20000);
        compare(panel.errorString, "");
        compare(panel.draftImages.length, 2, panel.notice);
        compare(images.length, 0);
        compare(draft.draft.depth, "back");
        compare(draft.draft.frequency, .25);
        compare(panel.draftImages[0].align, "left");
        compare(panel.draftImages[0].verticalAlign, "top");
        compare(panel.draftImages[0].scale, 1.31);
        compare(panel.draftImages[0].opacity, .37);
        for (const image of panel.draftImages)
            verify(originalIds.indexOf(image.id) < 0, "Native import must remint every placement ID");
        const restored = panel.draftImages.map(image => panel.assets.find(asset => asset.handle === image.id));
        compare(restored[0].mimeType, "image/svg+xml");
        compare(restored[0].bytes, vector.bytes);
        compare(restored[0].renderBytes, vector.renderBytes);
        compare(restored[1].mimeType, "image/gif");
        compare(restored[1].bytes, gif.bytes);
        compare(restored[1].frameCount, 2);
        verify(panel.closeEditor());
        tryVerify(() => !panel.busy, 15000);
        compare(images.length, 2);
        compare(commits, 3);
        panel.open();
        draft.clear();
        verify(panel.closeEditor());
        tryVerify(() => !panel.busy && panel.assets.length === 0, 15000);
    }
}
