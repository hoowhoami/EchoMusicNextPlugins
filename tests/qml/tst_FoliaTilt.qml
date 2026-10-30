import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared/text/prepare.mjs" as Prepare

TestCase {
    id: testCase
    name: "FoliaTilt"
    when: windowShown
    visible: true
    width: 1100
    height: 820
    Rectangle {
        anchors.fill: parent
        color: "#080b14"
        z: -1
    }

    function prepared(text, start, end) {
        const words = Array.from(text).map((char, index, chars) => ({
                    text: char,
                    startTime: start + index * (end - start) / chars.length,
                    endTime: start + (index + 1) * (end - start) / chars.length
                }));
        return Prepare.prepareLines([
            {
                fullText: text,
                startTime: start,
                endTime: end,
                words,
                autoWordSegments: words.map(word => word.text)
            }
        ], [], null).lines[0];
    }
    function createTilt(values) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/tilt/Tilt.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, Object.assign({
            width: 1100,
            height: 820,
            preparedLines: [prepared("M", 1, 4)],
            currentIndex: 0,
            timeSeconds: 1.2,
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 40
            }),
            primaryColor: "white",
            accentColor: "#ff4f86",
            textService: foliaTestTextService,
            settings: {
                tiltSplitProbability: 0,
                tiltStyleProbability: 0,
                tiltColorScheme: "default",
                lyricsFontScale: 1
            }
        }, values || {}));
    }
    function test_nativeMeasuredLayoutAndGpuPixelsKeepMasksDuringPulse() {
        const view = createTilt();
        verify(view);
        tryVerify(() => view.renderer !== null && view.renderer.metrics.length === 1, 10000);
        tryVerify(() => view.renderer.textureUploads > 0 && view.renderer.renderBatches > 0, 5000);
        wait(700);
        compare(view.errorString, "");
        verify(view.renderer.opacity > .99, JSON.stringify({
            opacity: view.renderer.opacity,
            clock: view._wallSeconds,
            linePose: view.renderer.linePose,
            poses: view.renderer.poses
        }));
        compare(view.renderer.font.family, "Menlo");
        compare(view.renderer.font.weight, 400);
        compare(view.renderer.runs[0].maxBlur, 0);
        compare(view.renderer.runs[0].maxHaloRadius, 0);
        const preparation = findChild(view, "foliaTiltPreparation");
        compare(findChild(preparation, "tiltNormalMeasure").cacheBytes, 0);
        compare(findChild(preparation, "tiltItalicMeasure").cacheBytes, 0);
        const revision = view.renderer.maskRevision;
        const uploads = view.renderer.textureUploads;
        const layoutRevision = view.layoutRevision;
        const poses = JSON.stringify(view.renderer.poses);
        for (let frame = 0; frame < 20; frame++) {
            view.timeSeconds = 1.3 + frame / 60;
            wait(2);
        }
        verify(JSON.stringify(view.renderer.poses) !== poses);
        compare(view.renderer.maskRevision, revision);
        compare(view.renderer.textureUploads, uploads);
        compare(view.layoutRevision, layoutRevision);
        wait(200);
        view.primaryColor = "#4fe6b0";
        tryVerify(() => String(view.renderer.poses[0].color) === String(view.primaryColor));
        compare(view.renderer.maskRevision, revision);
        view.primaryColor = "white";
        tryVerify(() => String(view.renderer.poses[0].color) === String(view.primaryColor));
        waitForRendering(view);
        const image = grabImage(view);
        image.save("build/folia-native-qml/tilt-body.png");
        let ink = 0;
        for (let y = 180; y < 620; y += 2)
            for (let x = 200; x < 900; x += 2)
                if (image.red(x, y) > 100)
                    ink++;
        verify(ink > 30, "Actual native glyph pixels must be visible: " + ink + " " + JSON.stringify({
            position: view.renderer.mapToItem(view, 0, 0),
            actorHeight: view.renderer.parent.height,
            actorY: view.renderer.parent.y,
            poses: view.renderer.poses,
            width: view.renderer.width,
            height: view.renderer.height,
            opacity: view.renderer.opacity,
            parentOpacity: view.renderer.parent.opacity,
            clock: view._wallSeconds
        }));
    }
    function test_rawIcuFragmentsPublishOnlyReadyAndRemainBounded() {
        verify(foliaTestTextService.available);
        const view = createTilt({
            preparedLines: [prepared("hello world beautiful night", 3.25, 10)],
            timeSeconds: 4,
            settings: {
                tiltSplitProbability: 1,
                tiltStyleProbability: 1
            }
        });
        compare(view.layout, null);
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        compare(view.layout.segments.length, 2);
        compare(view.layout.segments[0].text, "hello world");
        compare(view.layout.segments[1].text, "beautiful night");
        compare(view.layout.segments.filter(segment => segment.isTilt).length, 1);
        verify(view.fragmentCacheSize > 0 && view.fragmentCacheSize <= 32);
        verify(view.fragmentRequestCount > 0 && view.fragmentRequestCount <= 32);
        const generation = view.layoutRevision;
        const requests = view.fragmentRequestCount;
        for (let frame = 0; frame < 20; frame++)
            view.timeSeconds = 4 + frame / 60;
        wait(60);
        compare(view.layoutRevision, generation);
        compare(view.fragmentRequestCount, requests);
        compare(view.errorString, "");
        view.timeSeconds = 9.5;
        wait(1400);
        waitForRendering(view);
        grabImage(view).save("build/folia-native-qml/tilt-icu-layout.png");
    }
    function test_italicFontsColorsAndNativeUnicodeClusters() {
        const view = createTilt({
            preparedLines: [prepared("fi👩🏽‍🚀", 1, 4)],
            settings: {
                tiltSplitProbability: 0,
                tiltStyleProbability: 1,
                tiltColorScheme: "swap",
                fontWeight: null
            }
        });
        tryVerify(() => view.renderer && view.renderer.metrics.length === 1, 10000);
        wait(650);
        compare(view.renderer.font.italic, true);
        compare(view.renderer.font.weight, 300);
        compare(view.renderer.font.family, "Menlo");
        const allowed = view.renderer.metrics[0].graphemes.map(part => part.clusterStart);
        verify(view.renderer.poses.length < view.layout.segments[0].text.length);
        for (const pose of view.renderer.poses) {
            verify(allowed.indexOf(pose.start) >= 0);
            compare(pose.color, view.primaryColor);
        }
        compare(view.errorString, "");
        view.settings = {
            tiltSplitProbability: 0,
            tiltStyleProbability: 1,
            tiltColorScheme: "accentAll",
            fontWeight: 600
        };
        tryVerify(() => view.renderer && view.renderer.font.weight === 600, 10000);
        wait(650);
        compare(view.renderer.font.italic, true);
        for (const pose of view.renderer.poses)
            compare(pose.color, view.accentColor);
    }
    function test_pausedExitAndSeekAreWallClockAndInactiveScopeReleases() {
        const lines = [];
        for (let index = 0; index < 8; index++)
            lines.push(prepared("第" + index, index * 4, index * 4 + 3));
        const view = createTilt({
            preparedLines: lines,
            timeSeconds: 1
        });
        tryVerify(() => view.renderer !== null, 10000);
        wait(650);
        const time = view.timeSeconds;
        for (let index = 1; index < 8; index++) {
            view.currentIndex = index;
            tryVerify(() => view.renderer && view.renderer.parent.line.fullText === "第" + index, 10000);
            verify(view.layerCount <= 4);
        }
        tryVerify(() => view.layerCount === 1, 2000);
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
        tryCompare(view, "layerCount", 0);
        compare(view.layout, null);
        const requests = view.fragmentRequestCount;
        wait(100);
        compare(view.fragmentRequestCount, requests);
        view.live = true;
        tryCompare(view, "layerCount", 1, 10000);
    }
    function test_missingRealIcuIsVisibleAndNeverPublishesFallback() {
        const view = createTilt({
            textService: null,
            preparedLines: [prepared("hello world beautiful night", 3.25, 10)],
            timeSeconds: 4,
            settings: {
                tiltSplitProbability: 1,
                tiltStyleProbability: 1
            }
        });
        tryVerify(() => view.errorString.length > 0, 2000);
        compare(view.layout, null);
        compare(view.layerCount, 0);
        compare(view.busy, false);
    }
    function test_laterSegmentStartsItsOwnWallClockOnLookahead() {
        const view = createTilt({
            preparedLines: [prepared("天地，未来。", 1, 7)],
            timeSeconds: 1.2,
            settings: {
                tiltSplitProbability: 1,
                tiltStyleProbability: 0
            }
        });
        tryVerify(() => view.layout && view.renderers.length === 2, 10000);
        wait(800);
        compare(view.renderers[1].opacity, 0);
        view.timeSeconds = 3.75;
        verify(view.renderers[1].opacity < .01, "The later segment must begin from its waiting pose");
        wait(650);
        compare(view.timeSeconds, 3.75);
        verify(view.renderers[1].opacity > .99, "Paused song time must not freeze segment entry");
        view.timeSeconds = 2;
        wait(650);
        compare(view.renderers[1].opacity, 0);
        view.timeSeconds = 3.75;
        verify(view.renderers[1].opacity < .01);
        wait(650);
        verify(view.renderers[1].opacity > .99);
    }
    function test_retirementDuringRequestNotificationCancelsTheRealOperation() {
        const view = createTilt({
            preparedLines: [prepared("hello world beautiful night", 3.25, 10)],
            timeSeconds: 4,
            settings: {
                tiltSplitProbability: 1,
                tiltStyleProbability: 1
            }
        });
        const retire = function () {
            view.live = false;
        };
        view.fragmentRequestCountChanged.connect(retire);
        tryCompare(view, "live", false, 3000);
        const preparation = findChild(view, "foliaTiltPreparation");
        verify(preparation);
        compare(preparation._operation, null, "Retirement must not leave a new request after cancellation");
        compare(view.layout, null);
        compare(view.busy, false);
        compare(view.layerCount, 0);
        view.fragmentRequestCountChanged.disconnect(retire);
        const count = view.fragmentRequestCount;
        wait(100);
        compare(view.fragmentRequestCount, count);
        view.live = true;
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        compare(view.errorString, "");
    }
    function test_realFontOverflowResplitsAtNarrowViewport() {
        const view = createTilt({
            width: 320,
            preparedLines: [prepared("one two three four five six seven eight nine ten", 0, 12)],
            timeSeconds: 1,
            settings: {
                tiltSplitProbability: 0,
                tiltStyleProbability: 1
            }
        });
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        compare(view.layout.segments.length, 4);
        compare(view.layout.segments.filter(segment => segment.isTilt).length, 1);
        compare(view.layout.segments.map(segment => segment.text).join("|"), "one two three|four five|six seven|eight nine ten");
        verify(view.layout.scaleMultiplier >= .5 && view.layout.scaleMultiplier <= 1);
        compare(view.renderers.length, 4);
        compare(view.errorString, "");
        for (const renderer of view.renderers) {
            compare(renderer.font.family, "Menlo");
            compare(renderer.runs[0].maxBlur, 0);
            verify(renderer.metrics[0].width > 0);
        }
        view.timeSeconds = 11;
        wait(1300);
        waitForRendering(view);
        grabImage(view).save("build/folia-native-qml/tilt-narrow-layout.png");
    }
}
