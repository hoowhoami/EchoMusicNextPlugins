// Folia 8006b40f, AGPL-3.0-only. Native field/tint drawing, no browser or offline beat analysis.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "model.mjs" as Model
import "../../shared"

Item {
    id: root
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: primaryColor
    property color backgroundColor: "#111111"
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property string seed: "metaphor"
    property string songTitle: ""
    property EchoPluginGraphics graphicsService: null
    property EchoPluginText textService: null
    property LyricProjection lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    property real audioPower: 0
    readonly property var tuning: Model.tuning(settings)
    readonly property var theme: ({
            primaryColor: String(primaryColor),
            secondaryColor: String(secondaryColor),
            accentColor: String(accentColor),
            backgroundColor: String(backgroundColor),
            wordColors: settings.wordColors || []
        })
    readonly property int weight: settings.fontWeight === null || settings.fontWeight === undefined ? 300 : settings.fontWeight
    readonly property bool active: live && visible && width > 0 && height > 0
    readonly property int cueIndex: program.program ? Model.findMetaphorCue(program.program, timeSeconds) : 0
    property real layoutAspect: 0
    readonly property real cutPace: tuning.cutPace
    readonly property bool negative: tuning.negative
    readonly property string intensity: settings.animationIntensity || "normal"
    readonly property string geometrySignature: JSON.stringify([program.revision, cueIndex, seed, layoutAspect, tuning.blobs, tuning.keywordColors, tuning.flip, theme])
    property var cueInput: null
    property string _geometrySignature: ""
    readonly property int preparationRevision: preparation.revision
    function syncAspect(): void {
        if (width <= 0 || height <= 0)
            return;
        const aspect = width / height;
        if (!layoutAspect || Math.abs(Math.log(aspect / layoutAspect)) > .25)
            layoutAspect = aspect;
    }
    function syncGeometry(): void {
        if (!program.program || program.busy || !layoutAspect)
            return;
        if (_geometrySignature === geometrySignature)
            return;
        _geometrySignature = geometrySignature;
        const cue = program.program.cues[cueIndex];
        cueInput = {
            cue,
            index: cueIndex,
            seed,
            line: cue.lineIndex >= 0 ? program.lines[cue.lineIndex] : null,
            tuning: {
                blobs: tuning.blobs,
                keywordColors: tuning.keywordColors,
                flip: tuning.flip
            },
            theme,
            aspect: layoutAspect
        };
    }
    onWidthChanged: syncAspect()
    onHeightChanged: syncAspect()
    onGeometrySignatureChanged: syncGeometry()
    Component.onCompleted: {
        syncAspect();
        syncGeometry();
    }
    property bool _viewEnabled: false
    property var _shownModel: null
    property int _shownIndex: 0
    property real _audio: 0
    property real _audioAt: 0
    property bool _audioRaw: false
    readonly property var frame: _shownModel && program.program ? Model.frame(_shownModel, program.program, _shownIndex, timeSeconds, width / Math.max(1, height), tuning, !motionEnabled, _audio, settings.showText !== false) : null
    // Retiring children retain a valid final input until Loader destroys them.
    // A source reset removes the renderer; it never binds a null frame through
    // a live shader graph or displays an outgoing transition layer.
    property var _viewFrame: null
    onFrameChanged: if (frame)
        _viewFrame = frame
    function clearCue(): void {
        _viewEnabled = false;
        _shownModel = null;
        _geometrySignature = "";
        cueInput = null;
    }
    Connections {
        target: program
        function onProgramChanged(): void {
            if (!program.program)
                root.clearCue();
        }
        function onBusyChanged(): void {
            if (program.busy)
                root.clearCue();
        }
    }
    readonly property var diagnostic: view.item ? view.item.diagnostic : null
    readonly property bool renderReady: !program.busy && !preparation.busy && view.item !== null && view.item.ready
    readonly property string errorString: program.errorString || preparation.errorString || (view.item ? view.item.errorString : "")
    readonly property real totalCacheBytes: view.item ? view.item.cacheBytes : 0
    readonly property int layerCount: view.item ? 1 : 0
    readonly property bool workerAlive: program.workerAlive
    clip: true
    function sampleAudio(): void {
        const now = Date.now();
        const dt = _audioAt > 0 ? Math.min(.1, (now - _audioAt) / 1000) : .016;
        _audioAt = now;
        if (audioPower > 1)
            _audioRaw = true;
        const level = paused || !Number.isFinite(audioPower) ? 0 : Math.min(1, Math.max(0, _audioRaw ? audioPower / 255 : audioPower));
        _audio += (level - _audio) * (1 - Math.exp(-dt / (level > _audio ? .3 : .9)));
    }
    onTimeSecondsChanged: sampleAudio()
    onPausedChanged: sampleAudio()
    MetaphorProgram {
        id: program
        lyricSource: root.lyricSource
        previewRows: root.previewRows
        lyricCount: root.lyricCount
        lyricOffsetMs: root.lyricOffsetMs
        trackRevision: root.trackRevision
        textService: root.textService
        seed: root.seed
        live: root.active
        options: ({
                title: root.songTitle,
                cutPace: root.cutPace,
                negative: root.negative,
                intensity: root.intensity
            })
    }
    MetaphorPreparation {
        id: preparation
        input: root.cueInput
        baseFont: root.baseFont
        weight: root.weight
        live: root.active
        onModelChanged: if (model) {
            root._viewEnabled = false;
            root._shownIndex = root.cueIndex;
            root._shownModel = model;
            root._viewEnabled = true;
        }
    }
    Loader {
        id: view
        anchors.fill: parent
        active: root.active && root._viewEnabled && program.program !== null && !program.busy && root.frame !== null
        sourceComponent: MetaphorView {
            model: root._shownModel
            frame: root._viewFrame
            graphicsService: root.graphicsService
            baseFont: root.baseFont
            weight: root.weight
            live: root.active
            showText: root.settings.showText !== false
        }
    }
}
