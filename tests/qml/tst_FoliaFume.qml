import QtQuick
import QtTest
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "../../plugins/folia-lyrics-skin/qml/styles/fume" as Fume
import "../../plugins/folia-lyrics-skin/qml/styles/fume/frame.mjs" as Frame
import "../../plugins/folia-lyrics-skin/qml/shared/renderHints.mjs" as Hints

TestCase {
    id: testCase
    name: "FoliaFume"
    when: windowShown
    visible: true
    width: 1100
    height: 820
    property var reply: null
    function init() {
        failOnWarning(/(TypeError|ReferenceError|Unable to assign|Invalid property|Unexpected Fume)/);
    }
    Component {
        id: workerComponent
        WorkerScript {
            source: Qt.resolvedUrl("../../plugins/folia-lyrics-skin/qml/styles/fume/worker.mjs")
            onMessage: messageObject => testCase.reply = messageObject
        }
    }
    function test_actualWorkerSupportsOriginalArticleGenerator() {
        const worker = createTemporaryObject(workerComponent, testCase);
        tryVerify(() => worker.ready, 5000);
        reply = null;
        worker.sendMessage({
            phase: "probe",
            generation: 1
        });
        tryVerify(() => reply !== null, 5000);
        compare(reply.error, undefined);
        compare(reply.generator, true);
        compare(reply.value, null);
    }
    function test_actualWorkerCompletesWholeArticleProtocol() {
        const worker = createTemporaryObject(workerComponent, testCase);
        tryVerify(() => worker.ready, 5000);
        reply = null;
        worker.sendMessage({
            phase: "reset",
            generation: 2,
            trackRevision: "song"
        });
        tryVerify(() => reply !== null, 1000);
        compare(reply.phase, "read");
        reply = null;
        worker.sendMessage({
            phase: "prepare",
            generation: 2,
            trackRevision: "song",
            context: {
                viewport: {
                    width: 1000,
                    height: 700
                },
                theme: {
                    name: "paper",
                    fontStyle: "sans"
                },
                lyricsFontScale: 1,
                tuning: {
                    heroScale: 1
                }
            }
        });
        tryVerify(() => reply !== null, 2000);
        compare(reply.phase, "complete");
        compare(reply.article, null);
    }

    Component {
        id: rendererComponent
        Fume.Fume {
            anchors.fill: parent
            preparedLines: []
            live: true
            settings: ({
                    fumeGlowIntensity: 0
                })
            baseFont.family: "Helvetica Neue"
            Rectangle {
                anchors.fill: parent
                color: "black"
                z: -100
            }
        }
    }
    function test_rendererLoadsAndHidesWithoutSource() {
        const view = createTemporaryObject(rendererComponent, testCase);
        verify(view !== null);
        compare(view.rendererCount, 0);
        compare(view.errorString, "");
        view.live = false;
        compare(view.rendererCount, 0);
    }

    function parserRows(count, prefix) {
        return Array.from({
            length: count
        }, (_, index) => {
            const text = (prefix || "星光") + " " + index + " across the sky 👩🏽‍🚀";
            return {
                text: text,
                start_ms: index * 4000,
                duration_ms: 3400,
                words: [
                    {
                        text: text,
                        start_ms: index * 4000,
                        duration_ms: 3400
                    }
                ]
            };
        });
    }
    function sourceView() {
        return createTemporaryObject(rendererComponent, testCase, {
            lyricSource: foliaTestLyricSource,
            lyricCount: Qt.binding(() => foliaTestLyricFixture.count),
            textService: foliaTestTextService,
            trackRevision: "fixture"
        });
    }
    function test_resetCancelsWholeSongPreparationAndKeepsSourceIndex() {
        verify(foliaTestLyricFixture.replaceRows(parserRows(80, "旧歌")));
        const view = sourceView();
        verify(view !== null);
        verify(foliaTestLyricFixture.replaceRows(parserRows(8, "new song")));
        tryVerify(() => view.article !== null || view.errorString.length > 0, 60000);
        compare(view.errorString, "");
        compare(view.article.blocks.length, 8);
        compare(view.article.chronologicalBlocks[7].sourceLineIndex, 7);
        verify(view.article.blocks.every(block => block.line.fullText.indexOf("new song") === 0));
        view.currentIndex = -1;
        view.timeSeconds = 0;
        wait(10);
        verify(Number.isFinite(view.camera.scale));
        view.visible = false;
        compare(view.rendererCount, 0);
        compare(view.article, null);
    }

    function test_generatorNativeLoopProbe() {
        const worker = createTemporaryObject(workerComponent, testCase);
        tryVerify(() => worker.ready, 5000);
        reply = null;
        worker.sendMessage({
            phase: "generator-probe",
            generation: 1
        });
        tryVerify(() => reply !== null, 1000);
        compare(reply.first.done, false);
        compare(reply.last.done, true);
    }

    function test_nativeNewspaperPixels() {
        verify(foliaTestLyricFixture.replaceRows(parserRows(24, "Hello paper")));
        const view = sourceView();
        view.timeSeconds = 1.7;
        view.currentIndex = 0;
        view.motionEnabled = false;
        view.paused = true;
        tryVerify(() => view.article !== null || view.errorString.length > 0, 60000);
        compare(view.errorString, "");
        tryVerify(() => view.rendererCount > 0 && view.renderReady, 5000);
        for (let i = 0; i < 90; i++) {
            view.timeSeconds = 1.7 + i / 90;
            view.draw(1 / 60);
        }
        wait(100);
        const image = grabImage(view);
        image.save("build/folia-fume-native/fume-newspaper.png");
        let visible = 0;
        for (let y = 0; y < image.height; y += 3)
            for (let x = 0; x < image.width; x += 3)
                if (image.red(x, y) > 20 || image.green(x, y) > 20 || image.blue(x, y) > 20)
                    visible++;
        verify(visible > 60, "Native Fume article pixels missing: " + visible);
        compare(view.errorString, "");
    }

    Component {
        id: batchComponent
        Fume.FumeBatch {
            commands: []
            baseFont.family: "Helvetica Neue"
            glowEnabled: false
        }
    }
    function command(text) {
        return {
            key: "complete-context",
            text: text,
            size: 32,
            weight: 640,
            layer: "static0",
            x: 10,
            y: 40,
            style: {
                fill: "rgba(255, 255, 255, 0.8)",
                blur: 0,
                shadow: "transparent",
                alpha: 1
            },
            graphemes: [
                {
                    segment: text,
                    index: 0
                }
            ]
        };
    }
    Component {
        id: generationErrorSpy
        SignalSpy {
            signalName: "errorChanged"
        }
    }
    function test_sameKeyAsyncHaloBudgetUsesCurrentMetrics_data() {
        return [
            { tag: "zero-to-160", from: false, to: true },
            { tag: "160-to-zero", from: true, to: false }
        ];
    }
    function test_sameKeyAsyncHaloBudgetUsesCurrentMetrics(data) {
        const makeCommand = halo => {
            const value = command("W");
            value.maximumShadowBlur = halo ? 64 : 0;
            value.minimumDeviceScale = .22;
            value.style.blur = halo ? 64 : 0;
            value.style.shadow = halo ? "white" : "transparent";
            return value;
        };
        const batch = createTemporaryObject(batchComponent, testCase, {
            width: 512,
            height: 512,
            glowEnabled: true,
            maximumRasterScale: 2.24
        });
        verify(batch !== null);
        batch.commands = [makeCommand(data.from)];
        tryVerify(() => batch.posesCurrent && batch.glyph.metrics.length === 1 && batch.glyph.poses.length === 1, 10000);
        tryCompare(batch.glyph, "ready", true, 10000);
        compare(batch.errorString, "");
        const spy = createTemporaryObject(generationErrorSpy, testCase, {target: batch.glyph});
        verify(spy !== null);
        spy.clear();
        batch.commands = [makeCommand(data.to)];
        verify(batch.glyph.preparing);
        verify(!batch.posesCurrent, "An old GPU-ready flag is not the new metrics generation");
        compare(batch.glyph.opacity, 0);
        compare(batch.errorString, "");
        tryVerify(() => batch.posesCurrent && batch.glyph.metrics.length === 1 && batch.glyph.poses.length === 1, 10000);
        tryCompare(batch.glyph, "ready", true, 10000);
        compare(batch.errorString, "");
        compare(spy.count, 0, "No stale pose may be applied before or after the new metrics generation");
        compare(batch.glyph.runs[0].maxHaloRadius, data.to ? 160 : 0);
        compare(batch.glyph.poses[0].halos.length, data.to ? 1 : 0);
        compare(batch.glyph.opacity, 1);
    }

    function test_nativePreparationRejectionRemainsVisibleUntilValidContext() {
        const batch = createTemporaryObject(batchComponent, testCase);
        verify(batch !== null);
        batch.commands = [command("x".repeat(8193))];
        tryVerify(() => batch.errorString.length > 0, 2000);
        const error = batch.errorString;
        for (let i = 0; i < 10; i++) {
            batch.deviceScale = 1 + i * .01;
            batch.publish();
        }
        compare(batch.errorString, error);
        batch.commands = [command("Ag")];
        tryCompare(batch, "errorString", "", 2000);
        verify(batch.glyph.metrics.length === 1);
        verify(batch.glyph.poses.length > 0);
    }

    function test_canvasMiddleUsesPrimaryEmForFallbackAndPostBlurClip() {
        const batch = createTemporaryObject(batchComponent, testCase, {
            width: 400,
            height: 300
        });
        for (const text of ["Ag", "星", "😀", " "]) {
            const input = command(text);
            input.size = 80.5;
            input.y = 140;
            input.ranges = [Object.assign({}, input.style, {
                    clipRect: {
                        x: 0,
                        y: -60,
                        width: 200,
                        height: 150
                    }
                })];
            batch.commands = [input];
            tryVerify(() => batch.glyph.metrics.length === 1 && batch.glyph.poses.length === 1, 2000);
            compare(batch.errorString, "");
            const metric = batch.glyph.metrics[0], pose = batch.glyph.poses[0];
            const primaryEmMiddle = (metric.emAscent - metric.emDescent) / 2;
            verify(Math.abs(pose.y + metric.baseline - primaryEmMiddle - input.y) < 1e-6, "Canvas middle must use primary-font em, including fallback " + text + ": " + JSON.stringify({
                metric,
                pose
            }));
            verify(Math.abs(pose.clip.y - (input.ranges[0].clipRect.y + metric.baseline - primaryEmMiddle)) < 1e-6);
        }
    }

    Component {
        id: middleReferenceComponent
        GlyphRun {
            width: 400
            height: 300
            font: Qt.font({
                family: "Arial",
                pixelSize: 40,
                weight: Font.Medium
            })
        }
    }
    function test_canvasMiddlePixelsMatchIndependentChromeBaseline() {
        const batch = createTemporaryObject(batchComponent, testCase, {
            width: 400,
            height: 300
        });
        batch.baseFont = Qt.font({
            family: "Arial",
            pixelSize: 40,
            weight: Font.Medium
        });
        const input = command("Ag星😀");
        input.size = 40;
        input.weight = 500;
        input.y = 140;
        input.ranges = [Object.assign({}, input.style, {
                clipRect: {
                    x: 0,
                    y: -12,
                    width: 300,
                    height: 16
                }
            })];
        batch.commands = [input];
        tryVerify(() => batch.glyph.metrics.length === 1 && batch.glyph.poses.length === 1, 2000);
        compare(batch.errorString, "");
        const reference = createTemporaryObject(middleReferenceComponent, testCase, {
            x: 450
        });
        reference.runs = [
            {
                key: "reference",
                text: input.text,
                size: 40,
                weight: 500,
                spacing: 0,
                maxBlur: 0
            }
        ];
        compare(reference.errorString, "");
        // Independently recorded Chrome155 Canvas alphabeticBaseline for Arial40,
        // textBaseline=middle. It belongs to the PRIMARY face, even for emoji/CJK.
        const chromeMiddleBaseline = 11.03125, top = reference.metrics[0].baseline - chromeMiddleBaseline;
        reference.poses = [
            {
                key: "reference",
                x: input.x,
                y: input.y - top,
                color: Qt.rgba(1, 1, 1, .8),
                clip: {
                    x: 0,
                    y: -12 + top,
                    width: 300,
                    height: 16
                }
            }
        ];
        tryVerify(() => reference.textureUploads > 0 && batch.glyph.textureUploads > 0, 2000);
        const actual = grabImage(batch), expected = grabImage(reference);
        let error = 0, coverage = 0;
        for (let y = 0; y < actual.height; ++y)
            for (let x = 0; x < actual.width; ++x) {
                error = Math.max(error, Math.abs(actual.red(x, y) - expected.red(x, y)));
                if (expected.red(x, y) > 0)
                    ++coverage;
            }
        verify(coverage > 100, "Independent same-glyph reference must contain visible pixels");
        compare(error, 0, "Fume whole-context and post-blur clip must match source Canvas middle baseline");
    }

    function test_pausedPaintInputsDoNotRetransferNativeShaping() {
        verify(foliaTestLyricFixture.replaceRows(parserRows(8, "Static")));
        const view = sourceView();
        view.paused = true;
        view.timeSeconds = 1;
        view.currentIndex = 0;
        tryVerify(() => view.article !== null || view.errorString.length > 0, 60000);
        compare(view.errorString, "");
        tryVerify(() => view.renderers.length > 0 && view.renderReady, 2000);
        const revisions = view.renderers.map(glyph => glyph.maskRevision), layoutRevision = view.layoutRevision, measurements = view.measurementBatches;
        view.primaryColor = "#aaffcc";
        view.accentColor = "#ee5511";
        view.settings = {
            fumeGlowIntensity: 0,
            fumeCameraSpeed: 1.4
        };
        for (let i = 0; i < 40; i++)
            view.draw(1 / 60);
        wait(20);
        compare(view.layoutRevision, layoutRevision);
        compare(view.measurementBatches, measurements);
        compare(view.errorString, "");
        compare(view.renderers.length, revisions.length);
        for (let i = 0; i < revisions.length; i++)
            compare(view.renderers[i].maskRevision, revisions[i]);
    }
    function test_sourceCanvasShadowReference() {
        const rows = Array.from({
            length: 3
        }, (_, i) => ({
                    text: "星光汇入辽阔天空",
                    start_ms: i * 10000,
                    duration_ms: 9000,
                    words: [
                        {
                            text: "星光汇入辽阔天空",
                            start_ms: i * 10000,
                            duration_ms: 9000
                        }
                    ]
                }));
        verify(foliaTestLyricFixture.replaceRows(rows));
        const view = sourceView();
        view.settings = {
            lyricsFontScale: 1.4,
            fumeHeroScale: 1.32,
            fumeGlowIntensity: 0
        };
        view.paused = true;
        tryVerify(() => view.article !== null || view.errorString.length > 0, 60000);
        compare(view.errorString, "");
        const block = view.article.blocks.find(block => block.variant === "hero"), line = block.line, time = line.startTime + (Hints.getLineRenderEndTime(line) - line.startTime) * .8;
        const commands = Frame.recordBlock(block, {
            time: time,
            theme: view.theme,
            glowIntensity: 1.8,
            activeGlowBoost: .92 * 1.8,
            passedGlowBase: .62 * 1.8,
            showPrintStamp: true
        }, null).text;
        const command = commands.find(command => command.layer === "line-glow");
        verify(command !== undefined);
        verify(command.style.blur > 160 * .22);
        console.info("FUME_CANVAS_REFERENCE", JSON.stringify({
            source: "drawFumeLiveBlock a8da4437, native-measured real article",
            viewport: {
                width: view.width,
                height: view.height
            },
            fontPx: block.fontPx,
            font: command.font,
            fillStyle: command.style.fill,
            shadowColor: command.style.shadow,
            shadowBlur: command.style.blur,
            globalAlpha: 1,
            text: command.text,
            textAlign: "left",
            textBaseline: "middle",
            textPosition: {
                x: 0,
                y: 0
            },
            cameraScale: .22,
            dpr: 1,
            ctm: [.22, 0, 0, .22, 512, 512],
            note: "camera .22 is conservative legal source clamp projection, not this small article actual camera"
        }));
    }

    function test_singleLetterFitGuessUsesExactLargeNativeMeasurement() {
        const rows = Array.from({
            length: 3
        }, (_, i) => ({
                    text: i === 0 ? "星" : "a",
                    start_ms: i * 10000,
                    duration_ms: 9000,
                    words: [
                        {
                            text: i === 0 ? "星" : "a",
                            start_ms: i * 10000,
                            duration_ms: 9000
                        }
                    ]
                }));
        verify(foliaTestLyricFixture.replaceRows(rows));
        const view = sourceView();
        view.settings = {
            lyricsFontScale: 1.4,
            fumeHeroScale: 1.32,
            fumeGlowIntensity: 0
        };
        view.paused = true;
        tryVerify(() => view.article !== null || view.errorString.length > 0, 60000);
        console.info("Fume largest native query", view.maxRequestedFontSize);
        compare(view.errorString, "");
        verify(view.article !== null);
        verify(view.maxRequestedFontSize > 256);
    }

    function test_nativeLigatureClustersStaySafe() {
        const batch = createTemporaryObject(batchComponent, testCase, {
            width: 400,
            height: 200
        });
        batch.baseFont.family = "Times New Roman";
        const input = command("لا");
        input.layer = "body";
        input.size = 96;
        input.x = 40;
        input.y = 100;
        batch.commands = [input];
        tryVerify(() => batch.glyph.metrics.length === 1, 2000);
        const metric = batch.glyph.metrics[0];
        compare(metric.graphemes.length, 2);
        compare(metric.graphemes[0].clusterStart, metric.graphemes[1].clusterStart);
        input.graphemes = Array.from("لا", (segment, index) => ({
                    segment,
                    index
                }));
        input.ranges = [
            {
                start: 0,
                end: 1,
                clipRect: {
                    x: 0,
                    y: -128,
                    width: metric.width / 2,
                    height: 256
                },
                fill: "#ff0000",
                blur: 0,
                shadow: "transparent",
                alpha: 1
            },
            {
                start: 1,
                end: 2,
                clipRect: {
                    x: metric.width / 2,
                    y: -128,
                    width: metric.width / 2,
                    height: 256
                },
                fill: "#0000ff",
                blur: 0,
                shadow: "transparent",
                alpha: 1
            }
        ];
        batch.commands = [input];
        compare(batch.errorString, "");
        compare(batch.glyph.poses.length, 2);
        verify(batch.glyph.poses.every(pose => pose.start === undefined && pose.clip !== undefined));
        waitForRendering(batch);
        wait(60);
        const pixels = grabImage(batch);
        let red = 0, blue = 0;
        for (let y = 0; y < pixels.height; y++)
            for (let x = 0; x < pixels.width; x++) {
                if (pixels.red(x, y) > 180 && pixels.blue(x, y) < 50)
                    red++;
                if (pixels.blue(x, y) > 180 && pixels.red(x, y) < 50)
                    blue++;
            }
        verify(red > 20 && blue > 20, "Full shared Arabic cluster must retain both clipped paints, red=" + red + " blue=" + blue);
        const revision = batch.glyph.maskRevision, uploads = batch.glyph.textureUploads;
        input.ranges[0].fill = "#00ff00";
        batch.commands = [input];
        wait(50);
        compare(batch.glyph.maskRevision, revision);
        compare(batch.glyph.textureUploads, uploads);
    }

    function test_nativePerGroupCapacityRepartitionsCompleteContexts() {
        const view = createTemporaryObject(rendererComponent, testCase, {
            paused: true,
            motionEnabled: false
        });
        verify(view);
        wait(20);
        const commands = [];
        for (let run = 0; run < 16; ++run) {
            const input = command("天地玄黄");
            input.key = "capacity" + run;
            input.size = 152;
            commands.push(input);
        }
        view.updatePool([commands]);
        tryVerify(() => view.totalCacheBytes > 0 && view.renderers.reduce((count, glyph) => count + glyph.runs.length, 0) === 16, 10000);
        compare(view.errorString, "");
        verify(view.totalCacheBytes <= view.cacheBudgetBytes);
        if (view.devicePixelRatio > 1)
            verify(view.rendererCount > 1);
        const keys = view.renderers.reduce((all, glyph) => all.concat(Array.from(glyph.runs).map(run => run.key)), []);
        compare(keys, commands.map(command => command.key));
    }
    function test_initialRequiredCommandsRejectionSplitsAfterActorCreation() {
        failOnWarning(/Binding loop detected/);
        const view = createTemporaryObject(rendererComponent, testCase, {
            paused: true,
            motionEnabled: false,
            settings: {
                fumeGlowIntensity: 1
            }
        });
        wait(20);
        const commands = Array.from({
            length: 16
        }, (_, index) => {
            const input = command("天地玄黄宇宙洪荒");
            input.key = "initial-effects-capacity-" + index;
            input.layer = "body";
            return input;
        });
        view.updatePool([commands]);
        // This synthetic pool has no article; renderReady intentionally remains
        // false. Require real initial rejection, splitting and complete masks.
        tryVerify(() => view.errorString.length === 0 && view.rendererCount > 1 && view._groupRunLimit < 16 && view.renderers.every(glyph => glyph.metrics.length === glyph.runs.length), 15000);
        const accepted = view.renderers.reduce((all, glyph) => all.concat(Array.from(glyph.runs).map(run => run.key)), []);
        compare(accepted, commands.map(input => input.key));
        verify(view.totalCacheBytes <= view.cacheBudgetBytes);
        view.live = false;
        compare(view.totalCacheBytes, 0);
    }
    function test_visibleCacheBudgetRejectsAndReleasesWholeRealPool() {
        const view = createTemporaryObject(rendererComponent, testCase, {
            paused: true,
            motionEnabled: false
        });
        verify(view !== null);
        wait(20);
        // Each initial native group must fit its own 32 MiB cap; this case
        // exercises aggregate accounting rather than the separate split test.
        const runsPerGroup = view.devicePixelRatio > 1 ? 8 : 16;
        const values = [];
        for (let group = 0; group < 32; group++) {
            const commands = [];
            for (let run = 0; run < runsPerGroup; run++) {
                let text = "";
                for (let i = 0; i < 4; i++)
                    text += String.fromCharCode(0x4e00 + group * 64 + run * 4 + i);
                const input = command(text);
                input.key = "budget" + group + ":" + run;
                input.size = 152;
                commands.push(input);
            }
            values.push(commands);
        }
        view.updatePool(values);
        tryVerify(() => view.errorString.length > 0 || view.rendererCount === 32, 15000);
        console.info("FUME_CACHE_BUDGET", JSON.stringify({
            error: view.errorString,
            totalCacheBytes: view.totalCacheBytes,
            peakCacheBytes: view.peakCacheBytes,
            rendererCount: view.rendererCount,
            nativeState: view.renderers.length ? {
                runs: view.renderers[0].runs.length,
                metrics: view.renderers[0].metrics.length,
                error: view.renderers[0].errorString,
                visible: view.renderers[0].visible,
                measurementOnly: view.renderers[0].measurementOnly,
                cacheBytes: view.renderers[0].cacheBytes,
                font: view.renderers[0].font.pixelSize
            } : null
        }));
        verify(view.errorString.indexOf("128 MiB") >= 0, view.errorString);
        compare(view.rendererCount, 0);
        compare(view.totalCacheBytes, 0);
        verify(view.peakCacheBytes > view.cacheBudgetBytes);
    }
}
