import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: testCase
    name: "FoliaTransitionFrame"
    visible: true
    width: 400
    height: 300
    when: windowShown
    Component {
        id: scene
        Rectangle {
            id: view
            width: 400
            height: 300
            color: "black"
            property alias frame: frame
            Item {
                id: content
                anchors.fill: parent
                Rectangle {
                    anchors.centerIn: parent
                    width: 40
                    height: 40
                    color: "white"
                }
            }
            LayerTransitionFrame {
                id: frame
                anchors.fill: parent
                sourceItem: content
            }
        }
    }
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|ShaderEffect.*(Error|null)|Unable to assign/);
    }
    function test_gaussianSpreadOpacityAndNativeBufferRelease() {
        const view = createTemporaryObject(scene, testCase);
        verify(view);
        compare(view.frame.plannedBytes, 0);
        view.frame.progress = .5;
        compare(view.frame.scale, 1.01);
        verify(view.frame.plannedBytes > 0);
        verify(waitForRendering(view));
        const image = grabImage(view), d = image.width / view.width;
        // The 50% look is one flattened white shape, with a real Gaussian tail.
        verify(Math.abs(image.red(200 * d, 150 * d) - 128) <= 3);
        verify(image.red(224 * d, 150 * d) > 1 && image.red(224 * d, 150 * d) < 50);
        compare(view.frame.errorString, "");
        view.frame.progress = 1;
        compare(view.frame.plannedBytes, 0);
        verify(waitForRendering(view));
        const rest = grabImage(view);
        compare(rest.red(200 * d, 150 * d), 255);
        compare(rest.red(224 * d, 150 * d), 0);
    }
    function test_interruptedAndHiddenFramesDoNotKeepTheTemporaryTargets() {
        const view = createTemporaryObject(scene, testCase);
        for (let i = 0; i < 24; ++i) {
            view.frame.progress = .3;
            verify(view.frame.plannedBytes > 0);
            view.frame.live = false;
            compare(view.frame.plannedBytes, 0);
            view.frame.live = true;
        }
        view.frame.visible = false;
        compare(view.frame.plannedBytes, 0);
    }
}
