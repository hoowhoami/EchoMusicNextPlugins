// The pinned programme directs retained native Shapes and complete-context glyph batches.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "kernel.mjs" as Kernel
import "native-runtime.mjs" as Runtime
import "render-plan.mjs" as Plan
import "handover.mjs" as Handover
import "filters" as Filters

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
    property bool exiting: false
    property string seed: trackRevision
    property string songTitle: ""
    property string songArtist: ""
    property string songAlbum: ""
    property string themeDisplayName: ""
    property string themeDescription: ""
    property var lyricsIcons: []
    property var wordColors: []
    property string animationIntensity: "normal"
    property real audioPower: 0
    property var audioBands: ({})
    property EchoPluginReadModel lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    property EchoPluginText textService: null
    signal exitFinished
    readonly property var tuning: Kernel.tuning(settings)
    readonly property var theme: ({
            fontFamily: Array.from(baseFont.families || [baseFont.family]).join(', '),
            fontWeight: settings.fontWeight || null,
            fontStyle: settings.fontStyle || 'sans',
            primaryColor: css(primaryColor),
            secondaryColor: css(secondaryColor),
            accentColor: css(accentColor),
            backgroundColor: css(backgroundColor),
            animationIntensity,
            name: themeDisplayName,
            description: themeDescription,
            lyricsIcons: Array.from(root.lyricsIcons || []),
            wordColors: Array.from(root.wordColors || []).map(value => ({
                        word: value.word,
                        color: String(value.color)
                    }))
        })
    readonly property var geometry: ({
            width,
            height,
            lyricsFontScale: Math.max(.85, Math.min(1.4, Number(settings.lyricsFontScale) || 1)),
            theme,
            tuning,
            staticMode: !motionEnabled,
            transparentBackground: false,
            metadata: {
                title: songTitle,
                artist: songArtist,
                album: songAlbum
            }
        })
    readonly property bool isInstrumental: layout.instrumental
    readonly property var program: layout.program
    readonly property var renderers: body.renderers.concat(credits.renderers, overlay.renderers)
    readonly property real totalCacheBytes: body.cacheBytes + credits.cacheBytes + overlay.cacheBytes + post.cacheBytes
    readonly property int actorCount: body.actorCount + credits.actorCount + overlay.actorCount
    readonly property int cachedSceneCount: _runtime ? _runtime.records.size : 0
    readonly property bool renderReady: _runtime !== null && body.actorCount > 0 && !errorString
    readonly property string errorString: _error || layout.errorString || body.errorString || credits.errorString || overlay.errorString || post.errorString
    readonly property int activeShotIndex: _record ? _record.scene.activeShotIndex : -1
    property var _runtime: null
    property var _record: null
    property var _bodyPlan: null
    property var _creditsPlan: null
    property var _overlayPlan: null
    property string _planKey: ""
    property int _generation: -1
    property int _serial: 0
    property string _displaySeed: ""
    property var _swap: null
    property real coverOpacity: 0
    readonly property bool handoverActive: _swap !== null
    property string _error: ""
    property bool _ready: false
    property var _passes: []
    property real _resolution: 1
    property real _canvasResolution: 1
    clip: true
    function css(value: color): string {
        return 'rgba(' + Math.round(value.r * 255) + ',' + Math.round(value.g * 255) + ',' + Math.round(value.b * 255) + ',' + value.a + ')';
    }
    function release(): void {
        if (_swap && _swap.staged)
            _swap.staged.clear();
        _swap = null;
        coverOpacity = 0;
        if (_runtime)
            _runtime.clear();
        _runtime = null;
        _record = null;
        _bodyPlan = null;
        _creditsPlan = null;
        _overlayPlan = null;
        _planKey = "";
        _passes = [];
        body.retire();
        credits.retire();
        overlay.retire();
    }
    function adopt(runtime: var, generation: int, songSeed: string): void {
        _passes = [];
        body.retire();
        credits.retire();
        overlay.retire();
        if (_runtime && _runtime !== runtime)
            _runtime.clear();
        _runtime = runtime;
        _generation = generation;
        _displaySeed = songSeed;
        ++_serial;
        _record = null;
        _bodyPlan = null;
        _creditsPlan = null;
        _overlayPlan = null;
        _planKey = "";
    }
    function receive(index: int, value: var): void {
        if (!live || !visible || exiting)
            return;
        try {
            if (_runtime && _generation === layout._generation) {
                _runtime.accept(value);
                refresh();
                return;
            }
            const reply = {
                value,
                program: layout.program,
                context: geometry,
                generation: layout._generation,
                seed
            };
            if (_runtime && _displaySeed !== seed && _runtime.options.program.paragraphs.length) {
                if (_swap && _swap.staged)
                    _swap.staged.clear();
                _swap = {
                    reply,
                    staged: null,
                    startedAt: Date.now(),
                    committed: false
                };
                coverOpacity = 0;
            } else {
                const runtime = new Runtime.NativeRuntime(reply.program, reply.context);
                runtime.accept(value);
                adopt(runtime, reply.generation, reply.seed);
            }
            _error = "";
            refresh();
        } catch (error) {
            release();
            _error = String(error.message || error);
        }
    }
    function advanceHandover(): void {
        if (!_swap)
            return;
        const swap = _swap, frame = Handover.swapFrame(Date.now(), swap.startedAt);
        if (frame.stage && !swap.staged && !swap.committed) {
            swap.staged = new Runtime.NativeRuntime(swap.reply.program, swap.reply.context);
            swap.staged.accept(swap.reply.value);
        }
        if (frame.commit && !swap.committed) {
            adopt(swap.staged, swap.reply.generation, swap.reply.seed);
            swap.staged = null;
            swap.committed = true;
        }
        coverOpacity = frame.alpha;
        if (frame.finished) {
            _swap = null;
            coverOpacity = 0;
        }
    }
    function refresh(): void {
        if (!_ready || !live || !visible || exiting) {
            release();
            return;
        }
        if (layout.program) {
            const index = Kernel.findSonnetParagraphIndexAtTime(layout.program, timeSeconds);
            if (layout.requestedIndex !== index)
                layout.requestedIndex = index;
        }
        if (!_runtime)
            return;
        try {
            advanceHandover();
            const record = _runtime.frame(timeSeconds, audioPower, audioBands);
            if (!record) {
                body.clear();
                credits.clear();
                overlay.clear();
                return;
            }
            _record = record;
            const key = _serial + ':' + record.index + ':' + record.scene.activeShotIndex;
            if (key !== _planKey) {
                _bodyPlan = new Plan.RenderPlan(record.scene.container, record.provider, record.scene.shots.filter((shot, index) => index !== record.scene.activeShotIndex).map(shot => shot.container));
                _creditsPlan = new Plan.RenderPlan(record.credits, record.provider);
                _overlayPlan = new Plan.RenderPlan(record.overlay, record.provider);
                _planKey = key;
            }
            _canvasResolution = _runtime.renderResolution;
            const filterPlan = Plan.filterPlan(record.scene.container, _canvasResolution);
            _passes = filterPlan.passes;
            _resolution = filterPlan.resolution;
            body.setFrame(key, _bodyPlan.frame());
            credits.live = record.credits.visible;
            if (credits.live)
                credits.setFrame(key, _creditsPlan.frame());
            overlay.setFrame(key, _overlayPlan.frame());
            if (totalCacheBytes > 384 * 1024 * 1024)
                throw Error('Sonnet native resources exceed 384 MiB');
        } catch (error) {
            release();
            _error = String(error.message || error);
        }
    }
    function schedule(): void {
        if (_ready)
            renderStep.restart();
    }
    onTimeSecondsChanged: schedule()
    onLiveChanged: {
        if (!live)
            release();
        else
            schedule();
    }
    onVisibleChanged: {
        if (!visible)
            release();
        else
            schedule();
    }
    onExitingChanged: if (exiting) {
        release();
        exitFinished();
    }
    onPausedChanged: schedule()
    Component.onCompleted: {
        _ready = true;
        schedule();
    }
    Component.onDestruction: {
        renderStep.stop();
        release();
    }
    Timer {
        id: renderStep
        interval: 0
        onTriggered: root.refresh()
    }
    FrameAnimation {
        running: root.live && root.visible && !root.exiting && ((root.motionEnabled && !root.paused) || root.handoverActive)
        onTriggered: root.refresh()
    }
    Rectangle {
        anchors.fill: parent
        color: root.backgroundColor
    }
    SonnetLayout {
        id: layout
        lyricSource: root.lyricSource
        previewRows: root.previewRows
        lyricCount: root.lyricCount
        lyricOffsetMs: root.lyricOffsetMs
        textService: root.textService
        baseFont: root.baseFont
        timeSeconds: root.timeSeconds
        trackRevision: root.trackRevision
        seed: root.seed
        geometry: root.geometry
        live: root.live && root.visible && !root.exiting
        onSceneReady: (index, value) => root.receive(index, value)
        onProgramChanged: root.schedule()
        onErrorStringChanged: if (errorString)
            root.release()
    }
    SonnetScene {
        id: body
        anchors.fill: parent
        baseFont: root.baseFont
        live: root.live && !root.exiting
    }
    Filters.FilterChain {
        id: post
        anchors.fill: parent
        source: body
        sourceIsTextureProvider: false
        passes: root._passes
        resolution: root._resolution
        targetResolution: root._canvasResolution
        live: root.live && !root.exiting && root._passes.length > 0
    }
    SonnetScene {
        id: credits
        anchors.fill: parent
        baseFont: root.baseFont
        live: false
    }
    SonnetScene {
        id: overlay
        anchors.fill: parent
        baseFont: root.baseFont
        live: root.live && !root.exiting
    }
    Rectangle {
        anchors.fill: parent
        color: root.backgroundColor
        opacity: root.coverOpacity
        visible: root.coverOpacity > 0
        z: 100000
    }
}
