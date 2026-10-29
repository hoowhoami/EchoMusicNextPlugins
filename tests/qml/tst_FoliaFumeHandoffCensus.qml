// Real 80-row PCM A/B queue, shared Fume actor, original deadlines and native resource ledger.
import QtQuick
import QtQuick.Window
import QtTest
import EchoMusic.PluginSdk
import "../../plugins/folia-lyrics-skin/qml/shared" as Shared

Item {
    id: root
    width: 1100
    height: 820
    property var scene: null
    property var operation: null
    property var originalRenderer: null
    property var firstArticle: null
    property var frozen: null
    property string firstRevision: ""
    property string firstRows: ""
    property string phase: "startup"
    property string failure: ""
    property bool done: false
    property real nativeBaseline: 0
    property real phaseStart: 0
    property int swaps: 0
    property int swapMark: 0
    property bool sampledPair: false
    property bool forceSeen: false
    property bool loadingSeen: false
    property bool nativeStageStarted: false
    property real observedAggregatePeak: 0
    property real observedExtrasPeak: 0
    property var records: []
    function snapshotRows(model) {
        if (!model)
            return "";
        const rows = [];
        for (let i = 0; i < model.rowCount(); ++i)
            rows.push(model.row(i));
        return JSON.stringify(rows);
    }
    function sourceState(label) {
        if (!scene || !originalRenderer)
            return;
        const r = originalRenderer, p = foliaTestHandoffFixture.page.player, h = checks.findChild(scene, "foliaSongHandoff");
        console.info("FUME_HANDOFF_SOURCE_STATE", JSON.stringify({
            label,
            phase,
            monotonic: now(),
            firstRevision,
            rendererRevision: r.trackRevision,
            playerRevision: p.revision,
            outgoingLyricRevision: h && h.projection ? h.projection.outgoing.lyricRevision : null,
            incomingLyricRevision: h && h.projection ? h.projection.incoming.lyricRevision : null,
            holding: scene.holdingOutgoing,
            lyricCount: r.lyricCount,
            modelRows: r.lyricSource ? r.lyricSource.rowCount() : 0,
            sourceEqualsCurrent: r.lyricSource === p.lyrics,
            sourceEqualsOutgoing: h && h.projection ? r.lyricSource === h.projection.outgoing.lyrics : false,
            identicalRows: snapshotRows(r.lyricSource) === firstRows,
            articleBlocks: r.article ? r.article.blocks.length : null,
            busy: r.busy,
            layoutRevision: r.layoutRevision,
            renderReady: r.renderReady,
            renderers: r.renderers.length,
            hasFrame: scene.stage.actors[0] ? scene.stage.actors[0].hasFrame : null
        }));
    }
    function now() {
        return foliaTestNativeProbe.monotonicMs();
    }
    function require(value, message) {
        if (!value)
            throw Error(message);
    }
    function glyphs(renderer) {
        return renderer && renderer.renderers ? renderer.renderers : [];
    }
    function census(label) {
        const stage = scene ? scene.stage : null, shared = {}, actors = [];
        let exclusive = 0, extras = stage ? stage.transitionBytes : 0;
        if (stage)
            for (const actor of stage.actors) {
                const renderer = actor.renderer;
                if (renderer && actor.modeKey === "fume")
                    extras += renderer.decorTextureBytes;
                else if (renderer && "totalCacheBytes" in renderer)
                    extras += renderer.totalCacheBytes;
                const groups = glyphs(renderer).map(g => {
                    if (actor.modeKey === "fume") {
                        exclusive += g.cacheBytes + g.gpuCacheBytes;
                        if (g.sharedCacheKey)
                            shared[g.sharedCacheKey] = Math.max(shared[g.sharedCacheKey] || 0, g.sharedCacheBytes);
                    }
                    return {
                        runs: g.runs.length,
                        metrics: g.metrics.length,
                        ready: g.ready,
                        preparing: g.preparing,
                        error: g.errorString,
                        cacheBytes: g.cacheBytes,
                        gpuCacheBytes: g.gpuCacheBytes,
                        sharedCacheKey: g.sharedCacheKey,
                        sharedCacheBytes: g.sharedCacheBytes,
                        renderBatches: g.renderBatches,
                        uploads: g.textureUploads
                    };
                });
                actors.push({
                    mode: actor.modeKey,
                    hasFrame: actor.hasFrame,
                    timedOut: actor.timedOut,
                    leaving: actor.leaving,
                    progress: actor.progress,
                    transitionBytes: actor.transitionBytes,
                    ready: renderer ? renderer.renderReady : false,
                    error: actor.errorString,
                    articleBlocks: renderer && renderer.article ? renderer.article.blocks.length : 0,
                    groups
                });
            }
        const memory = foliaTestNativeProbe.memory(), dedup = Object.values(shared).reduce((a, b) => a + b, 0), aggregate = memory.nativeGlyphBytes + extras;
        observedAggregatePeak = Math.max(observedAggregatePeak, aggregate);
        observedExtrasPeak = Math.max(observedExtrasPeak, extras);
        const data = {
            label,
            phase,
            elapsed: now() - phaseStart,
            swaps,
            dpr: captureWindow.screen.devicePixelRatio,
            windowWidth: captureWindow.width,
            windowHeight: captureWindow.height,
            actors,
            nativeMemory: memory,
            fumeExclusive: exclusive,
            fumeSharedDedup: dedup,
            extras,
            aggregate,
            observedAggregatePeak,
            observedExtrasPeak
        };
        if (label)
            console.info("FUME_HANDOFF_CENSUS", JSON.stringify(data));
        return data;
    }
    function readback(label, requireBright = true) {
        const image = checks.grabImage(scene), dpr = captureWindow.screen.devicePixelRatio;
        require(image.width === Math.round(1100 * dpr) && image.height === Math.round(820 * dpr), "Real dual-stage readback extent is " + image.width + "x" + image.height);
        let nonblack = 0;
        for (let y = 10; y < image.height - 10; y += 11)
            for (let x = 10; x < image.width - 10; x += 13)
                if (image.red(x, y) + image.green(x, y) + image.blue(x, y) > 96)
                    nonblack++;
        const path = foliaTestCaptureDir + "/fume-handoff-" + label + "-dpr" + dpr + ".png";
        // QuickTest's image.save() returns void. The external readback verifier
        // checks this run's fresh directory, complete PNG CRC/decode and pixels.
        image.save(path);
        if (requireBright)
            require(nonblack > 20, "Actual native dual-stage readback has no bright content");
        console.info("FUME_HANDOFF_READBACK", JSON.stringify({
            label,
            path,
            requireBright,
            width: image.width,
            height: image.height,
            nonblack,
            swaps
        }));
    }
    function finish(message) {
        if (phase === "retiring" || done)
            return;
        if (message) {
            const player = foliaTestHandoffFixture.page.player, t = player.transition;
            console.info("FUME_HANDOFF_FAILURE_STATE", JSON.stringify({
                phase,
                observed: foliaTestHandoffFixture.observed,
                playing: player.playing,
                position: player.positionMs,
                nativePosition: player.nativePositionMs,
                transition: {
                    valid: t.valid,
                    phase: t.phase,
                    handedOver: t.handedOver,
                    cueReady: t.cueReady,
                    cueElapsedMs: t.cueElapsedMs,
                    cueDurationMs: t.cueDurationMs,
                    outgoingPositionMs: t.outgoingPositionMs,
                    incomingPositionMs: t.incomingPositionMs
                },
                holding: scene ? scene.holdingOutgoing : false
            }));
            failure = phase + ": " + message;
        }
        census(message ? "failure" : "complete");
        if (scene)
            scene.live = false;
        phase = "retiring";
        phaseStart = now();
        deadline.interval = 15000;
        deadline.restart();
    }
    function enterMode(mode) {
        phase = mode + "-enter";
        phaseStart = now();
        swapMark = swaps;
        sampledPair = false;
        forceSeen = false;
        loadingSeen = false;
        nativeStageStarted = false;
        scene.settings = {
            mode,
            showText: true
        };
        // Production owns the unchanged1500ms soft-focus limit. Article/native
        // preparation uses the original whole-article60s/30s deadlines.
        deadline.interval = 60000;
        deadline.restart();
    }
    function check() {
        if (done || phase === "shutdown")
            return;
        try {
            if (phase === "retiring") {
                if (foliaTestNativeProbe.memory().nativeGlyphBytes !== nativeBaseline)
                    return;
                require(!scene || scene.stage.layerCount === 0, "Hidden actual stage retained actors");
                console.info("FUME_HANDOFF_RETIRED", JSON.stringify({
                    failure,
                    memory: foliaTestNativeProbe.memory(),
                    observedAggregatePeak,
                    observedExtrasPeak,
                    records
                }));
                deadline.stop();
                tick.stop();
                if (scene) {
                    scene.destroy();
                    scene = null;
                }
                phase = "shutdown";
                teardown.start();
                return;
            }
            if (phase === "startup") {
                require(foliaTestHandoffFixture.available, "Actual handoff fixture was not enabled");
                const page = foliaTestHandoffFixture.page;
                if (!page || !page.player.playing || page.player.loading || page.player.lyricsInfo.count !== 80)
                    return;
                operation = page.player.pause();
                phase = "pause";
                return;
            }
            if (phase === "pause") {
                require(operation.state !== EchoPluginOperation.Failed, operation.errorMessage);
                if (operation.state !== EchoPluginOperation.Succeeded || foliaTestHandoffFixture.page.player.playing)
                    return;
                operation = foliaTestHandoffFixture.page.player.seek(12000);
                phase = "seek";
                return;
            }
            if (phase === "seek") {
                require(operation.state !== EchoPluginOperation.Failed, operation.errorMessage);
                if (operation.state !== EchoPluginOperation.Succeeded)
                    return;
                scene = factory.createObject(captureWindow.contentItem);
                require(scene !== null, "Cannot create real DynamicPresentation");
                phase = "fume-layout";
                phaseStart = now();
                deadline.interval = 60000;
                deadline.restart();
                return;
            }
            const data = census("");
            require(data.aggregate <= 134217728, "Full simultaneous native+decor+other-style+transition resources exceed 128MiB: " + data.aggregate);
            require(!scene.errorString, scene.errorString);
            if (phase === "fume-layout" || phase === "fume-native") {
                if (!scene.stage.renderer)
                    return;
                const renderer = scene.stage.renderer;
                if (phase === "fume-layout" && renderer.article) {
                    phase = "fume-native";
                    deadline.interval = 30000;
                    deadline.restart();
                }
                if (!renderer.renderReady || !scene.stage.actors[0].hasFrame)
                    return;
                require(renderer.article.blocks.length === 80, "Actual complete 80-row article was truncated");
                require(swaps > 0, "No native frame swap");
                readback("initial-fume");
                records.push(census("initial-fume-ready"));
                originalRenderer = renderer;
                firstArticle = renderer.article;
                firstRevision = renderer.trackRevision;
                firstRows = snapshotRows(renderer.lyricSource);
                sourceState("initial");
                operation = foliaTestHandoffFixture.page.player.seek(34000);
                phase = "seek-tail";
                phaseStart = now();
                deadline.interval = 10000;
                deadline.restart();
                return;
            }
            const player = foliaTestHandoffFixture.page.player;
            if (phase === "seek-tail") {
                require(operation.state !== EchoPluginOperation.Failed, operation.errorMessage);
                if (operation.state !== EchoPluginOperation.Succeeded)
                    return;
                operation = player.play();
                phase = "handoff-wait";
                return;
            }
            if (phase === "handoff-wait") {
                require(operation.state !== EchoPluginOperation.Failed, operation.errorMessage);
                if (!player.transition.valid || !player.transition.handedOver || player.transition.cueElapsedMs <= 100)
                    return;
                operation = player.pause();
                phase = "handoff-pause";
                return;
            }
            if (phase === "handoff-pause") {
                require(operation.state !== EchoPluginOperation.Failed, operation.errorMessage);
                if (operation.state !== EchoPluginOperation.Succeeded || player.playing)
                    return;
                const h = checks.findChild(scene, "foliaSongHandoff");
                sourceState("paused-handoff");
                readback("paused-handoff-diagnostic", false);
                require(h !== null && h.holding && !h.active && scene.holdingOutgoing, "Actual held Fume paired-clock handoff missing");
                require(scene.stage.layerCount === 1 && scene.stage.renderer === originalRenderer, "Same Fume A/B should reuse its real renderer");
                require(originalRenderer.article === firstArticle, "Identical outgoing snapshot replaced its accepted article");
                require(h.projection.outgoing.lyrics.rowCount() === 80 && h.projection.incoming.lyrics.rowCount() === 80, "Actual outgoing/incoming parser models lost rows");
                require(scene.stage.songTitle === "Outgoing-A" && originalRenderer.lyricSource === h.projection.outgoing.lyrics && originalRenderer.article.blocks.length === 80, "Handoff did not hold the real complete outgoing article: " + JSON.stringify({
                    title: originalRenderer.songTitle,
                    blocks: originalRenderer.article ? originalRenderer.article.blocks.length : null,
                    stageTitle: scene.stage.songTitle,
                    outgoingTitle: h.projection.outgoing.title,
                    held: scene.holdingOutgoing
                }));
                frozen = {
                    progress: h.paired.progress,
                    outgoing: h.outgoingTime,
                    incoming: h.incomingTime
                };
                console.info("FUME_HANDOFF_PAIRED_CLOCK", JSON.stringify(frozen));
                records.push(census("actual-paused-A-B"));
                phase = "hold-paused";
                phaseStart = now();
                return;
            }
            if (phase === "hold-paused") {
                if (now() - phaseStart < 150)
                    return;
                const h = checks.findChild(scene, "foliaSongHandoff");
                require(h && h.paired.progress === frozen.progress && h.outgoingTime === frozen.outgoing && h.incomingTime === frozen.incoming, "Real paused paired clock advanced");
                require(scene.stage.renderer === originalRenderer, "Held Fume actor identity changed");
                readback("actual-held-A");
                operation = player.play();
                phase = "complete-handoff";
                deadline.interval = 5000;
                deadline.restart();
                return;
            }
            if (phase === "complete-handoff") {
                require(operation.state !== EchoPluginOperation.Failed, operation.errorMessage);
                if (player.transition.phase !== "completed" || scene.holdingOutgoing)
                    return;
                firstArticle = null;
                operation = player.pause();
                phase = "pause-B";
                return;
            }
            if (phase === "pause-B") {
                require(operation.state !== EchoPluginOperation.Failed, operation.errorMessage);
                if (operation.state !== EchoPluginOperation.Succeeded || player.playing)
                    return;
                phase = "B-layout";
                phaseStart = now();
                nativeStageStarted = false;
                deadline.interval = 60000;
                deadline.restart();
                return;
            }
            if (phase === "B-layout") {
                require(scene.stage.layerCount === 1 && scene.stage.renderer === originalRenderer, "Completed Fume A/B replaced its renderer");
                const r = scene.stage.renderer;
                if (!r.article || r.trackRevision === firstRevision || JSON.stringify(r.article.blocks[0]).indexOf("Incoming-B") < 0)
                    return;
                if (!nativeStageStarted) {
                    nativeStageStarted = true;
                    deadline.interval = 30000;
                    deadline.restart();
                }
                if (!r.renderReady || !r.renderers.some(g => g.renderBatches > 0))
                    return;
                require(r.article.blocks.length === 80 && r.lyricCount === 80 && scene.stage.songTitle === "Incoming-B" && r.lyricSource === player.lyrics, "Complete real incoming article missing");
                readback("actual-completed-B");
                records.push(census("actual-B-content-ready"));
                finish("");
                return;
            }
        } catch (error) {
            finish(String(error.message || error));
        }
    }
    Connections {
        target: root.originalRenderer
        function onArticleChanged() {
            root.sourceState("article-changed");
        }
        function onLyricSourceChanged() {
            root.sourceState("model-changed");
        }
        function onTrackRevisionChanged() {
            root.sourceState("revision-changed");
        }
        function onLyricCountChanged() {
            root.sourceState("count-changed");
        }
    }
    Window {
        id: captureWindow
        width: 1100
        height: 820
        minimumWidth: 1100
        maximumWidth: 1100
        minimumHeight: 820
        maximumHeight: 820
        visible: foliaTestHandoffFixture.available
        color: "black"
    }
    Component {
        id: factory
        Shared.DynamicPresentation {
            width: 1100
            height: 820
            plugin: foliaTestHandoffFixture.plugin
            page: foliaTestHandoffFixture.page
            settings: ({
                    mode: "fume",
                    showText: true
                })
            appearance: ({
                    text: "#f5f5f5",
                    secondaryText: "#aaaaaa",
                    accent: "#8fb7ff",
                    main: "#111111",
                    dark: true,
                    themeMetadata: {
                        title: "Actual Fume dual census",
                        description: "80 native PCM lyrics"
                    }
                })
            baseFont: Qt.font({
                family: "PingFang SC",
                pixelSize: 24
            })
            subtitleFont: Qt.font({
                family: "PingFang SC",
                pixelSize: 20
            })
            componentPath: "styles/" + settings.mode + "/" + settings.mode.charAt(0).toUpperCase() + settings.mode.slice(1) + ".qml"
            live: true
        }
    }
    Connections {
        target: captureWindow
        function onFrameSwapped() {
            root.swaps++;
        }
    }
    Timer {
        id: teardown
        interval: 50
        onTriggered: {
            foliaTestHandoffFixture.enabled = false;
            root.done = true;
        }
    }
    Timer {
        id: tick
        interval: 4
        repeat: true
        onTriggered: root.check()
    }
    Timer {
        id: deadline
        interval: 12000
        onTriggered: {
            if (root.phase === "retiring") {
                root.failure += " / true native drain timeout";
                root.done = true;
                tick.stop();
            } else
                root.finish("Original phase deadline exceeded");
        }
    }
    Component.onCompleted: {
        if (!foliaTestHandoffFixture.available) {
            phase = "skipped";
            done = true;
            return;
        }
        nativeBaseline = foliaTestNativeProbe.memory().nativeGlyphBytes;
        phaseStart = now();
        foliaTestHandoffFixture.enabled = true;
        deadline.start();
        tick.start();
    }
    Component.onDestruction: {
        tick.stop();
        deadline.stop();
        if (scene)
            scene.live = false;
        foliaTestHandoffFixture.enabled = false;
    }
    TestCase {
        id: checks
        name: "FoliaActualFumeHandoffCensus"
        when: root.done && windowShown
        function initTestCase() {
            if (!foliaTestHandoffFixture.available)
                skip("Run this real 80-row PCM suite in its own process with FOLIA_HANDOFF_ONLY=1");
        }
        function test_originalFirstFrameAndFullSceneBudget() {
            compare(root.failure, "");
            verify(root.records.length >= 3);
            compare(foliaTestNativeProbe.memory().nativeGlyphBytes, root.nativeBaseline);
        }
    }
}
