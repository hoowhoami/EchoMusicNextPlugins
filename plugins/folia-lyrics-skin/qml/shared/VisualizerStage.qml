// One renderer at a time; switching feedback never captures or retains an outgoing scene.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import EchoMusic.PluginSdk
import "render-quality.mjs" as Quality

Item {
    id: root
    property string mode: ""
    property bool previewMode: false
    readonly property var quality: Quality.styleQuality(settings, mode, Screen.devicePixelRatio)
    readonly property bool qualityRaster: ["hanabi", "nebbia", "machi", "lumiere", "diorama"].indexOf(mode) < 0 && (quality.scale !== 1 || quality.antialiasEnabled) || mode === "diorama" && quality.antialiasEnabled
    readonly property real qualityRasterBytes: qualityRaster ? Quality.colorAttachmentBytes(width * quality.pixelRatio, height * quality.pixelRatio, quality.antialiasEnabled ? 4 : 1) : 0
    readonly property string qualityError: qualityRaster && (width * quality.pixelRatio > 8192 || height * quality.pixelRatio > 8192 || qualityRasterBytes > 128 * 1024 * 1024) ? qsTr("Folia 画质纹理超出缓存预算") : ""
    layer.enabled: live && visible && qualityRaster && width > 0 && height > 0 && !qualityError
    layer.textureSize: Qt.size(Math.max(1, Math.round(width * quality.pixelRatio)), Math.max(1, Math.round(height * quality.pixelRatio)))
    layer.samples: quality.antialiasEnabled ? 4 : 1
    layer.smooth: true
    property string componentPath: ""
    property var backdropSources: []
    required property var preparedLines
    property var previewRows: null
    property var previewFraming: null
    property var songHandoff: null
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property font subtitleFont: baseFont
    signal seekRequested(real seconds)
    signal settingsPatchRequested(var patch)
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: primaryColor
    property color backgroundColor: "#111111"
    property string songTitle: ""
    property string songArtist: ""
    property string songAlbum: ""
    property string themeDescription: ""
    property string themeDisplayName: ""
    property var lyricsIcons: []
    property url coverUrl: ""
    property string avatarSeed: songTitle
    property string themeName: dark ? "dark" : "light"
    property var customAvatarImages: []
    property var customEmojiImages: []
    property var customPortraitImages: []
    property var customLayerImages: []
    property var coverColors: []
    property var spectrumBins: []
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property real bassPower: 0
    property real vocalPower: 0
    property real audioPower: 0
    property var audioBands: ({
            bass: 0,
            lowMid: 0,
            mid: 0,
            vocal: 0,
            treble: 0,
            audioPower: 0
        })
    property var nextStartBySourceIndex: ({})
    property var lineMetadata: []
    property var metadataBySourceIndex: ({})
    property EchoPluginGraphics graphicsService: null
    property EchoPluginText textService: null
    property EchoPluginAssets assetsService: null
    property LyricProjection lyricSource: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    readonly property int layerCount: _actors.length
    readonly property var actors: _actors
    readonly property bool transitionWaits: _phase === "covering" || _phase === "loading"
    readonly property real transitionBytes: 0
    readonly property var renderer: _current ? _current.renderer : null
    // Monet consumes individual bins. Decide before constructing its renderer,
    // which binds back to this stage for the current spectrum.
    readonly property bool needsBins: mode === "monet"
    readonly property bool needsSpectrum: !!renderer && ("bassPower" in renderer || "vocalPower" in renderer || "audioPower" in renderer || "audioBands" in renderer || "spectrumBins" in renderer)
    readonly property string loadedMode: _current && _current.renderer ? _current.modeKey : ""
    readonly property int subtitleSuppressedRecentIndex: renderer && "subtitleSuppressedRecentIndex" in renderer ? renderer.subtitleSuppressedRecentIndex : -1
    readonly property string requiredSourceIndicesKey: renderer && "requiredSourceIndicesKey" in renderer ? renderer.requiredSourceIndicesKey : renderer && "requiredSourceIndices" in renderer ? renderer.requiredSourceIndices.join(",") : ""
    readonly property string errorString: qualityError || _loadError || (_actors.map(actor => actor.renderer && 'errorString' in actor.renderer ? actor.renderer.errorString : actor.errorString).find(Boolean) || "")
    property var _layers: []
    property var _actors: []
    property var _current: null
    property bool _completed: false
    property string _loadError: ""
    property string _loadingPath: ""
    property string _loadingMode: ""
    property string _phase: "idle"
    property bool _createPending: false
    property bool _revealPending: false
    property int _frameFence: 0
    readonly property bool drawingActive: live && visible && Window.window !== null && Window.window.visible && Window.window.visibility !== Window.Minimized
    readonly property bool styleSwitching: _phase !== "idle"
    readonly property bool contentReady: !!renderer && _loadingPath === componentPath && loadedMode === mode && !errorString && ("renderReady" in renderer ? renderer.renderReady : lyricCount === 0 || paintedContent(renderer)) && (!("busy" in renderer) || !renderer.busy)
    onContentReadyChanged: considerReveal()
    onErrorStringChanged: if (errorString && _phase !== "idle") {
        _createPending = false;
        _revealPending = false;
        _phase = "idle";
        switchCover.reset();
    }

    function paintedContent(item: var): bool {
        if (!item || !item.visible)
            return false;
        if (("renderBatches" in item && item.renderBatches > 0) || ("paintedWidth" in item && "text" in item && item.text.length > 0 && item.paintedWidth > 0))
            return true;
        return Array.from(item.children || []).some(paintedContent);
    }
    function freezeCurrent(): void {
        if (!renderer || _loadingPath === componentPath && _loadingMode === mode)
            return;
        // A departing renderer must not observe the next style's settings or
        // article indices while its last picture fades beneath the cover.
        const names = ["preparedLines", "currentIndex", "timeSeconds", "baseFont", "settings", "primaryColor", "secondaryColor", "accentColor", "dark", "motionEnabled", "previewMode", "songHandoff", "backdropSources", "graphicsService", "assetsService", "textService", "subtitleFont", "lyricSource", "lyricCount", "lyricOffsetMs", "trackRevision", "paused", "wordColors", "animationIntensity", "nextStartBySourceIndex", "lineMetadata", "metadataBySourceIndex", "bassPower", "vocalPower", "audioPower", "audioBands", "backgroundColor", "songTitle", "songArtist", "songAlbum", "themeDescription", "themeDisplayName", "lyricsIcons", "spectrumBins", "customPortraitImages", "customLayerImages", "coverColors", "coverUrl", "avatarSeed", "themeName", "customAvatarImages", "customEmojiImages", "seed", "previewRows"];
        for (const name of names)
            if (name in renderer)
                renderer[name] = renderer[name];
        if ("paused" in renderer)
            renderer.paused = true;
    }
    function bindInputs(target: var): void {
        if ("previewMode" in target)
            target.previewMode = Qt.binding(() => root.previewMode);
        if ("songHandoff" in target)
            target.songHandoff = Qt.binding(() => root.songHandoff);
        if ("backdropSources" in target)
            target.backdropSources = Qt.binding(() => {
                const index = root._actors.findIndex(actor => actor.renderer === target);
                return root.backdropSources.concat(index < 0 ? [] : root._actors.slice(0, index).map(actor => actor.renderer).filter(Boolean));
            });
        if ("graphicsService" in target)
            target.graphicsService = Qt.binding(() => root.graphicsService);
        if ("assetsService" in target)
            target.assetsService = Qt.binding(() => root.assetsService);
        if ("textService" in target)
            target.textService = Qt.binding(() => root.textService);
        if ("subtitleFont" in target)
            target.subtitleFont = Qt.binding(() => root.subtitleFont);
        if ("lyricSource" in target)
            target.lyricSource = Qt.binding(() => root.lyricSource);
        if ("lyricCount" in target)
            target.lyricCount = Qt.binding(() => root.lyricCount);
        if ("lyricOffsetMs" in target)
            target.lyricOffsetMs = Qt.binding(() => root.lyricOffsetMs);
        if ("trackRevision" in target)
            target.trackRevision = Qt.binding(() => root.trackRevision);
        if ("paused" in target)
            target.paused = Qt.binding(() => root.paused);
        if ("wordColors" in target)
            target.wordColors = Qt.binding(() => root.settings.wordColors || []);
        if ("animationIntensity" in target)
            target.animationIntensity = Qt.binding(() => root.settings.animationIntensity || "normal");
        if ("nextStartBySourceIndex" in target)
            target.nextStartBySourceIndex = Qt.binding(() => root.nextStartBySourceIndex);
        if ("lineMetadata" in target)
            target.lineMetadata = Qt.binding(() => root.lineMetadata);
        if ("metadataBySourceIndex" in target)
            target.metadataBySourceIndex = Qt.binding(() => root.metadataBySourceIndex);
        if ("bassPower" in target)
            target.bassPower = Qt.binding(() => root.bassPower);
        if ("vocalPower" in target)
            target.vocalPower = Qt.binding(() => root.vocalPower);
        if ("audioPower" in target)
            target.audioPower = Qt.binding(() => root.audioPower);
        if ("audioBands" in target)
            target.audioBands = Qt.binding(() => root.audioBands);
        if ("backgroundColor" in target)
            target.backgroundColor = Qt.binding(() => root.backgroundColor);
        if ("songTitle" in target)
            target.songTitle = Qt.binding(() => root.songTitle);
        if ("songArtist" in target)
            target.songArtist = Qt.binding(() => root.songArtist);
        if ("songAlbum" in target)
            target.songAlbum = Qt.binding(() => root.songAlbum);
        if ("themeDescription" in target)
            target.themeDescription = Qt.binding(() => root.themeDescription);
        if ("themeDisplayName" in target)
            target.themeDisplayName = Qt.binding(() => root.themeDisplayName);
        if ("lyricsIcons" in target)
            target.lyricsIcons = Qt.binding(() => root.lyricsIcons);
        if ("spectrumBins" in target)
            target.spectrumBins = Qt.binding(() => root.spectrumBins);
        if ("customPortraitImages" in target)
            target.customPortraitImages = Qt.binding(() => root.customPortraitImages);
        if ("customLayerImages" in target)
            target.customLayerImages = Qt.binding(() => root.customLayerImages);
        if ("coverColors" in target)
            target.coverColors = Qt.binding(() => root.coverColors);
        if ("coverUrl" in target)
            target.coverUrl = Qt.binding(() => root.coverUrl);
        if ("avatarSeed" in target)
            target.avatarSeed = Qt.binding(() => root.avatarSeed);
        if ("themeName" in target)
            target.themeName = Qt.binding(() => root.themeName);
        if ("customAvatarImages" in target)
            target.customAvatarImages = Qt.binding(() => root.customAvatarImages);
        if ("customEmojiImages" in target)
            target.customEmojiImages = Qt.binding(() => root.customEmojiImages);
        if ("seed" in target)
            target.seed = Qt.binding(() => root.avatarSeed);
        // Install the bounded snapshot after count/services/revision so whole-
        // article renderers never observe four rows paired with their default 0.
        if ("previewRows" in target)
            target.previewRows = Qt.binding(() => root.previewRows);
    }

    function clearRenderer(): void {
        loader.active = false;
        loader.source = "";
        _actors = [];
        _current = null;
        _loadingPath = "";
        _loadingMode = "";
    }
    function clear(): void {
        _createPending = false;
        _revealPending = false;
        _phase = "idle";
        switchCover.reset();
        clearRenderer();
    }
    function sync(): void {
        if (!_completed)
            return;
        if (!drawingActive || !componentPath || qualityError) {
            clear();
            return;
        }
        if (_loadingPath === componentPath && _loadingMode === mode && loader.active) {
            if (_phase === "covering" && renderer) {
                _createPending = false;
                _revealPending = false;
                resumeCurrent();
                _phase = "revealing";
                switchCover.reveal();
            }
            return;
        }
        _loadError = "";
        _createPending = false;
        _revealPending = false;
        _phase = "covering";
        switchCover.cover();
    }
    function createRequested(): void {
        if (!_completed || !drawingActive || !componentPath || qualityError)
            return;
        clearRenderer();
        _loadingPath = componentPath;
        _loadingMode = mode;
        _phase = "loading";
        loader.active = true;
        loader.setSource(Qt.resolvedUrl('../' + _loadingPath), commonInputs());
    }
    function commonInputs(): var {
        return {
            preparedLines: Qt.binding(() => root.preparedLines),
            currentIndex: Qt.binding(() => root.currentIndex),
            timeSeconds: Qt.binding(() => root.timeSeconds),
            baseFont: Qt.binding(() => root.baseFont),
            settings: Qt.binding(() => root.settings),
            primaryColor: Qt.binding(() => root.primaryColor),
            secondaryColor: Qt.binding(() => root.secondaryColor),
            accentColor: Qt.binding(() => root.accentColor),
            dark: Qt.binding(() => root.dark),
            live: Qt.binding(() => root.live),
            motionEnabled: Qt.binding(() => root.motionEnabled)
        };
    }
    function resumeCurrent(): void {
        const values = commonInputs();
        for (const name of Object.keys(values))
            renderer[name] = values[name];
        bindInputs(renderer);
    }
    function considerReveal(): void {
        if (_phase !== "loading" || !contentReady || !drawingActive)
            return;
        _frameFence = 0;
        _revealPending = true;
    }
    onModeChanged: freezeCurrent()
    onComponentPathChanged: {
        freezeCurrent();
        refresh.restart();
    }
    onQualityErrorChanged: refresh.restart()
    onDrawingActiveChanged: if (drawingActive)
        refresh.restart()
    else
        clear()
    Component.onCompleted: {
        _completed = true;
        sync();
    }
    Component.onDestruction: {
        _completed = false;
        refresh.stop();
        clear();
    }
    // Let an actual covered frame reach the renderer before expensive teardown
    // or incubation, and a prepared frame before revealing the new scene.
    FrameAnimation {
        running: root.drawingActive && (root._createPending || root._revealPending)
        onTriggered: {
            if (++root._frameFence < 2)
                return;
            if (root._createPending) {
                root._createPending = false;
                root.createRequested();
            } else if (root._revealPending) {
                root._revealPending = false;
                if (!root.contentReady)
                    return;
                root._phase = "revealing";
                switchCover.reveal();
            }
        }
    }
    Timer {
        id: refresh
        interval: 0
        onTriggered: root.sync()
    }
    Loader {
        id: loader
        anchors.fill: parent
        asynchronous: true
        active: false
        onLoaded: {
            root.bindInputs(item);
            const actor = {
                modeKey: root._loadingMode,
                renderer: item,
                errorString: "",
                transitionBytes: 0
            };
            root._current = actor;
            root._actors = [actor];
            root.considerReveal();
        }
        onStatusChanged: if (active && status === Loader.Error)
            root._loadError = qsTr("无法载入 Folia 样式：%1").arg(root.mode)
    }
    StyleSwitchCover {
        id: switchCover
        objectName: "foliaStyleSwitchCover"
        anchors.fill: parent
        z: 1
        backgroundColor: root.backgroundColor
        textColor: root.primaryColor
        motionEnabled: root.motionEnabled
        onCovered: {
            root._frameFence = 0;
            root._createPending = true;
        }
        onRevealed: root._phase = "idle"
    }
    Connections {
        target: loader.item
        ignoreUnknownSignals: true
        function onSeekRequested(seconds: real): void {
            if (root.live)
                root.seekRequested(seconds);
        }
        function onSettingsPatchRequested(patch: var): void {
            if (root.live)
                root.settingsPatchRequested(patch);
        }
    }
}
