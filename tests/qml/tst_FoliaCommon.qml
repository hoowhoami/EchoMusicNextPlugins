import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/backgrounds/common"

TestCase {
    id: testCase
    name: "FoliaCommon"
    when: windowShown
    visible: true
    width: 800
    height: 640
    Rectangle {
        anchors.fill: parent
        color: "white"
        z: -1
    }
    Component {
        id: geometryComponent
        Geometric {
            width: 800
            height: 400
            secondaryColor: "red"
            accentColor: "blue"
        }
    }
    Component {
        id: blurComponent
        BlurredCover {
            width: 800
            height: 400
            primaryColor: "transparent"
            secondaryColor: "transparent"
        }
    }
    function init() {
        failOnWarning(/TypeError:|QML.*(assign|non-existent)|ShaderEffect.*(Error|null)/);
    }
    function test_realGeometryVignettePauseAndRelease() {
        const view = createTemporaryObject(geometryComponent, testCase);
        verify(view);
        compare(view.shapeCount, 15);
        compare(view.particleCount, 20);
        tryVerify(() => view.elapsedSeconds > 0, 3000);
        compare(view.errorString, "");
        view.paused = true;
        const held = view.elapsedSeconds;
        wait(100);
        compare(view.elapsedSeconds, held);
        view.hideShapes = true;
        waitForRendering(view);
        const image = grabImage(view);
        const scale = image.width / view.width;
        verify(image.red(400 * scale, 200 * scale) > 245);
        verify(image.red(2 * scale, 2 * scale) < 120, "CSS farthest-corner vignette must reach alpha .6");
        view.disableVignette = true;
        waitForRendering(view);
        const clear = grabImage(view);
        verify(clear.red(2 * scale, 2 * scale) > 245);
        view.hideShapes = false;
        view.live = false;
        compare(view.shapeCount, 0);
        compare(view.particleCount, 0);
    }
    function test_sourceSizedGaussianIsStaticAndRetiresItsTextures() {
        const view = createTemporaryObject(blurComponent, testCase, {
            source: Qt.resolvedUrl("../fixtures/common/authored-cover.png")
        });
        verify(view);
        tryVerify(() => view.ready || !!view.errorString, 10000);
        compare(view.errorString, "");
        verify(view.ready);
        compare(view.bufferWidth, 320);
        compare(view.bufferHeight, 160);
        compare(view.sigma, 24);
        verify(view.fboBytes > 0 && view.fboBytes < 1024 * 1024);
        verify(view.plannedBytes < 32 * 1024 * 1024);
        waitForRendering(view);
        const image = grabImage(view), scale = image.width / view.width;
        image.save("build/folia-common-native-blur.png");
        verify(image.red(100 * scale, 200 * scale) > 200 && image.blue(100 * scale, 200 * scale) < 30);
        verify(image.blue(700 * scale, 200 * scale) > 200 && image.red(700 * scale, 200 * scale) < 30);
        verify(image.red(400 * scale, 200 * scale) > 80 && image.blue(400 * scale, 200 * scale) > 80, "Source blur must really mix the central red/blue edge");
        const baked = view.bakeCount;
        for (let i = 0; i < 120; ++i) {
            view.primaryColor = i % 2 ? "#667799" : "#998877";
            waitForRendering(view);
        }
        compare(view.bakeCount, baked, "Changing the theme must not rebake or upload a viewport bitmap");
        view.live = false;
        compare(view.fboBytes, 0);
        compare(view.ready, false);
        const rejected = createTemporaryObject(blurComponent, testCase, {
            width: 10,
            source: Qt.resolvedUrl("../fixtures/common/authored-cover.png")
        });
        verify(rejected.errorString.indexOf("budget") >= 0);
        compare(rejected.fboBytes, 0);
    }
    function test_sourceCanvasPairs_data() {
        return [
            {
                tag: "landscape-clear",
                width: 800,
                height: 400,
                primary: "transparent",
                secondary: "transparent"
            },
            {
                tag: "landscape-overlay",
                width: 800,
                height: 400,
                primary: "#ff9966",
                secondary: "#6699ff"
            },
            {
                tag: "portrait-clear",
                width: 320,
                height: 640,
                primary: "transparent",
                secondary: "transparent"
            },
            {
                tag: "portrait-overlay",
                width: 320,
                height: 640,
                primary: "#ff9966",
                secondary: "#6699ff"
            }
        ];
    }
    function test_sourceCanvasPairs(data) {
        const view = createTemporaryObject(blurComponent, testCase, {
            width: data.width,
            height: data.height,
            primaryColor: data.primary,
            secondaryColor: data.secondary,
            source: Qt.resolvedUrl("../fixtures/common/authored-cover.png")
        });
        tryVerify(() => view.ready || !!view.errorString, 10000);
        compare(view.errorString, "");
        waitForRendering(view);
        // Window grabs clip a tall portrait on a Retina screen's available
        // desktop. Grab the actual native item at its full logical size/DPR.
        const dpr = view.Screen.devicePixelRatio;
        let saved = false;
        verify(view.grabToImage(result => {
            saved = result.saveToFile("build/folia-common-reference/native/" + data.tag + "-dpr" + dpr + ".png");
        }));
        tryVerify(() => saved, 10000);
    }
    Component {
        id: fluidComponent
        Fluid {
            width: 800
            height: 400
            primaryColor: "transparent"
            secondaryColor: "transparent"
        }
    }
    Component {
        id: geometricLayersComponent
        GeometricLayers {
            width: 800
            height: 400
        }
    }
    function test_fluidDecodeBeforeStackAndSeedExitStayBounded() {
        const cover = Qt.resolvedUrl("../fixtures/common/authored-cover.png");
        const fluid = createTemporaryObject(fluidComponent, testCase, {
            coverUrl: cover
        });
        tryVerify(() => fluid.layerCount === 1 && fluid._actors[0].ready, 10000);
        compare(fluid._actors[0].opacity, 1);
        for (let i = 0; i < 5; ++i) {
            fluid.coverUrl = String(cover) + "?source=" + i;
            tryVerify(() => fluid._actors[fluid.layerCount - 1].ready, 10000);
            verify(fluid.layerCount <= 2);
        }
        tryCompare(fluid, "layerCount", 1, 2500);
        fluid.coverUrl = "file:///folia-test-missing-cover.png";
        tryVerify(() => !!fluid.errorString, 5000);
        compare(fluid.layerCount, 1);
        fluid.live = false;
        compare(fluid.layerCount, 0);
        compare(fluid.fboBytes, 0);
        const geometry = createTemporaryObject(geometricLayersComponent, testCase);
        compare(geometry.layerCount, 1);
        for (let i = 0; i < 8; ++i) {
            geometry.seed = String(i);
            verify(geometry.layerCount <= 2);
        }
        tryCompare(geometry, "layerCount", 1, 1000);
        geometry.live = false;
        compare(geometry.layerCount, 0);
    }
}
