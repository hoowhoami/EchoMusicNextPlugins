import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"
import "../../plugins/folia-lyrics-skin/qml/shared/text/prepare.mjs" as Prepare

TestCase {
    id: testCase
    name: "FoliaVisualizerStage"
    when: windowShown
    visible: true
    width: 1100
    height: 820
    function init() {
        failOnWarning(/invalid context|TypeError:|Unable to assign|is not a function/);
    }
    Component {
        id: stageComponent
        VisualizerStage {
            width: 1100
            height: 820
            mode: "classic"
            componentPath: "styles/classic/Classic.qml"
            preparedLines: Prepare.prepareLines([
                {
                    fullText: "世界",
                    startTime: 0,
                    endTime: 4,
                    words: [
                        {
                            text: "世界",
                            startTime: 0,
                            endTime: 4
                        }
                    ],
                    wordSegments: ["世界"]
                }
            ], [], null).lines
            currentIndex: 0
            timeSeconds: 1
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 40
            })
            settings: ({
                    animationIntensity: "calm",
                    classicEnableWordRotation: false,
                    classicBreathingFloatMultiplier: 0
                })
            textService: foliaTestTextService
        }
    }
    function test_switchingIsBoundedAndHiddenReleasesAllRenderers() {
        const stage = createTemporaryObject(stageComponent, testCase);
        verify(stage);
        tryVerify(() => stage.renderer && stage.renderer.renderer && stage.renderer.renderer.metrics.length > 0, 5000);
        const classic = stage.renderer;
        stage.mode = "tilt";
        stage.componentPath = "styles/tilt/Tilt.qml";
        tryVerify(() => stage.renderer && stage.renderer.objectName === "foliaTilt", 5000);
        verify(stage.renderer !== classic);
        tryVerify(() => stage.renderer.renderer && stage.renderer.renderer.metrics.length > 0, 5000);
        verify(stage.layerCount <= 2);
        tryCompare(stage, "layerCount", 1, 1500);
        for (let i = 0; i < 8; ++i) {
            stage.mode = i % 2 ? "classic" : "tilt";
            stage.componentPath = i % 2 ? "styles/classic/Classic.qml" : "styles/tilt/Tilt.qml";
            wait(10);
            verify(stage.layerCount <= 2);
        }
        stage.live = false;
        compare(stage.layerCount, 0);
        compare(stage.renderer, null);
        stage.live = true;
        tryCompare(stage, "layerCount", 1);
        stage.visible = false;
        compare(stage.layerCount, 0);
    }
    function test_liveBindingsKeepFullFontAndCurrentSettings() {
        const stage = createTemporaryObject(stageComponent, testCase, {
            motionEnabled: false
        });
        tryVerify(() => stage.renderer && stage.renderer.renderer && stage.renderer.renderer.metrics.length > 0, 5000);
        stage.baseFont = Qt.font({
            family: "Georgia",
            pixelSize: 40
        });
        tryCompare(stage.renderer.renderer, "font", stage.baseFont);
        stage.settings = Object.assign({}, stage.settings, {
            fontWeight: 500
        });
        tryVerify(() => stage.renderer.renderer.runs[0].weight === 500);
        stage.currentIndex = -1;
        tryCompare(stage.renderer, "layerCount", 0);
    }
    function test_initialMismatchedCatalogBindingsDoNotInstantiateStillWithDynamicProperties() {
        const stage = createTemporaryObject(stageComponent, testCase, {
            mode: "classic",
            componentPath: "styles/still/Still.qml"
        });
        wait(40);
        compare(stage.renderer, null);
        compare(stage.layerCount, 0);
        stage.componentPath = "styles/classic/Classic.qml";
        tryVerify(() => stage.renderer && stage.renderer.renderer, 5000);
        compare(stage.errorString, "");
    }
    function test_retirementCancelsPendingModeLoads() {
        for (let i = 0; i < 20; ++i) {
            const stage = createTemporaryObject(stageComponent, testCase);
            stage.mode = "cadenza";
            stage.componentPath = "styles/cadenza/Cadenza.qml";
            stage.destroy();
            wait(2);
        }
        wait(80);
    }
    function test_stillParticipatesInTheSameFourteenStyleTransition() {
        verify(foliaTestLyricFixture.replaceRows([
            {
                text: '上一行',
                start_ms: 0,
                duration_ms: 1000,
                words: []
            },
            {
                text: '静止的真实歌词',
                start_ms: 1000,
                duration_ms: 2000,
                translation: 'Actual subtitle',
                words: []
            }
        ]));
        const stage = probeStage();
        stage.lyricSource = foliaTestLyricSource;
        stage.lyricCount = 2;
        stage.currentIndex = 1;
        const previous = stage.renderer;
        stage.mode = 'still';
        stage.componentPath = 'styles/still/StillPresentation.qml';
        tryCompare(stage, 'loadedMode', 'still', 5000);
        verify(stage.renderer !== previous);
        verify(stage.layerCount <= 2);
        tryCompare(stage, 'transitionWaits', false, 1500);
        tryCompare(stage, 'layerCount', 1, 1500);
        tryCompare(stage, 'transitionBytes', 0, 1500);
        compare(stage.renderer.lineWindow[1].lineText, '静止的真实歌词');
        stage.currentIndex = -1;
        compare(stage.renderer.lineWindow[1].lineText, '静止的真实歌词', 'source keeps last effective index');
        stage.mode = 'classic';
        stage.componentPath = fixturePath('classic', true);
        tryCompare(stage, 'loadedMode', 'classic', 5000);
        compare(stage.transitionWaits, true);
        verify(stage.actors.some(actor => actor.modeKey === 'still'));
        stage.renderer.releaseFirstFrame();
        tryCompare(stage, 'layerCount', 1, 1500);
        stage.live = false;
        compare(stage.layerCount, 0);
        compare(stage.transitionBytes, 0);
    }
    function fixturePath(mode, slow) {
        return 'styles/' + mode + '/../../../../../tests/qml/fixtures/FoliaStage' + (slow ? 'Slow' : 'Ready') + '.qml';
    }
    function probeStage() {
        const stage = createTemporaryObject(stageComponent, testCase, {
            componentPath: fixturePath('classic', false),
            settings: {
                showText: true
            }
        });
        tryVerify(() => stage.renderer && stage.renderer.renderReady, 5000);
        return stage;
    }
    function test_switchWaitsForActualReadyAndFrameWithoutHidingOldWords() {
        const stage = probeStage(), old = stage.renderer;
        stage.mode = 'tilt';
        stage.componentPath = fixturePath('tilt', true);
        tryVerify(() => stage.renderer && stage.renderer !== old, 5000);
        compare(stage.renderer.renderReady, false);
        compare(stage.transitionWaits, true);
        compare(stage.layerCount, 2);
        compare(old.settings.showText, true, 'waiting/exit keep real source text');
        const outgoing = stage.actors.find(actor => actor.renderer === old), incoming = stage.actors.find(actor => actor.renderer === stage.renderer);
        compare(outgoing.progress, 1);
        compare(incoming.progress, 0);
        wait(120);
        compare(outgoing.progress, 1);
        compare(stage.transitionWaits, true);
        stage.renderer.releaseFirstFrame();
        tryVerify(() => !stage.transitionWaits, 1000);
        verify(incoming.hasFrame, 'readiness requires an actual Window.frameSwapped');
        tryVerify(() => outgoing.progress < 1, 500);
        compare(old.settings.showText, true);
        tryCompare(stage, 'layerCount', 1, 1000);
        tryVerify(() => stage.transitionBytes === 0, 1000, 'rest owns no transition texture');
    }
    function test_waitingRapidReplacementKeepsTheOnScreenSource() {
        const stage = probeStage(), old = stage.renderer;
        stage.mode = 'tilt';
        stage.componentPath = fixturePath('tilt', true);
        tryVerify(() => stage.renderer && stage.renderer !== old, 5000);
        const waiting = stage.renderer;
        compare(stage.transitionWaits, true);
        stage.mode = 'partita';
        stage.componentPath = fixturePath('partita', true);
        tryVerify(() => stage.loadedMode === 'partita' && stage.renderer !== waiting, 5000);
        compare(stage.layerCount, 2);
        verify(stage.actors.some(actor => actor.renderer === old));
        stage.mode = 'classic';
        stage.componentPath = fixturePath('classic', false);
        tryVerify(() => stage.renderer === old, 1000);
        compare(stage.layerCount, 1);
        compare(stage.transitionWaits, false);
    }
    function test_midEnterReturnReusesOldActorAndLeavesFromCurrentProgress() {
        const stage = probeStage(), old = stage.renderer;
        stage.mode = 'tilt';
        stage.componentPath = fixturePath('tilt', false);
        tryVerify(() => stage.renderer && stage.renderer !== old, 5000);
        tryVerify(() => !stage.transitionWaits, 1000);
        wait(180);
        const incoming = stage.actors.find(actor => actor.renderer === stage.renderer);
        // Freeze this actual partial enter before the deferred selection turn;
        // otherwise a busy render thread may advance it between two readings.
        const entering = findChild(incoming, 'foliaStyleEnter');
        verify(entering);
        entering.pause();
        const from = incoming.progress;
        verify(from > 0 && from < 1, 'capture partial source enter progress');
        stage.mode = 'classic';
        stage.componentPath = fixturePath('classic', false);
        tryVerify(() => stage.renderer === old, 1000);
        verify(incoming.layerState.leaving);
        verify(incoming.progress <= from + .02, 'leave does not reset the incoming layer to full opacity');
        tryCompare(stage, 'layerCount', 1, 1000);
    }
    function test_firstFrameLimitStartsTransitionWithoutInventingReadiness() {
        const stage = probeStage();
        stage.mode = 'tilt';
        stage.componentPath = fixturePath('tilt', true);
        tryVerify(() => stage.loadedMode === 'tilt', 5000);
        compare(stage.transitionWaits, true);
        const incoming = stage.actors.find(actor => actor.renderer === stage.renderer);
        wait(300);
        compare(stage.transitionWaits, true);
        compare(stage.renderer.renderReady, false);
        tryVerify(() => !stage.transitionWaits, 1600);
        compare(stage.renderer.renderReady, false);
        compare(incoming.hasFrame, false);
        compare(incoming.timedOut, true);
        tryCompare(stage, 'layerCount', 1, 1000);
    }
    function test_disablingMotionCutsWaitingStateAndRetirementDropsAllTimers() {
        const stage = probeStage();
        stage.mode = 'tilt';
        stage.componentPath = fixturePath('tilt', true);
        tryVerify(() => stage.loadedMode === 'tilt', 5000);
        compare(stage.transitionWaits, true);
        stage.motionEnabled = false;
        tryCompare(stage, 'layerCount', 1, 1000);
        compare(stage.transitionWaits, false);
        compare(stage.actors[0].progress, 1);
        compare(stage.transitionBytes, 0);
        stage.visible = false;
        compare(stage.layerCount, 0);
        compare(stage.transitionWaits, false);
    }
    function test_softFocusWaitReallyPreservesOldRgbAndShowsNewRgb() {
        const stage = probeStage();
        stage.mode = 'tilt';
        stage.componentPath = fixturePath('tilt', true);
        tryVerify(() => stage.loadedMode === 'tilt', 5000);
        compare(stage.transitionWaits, true);
        wait(80);
        const before = grabImage(stage), x = Math.floor(before.width / 2), y = Math.floor(before.height / 2);
        verify(Math.abs(before.red(x, y) - 64) <= 2 && Math.abs(before.green(x, y) - 128) <= 2 && Math.abs(before.blue(x, y) - 192) <= 2, 'incoming progress0 keeps old real RGB');
        stage.renderer.releaseFirstFrame();
        tryVerify(() => !stage.transitionWaits, 1000);
        verify(!stage.actors.find(actor => actor.renderer === stage.renderer).timedOut);
        tryCompare(stage, 'layerCount', 1, 1000);
        tryVerify(() => stage.transitionBytes === 0, 1000);
        const after = grabImage(stage), cx = Math.floor(after.width / 2), cy = Math.floor(after.height / 2);
        verify(Math.abs(after.red(cx, cy) - 192) <= 2 && Math.abs(after.green(cx, cy) - 64) <= 2 && Math.abs(after.blue(cx, cy) - 96) <= 2, 'rest returns to original ungrouped renderer RGB');
    }
}
