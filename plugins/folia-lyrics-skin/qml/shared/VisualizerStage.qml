// Folia source style layers: real first-frame wait, bounded two actors and shared softFocus.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import "transitions/layers.mjs" as Layers
import EchoMusic.PluginSdk

Item {
    id: root
    property string mode: ""
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
    property EchoPluginText textService: null
    property EchoPluginAssets assetsService: null
    property EchoPluginReadModel lyricSource: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    readonly property int layerCount: _actors.length
    readonly property var actors: _actors
    readonly property bool transitionWaits: _layers.length > 0 && _layers[_layers.length - 1].waits
    readonly property real transitionBytes: _actors.reduce((sum, actor) => sum + actor.transitionBytes, 0)
    readonly property var renderer: _current ? _current.renderer : null
    readonly property string loadedMode: _current && _current.renderer ? _current.modeKey : ""
    readonly property int subtitleSuppressedRecentIndex: renderer && "subtitleSuppressedRecentIndex" in renderer ? renderer.subtitleSuppressedRecentIndex : -1
    readonly property string requiredSourceIndicesKey: renderer && "requiredSourceIndicesKey" in renderer ? renderer.requiredSourceIndicesKey : renderer && "requiredSourceIndices" in renderer ? renderer.requiredSourceIndices.join(",") : ""
    readonly property string errorString: _loadError || (_actors.map(actor => actor.errorString).find(Boolean) || "")
    property var _layers: []
    property var _actors: []
    property var _current: null
    property bool _completed: false
    property string _loadError: ""

    function bindInputs(target: var): void {
        if ("songHandoff" in target)
            target.songHandoff = Qt.binding(() => root.songHandoff);
        if ("backdropSources" in target)
            target.backdropSources = Qt.binding(() => {
                const index = root._actors.findIndex(actor => actor.renderer === target);
                return root.backdropSources.concat(index < 0 ? [] : root._actors.slice(0, index).map(actor => actor.renderer).filter(Boolean));
            });
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

    function easingCurve(value: string): var {
        return value.slice(value.indexOf('(') + 1, -1).split(',').map(Number).concat([1, 1]);
    }
    function clear(): void {
        const previous = _actors;
        _actors = [];
        _layers = [];
        _current = null;
        for (const actor of previous) {
            actor.retire();
            actor.destroy();
        }
    }
    function applyLayers(next: var): void {
        _layers = next;
        const previous = _actors, updated = [];
        for (let i = 0; i < next.length; ++i) {
            const state = next[i];
            let actor = previous.find(value => value.layerState.key === state.key);
            if (!actor)
                actor = actorComponent.createObject(root, {
                    layerState: state,
                    sourcePath: componentPath
                });
            if (!actor)
                continue;
            actor.z = i;
            actor.layerState = state;
            updated.push(actor);
        }
        _actors = updated;
        _current = updated.find(actor => !actor.layerState.leaving) || null;
        for (const actor of previous)
            if (updated.indexOf(actor) < 0) {
                actor.retire();
                actor.destroy();
            }
        for (const actor of updated)
            actor.applyState();
    }
    function sync(): void {
        if (!_completed)
            return;
        if (!live || !visible || !componentPath) {
            clear();
            return;
        }
        if (componentPath.indexOf('styles/' + mode + '/') !== 0)
            return;
        const next = _layers.length ? Layers.nextShownLayers(_layers, mode, motionEnabled, motionEnabled) : [
            {
                key: 0,
                value: mode,
                leaving: false,
                comesIn: false,
                waits: false
            }
        ];
        _loadError = '';
        applyLayers(next);
    }
    function start(key: int, force: bool): void {
        if (!_completed || !_current || _current.layerState.key !== key || (!force && !_current.hasFrame))
            return;
        const next = Layers.startedLayers(_layers, key);
        if (next !== _layers)
            applyLayers(next);
    }
    function completeLeave(key: int): void {
        if (!_completed || !_layers.some(layer => layer.key === key && layer.leaving))
            return;
        applyLayers(_layers.filter(layer => layer.key !== key));
    }
    function schedule(): void {
        if (_completed)
            refresh.restart();
    }
    onComponentPathChanged: schedule()
    onModeChanged: schedule()
    onMotionEnabledChanged: schedule()
    onLiveChanged: if (live)
        schedule()
    else
        clear()
    onVisibleChanged: if (visible)
        schedule()
    else
        clear()
    Component.onCompleted: {
        _completed = true;
        schedule();
    }
    Component.onDestruction: {
        _completed = false;
        refresh.stop();
        clear();
    }
    Timer {
        id: refresh
        interval: 0
        onTriggered: root.sync()
    }
    Component {
        id: actorComponent
        Item {
            id: actor
            required property var layerState
            required property string sourcePath
            readonly property string modeKey: layerState.value
            readonly property var styleFrame: root.previewFraming ? root.previewFraming(modeKey) : null
            readonly property bool leaving: layerState.leaving
            readonly property var renderer: loader.item
            readonly property real transitionBytes: frame.plannedBytes
            readonly property string errorString: frame.errorString || (renderer ? renderer.errorString || renderer.renderError || '' : '')
            property bool retired: false
            property bool candidate: false
            property bool hasFrame: false
            property bool timedOut: false
            property bool entered: false
            property bool departing: false
            property real progress: 1
            anchors.fill: parent
            enabled: !layerState.leaving
            function retire(): void {
                retired = true;
                enter.stop();
                leave.stop();
                readyLimit.stop();
                readyProbe.stop();
                fallback.stop();
                loader.active = false;
            }
            function probe(): void {
                if (retired || !renderer || loader.status !== Loader.Ready) {
                    candidate = false;
                    return;
                }
                candidate = ('renderReady' in renderer) ? renderer.renderReady : !('busy' in renderer) || !renderer.busy;
            }
            function reportFrame(): void {
                if (retired || hasFrame || !candidate)
                    return;
                hasFrame = true;
                readyLimit.stop();
                root.start(layerState.key, false);
            }
            function applyState(): void {
                if (retired)
                    return;
                if (!root.motionEnabled) {
                    enter.stop();
                    leave.stop();
                    readyLimit.stop();
                    fallback.stop();
                    progress = 1;
                    return;
                }
                if (layerState.waits) {
                    if (!layerState.leaving && !hasFrame && !readyLimit.running)
                        readyLimit.start();
                    if (hasFrame)
                        root.start(layerState.key, false);
                    return;
                }
                readyLimit.stop();
                if (layerState.leaving) {
                    if (departing)
                        return;
                    departing = true;
                    enter.stop();
                    leave.from = progress;
                    leave.start();
                    fallback.start();
                } else {
                    if (departing) {
                        leave.stop();
                        fallback.stop();
                        departing = false;
                        progress = 1;
                    }
                    if (layerState.comesIn && !entered) {
                        entered = true;
                        enter.start();
                    }
                }
            }
            Component.onCompleted: {
                if (layerState.comesIn)
                    progress = 0;
                readyProbe.start();
                applyState();
            }
            Component.onDestruction: retire()
            Timer {
                id: readyProbe
                interval: 0
                onTriggered: actor.probe()
            }
            Timer {
                id: readyLimit
                interval: 1500
                onTriggered: {
                    actor.timedOut = true;
                    root.start(actor.layerState.key, true);
                }
            }
            Timer {
                id: fallback
                interval: Layers.softFocus.leave.duration + 1000
                onTriggered: root.completeLeave(actor.layerState.key)
            }
            SequentialAnimation {
                id: enter
                objectName: "foliaStyleEnter"
                PauseAnimation {
                    duration: Layers.softFocus.enter.delay
                }
                NumberAnimation {
                    target: actor
                    property: 'progress'
                    to: 1
                    duration: Layers.softFocus.enter.duration
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: root.easingCurve(Layers.softFocus.enter.easing)
                }
            }
            NumberAnimation {
                id: leave
                target: actor
                property: 'progress'
                to: 0
                duration: Layers.softFocus.leave.duration
                easing.type: Easing.BezierSpline
                easing.bezierCurve: root.easingCurve(Layers.softFocus.leave.easing)
                onFinished: root.completeLeave(actor.layerState.key)
            }
            Item {
                id: picture
                anchors.fill: parent
                Loader {
                    id: loader
                    anchors.fill: actor.styleFrame ? null : parent
                    x: actor.styleFrame ? actor.styleFrame.x : 0
                    y: actor.styleFrame ? actor.styleFrame.y : 0
                    width: actor.styleFrame ? actor.styleFrame.width : parent.width
                    height: actor.styleFrame ? actor.styleFrame.height : parent.height
                    scale: actor.styleFrame ? actor.styleFrame.scale : 1
                    transformOrigin: Item.TopLeft
                    asynchronous: true
                    Component.onCompleted: setSource(Qt.resolvedUrl('../' + actor.sourcePath), {
                        preparedLines: Qt.binding(() => root.preparedLines),
                        currentIndex: Qt.binding(() => root.currentIndex),
                        timeSeconds: Qt.binding(() => root.timeSeconds),
                        baseFont: Qt.binding(() => root.baseFont),
                        settings: Qt.binding(() => root.settings),
                        primaryColor: Qt.binding(() => root.primaryColor),
                        secondaryColor: Qt.binding(() => root.secondaryColor),
                        accentColor: Qt.binding(() => root.accentColor),
                        dark: Qt.binding(() => root.dark),
                        live: Qt.binding(() => root.live && !actor.retired),
                        motionEnabled: Qt.binding(() => root.motionEnabled)
                    })
                    onStatusChanged: if (status === Loader.Error && !actor.retired)
                        root._loadError = qsTr('无法载入 Folia 样式：%1').arg(actor.modeKey)
                    onLoaded: if (!actor.retired) {
                        root.bindInputs(item);
                        readyProbe.restart();
                    }
                }
            }
            LayerTransitionFrame {
                id: frame
                anchors.fill: parent
                sourceItem: picture
                progress: actor.progress
                live: root.live && !actor.retired
            }
            Connections {
                target: loader.item
                ignoreUnknownSignals: true
                function onRenderReadyChanged(): void {
                    actor.probe();
                }
                function onBusyChanged(): void {
                    actor.probe();
                }
                function onFrameRevisionChanged(): void {
                    actor.probe();
                }
                function onLayoutRevisionChanged(): void {
                    actor.probe();
                }
                function onPictureDrawn(): void {
                    actor.probe();
                }
                function onSeekRequested(seconds: real): void {
                    if (root.live && !actor.leaving && root._current === actor)
                        root.seekRequested(seconds);
                }
                function onSettingsPatchRequested(patch: var): void {
                    if (root.live && !actor.leaving && root._current === actor)
                        root.settingsPatchRequested(patch);
                }
            }
            Connections {
                target: actor.Window.window
                function onFrameSwapped(): void {
                    if (!actor.retired && !actor.hasFrame) {
                        actor.probe();
                        if (actor.candidate)
                            actor.reportFrame();
                    }
                }
            }
        }
    }
}
