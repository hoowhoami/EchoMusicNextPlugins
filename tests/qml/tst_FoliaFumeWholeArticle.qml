// The two full preparations run in Qt's outer event loop. QtTest starts only
// after their real scenes, native caches, settings and retirement were checked.
import QtQuick
import QtQuick.Window
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/fume" as Fume

Item {
    id: root
    width: 1100
    height: 820
    property var view: null
    property int stage: 0
    property string phase: "idle"
    property bool done: false
    property string failure: ""
    property var results: []
    property var current: null
    property real startedMono: 0
    property real startedWall: 0
    property real sequenceMono: 0
    property real sequenceWall: 0

    function monotonicMs() {
        return foliaTestAssetFixture.monotonicMs();
    }
    function require(condition, message) {
        if (!condition)
            throw Error(message);
    }
    function rows(index) {
        return Array.from({
            length: 80
        }, (_, n) => {
            const text = index === 0 ? "山河依旧，光落在你的肩头 " + n + " — office ffi á" : "夜空中最亮的星 " + n + " across the sky 👩🏽‍🚀";
            return {
                text,
                start_ms: n * 4000,
                duration_ms: index === 0 ? 3500 : 3400,
                translation: index === 0 ? "Authored translation " + n + " in the moonlight" : "",
                words: index === 0 ? [] : [
                    {
                        text,
                        start_ms: n * 4000,
                        duration_ms: 3400
                    }
                ]
            };
        });
    }
    function fail(message) {
        failure = "stage " + stage + " / " + phase + ": " + message;
        finish();
    }
    function finish() {
        deadline.stop();
        evaluate.stop();
        settle.stop();
        next.stop();
        if (view) {
            view.live = false;
            view.destroy();
            view = null;
        }
        const end = monotonicMs(), wall = Date.now();
        console.info("FUME_WHOLE_ARTICLE_TIMING", JSON.stringify({
            clock: "QElapsedTimer",
            monotonicStartMs: sequenceMono,
            monotonicEndMs: end,
            elapsedMs: end - sequenceMono,
            wallStartMs: sequenceWall,
            wallEndMs: wall,
            wallElapsedMs: wall - sequenceWall,
            failure,
            scenes: results,
            note: "QtTest Totals starts after preparation; it excludes these recorded scene times"
        }));
        done = true;
    }
    function begin() {
        try {
            if (stage >= 2) {
                finish();
                return;
            }
            require(foliaTestLyricFixture.replaceRows(rows(stage)), "Actual lyric model rejected authored rows");
            require(foliaTestLyricFixture.count === 80, "Expected all 80 rows");
            startedMono = monotonicMs();
            startedWall = Date.now();
            current = null;
            phase = "preparation";
            view = factory.createObject(root, {
                lyricSource: foliaTestLyricSource,
                lyricCount: Qt.binding(() => foliaTestLyricFixture.count),
                textService: foliaTestTextService,
                trackRevision: "fixture",
                settings: {
                    fumeGlowIntensity: stage === 0 ? 1 : 0
                }
            });
            require(view !== null, "Cannot create the real Fume component");
            if (stage === 0)
                view.baseFont.family = "PingFang SC";
            deadline.interval = 60000;
            deadline.restart();
            evaluate.restart();
        } catch (error) {
            fail(String(error.message || error));
        }
    }
    function check() {
        if (!view || done)
            return;
        try {
            require(!view.errorString, view.errorString);
            if (!view.article)
                return;
            if (phase === "preparation") {
                phase = "native-render";
                deadline.interval = 30000;
                deadline.restart();
            }
            if (phase !== "native-render" || !view.renderReady || !view.renderers.some(glyph => glyph.renderBatches > 0))
                return;
            require(view.article.blocks.length === 80, "Whole article must retain every source block");
            require(view.article.columns > 1, "Expected the actual multi-column article");
            require(view.article.blocks.some(block => block.variant === "hero"), "Missing original hero layout");
            require(view.readBatches >= 2 && view.measurementBatches > 1, "Missing real ReadModel/native measurement batches");
            require(view.refinementRounds > 0 && view.refinementRounds <= 32, "Original refinement capacity changed");
            if (stage === 1 && Qt.platform.os === "osx")
                require(view.refinementRounds === 4, "Pinned Cocoa measurement must retain all four refinement rounds");
            require(view.rendererCount > 0 && view.rendererCount <= 32, "Invalid original group count");
            require(view.visibleBlockCount <= 80, "Visible block count exceeds the actual article");
            require(!view._budgetRejected, "Native cache budget rejected the complete scene");
            require(view.tuning.glowIntensity === (stage === 0 ? 1 : 0), "Source glow setting changed during preparation");
            require(view._actors.every(actor => actor.glowEnabled === (stage === 0)), "Default glow was disabled in a native group");
            require(view.totalCacheBytes > 0 && view.totalCacheBytes <= view.cacheBudgetBytes, "Native cache must stay inside the existing budget");
            require(view._actors.every(actor => !actor._prepareRejected && !actor.errorString && actor.commands.length <= 16 && actor.glyph.metrics.length === actor.commands.length), "A native group is incomplete or rejected");
            current = {
                stage,
                monotonicStartMs: startedMono,
                readyMonotonicMs: monotonicMs(),
                wallStartMs: startedWall,
                prepareAndRenderMs: monotonicMs() - startedMono,
                blocks: view.article.blocks.length,
                columns: view.article.columns,
                hero: true,
                reads: view.readBatches,
                nativeBatches: view.measurementBatches,
                rounds: view.refinementRounds,
                groups: view.rendererCount,
                groupRunLimit: view._groupRunLimit,
                glowIntensity: view.tuning.glowIntensity,
                groupRunCounts: view._actors.map(actor => actor.commands.length),
                groupCacheBytes: view.renderers.map(glyph => glyph.cacheBytes),
                cacheBytes: view.totalCacheBytes,
                peakCacheBytes: view.peakCacheBytes,
                budgetBytes: view.cacheBudgetBytes,
                layoutRevision: view.layoutRevision,
                nativeRenderBatches: view.renderers.map(glyph => glyph.renderBatches)
            };
            if (stage === 0) {
                phase = "default-seek";
                view.timeSeconds = 12;
            } else {
                phase = "full-hold";
            }
            settle.interval = 100;
            settle.restart();
        } catch (error) {
            fail(String(error.message || error));
        }
    }
    function afterSettle() {
        try {
            require(view !== null && !view.errorString, view ? view.errorString : "Scene unexpectedly retired");
            if (phase === "full-hold") {
                view.settings = {
                    fumeGlowIntensity: 0,
                    fumeTextHoldRatio: .4,
                    fumeCameraTrackingMode: "stepped",
                    wordColors: [
                        {
                            word: "星",
                            color: "#ff0000"
                        }
                    ]
                };
                phase = "full-settings";
                settle.interval = 30;
                settle.restart();
                return;
            }
            if (stage === 1) {
                require(view.layoutRevision === current.layoutRevision, "Paint settings rebuilt the article");
                require(view.measurementBatches === current.nativeBatches, "Paint settings repeated native measurements");
            }
            if (phase === "retirement") {
                require(view.rendererCount === 0 && view.totalCacheBytes === 0 && view.article === null, "Hidden native resources returned after retirement");
                current.retiredCacheBytes = view.totalCacheBytes;
                current.monotonicEndMs = monotonicMs();
                current.wallEndMs = Date.now();
                current.elapsedMs = current.monotonicEndMs - current.monotonicStartMs;
                results = results.concat([current]);
                console.info("FUME_WHOLE_ARTICLE_SCENE", JSON.stringify(current));
                view.destroy();
                view = null;
                deadline.stop();
                stage++;
                next.restart();
                return;
            }
            view.visible = false;
            view.live = false;
            require(view.rendererCount === 0 && view.totalCacheBytes === 0 && view.article === null, "Hidden scene retained native groups, cache or article");
            current.hiddenGroups = view.rendererCount;
            current.hiddenCacheBytes = view.totalCacheBytes;
            current.hiddenArticleNull = view.article === null;
            phase = "retirement";
            settle.interval = 100;
            settle.restart();
        } catch (error) {
            fail(String(error.message || error));
        }
    }
    Component {
        id: factory
        Fume.Fume {
            anchors.fill: parent
            preparedLines: []
            live: true
            baseFont.family: "Helvetica Neue"
            Rectangle {
                anchors.fill: parent
                color: "black"
                z: -100
            }
        }
    }
    Connections {
        target: root.view
        function onArticleChanged() {
            evaluate.restart();
        }
        function onRenderReadyChanged() {
            evaluate.restart();
        }
        function onErrorStringChanged() {
            evaluate.restart();
        }
    }
    Connections {
        target: root.Window.window
        function onFrameSwapped() {
            if (root.phase === "native-render")
                evaluate.restart();
        }
    }
    Timer {
        id: next
        interval: 0
        onTriggered: root.begin()
    }
    Timer {
        id: evaluate
        interval: 0
        onTriggered: root.check()
    }
    Timer {
        id: settle
        onTriggered: root.afterSettle()
    }
    Timer {
        id: deadline
        onTriggered: root.fail("Actual wall-clock deadline exceeded")
    }
    Component.onCompleted: {
        sequenceMono = monotonicMs();
        sequenceWall = Date.now();
        next.start();
    }
    Component.onDestruction: {
        next.stop();
        evaluate.stop();
        settle.stop();
        deadline.stop();
    }
    TestCase {
        name: "FoliaFumeWholeArticle"
        when: root.done && windowShown
        function test_defaultGlowThenFullArticleWithActualEventLoop() {
            compare(root.failure, "");
            compare(root.results.length, 2);
            for (const scene of root.results) {
                compare(scene.blocks, 80);
                verify(scene.hero && scene.columns > 1);
                verify(scene.reads >= 2 && scene.nativeBatches > 1);
                verify(scene.rounds > 0 && scene.rounds <= 32);
                verify(scene.groups > 0 && scene.groups <= 32);
                verify(scene.cacheBytes > 0 && scene.cacheBytes <= scene.budgetBytes);
                compare(scene.hiddenGroups, 0);
                compare(scene.hiddenCacheBytes, 0);
                compare(scene.retiredCacheBytes, 0);
                compare(scene.hiddenArticleNull, true);
                verify(scene.monotonicEndMs >= scene.readyMonotonicMs);
            }
        }
    }
}
