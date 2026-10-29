// Reuses the host's monotonic presentation projection. No independent source,
// Date.now clock, telemetry polling or writable playback state lives here.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import EchoMusic.Playback
import "handoff-clock.mjs" as HandoffClock

Item {
    id: root
    required property EchoPluginViewContext page
    property bool continuous: true
    property bool retiring: false
    readonly property EchoPluginPlayer player: !retiring && page && page.active ? page.player : null
    readonly property bool live: !retiring && enabled && visible && player !== null && Window.window !== null && Window.window.visible && Window.window.visibility !== Window.Minimized
    property real renderTime: 0
    property string observedRevision: ""
    property bool observedPlaying: false
    property real observedSpeed: 1
    property string observedCoordinate: ""
    readonly property EchoPluginPlaybackTransition transition: player ? player.transition : null
    readonly property string coordinate: transition && transition.valid && transition.handedOver && transition.hasIncomingPosition ? "B:" + transition.epoch : "current"
    readonly property var paired: HandoffClock.pairedClock(transition, renderTime)

    function publish(): void {
        if (!live || !player)
            return;
        renderTime = Math.min(player.durationMs || Infinity, clock.sample());
    }
    function observe(reset: bool): void {
        if (!live || !player)
            return;
        // A late telemetry packet may arrive after the native pause ack. The
        // one clock has already frozen at the heard position; continuous
        // observations must not move it. Typed seeks/track/coordinate resets
        // still reanchor through observe(true) below.
        if (!reset && !player.playing && !observedPlaying && observedRevision === player.revision && observedCoordinate === coordinate)
            return;
        const position = coordinate === "current" ? player.positionMs : transition.incomingPositionMs;
        clock.observe(position, player.playing, player.speed, reset || coordinate !== observedCoordinate);
        observedCoordinate = coordinate;
        observedRevision = player.revision;
        observedPlaying = player.playing;
        observedSpeed = player.speed;
        publish();
    }
    function syncState(): void {
        if (!live || !player)
            return;
        if (observedRevision !== player.revision || observedCoordinate !== coordinate) {
            observe(true);
        } else if (observedPlaying !== player.playing || observedSpeed !== player.speed) {
            // A state/rate change is not a new position measurement. Keep the
            // host projection's sub-telemetry progress instead of rewinding it.
            clock.setPlaybackState(player.playing, player.speed);
            observedPlaying = player.playing;
            observedSpeed = player.speed;
            publish();
        }
    }
    function retire(): void {
        retiring = true;
        transitionSignals.target = null;
        playerSignals.target = null;
        pageSignals.target = null;
    }

    LyricClock {
        id: clock
    }
    onLiveChanged: if (live)
        observe(true)
    Component.onCompleted: if (live)
        observe(true)
    Component.onDestruction: retire()
    Connections {
        id: pageSignals
        target: root.page
        function onAboutToClose(): void {
            if (root)
                root.retire();
        }
    }
    Connections {
        id: transitionSignals
        target: root.live ? root.transition : null
        function onPositionChanged(): void {
            if (root)
                root.observe(false);
        }
        function onChanged(): void {
            if (root)
                root.syncState();
        }
    }
    Connections {
        id: playerSignals
        target: root.live ? root.player : null
        function onPositionChanged(): void {
            if (root)
                root.observe(false);
        }
        function onChanged(): void {
            if (root)
                root.syncState();
        }
        function onEventOccurred(event: string, payload: var): void {
            if (root && (event === "seek" || event === "trackchange"))
                root.observe(true);
        }
    }
    FrameAnimation {
        running: root.live && root.continuous && root.player.playing
        onTriggered: if (root)
            root.publish()
    }
}
