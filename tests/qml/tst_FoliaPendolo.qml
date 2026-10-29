import QtQuick
import QtTest
import QtQml.WorkerScript
import "../fixtures/pendolo/replay-fixture.mjs" as Replay
import "../../plugins/folia-lyrics-skin/qml/shared/text/prepare.mjs" as Prepare

TestCase {
    id: testCase
    name: "FoliaPendolo"
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
        console.log("Pendolo DPR", Screen.devicePixelRatio, "graphics API", GraphicsInfo.api);
    }
    function test_00WorkerReplayWithoutGlyph() {
        const worker = createTemporaryObject(probeWorker, testCase);
        tryVerify(() => worker.ready, 5000);
        let cursor = 0, done = false, failure = "", responses = 0;
        worker.message.connect(reply => {
            responses++;
            if (reply.error) {
                failure = reply.error;
                done = true;
                return;
            }
            const expected = responses % 3 === 0 ? "complete" : "measure";
            if (reply.phase !== expected) {
                failure = "Replay phase " + responses + ": " + reply.phase + " versus " + expected;
                done = true;
                return;
            }
            if (cursor < Replay.messages.length) {
                const next = JSON.parse(JSON.stringify(Replay.messages[cursor++]));
                Qt.callLater(() => worker.sendMessage(next));
            } else
                done = true;
        });
        worker.sendMessage(JSON.parse(JSON.stringify(Replay.messages[cursor++])));
        tryVerify(() => done, 20000);
        compare(failure, "");
        compare(responses, Replay.messages.length);
    }
    function prepared(text, start, end) {
        const chars = Array.from(text);
        return Prepare.prepareLines([
            {
                fullText: text,
                startTime: start,
                endTime: end,
                words: chars.map((text, i) => ({
                            text,
                            startTime: start + i * (end - start) / chars.length,
                            endTime: start + (i + 1) * (end - start) / chars.length
                        })),
                autoWordSegments: chars
            }
        ], [], null).lines[0];
    }
    function createView(values) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/pendolo/Pendolo.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, Object.assign({
            width: 1100,
            height: 820,
            preparedLines: Array.from({
                length: 32
            }, (_, i) => prepared("Clockwork " + i, i * 4, i * 4 + 3)),
            currentIndex: 8,
            timeSeconds: 33,
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 24
            }),
            subtitleFont: Qt.font({
                family: "Arial",
                pixelSize: 18
            }),
            textService: foliaTestTextService,
            primaryColor: "white",
            accentColor: "#ff4f86",
            backgroundColor: "#080b14",
            settings: {
                pendoloShowGearDecor: "full"
            }
        }, values || {}));
    }
    function ready(view) {
        tryVerify(() => view.errorString.length > 0 || view.partCount === 21 && view.lineCount > 0 && !view.busy, 20000);
        compare(view.errorString, "");
        compare(view.partCount, 21);
        verify(view.lineCount > 0);
    }
    function test_sourceMeshAndNativePixels() {
        const view = createView();
        ready(view);
        verify(view.vertexCount > 20000);
        verify(view.geometryBytes < 8 * 1024 * 1024);
        waitForRendering(view);
        const image = grabImage(view);
        let fullSaved = false;
        verify(testCase.grabToImage(result => {
            fullSaved = result.saveToFile("build/folia-native-qml/pendolo-native.png");
        }, Qt.size(view.width, view.height)));
        tryVerify(() => fullSaved, 5000);
        let ink = 0;
        for (let y = 40; y < 780; y += 3)
            for (let x = 0; x < 900; x += 3)
                if (image.red(x, y) > 50 || image.green(x, y) > 50)
                    ink++;
        verify(ink > 500, "Complete clockwork and lyric native pixels: " + ink);
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
    }
    function descendants(item, name) {
        let result = item.objectName === name ? [item] : [];
        for (const child of item.children || [])
            result = result.concat(descendants(child, name));
        return result;
    }
    function test_inactiveRowsInheritSourceCssLineHeight() {
        const view = createView({
            motionEnabled: false
        });
        ready(view);
        const rows = descendants(view, "pendoloBody").map(body => body.parent).filter(row => !row.focal && row.fontPx === 22);
        verify(rows.length > 0);
        for (const row of rows)
            compare(row.lineHeight, 33, "Inactive 22px body inherits the source page's 1.5 line-height");
        const focal = descendants(view, "pendoloBody").map(body => body.parent).find(row => row.focal);
        compare(focal.lineHeight, 34, "Focal sweep keeps source round(28 * 1.2)");
    }
    function test_staticGeometryAndGlyphUploadsStayStableWhileSweepMoves() {
        const view = createView({
            motionEnabled: false
        });
        ready(view);
        const scene = view.sceneRevision;
        const glyph = findChild(view, "pendoloSweepGlyph");
        verify(glyph);
        tryVerify(() => glyph.textureUploads > 0, 5000);
        const revision = glyph.maskRevision, uploads = glyph.textureUploads;
        view.timeSeconds = 32.2;
        waitForRendering(view);
        const before = grabImage(view);
        for (let frame = 0; frame < 12; frame++) {
            view.timeSeconds = 32.4 + frame * .1;
            wait(3);
        }
        waitForRendering(view);
        const after = grabImage(view);
        verify(!before.equals(after));
        compare(glyph.maskRevision, revision);
        compare(glyph.textureUploads, uploads);
        compare(view.sceneRevision, scene);
        compare(view.errorString, "");
    }
    function test_pausedClockFreezesButUiRatchetSettles() {
        const view = createView();
        ready(view);
        view.paused = true;
        wait(70);
        const phase = view.clockMotion.phase, seconds = view.clockMotion.secondGearAngle;
        view.currentIndex = 9;
        view.timeSeconds = 37;
        wait(350);
        compare(view.clockMotion.phase, phase);
        compare(view.clockMotion.secondGearAngle, seconds);
        verify(Math.abs(view.wheelRotation) < .4);
        view.paused = false;
        wait(80);
        verify(view.clockMotion.phase > phase);
    }
    function test_manualBrowseSeekAndGapAnchor() {
        const view = createView({
            motionEnabled: false
        });
        ready(view);
        view.browse(90, false);
        compare(view.targetPosition, 9);
        view.browse(-90, false);
        compare(view.targetPosition, 8);
        const spy = createTemporaryObject(spyComponent, testCase, {
            target: view
        });
        view.seekLine(10, 40);
        compare(spy.count, 1);
        compare(spy.signalArguments[0][0], 40);
        compare(view.targetPosition, 10);
        view.currentIndex = 10;
        compare(view._manual, null);
        view.currentIndex = -1;
        view.timeSeconds = 43.5;
        compare(view.targetPosition, 10.5);
    }
    function test_trackRevisionRetiresOldLayoutBeforeNewDelivery() {
        const view = createView({
            trackRevision: "old",
            motionEnabled: false
        });
        ready(view);
        view.browse(90, false);
        compare(view.targetPosition, 9);
        view.baseFont = Qt.font({
            family: "Arial",
            italic: true,
            pixelSize: 28
        });
        verify(view.busy);
        const old = view.renderer;
        view.trackRevision = "next";
        compare(view.renderer, null, "Track source revision destroys the previous actor immediately");
        compare(view._manual, null);
        view.preparedLines = [prepared("New track", 0, 4)];
        view.currentIndex = 0;
        view.timeSeconds = 1;
        ready(view);
        verify(view.renderer !== old);
        const glyphs = descendants(view, "pendoloBody");
        verify(glyphs.length > 0);
        verify(glyphs.every(glyph => glyph.runs.every(run => run.text === "New track")));
    }
    function test_realTapSeeksAndBrowseReturnsAfterWallClockTimeout() {
        const view = createView({
            motionEnabled: false
        });
        ready(view);
        const spy = createTemporaryObject(spyComponent, testCase, {
            target: view
        });
        const focal = descendants(view, "pendoloBody").map(body => body.parent).find(row => row.focal);
        verify(focal);
        mouseClick(focal, Math.min(25, focal.width / 2), focal.height / 2, Qt.LeftButton);
        compare(spy.count, 1);
        compare(spy.signalArguments[0][0], 32);
        view.browse(90, false);
        compare(view.targetPosition, 9);
        view.paused = true;
        view.timeSeconds = 33;
        tryCompare(view, "targetPosition", 8, 3000);
    }
    function test_hiddenDestroysWorkersGlyphsCoverAndGeometry() {
        const view = createView();
        ready(view);
        view.visible = false;
        compare(view.resourcesActive, false);
        compare(view.renderer, null);
        compare(view.partCount, 0);
        compare(view.lineCount, 0);
        view.visible = true;
        ready(view);
        view.live = false;
        compare(view.renderer, null);
        compare(view.resourcesActive, false);
    }
    function test_subtitleInheritanceMatchesNativeRunWeights() {
        const settings = [
            {
                fontWeight: 300,
                subtitleFontWeight: 800
            },
            {
                fontWeight: null,
                subtitleFontWeight: 800
            },
            {
                fontWeight: 300,
                subtitleFontInheritsLyrics: false,
                subtitleFontWeight: 800
            }
        ];
        const expected = [[300, 300], [500, 400], [800, 800]];
        for (let i = 0; i < settings.length; i++) {
            const line = prepared("Main", 0, 4);
            line.line.romanization = "romanization";
            line.line.translation = "translation";
            const view = createView({
                preparedLines: [line],
                currentIndex: 0,
                timeSeconds: 1,
                motionEnabled: false,
                settings: Object.assign({
                    subtitleContentMode: "both",
                    pendoloShowGearDecor: "full"
                }, settings[i])
            });
            ready(view);
            const glyphs = descendants(view, "pendoloBody");
            const first = glyphs.find(glyph => glyph.runs[0].text === "romanization"), second = glyphs.find(glyph => glyph.runs[0].text === "translation");
            verify(first && second);
            compare(first.runs[0].weight, expected[i][0]);
            compare(second.runs[0].weight, expected[i][1]);
            view.live = false;
            view.destroy();
        }
    }
    function test_fontChangesAndLongLinesRemainBounded() {
        const long = prepared("长句 office ffi 👨‍👩‍👧‍👦 العربية ".repeat(30), 0, 60);
        long.line.translation = "translation ".repeat(25);
        long.line.romanization = "luo ma yin ".repeat(15);
        const view = createView({
            preparedLines: [long],
            currentIndex: 0,
            timeSeconds: 12,
            settings: {
                pendoloShowGearDecor: "full",
                subtitleContentMode: "both"
            }
        });
        ready(view);
        const scene = view.sceneRevision;
        verify(view.glyphRowCount < 128);
        const font = Qt.font({
            family: "Arial",
            pixelSize: 26,
            italic: true,
            weight: 300
        });
        view.baseFont = font;
        view.settings = Object.assign({}, view.settings, {
            fontWeight: 300
        });
        tryVerify(() => !view.busy && view.errorString === "", 20000);
        const glyph = findChild(view, "pendoloBody");
        verify(glyph);
        compare(glyph.font.family, "Arial");
        compare(glyph.font.italic, true);
        compare(view.sceneRevision, scene);
        const measure = findChild(view, "pendoloMeasure");
        verify(measure);
        compare(measure.measurementOnly, true);
        compare(measure.textureUploads, 0);
        compare(measure.cacheBytes, 0);
    }
    function test_longChorusHaloLimitsTextureToVisibleWindow() {
        const line = prepared("长句 office ffi 👨‍👩‍👧‍👦 العربية ".repeat(30), 0, 60);
        line.line.isChorus = true;
        const view = createView({
            preparedLines: [line],
            currentIndex: 0,
            timeSeconds: 12,
            motionEnabled: false,
            settings: {
                lyricsFontScale: 3,
                pendoloShowGearDecor: "full"
            }
        });
        ready(view);
        const halo = findChild(view, "pendoloChorusHalo");
        verify(halo && halo.active);
        verify(halo.height <= view.height * 3.4, "Only visible long-line halo pixels need intermediate Gaussian textures: " + halo.height);
        waitForRendering(view);
        const image = grabImage(view);
        verify(image.width > 0);
        compare(view.errorString, "");
    }
    function test_smallViewportAndLineGlowUseTrueGpuLayers() {
        const view = createView({
            width: 320,
            height: 640,
            currentIndex: 2,
            timeSeconds: 9,
            motionEnabled: false,
            settings: {
                pendoloShowGearDecor: "full",
                showText: false,
                pendoloShowCenterGradient: false
            }
        });
        tryVerify(() => view.partCount === 21, 10000);
        waitForRendering(view);
        const body = grabImage(view);
        view.settings = Object.assign({}, view.settings, {
            pendoloEnableLineGlow: true
        });
        wait(150);
        waitForRendering(view);
        const glow = grabImage(view);
        glow.save("build/folia-native-qml/pendolo-glow.png");
        let changed = 0;
        for (let y = 0; y < 640; y += 2)
            for (let x = 0; x < 320; x += 2)
                if (glow.red(x, y) > body.red(x, y) + 2)
                    changed++;
        verify(changed > 100, "Gaussian gear glow must create pixels outside original strokes: " + changed);
        compare(view.errorString, "");
        view.settings = {
            showText: false,
            pendoloShowGearDecor: "none",
            pendoloShowCenterGradient: false,
            pendoloShowCoverOnWatchFace: false
        };
        tryCompare(view, "partCount", 0);
        compare(findChild(view, "pendoloCover"), null);
    }
    function test_chorusKeywordsStarAndPublicCover() {
        const line = prepared("office M", 0, 4);
        line.line.isChorus = true;
        const view = createView({
            preparedLines: [line],
            currentIndex: 0,
            timeSeconds: 2,
            settings: {
                pendoloShowGearDecor: "full",
                wordColors: [
                    {
                        word: "office",
                        color: "#44ff88"
                    }
                ]
            }
        });
        ready(view);
        verify(findChild(view, "pendoloBalanceStar"));
        const halo = findChild(view, "pendoloChorusHalo");
        verify(halo);
        verify(halo.active);
        const glyph = findChild(view, "pendoloSweepGlyph");
        verify(glyph);
        verify(glyph.poses.some(p => p.color.g > .8 && p.color.r < .5));
        view.move(0);
        const marker = findChild(view, "pendoloChorusMarker");
        verify(marker);
        verify(marker.visible);
        view.settings = {
            showText: false,
            pendoloShowGearDecor: "none",
            pendoloShowCenterGradient: false,
            pendoloShowCoverOnWatchFace: true,
            pendoloWheelCenterX: .3
        };
        view.coverUrl = Qt.resolvedUrl("../fixtures/pendolo/test-cover.png");
        tryVerify(() => findChild(view, "pendoloCover") && findChild(view, "pendoloCover").status === Image.Ready, 5000);
        waitForRendering(view);
        const pixels = grabImage(view);
        verify(pixels.blue(330, 410) > 60);
        verify(pixels.red(330, 410) < 15);
        view.coverUrl = "";
        tryVerify(() => findChild(view, "pendoloCover") === null);
    }
    Component {
        id: probeWorker
        WorkerScript {
            source: Qt.resolvedUrl("../../plugins/folia-lyrics-skin/qml/styles/pendolo/worker.mjs")
        }
    }
    Component {
        id: spyComponent
        SignalSpy {
            signalName: "seekRequested"
        }
    }
}
