pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "model.mjs" as Model

Item {
    id: root
    required property var keys
    required property font baseFont
    required property EchoPluginGraphics graphicsService
    property int weight: 300
    property bool live: true
    property string phase: "bake"
    property int _frames: 0
    property string _error: ""
    readonly property bool ready: phase === "ready"
    readonly property bool baking: phase === "bake" || phase === "freeze"
    readonly property var preparationDiagnostic: inputs.item ? inputs.item.diagnostic : null
    readonly property var output: retained
    readonly property string errorString: _error || (inputs.item ? inputs.item.errorString : "")
    readonly property real cacheBytes: width * height * (ready ? 16 / 3 : 16 * 6 + 4 + 16 / 3)
    width: 1024
    height: Math.max(1, Math.ceil(keys.length / 8)) * 128
    readonly property font noteFont: Qt.font({
        families: ["Cambria Math", "STIX Two Math", "Cambria", "Georgia", "Times New Roman", "serif"],
        pixelSize: 72,
        weight: 500,
        italic: true
    })
    function runs(note: bool): var {
        return keys.filter(key => key.startsWith('\u0001') === note).map(key => ({
                    key,
                    text: note ? key.slice(1) : key,
                    size: 72,
                    weight: note ? 500 : /[\u2E80-\u2FDF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/u.test(key) ? Math.min(weight, 500) : weight,
                    maxBlur: 0,
                    maxHaloRadius: 0
                }));
    }
    function poses(metrics: var): var {
        return Array.from(metrics).map(m => {
            const index = keys.indexOf(m.key);
            return {
                key: m.key,
                x: (index % 8) * 128 + 64 - m.advance / 2,
                y: Math.floor(index / 8) * 128 + 28 + 72 * .86 - m.baseline,
                color: Qt.rgba(1, 1, 1, 1)
            };
        });
    }
    Loader {
        id: inputs
        active: root.live && root.baking
        sourceComponent: Item {
            width: root.width
            height: root.height
            readonly property var diagnostic: ({
                    lyricRuns: lyrics.runs.length,
                    lyricMetrics: lyrics.metrics.length,
                    lyricReady: lyrics.ready,
                    lyricBatches: lyrics.renderBatches,
                    noteRuns: notes.runs.length,
                    noteMetrics: notes.metrics.length,
                    noteReady: notes.ready,
                    noteBatches: notes.renderBatches,
                    gainBytes: gainTexture.sourceBytes,
                    gainError: gainTexture.errorString,
                    passes: [h1, v1, h2, v2, h3, v3].map(pass => pass.valid)
                })
            readonly property bool ready: (lyrics.runs.length === 0 || lyrics.ready) && (notes.runs.length === 0 || notes.ready) && [h1, v1, h2, v2, h3, v3].every(pass => pass.valid)
            readonly property string errorString: lyrics.errorString || notes.errorString || [h1, v1, h2, v2, h3, v3].map(pass => pass.errorString).find(Boolean) || ""
            Item {
                id: ink
                width: root.width
                height: root.height
                GlyphRun {
                    id: lyrics
                    anchors.fill: parent
                    font: root.baseFont
                    runs: root.runs(false)
                    onLayoutChanged: if (metrics.length)
                        poses = root.poses(metrics)
                }
                GlyphRun {
                    id: notes
                    anchors.fill: parent
                    font: root.noteFont
                    runs: root.runs(true)
                    onLayoutChanged: if (metrics.length)
                        poses = root.poses(metrics)
                }
            }
            ShaderEffectSource {
                id: raw
                sourceItem: ink
                sourceRect: Qt.rect(0, 0, root.width, root.height)
                textureSize: Qt.size(root.width, root.height)
                visible: false
                hideSource: true
                live: true
            }
            FloatTexture {
                id: gainTexture
                x: root.parent ? root.parent.width / 2 : 0
                y: root.parent ? root.parent.height / 2 : 0
                width: 1
                height: 1
                graphics: root.graphicsService
                function upload(): void {
                    const data = new Float32Array(8 * Math.ceil(root.height / 128) * 4);
                    root.keys.forEach((key, index) => data[index * 4] = !key.startsWith('\u0001') && /[\u2E80-\u2FDF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/u.test(key) ? .9 : 1.5);
                    uploadPacked(8, Math.ceil(root.height / 128), Model.pack(data));
                }
                Timer {
                    interval: 0
                    running: true
                    onTriggered: gainTexture.upload()
                }
            }
            MetaphorBox {
                id: h1
                width: root.width
                height: root.height
                source: raw
                gains: gainTexture
                firstPass: true
                horizontal: true
            }
            MetaphorBox {
                id: v1
                width: root.width
                height: root.height
                source: h1.output
                gains: gainTexture
            }
            MetaphorBox {
                id: h2
                width: root.width
                height: root.height
                source: v1.output
                gains: gainTexture
                horizontal: true
            }
            MetaphorBox {
                id: v2
                width: root.width
                height: root.height
                source: h2.output
                gains: gainTexture
            }
            MetaphorBox {
                id: h3
                width: root.width
                height: root.height
                source: v2.output
                gains: gainTexture
                horizontal: true
            }
            MetaphorBox {
                id: v3
                width: root.width
                height: root.height
                source: h3.output
                gains: gainTexture
                lastPass: true
            }
            ShaderEffect {
                anchors.fill: parent
                blending: false
                property var source: v3.output
                fragmentShader: Qt.resolvedUrl("copy.frag.qsb")
            }
        }
    }
    ShaderEffectSource {
        id: retained
        sourceItem: root.baking ? inputs.item : null
        sourceRect: Qt.rect(0, 0, root.width, root.height)
        textureSize: Qt.size(root.width, root.height)
        hideSource: true
        visible: false
        live: root.phase === "bake"
        mipmap: true
        smooth: true
        onScheduledUpdateCompleted: if (root.phase === "freeze") {
            root.phase = "retire";
            root._frames = 0;
        }
    }
    Connections {
        target: root.Window.window
        function onFrameSwapped(): void {
            if (root.phase === "bake" && inputs.item && inputs.item.ready && ++root._frames >= 3) {
                root.phase = "freeze";
                retained.scheduleUpdate();
            } else if (root.phase === "retire" && ++root._frames >= 3) {
                root.phase = "ready";
                deadline.stop();
            }
        }
    }
    FrameAnimation {
        running: root.live && ["bake", "freeze", "retire"].includes(root.phase)
        onTriggered: if (root.Window.window)
            root.Window.window.update()
    }
    Timer {
        id: deadline
        running: root.live && ["bake", "freeze", "retire"].includes(root.phase)
        interval: 10000
        onTriggered: {
            root._error = "Metaphor immutable glyph atlas timed out " + JSON.stringify({
                phase,
                frames: _frames,
                window: root.Window.window !== null,
                input: inputs.item ? inputs.item.diagnostic : null
            });
            root.phase = "error";
        }
    }
}
