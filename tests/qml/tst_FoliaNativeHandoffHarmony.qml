// Dedicated actual PCM + embedded TTML. Run with both FOLIA_HANDOFF_ONLY=1
// and FOLIA_HANDOFF_TTML=1; ordinary shared fixtures never replace their rows.
import QtQuick
import QtTest
import EchoMusic.PluginSdk
import "../../plugins/folia-lyrics-skin/qml/shared" as Shared
import "../../plugins/folia-lyrics-skin/qml/shared/harmony" as Harmony

TestCase {
    id: testCase
    name: "FoliaNativeHandoffHarmony"
    when: windowShown
    visible: true
    width: 720
    height: 480
    property var view: null
    function initTestCase() {
        if (!foliaTestHandoffFixture.available)
            skip("Use the dedicated FOLIA_HANDOFF_ONLY=1 FOLIA_HANDOFF_TTML=1 actual audio process.");
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|Binding loop|invalid context|is not a function/);
        foliaTestHandoffFixture.enabled = true;
        tryVerify(() => foliaTestHandoffFixture.page !== null, 10000);
        tryVerify(() => foliaTestHandoffFixture.page.player.playing && !foliaTestHandoffFixture.page.player.loading && foliaTestHandoffFixture.page.player.lyricsInfo.count === 80, 12000);
        compare(foliaTestHandoffFixture.page.player.lyricsInfo.hasBackgroundVocals, true, "The actual embedded TTML must contain authored background voices");
    }
    function cleanupTestCase() {
        if (view) {
            view.live = false;
            view.destroy();
            view = null;
            wait(30);
        }
        foliaTestHandoffFixture.enabled = false;
        wait(50);
    }
    function command(operation: var): void {
        verify(operation !== null);
        tryCompare(operation, "state", EchoPluginOperation.Succeeded, 3000, operation.errorMessage);
    }
    Component {
        id: factory
        Item {
            id: scene
            width: 1100
            height: 720
            scale: 700 / 1100
            transformOrigin: Item.TopLeft
            property bool live: true
            readonly property alias dynamic: dynamic
            readonly property alias harmony: harmony
            readonly property alias overlay: overlay
            Shared.DynamicPresentation {
                id: dynamic
                anchors.fill: parent
                plugin: foliaTestHandoffFixture.plugin
                page: foliaTestHandoffFixture.page
                settings: ({
                        mode: "monet",
                        showText: true
                    })
                appearance: ({
                        text: "white",
                        secondaryText: "#aaa",
                        accent: "#80aaff",
                        main: "#111",
                        dark: true
                    })
                baseFont: Qt.font({
                    family: "Arial",
                    pixelSize: 24
                })
                subtitleFont: baseFont
                componentPath: "styles/monet/Monet.qml"
                live: scene.live
            }
            Harmony.HarmonyIndex {
                id: harmony
                page: foliaTestHandoffFixture.page
                transitionTrack: dynamic.heldOutgoingTrack
                timeSeconds: dynamic.heldOutgoingTimeSeconds
                live: scene.live
            }
            Shared.HarmonyOverlay {
                id: overlay
                anchors.fill: parent
                vocalIndex: harmony.index
                timeSeconds: harmony.timeSeconds
                settings: ({
                        showText: true,
                        showHarmonySubtitle: true,
                        subtitleFontScale: 1
                    })
                baseFont: dynamic.subtitleFont
                translationFont: baseFont
                textService: foliaTestHandoffFixture.plugin.text
                live: scene.live
                motionEnabled: false
            }
        }
    }
    function test_actualAWordVoicesKeepTheirOwnClockWhileMonetCrossesToBThenSettleTogether() {
        const player = foliaTestHandoffFixture.page.player;
        command(player.seek(34000));
        tryVerify(() => player.transition.valid && player.transition.handedOver && player.transition.cueElapsedMs > 100, 10000);
        command(player.pause());
        tryCompare(player, "playing", false);
        view = createTemporaryObject(factory, testCase);
        verify(view !== null);
        tryVerify(() => view.harmony.index && view.harmony.index.vocals.length === 80, 5000);
        compare(view.harmony.readSource, player.transition.outgoing.lyrics);
        verify(view.harmony.index.vocals.every(vocal => vocal.text.indexOf("Outgoing-A harmony") >= 0));
        verify(view.harmony.timeSeconds > 38 && view.harmony.timeSeconds < 40);
        tryVerify(() => view.overlay.activeCount > 0, 5000);
        tryVerify(() => view.overlay.actors.some(actor => actor.renderers.some(renderer => renderer.renderBatches > 0)), 5000);
        verify(view.overlay.snapshot.lines.every(line => line.vocal.text.indexOf("Outgoing-A harmony") >= 0));
        compare(view.harmony.errorString, "");
        compare(view.overlay.errorString, "");
        command(player.play());
        tryVerify(() => view.dynamic.songHandoff && view.dynamic.songHandoff.progress > .55, 5000);
        command(player.pause());
        tryCompare(player, "playing", false);
        compare(view.dynamic.stage.songTitle, "Incoming-B");
        compare(view.harmony.readSource, player.transition.outgoing.lyrics);
        verify(view.overlay.activeCount > 0);
        verify(view.overlay.snapshot.lines.every(line => line.vocal.text.indexOf("Outgoing-A harmony") >= 0));
        const frozen = view.harmony.timeSeconds;
        wait(200);
        compare(view.harmony.timeSeconds, frozen);
        command(player.play());
        tryCompare(player.transition, "phase", "completed", 5000);
        tryCompare(view.harmony, "transitionTrack", null);
        tryVerify(() => view.harmony.index && view.harmony.index.vocals.length === 80 && view.harmony.index.vocals.every(vocal => vocal.text.indexOf("Incoming-B harmony") >= 0), 5000);
        verify(view.harmony.timeSeconds < 5);
        compare(view.harmony.readSource, player.lyrics);
        compare(view.harmony.errorString, "");
        compare(view.overlay.errorString, "");
        view.live = false;
        compare(view.overlay.activeCount, 0);
        compare(view.harmony.index, null);
    }
}
