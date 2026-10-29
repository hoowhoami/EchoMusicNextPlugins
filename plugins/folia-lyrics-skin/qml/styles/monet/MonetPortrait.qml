// Folia a8da4437 MonetPortraitImage: decoded four-layer stack, cue-follow and cancel.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import EchoMusic.PluginSdk
import "../../shared"
import "../../shared/handoff-clock.mjs" as HandoffClock
import "portrait-crossfade.mjs" as Crossfade

Item {
    id: root
    property url source
    property EchoPluginAssets assetsService: null
    property bool live: true
    property bool motionEnabled: true
    property var songHandoff: null
    readonly property bool following: songHandoff !== null
    readonly property real handoffProgress: songHandoff ? songHandoff.progress : 0
    readonly property int layerCount: _actors.length
    readonly property var actors: _actors
    readonly property string errorString: loader.errorString || (loader.status === Image.Error && source ? "Monet portrait image decode failed" : "")
    property var _actors: []
    property int _serial: 0
    property string _requested: ""
    property string _decodedRequest: ""
    property bool _wasFollowing: false
    property string _settlingKey: ""
    function records(): var {
        return _actors.map(actor => {
            const value = {
                key: actor.key,
                src: actor.imageSource
            };
            if (actor.handoffFrom !== undefined)
                value.handoffFrom = actor.handoffFrom;
            if (actor.leaving)
                value.leaving = true;
            return value;
        });
    }
    function clear(): void {
        reconcile.stop();
        decodeReady.stop();
        settle.stop();
        departing.stop();
        const old = _actors;
        _actors = [];
        for (const actor of old)
            actor.destroy();
        loader.source = "";
        _requested = "";
        _decodedRequest = "";
        _wasFollowing = false;
        _settlingKey = "";
    }
    function install(layers: var): void {
        const keep = [];
        for (const value of layers) {
            let actor = _actors.find(item => item.key === value.key);
            if (!actor)
                actor = layerComponent.createObject(root, {
                    key: value.key,
                    imageSource: value.src,
                    handoffFrom: value.handoffFrom,
                    leaving: value.leaving === true
                });
            else {
                actor.handoffFrom = value.handoffFrom;
                actor.leaving = value.leaving === true;
            }
            if (actor)
                keep.push(actor);
        }
        for (const actor of _actors)
            if (keep.indexOf(actor) < 0)
                actor.destroy();
        _actors = keep;
        armRetirement();
    }
    function armRetirement(): void {
        const top = _actors.length > 1 ? _actors[_actors.length - 1] : null;
        const key = top && top.handoffFrom === undefined && !top.leaving ? top.key : "";
        if (_settlingKey !== key) {
            settle.stop();
            _settlingKey = key;
            if (key)
                settle.start();
        }
        if (_actors.some(actor => actor.leaving)) {
            if (!departing.running)
                departing.start();
        } else
            departing.stop();
    }
    function request(): void {
        // The masked portrait is intentionally an invisible MultiEffect source.
        if (!live) {
            clear();
            return;
        }
        // Owned-deferred so source and progress disappear in the same commit.
        if (_wasFollowing && !following)
            install(Crossfade.endMonetPortraitHandoff(records(), String(source) || null));
        _wasFollowing = following;
        const next = String(source);
        if (next !== _requested)
            _decodedRequest = "";
        _requested = next;
        loader.source = next;
        for (const actor of _actors)
            actor.updateOpacity();
    }
    function decoded(): void {
        if (!live || loader.status !== Image.Ready || String(loader.source) !== _requested || !_requested || _decodedRequest === _requested)
            return;
        if (loader.prepareFrames && (!loader.animationLease || !loader.animationLease.ready))
            return;
        _decodedRequest = _requested;
        const along = following && handoffProgress < 1 ? Math.max(0, handoffProgress) : undefined;
        install(Crossfade.pushMonetPortraitLayer(records(), _requested, "monet-cover-" + (++_serial), along));
    }
    onSourceChanged: reconcile.restart()
    onFollowingChanged: reconcile.restart()
    onLiveChanged: if (live)
        reconcile.restart()
    else
        clear()
    onVisibleChanged: if (live)
        reconcile.restart()
    Component.onCompleted: reconcile.restart()
    Component.onDestruction: clear()
    Timer {
        id: reconcile
        interval: 0
        onTriggered: root.request()
    }
    Timer {
        id: decodeReady
        interval: 0
        onTriggered: root.decoded()
    }
    Timer {
        id: settle
        interval: Crossfade.MONET_PORTRAIT_FADE_MS
        onTriggered: root.install(Crossfade.settleMonetPortraitLayers(root.records(), root._settlingKey))
    }
    Timer {
        id: departing
        interval: Crossfade.MONET_PORTRAIT_FADE_MS
        onTriggered: root.install(Crossfade.dropLeavingMonetPortraitLayers(root.records()))
    }
    AssetImage {
        id: loader
        objectName: "monetPortraitDecoder"
        visible: false
        assetsService: root.assetsService
        live: root.live
        playing: root.motionEnabled
        width: root.width
        height: root.height
        sourceSize: Qt.size(Math.max(1, root.width * Screen.devicePixelRatio), Math.max(1, root.height * Screen.devicePixelRatio))
        fillMode: Image.PreserveAspectCrop
        prepareFrames: !!root.assetsService || !!String(source) && !/\.(png|jpe?g|svg)(?:[?#]|$)/i.test(String(source))
        asynchronous: true
        cache: true
        // A native cache hit may keep Image.Ready throughout the source change.
        // Wait for the new real lease and the frame binding to settle together.
        onAnimationLeaseChanged: if (root.live)
            decodeReady.restart()
        onSourceChanged: if (root.live && !prepareFrames)
            decodeReady.restart()
        onStatusChanged: if (root.live)
            decodeReady.restart()
    }
    Component {
        id: layerComponent
        AssetImage {
            id: actor
            required property string key
            required property string imageSource
            property var handoffFrom: undefined
            property bool leaving: false
            readonly property bool follows: root.following && handoffFrom !== undefined
            readonly property real target: leaving ? 0 : String(root.source) ? 1 : 0
            function updateOpacity(): void {
                opacity = follows ? target * HandoffClock.progressSince(root.handoffProgress, handoffFrom) : target;
            }
            anchors.fill: parent
            source: imageSource
            assetsService: root.assetsService
            live: root.live
            playing: root.motionEnabled
            sourceSize: Qt.size(Math.max(1, root.width * Screen.devicePixelRatio), Math.max(1, root.height * Screen.devicePixelRatio))
            prepareFrames: !!root.assetsService || !!String(source) && !/\.(png|jpe?g|svg)(?:[?#]|$)/i.test(String(source))
            asynchronous: true
            cache: true
            fillMode: Image.PreserveAspectCrop
            opacity: 0
            Component.onCompleted: updateOpacity()
            onTargetChanged: updateOpacity()
            onFollowsChanged: updateOpacity()
            onHandoffFromChanged: updateOpacity()
            Connections {
                target: root
                function onHandoffProgressChanged(): void {
                    if (actor.follows)
                        actor.updateOpacity();
                }
            }
            Behavior on opacity {
                enabled: !actor.follows
                NumberAnimation {
                    duration: root.motionEnabled ? Crossfade.MONET_PORTRAIT_FADE_MS : 0
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: [.42, 0, .58, 1, 1, 1]
                }
            }
        }
    }
}
