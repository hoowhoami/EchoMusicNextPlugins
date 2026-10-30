import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared/harmony" as Resources
import "../../plugins/folia-lyrics-skin/qml/shared/harmony/index.mjs" as Harmony

TestCase {
    id: testCase
    name: "FoliaHarmony"
    when: windowShown
    visible: true
    width: 1100
    height: 820
    Rectangle {
        anchors.fill: parent
        color: "#080b14"
        z: -1
    }
    function initTestCase() {
        failOnWarning(/invalid context|TypeError|Binding loop|first argument not a function/);
    }
    function makeVoice(text, start, end) {
        return {
            text,
            startTime: start,
            endTime: end,
            words: [
                {
                    text,
                    startTime: start,
                    endTime: end
                }
            ],
            translation: "A real harmony translation"
        };
    }
    function createOverlay(values) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/shared/HarmonyOverlay.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, Object.assign({
            width: 1100,
            height: 820,
            vocalIndex: Harmony.buildHarmonyIndex([makeVoice("ffi 和声👩🏽‍🚀", 1, 8)]),
            timeSeconds: 2,
            textService: foliaTestTextService,
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 20
            }),
            translationFont: Qt.font({
                family: "Menlo",
                pixelSize: 20
            }),
            accentColor: "#ff2255",
            secondaryColor: "#dddddd",
            backgroundColor: "#080b14",
            settings: {
                subtitleFontScale: 1,
                wordColors: [],
                showHarmonySubtitle: true,
                harmonySubtitleBackground: true
            }
        }, values || {}));
    }
    Component {
        id: maskProbe
        Rectangle {
            width: 160
            height: 80
            color: "black"
            Rectangle {
                anchors.fill: parent
                color: "white"
                layer.enabled: true
                layer.effect: ShaderEffect {
                    property var source
                    property vector2d extent: Qt.vector2d(160, 80)
                    property real edge: 30
                    property real solid: 3
                    property real halfStop: 16.5
                    fragmentShader: "../../plugins/folia-lyrics-skin/qml/shared/harmony/sweep.frag.qsb"
                }
            }
        }
    }
    Component {
        id: glowProbe
        Rectangle {
            width: 464
            height: 312
            color: "black"
            property alias glow: glow
            Resources.HarmonyBackground {
                id: glow
                x: 72
                y: 72
                width: 320
                height: 168
                backgroundColor: "#e83a98"
            }
        }
    }
    function test_shaderCoverageAndCachedBackgroundMatchTheSourceCssOracle() {
        const mask = createTemporaryObject(maskProbe, testCase);
        verify(mask);
        wait(100);
        const image = grabImage(mask), ratio = image.width / mask.width;
        image.save(foliaTestCaptureDir + "/mask-dpr" + ratio + ".png");
        for (const x of [1, 5, 12, 18, 25, 32, 80]) {
            const physical = Math.floor((x + .5) * ratio), point = (physical + .5) / ratio;
            const a = point <= 3 ? 1 : point < 16.5 ? 1 - .14 * (point - 3) / 13.5 : point < 30 ? .86 * (30 - point) / 13.5 : 0;
            verify(Math.abs(image.pixel(physical, 20 * ratio).r - a) < 2 / 255, "source mask coverage at " + point);
        }
        mask.visible = false;
        const glow = createTemporaryObject(glowProbe, testCase);
        verify(glow);
        tryVerify(() => glow.glow.bakeCount > 0);
        wait(250);
        compare(glow.glow.errorString, "");
        const capture = grabImage(glow);
        capture.save(foliaTestCaptureDir + "/glow-dpr" + ratio + ".png");
        const bakes = glow.glow.bakeCount;
        wait(150);
        compare(glow.glow.bakeCount, bakes, "static CSS background must not rebake every frame");
    }
    function test_sourceVoiceOutlivesMainAndUsesRealGpuSweepWithoutReshaping() {
        const view = createOverlay();
        verify(view);
        tryVerify(() => !view.busy && view.actors.length === 1, 20000);
        compare(view.errorString, "");
        wait(650);
        const actor = view.actors[0], glyph = actor.glyph;
        tryVerify(() => glyph.textureUploads > 0 && glyph.renderBatches > 0, 5000);
        const active = actor.renderers[1], revision = glyph.maskRevision, uploads = glyph.textureUploads, activeRevision = active.maskRevision, activeUploads = active.textureUploads, prepared = view.shapingRevision;
        const first = grabImage(view);
        view.timeSeconds = 7.5;
        wait(50);
        const last = grabImage(view);
        verify(!first.equals(last), "The true colored active sweep must change GPU pixels");
        compare(glyph.maskRevision, revision);
        compare(glyph.textureUploads, uploads);
        compare(active.maskRevision, activeRevision);
        compare(active.textureUploads, activeUploads);
        compare(view.shapingRevision, prepared);
        compare(view.activeCount, 1);
        view.timeSeconds = 9;
        wait(600);
        compare(view.activeCount, 0);
        compare(view.cacheBytes, 0);
    }
    function test_normalizedSourceMeasurementKeepsLiteralDisplaySpacesAndLineBreaks() {
        const text = "  A \n B  ";
        const view = createOverlay({
            vocalIndex: Harmony.buildHarmonyIndex([makeVoice(text, 0, 5)]),
            timeSeconds: 2
        });
        verify(view);
        tryVerify(() => !view.busy && view.actors.length === 1, 20000);
        compare(view.errorString, "");
        compare(view.actors[0].glyph.runs[0].text, text);
        verify(view.actors[0].height > 40);
    }
    function test_nativeClusterWordsKeepExactSourceColorsAndStaticPunctuation() {
        const vocal = {
            text: "和声 ffi!",
            startTime: 0,
            endTime: 5,
            words: [
                {
                    text: "和声",
                    startTime: 0,
                    endTime: 2
                },
                {
                    text: "ffi",
                    startTime: 2,
                    endTime: 4
                }
            ]
        };
        const view = createOverlay({
            vocalIndex: Harmony.buildHarmonyIndex([vocal]),
            timeSeconds: 3,
            accentColor: "#1122ff",
            secondaryColor: "#cccccc",
            settings: {
                wordColors: [
                    {
                        word: "和",
                        color: "#ff0000"
                    },
                    {
                        word: "hello ffi",
                        color: "#00ff00"
                    }
                ]
            }
        });
        verify(view);
        tryVerify(() => !view.busy && view.actors.length === 1, 20000);
        compare(view.errorString, "");
        const colors = Array.from(view.actors[0].renderers[1].poses, p => String(p.color));
        verify(colors.indexOf("#1122ff") >= 0, "CJK exact does not match a contained keyword");
        verify(colors.indexOf("#00ff00") >= 0, "English keyword colors use the actual complete ffi word");
        verify(colors.indexOf("#cccccc") >= 0, "Untimed punctuation retains the secondary color");
        verify(colors.indexOf("#ff0000") < 0, "No invented partial CJK match");
        for (const pose of view.actors[0].glyph.poses)
            verify(Math.abs(pose.color.a - .56) < 1 / 255);
    }
    function test_budgetFailureIsExplicitAndDoesNotPublishTruncatedGlyphs() {
        const view = createOverlay({
            vocalIndex: Harmony.buildHarmonyIndex([makeVoice("A".repeat(8193), 0, 5)]),
            timeSeconds: 1
        });
        verify(view);
        tryVerify(() => !view.busy && view.errorString.length > 0, 10000);
        verify(view.errorString.indexOf("8192") >= 0, view.errorString);
        compare(view.actors.length, 0);
        compare(view.cacheBytes, 0);
        verify(!view.preparationActive);
    }
    function test_pauseKeepsWallclockEntranceAndHiddenReleasesAllWorkersAndGpu() {
        const view = createOverlay({
            timeSeconds: 2
        });
        verify(view);
        tryVerify(() => !view.busy && view.actors.length === 1, 20000);
        wait(650);
        verify(view.enteredOpacity > .99);
        view.live = false;
        wait(20);
        compare(view.actors.length, 0);
        compare(view.cacheBytes, 0);
        verify(!view.preparationActive);
    }
    function test_realLongUnicodeLineNarrowWrappingAndFontChange() {
        const text = "ffi العربية 👩🏽‍🚀 中文 ".repeat(40);
        const view = createOverlay({
            width: 320,
            vocalIndex: Harmony.buildHarmonyIndex([makeVoice(text, 0, 12)]),
            timeSeconds: 6
        });
        verify(view);
        tryVerify(() => !view.busy && view.actors.length === 1, 60000);
        compare(view.errorString, "");
        verify(view.actors[0].height > 30);
        const old = view.shapingRevision;
        view.baseFont = Qt.font({
            family: "Times New Roman",
            pixelSize: 20
        });
        tryVerify(() => !view.busy && view.shapingRevision > old, 60000);
        compare(view.errorString, "");
        view.live = false;
        wait(20);
        compare(view.cacheBytes, 0);
    }
    function test_sourceFlagsAndRapidActualRetirement() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/shared/HarmonyOverlay.qml");
        compare(component.status, Component.Ready, component.errorString());
        for (let index = 0; index < 20; index++) {
            const loader = Qt.createQmlObject('import QtQuick; Loader {}', testCase);
            loader.setSource(Qt.resolvedUrl("../../plugins/folia-lyrics-skin/qml/shared/HarmonyOverlay.qml"), {
                width: 320,
                height: 640,
                vocalIndex: Harmony.buildHarmonyIndex([makeVoice("Queued 和声", 0, 5)]),
                timeSeconds: 1,
                textService: foliaTestTextService,
                baseFont: Qt.font({
                    family: "Menlo"
                }),
                translationFont: Qt.font({
                    family: "Menlo"
                })
            });
            loader.active = false;
            loader.destroy();
        }
        wait(100);
        const view = createOverlay({
            settings: {
                showText: false
            }
        });
        verify(view);
        wait(30);
        compare(view.activeCount, 0);
        compare(view.cacheBytes, 0);
    }
}
