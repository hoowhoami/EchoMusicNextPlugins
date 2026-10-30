import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: testCase
    name: "FoliaColorBlend"
    when: windowShown
    Component {
        id: blend
        ColorBlend {
            targetColor: "black"
            durationMs: 120
        }
    }
    function test_initialAndInterruptedColorsStartFromActuallyDrawnValue() {
        const view = createTemporaryObject(blend, testCase);
        compare(view.value, Qt.color("black"));
        view.targetColor = "white";
        wait(45);
        verify(view.value.r > 0 && view.value.r < 1);
        const previous = view.value.r;
        view.targetColor = "black";
        verify(Math.abs(view.value.r - previous) < .01);
        wait(180);
        compare(view.value, Qt.color("black"));
    }
    function test_hiddenAndReducedMotionSnapAndStopNativeTransition() {
        const view = createTemporaryObject(blend, testCase);
        view.targetColor = "white";
        wait(45);
        verify(view.value.r > 0 && view.value.r < 1);
        view.live = false;
        compare(view.value, Qt.color("white"));
        view.targetColor = "black";
        wait(150);
        compare(view.value, Qt.color("black"));
        view.live = true;
        view.motionEnabled = false;
        view.targetColor = "white";
        compare(view.value, Qt.color("white"));
    }
}
