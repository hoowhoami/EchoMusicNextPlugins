import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/backgrounds/latent"

TestCase {
    id: testCase
    name: "FoliaLatent"
    when: windowShown
    visible: true
    width: 800
    height: 400
    Component {
        id: backdrop
        Latent {
            width: 800
            height: 400
            motionEnabled: false
            backgroundColor: "#181e2b"
            primaryColor: "#fef5dd"
            secondaryColor: "#6489a6"
            accentColor: "#cc5974"
            coverColors: ["#d84f60", "#2244bb", "#608b37", "#edb344", "#962273", "#45c5b7"]
            settings: ({
                    latentOverlayEnabled: false
                })
        }
    }
    function imageDifference(a, b) {
        let sum = 0;
        for (let y = 8; y < a.height; y += 17)
            for (let x = 8; x < a.width; x += 17) {
                const c = a.pixel(x, y), d = b.pixel(x, y);
                sum += Math.abs(c.r - d.r) + Math.abs(c.g - d.g) + Math.abs(c.b - d.b);
            }
        return sum;
    }
    function test_nativePaperModesUseDifferentActualGpuPixels() {
        const view = createTemporaryObject(backdrop, testCase);
        verify(view);
        waitForRendering(view);
        wait(60);
        compare(view.errorString, "");
        const both = grabImage(view);
        both.save("build/folia-native-qml/latent-both.png");
        view.settings = {
            latentDisplayMode: "mesh",
            latentOverlayEnabled: false
        };
        waitForRendering(view);
        wait(40);
        const mesh = grabImage(view);
        mesh.save("build/folia-native-qml/latent-mesh.png");
        view.settings = {
            latentDisplayMode: "dithering",
            latentOverlayEnabled: false
        };
        waitForRendering(view);
        wait(40);
        const dithering = grabImage(view);
        dithering.save("build/folia-native-qml/latent-dithering.png");
        verify(imageDifference(both, mesh) > 10);
        verify(imageDifference(mesh, dithering) > 10);
        verify(view.budget.width * view.budget.height <= 1280 * 720 + 2000);
        const fixed = grabImage(view);
        wait(80);
        compare(imageDifference(fixed, grabImage(view)), 0);
    }
    function test_pinnedPaperReferenceFrames() {
        const view = createTemporaryObject(backdrop, testCase);
        verify(view);
        console.info("Latent native texture budget", JSON.stringify(view.budget), "screen DPR", Screen.devicePixelRatio);
        for (const time of [0, 1, 3]) {
            view._state = Object.assign({}, view._state, {
                meshTime: time * .3,
                ditherTime: time * .1,
                saturation: time === 0 ? 1 : 1.04,
                brightness: time === 0 ? 1 : .94
            });
            for (const mode of ["both", "mesh", "dithering"]) {
                view.settings = {
                    latentDisplayMode: mode,
                    latentOverlayEnabled: false
                };
                waitForRendering(view);
                wait(60);
                compare(view.errorString, "");
                const pixels = grabImage(view);
                verify(pixels.width >= 800 && pixels.height >= 400, "Reference captures must include the full 800 x 400 logical scene");
                pixels.save(foliaTestCaptureDir + "/latent-" + mode + "-t" + time + ".png");
            }
        }
    }
    function test_hiddenAndReducedMotionStopShaderTimeButPauseSlowsIt() {
        const view = createTemporaryObject(backdrop, testCase, {
            motionEnabled: true
        });
        tryVerify(() => view.meshTime > 0);
        const playing = view.meshTime;
        view.paused = true;
        wait(80);
        verify(view.meshTime > playing);
        view.live = false;
        const hidden = view.meshTime;
        wait(80);
        compare(view.meshTime, hidden);
        view.live = true;
        view.motionEnabled = false;
        wait(80);
        compare(view.meshTime, hidden);
    }
}
