// Real Folia Classic renderer, a8da4437. AGPL-3.0-only.
// Playback, preparation, theme selection and subtitle chrome remain caller-owned.
pragma ComponentBehavior: Bound
import QtQuick
import "layout.mjs" as Layout
import "motion.mjs" as Motion

Item {
    id: root
    required property var preparedLines
    property int currentIndex: 0
    property real timeSeconds: 0
    property font baseFont: Qt.font({})
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#cccccc"
    property color accentColor: primaryColor
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    readonly property bool showText: settings.showText === undefined || settings.showText
    readonly property int layerCount: _actors.length
    readonly property var renderer: _activeActor ? _activeActor.glyphRenderer : null
    readonly property string errorString: _activeActor ? _activeActor.errorString : ""
    property var _actors: []
    property var _activeActor: null
    property bool _completed: false
    property real _ambientSeconds: 0
    readonly property var _breathing: live && motionEnabled ? Motion.breathingPose(_ambientSeconds, settings) : ({
            y: 0,
            scale: 1
        })

    clip: true

    function _clear() {
        for (const actor of _actors)
            actor.destroy();
        _actors = [];
        _activeActor = null;
    }
    function _sync(updatePrepared) {
        if (!_completed)
            return;
        if (!live || !visible) {
            _clear();
            return;
        }
        let changed = false;
        const held = [];
        for (const actor of _actors) {
            if (actor.leavingAt >= 0 && (!motionEnabled || Motion.linePose(actor.profile, Math.max(0, _ambientSeconds - actor.leavingAt), true, actor.hiddenExit, actor.leaveOrigin).finished)) {
                actor.destroy();
                changed = true;
            } else {
                held.push(actor);
            }
        }
        const next = showText && preparedLines && currentIndex >= 0 ? preparedLines[currentIndex] : null;
        const key = next && next.line ? String(next.line.startTime) : "";
        if (_activeActor && next && _activeActor.sourceKey === key) {
            if (updatePrepared)
                _activeActor.prepared = next;
        } else {
            if (_activeActor) {
                if (motionEnabled) {
                    _activeActor.leaveOrigin = _activeActor.lineMotion;
                    _activeActor.hiddenExit = !showText;
                    _activeActor.leavingAt = _ambientSeconds;
                } else {
                    held.splice(held.indexOf(_activeActor), 1);
                    _activeActor.destroy();
                }
                _activeActor = null;
                changed = true;
            }
            if (next && next.line) {
                const actor = lineComponent.createObject(breathing, {
                    prepared: next,
                    enteredAt: timeSeconds,
                    enteredPresentationAt: _ambientSeconds,
                    sourceKey: key
                });
                if (actor) {
                    held.push(actor);
                    _activeActor = actor;
                    changed = true;
                }
            }
        }
        // A paused external clock must not retain an unbounded series of seek exits.
        while (held.length > 4) {
            held.shift().destroy();
            changed = true;
        }
        if (changed)
            _actors = held;
    }

    onCurrentIndexChanged: _sync(true)
    onPreparedLinesChanged: _sync(true)
    onTimeSecondsChanged: _sync()
    onShowTextChanged: _sync()
    onLiveChanged: _sync()
    onVisibleChanged: _sync()
    onMotionEnabledChanged: _sync()
    on_AmbientSecondsChanged: _sync()
    Component.onCompleted: {
        _completed = true;
        _sync();
    }

    FrameAnimation {
        running: root.live && root.motionEnabled && root.visible
        onTriggered: root._ambientSeconds += frameTime
    }
    Item {
        id: breathing
        anchors.fill: parent
        transform: Translate {
            y: root._breathing.y
        }
        scale: root._breathing.scale
        transformOrigin: Item.Center
    }
    Component {
        id: lineComponent
        ClassicLine {
            settings: root.settings
            viewportWidth: root.width
            timeSeconds: root.timeSeconds
            presentationSeconds: root._ambientSeconds
            baseFont: root.baseFont
            primaryColor: root.primaryColor
            accentColor: root.accentColor
            motionEnabled: root.motionEnabled
            x: (root.width - width) / 2
            y: (root.height - height) / 2
        }
    }
}
