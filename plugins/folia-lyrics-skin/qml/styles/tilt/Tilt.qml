// Folia a8da4437 Tilt. Shared stage, typography, subtitles and playback stay caller-owned.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    objectName: "foliaTilt"
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: primaryColor
    property bool live: true
    property bool motionEnabled: true
    property bool dark: true
    property EchoPluginText textService: null
    readonly property var currentPrepared: preparedLines && currentIndex >= 0 ? preparedLines[currentIndex] : null
    readonly property var layout: preparation.layout
    readonly property bool busy: preparation.busy
    readonly property int layoutRevision: preparation.layoutRevision
    readonly property int fragmentCacheSize: preparation.cacheSize
    readonly property int fragmentRequestCount: preparation.requestCount
    readonly property int layerCount: _actors.length
    readonly property var renderer: _activeActor ? _activeActor.renderer : null
    readonly property var renderers: _activeActor ? _activeActor.renderers : []
    readonly property string errorString: preparation.errorString || (_activeActor ? _activeActor.errorString : "")
    readonly property bool textVisible: settings.showText !== false
    property var _actors: []
    property var _activeActor: null
    property real _wallSeconds: 0
    property bool _completed: false
    readonly property bool _animating: _actors.some(actor => actor.animating)
    clip: true

    function clear(): void {
        for (const actor of _actors)
            actor.destroy();
        _actors = [];
        _activeActor = null;
    }
    function leave(): void {
        if (!_activeActor)
            return;
        if (motionEnabled) {
            _activeActor.leavingAt = _wallSeconds;
        } else {
            _actors = _actors.filter(actor => actor !== _activeActor);
            _activeActor.destroy();
        }
        _activeActor = null;
    }
    function mount(result: var): void {
        if (!_completed || !live || !visible || !textVisible || !currentPrepared)
            return;
        leave();
        const actor = actorComponent.createObject(root, {
            line: currentPrepared.line,
            layout: result,
            enteredAt: _wallSeconds
        });
        if (!actor)
            return;
        const actors = _actors.slice();
        actors.push(actor);
        while (actors.length > 4)
            actors.shift().destroy();
        _actors = actors;
        _activeActor = actor;
        actor.publish();
    }
    function collect(): void {
        const held = [];
        for (const actor of _actors) {
            if (actor.leavingAt >= 0 && (!motionEnabled || _wallSeconds - actor.leavingAt >= 0.6))
                actor.destroy();
            else
                held.push(actor);
        }
        if (held.length !== _actors.length)
            _actors = held;
    }
    onCurrentPreparedChanged: leave()
    onTextVisibleChanged: if (!textVisible)
        leave()
    else if (layout)
        mount(layout)
    onLiveChanged: if (!live)
        clear()
    onVisibleChanged: if (!visible)
        clear()
    onMotionEnabledChanged: collect()
    Component.onCompleted: _completed = true
    Component.onDestruction: clear()
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled && root._animating
        onTriggered: {
            root._wallSeconds += frameTime;
            root.collect();
        }
    }
    TiltLayout {
        id: preparation
        objectName: "foliaTiltPreparation"
        line: root.currentPrepared ? root.currentPrepared.line : null
        viewportWidth: root.width
        settings: root.settings
        baseFont: root.baseFont
        textService: root.textService
        live: root.live && root.visible && root.textVisible
        onLayoutChanged: if (!layout)
            root.leave()
        onReady: result => root.mount(result)
    }
    Component {
        id: actorComponent
        TiltLine {
            settings: root.settings
            baseFont: root.baseFont
            primaryColor: root.primaryColor
            accentColor: root.accentColor
            viewportWidth: root.width
            timeSeconds: root.timeSeconds
            clock: root._wallSeconds
            motionEnabled: root.motionEnabled
            x: (root.width - width) / 2
            y: (root.height - height) / 2
        }
    }
    Text {
        anchors.centerIn: parent
        visible: opacity > 0
        text: qsTr("等待音乐")
        color: root.secondaryColor
        font: waitingFont.value
        opacity: root.live && root.textVisible && root.currentIndex < 0 ? 0.5 : 0
        Behavior on opacity {
            NumberAnimation {
                duration: root.motionEnabled ? 300 : 0
            }
        }
        textFormat: Text.PlainText
    }
    Text {
        objectName: "foliaTiltError"
        anchors.centerIn: parent
        width: Math.max(0, parent.width - 64)
        horizontalAlignment: Text.AlignHCenter
        wrapMode: Text.Wrap
        visible: root.live && root.errorString.length > 0
        text: root.errorString
        color: root.secondaryColor
        font: errorFont.value
        textFormat: Text.PlainText
    }
    TiltFont {
        id: waitingFont
        base: root.baseFont
        pixelSize: 24
    }
    TiltFont {
        id: errorFont
        base: root.baseFont
        pixelSize: 14
    }
}
