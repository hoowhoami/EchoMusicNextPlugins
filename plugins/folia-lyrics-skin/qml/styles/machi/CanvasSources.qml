// Source canvases repaint only when their original texture version changes.
pragma ComponentBehavior: Bound
import QtQuick
import "../hanabi"

Item {
    id: root
    property var events: []
    property font baseFont
    property bool live: true
    property var sources: new Map()
    property var _actors: new Map()
    property bool ready: false
    property string errorString: ""
    signal changed
    function inspect(): var {
        return Array.from(_actors.entries()).map(([id, actor]) => ({
                    id,
                    ready: actor.ready,
                    paints: actor.paintCount,
                    live: actor.live,
                    visible: actor.visible,
                    size: [actor.width, actor.height],
                    error: actor.errorString
                }));
    }
    function clear(): void {
        for (const actor of _actors.values()) {
            actor.live = false;
            actor.destroy();
        }
        _actors.clear();
        sources = new Map();
        ready = false;
    }
    function sync(): void {
        if (!live) {
            clear();
            return;
        }
        try {
            ready = false;
            for (const event of events) {
                if (event.kind === "retire-texture") {
                    const previous = _actors.get(event.id);
                    if (previous) {
                        previous.live = false;
                        previous.destroy();
                        _actors.delete(event.id);
                    }
                    continue;
                }
                if (event.kind !== "canvas")
                    continue;
                const previous = _actors.get(event.id);
                if (previous && previous.version === event.version)
                    continue;
                if (previous) {
                    previous.live = false;
                    previous.destroy();
                    _actors.delete(event.id);
                }
                const actor = factory.createObject(root, {
                    texture: {
                        width: event.width,
                        height: event.height,
                        pixelWidth: event.width,
                        pixelHeight: event.height,
                        resolution: 1,
                        commands: event.commands
                    },
                    baseFont: baseFont,
                    retainProvider: true,
                    version: event.version
                });
                if (!actor)
                    throw Error('Machi native source canvas creation failed');
                actor.readyChanged.connect(audit);
                actor.errorStringChanged.connect(audit);
                _actors.set(event.id, actor);
            }
            audit();
        } catch (error) {
            errorString = String(error.message || error);
        }
    }
    function audit(): void {
        let complete = true;
        const next = new Map();
        for (const [id, actor] of _actors) {
            if (actor.errorString) {
                errorString = actor.errorString;
                return;
            }
            complete = complete && actor.ready;
            if (actor.output)
                next.set(id, actor.output);
        }
        sources = next;
        ready = complete;
        changed();
    }
    onEventsChanged: sync()
    onLiveChanged: sync()
    Component.onDestruction: clear()
    Component {
        id: factory
        StaticCanvasTexture {
            property int version: 0
        }
    }
}
