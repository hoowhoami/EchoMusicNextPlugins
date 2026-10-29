import QtQuick
import QtTest
import "../../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: testCase
    name: "FoliaGifGui"
    when: windowShown
    visible: true
    width: 400
    height: 200
    property bool measuring: false
    property real maximumGap: 0
    property real lastPulse: 0
    property int changes: 0
    property var probe: null
    readonly property bool legacy: foliaTestAssetFixture.legacyProbe()
    Rectangle {
        anchors.fill: parent
        color: "black"
        z: -1
    }
    Component {
        id: storeComponent
        AssetCollection {
            plugin: foliaTestPlugin
            collection: "performance.gif"
        }
    }
    Component {
        id: nativeComponent
        AssetImage {
            width: 80
            height: 80
            assetsService: foliaTestPlugin.assets
            sourceSize: Qt.size(80, 80)
            onCurrentFrameChanged: ++testCase.changes
        }
    }
    Component {
        id: legacyComponent
        AnimatedImage {
            width: 80
            height: 80
            sourceSize: Qt.size(80, 80)
            asynchronous: true
            cache: false
            onCurrentFrameChanged: ++testCase.changes
        }
    }
    Timer {
        interval: 4
        repeat: true
        running: testCase.measuring
        onTriggered: {
            const now = foliaTestAssetFixture.monotonicMs();
            testCase.maximumGap = Math.max(testCase.maximumGap, now - testCase.lastPulse);
            testCase.lastPulse = now;
        }
    }
    function test_largeGifKeepsGuiResponsive() {
        const collection = createTemporaryObject(storeComponent, testCase);
        tryVerify(() => !collection.busy, 15000);
        collection.importFiles();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept("large-gif"), "Set FOLIA_TEST_LARGE_GIF to the authored 4096² four-frame GIF");
        tryVerify(() => !collection.busy, 20000);
        compare(collection.errorString, "");
        compare(collection.assets.length, 1);
        const asset = collection.assets[0];
        compare(asset.width, 4096);
        compare(asset.height, 4096);
        compare(asset.frameCount, 4);
        const before = foliaTestAssetFixture.memory();
        maximumGap = 0;
        changes = 0;
        lastPulse = foliaTestAssetFixture.monotonicMs();
        measuring = true;
        probe = createTemporaryObject(legacy ? legacyComponent : nativeComponent, testCase, {
            source: asset.url
        });
        verify(probe);
        tryCompare(probe, "status", Image.Ready, 15000);
        compare(probe.frameCount, 4);
        const prepared = foliaTestAssetFixture.memory();
        const atStart = changes;
        wait(2000);
        measuring = false;
        const after = foliaTestAssetFixture.memory();
        const result = {
            mode: legacy ? "legacy" : "native",
            maximumGapMs: maximumGap,
            frameChanges: changes - atStart,
            before,
            prepared,
            after
        };
        verify(changes - atStart >= 10, "The original animation must actually advance");
        probe.playing = false;
        tryCompare(probe, "status", Image.Ready, 5000);
        waitForRendering(probe);
        const pixels = grabImage(probe), center = Math.floor(pixels.width / 2);
        const expected = [[255, 0, 0], [0, 0, 255], [0, 255, 0], [255, 255, 0]][probe.currentFrame];
        verify(expected !== undefined);
        verify(Math.abs(pixels.red(center, center) - expected[0]) < 5 && Math.abs(pixels.green(center, center) - expected[1]) < 5 && Math.abs(pixels.blue(center, center) - expected[2]) < 5, "The actual animated RGB frame must reach Metal");
        probe.source = "";
        probe.destroy();
        probe = null;
        collection.clear();
        tryVerify(() => !collection.busy && collection.assets.length === 0, 15000);
        wait(250);
        result.retired = foliaTestAssetFixture.memory();
        console.info("FOLIA_GIF_PROBE " + JSON.stringify(result));
        verify(maximumGap < 50, "GUI heartbeat exceeded 50ms: " + maximumGap);
    }
}
