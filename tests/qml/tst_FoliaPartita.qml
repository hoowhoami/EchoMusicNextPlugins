import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared/text/prepare.mjs" as Prepare
import "../../plugins/folia-lyrics-skin/qml/styles/partita/layout.mjs" as PartitaLayout

TestCase {
    id: testCase
    name: "FoliaPartita"
    when: windowShown
    visible: true
    width: 1100
    height: 820
    Rectangle {
        anchors.fill: parent
        color: "#080b14"
        z: -1
    }
    function prepared(text, start, end, boundaries) {
        const chars = Array.from(text);
        const words = chars.map((text, index) => ({
                    text,
                    startTime: start + index * (end - start) / chars.length,
                    endTime: start + (index + 1) * (end - start) / chars.length
                }));
        return Prepare.prepareLines([
            {
                fullText: text,
                startTime: start,
                endTime: end,
                words,
                autoWordSegments: boundaries || chars
            }
        ], [], null).lines[0];
    }
    function createPartita(values) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/partita/Partita.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, Object.assign({
            width: 1100,
            height: 820,
            preparedLines: [prepared("M", 0, 4)],
            currentIndex: 0,
            timeSeconds: 1,
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 40
            }),
            primaryColor: "white",
            accentColor: "#ff4f86",
            settings: {
                animationIntensity: "normal",
                lyricsFontScale: 1,
                partitaShowGuideLines: true,
                partitaUseSemanticLayout: true,
                partitaStaggerMin: 20,
                partitaStaggerMax: 100
            }
        }, values || {}));
    }
    function test_realNativePixelsAndIndependentHalosKeepMaskUploadsStable() {
        const view = createPartita({
            settings: {
                animationIntensity: "calm",
                partitaShowGuideLines: false
            }
        });
        tryVerify(() => view.renderer && view.renderer.metrics.length === 1, 10000);
        wait(650);
        const glyph = view.renderer;
        compare(glyph.font.family, "Menlo");
        compare(glyph.runs[0].weight, 700);
        compare(glyph.runs[0].size, 61);
        compare(glyph.errorString, "");
        tryVerify(() => glyph.textureUploads > 0 && glyph.renderBatches > 0, 5000);
        const revision = glyph.maskRevision, uploads = glyph.textureUploads;
        for (let frame = 0; frame < 20; frame++) {
            view.timeSeconds = 1 + frame / 60;
            wait(2);
        }
        compare(glyph.maskRevision, revision);
        compare(glyph.textureUploads, uploads);
        view.timeSeconds = 3.6;
        wait(30);
        const original = glyph.poses;
        verify(original[0].halos.length === 2);
        waitForRendering(view);
        const halo = grabImage(view);
        glyph.poses = original.map(pose => Object.assign({}, pose, {
                halos: []
            }));
        waitForRendering(view);
        const body = grabImage(view);
        halo.save("build/folia-native-qml/partita-halo.png");
        body.save("build/folia-native-qml/partita-body.png");
        let ink = 0, outside = 0;
        for (let y = 180; y < 640; y += 2)
            for (let x = 200; x < 900; x += 2) {
                if (body.red(x, y) > 100)
                    ink++;
                if (body.red(x, y) <= 10 && body.green(x, y) <= 13 && body.blue(x, y) <= 22 && halo.red(x, y) > body.red(x, y) + 1)
                    outside++;
            }
        verify(ink > 20, "Native body pixels must be visible: " + ink);
        verify(outside > 80, "Native independent halos must extend outside body: " + outside);
        compare(glyph.maskRevision, revision);
        compare(glyph.textureUploads, uploads);
    }
    function test_seededChunksAndGuideSidesMatchSource() {
        const view = createPartita({
            preparedLines: [prepared("一二三四五六七八九十", 3.25, 6.25)],
            timeSeconds: 4
        });
        tryVerify(() => view.chunks.length === 5, 10000);
        compare(view.layout.columns.length, 1);
        compare(view.layout.columns[0].words.map(chunk => chunk.displayWords.map(word => word.text).join("")).join("|"), "一|二|三四五|六七|八九十");
        wait(600);
        compare(view.chunks[0].chunkStatus, "passed");
        compare(view.chunks[2].chunkStatus, "active");
        compare(view.chunks[4].chunkStatus, "waiting");
        compare(view.chunks[0].guideRight, false);
        compare(view.chunks[1].guideRight, true);
        verify(view.chunks[0].guideValue > .99);
        compare(view.chunks[4].guideValue, 0);
        compare(view.chunks[0].verticalGuide.width, 1);
        compare(view.chunks[0].verticalGuide.height, 32);
        compare(view.chunks[1].horizontalGuide.width, view.chunks[1].width + 36);
        view.timeSeconds = 6;
        wait(650);
        waitForRendering(view);
        grabImage(view).save("build/folia-native-qml/partita-guides.png");
        view.settings = Object.assign({}, view.settings, {
            partitaShowGuideLines: false
        });
        tryVerify(() => view.chunks.every(chunk => !chunk.verticalGuide.visible && !chunk.horizontalGuide.visible));
        compare(view.errorString, "");
    }
    function test_savedSemanticWordsAndDensityControlsNativeLayout() {
        const line = prepared("一二三四五六七八九十", 3.25, 6.25, ["一二三四五", "六七八九十"]);
        line.line.wordSegments = ["一二三四五", "六七八九十"];
        line.line.autoWordSegments = Array.from("一二三四五六七八九十");
        compare(line.layoutUnits.length, 2, JSON.stringify(line));
        const view = createPartita({
            preparedLines: [line],
            timeSeconds: 4
        });
        compare(view.tuning.useSemanticLayout, true);
        compare(Array.isArray(view.currentPrepared.line.autoWordSegments), true, "The source boundary list must remain a JS array");
        compare(Array.isArray(view.currentPrepared.line.wordSegments), true);
        compare(PartitaLayout.getOrBuildPartitaLayout(new Map(), line.line, {
            animationIntensity: "normal",
            fontWeight: null
        }, 820, PartitaLayout.resolvePartitaTuning()).columns[0].words.length, 2, "A direct pure-module call must preserve prepared semantics");
        compare(view.layout.columns[0].words.length, 2, JSON.stringify({
            cache: Array.from(view._cache.keys()),
            line: view.currentPrepared.line,
            tuning: view.tuning
        }));
        tryCompare(view, "chunkCount", 2, 10000);
        view.settings = Object.assign({}, view.settings, {
            partitaUseSemanticLayout: false
        });
        tryCompare(view, "chunkCount", 5, 10000);
        view.settings = Object.assign({}, view.settings, {
            partitaStaggerMin: 30,
            partitaStaggerMax: 30,
            fontWeight: 500
        });
        tryVerify(() => view.chunks.every(chunk => Math.abs(chunk.chunk.config.x) === 30), 10000);
        for (const chunk of view.chunks)
            compare(chunk.glyphRenderer.runs[0].weight, 500);
        compare(view.errorString, "");
        view.width = 320;
        view.preparedLines = [prepared("一".repeat(41), 0, 8)];
        view.timeSeconds = 1;
        tryVerify(() => view.renderer && view.renderer.runs[0].size === 32, 10000);
        compare(view.layout.totalGraphemes, 41);
    }
    function test_pausedChunkEntryBreathingAndBoundedSeekExitUseWallClock() {
        const lines = [];
        for (let index = 0; index < 8; index++)
            lines.push(prepared("第" + index, index * 4, index * 4 + 3));
        const view = createPartita({
            preparedLines: lines,
            timeSeconds: 1
        });
        tryVerify(() => view.renderer !== null, 10000);
        const clock = view._ambientSeconds;
        const time = view.timeSeconds;
        tryVerify(() => view._ambientSeconds > clock + .1, 2000);
        compare(view.timeSeconds, time);
        verify(view._breathing.y !== 0);
        for (let index = 1; index < 8; index++) {
            view.currentIndex = index;
            tryVerify(() => view.renderer && view.renderer.parent.prepared.line.fullText === "第" + index, 10000);
            verify(view.layerCount <= 4);
        }
        tryCompare(view, "layerCount", 1, 2000);
        compare(view.timeSeconds, time);
        view.settings = Object.assign({}, view.settings, {
            showText: false
        });
        tryCompare(view, "layerCount", 0, 2000);
        view.settings = Object.assign({}, view.settings, {
            showText: true
        });
        tryCompare(view, "layerCount", 1, 10000);
        view.live = false;
        compare(view.layerCount, 0);
        compare(view.layoutCacheSize, 0);
        const frozen = view._ambientSeconds;
        wait(80);
        compare(view._ambientSeconds, frozen);
        view.live = true;
        tryCompare(view, "layerCount", 1, 10000);
    }
    function test_preheatAndUnicodeDoNotRebuildExistingNativeWords() {
        const view = createPartita({
            preparedLines: [prepared("fi👩🏽‍🚀", 0, 4), prepared("下一行", 5, 8)],
            timeSeconds: 3.7
        });
        tryVerify(() => view.renderer && view.renderer.metrics.length > 0, 10000);
        const glyph = view.renderer;
        const revision = glyph.maskRevision;
        view.timeSeconds = 3.81;
        tryVerify(() => view.layoutCacheSize >= 2);
        const cached = Array.from(view._cache.values()).find(layout => layout.columns[0].id === "column-5-0");
        verify(cached);
        for (let frame = 0; frame < 20; frame++)
            view.timeSeconds = 3.82 + frame / 60;
        compare(Array.from(view._cache.values()).find(layout => layout.columns[0].id === "column-5-0"), cached);
        compare(view.renderer, glyph);
        compare(glyph.maskRevision, revision);
        for (const pose of glyph.poses) {
            const metric = glyph.metrics.find(item => item.key === pose.key);
            verify(metric.graphemes.some(part => part.clusterStart === pose.start));
        }
        compare(view.errorString, "");
    }
    function test_disabledMotionDropsExitsAndClassicSettingsCannotDisablePartitaRotation() {
        const view = createPartita({
            motionEnabled: false,
            preparedLines: [prepared("世界", 0, 4), prepared("明天", 4, 8)],
            settings: {
                animationIntensity: "chaotic",
                classicEnableWordRotation: false,
                classicBreathingFloatMultiplier: 0
            },
            timeSeconds: 1
        });
        tryCompare(view, "layerCount", 1, 10000);
        verify(view.chunks[0].wordConfigs.some(config => config.rotate !== 0));
        view.currentIndex = 1;
        compare(view.layerCount, 1);
        view.settings = Object.assign({}, view.settings, {
            showText: false
        });
        compare(view.layerCount, 0);
    }
    function test_chorusRippleAndKeywordGuideUseRealActiveColor() {
        const line = prepared("M", 0, 4);
        line.line.isChorus = true;
        const view = createPartita({
            preparedLines: [line],
            settings: {
                animationIntensity: "normal",
                wordColors: [
                    {
                        word: "M",
                        color: "#44ff88"
                    }
                ]
            }
        });
        tryVerify(() => view.chunks.length === 1 && view.renderer !== null, 10000);
        const chunk = view.chunks[0];
        compare(chunk.guideActiveColor, Qt.color("#44ff88"));
        const chorus = findChild(chunk, "partitaChorusWords");
        verify(chorus);
        compare(chorus.count, 1);
        const ripple = chorus.itemAt(0);
        verify(ripple.rippleScale >= 1.5 && ripple.rippleScale < 3.5);
        tryVerify(() => ripple.visible, 300);
        const circle = findChild(ripple, "partitaChorusRipple");
        verify(circle);
        compare(circle.width, chunk.pixelSize * 1.22 * 1.5);
        compare(circle.border.color, Qt.color("#44ff88"));
        wait(600);
        compare(ripple.visible, false);
        compare(view.errorString, "");
    }
}
