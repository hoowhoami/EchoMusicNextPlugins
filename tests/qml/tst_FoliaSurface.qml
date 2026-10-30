import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: testCase
    name: "FoliaSurface"
    width: 80
    height: 80
    visible: true
    when: windowShown
    Component {
        id: scene
        Rectangle {
            width: 80
            height: 80
            color: "black"
            property alias surface: surface
            VisualizerSurface {
                id: surface
                anchors.fill: parent
                Rectangle {
                    anchors.fill: parent
                    color: "red"
                }
                Rectangle {
                    anchors.fill: parent
                    color: "blue"
                    opacity: .5
                }
            }
        }
    }
    function test_opacityCompositesTheWholeBackdropAndStyleOnce() {
        const view = createTemporaryObject(scene, testCase);
        verify(view);
        view.surface.opacity = .5;
        verify(waitForRendering(view));
        const capture = grabImage(view);
        verify(Math.abs(capture.red(40, 40) - 64) <= 2);
        compare(capture.green(40, 40), 0);
        verify(Math.abs(capture.blue(40, 40) - 64) <= 2);
        view.surface.opacity = 1;
        verify(waitForRendering(view));
        const full = grabImage(view);
        verify(Math.abs(full.red(40, 40) - 127) <= 2);
        verify(Math.abs(full.blue(40, 40) - 128) <= 2);
        compare(view.surface.layer.enabled, false);
    }
    function test_hiddenSurfaceRetiresTheExtraCompositionTarget() {
        const view = createTemporaryObject(scene, testCase);
        view.surface.opacity = .2;
        compare(view.surface.layer.enabled, true);
        view.surface.visible = false;
        compare(view.surface.layer.enabled, false);
        view.surface.visible = true;
        compare(view.surface.layer.enabled, true);
    }
}
