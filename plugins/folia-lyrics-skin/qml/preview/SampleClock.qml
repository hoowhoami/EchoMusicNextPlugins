// One sample-only frame producer. No production player, model or LyricClock.
pragma ComponentBehavior: Bound
import QtQuick
import "sample-clock.mjs" as Clock

Item {
    id: root
    property string mode: "classic"
    property string playbackKey: "default"
    property real loopDuration: 14.4
    property var lines: []
    property bool live: true
    property bool paused: false
    property var _state: Clock.initialState(mode, loopDuration)
    property real _wallMs: 0
    readonly property real timeSeconds: _state.timeSeconds
    readonly property int currentIndex: Clock.findLineIndex(lines, timeSeconds)
    property var levels: ({ audioPower: .24, bass: .18, lowMid: .15, mid: .12, vocal: .2, treble: .1, spectrum: new Array(64).fill(0) })
    function reset(): void { _state = Clock.initialState(mode, loopDuration); }
    function seek(seconds: real): void {
        if (Number.isFinite(seconds))
            _state = { timeSeconds: Math.max(0, seconds) % loopDuration, previousTickMs: null };
    }
    onModeChanged: reset()
    onPlaybackKeyChanged: reset()
    onLoopDurationChanged: reset()
    onPausedChanged: _state = Clock.pause(_state)
    onLiveChanged: _state = Clock.pause(_state)
    FrameAnimation {
        running: root.live && !root.paused
        onTriggered: {
            root._wallMs += frameTime * 1000;
            root._state = Clock.advance(root._state, root._wallMs, root.loopDuration);
            root.levels = Clock.levelsAt(root._wallMs);
        }
    }
}
