import QtQuick
import QtTest
import EchoMusic.PluginSdk
import "../../../plugins/folia-lyrics-skin/qml/shared"
import "../../../plugins/folia-lyrics-skin/qml/shared/text/prepare.mjs" as Prepare

TestCase {
    id: testCase
    name: "FoliaRetirement"
    when: windowShown
    visible: true
    width: 1100
    height: 820
    readonly property var prepared: Prepare.prepareLines([
        {
            fullText: "Hello 世界",
            startTime: 0,
            endTime: 4,
            words: [
                {
                    text: "Hello 世界",
                    startTime: 0,
                    endTime: 4
                }
            ],
            wordSegments: ["Hello", " ", "世界"]
        }
    ], [], null).lines
    readonly property font sourceFont: Qt.font({
        family: "Menlo",
        pixelSize: 40
    })
    function initTestCase() {
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
    }
    function init() {
        failOnWarning(/invalid context|TypeError:|is not a function|Exception occurred during delayed/);
    }
    Component {
        id: directLoader
        Loader {
            width: 1100
            height: 820
            function mount() {
                setSource("../../../plugins/folia-lyrics-skin/qml/styles/classic/ClassicLine.qml", {
                    prepared: testCase.prepared[0],
                    settings: {},
                    baseFont: testCase.sourceFont,
                    primaryColor: "white",
                    accentColor: "red",
                    viewportWidth: 1100,
                    timeSeconds: 1,
                    enteredAt: 0,
                    presentationSeconds: 1,
                    enteredPresentationAt: 0
                });
            }
        }
    }
    Component {
        id: stageComponent
        VisualizerStage {
            width: 1100
            height: 820
            preparedLines: testCase.prepared
            currentIndex: 0
            timeSeconds: 1
            baseFont: testCase.sourceFont
            settings: ({
                    animationIntensity: "calm",
                    classicEnableWordRotation: false,
                    classicBreathingFloatMultiplier: 0
                })
            textService: foliaTestTextService
            motionEnabled: false
        }
    }
    function test_classicNativeLayoutQueuedBeforeLoaderRetires() {
        const loader = createTemporaryObject(directLoader, testCase);
        for (let i = 0; i < 60; ++i) {
            loader.active = true;
            loader.mount();
            verify(loader.item !== null);
            verify(loader.item.glyphRenderer.metrics.length > 0);
            loader.item.scheduleLayoutCheck();
            loader.active = false;
            compare(loader.item, null);
            wait(1);
        }
        wait(40);
    }
    function test_stageRapidLoadsAndRetiresRealGlyphContexts() {
        const stage = createTemporaryObject(stageComponent, testCase);
        const modes = ["classic", "cadenza", "partita", "tilt", "claddagh", "cappella", "pendolo", "fume"];
        for (let i = 0; i < 24; ++i) {
            const mode = modes[i % modes.length];
            stage.mode = mode;
            stage.componentPath = "styles/" + mode + "/" + mode[0].toUpperCase() + mode.slice(1) + ".qml";
            tryVerify(() => stage.renderer !== null, 5000);
            if (mode === "classic") {
                tryVerify(() => stage.renderer.renderer !== null, 5000);
                stage.renderer.renderer.parent.scheduleLayoutCheck();
            }
            stage.live = false;
            compare(stage.renderer, null);
            compare(stage.layerCount, 0);
            wait(2);
            stage.live = true;
        }
        stage.live = false;
        wait(100);
    }
}
