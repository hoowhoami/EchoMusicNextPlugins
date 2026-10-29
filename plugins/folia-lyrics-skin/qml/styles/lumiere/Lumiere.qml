// Folia Lumiere's original 100-rig program/runtime, with a bounded native scene sink.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "api.mjs" as Kernel
import "stage.mjs" as Stage

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
    property string seed: songTitle
    property string songTitle: ""
    property string songArtist: ""
    property string songAlbum: ""
    property var lyricsIcons: []
    property EchoPluginReadModel lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    property EchoPluginText textService: null
    property real audioPower: 0
    property var audioBands: ({
            bass: 0,
            treble: 0
        })
    readonly property var tuning: Stage.tuning(settings)
    readonly property var sourceTheme: Stage.theme(settings, baseFont.family, primaryColor, secondaryColor, accentColor, backgroundColor, lyricsIcons)
    readonly property var viewport: Stage.viewport(width, height, Screen.devicePixelRatio)
    readonly property bool active: live && visible && width > 0 && height > 0 && !viewport.error
    readonly property string errorString: viewport.error || program.errorString || layout.errorString || view.errorString
    readonly property bool renderReady: view.ready && !layout.busy && !errorString
    readonly property real totalCacheBytes: view.cacheBytes
    readonly property int nodeCount: view.nodeCount
    readonly property int frameRevision: layout.frameRevision
    readonly property bool workerAlive: program.workerAlive || layout.workerAlive
    readonly property int subtitleSuppressedRecentIndex: _candidate && _candidate.indices.length ? _candidate.indices[_candidate.indices.length - 1] : -1
    readonly property int measurementCount: layout.measurementCount
    readonly property var sourceProgram: _song ? _song.program : null
    readonly property string committedSeed: _committedSeed
    readonly property bool watchingSong: _watching
    property var _candidate: null
    property var _song: null
    property var _options: null
    property string _committedSeed: ""
    property string _committedSignature: ""
    property bool _instrumental: false
    property bool _watching: false
    property string _watchKey: ""
    property bool _sawReset: false
    property real _watchStart: 0
    property real _presentationMs: 0
    property bool _completed: false
    clip: true
    function now(): real {
        _presentationMs = Math.max(_presentationMs, Date.now());
        return _presentationMs;
    }
    function commit(instrumental: bool): void {
        _watching = false;
        _watchKey = "";
        _committedSeed = seed;
        _committedSignature = instrumental ? "" : _candidate.signature;
        _instrumental = instrumental;
        const nextProgram = instrumental ? Kernel.compileLumiereProgram([], seed, {}, {
            seamless: tuning.seamlessTransitions
        }) : _candidate.program;
        _song = {
            seed,
            program: nextProgram,
            theme: JSON.parse(JSON.stringify(sourceTheme))
        };
        ensureOptions();
    }
    function gate(): void {
        if (!_completed || !active || !_candidate)
            return;
        if (!_song) {
            commit(false);
            return;
        }
        const decision = Stage.decideSongCommit({
            seed,
            committedSeed: _committedSeed,
            lyricsSignature: _candidate.signature,
            committedSignature: _committedSignature,
            isCommittedInstrumental: _instrumental
        });
        if (decision.action === 'idle') {
            _watching = false;
            _watchKey = "";
            return;
        }
        if (decision.action === 'commit') {
            commit(decision.isInstrumental);
            return;
        }
        const key = JSON.stringify([seed, _candidate.signature, _committedSeed, _committedSignature, _instrumental]);
        if (key !== _watchKey) {
            _watchKey = key;
            _watchStart = now();
            _sawReset = false;
        }
        _watching = true;
        if (timeSeconds < 1)
            _sawReset = true;
        if (Stage.isInstrumentalConfirmed({
            sawPlaybackReset: _sawReset,
            playbackTime: timeSeconds,
            elapsedMs: now() - _watchStart
        }, {
            instrumentalCommitSeconds: 2,
            readyGraceMs: 3000
        }))
            commit(true);
    }
    function candidate(): void {
        if (!program.program)
            return;
        _candidate = {
            signature: program.signature,
            program: program.program,
            indices: program.sourceIndices.slice()
        };
        // Seamless changes recompile the same words and must replace their program too.
        if (_song && seed === _committedSeed && _candidate.signature === _committedSignature && !_instrumental) {
            _song = {
                seed,
                program: _candidate.program,
                theme: JSON.parse(JSON.stringify(sourceTheme))
            };
            ensureOptions();
        } else
            gate();
    }
    function ensureOptions(): void {
        if (!active || !_song)
            return;
        if (!_options)
            _options = {
                width: viewport.width,
                height: viewport.height,
                resolution: viewport.resolution,
                program: _song.program,
                seed: _song.seed,
                theme: _song.theme,
                tuning,
                metadata: {
                    title: songTitle,
                    artist: songArtist,
                    album: songAlbum
                },
                showText: settings.showText !== false,
                paused,
                motionEnabled
            };
    }
    function resizeScene(): void {
        if (!_completed)
            return;
        if (_options && _song) {
            // This invalidates the numerical viewport, never creates full-song GUI items.
            _options = Object.assign({}, _options, {
                width: viewport.width,
                height: viewport.height,
                resolution: viewport.resolution
            });
        }
    }
    function release(): void {
        _watching = false;
        _watchKey = "";
        _candidate = null;
        _song = null;
        _options = null;
    }
    function requestFrame(): void {
        now();
        layout.requestFrame();
    }
    onSeedChanged: gate()
    onTimeSecondsChanged: if (_watching)
        gate()
    onSourceThemeChanged: {
        if (_song)
            _song = {
                seed: _song.seed,
                program: _song.program,
                theme: JSON.parse(JSON.stringify(sourceTheme))
            };
        settle.restart();
    }
    onTuningChanged: settle.restart()
    onViewportChanged: resizeScene()
    onActiveChanged: {
        if (!active)
            release();
        else
            ensureOptions();
    }
    Component.onCompleted: {
        _completed = true;
        now();
        gate();
    }
    Component.onDestruction: release()
    LumiereProgram {
        id: program
        lyricSource: root.lyricSource
        previewRows: root.previewRows
        lyricCount: root.lyricCount
        lyricOffsetMs: root.lyricOffsetMs
        trackRevision: root.trackRevision
        seed: root.seed
        seamless: root.tuning.seamlessTransitions
        textService: root.textService
        live: root.active
        onRevisionChanged: root.candidate()
    }
    LumiereSceneLayout {
        id: layout
        options: root._options
        runtimeMode: true
        runtimeParameters: ({
                song: root._song,
                tuning: root.tuning,
                metadata: {
                    title: root.songTitle,
                    artist: root.songArtist,
                    album: root.songAlbum
                },
                showText: root.settings.showText !== false,
                paused: root.paused,
                motionEnabled: root.motionEnabled
            })
        presentationTimeMs: root._presentationMs
        timeSeconds: root.timeSeconds
        // Root audio is the real normalized WebAudio projection; the source sampler retains
        // its own attack/release and clears the response while paused.
        audio: root.paused ? ({
                bass: 0,
                treble: 0,
                power: 0
            }) : ({
                bass: root.audioBands.bass || 0,
                treble: root.audioBands.treble || 0,
                power: root.audioPower
            })
        baseFont: root.baseFont
        textService: root.textService
        trackRevision: "lumiere-scene"
        live: root.active && root._options !== null
    }
    LumiereSceneView {
        id: view
        width: root.viewport.width
        height: root.viewport.height
        transform: Scale {
            xScale: root.width / view.width
            yScale: root.height / view.height
        }
        forceRaster: root.viewport.raster
        maxCacheBytes: 128 * 1024 * 1024
        frame: layout.frame
        baseFont: root.baseFont
        resolution: root.viewport.resolution
        live: root.active
    }
    FrameAnimation {
        running: root.active && !root.paused
        onTriggered: root.requestFrame()
    }
    Timer {
        interval: 50
        repeat: true
        running: root.active && root._watching
        onTriggered: root.gate()
    }
    Timer {
        id: settle
        interval: 230
        onTriggered: if (root.active)
            root.requestFrame()
    }
}
