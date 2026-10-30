import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/backgrounds/sora"

TestCase {
    id: testCase
    name: "FoliaSora"
    when: windowShown
    visible: true
    width: 800
    height: 400
    Component {
        id: scene
        Sora {
            width: 800
            height: 400
            motionEnabled: false
        }
    }
    function energy(image) {
        let pixels = 0, sum = 0;
        for (let y = 0; y < image.height; y++)
            for (let x = 0; x < image.width; x++) {
                const value = image.red(x, y) + image.green(x, y) + image.blue(x, y);
                sum += value;
                if (value > 10)
                    pixels++;
            }
        return {
            pixels,
            sum
        };
    }
    function test_actualGpuStarsAndBlankSetting() {
        const view = createTemporaryObject(scene, testCase);
        verify(view);
        waitForRendering(view);
        wait(60);
        compare(view.errorString, "");
        compare(view.particleCount, 150);
        const image = grabImage(view), stars = energy(image);
        image.save(foliaTestCaptureDir + "/sora-stars.png");
        verify(stars.pixels > 40 && stars.pixels < image.width * image.height * .1, "Source starfield is sparse and must produce actual RGB points");
        view.blank = true;
        waitForRendering(view);
        compare(energy(grabImage(view)).sum, 0);
        view.dark = false;
        waitForRendering(view);
        const white = grabImage(view);
        compare(white.red(100, 100), 255);
        compare(white.green(100, 100), 255);
        compare(white.blue(100, 100), 255);
        compare(view.renderer, null);
    }
    function test_nativeClockPauseHideAndReducedMotion() {
        const view = createTemporaryObject(scene, testCase, {
            motionEnabled: true
        });
        tryVerify(() => view.elapsedSeconds > 0);
        view.paused = true;
        const paused = view.elapsedSeconds;
        wait(100);
        compare(view.elapsedSeconds, paused);
        view.paused = false;
        tryVerify(() => view.elapsedSeconds > paused);
        view.live = false;
        const hidden = view.elapsedSeconds;
        wait(100);
        compare(view.elapsedSeconds, hidden);
        compare(view.renderer, null);
        view.live = true;
        view.motionEnabled = false;
        wait(100);
        compare(view.elapsedSeconds, hidden);
    }
    function test_staticMeshAndSurfaceBudget() {
        const view = createTemporaryObject(scene, testCase, {
            motionEnabled: true
        });
        verify(view);
        waitForRendering(view);
        const renderer = view.renderer;
        verify(renderer);
        const shader = renderer.children[0];
        verify(shader);
        const mesh = shader.mesh;
        if (shader.nativePoints) {
            compare(mesh.pointCount, 150);
            compare(mesh.vertexBytes, 2400);
            compare(mesh.errorString, "");
        }
        const before = view.elapsedSeconds;
        for (let frame = 0; frame < 120; frame++) {
            waitForRendering(view);
            compare(view.renderer, renderer);
            if (shader.nativePoints)
                compare(shader.mesh, mesh);
        }
        verify(view.elapsedSeconds > before);
        view.width = 8193;
        compare(view.sizeAccepted, false);
        tryCompare(view, "renderer", null);
        verify(view.errorString.length > 0);
        view.width = 800;
        tryVerify(() => view.renderer !== null);
        waitForRendering(view);
        compare(view.errorString, "");
        view.blank = true;
        tryCompare(view, "renderer", null);
    }
    function test_sourceReferenceFrames() {
        const view = createTemporaryObject(scene, testCase);
        for (const time of [0, 1, 3]) {
            view.elapsedSeconds = time;
            for (const mode of ["dark", "light", "blank-dark", "blank-light"]) {
                view.dark = mode.indexOf("light") < 0;
                view.primaryColor = view.dark ? "white" : "black";
                view.blank = mode.indexOf("blank") === 0;
                waitForRendering(view);
                wait(50);
                compare(view.errorString, "");
                const image = grabImage(view);
                image.save(foliaTestCaptureDir + "/sora-" + mode + "-t" + time + ".png");
            }
        }
    }
}
