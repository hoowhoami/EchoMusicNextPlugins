import QtQuick
import QtTest

TestCase {
    id: testCase
    name: "FoliaPlayerCapsuleState"
    when: windowShown

    function createState(values) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/shared/PlayerCapsuleState.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, values || {});
    }

    function test_hoverDelaysAndReentry() {
        const state = createState({
            hasTrack: true,
            playing: true,
            durationMs: 1000
        });
        compare(state.expanded, false);
        state.pointerEntered();
        compare(state.expandDelay, 20);
        compare(state.expanded, false);
        tryCompare(state, "expanded", true, 100);
        state.pointerLeft();
        compare(state.collapseDelay, 100);
        wait(40);
        verify(state.expanded);
        state.pointerEntered();
        wait(110);
        verify(state.expanded);
        state.pointerLeft();
        tryCompare(state, "expanded", false, 250);
        state.pointerEntered();
        state.pointerLeft();
        wait(30);
        compare(state.expanded, false);
    }

    function test_pauseAndHomeExpansionRules() {
        const state = createState({
            hasTrack: true,
            durationMs: 1000,
            playing: true
        });
        compare(state.expanded, false);
        state.playing = false;
        verify(state.expanded);
        state.durationMs = 0;
        compare(state.expanded, false);
        state.durationMs = 1000;
        state.currentView = "home";
        compare(state.expanded, false);
        state.currentView = "player";
        verify(state.expanded);
        state.hasTrack = false;
        compare(state.expanded, false);
    }

    function test_responsiveCapsuleAndHoverBuffer() {
        const state = createState({
            viewportWidth: 1000,
            viewportHeight: 1000
        });
        compare(state.expandedWidth, 480);
        compare(state.collapsedWidth, 288);
        compare(state.wideLayout, true);
        compare(state.hoverBuffer, 32);
        state.savedOffset = 48;
        compare(state.hoverBuffer, 16);
        state.savedOffset = 64;
        compare(state.hoverBuffer, 0);
        state.viewportWidth = 600;
        compare(state.expandedWidth, 480);
        compare(state.collapsedWidth, 384);
        compare(state.wideLayout, false);
        state.viewportWidth = 360;
        compare(state.expandedWidth, 328);
        state.currentView = "home";
        compare(state.expandedWidth, 240);
    }

    function test_positioningClampCommitAndCancel() {
        const state = createState({
            hasTrack: true,
            viewportHeight: 1000,
            savedOffset: 60
        });
        compare(state.maxOffset, 368);
        compare(state.liveOffset, 60);
        verify(state.startPositioning());
        verify(state.expanded);
        compare(state.controlsEnabled, false);
        state.dragStarted(500);
        state.dragMoved(100);
        compare(state.liveOffset, 368);
        state.dragMoved(900);
        compare(state.liveOffset, 32);
        state.dragEnded();
        state.cancelPositioning();
        compare(state.liveOffset, 60);
        verify(state.startPositioning());
        state.dragStarted(500);
        state.dragMoved(400.4);
        compare(state.liveOffset, 160);
        compare(state.commitPositioning(), 160);
        compare(state.positioning, false);
        compare(state.liveOffset, 160);
        state.savedOffset = 160;
        state.viewportHeight = 200;
        compare(state.maxOffset, 32);
        compare(state.liveOffset, 32);
        compare(state.clampOffset(NaN), 32);
        compare(state.clampOffset(Infinity), 32);
    }

    function test_positioningCancelsWhenPageDisappears() {
        const state = createState({
            hasTrack: true,
            viewportHeight: 1000,
            savedOffset: 64
        });
        verify(state.startPositioning());
        state.dragStarted(500);
        state.dragMoved(400);
        state.hideControlBar = true;
        compare(state.positioning, false);
        compare(state.liveOffset, 64);
        state.hideControlBar = false;
        verify(state.startPositioning());
        state.currentView = "home";
        compare(state.positioning, false);
        compare(state.startPositioning(), false);
        state.currentView = "player";
        verify(state.startPositioning());
        state.active = false;
        compare(state.positioning, false);
        compare(state.expandPending, false);
        compare(state.collapsePending, false);
    }
}
