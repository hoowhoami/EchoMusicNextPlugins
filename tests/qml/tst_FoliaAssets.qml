import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"
import "../../plugins/folia-lyrics-skin/qml/backgrounds/latent"
import "../../plugins/folia-lyrics-skin/qml/styles/cappella"
import "../../plugins/folia-lyrics-skin/qml/styles/monet" as Monet

TestCase {
    id: testCase
    name: "FoliaAssets"
    when: windowShown
    visible: true
    width: 400
    height: 200
    Rectangle {
        anchors.fill: parent
        color: "black"
        z: -1
    }
    Component {
        id: collectionComponent
        AssetCollection {
            plugin: foliaTestPlugin
            collection: "test.images"
        }
    }
    Component {
        id: paletteComponent
        CoverPalette {
            plugin: foliaTestPlugin
        }
    }
    Component {
        id: avatarComponent
        CappellaAvatar {
            assetsService: foliaTestPlugin.assets
            x: 50
            y: 50
            secondaryColor: "black"
        }
    }
    Component {
        id: portraitComponent
        Monet.MonetPortrait {
            width: 128
            height: 128
            assetsService: foliaTestPlugin.assets
        }
    }
    Component {
        id: emptiedSpy
        SignalSpy {
            signalName: "emptied"
        }
    }
    Component {
        id: retentionPressure
        Connections {
            property bool armed: false
            property url source
            property var operations: []
            property bool saturated: false
            function onAssetsChanged() {
                if (!armed)
                    return;
                armed = false;
                // The list completion still owns one native slot here. Real
                // sampling occupies the other before automatic removal starts.
                operations = [foliaTestPlugin.assets.sampleImage(source, 64, 64), foliaTestPlugin.assets.sampleImage(source, 64, 64)];
                saturated = operations.some(operation => operation.errorCode === "Busy");
            }
        }
    }
    property var poolEntries: []
    property int poolCommits: 0
    Component {
        id: poolComponent
        LayerImagesPanel {
            plugin: foliaTestPlugin
            entries: testCase.poolEntries
            commitPatch: patch => {
                ++testCase.poolCommits;
                testCase.poolEntries = patch.temperaLayerImages;
                return true;
            }
        }
    }
    function test_sixteenImagePoolKeepsOrderedPlacementAndRetiresOverflow() {
        poolEntries = [];
        poolCommits = 0;
        const panel = createTemporaryObject(poolComponent, testCase, {
            width: 400
        });
        verify(panel);
        const collection = findChild(panel, "temperaImageStore");
        verify(collection);
        tryVerify(() => !panel.busy, 15000);
        panel.open();
        collection.add();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept("png"));
        tryVerify(() => !panel.busy && panel.draftImages.length === 1, 20000);
        const first = panel.assets[0];
        compare(poolEntries.length, 0, "Uploads enter the draft, not the live tuning");
        collection.add();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept("png-batch"));
        tryVerify(() => !panel.busy && panel.draftImages.length === 16, 20000);
        compare(panel.errorString, "");
        compare(poolEntries.length, 0);
        verify(panel.notice.indexOf("1") >= 0);
        compare(panel.draftImages[0].id, first.handle);
        compare(new Set(panel.draftImages.map(entry => entry.id)).size, 16);
        verify(panel.closeEditor());
        tryVerify(() => !panel.busy && panel.assets.length === 16, 20000);
        compare(poolEntries.length, 16);
        compare(poolCommits, 1);
        poolEntries = poolEntries.slice().reverse();
        const ordered = poolEntries.map(entry => entry.id);
        panel.open();
        compare(panel.orderedAssets.map(asset => asset.handle), ordered);
        panel.update(ordered[1], {
            opacity: .37,
            align: "right"
        });
        compare(poolEntries[1].opacity, 1);
        compare(panel.draftImages[1].opacity, .37);
        collection.remove(ordered[0]);
        compare(panel.assets.length, 16, "Old originals survive an uncommitted removal");
        compare(poolEntries.length, 16);
        verify(panel.closeEditor());
        tryVerify(() => !panel.busy && panel.assets.length === 15, 15000);
        compare(poolEntries.length, 15);
        compare(poolEntries.find(image => image.id === ordered[1]).opacity, .37);
        compare(poolEntries.find(image => image.id === ordered[1]).align, "right");
        compare(poolCommits, 2);
        verify(!poolEntries.some(entry => entry.id === ordered[0]));
        panel.open();
        collection.clear();
        compare(panel.assets.length, 15);
        compare(poolEntries.length, 15);
        verify(panel.closeEditor());
        tryVerify(() => !panel.busy && panel.assets.length === 0, 20000);
        compare(poolEntries.length, 0);
        compare(poolCommits, 3);
    }
    function store(name, fonts) {
        const result = createTemporaryObject(collectionComponent, testCase, {
            collection: name,
            fonts: !!fonts
        });
        verify(result);
        tryVerify(() => !result.busy, 15000);
        compare(result.errorString, "");
        return result;
    }
    function importFixture(collection, kind) {
        tryVerify(() => !collection.busy, 15000);
        collection.importFiles();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000, "Picker " + collection.collection + " busy=" + collection.busy + " error=" + collection.errorString);
        verify(foliaTestAssetFixture.accept(kind));
        tryVerify(() => !collection.busy, 20000);
        compare(collection.errorString, "");
        compare(collection.assets.length, 1);
        return collection.assets[0];
    }
    function test_nativePickerCrossCollectionRefreshAndColorWorker() {
        const a = store("test.cross"), b = store("test.cross");
        const spy = createTemporaryObject(emptiedSpy, testCase, {
            target: a
        });
        compare(spy.count, 0);
        const asset = importFixture(a, "png");
        tryCompare(b, "assets", a.assets, 15000);
        compare(asset.kind, "image");
        verify(asset.url.toString().indexOf("authored-red.png") < 0);
        const sample = foliaTestPlugin.assets.sampleImage(asset.url, 1, 2);
        tryVerify(() => sample.state >= 2, 10000);
        compare(sample.state, 2);
        compare(sample.result.width, 1);
        compare(sample.result.height, 2);
        compare(sample.result.sourceWidth, asset.width);
        compare(sample.result.sourceHeight, asset.height);
        const palette = createTemporaryObject(paletteComponent, testCase, {
            source: asset.url,
            trackRevision: "authored-1"
        });
        tryVerify(() => palette.colors.length > 0 || palette.errorString.length > 0, 15000);
        compare(palette.errorString, "");
        compare(palette.colors[0].toLowerCase(), "#ff0000");
        palette.live = false;
        compare(palette.colors.length, 0);
        compare(palette._worker, null);
        compare(palette._operation, null);
        b.live = false;
        compare(b.assets.length, 0);
        a.remove(asset.handle);
        tryVerify(() => !a.busy && a.assets.length === 0, 15000);
        compare(spy.count, 1);
        b.live = true;
        tryVerify(() => !b.busy, 15000);
        compare(b.assets.length, 0);
    }
    function test_importedGifReallyAnimatesAndStopsWhenHidden() {
        const collection = store("test.gif");
        const asset = importFixture(collection, "gif");
        compare(asset.animated, true);
        compare(asset.frameCount, 2);
        const avatar = createTemporaryObject(avatarComponent, testCase, {
            imageUrl: asset.url
        });
        verify(avatar);
        const image = findChild(avatar, "cappellaAvatarImage");
        verify(image);
        tryCompare(image, "status", Image.Ready, 5000);
        compare(image.frameCount, 2);
        tryVerify(() => image.currentFrame === 1, 5000);
        image.paused = true;
        waitForRendering(avatar);
        const pixels = grabImage(avatar), center = Math.floor(pixels.width / 2);
        verify(pixels.blue(center, center) > 200 && pixels.red(center, center) < 40, "Actual imported blue GIF frame must reach the native masked avatar");
        image.paused = false;
        avatar.live = false;
        compare(image.playing, false);
        const stopped = image.currentFrame;
        wait(400);
        compare(image.currentFrame, stopped);
        avatar.live = true;
        avatar.motionEnabled = false;
        compare(image.playing, false);
        collection.clear();
        tryVerify(() => !collection.busy && collection.assets.length === 0, 15000);
    }
    function test_monetGifKeepsOneDecodedLayerAndOriginalAnimatedFrames() {
        const collection = store("test.monet.gif");
        const asset = importFixture(collection, "gif");
        const portrait = createTemporaryObject(portraitComponent, testCase, {
            source: asset.url
        });
        verify(portrait);
        tryCompare(portrait, "layerCount", 1, 10000);
        const actor = portrait._actors[0], serial = portrait._serial;
        tryCompare(actor, "status", Image.Ready, 10000);
        compare(actor.frameCount, 2);
        tryCompare(actor, "currentFrame", 1, 5000);
        portrait.motionEnabled = false;
        const stopped = actor.currentFrame;
        wait(1000); // The source's 900ms portrait fade must settle before RGB capture.
        compare(actor.currentFrame, stopped);
        waitForRendering(portrait);
        const pixels = grabImage(portrait), center = Math.floor(pixels.width / 2);
        verify(pixels.blue(center, center) > 200 && pixels.red(center, center) < 40, "Monet must display the actual second GIF frame");
        portrait.motionEnabled = true;
        wait(1000);
        compare(portrait.layerCount, 1);
        compare(portrait._serial, serial, "Each decoded frame must not append another portrait layer");
        portrait.source = "file:///unauthorized-folia-test.gif";
        tryVerify(() => portrait.errorString.length > 0, 10000);
        compare(portrait.layerCount, 1, "A rejected replacement retains the last valid portrait");
        const lease = actor.animationLease;
        verify(lease && lease.active);
        portrait.source = "";
        tryCompare(portrait, "layerCount", 0, 2000);
        tryVerify(() => !lease.active, 5000);
        portrait.live = false;
        compare(portrait.layerCount, 0);
        tryVerify(() => !lease.active, 5000);
        collection.clear();
        tryVerify(() => !collection.busy && !collection.assets.length, 15000);
    }
    Component {
        id: emptyImage
        AssetImage {
            width: 128
            height: 128
            prepareFrames: true
        }
    }
    function test_emptyUrlNeedsNoAnimationService() {
        const image = createTemporaryObject(emptyImage, testCase);
        wait(20);
        compare(image.errorString, "");
        compare(image.status, Image.Null);
        compare(image.frameCount, 0);
        image.source = Qt.resolvedUrl("../../plugins/folia-lyrics-skin/qml/styles/cappella/assets/emo/love1.png");
        image.prepareFrames = false;
        tryCompare(image, "status", Image.Ready, 5000);
        image.source = "";
        image.prepareFrames = true;
        tryCompare(image, "status", Image.Null, 5000);
        compare(image.errorString, "");
        compare(image.frameCount, 0);
    }
    function test_fontPickerPublishesRealFamiliesAndRemoval() {
        const collection = store("test.font", true);
        const asset = importFixture(collection, "font");
        compare(asset.kind, "font");
        verify(asset.families.length > 0);
        for (const family of asset.families)
            verify(foliaTestPlugin.fonts.families.indexOf(family) >= 0);
        collection.clear();
        tryVerify(() => !collection.busy && collection.assets.length === 0, 15000);
    }
    function test_cancelActualPickerDoesNotPublish() {
        const collection = store("test.cancel");
        collection.importFiles();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        collection.live = false;
        tryVerify(() => !foliaTestAssetFixture.pickerVisible(), 5000);
        compare(collection._operation, null);
        compare(collection.assets.length, 0);
        collection.live = true;
        tryVerify(() => !collection.busy, 15000);
        compare(collection.assets.length, 0);
    }
    function test_singleImageRetentionRetriesRealNativeBackpressure() {
        const chosen = store("test.retention.pressure");
        const old = importFixture(chosen, "png");
        chosen.importFiles();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept("gif"));
        tryVerify(() => !chosen.busy && chosen.assets.length === 2, 20000);
        const replacement = chosen.assets.find(asset => asset.handle !== old.handle);
        verify(replacement);
        const pressure = createTemporaryObject(retentionPressure, testCase, {
            target: chosen,
            source: old.url,
            armed: true
        });
        verify(pressure);
        chosen.retainOnly(replacement.handle);
        tryVerify(() => pressure.saturated, 5000);
        tryVerify(() => !chosen.busy && chosen.assets.length === 1 && chosen.assets[0].handle === replacement.handle, 15000);
        compare(chosen.errorString, "");
        chosen.clear();
        tryVerify(() => !chosen.busy && !chosen.assets.length, 15000);
    }
    function test_unrelatedChangePreservesLivePickerAndSingleImageReplacement() {
        const chosen = store("test.single"), other = store("test.unrelated");
        const old = importFixture(chosen, "png");
        const unrelated = importFixture(other, "png");
        tryVerify(() => !chosen.busy, 15000);
        chosen.importFiles();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        const pending = chosen._operation;
        other.clear();
        tryVerify(() => !other.busy && other.assets.length === 0, 15000);
        wait(100);
        compare(chosen._operation, pending);
        verify(foliaTestAssetFixture.pickerVisible());
        verify(foliaTestAssetFixture.accept("gif"));
        tryVerify(() => !chosen.busy && chosen.assets.length === 2, 20000);
        const replacement = chosen.assets.find(asset => asset.handle !== old.handle);
        verify(replacement && replacement.animated);
        chosen.retainOnly(replacement.handle);
        const diagnosticAt = Date.now() + 14000;
        let diagnosed = false;
        tryVerify(() => {
            if (!diagnosed && Date.now() > diagnosticAt) {
                diagnosed = true;
                console.info("FOLIA_ASSET_RETENTION_TIMEOUT", JSON.stringify({
                    busy: chosen.busy,
                    error: chosen.errorString,
                    action: chosen._action,
                    operation: chosen._operation ? {
                        state: chosen._operation.state,
                        error: chosen._operation.errorCode
                    } : null,
                    assets: chosen.assets,
                    retained: chosen._retainedHandles
                }));
            }
            return !chosen.busy && chosen.assets.length === 1 && chosen.assets[0].handle === replacement.handle;
        }, 15000);
        compare(chosen.errorString, "");
        chosen.clear();
        tryVerify(() => !chosen.busy && chosen.assets.length === 0, 15000);
    }
}
