// Source desktop FluidBackground. At most two immutable covers, no frame bitmap uploads.
pragma ComponentBehavior: Bound
import QtQuick
import "../../shared"

Item {
    id: root
    property url coverUrl
    property color backgroundColor: "#111111"
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property bool live: true
    property bool motionEnabled: true
    readonly property int layerCount: _actors.length
    readonly property bool renderReady: !String(coverUrl) || probe.status === Image.Error || (_actors.length > 0 && _actors[_actors.length - 1].ready)
    readonly property real fboBytes: _actors.reduce((total, actor) => total + actor.fboBytes, 0)
    readonly property string errorString: probe.status === Image.Error ? "Common cover image decode failed" : _actors.map(actor => actor.errorString).find(Boolean) || ""
    property var _actors: []
    property int _serial: 0
    property string _requested: ""
    property string _decoded: ""
    property bool _completed: false
    clip: true
    function clear(): void {
        for (const actor of _actors)
            actor.destroy();
        _actors = [];
        _requested = "";
        _decoded = "";
    }
    function request(): void {
        if (!_completed)
            return;
        if (!live || !coverUrl) {
            clear();
            return;
        }
        const next = String(coverUrl);
        if (next !== _requested)
            _decoded = "";
        _requested = next;
        if (probe.status === Image.Ready)
            decoded();
    }
    function decoded(): void {
        if (!live || probe.status !== Image.Ready || String(probe.source) !== _requested || _decoded === _requested)
            return;
        _decoded = _requested;
        const previous = _actors.length ? _actors[_actors.length - 1] : null;
        // Fast replacements retain only the actual current top and the newcomer.
        for (const actor of _actors)
            if (actor !== previous)
                actor.destroy();
        const next = layer.createObject(root, {
            imageSource: _requested,
            serial: ++_serial,
            fadeMs: previous && motionEnabled ? 1500 : 0
        });
        _actors = previous ? [previous, next] : [next];
    }
    function reveal(actor: var): void {
        if (!actor.ready || actor.revealed || _actors.indexOf(actor) < 0)
            return;
        actor.revealed = true;
        actor.opacity = 1;
        if (!actor.fadeMs)
            prune(actor);
    }
    function prune(actor: var): void {
        if (!_actors.length || _actors[_actors.length - 1] !== actor || !actor.ready)
            return;
        for (const old of _actors)
            if (old !== actor)
                old.destroy();
        _actors = [actor];
    }
    onCoverUrlChanged: request()
    onLiveChanged: request()
    Component.onCompleted: {
        _completed = true;
        request();
    }
    Component.onDestruction: clear()
    ColorBlend {
        id: primary
        targetColor: root.primaryColor
        durationMs: 1000
        live: root.live
        motionEnabled: root.motionEnabled
    }
    ColorBlend {
        id: secondary
        targetColor: root.secondaryColor
        durationMs: 1000
        live: root.live
        motionEnabled: root.motionEnabled
    }
    ColorBlend {
        id: background
        targetColor: root.backgroundColor
        durationMs: 1000
        easingType: Easing.BezierSpline
        easingCurve: [.4, 0, .2, 1, 1, 1]
        live: root.live
        motionEnabled: root.motionEnabled
    }
    ShaderEffect {
        anchors.fill: parent
        property color backgroundColor: background.value
        property color primaryColor: primary.value
        property color secondaryColor: secondary.value
        property real overlayEnabled: !root.coverUrl || probe.status === Image.Error ? 1 : 0
        fragmentShader: "fallback.frag.qsb"
    }
    Image {
        id: probe
        visible: false
        source: root.live ? root.coverUrl : ""
        sourceSize: Qt.size(640, 640)
        asynchronous: true
        autoTransform: true
        cache: false
        onStatusChanged: if (status === Image.Ready)
            root.decoded()
    }
    Component {
        id: layer
        BlurredCover {
            id: actor
            required property url imageSource
            required property int serial
            required property int fadeMs
            property bool revealed: false
            anchors.fill: parent
            source: imageSource
            live: root.live
            primaryColor: primary.value
            secondaryColor: secondary.value
            opacity: 0
            onReadyChanged: root.reveal(actor)
            Behavior on opacity {
                NumberAnimation {
                    duration: actor.fadeMs
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: [.42, 0, .58, 1, 1, 1]
                    onFinished: root.prune(actor)
                }
            }
        }
    }
}
