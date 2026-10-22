// Reuses the host's monotonic presentation projection. No independent source,
// Date.now clock, telemetry polling or writable playback state lives here.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import EchoMusic.Playback

Item {
    id: root
    required property EchoPluginViewContext page
    property bool continuous: true
    readonly property bool live: enabled && visible && page !== null && page.active && Window.window !== null && Window.window.visible && Window.window.visibility !== Window.Minimized
    property real renderTime: 0
    property string observedRevision: ""
    property bool observedPlaying: false
    property real observedSpeed: 1

    function publish(): void {
        renderTime = Math.min(page.player.durationMs || Infinity, clock.sample());
    }
    function observe(reset: bool): void {
        if (!live)
            return;
        const player = page.player;
        clock.observe(player.positionMs, player.playing, player.speed, reset);
        observedRevision = player.revision;
        observedPlaying = player.playing;
        observedSpeed = player.speed;
        publish();
    }
    function syncState(): void {
        if (!live)
            return;
        const player = page.player;
        if (observedRevision !== player.revision) {
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

    LyricClock {
        id: clock
    }
    onLiveChanged: if (live)
        observe(true)
    Component.onCompleted: if (live)
        observe(true)
    Connections {
        target: root.page ? root.page.player : null
        function onPositionChanged(): void {
            root.observe(false);
        }
        function onChanged(): void {
            root.syncState();
        }
        function onEventOccurred(event: string, payload: var): void {
            if (event === "seek" || event === "trackchange")
                root.observe(true);
        }
    }
    FrameAnimation {
        running: root.live && root.continuous && root.page.player.playing
        onTriggered: root.publish()
    }
}
