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
    readonly property var bands: Audio.resolveAudioBands(_frame)
    readonly property var spectrumBins: Audio.resolveSpectrumBins(_frame)
    readonly property bool subscribed: _subscription !== null
    property EchoPluginSpectrumSubscription _subscription: null
    property var _frame: null
    function release(): void {
        if (_subscription)
            _subscription.dispose();
        _subscription = null;
        _frame = null;
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
                maxFrequency: 12000,
                includeWaveform: true
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
    Connections {
        target: root._subscription
        function onFrameChanged(): void {
            root._frame = root._subscription ? root._subscription.frame : null;
        }
    }
}
