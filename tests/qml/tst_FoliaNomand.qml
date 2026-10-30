import QtQuick
import QtTest
import "../fixtures/nomand/webgl.mjs" as Browser

TestCase {
    id: testCase
    name: "FoliaNomand"
    when: windowShown
    visible: true
    width: 321
    height: 241

    function createView(effect, fixture, viewWidth, viewHeight) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/backgrounds/nomand/Nomand.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, {
            width: viewWidth || 320,
            height: viewHeight || 240,
            coverUrl: Qt.resolvedUrl("../fixtures/nomand/" + (fixture || "patches.png")),
            primaryColor: "#efeadd",
            secondaryColor: "#4d6877",
            accentColor: "#cc3366",
            backgroundColor: "#181e28",
            settings: {
                nomandEffect: effect,
                nomandOverlayEnabled: false
            }
        });
    }
    function ready(view) {
        wait(100);
        tryVerify(() => view.renderReady || view.errorString.length > 0, 10000);
        compare(view.errorString, "");
        verify(view.renderReady);
        wait(80);
    }
    function fingerprint(image) {
        let value = 0;
        for (let y = 3; y < image.height; y += 17)
            for (let x = 5; x < image.width; x += 19)
                value += image.red(x, y) * 3 + image.green(x, y) * 5 + image.blue(x, y) * 7;
        return value;
    }
    function test_allFiveOriginalShadersUseActualMetalAndRemainStatic() {
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
        const fingerprints = [];
        for (const effect of ["dithering", "fluted-glass", "paper-texture", "halftone-dots", "lens-distortion"]) {
            const view = createView(effect);
            ready(view);
            const image = grabImage(view), before = fingerprint(image);
            image.save("build/folia-tempera-native/nomand-" + effect + ".png");
            console.log("Nomand physical target", view.physicalSize, "grab", image.width, image.height);
            verify(before > 1000, effect + " must paint real image pixels");
            verify(fingerprints.indexOf(before) < 0, effect + " must preserve its own source shader");
            fingerprints.push(before);
            wait(100);
            compare(fingerprint(grabImage(view)), before, effect + " has speed/frame zero");
            compare(view.sourceTextureMipmap, ["fluted-glass", "paper-texture", "lens-distortion"].indexOf(effect) >= 0);
            view.live = false;
            compare(view.cacheBytes, 0);
            compare(view.renderer, null);
            view.destroy();
            wait(100);
        }
    }
    function test_originalHardwareWebGlPixelOracle_data() {
        return Browser.oracle.results.filter(reference => reference.pixelRatio === Math.max(1, Screen.devicePixelRatio)).map(reference => ({
                    tag: reference.effect + "/" + reference.fixture + "/" + reference.width + "x" + reference.height,
                    reference
                }));
    }
    function test_originalHardwareWebGlPixelOracle(data) {
        verify(/Metal/.test(Browser.oracle.renderer));
        const reference = data.reference;
        const view = createView(reference.effect, reference.fixture, reference.logicalWidth, reference.logicalHeight);
        ready(view);
        const pixels = grabImage(view);
        console.log("Nomand source dimensions", reference.fixture, view.renderer.imageWidth, view.renderer.imageHeight, view.renderer.statuses);
        compare(pixels.width, reference.width);
        compare(pixels.height, reference.height);
        pixels.save("build/folia-tempera-native/nomand-" + reference.effect + ".png");
        let maxError = 0, sum = 0, count = 0;
        for (const sample of reference.samples) {
            const actual = [pixels.red(sample.x, sample.y), pixels.green(sample.x, sample.y), pixels.blue(sample.x, sample.y)];
            for (let c = 0; c < 3; c++) {
                const error = Math.abs(actual[c] - sample.rgb[c]);
                maxError = Math.max(maxError, error);
                sum += error;
                count++;
            }
        }
        console.log("Original WebGL / Metal error", reference.effect, "mean", sum / count, "max", maxError);
        verify(maxError <= 3, reference.effect + " " + reference.fixture + " original image-fit/alpha/physical shader math: max " + maxError + " mean " + sum / count);
        view.live = false;
        view.destroy();
        wait(100);
    }
    function test_boundedPhysicalTargetAndThemeOverlay() {
        const view = createView("dithering");
        ready(view);
        compare(view.physicalSize, Qt.size(Math.round(320 * Math.max(1, Screen.devicePixelRatio)), Math.round(240 * Math.max(1, Screen.devicePixelRatio))));
        const plain = fingerprint(grabImage(view));
        view.settings = {
            nomandEffect: "dithering",
            nomandOverlayEnabled: true,
            nomandOverlayOpacity: 1
        };
        waitForRendering(view);
        const pixels = grabImage(view);
        compare(pixels.red(10, 10), 24);
        compare(pixels.green(10, 10), 30);
        compare(pixels.blue(10, 10), 40);
        verify(fingerprint(pixels) !== plain);
        view.width = 3840;
        view.height = 2160;
        compare(view.physicalSize, Qt.size(1920, 1080));
        verify(view.cacheBytes < 128 * 1024 * 1024);
        view.visible = false;
        compare(view.renderer, null);
        compare(view.cacheBytes, 0);
    }
    function test_realDecodeBudgetAndFailuresRemainVisible() {
        const view = createView("dithering", "wide.png");
        ready(view);
        compare(view.renderer.imageWidth, 4096);
        compare(view.renderer.imageHeight, 32);
        verify(view.cacheBytes < 4 * 1024 * 1024);
        view.width = 50000;
        view.height = 1;
        compare(view.renderer, null);
        verify(view.errorString.length > 0);
        compare(view.cacheBytes, 0);
        view.width = 320;
        view.height = 240;
        view.coverUrl = Qt.resolvedUrl("../fixtures/nomand/absent.png");
        tryVerify(() => view.errorString.length > 0, 5000);
        compare(view.renderReady, false);
        compare(view.cacheBytes, 0);
        view.live = false;
        compare(view.renderer, null);
    }
    function test_sourceSelectionInversionAndNoLateHiddenPublication() {
        const view = createView("dithering");
        ready(view);
        const baseline = fingerprint(grabImage(view));
        view.settings = {
            nomandEffect: "dithering",
            nomandOverlayEnabled: false,
            nomandInverted: true
        };
        waitForRendering(view);
        verify(fingerprint(grabImage(view)) !== baseline);
        view.backgroundImageUrl = Qt.resolvedUrl("../fixtures/tempera/red-blue.gif");
        view.settings = {
            nomandImageSource: "uploaded-global",
            nomandEffect: "dithering",
            nomandOriginalColors: true,
            nomandOverlayEnabled: false
        };
        ready(view);
        compare(String(view.sourceUrl), String(view.backgroundImageUrl));
        const first = fingerprint(grabImage(view));
        wait(400);
        compare(fingerprint(grabImage(view)), first);
        view.coverUrl = Qt.resolvedUrl("../fixtures/nomand/mipmap.png");
        view.settings = {
            nomandImageSource: "cover-derived"
        };
        view.live = false;
        wait(100);
        compare(view.renderer, null);
        compare(view.cacheBytes, 0);
        compare(view.renderReady, false);
    }
}
