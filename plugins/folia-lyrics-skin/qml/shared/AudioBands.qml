// A single scoped lease, shared by the selected renderer and background.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "audioBands.mjs" as Audio

Item {
    id: root
    required property EchoPluginContext plugin
    property bool live: true
    property bool paused: false
    property bool needBins: false
    readonly property var _silence: Audio.bandsFromMeans([0, 0, 0, 0, 0])
    readonly property var _emptyBins: []
    readonly property EchoPluginSpectrumFrame _frame: _subscription ? _subscription.currentFrame : null
    readonly property var bands: _frame && _frame.state === "playing" && _frame.source === "player" ? Audio.bandsFromMeans(_frame.bandMeans) : _silence
    readonly property var spectrumBins: needBins && _frame && _frame.state === "playing" && _frame.source === "player" ? _frame.copyBins() : _emptyBins
    readonly property bool subscribed: _subscription !== null
    property EchoPluginSpectrumSubscription _subscription: null
    function release(): void {
        if (_subscription)
            _subscription.dispose();
        _subscription = null;
    }
    function sync(): void {
        if (!live || paused || !plugin.active) {
            release();
            return;
        }
        if (!_subscription)
            _subscription = plugin.audio.spectrum.subscribe({
                fps: 60,
                binCount: 128,
                fftSize: 2048,
                scale: "linear",
                minFrequency: 20,
                rangesHz: [[20, 150], [150, 400], [400, 1200], [1000, 3500], [3500, 12000]],
                maxFrequency: 12000
            });
    }
    onLiveChanged: sync()
    onPausedChanged: sync()
    Component.onCompleted: sync()
    Component.onDestruction: release()
    Connections {
        target: root.plugin
        function onActiveChanged(): void {
            if (root)
                root.sync();
        }
    }
}
