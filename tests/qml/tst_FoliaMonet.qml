import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/monet" as Monet

TestCase {
    id: testCase
    name: "FoliaMonet"
    when: windowShown
    visible: true
    property var dynamicSettings: ({})
    width: 1200
    height: 760
    function initTestCase() {
        // Pointer events obey the real window; grabImage alone can capture
        // offscreen children of Qt Quick Test's smaller default window.
        testCase.Window.window.width = width;
        testCase.Window.window.height = height;
    }
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|ShaderEffect.*(Error|null)|is not a function/);
    }
    function line(text, index) {
        return {
            fullText: text,
            startTime: index * 4,
            endTime: index * 4 + 3,
            translation: "A translation for this lyric",
            romanization: "shan he yi jiu",
            words: [
                {
                    text,
                    startTime: index * 4,
                    endTime: index * 4 + 3
                }
            ]
        };
    }
    Component {
        id: layoutComponent
        Monet.MonetLayout {
            viewportWidth: 1200
            viewportHeight: 760
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 24
            })
            subtitleFont: Qt.font({
                family: "Arial",
                pixelSize: 18
            })
            textService: foliaTestTextService
            settings: ({
                    subtitleContentMode: "both"
                })
        }
    }
    function test_realWorkerFullNativeMetricsAndRichInline() {
        const l = createTemporaryObject(layoutComponent, testCase, {
            entries: [
                {
                    key: "0",
                    index: 0,
                    position: 0,
                    offset: 0,
                    status: "active",
                    line: line("山河 office á 👩🏽‍🚀", 0)
                }
            ]
        });
        verify(l !== null);
        tryVerify(() => !l.busy && (l.revision > 0 || l.errorString.length > 0), 20000);
        compare(l.errorString, "");
        compare(l.result.length, 1);
        verify(l.measurementBatches > 0);
        verify(l.result[0].rows.length > 0);
        compare(l.result[0].tracks.length, 2);
        verify(l.result[0].layout.lineHeightPx > 0);
        verify(l.result[0].rows[0].fragments[0].offsets.length > 1);
    }
    Component {
        id: tokenComponent
        Monet.MonetToken {}
    }
    Component { id: tokenLoader; Loader { asynchronous: false } }
    function test_queuedGlyphPreparationCannotOutliveItsLoader() {
        const l = createTemporaryObject(layoutComponent, testCase, {
            entries: [{key: "retire", index: 0, position: 0, offset: 0, status: "active", line: line("Retire office 山河", 0)}]
        });
        tryVerify(() => !l.busy && l.result.length === 1, 20000);
        compare(l.errorString, "");
        const entry = l.result[0], fragment = entry.rows[0].fragments[0];
        for (let i = 0; i < 20; ++i) {
            const loader = createTemporaryObject(tokenLoader, testCase);
            loader.setSource(Qt.resolvedUrl("../../plugins/folia-lyrics-skin/qml/styles/monet/MonetToken.qml"), {
                fragment, entry, baseFont: l.baseFont, fontPx: l.geometry.fontPx,
                fontWeight: entry.tone.fontWeight, timeSeconds: 1
            });
            compare(loader.status, Loader.Ready);
            loader.active = false;
            wait(2);
            loader.destroy();
        }
        wait(40);
    }
    function test_timedInlineBlocksUseRealShrinkToFitParagraphs() {
        const samples = [
            {
                text: "夜空中最亮的星照耀着远方的人走过春夏秋冬又一年",
                wraps: true
            },
            {
                text: "hello world under the brightest moonlight and over the mountain",
                wraps: true
            },
            {
                text: "averyveryveryveryveryveryveryveryveryveryverylongatomicword",
                wraps: false
            }
        ];
        for (const sample of samples) {
            const l = createTemporaryObject(layoutComponent, testCase, {
                viewportWidth: 400,
                entries: [
                    {
                        key: "wrap",
                        index: 0,
                        position: 0,
                        offset: 0,
                        status: "active",
                        line: line(sample.text, 0)
                    }
                ]
            });
            verify(l !== null);
            tryVerify(() => !l.busy && (l.revision > 0 || l.errorString.length > 0), 20000);
            compare(l.errorString, "");
            const entry = l.result[0], fragment = entry.rows[0].fragments[0], available = Math.max(180, l.geometry.railWidth - 2 * l.geometry.glow - 8);
            verify(typeof fragment.lineCount === "number", "must publish native inline-block paragraph metrics");
            if (sample.wraps) {
                verify(fragment.lineCount > 1, "CSS inline-block internally wraps " + sample.text);
                verify(fragment.boxWidth <= available + .01);
                verify(fragment.boxHeight > entry.layout.lineHeightPx);
            } else {
                compare(fragment.lineCount, 1);
                verify(fragment.boxWidth > available, "CSS atomic word retains min-content overflow");
            }
            compare(entry.layout.textLineCount, 1, "source model reservation retains break:never semantics");
            const token = createTemporaryObject(tokenComponent, testCase, {
                fragment,
                entry,
                baseFont: l.baseFont,
                fontPx: l.geometry.fontPx,
                fontWeight: entry.tone.fontWeight,
                timeSeconds: 1.5,
                x: 10,
                y: 10
            });
            verify(token !== null);
            tryVerify(() => token.metric !== null && token.renderers[0].textureUploads > 0, 5000);
            compare(token.errorString, "");
            compare(token.metric.lineCount, fragment.lineCount);
            if (sample.wraps) {
                const image = grabImage(token), scale = image.width / token.width;
                let lowerInk = 0;
                for (let y = Math.ceil(entry.layout.lineHeightPx * scale); y < image.height; y++)
                    for (let x = 0; x < image.width; x++)
                        if (image.alpha(x, y) > 50 && image.red(x, y) > 70)
                            lowerInk++;
                verify(lowerInk > 50, "real paragraph RGB must exist below first line=" + lowerInk);
            }
            token.live = false;
            l.live = false;
        }
    }
    function test_retainedUnicodeMessagesAcrossFontChanges() {
        const text = "长句 office ffi 👨‍👩‍👧‍👦 العربية ".repeat(30), raw = line(text, 0);
        raw.translation = "translation ".repeat(25);
        raw.romanization = "luo ma yin ".repeat(15);
        const points = [];
        for (let p = 0; p < text.length; ) {
            const cp = text.codePointAt(p);
            points.push(String.fromCodePoint(cp));
            p += cp > 65535 ? 2 : 1;
        }
        compare(text.length, 1020);
        compare(points.length, 900);
        raw.words = points.map((text, i) => ({
                    text,
                    startTime: i * 60 / points.length,
                    endTime: (i + 1) * 60 / points.length
                }));
        const l = createTemporaryObject(layoutComponent, testCase, {
            entries: [
                {
                    key: "long",
                    index: 0,
                    position: 0,
                    offset: 0,
                    status: "active",
                    line: raw
                }
            ]
        });
        verify(l !== null);
        tryVerify(() => !l.busy && (l.revision > 0 || l.errorString.length > 0), 30000);
        compare(l.errorString, "");
        const revision = l.revision;
        l.baseFont = Qt.font({
            family: "Arial",
            pixelSize: 26,
            italic: true,
            weight: 300
        });
        l.settings = {
            subtitleContentMode: "both",
            fontWeight: 300
        };
        tryVerify(() => !l.busy && (l.revision > revision || l.errorString.length > 0), 30000);
        compare(l.errorString, "");
        verify(l.result[0].rows.length > 5);
        l.live = false;
        tryCompare(l, "result", []);
    }
    Component {
        id: blackBackground
        Rectangle {
            anchors.fill: parent
            color: "#111111"
            z: -1000
        }
    }
    Component {
        id: stageComponent
        Monet.Monet {
            preparedLines: []
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 24
            })
            textService: foliaTestTextService
        }
    }
    Component {
        id: patternedBackground
        Item {
            width: 1200
            height: 760
            z: -1000
            Rectangle { anchors.fill: parent; color: "#0044ff" }
            Rectangle { width: 880; height: parent.height; color: "#ff3000" }
            Rectangle { x: 900; y: 100; width: 60; height: 560; color: "#00ff00"; opacity: .6 }
        }
    }
    function test_rectangularBackdropRealPointerDragResetCommitAndRelease() {
        const background = createTemporaryObject(patternedBackground, testCase);
        const m = createTemporaryObject(stageComponent, testCase, {
            width: 1200, height: 760,
            preparedLines: [{line: line("Actual backdrop and portrait edit", 0)}],
            currentIndex: 0, timeSeconds: 1, motionEnabled: false,
            backdropSources: [background],
            settings: {monetPortraitStyle: "rectangular", monetShowPortraitDragHanger: true}
        });
        verify(m);
        tryVerify(() => m.renderReady || m.errorString.length > 0, 30000);
        compare(m.errorString, "");
        verify(m.backdropTextureBytes > 0);
        const hanger = findChild(m, "monetPortraitHanger");
        verify(hanger && hanger.visible);
        mouseClick(hanger, 6, 28);
        tryCompare(m, "_editing", true);
        const p = hanger.mapToItem(testCase, 6, 28);
        mousePress(testCase, p.x, p.y);
        mouseMove(testCase, p.x - 24, p.y, 30);
        mouseMove(testCase, p.x - 124, p.y, 30);
        mouseRelease(testCase, p.x - 124, p.y);
        verify(m.portraitOffsetX < -50 && m.portraitOffsetX >= -150);
        const reset = findChild(m, "monetPortraitReset");
        verify(reset && reset.visible);
        mouseClick(reset, 16, 16);
        compare(m.portraitOffsetX, 0);
        const q = hanger.mapToItem(testCase, 6, 28);
        mousePress(testCase, q.x, q.y);
        mouseMove(testCase, q.x - 24, q.y, 30);
        mouseMove(testCase, q.x - 104, q.y, 30);
        mouseRelease(testCase, q.x - 104, q.y);
        let patch = null;
        m.settingsPatchRequested.connect(value => patch = value);
        mouseClick(hanger, 6, 28);
        tryCompare(m, "_editing", false);
        verify(patch && patch.monetPortraitOffsetX <= -50);
        waitForRendering(m);
        compare(m.errorString, "");
        grabImage(m).save("build/folia-monet-rectangular-dpr" + Screen.devicePixelRatio + ".png");
        m.live = false;
        tryCompare(m, "backdropTextureBytes", 0);
        compare(m.totalCacheBytes, 0);
    }
    function test_nativePosterRailAndDragLifecycle() {
        const prepared = [];
        const metadata = [];
        for (let i = 0; i < 9; i++) {
            prepared[i * 3] = {
                line: line(i === 4 ? "山河 星光璀璨 office" : "Waiting in the moonlight " + i, i)
            };
            metadata.push({
                sourceIndex: i * 3,
                startTime: i * 4,
                endTime: i * 4 + 3,
                renderEndTime: i * 4 + 3
            });
        }
        const m = createTemporaryObject(stageComponent, testCase, {
            width: 1200,
            height: 760,
            preparedLines: prepared,
            lineMetadata: metadata,
            currentIndex: 12,
            timeSeconds: 17,
            songTitle: "Moonlight 山河",
            songArtist: "Monet artist",
            songAlbum: "Album",
            settings: {
                subtitleContentMode: "both"
            }
        });
        verify(m !== null);
        tryVerify(() => m.renderReady || m.errorString.length > 0, 30000);
        compare(m.errorString, "");
        verify(m.mountedLineCount >= 3);
        verify(m.tokenCount > 0);
        compare(m.portraitOffsetX, 0);
        m.beginPortraitEdit();
        m.movePortrait(-97);
        m.savePortraitEdit();
        compare(m.portraitOffsetX, -97);
        m.live = false;
        tryCompare(m, "mountedLineCount", 0);
    }
    function test_actualMetalRailSweepPreservesMasksAndCoverDecode() {
        const prepared = [], metadata = [];
        for (let i = 0; i < 7; i++) {
            prepared[i] = {
                line: line(i === 3 ? "山河星光璀璨" : "Under the moonlight " + i, i)
            };
            metadata.push({
                sourceIndex: i,
                startTime: i * 4,
                endTime: i * 4 + 3,
                renderEndTime: i * 4 + 3
            });
        }
        const m = createTemporaryObject(stageComponent, testCase, {
            width: 1100,
            height: 740,
            preparedLines: prepared,
            lineMetadata: metadata,
            currentIndex: 3,
            timeSeconds: 13.2,
            motionEnabled: false,
            paused: true,
            songTitle: "Moonlight 山河",
            songArtist: "A real artist",
            songAlbum: "Monet",
            coverUrl: Qt.resolvedUrl("../../plugins/folia-lyrics-skin/qml/styles/cappella/assets/emo/love1.png"),
            settings: {
                subtitleContentMode: "both",
                wordColors: [
                    {
                        word: "山河",
                        color: "#ff4040"
                    }
                ]
            }
        });
        verify(m !== null);
        createTemporaryObject(blackBackground, m, {});
        tryVerify(() => m.renderReady || m.errorString.length > 0, 30000);
        compare(m.errorString, "");
        tryCompare(m, "portraitLayerCount", 1, 10000);
        wait(100);
        const row = m._rows.find(row => row.entry.status === "active"), glyph = findChild(row, "monetWordGlyph");
        verify(glyph !== null);
        verify(glyph.textureUploads > 0, "requires real GPU uploads");
        const revision = glyph.maskRevision, uploads = glyph.textureUploads;
        const before = grabImage(m);
        before.save("build/folia-monet-poster.png");
        const scale = before.width / m.width, r = m.railRect;
        const snapshot = [];
        let red = 0, ink = 0;
        for (let y = Math.max(0, Math.floor(r.y * scale)); y < Math.min(before.height, Math.ceil((r.y + r.height) * scale)); y++)
            for (let x = Math.max(0, Math.floor(r.x * scale)); x < Math.min(before.width, Math.ceil((r.x + r.width) * scale)); x++) {
                snapshot.push([before.red(x, y), before.green(x, y), before.blue(x, y)]);
                if (before.red(x, y) > 80)
                    ink++;
                if (before.red(x, y) > 100 && before.red(x, y) > before.green(x, y) * 1.25)
                    red++;
            }
        verify(ink > 500, "rail RGB ink=" + ink);
        verify(red > 100, "source keyword gradient/glow red pixels=" + red);
        m.timeSeconds = 14.6;
        wait(100);
        compare(glyph.maskRevision, revision);
        compare(glyph.textureUploads, uploads);
        const after = grabImage(m);
        after.save("build/folia-monet-sweep-later.png");
        let difference = 0, snapshotIndex = 0;
        for (let y = Math.max(0, Math.floor(r.y * scale)); y < Math.min(after.height, Math.ceil((r.y + r.height) * scale)); y++)
            for (let x = Math.max(0, Math.floor(r.x * scale)); x < Math.min(after.width, Math.ceil((r.x + r.width) * scale)); x++) {
                const pixel = snapshot[snapshotIndex++];
                if (Math.max(Math.abs(after.red(x, y) - pixel[0]), Math.abs(after.green(x, y) - pixel[1]), Math.abs(after.blue(x, y) - pixel[2])) > 8)
                    difference++;
            }
        verify(difference > 100, "clock must update real sweep pixels=" + difference);
        console.info("MONET_NATIVE_CACHE", JSON.stringify({
            bytes: m.totalCacheBytes,
            rows: m.mountedLineCount,
            tokens: m.tokenCount
        }));
    }
    function test_dragPatchPreservesConfigurationBindingAndManualIdleReset() {
        const prepared = [], metadata = [];
        for (let i = 0; i < 12; i++) {
            prepared[i * 4] = {
                line: line("row " + i, i)
            };
            metadata.push({
                sourceIndex: i * 4,
                startTime: i * 4,
                endTime: i * 4 + 3,
                renderEndTime: i * 4 + 3
            });
        }
        dynamicSettings = {
            monetPortraitOffsetX: 0
        };
        const m = createTemporaryObject(stageComponent, testCase, {
            width: 1000,
            height: 700,
            preparedLines: prepared,
            lineMetadata: metadata,
            currentIndex: 20,
            timeSeconds: 21,
            motionEnabled: false
        });
        m.settings = Qt.binding(() => testCase.dynamicSettings);
        tryVerify(() => m.renderReady || m.errorString.length > 0, 30000);
        compare(m.errorString, "");
        let patch = null;
        m.settingsPatchRequested.connect(value => patch = value);
        m.beginPortraitEdit();
        m.movePortrait(-82.6);
        m.savePortraitEdit();
        compare(patch.monetPortraitOffsetX, -83);
        compare(m.portraitOffsetX, -83);
        dynamicSettings = {
            monetPortraitOffsetX: -25,
            monetShowDescription: false
        };
        compare(m.portraitOffsetX, -25);
        compare(m.tuning.showDescription, false);
        m.wheelDelta(73);
        compare(m._manual, 6);
        compare(m.requiredSourceIndicesKey, "8,12,16,20,24,28,32,36,40");
        tryVerify(() => m._manual === null, 2200);
        compare(m.requiredSourceIndicesKey, "12,16,20,24,28");
    }
    function test_oversizedPreparationReleasesOldRowsAndRecovers() {
        const good = {
            line: line("good source", 0)
        }, m = createTemporaryObject(stageComponent, testCase, {
            width: 1000,
            height: 700,
            preparedLines: [good],
            currentIndex: 0,
            timeSeconds: 1,
            motionEnabled: false
        });
        tryVerify(() => m.renderReady || m.errorString.length > 0, 30000);
        compare(m.errorString, "");
        m.preparedLines = [
            {
                line: line("A".repeat(8193), 0)
            }
        ];
        tryVerify(() => m.errorString.length > 0, 10000);
        verify(m.errorString.indexOf("8192") >= 0 || m.errorString.indexOf("4Mi") >= 0);
        compare(m.mountedLineCount, 0);
        const failure = m.errorString;
        m.timeSeconds = 1.1;
        wait(30);
        compare(m.errorString, failure);
        m.preparedLines = [good];
        tryVerify(() => m.renderReady, 30000);
        compare(m.errorString, "");
    }
    Component {
        id: portraitComponent
        Monet.MonetPortrait {
            width: 220
            height: 220
        }
    }
    function test_portraitDecodeFailureKeepsOldAndRapidStackIsBounded() {
        const p = createTemporaryObject(portraitComponent, testCase, {
            source: Qt.resolvedUrl("../../plugins/folia-lyrics-skin/qml/styles/cappella/assets/emo/love1.png")
        });
        verify(p !== null);
        tryCompare(p, "layerCount", 1, 10000);
        p.source = Qt.resolvedUrl("../../plugins/folia-lyrics-skin/qml/styles/monet/missing-portrait.png");
        tryVerify(() => p.errorString.length > 0, 10000);
        compare(p.layerCount, 1);
        for (const name of ["vibe1", "vibe2", "normal1", "happy1"]) {
            p.source = Qt.resolvedUrl("../../plugins/folia-lyrics-skin/qml/styles/cappella/assets/emo/" + name + ".png");
            tryVerify(() => p._actors.some(actor => actor.imageSource === String(p.source)), 10000);
            verify(p.layerCount <= 4);
        }
        tryCompare(p, "layerCount", 1, 1400);
        p.live = false;
        compare(p.layerCount, 0);
    }
    function test_twentyFourConcurrentCjkTokensReportRealCache() {
        const chars = [];
        for (const point of "夜空中最亮的星照耀着远方的人走过春夏秋冬又一年")
            chars.push(point);
        const text = chars.slice(0, 24).join(""), raw = {
            fullText: text,
            startTime: 1,
            endTime: 8,
            isChorus: true,
            words: chars.slice(0, 24).map(text => ({
                        text,
                        startTime: 1,
                        endTime: 8
                    }))
        };
        const m = createTemporaryObject(stageComponent, testCase, {
            width: 1100,
            height: 760,
            preparedLines: [
                {
                    line: raw
                }
            ],
            currentIndex: 0,
            timeSeconds: 4,
            motionEnabled: false,
            settings: {
                monetFontScale: 1.5,
                lyricsFontScale: 1.4,
                subtitleContentMode: "both"
            }
        });
        verify(m !== null);
        tryVerify(() => m.renderReady || m.errorString.length > 0, 30000);
        compare(m.errorString, "");
        tryVerify(() => m.renderers.some(renderer => renderer.textureUploads > 0), 5000);
        verify(m.totalCacheBytes > 0);
        verify(m.totalCacheBytes < 128 * 1024 * 1024);
        console.info("MONET_24CJK_ALL_ACTIVE_CACHE", JSON.stringify({
            bytes: m.totalCacheBytes,
            rows: m.mountedLineCount,
            tokens: m.tokenCount,
            glyphRenderers: m.renderers.length
        }));
        m.live = false;
        compare(m.totalCacheBytes, 0);
    }
}
