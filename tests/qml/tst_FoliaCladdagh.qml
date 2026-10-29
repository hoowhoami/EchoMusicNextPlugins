import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/claddagh/kernel.mjs" as Ring
import "../../plugins/folia-lyrics-skin/qml/shared/text/unicode.mjs" as Unicode

TestCase {
    id: testCase
    name: "FoliaCladdagh"
    when: windowShown
    visible: true
    width: 1000
    height: 700
    Rectangle {
        anchors.fill: parent
        color: "black"
        z: -1
    }
    SignalSpy {
        id: exitSpy
        signalName: "exitFinished"
    }

    function prepared(count, text) {
        const rows = [];
        for (let index = 0; index < count; index++) {
            const parts = Unicode.graphemeSegments(text || "海边 office 👩‍🚀 é");
            const start = index * 4;
            const timeline = parts.map((part, offset) => ({
                        char: part.segment,
                        startTime: start + offset * 3 / parts.length,
                        endTime: start + (offset + 1) * 3 / parts.length
                    }));
            rows.push({
                line: {
                    fullText: text || "海边 office 👩‍🚀 é",
                    startTime: start,
                    endTime: start + 3,
                    words: []
                },
                timeline,
                graphemes: parts,
                wordSegments: [],
                layoutUnits: [],
                displayWords: []
            });
        }
        return rows;
    }
    function createScene(properties) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/claddagh/Claddagh.qml");
        compare(component.status, Component.Ready, component.errorString());
        const values = Object.assign({
            width: 1000,
            height: 700,
            preparedLines: prepared(8),
            currentIndex: 2,
            timeSeconds: 8.5,
            baseFont: Qt.font({
                family: "Arial",
                pixelSize: 72,
                weight: 700
            }),
            motionEnabled: false,
            live: true
        }, properties || {});
        const scene = createTemporaryObject(component, testCase, values);
        verify(scene !== null);
        wait(50);
        scene.refreshLayouts();
        scene.refreshFrame();
        wait(30); // Drain constructor/prepareSpacing callLater before testing a new input.
        compare(scene.renderError, "");
        return scene;
    }
    function test_kernelInActualQv4() {
        const spring = Ring.stepSpring(Ring.retargetSpring(Ring.createSpring(0), 1, true), .016);
        verify(spring.value > 0 && spring.value < Math.PI);
        compare(Ring.windowIndices(3, 10), [2, 3, 4, 5]);
        compare(Ring.renderEnd({
            startTime: 0,
            endTime: 4
        }, {
            startTime: 12
        }), 11.66);
    }
    function test_sparsePreparedWindowPreservesSourceIndices() {
        const source = prepared(54);
        const sparse = [];
        for (const index of [49, 50, 52])
            sparse[index] = source[index];
        const scene = createScene({
            preparedLines: sparse,
            currentIndex: 50,
            timeSeconds: 200.5
        });
        compare(scene.centerIndex, 50);
        compare(scene.renderWindow, [49, 50, 52]);
        compare(scene.mountedLineCount, 3);
        compare(scene.layerFor(52).lineIndex, 52);
        sparse[50] = undefined;
        scene.preparedLines = sparse.slice();
        wait(30);
        compare(scene.centerIndex, 50);
        compare(scene.renderWindow, [49, 52]);
        compare(scene.renderError, "");
    }
    function test_recentCompletedUsesRawEndWhileCurrentIndexIsMinusOne() {
        const rows = prepared(2);
        rows[0].line.renderHints = {
            renderEndTime: 3.36
        };
        const scene = createScene({
            preparedLines: rows,
            currentIndex: -1,
            timeSeconds: 3.1
        });
        compare(scene.centerIndex, 0);
        compare(scene.spring.value, 0);
        compare(scene.renderError, "");
    }
    function test_staticHeightChangeMovesRingCenterWithoutRebuildingMasks() {
        const scene = createScene();
        const layer = scene.layerFor(2);
        const y = layer.poses[0].y;
        const revision = layer.maskRevision;
        scene.height += 200;
        tryVerify(() => Math.abs(layer.poses[0].y - y - 100) < .0001, 1000);
        compare(layer.maskRevision, revision);
    }
    function test_staticThemeChangePublishesWithoutPlaybackTick() {
        const scene = createScene({
            preparedLines: prepared(1, "M"),
            currentIndex: 0,
            timeSeconds: 1.5
        });
        const layer = scene.layerFor(0);
        const revision = layer.maskRevision;
        scene.accentColor = "#00ff00";
        tryVerify(() => layer.poses[0].color.r < .01 && layer.poses[0].color.g > .99, 1000);
        compare(scene.timeSeconds, 1.5);
        compare(layer.maskRevision, revision);
    }
    function test_staticFontChangeRepublishesShapedPoses() {
        const scene = createScene();
        const layer = scene.layerFor(2);
        const revision = layer.maskRevision;
        scene.baseFont = Qt.font({
            family: "Menlo",
            pixelSize: 72,
            weight: 700
        });
        tryVerify(() => layer.maskRevision > revision, 1000);
        tryVerify(() => layer.poses.length > 0 && layer.poses.length === layer.clusters.length, 1000);
        compare(scene.timeSeconds, 8.5);
        compare(scene.renderError, "");
    }
    function test_timingMetadataUpdatesPoseWithoutChangingPlaybackOrMasks() {
        const scene = createScene({
            preparedLines: prepared(2, "AB"),
            currentIndex: 0,
            timeSeconds: 2.5,
            nextStartBySourceIndex: {}
        });
        const layer = scene.layerFor(0);
        const x = layer.poses[0].x;
        const revision = layer.maskRevision;
        const uploads = layer.textureUploads;
        scene.nextStartBySourceIndex = {
            0: 100,
            1: null
        };
        tryVerify(() => Math.abs(layer.poses[0].x - x) > 1, 1000);
        compare(scene.currentIndex, 0);
        compare(scene.timeSeconds, 2.5);
        compare(layer.maskRevision, revision);
        compare(layer.textureUploads, uploads);
    }
    function test_pausedAxisUsesZeroPowerWithoutStoppingTheLyricClock() {
        const scene = createScene({
            motionEnabled: true,
            bassPower: .6,
            vocalPower: .4
        });
        for (let frame = 0; frame < 60; frame++)
            scene.advance(.1);
        const axis = findChild(scene, "foliaCladdaghAxis");
        verify(axis.transform[0].xScale > 1.1);
        scene.paused = true;
        compare(axis.transform[0].xScale, 1);
        compare(axis.colorRatio, 0);
        compare(scene.timeSeconds, 8.5);
        verify(scene.bassSpring.value > .5);
    }
    function test_completedChorusKeepsRingFocusButFadesAxisGlow() {
        const rows = prepared(1, "M");
        rows[0].line.isChorus = true;
        const scene = createScene({
            preparedLines: rows,
            currentIndex: 0,
            timeSeconds: 2.5,
            motionEnabled: true
        });
        for (let frame = 0; frame < 25; frame++)
            scene.advance(.016);
        compare(scene.axisGlow, 1);
        scene.timeSeconds = 3.1;
        scene.currentIndex = -1;
        compare(scene.centerIndex, 0);
        for (let frame = 0; frame < 25; frame++)
            scene.advance(.016);
        compare(scene.axisGlow, 0);
    }
    function test_visiblePresentationExitsAndHiddenScopeRetiresImmediately() {
        const scene = createScene({
            motionEnabled: true
        });
        verify(scene.opacity > 0 && scene.opacity < 1);
        tryCompare(scene, "opacity", 1, 1500);
        exitSpy.target = scene;
        exitSpy.clear();
        scene.exiting = true;
        tryCompare(exitSpy, "count", 1, 1500);
        compare(scene.opacity, 0);
        compare(scene.timeSeconds, 8.5);
        scene.exiting = false;
        scene.live = false;
        compare(scene.opacity, 0);
        tryCompare(scene.layerFor(2), "cacheBytes", 0);
        exitSpy.target = null;
    }
    function test_rejectedNativeRunsRemainVisibleAsPreparationErrors() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/claddagh/Claddagh.qml");
        compare(component.status, Component.Ready, component.errorString());
        const scene = createTemporaryObject(component, testCase, {
            width: 1000,
            height: 700,
            currentIndex: 0,
            timeSeconds: 1,
            preparedLines: prepared(1, "x".repeat(8193)),
            baseFont: Qt.font({
                family: "Arial"
            }),
            motionEnabled: false
        });
        verify(scene !== null);
        tryVerify(() => scene.renderError.length > 0, 1000);
        const failure = scene.renderError;
        scene.timeSeconds = 1.1;
        wait(30);
        compare(scene.renderError, failure);
        scene.preparedLines = prepared(1, "M");
        tryVerify(() => scene.renderError === "" && scene.layerFor(0).poses.length > 0, 1000);
    }
    function test_realGlyphWindowPreservesEgcAndShapes() {
        const scene = createScene();
        compare(scene.mountedLineCount, 4);
        const layer = scene.layerFor(2);
        verify(layer !== null);
        compare(layer.metrics.length, 1);
        compare(layer.spacing.length, scene.preparedLines[2].graphemes.length);
        verify(layer.clusters.length <= layer.spacing.length);
        const astronaut = layer.spacing.find(item => item.char === "👩‍🚀");
        verify(astronaut !== undefined);
        compare(astronaut.length, 5);
        compare(layer.poses.length, layer.clusters.length);
        verify(layer.poses.every(pose => Number.isFinite(pose.x) && Number.isFinite(pose.y)));
    }
    function test_clockAndPowerDoNotRebuildMasks() {
        const scene = createScene({
            motionEnabled: true
        });
        const layer = scene.layerFor(2);
        const revision = layer.maskRevision;
        const uploads = layer.textureUploads;
        for (let frame = 0; frame < 60; frame++) {
            scene.timeSeconds = 8.5 + frame * .01;
            scene.bassPower = .6;
            scene.advance(.016);
        }
        wait(40);
        compare(scene.renderError, "");
        compare(layer.maskRevision, revision);
        compare(layer.textureUploads, uploads);
        verify(layer.poses.some(pose => pose.halos.length > 0));
    }
    function test_seekWindowAndResetGuard() {
        const scene = createScene();
        scene.currentIndex = 6;
        scene.timeSeconds = 24.5;
        wait(40);
        compare(scene.centerIndex, 6);
        compare(scene.spring.value, 6 * Math.PI);
        compare(scene.mountedLineCount, 3);
        scene.timeSeconds = 0;
        compare(scene.holdReset, true);
        scene.currentIndex = 0;
        wait(40);
        compare(scene.holdReset, false);
        compare(scene.centerIndex, 0);
        compare(scene.spring.value, 0);
    }
    function test_realRingBodyAndChorusHaloPixels() {
        const ready = prepared(1, "M");
        ready[0].line.isChorus = true;
        const scene = createScene({
            preparedLines: ready,
            currentIndex: 0,
            timeSeconds: 1.5,
            accentColor: "#ff4080",
            settings: {
                claddaghShowAxisLine: false
            }
        });
        const layer = scene.layerFor(0);
        tryVerify(() => layer.textureUploads > 0 && layer.renderBatches > 0, 5000);
        const original = layer.poses;
        compare(original.length, 1);
        compare(original[0].halos.length, 3);
        compare(original[0].halos[0].radius, 12.6);
        compare(original[0].halos[1].radius, 36);
        compare(original[0].halos[2].radius, 57.6);
        const revision = layer.maskRevision;
        const uploads = layer.textureUploads;
        waitForRendering(scene);
        const halo = grabImage(scene);
        layer.poses = original.map(pose => Object.assign({}, pose, {
                halos: []
            }));
        waitForRendering(scene);
        const body = grabImage(scene);
        halo.save("build/folia-native-qml/claddagh-halo.png");
        body.save("build/folia-native-qml/claddagh-body.png");
        let bodyPixels = 0;
        let haloPixels = 0;
        for (let y = 0; y < body.height; y += 2) {
            for (let x = 0; x < body.width; x += 2) {
                if (body.red(x, y) > 100)
                    bodyPixels++;
                if (body.red(x, y) < 10 && halo.red(x, y) > body.red(x, y) + 2)
                    haloPixels++;
            }
        }
        verify(bodyPixels > 100, "Visible native ring glyph pixels=" + bodyPixels);
        verify(haloPixels > 100, "Independent chorus halo pixels=" + haloPixels);
        compare(layer.maskRevision, revision);
        compare(layer.textureUploads, uploads);
        compare(layer.errorString, "");
    }
}
