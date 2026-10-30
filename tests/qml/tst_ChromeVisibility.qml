import QtQuick
import QtTest

TestCase {
    id: testCase
    name: "FoliaChromeVisibility"
    when: windowShown

    function createPolicy(values) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/shared/ChromeVisibility.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, values || {});
    }

    function test_persistedModesDoNotRevealOnPointerActivity() {
        const policy = createPolicy();
        verify(policy);
        compare(policy.hidden, false);
        compare(policy.pending, false);
        policy.mode = "always-hidden";
        verify(policy.hidden);
        policy.pointerMoved(Qt.NoButton);
        policy.pointerPressed();
        policy.pointerReleased();
        verify(policy.hidden);
        compare(policy.pending, false);
        policy.mode = "always-visible";
        policy.pointerLeft();
        policy.windowBlurred();
        compare(policy.hidden, false);
        compare(policy.pending, false);
    }

    function test_idleDelayAndHeldPointer() {
        const policy = createPolicy({
            mode: "auto-hide"
        });
        verify(policy);
        compare(policy.hidden, false);
        compare(policy.pending, true);
        compare(policy.delay, 3000);
        policy.pointerPressed();
        compare(policy.pointerHeld, true);
        compare(policy.pending, false);
        policy.pointerLeft();
        compare(policy.pending, false);
        policy.pointerReleased();
        compare(policy.pointerHeld, false);
        compare(policy.pending, true);
        compare(policy.delay, 3000);
        tryCompare(policy, "hidden", true, 3500);
        compare(policy.pending, false);
        policy.activity();
        compare(policy.hidden, false);
        compare(policy.pending, true);
    }

    function test_leaveBlurAndLostPointerRelease() {
        const policy = createPolicy({
            mode: "auto-hide"
        });
        verify(policy);
        policy.pointerLeft();
        compare(policy.delay, 300);
        tryCompare(policy, "hidden", true, 700);
        policy.pointerPressed();
        compare(policy.hidden, false);
        // A release outside the window may never deliver pointerReleased.
        policy.pointerMoved(Qt.NoButton);
        compare(policy.pointerHeld, false);
        compare(policy.pending, true);
        compare(policy.delay, 3000);
        policy.windowBlurred();
        compare(policy.delay, 300);
        tryCompare(policy, "hidden", true, 700);
    }

    function test_scopeSuspensionCancelsPendingWork() {
        const policy = createPolicy({
            mode: "auto-hide"
        });
        verify(policy);
        policy.pointerLeft();
        policy.active = false;
        compare(policy.pending, false);
        wait(350);
        compare(policy.hidden, false);
        policy.active = true;
        compare(policy.pending, true);
        compare(policy.delay, 3000);
        policy.suppressPointerReveal = true;
        compare(policy.hidden, true);
        compare(policy.pending, false);
        policy.pointerMoved(Qt.NoButton);
        policy.pointerPressed();
        compare(policy.hidden, true);
        compare(policy.pending, false);
        policy.suppressPointerReveal = false;
        compare(policy.hidden, false);
        compare(policy.pending, true);
    }
}
