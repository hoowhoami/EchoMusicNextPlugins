// Folia FloatingPlayerControls and playerBottomBarLayout, a8da4437 (AGPL-3.0).
// Presentation state only; playback and persisted values belong to the host.
pragma ComponentBehavior: Bound
import QtQuick

QtObject {
    id: root
    property bool active: true
    property bool hasTrack: false
    property bool playing: false
    property real durationMs: 0
    property string currentView: "player"
    property bool hideControlBar: false
    property bool chromeHidden: false
    property real viewportWidth: 0
    property real viewportHeight: 0
    property real savedOffset: 32
    property bool hovered: false
    property bool positioning: false
    property real liveOffset: 32
    property real startOffset: 32
    property real dragOriginY: 0
    property real dragOriginOffset: 32
    property bool dragging: false
    readonly property bool expanded: positioning || hovered || (hasTrack && durationMs > 0 && !playing && currentView !== "home")
    readonly property bool controlsEnabled: active && hasTrack && !positioning && !chromeHidden && !hideControlBar
    readonly property bool available: active && hasTrack && !hideControlBar
    readonly property bool wideLayout: viewportWidth >= 640
    readonly property real expandedWidth: Math.max(0, currentView === "home" ? Math.min(viewportWidth - 120, viewportWidth >= 768 ? 512 : viewportWidth - 120) : Math.min(512, viewportWidth) - 32)
    readonly property real collapsedWidth: expandedWidth * (viewportWidth >= 768 ? 0.6 : 0.8)
    readonly property real hoverBuffer: Math.max(0, Math.round(32 - (savedOffset - 32)))
    readonly property int maxOffset: Number.isFinite(viewportHeight) && viewportHeight > 0 ? Math.max(32, Math.round(viewportHeight / 2 - 132)) : 32
    readonly property int expandDelay: 20
    readonly property int collapseDelay: 100
    readonly property bool expandPending: expandTimer.running
    readonly property bool collapsePending: collapseTimer.running
    property Timer expandTimer: Timer {
        interval: root.expandDelay
        onTriggered: root.hovered = true
    }
    property Timer collapseTimer: Timer {
        interval: root.collapseDelay
        onTriggered: root.hovered = false
    }

    function clampOffset(value: real): int {
        return Number.isFinite(value) ? Math.min(maxOffset, Math.max(32, Math.round(value))) : 32;
    }
    function syncOffset(): void {
        if (!positioning)
            liveOffset = clampOffset(savedOffset);
    }
    function pointerEntered(): void {
        if (!available || chromeHidden)
            return;
        collapseTimer.stop();
        if (!expandTimer.running)
            expandTimer.start();
    }
    function pointerLeft(): void {
        expandTimer.stop();
        if (hovered && !collapseTimer.running)
            collapseTimer.start();
    }
    function startPositioning(): bool {
        if (positioning)
            return true;
        if (!available || currentView !== "player")
            return false;
        startOffset = liveOffset;
        positioning = true;
        return true;
    }
    function dragStarted(pointerY: real): void {
        if (!positioning)
            return;
        dragging = true;
        dragOriginY = pointerY;
        dragOriginOffset = liveOffset;
    }
    function dragMoved(pointerY: real): void {
        if (dragging)
            liveOffset = clampOffset(dragOriginOffset + dragOriginY - pointerY);
    }
    function dragEnded(): void {
        dragging = false;
    }
    function resetPositioning(): void {
        if (positioning)
            liveOffset = 32;
    }
    function commitPositioning(): int {
        const committed = clampOffset(liveOffset);
        positioning = false;
        dragging = false;
        liveOffset = committed;
        return committed;
    }
    function cancelPositioning(): void {
        if (!positioning)
            return;
        positioning = false;
        dragging = false;
        liveOffset = clampOffset(startOffset);
    }
    function syncAvailability(): void {
        if (positioning && (!available || currentView !== "player"))
            cancelPositioning();
        if (!available || chromeHidden) {
            expandTimer.stop();
            collapseTimer.stop();
            hovered = false;
        }
    }
    onSavedOffsetChanged: syncOffset()
    onMaxOffsetChanged: if (positioning)
        liveOffset = clampOffset(liveOffset)
    else
        syncOffset()
    onAvailableChanged: syncAvailability()
    onCurrentViewChanged: syncAvailability()
    onChromeHiddenChanged: syncAvailability()
    Component.onCompleted: syncOffset()
}
