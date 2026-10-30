import QtQuick
import QtTest

TestCase {
    id: testCase
    name: "FoliaPlayerCapsuleSpring"
    function createSpring() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/shared/PlayerCapsuleSpring.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, {
            targetValue: 48
        });
    }
    function test_physicalSpringAndReducedMotion() {
        const spring = createSpring();
        compare(spring.value, 48);
        compare(spring.stiffness, 280);
        compare(spring.damping, 24);
        spring.targetValue = 128;
        verify(spring.running);
        spring.advance(0.1);
        verify(spring.value > 48 && spring.value < 128);
        for (let i = 0; i < 150; ++i)
            spring.advance(1 / 120);
        verify(Math.abs(spring.value - 128) < 0.01);
        compare(spring.running, false);
        spring.enabled = false;
        spring.targetValue = 48;
        compare(spring.value, 48);
        compare(spring.running, false);
    }
    function test_motionIsIndependentOfRefreshRate() {
        const at60 = createSpring();
        const at120 = createSpring();
        at60.targetValue = 128;
        at120.targetValue = 128;
        for (let i = 0; i < 12; ++i)
            at60.advance(1 / 60);
        for (let j = 0; j < 24; ++j)
            at120.advance(1 / 120);
        verify(Math.abs(at60.value - at120.value) < 0.0001);
    }
}
