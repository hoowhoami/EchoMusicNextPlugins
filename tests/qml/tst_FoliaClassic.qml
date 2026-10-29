import QtQuick
import QtTest
import EchoMusic.PluginSdk
import "../../plugins/folia-lyrics-skin/qml/shared/text/prepare.mjs" as Prepare

TestCase {
    id: testCase
    name: "FoliaClassic"
    when: windowShown
    visible: true
    width: 1100
    height: 820
    Rectangle {
        anchors.fill: parent
        color: "#080b14"
        z: -1
    }
    Component {
        id: nativeProbe
        GlyphRun {
            width: 1100
            height: 820
            font: Qt.font({
                family: "Menlo"
            })
            runs: [
                {
                    key: "probe",
                    text: "M",
                    size: 66,
                    maxBlur: 0
                }
            ]
            poses: [
                {
                    key: "probe",
                    x: 500,
                    y: 400,
                    color: "red"
                }
            ]
        }
    }
    function test_nativeProbe() {
        const probe = createTemporaryObject(nativeProbe, testCase);
        tryVerify(() => probe.textureUploads > 0, 5000);
        probe.poses = [
            {
                key: "probe",
                x: 500,
                y: 400,
                color: "red"
            }
        ];
        wait(40);
        compare(probe.errorString, "");
        const capture = grabImage(probe);
        capture.save("build/folia-native-qml/classic-probe.png");
        let pixels = 0;
        const density = Screen.devicePixelRatio;
        for (let y = Math.floor(350 * density); y < Math.min(capture.height, 550 * density); y += 2)
            for (let x = Math.floor(450 * density); x < Math.min(capture.width, 650 * density); x += 2)
                if (capture.red(x, y) > 100)
                    pixels++;
        verify(pixels > 20, "Minimal native QML glyph pixels=" + pixels);
    }
    function test_chorusBilingualSceneUsesPreparedWords() {
        const parts = ["夜空中", "最亮的星", " / ", "in", " ", "the", " ", "sky"];
        const times = [[0, 1.6], [1.6, 3.4], [3.4, 3.4], [3.4, 3.7], [3.7, 3.7], [3.7, 4.1], [4.1, 4.1], [4.1, 5.2]];
        const words = parts.map((text, index) => ({
                    text,
                    startTime: times[index][0],
                    endTime: times[index][1]
                }));
        words[0].syllables = [
            {
                text: "夜空",
                startTime: 0,
                endTime: 1.2
            },
            {
                text: "中",
                startTime: 1.2,
                endTime: 1.6
            }
        ];
        const line = {
            fullText: parts.join(""),
            startTime: 0,
            endTime: 5.2,
            words,
            wordSegments: parts,
            isChorus: true
        };
        const ready = Prepare.prepareLines([line], [], null).lines;
        const view = createClassic({
            preparedLines: ready
        });
        view.timeSeconds = 4.45;
        tryVerify(() => view.renderer && view.renderer.metrics.length === ready[0].displayWords.length && view.renderer.parent.lineMotion.blur === 0, 5000);
        compare(view.renderer.errorString, "");
        const chorus = findChild(view.renderer.parent, "classicChorusWords");
        verify(chorus !== null);
        compare(chorus.count, ready[0].displayWords.length);
        verify(view.renderer.parent.geometry.rows.length >= 2);
        grabImage(view).save("build/folia-native-qml/classic-bilingual.png");
    }

    function prepared(text, start, end) {
        const chars = Array.from(text);
        const words = chars.map((char, index) => ({
                    text: char,
                    startTime: start + index * (end - start) / chars.length,
                    endTime: start + (index + 1) * (end - start) / chars.length
                }));
        return Prepare.prepareLines([
            {
                fullText: text,
                startTime: start,
                endTime: end,
                words,
                autoWordSegments: chars
            }
        ], [], null).lines[0];
    }
    function createClassic(values) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/classic/Classic.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, Object.assign({
            width: 1100,
            height: 820,
            preparedLines: [prepared("世界", 0, 4)],
            currentIndex: 0,
            timeSeconds: 0,
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 40
            }),
            primaryColor: "white",
            accentColor: "#ff4f86",
            settings: {
                animationIntensity: "normal",
                lyricsFontScale: 1,
                classicEnableWordRotation: true,
                classicBreathingFloatMultiplier: 1,
                classicUseLegacyLayout: false,
                classicWordSpacing: 0.7
            }
        }, values || {}));
    }
    function test_realNativeShapingAndPoseUpdatesDoNotRebuildMasks() {
        const view = createClassic();
        verify(view);
        tryVerify(() => view.renderer !== null && view.renderer.metrics.length === 2, 10000);
        view.timeSeconds = 1;
        wait(60);
        compare(view.renderer.errorString, "");
        compare(view.renderer.runs[0].size, 66);
        compare(view.renderer.font.family, "Menlo");
        verify(view.renderer.poses.length >= 2);
        tryVerify(() => view.renderer.textureUploads > 0, 5000);
        const revision = view.renderer.maskRevision;
        const uploads = view.renderer.textureUploads;
        for (let frame = 0; frame < 20; frame++) {
            view.timeSeconds = 1 + frame / 60;
            wait(1);
        }
        compare(view.renderer.maskRevision, revision);
        compare(view.renderer.textureUploads, uploads);
        compare(view.renderer.errorString, "");
    }
    function test_emojiAndLigatureKeepNativeClusterStarts() {
        const text = "fi👩🏽‍🚀";
        const line = {
            fullText: text,
            startTime: 0,
            endTime: 3,
            words: [
                {
                    text,
                    startTime: 0,
                    endTime: 3
                }
            ],
            autoWordSegments: [text]
        };
        const ready = Prepare.prepareLines([line], [], null).lines;
        const view = createClassic({
            preparedLines: ready
        });
        tryVerify(() => view.renderer && view.renderer.metrics.length === 1, 10000);
        view.timeSeconds = 0.5;
        wait(30);
        const starts = view.renderer.poses.map(pose => pose.start);
        const allowed = view.renderer.metrics[0].graphemes.map(part => part.clusterStart);
        verify(starts.length < text.length);
        for (const start of starts)
            verify(allowed.indexOf(start) >= 0);
        compare(view.renderer.errorString, "");
    }
    function test_settingsAndLineExitUseSourceBranches() {
        const view = createClassic({
            preparedLines: [prepared("世界", 0, 4), prepared("明天", 4, 8)]
        });
        tryVerify(() => view.renderer && view.renderer.metrics.length > 0, 10000);
        view.timeSeconds = 1;
        view.settings = Object.assign({}, view.settings, {
            classicEnableWordRotation: false,
            classicBreathingFloatMultiplier: 0
        });
        wait(30);
        for (const config of view.renderer.parent.configs.wordConfigs) {
            compare(config.rotate, 0);
            compare(config.passedRotate, 0);
        }
        const previous = view.renderer;
        view.timeSeconds = 4;
        view.currentIndex = 1;
        tryCompare(view, "layerCount", 2);
        verify(view.renderer !== previous);
        view.timeSeconds = 4.31;
        tryCompare(view, "layerCount", 1);
        view.settings = Object.assign({}, view.settings, {
            showText: false
        });
        view.timeSeconds = 4.52;
        tryCompare(view, "layerCount", 0);
    }
    function test_pausedBreathingUsesAmbientTimeAndHiddenScopeReleases() {
        const view = createClassic({
            timeSeconds: 1
        });
        tryVerify(() => view.renderer && view.renderer.metrics.length > 0, 10000);
        tryVerify(() => view.renderer.parent.wordTransitions.length > 0, 5000);
        const time = view.timeSeconds;
        const glow = JSON.stringify(view.renderer.poses.map(pose => pose.halos));
        const ambient = view._ambientSeconds;
        const activeAt = view.renderer.parent.wordTransitions[0].at;
        tryVerify(() => view._ambientSeconds > ambient + 0.02, 3000);
        compare(view.timeSeconds, time);
        compare(view.renderer.parent.wordTransitions[0].at, activeAt);
        compare(JSON.stringify(view.renderer.poses.map(pose => pose.halos)), glow);
        verify(view._breathing.y !== 0);
        view.live = false;
        tryCompare(view, "layerCount", 0);
        const stopped = view._ambientSeconds;
        wait(60);
        compare(view._ambientSeconds, stopped);
        view.live = true;
        tryCompare(view, "layerCount", 1);
    }
    function test_disabledMotionDoesNotRetainLeavingLayers() {
        const view = createClassic({
            motionEnabled: false,
            preparedLines: [prepared("世界", 0, 4), prepared("明天", 4, 8)],
            timeSeconds: 1
        });
        tryCompare(view, "layerCount", 1);
        view.currentIndex = 1;
        tryCompare(view, "layerCount", 1);
        compare(view.renderer.parent.prepared.line.fullText, "明天");
    }
    function test_pausedRepeatedSeekKeepsBoundedLeavingLayers() {
        const lines = [];
        for (let index = 0; index < 8; index++)
            lines.push(prepared("第" + index, index * 4, index * 4 + 3));
        const view = createClassic({
            preparedLines: lines,
            timeSeconds: 1
        });
        for (let index = 1; index < lines.length; index++)
            view.currentIndex = index;
        verify(view.layerCount <= 4);
        compare(view.renderer.parent.prepared.line.fullText, "第7");
        tryCompare(view, "layerCount", 1, 3000);
        compare(view.timeSeconds, 1);
    }
    function test_independentHalosProduceNativePixelsWithoutMaskUploads() {
        const view = createClassic({
            preparedLines: [prepared("M", 0, 4)],
            settings: {
                animationIntensity: "calm",
                classicEnableWordRotation: false,
                classicBreathingFloatMultiplier: 0
            }
        });
        tryVerify(() => view.renderer && view.renderer.metrics.length === 1, 10000);
        compare(view.renderer.supportedMaxHaloRadius, 1024);
        view.timeSeconds = 3.6;
        tryVerify(() => view.renderer.textureUploads > 0 && view.renderer.renderBatches > 0, 5000);
        tryVerify(() => view.renderer.parent.lineMotion.blur === 0 && view.renderer.poses[0].opacity === 1, 3000);
        const renderer = view.renderer;
        // QVariantList reads are live views; snapshot values before freezing motion.
        const original = Array.from(renderer.poses, pose => Object.assign({}, pose, {
                color: Qt.rgba(pose.color.r, pose.color.g, pose.color.b, pose.color.a),
                halos: Array.from(pose.halos, halo => ({
                            radius: halo.radius,
                            opacity: halo.opacity,
                            color: Qt.rgba(halo.color.r, halo.color.g, halo.color.b, halo.color.a)
                        }))
            }));
        compare(original.length, 1);
        compare(original[0].halos.length, 2);
        compare(original[0].halos[0].radius, 20);
        compare(original[0].halos[1].radius, 40);
        const revision = renderer.maskRevision;
        const uploads = renderer.textureUploads;
        // Freeze presentation motion before overriding its live poses Binding
        // for two otherwise identical RGB snapshots.
        view.motionEnabled = false;
        wait(30);
        renderer.poses = original;
        waitForRendering(view);
        const halo = grabImage(view);
        renderer.poses = original.map(pose => Object.assign({}, pose, {
                halos: []
            }));
        waitForRendering(view);
        const body = grabImage(view);
        halo.save("build/folia-native-qml/classic-halo.png");
        body.save("build/folia-native-qml/classic-body.png");
        let outsideInk = 0;
        let bodyInk = 0;
        const density = Screen.devicePixelRatio;
        for (let y = Math.floor(250 * density); y < Math.min(body.height, 570 * density); y += 2) {
            for (let x = Math.floor(350 * density); x < Math.min(body.width, 750 * density); x += 2) {
                // QtTest captures the opaque window background, so alpha is always 255.
                if (body.red(x, y) > 100)
                    bodyInk++;
                if (body.red(x, y) <= 10 && body.green(x, y) <= 13 && body.blue(x, y) <= 22 && halo.red(x, y) > body.red(x, y) + 1)
                    outsideInk++;
            }
        }
        verify(bodyInk > 20, "The native body must produce visible glyph pixels: " + bodyInk);
        verify(outsideInk > 100, "The independent native halos must extend beyond the body mask: " + outsideInk);
        compare(renderer.maskRevision, revision);
        compare(renderer.textureUploads, uploads);
        compare(renderer.errorString, "");
    }
    function test_rejectedLayoutRetainsErrorUntilValidRunsAreAccepted() {
        const view = createClassic({
            settings: {
                classicUseLegacyLayout: true
            },
            timeSeconds: 1
        });
        tryVerify(() => view.renderer && view.renderer.metrics.length > 0, 5000);
        compare(view.errorString, "");
        const renderer = view.renderer;
        const accepted = JSON.stringify(renderer.runs);
        const oversized = "a".repeat(8193);
        view.preparedLines = Prepare.prepareLines([
            {
                fullText: oversized,
                startTime: 0,
                endTime: 4,
                words: [
                    {
                        text: oversized,
                        startTime: 0,
                        endTime: 4
                    }
                ],
                autoWordSegments: [oversized]
            }
        ], [], null).lines;
        wait(30);
        verify(view.errorString.length > 0, "A rejected 8193-unit layout must remain observable");
        compare(JSON.stringify(renderer.runs), accepted);
        compare(renderer.opacity, 0);
        const revision = renderer.maskRevision;
        view.timeSeconds = 1.2;
        view.accentColor = "#40ff80";
        wait(80);
        verify(view.errorString.length > 0, "Frame poses must not clear a rejected layout error");
        compare(renderer.maskRevision, revision);
        view.preparedLines = [prepared("恢复", 0, 4)];
        tryCompare(view, "errorString", "", 5000);
        compare(view.renderer.metrics.length, 2);
        verify(renderer.maskRevision > revision);
        compare(renderer.opacity, 1);
        const font = Qt.font({
            family: "Menlo",
            pixelSize: 40
        });
        view.baseFont = Qt.font({
            family: "Menlo",
            pixelSize: 1025
        });
        wait(30);
        verify(view.errorString.length > 0, "A rejected base font must remain observable");
        view.timeSeconds = 1.4;
        wait(30);
        verify(view.errorString.length > 0);
        view.baseFont = font;
        tryCompare(view, "errorString", "", 5000);
    }
    function test_sparseSourceIndicesAndNoActiveLine() {
        const sparse = [];
        sparse[5] = prepared("稀疏", 20, 24);
        const view = createClassic({
            preparedLines: sparse,
            currentIndex: 5,
            timeSeconds: 21,
            motionEnabled: false
        });
        tryVerify(() => view.renderer && view.renderer.metrics.length > 0, 5000);
        compare(view.errorString, "");
        compare(view.renderer.parent.prepared.line.fullText, "稀疏");
        view.currentIndex = 4;
        tryCompare(view, "layerCount", 0);
        view.currentIndex = -1;
        compare(view.layerCount, 0);
        compare(view.errorString, "");
        view.currentIndex = 5;
        tryCompare(view, "layerCount", 1);
        compare(view.renderer.parent.prepared.line.fullText, "稀疏");
    }
    function test_longChineseLineKeepsNativeBudgetAndClearPixels() {
        const text = "今天我们一起去海边看日落再沿着长长的街道慢慢走吧";
        const view = createClassic({
            preparedLines: [prepared(text, 0, 4)],
            currentIndex: 0,
            timeSeconds: 2,
            motionEnabled: false,
            settings: {
                classicUseLegacyLayout: true
            }
        });
        tryVerify(() => view.renderer && view.renderer.parent.layoutAccepted, 5000);
        compare(view.renderer.metrics.length, 24);
        compare(view.errorString, "");
        verify(view.renderer.cacheBytes <= 64 * 1024 * 1024);
        waitForRendering(view);
        const image = grabImage(view);
        let ink = 0;
        for (let y = 0; y < image.height; y += 3)
            for (let x = 0; x < image.width; x += 3)
                if (image.red(x, y) > 100)
                    ink++;
        verify(ink > 100, "The complete 24-glyph line must produce clear native pixels: " + ink);
    }
    function test_keywordColorsAcceptRealQtSequences() {
        const colors = createTemporaryObject(nativeProbe, testCase);
        colors.runs = [
            {
                key: "color",
                text: "M",
                maxBlur: 0,
                word: "Hello",
                color: "#40ff80"
            }
        ];
        verify(!Array.isArray(colors.runs), "The color input must be a real QVariantList sequence");
        const ready = Prepare.prepareLines([
            {
                fullText: "Hello",
                startTime: 0,
                endTime: 4,
                words: [
                    {
                        text: "Hello",
                        startTime: 0,
                        endTime: 4
                    }
                ],
                autoWordSegments: ["Hello"]
            }
        ], [], null).lines;
        const view = createClassic({
            preparedLines: ready,
            settings: {
                wordColors: colors.runs
            }
        });
        tryVerify(() => view.renderer && view.renderer.parent.layoutAccepted, 5000);
        compare(view.renderer.parent.activeColors[0], Qt.color("#40ff80"));
    }
}
