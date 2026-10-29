pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import QtQuick.Effects
import EchoMusic.Theme
import EchoMusic.PluginSdk
import "./entry.mjs" as Spectrum

Item {
    id: visualizer
    objectName: "spectrumVisualizerLayer"
    required property EchoPluginContext plugin
    required property string placement
    readonly property var settings: plugin.ui.state
    readonly property string kind: placement === "mini.background" ? "mini" : placement === "lyrics.aboveControls" ? "lyric" : "playerbar"
    readonly property bool allowed: !!settings.enabled && (kind === "mini" ? !!settings.showMiniPlayer : kind === "lyric" ? !!settings.showLyricControls : !!settings.showPlayerBar)
    implicitHeight: kind === "lyric" && allowed ? Number(settings.lyricHeight || 82) : 0
    readonly property var hostWindow: Window.window
    readonly property bool live: allowed && visible && width > 0 && height > 0 && hostWindow && hostWindow.visible && hostWindow.visibility !== Window.Minimized && plugin.active
    readonly property var colors: Spectrum.palette(settings.palette || "theme", [plugin.accent.toString(), Theme.store.accentHover.toString(), Qt.darker(plugin.accent, 1.15).toString()])
    readonly property var renderSettings: Object.assign({}, settings, {
        reducedMotion: !Theme.store.motionEnabled
    })
    property EchoPluginSpectrumSubscription subscription: null
    property var frame: null
    property var display: ({
            values: []
        })
    property real time: 0
    property bool gpuFailed: false
    readonly property bool gpuEnabled: !gpuFailed && plugin.graphics.capabilities.state!=="unavailable"
    property bool centerSettled: false
    readonly property string subscriptionKey: JSON.stringify([settings.fps, settings.binCount, settings.fftSize, settings.smoothing, settings.scale, settings.mode])
    opacity: Number(settings.opacity || 56) / 100
    function release(): void {
        if (subscription)
            subscription.dispose();
        subscription = null;
        centerSettled = false;
        frame = null;
        display = {
            values: []
        };
    }
    function sync(): void {
        release();
        if (!live)
            return;
        subscription = plugin.audio.spectrum.subscribe({
            fps: settings.fps,
            binCount: settings.mode === "centered" ? Math.max(128, settings.binCount) : settings.binCount,
            fftSize: settings.fftSize,
            smoothing: settings.smoothing / 100,
            scale: settings.scale,
            minFrequency: 20,
            maxFrequency: 20000,
            includeWaveform: settings.mode === "wave" || settings.mode === "hybrid"
        });
    }
    onLiveChanged: sync()
    onSubscriptionKeyChanged: sync()
    Component.onCompleted: sync()
    Component.onDestruction: release()
    Connections {
        target: visualizer.subscription
        function onFrameChanged(): void {
            if (visualizer.subscription) {
                visualizer.centerSettled = false;
                visualizer.frame = visualizer.subscription.frame;
            }
        }
    }
    Timer {
        objectName: "spectrumRenderClock"
        interval: Math.max(16, 1000 / (visualizer.settings.mode === "mist" ? Math.min(visualizer.settings.fps || 15, 24) : visualizer.settings.fps || 15))
        repeat: true
        running: visualizer.live && !visualizer.gpuEnabled && (visualizer.settings.mode === "centered" ? !visualizer.centerSettled : visualizer.settings.mode === "mist" || !visualizer.frame || visualizer.frame.state === "idle")
        onTriggered: {
            visualizer.time = Date.now();
            if (drawing.item)
                drawing.item.repaint();
        }
    }
    Loader {
        id: drawing
        anchors.fill: parent
        active: visualizer.live
        sourceComponent: visualizer.gpuEnabled ? gpuDrawing : visualizer.settings.mode === "mist" ? fog : ordinary
    }
    Component {
        id: gpuDrawing
        GpuLayer {
            plugin: visualizer.plugin
            settings: visualizer.renderSettings
            frame: visualizer.frame
            colors: visualizer.colors
            kind: visualizer.kind
            live: visualizer.live
            onFailureChanged: {if(failure)visualizer.gpuFailed=true;}
            onStatusChanged: {if(status.state==="error" || status.state==="unavailable")visualizer.gpuFailed=true;}
        }
    }
    Component {
        id: ordinary
        VectorPaint {
            id: vectors
            objectName: "spectrumVectorPaint"
            function repaint(): void {
                commands = Spectrum.scene(width, height, visualizer.frame, visualizer.renderSettings, visualizer.kind, visualizer.colors, visualizer.time, visualizer.display);
                // The source skips bars at or below half a logical pixel.
                // Once pause decay is invisible, retire the interpolation clock.
                if (visualizer.settings.mode === "centered")
                    visualizer.centerSettled = (!visualizer.frame || visualizer.frame.state !== "playing") && !visualizer.display.values.some(value => value * height * visualizer.settings.fill / 100 > 0.5);
            }
            Component.onCompleted: repaint()
            onWidthChanged: repaint()
            onHeightChanged: repaint()
            Connections {
                target: visualizer
                function onFrameChanged(): void {
                    if (visualizer.settings.mode !== "centered")
                        vectors.repaint();
                }
                function onRenderSettingsChanged(): void {
                    vectors.repaint();
                }
                function onColorsChanged(): void {
                    vectors.repaint();
                }
            }
            layer.enabled: visualizer.settings.mode === "centered"
            layer.effect: ShaderEffect {
                property var source
                fragmentShader: "shaders/edge-mask.frag.qsb"
            }
        }
    }
    Component {
        id: fog
        Item {
            function repaint(): void {
                backdropVectors.repaint();
                for (let i = 0; i < passes.count; ++i)
                    passes.itemAt(i).requestPaint();
            }
            VectorPaint {
                id: backdropVectors
                anchors.fill: parent
                function repaint(): void {
                    commands = Spectrum.scene(width, height, visualizer.frame, visualizer.renderSettings, visualizer.kind, visualizer.colors, visualizer.time, visualizer.display, -2);
                }
            }
            Repeater {
                id: passes
                model: 3
                delegate: Item {
                    id: pass
                    required property int index
                    property alias texture: sampled
                    function requestPaint(): void {
                        cloud.repaint();
                    }
                    anchors.fill: parent
                    VectorPaint {
                        id: cloud
                        anchors.fill: parent
                        layer.enabled: true
                        layer.effect: MultiEffect {
                            blurEnabled: true
                            blurMax: 32
                            blur: Spectrum.blurFor(visualizer.renderSettings, pass.index) / 32
                            autoPaddingEnabled: true
                        }
                        function repaint(): void {
                            commands = Spectrum.scene(width, height, visualizer.frame, visualizer.renderSettings, visualizer.kind, visualizer.colors, visualizer.time, visualizer.display, pass.index);
                        }
                    }
                    ShaderEffectSource {
                        id: sampled
                        sourceItem: cloud
                        hideSource: true
                        live: true
                    }
                }
            }
            ShaderEffect {
                anchors.fill: parent
                property var fog0: passes.count > 0 ? passes.itemAt(0).texture : null
                property var fog1: passes.count > 1 ? passes.itemAt(1).texture : null
                property var fog2: passes.count > 2 ? passes.itemAt(2).texture : null
                fragmentShader: "shaders/mist.frag.qsb"
            }
        }
    }
}
