// Source AnimatePresence sync: new scene immediately visible, one 600ms exit.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property string seed: "default"
    property var bands: ({})
    property color secondaryColor: "#999999"
    property color accentColor: "#6699ff"
    property bool hideShapes: false
    property bool disableVignette: false
    property bool paused: false
    property bool live: true
    readonly property int layerCount: _actors.length
    readonly property string errorString: _actors.map(actor => actor.errorString).find(Boolean) || ""
    property var _actors: []
    property var _current: null
    property bool _completed: false
    function clear(): void {
        _current = null;
        for (const actor of _actors)
            actor.destroy();
        _actors = [];
    }
    function drop(actor: var): void {
        if (actor === _current)
            return;
        _actors = _actors.filter(value => value !== actor);
        actor.destroy();
    }
    function change(): void {
        if (!_completed)
            return;
        if (!live) {
            clear();
            return;
        }
        for (const actor of _actors)
            if (actor !== _current)
                actor.destroy();
        const previous = _current;
        _current = layer.createObject(root, {
            secondaryColor,
            accentColor
        });
        _actors = previous ? [previous, _current] : [_current];
        if (previous)
            previous.leaving = true;
    }
    onSeedChanged: change()
    onLiveChanged: change()
    onSecondaryColorChanged: if (_current)
        _current.secondaryColor = secondaryColor
    onAccentColorChanged: if (_current)
        _current.accentColor = accentColor
    Component.onCompleted: {
        _completed = true;
        change();
    }
    Component.onDestruction: clear()
    Component {
        id: layer
        Geometric {
            id: actor
            property bool leaving: false
            anchors.fill: parent
            bands: root.bands
            paused: root.paused
            live: root.live
            hideShapes: root.hideShapes
            disableVignette: root.disableVignette
            opacity: leaving ? 0 : 1
            onLeavingChanged: if (leaving)
                retire.restart()
            Behavior on opacity {
                NumberAnimation {
                    duration: 600
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: [.42, 0, .58, 1, 1, 1]
                }
            }
            Timer {
                id: retire
                interval: 600
                onTriggered: root.drop(actor)
            }
        }
    }
}
