// Folia usePlayerChromeAutoHide.ts, a8da4437 (AGPL-3.0).
// A page-owned one-shot timer; this policy owns no persisted preference.
pragma ComponentBehavior: Bound
import QtQuick

QtObject {
    id: root
    property bool active: true
    property string mode: "always-visible"
    property bool suppressPointerReveal: false
    property bool pointerHeld: false
    property bool idleHidden: false
    readonly property bool hidden: mode === "always-hidden" || (mode === "auto-hide" && (suppressPointerReveal || idleHidden))
    readonly property bool pending: timeout.running
    readonly property int delay: timeout.interval
    property Timer timeout: Timer {
        interval: 3000
        repeat: false
        onTriggered: if (root.acceptsActivity() && !root.pointerHeld)
            root.idleHidden = true
    }

    function acceptsActivity(): bool {
        return active && mode === "auto-hide" && !suppressPointerReveal;
    }
    function schedule(milliseconds: int): void {
        timeout.stop();
        if (!acceptsActivity() || pointerHeld)
            return;
        timeout.interval = milliseconds;
        timeout.start();
    }
    function activity(): void {
        if (!acceptsActivity())
            return;
        idleHidden = false;
        schedule(3000);
    }
    function pointerPressed(): void {
        if (!acceptsActivity())
            return;
        pointerHeld = true;
        timeout.stop();
        idleHidden = false;
    }
    function pointerReleased(): void {
        pointerHeld = false;
        activity();
    }
    function pointerMoved(buttons: int): void {
        if (pointerHeld && buttons === Qt.NoButton)
            pointerHeld = false;
        activity();
    }
    function pointerLeft(): void {
        schedule(300);
    }
    function windowBlurred(): void {
        pointerHeld = false;
        schedule(300);
    }
    function reset(): void {
        timeout.stop();
        pointerHeld = false;
        idleHidden = false;
        activity();
    }
    onActiveChanged: reset()
    onModeChanged: reset()
    onSuppressPointerRevealChanged: reset()
    Component.onCompleted: reset()
}
