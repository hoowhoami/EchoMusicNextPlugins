import QtQuick
import QtTest
import EchoMusic.PluginSdk
import "../../plugins/folia-lyrics-skin/qml/shared" as Shared
import "../../plugins/folia-lyrics-skin/qml/backgrounds" as Backgrounds
import "../../plugins/folia-lyrics-skin/qml/backgrounds/latent" as Palette

TestCase {
    id: testCase
    name: "FoliaNativeHandoff"
    when: windowShown
    visible: true
    width: 720
    height: 480
    property var scene: null
    function initTestCase() {
        if (!foliaTestHandoffFixture.available)
            skip("Run this real queue suite in its own process with FOLIA_HANDOFF_ONLY=1; Rust owns one audio engine per process.");
    }
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|Binding loop|invalid context|ShaderEffect.*(Error|null)|is not a function/);
        foliaTestHandoffFixture.enabled = true;
        tryVerify(() => foliaTestHandoffFixture.page !== null, 10000);
        const player = foliaTestHandoffFixture.page.player;
        tryVerify(() => player.playing && !player.loading && player.lyricsInfo.count === 80, 12000, foliaTestHandoffFixture.errorMessage + " / " + foliaTestHandoffFixture.engineError);
        if (!player.playing || player.loading || player.lyricsInfo.count !== 80)
            console.log("Actual startup", foliaTestHandoffFixture.observed, foliaTestHandoffFixture.errorMessage, foliaTestHandoffFixture.engineError);
    }
    function cleanup() {
        if (scene) {
            scene.live = false;
            scene.destroy();
            scene = null;
            wait(20);
        }
        foliaTestHandoffFixture.enabled = false;
        wait(50);
    }
    function command(operation: var): void {
        verify(operation !== null);
        tryCompare(operation, "state", EchoPluginOperation.Succeeded, 3000, operation.errorMessage);
    }
    function test_firstActualEmbeddedBAddressIsAuthorizedWithinTheEpochAndRetiresOnSeek() {
        const page = foliaTestHandoffFixture.page, player = page.player;
        compare(String(foliaTestHandoffFixture.originalBcover), "");
        command(player.seek(34000));
        try {
            tryVerify(() => player.transition.valid && player.transition.phase === "queued", 10000);
        } finally {
            if (!(player.transition.valid && player.transition.phase === "queued"))
                console.info("Native queued cue diagnostics", JSON.stringify({valid: player.transition.valid, phase: player.transition.phase, progress: player.transition.progress, positionMs: player.positionMs, title: player.title, playing: player.playing, loading: player.loading, observed: foliaTestHandoffFixture.observed}));
        }
        const epoch = player.transition.epoch;
        compare(player.transition.outgoing.id, "Outgoing-A");
        compare(player.transition.incoming.id, "Incoming-B");
        const outgoingCover = String(player.transition.outgoing.coverUrl);
        command(foliaTestHandoffFixture.plugin.assets.sampleImage(outgoingCover, 16, 16));
        tryVerify(() => player.transition.handedOver && String(player.coverUrl) !== "", 6000);
        const source = String(player.transition.incoming.coverUrl);
        verify(source !== "");
        compare(player.transition.epoch, epoch);
        verify(player.transition.valid);
        const after = foliaTestHandoffFixture.plugin.assets.sampleImage(source, 16, 16);
        command(after);
        verify(after.result.pixels.length > 0);
        command(player.seek(4000));
        compare(player.transition.valid, false);
        const retired = foliaTestHandoffFixture.plugin.assets.sampleImage(outgoingCover, 16, 16);
        compare(retired.state, EchoPluginOperation.Failed);
        compare(retired.errorCode, "SourceDenied");
        const assets = foliaTestHandoffFixture.plugin.assets;
        command(assets.sampleImage(source, 16, 16)); // B remains the current cover after a seek.
        foliaTestHandoffFixture.presented = false;
        compare(player.transition.outgoing.id, "");
        compare(player.transition.incoming.songId, "");
        const closed = assets.sampleImage(source, 16, 16);
        compare(closed.state, EchoPluginOperation.Failed);
        compare(closed.errorCode, "ScopeClosed");
    }
    Component {
        id: sceneComponent
        Item {
            id: view
            width: 1100
            height: 720
            scale: 700 / 1100
            transformOrigin: Item.TopLeft
            property bool live: true
            readonly property alias dynamic: dynamic
            readonly property alias background: backdrop
            readonly property alias palette: coverPalette
            property var settings: ({
                    mode: "monet",
                    backgroundMode: "monet",
                    showText: true
                })
            property var appearance: ({
                    text: "#f5f5f5",
                    secondaryText: "#aaaaaa",
                    accent: "#8fb7ff",
                    main: "#111111",
                    dark: true,
                    themeMetadata: {
                        title: "Actual native handoff",
                        description: "Authored PCM and embedded lyrics"
                    }
                })
            Palette.CoverPalette {
                id: coverPalette
                plugin: foliaTestHandoffFixture.plugin
                source: dynamic.shownCoverUrl
                trackRevision: dynamic.stage.trackRevision
                live: view.live
            }
            Backgrounds.BackgroundPresentation {
                graphics: foliaTestHandoffFixture.plugin.graphics
                id: backdrop
                z: 0
                anchors.fill: parent
                live: view.live
                settings: view.settings
                assetsService: foliaTestHandoffFixture.plugin.assets
                songHandoff: dynamic.songHandoff
                coverUrl: dynamic.shownCoverUrl
                coverColors: dynamic.backgroundCoverColors
                seed: dynamic.backgroundSeed
                styleWaits: dynamic.transitionWaits
            }
            Shared.DynamicPresentation {
                id: dynamic
                z: 1
                anchors.fill: parent
                plugin: foliaTestHandoffFixture.plugin
                page: foliaTestHandoffFixture.page
                settings: view.settings
                appearance: view.appearance
                coverColors: coverPalette.colors
                coverPaletteSnapshot: coverPalette.snapshot
                baseFont: Qt.font({
                    family: "Arial",
                    pixelSize: 24
                })
                subtitleFont: Qt.font({
                    family: "Arial",
                    pixelSize: 20
                })
                componentPath: view.settings.mode === "still" ? "styles/still/StillPresentation.qml" : "styles/" + view.settings.mode + "/" + view.settings.mode.charAt(0).toUpperCase() + view.settings.mode.slice(1) + ".qml"
                backdropSources: [backdrop]
                live: view.live
            }
        }
    }
    function test_actualPairedClockDrivesMonetWordsPortraitBackgroundAndRetiresAfterCompletion() {
        const page = foliaTestHandoffFixture.page, player = page.player;
        command(player.pause());
        tryCompare(player, "playing", false);
        scene = createTemporaryObject(sceneComponent, testCase);
        verify(scene !== null);
        tryVerify(() => scene.dynamic.stage.renderer && scene.dynamic.stage.renderer.renderReady, 15000);
        compare(scene.dynamic.errorString, "");
        let monet = scene.dynamic.stage.renderer;
        compare(monet.songTitle, "Outgoing-A");
        tryVerify(() => monet.renderers.some(renderer => renderer.renderBatches > 0), 5000);
        command(player.seek(34000));
        command(player.play());
        tryVerify(() => player.transition.valid && player.transition.handedOver && player.transition.cueElapsedMs > 100, 10000);
        command(player.pause());
        tryCompare(player, "playing", false);
        wait(150);
        const handoff = scene.dynamic.songHandoff;
        verify(handoff !== null);
        verify(handoff.progress < .5);
        compare(monet.songTitle, "Outgoing-A");
        compare(handoff.projection.outgoing.lyrics.rowCount(), 80);
        tryVerify(() => handoff.projection.incoming.lyrics.rowCount() === 80, 5000);
        verify(handoff.outgoingTime > 36 && handoff.incomingTime >= 0 && handoff.incomingTime < 2);
        const frozen = handoff.progress, frozenA = handoff.outgoingTime, frozenB = handoff.incomingTime;
        const frozenNative = JSON.stringify({
            cue: handoff.projection.cueElapsedMs,
            a: handoff.projection.outgoingPositionMs,
            b: handoff.projection.incomingPositionMs,
            clock: scene.dynamic.presentationTimeSeconds,
            player: player.positionMs,
            playing: player.playing
        });
        wait(150);
        if (handoff.progress !== frozen || handoff.outgoingTime !== frozenA || handoff.incomingTime !== frozenB)
            console.log("Paused paired anchors", frozenNative, "->", JSON.stringify({
                cue: handoff.projection.cueElapsedMs,
                a: handoff.projection.outgoingPositionMs,
                b: handoff.projection.incomingPositionMs,
                clock: scene.dynamic.presentationTimeSeconds,
                player: player.positionMs,
                playing: player.playing
            }));
        compare(handoff.progress, frozen);
        compare(handoff.outgoingTime, frozenA);
        compare(handoff.incomingTime, frozenB);
        verify(scene.background.layerCount <= 2);
        compare(scene.background.errorString, "");
        const aFrame = grabImage(scene);
        command(player.play());
        tryVerify(() => scene.dynamic.songHandoff && scene.dynamic.songHandoff.progress > .55, 5000);
        command(player.pause());
        tryCompare(player, "playing", false);
        tryCompare(monet, "songTitle", "Incoming-B");
        tryVerify(() => monet.preparedLines.some(prepared => prepared && prepared.line.fullText.indexOf("Incoming-B") >= 0), 5000);
        compare(scene.dynamic.errorString, "");
        command(player.play());
        tryCompare(player.transition, "phase", "completed", 5000);
        tryCompare(scene.dynamic, "songHandoff", null, 2000);
        tryCompare(scene.background, "layerCount", 1, 2500);
        tryCompare(scene.background, "transitionBytes", 0, 2000);
        wait(1200);
        compare(monet.songTitle, "Incoming-B");
        verify(monet.renderers.some(renderer => renderer.renderBatches > 0));
        const bFrame = grabImage(scene);
        let changed = 0;
        for (let y = 30; y < Math.min(aFrame.height, bFrame.height) - 20; y += 13)
            for (let x = 20; x < Math.min(aFrame.width, bFrame.width) - 20; x += 17)
                if (Math.abs(aFrame.red(x, y) - bFrame.red(x, y)) + Math.abs(aFrame.green(x, y) - bFrame.green(x, y)) + Math.abs(aFrame.blue(x, y) - bFrame.blue(x, y)) > 25)
                    ++changed;
        verify(changed > 100, "Real different A/B glyphs, native pictures and background must reach the screen");
        command(player.pause());
        tryCompare(player, "playing", false);
        command(player.seek(4000));
        compare(player.transition.valid, false);
        tryVerify(() => Math.abs(scene.dynamic.presentationTimeSeconds - 4) < .1, 1000);
        wait(100);
        compare(scene.dynamic.errorString, "");
    }
    function test_queuedCancellationRestoresActualAAndHiddenRetiresBothLayers() {
        const player = foliaTestHandoffFixture.page.player;
        command(player.pause());
        tryCompare(player, "playing", false);
        scene = createTemporaryObject(sceneComponent, testCase);
        verify(scene !== null);
        tryVerify(() => scene.dynamic.stage.renderer && scene.dynamic.stage.renderer.renderReady, 15000);
        tryVerify(() => scene.dynamic.stage.renderer.renderers.some(renderer => renderer.renderBatches > 0), 5000);
        const backgroundA = scene.background.renderer;
        verify(backgroundA !== null);
        command(player.seek(34000));
        command(player.play());
        try {
            tryVerify(() => player.transition.valid && player.transition.phase === "queued", 10000);
        } finally {
            if (!(player.transition.valid && player.transition.phase === "queued"))
                console.info("Native queued cue diagnostics", JSON.stringify({valid: player.transition.valid, phase: player.transition.phase, progress: player.transition.progress, positionMs: player.positionMs, title: player.title, playing: player.playing, loading: player.loading, observed: foliaTestHandoffFixture.observed}));
        }
        command(player.pause());
        tryCompare(player, "playing", false);
        verify(scene.dynamic.songHandoff !== null);
        compare(scene.dynamic.stage.renderer.songTitle, "Outgoing-A");
        compare(scene.dynamic.songHandoff.progress, 0);
        command(player.seek(12000));
        tryCompare(player.transition, "valid", false);
        tryCompare(scene.dynamic, "songHandoff", null);
        tryCompare(scene.background, "layerCount", 1, 2500);
        compare(scene.background.renderer, backgroundA);
        tryCompare(scene.background, "transitionBytes", 0);
        compare(scene.dynamic.stage.renderer.songTitle, "Outgoing-A");
        tryVerify(() => Math.abs(scene.dynamic.presentationTimeSeconds - 12) < .1, 1000);
        compare(scene.dynamic.errorString, "");
        compare(scene.background.errorString, "");
        scene.live = false;
        tryCompare(scene.dynamic.stage, "layerCount", 0);
        compare(scene.background.layerCount, 0);
        compare(scene.background.transitionBytes, 0);
        wait(100);
        compare(scene.background.layerCount, 0);
    }
    function test_allStylesReceiveActualHeldAAndLateMountUsesItsOwnSeed() {
        const player = foliaTestHandoffFixture.page.player;
        command(player.seek(34000));
        tryVerify(() => player.transition.valid && player.transition.handedOver && player.transition.cueElapsedMs > 100, 10000);
        command(player.pause());
        tryCompare(player, "playing", false);
        compare(player.title, "Incoming-B");
        scene = createTemporaryObject(sceneComponent, testCase);
        verify(scene !== null);
        scene.dynamic.motionEnabled = false; // Source cuts style changes; it still holds A until settle.
        const modes = ["classic", "sonnet", "tempera", "lumiere", "cadenza", "partita", "fume", "tilt", "claddagh", "monet", "pendolo", "cappella", "diorama", "still"];
        for (const mode of modes) {
            scene.settings = {
                mode,
                backgroundMode: "latent",
                showText: true
            };
            tryCompare(scene.dynamic.stage, "loadedMode", mode, 5000);
            const stage = scene.dynamic.stage, renderer = stage.renderer;
            verify(renderer !== null);
            compare(stage.lyricSource, player.transition.outgoing.lyrics, mode + ": genuine A read model");
            compare(stage.songTitle, "Outgoing-A");
            compare(stage.avatarSeed, "Outgoing-A");
            verify(stage.timeSeconds > 38 && stage.timeSeconds < 40);
            compare(stage.lyricCount, 80);
            tryVerify(() => stage.preparedLines.some(prepared => prepared && prepared.line.fullText.indexOf("Outgoing-A") >= 0), 5000);
            if ("lyricSource" in renderer)
                compare(renderer.lyricSource, player.transition.outgoing.lyrics);
            if ("songTitle" in renderer)
                compare(renderer.songTitle, "Outgoing-A");
            tryVerify(() => scene.palette.colorsSource === String(player.transition.outgoing.coverUrl) && scene.dynamic.shownCoverColors.length > 0, 5000);
            for (const color of scene.dynamic.shownCoverColors) {
                const rgb = Qt.color(color);
                verify(rgb.r > rgb.b && rgb.r > rgb.g, "A's actual red cover must not use B's blue palette");
            }
            compare(scene.dynamic.errorString, "");
        }
        scene.settings = {
            mode: "classic",
            backgroundMode: "latent",
            showText: true
        };
        command(player.play());
        tryCompare(player.transition, "phase", "completed", 5000);
        tryCompare(scene.dynamic, "holdingOutgoing", false);
        compare(scene.dynamic.stage.lyricSource, player.lyrics);
        compare(scene.dynamic.stage.songTitle, "Incoming-B");
        compare(scene.dynamic.stage.avatarSeed, "Incoming-B");
        tryVerify(() => scene.palette.colorsSource === String(player.coverUrl) && scene.dynamic.shownCoverColors.length > 0, 5000);
        for (const color of scene.dynamic.shownCoverColors) {
            const rgb = Qt.color(color);
            verify(rgb.b > rgb.r && rgb.b > rgb.g);
        }
        compare(scene.dynamic.errorString, "");
    }
}
