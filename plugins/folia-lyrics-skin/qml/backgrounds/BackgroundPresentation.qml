// Folia VisualizerBackgroundTransition: source-keyed, first-frame coordinated, at most two layers.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../shared"
import "../shared/transitions/layers.mjs" as Layers
import "monet/source-layer.mjs" as MonetSource
import "monet/presentation.mjs" as MonetSettings
import "nomand/kernel.mjs" as NomandSettings
import "../shared/handoff-clock.mjs" as HandoffClock
import "../shared/handoff-cover.mjs" as HandoffCover

Item {
    id: root
    property var settings: ({})
    property var bands: ({
            bass: 0,
            lowMid: 0,
            mid: 0,
            vocal: 0,
            treble: 0,
            audioPower: 0
        })
    property var coverColors: []
    property var customBackgroundImages: []
    property EchoPluginAssets assetsService: null
    property url coverUrl
    property string seed: "default"
    property color backgroundColor: "#111111"
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: "#6699ff"
    property bool dark: true
    property bool paused: false
    property bool motionEnabled: true
    property bool live: true
    property bool styleWaits: false
    property var songHandoff: null
    readonly property bool following: motionEnabled && songHandoff !== null
    readonly property real handoffProgress: songHandoff ? songHandoff.progress : 0
    readonly property var incomingCover: songHandoff ? { seed: songHandoff.incomingSeed, coverUrl: String(songHandoff.projection.incoming.coverUrl) || null } : null
    readonly property url shownCoverUrl: _keptCover ? _keptCover.coverUrl : incomingCover ? incomingCover.coverUrl || "" : coverUrl
    property var _keptCover: null
    property int colorBlendMs: 600
    readonly property string mode: settings.mode === "still" ? "" : settings.backgroundMode || "latent"
    readonly property var renderer: _current ? _current.renderer : null
    readonly property int layerCount: _actors.length
    readonly property var actors: _actors
    readonly property bool transitionWaits: !!_current && _current.layerState.waits
    readonly property real transitionBytes: _actors.reduce((sum, actor) => sum + actor.transitionBytes, 0)
    readonly property string errorString: _actors.map(actor => actor.errorString).find(Boolean) || ""
    readonly property var inputs: ({
            settings,
            coverUrl: shownCoverUrl,
            seed,
            coverColors,
            customBackgroundImages,
            backgroundColor,
            primaryColor,
            secondaryColor,
            accentColor,
            dark
        })
    readonly property string sourceKey: {
        const song = [];
        if (motionEnabled && mode === "common") {
            song.push(seed || null);
            song.push(settings.commonUseCoverColorBg ? String(shownCoverUrl) || null : null);
        } else if (motionEnabled && mode === "monet") {
            const image = customBackgroundImages.length ? {
                url: String(customBackgroundImages[0].url),
                id: customBackgroundImages[0].handle || customBackgroundImages[0].id
            } : null;
            song.push(MonetSource.resolveMonetSourceUrl(String(shownCoverUrl) || null, image, MonetSettings.resolveMonetBackgroundSettings(settings)));
        } else if (motionEnabled && mode === "nomand") {
            song.push(NomandSettings.resolveSourceUrl(String(shownCoverUrl) || null, customBackgroundImages.length ? String(customBackgroundImages[0].url) : null, NomandSettings.tuning(settings)) || null);
        }
        return JSON.stringify([mode].concat(song));
    }
    property var _layers: []
    property var _actors: []
    property var _current: null
    property bool _completed: false

    function clear(): void {
        const previous = _actors;
        _actors = [];
        _layers = [];
        _current = null;
        _keptCover = null;
        for (const actor of previous) {
            actor.retire();
            actor.destroy();
        }
    }
    function schedule(): void {
        if (_completed)
            reconcile.restart();
    }
    function curve(css: string): var {
        return css.slice(css.indexOf("(") + 1, -1).split(",").map(Number).concat([1, 1]);
    }
    function sync(): void {
        if (!_completed)
            return;
        if (!live || !visible) {
            clear();
            return;
        }
        _keptCover = HandoffCover.keepHandoffCover(_keptCover, incomingCover, incomingCover ? incomingCover.seed : seed, String(coverUrl));
        const next = _layers.length ? Layers.nextShownLayers(_layers, sourceKey, motionEnabled, motionEnabled) : [
            {
                key: 0,
                value: sourceKey,
                leaving: false,
                comesIn: false,
                waits: false
            }
        ];
        applyLayers(next);
    }
    function applyLayers(next: var): void {
        _layers = next;
        const previous = _actors, updated = [];
        const currentIndex = next.findIndex(layer => !layer.leaving);
        for (let i = 0; i < next.length; ++i) {
            const state = next[i];
            let actor = previous.find(item => item.layerState.key === state.key);
            if (!actor)
                actor = backgroundLayer.createObject(root, {
                    layerState: state,
                    heldInputs: root.inputs
                });
            if (!actor)
                continue;
            actor.z = i;
            actor.underNext = state.leaving && i < currentIndex && mode !== "";
            actor.layerState = state;
            if (!state.leaving && state.value === sourceKey && !styleWaits)
                actor.heldInputs = inputs;
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
    function start(key: int): void {
        if (!_completed || styleWaits || !_current || _current.layerState.key !== key || !_current.ready)
            return;
        const next = Layers.startedLayers(_layers, key);
        if (next !== _layers)
            applyLayers(next);
    }
    function completeLeave(key: int): void {
        if (!_completed)
            return;
        applyLayers(_layers.filter(layer => layer.key !== key));
    }
    onSourceKeyChanged: schedule()
    onInputsChanged: schedule()
    onCoverUrlChanged: schedule()
    onSeedChanged: schedule()
    onIncomingCoverChanged: schedule()
    onMotionEnabledChanged: schedule()
    onSongHandoffChanged: schedule()
    onStyleWaitsChanged: {
        schedule();
        if (_current)
            start(_current.layerState.key);
    }
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
        reconcile.stop();
        clear();
    }
    Timer {
        id: reconcile
        interval: 0
        onTriggered: root.sync()
    }
    Component {
        id: backgroundLayer
        Item {
            id: actor
            required property var layerState
            required property var heldInputs
            property bool underNext: false
            property bool ready: false
            property bool candidate: false
            property bool entered: false
            property bool departing: false
            property bool retired: false
            property real progress: 1
            property bool follows: false
            property real followFrom: 0
            property real followedProgress: 0
            readonly property string modeKey: JSON.parse(layerState.value)[0]
            readonly property var renderer: loader.item
            readonly property real transitionBytes: frame.plannedBytes
            readonly property string errorString: frame.errorString || (renderer ? renderer.errorString || "" : "")
            anchors.fill: parent
            enabled: !layerState.leaving
            function retire(): void {
                retired = true;
                enter.stop();
                leave.stop();
                readyLimit.stop();
                readyProbe.stop();
                fallback.stop();
                followFinish.stop();
                resume.stop();
                loader.active = false;
            }
            function probe(): void {
                if (retired)
                    return;
                if (modeKey === "") {
                    candidate = true;
                    return;
                }
                if (!renderer)
                    return;
                candidate = !("renderReady" in renderer) || renderer.renderReady;
            }
            function report(): void {
                if (retired)
                    return;
                ready = true;
                readyLimit.stop();
                root.start(layerState.key);
            }
            function applyState(): void {
                if (retired)
                    return;
                if (!root.motionEnabled) {
                    follows = false;
                    resume.stop(); followFinish.stop();
                    enter.stop();
                    leave.stop();
                    progress = 1;
                    return;
                }
                if (layerState.waits) {
                    if (!layerState.leaving && !ready && !readyLimit.running)
                        readyLimit.start();
                    if (ready)
                        root.start(layerState.key);
                    return;
                }
                readyLimit.stop();
                if (root.following) {
                    if (layerState.leaving && !departing) {
                        departing = true; enter.stop(); leave.stop(); fallback.stop();
                        startFollowing();
                    } else if (!layerState.leaving) {
                        if (departing) {
                            departing = false; follows = false; leave.stop(); fallback.stop(); progress = 1;
                        }
                        if (layerState.comesIn && !entered) {
                            entered = true; startFollowing();
                        }
                    }
                    return;
                }
                if (follows) {
                    follows = false;
                    if ((layerState.leaving && underNext) || (!layerState.leaving && entered)) {
                        resume.to = 1;
                        resume.duration = Math.max(0, (1 - followedProgress) * ((Layers.softFocus.enter.delay || 0) + Layers.softFocus.enter.duration));
                        resume.start();
                        return;
                    }
                }
                if (layerState.leaving) {
                    if (departing)
                        return;
                    departing = true;
                    enter.stop();
                    leave.to = underNext ? 1 : 0;
                    leave.duration = underNext ? (Layers.softFocus.enter.delay || 0) + Layers.softFocus.enter.duration : Layers.softFocus.leave.duration;
                    leave.easing.type = underNext ? Easing.Linear : Easing.BezierSpline;
                    if (!underNext)
                        leave.easing.bezierCurve = root.curve(Layers.softFocus.leave.easing);
                    leave.start();
                    fallback.interval = leave.duration + 1000;
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
            function startFollowing(): void {
                resume.stop();
                followFrom = Math.max(0, Math.min(1, root.handoffProgress));
                follows = followFrom < 1;
                if (follows) updateFollowing();
                else {
                    resume.to = layerState.leaving && !underNext ? 0 : 1;
                    resume.duration = (Layers.softFocus.enter.delay || 0) + Layers.softFocus.enter.duration;
                    resume.start();
                }
            }
            function updateFollowing(): void {
                if (!follows || retired) return;
                followedProgress = HandoffClock.progressSince(root.handoffProgress, followFrom);
                progress = layerState.leaving ? (underNext ? 1 : 1 - followedProgress) : followedProgress;
                if (followedProgress >= 1 && layerState.leaving) followFinish.restart();
            }
            Component.onCompleted: {
                if (layerState.comesIn)
                    progress = 0;
                readyProbe.start();
                applyState();
            }
            Component.onDestruction: retire()
            Timer {
                id: followFinish
                interval: 0
                onTriggered: if (!actor.retired && actor.layerState.leaving)
                    root.completeLeave(actor.layerState.key)
            }
            NumberAnimation {
                id: resume
                target: actor
                property: "progress"
                easing.type: Easing.Linear
                onFinished: if (!actor.retired && actor.layerState.leaving)
                    root.completeLeave(actor.layerState.key)
            }
            Connections {
                target: root
                function onHandoffProgressChanged(): void { actor.updateFollowing(); }
            }
            Timer {
                id: readyProbe
                interval: 0
                onTriggered: actor.probe()
            }
            Timer {
                id: readyLimit
                interval: 1000
                onTriggered: actor.report()
            }
            Timer {
                id: fallback
                onTriggered: root.completeLeave(actor.layerState.key)
            }
            SequentialAnimation {
                id: enter
                PauseAnimation {
                    duration: Layers.softFocus.enter.delay || 0
                }
                NumberAnimation {
                    target: actor
                    property: "progress"
                    to: 1
                    duration: Layers.softFocus.enter.duration
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: root.curve(Layers.softFocus.enter.easing)
                }
            }
            NumberAnimation {
                id: leave
                target: actor
                property: "progress"
                onFinished: root.completeLeave(actor.layerState.key)
            }
            Loader {
                id: loader
                anchors.fill: parent
                active: actor.modeKey !== ""
                Component.onCompleted: {
                    if (actor.modeKey === "")
                        return;
                    const values = {
                        paused: Qt.binding(() => root.paused),
                        motionEnabled: Qt.binding(() => root.motionEnabled)
                    };
                    let keys = ["primaryColor", "accentColor"];
                    if (actor.modeKey === "sora") {
                        keys = keys.concat(["dark"]);
                        values.blank = Qt.binding(() => actor.heldInputs.settings.soraBlank === true);
                    } else {
                        keys = keys.concat(["settings", "backgroundColor", "secondaryColor"]);
                        values.live = Qt.binding(() => root.live && !actor.retired);
                        if (actor.modeKey === "monet") {
                            keys = keys.concat(["coverUrl", "customBackgroundImages", "dark"]);
                            values.assetsService = Qt.binding(() => root.assetsService);
                        } else if (actor.modeKey === "nomand") {
                            keys = keys.concat(["coverUrl", "dark"]);
                            values.assetsService = Qt.binding(() => root.assetsService);
                            values.backgroundImageUrl = Qt.binding(() => actor.heldInputs.customBackgroundImages.length ? actor.heldInputs.customBackgroundImages[0].url : "");
                        } else {
                            values.bands = Qt.binding(() => root.bands);
                            keys = keys.concat(actor.modeKey === "common" ? ["coverUrl", "seed"] : ["coverColors"]);
                        }
                    }
                    if (actor.modeKey === "sora" || actor.modeKey === "latent")
                        values.colorBlendMs = Qt.binding(() => root.colorBlendMs);
                    for (const key of keys)
                        values[key] = Qt.binding(() => actor.heldInputs[key]);
                    const url = actor.modeKey === "monet" ? "monet/MonetBackground.qml" : actor.modeKey === "nomand" ? "nomand/Nomand.qml" : actor.modeKey === "sora" ? "sora/Sora.qml" : actor.modeKey === "common" ? "common/Common.qml" : "latent/Latent.qml";
                    setSource(Qt.resolvedUrl(url), values);
                }
                onLoaded: actor.probe()
            }
            LayerTransitionFrame {
                id: frame
                anchors.fill: parent
                sourceItem: loader
                progress: actor.progress
                live: root.live && !actor.retired && actor.modeKey !== ""
            }
            Connections {
                target: loader.item
                ignoreUnknownSignals: true
                function onRenderReadyChanged(): void {
                    actor.probe();
                }
                function onPictureDrawn(): void {
                    actor.probe();
                }
            }
            Connections {
                target: actor.Window.window
                function onFrameSwapped(): void {
                    if (actor.candidate && !actor.ready)
                        actor.report();
                }
            }
        }
    }
}
