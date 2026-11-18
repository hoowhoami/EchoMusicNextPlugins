// Stable visible native primitives. Geometry is replaced only when the source revision changes.
pragma ComponentBehavior: Bound
import QtQuick
import "../sonnet" as Native
import "../sonnet/scene-graph.mjs" as Graph

Item {
    id: root
    property var ops: []
    property bool live: true
    property var _actors: ({})
    property int _actorCount: 0
    property int _bytes: 0
    property string _error: ''
    readonly property int actorCount: _actorCount
    readonly property int geometryBytes: _bytes
    readonly property string errorString: _error
    function clear() {
        const old = _actors;
        _actors = ({});
        for (const key of Object.keys(old)) {
            old[key].visible = false;
            old[key].destroy();
        }
        _actorCount = 0;
        _bytes = 0;
    }
    function sync() {
        if (!live || !visible) {
            clear();
            return;
        }
        const created = [];
        try {
            if (ops.length > 32768)
                throw new Error('Tempera visible native primitive budget exceeded');
            const previous = _actors, next = ({});
            let bytes = 0, z = 0;
            for (const op of ops) {
                if (op.kind !== 'graphics')
                    throw new Error('Tempera source text/image primitive has not been prepared');
                const key = String(op.id);
                let actor = previous[key];
                if (!actor) {
                    actor = graphicsComponent.createObject(root);
                    if (!actor)
                        throw new Error('Tempera native Graphics creation failed');
                    created.push(actor);
                }
                actor.matrix = op.matrix;
                actor.opacity = op.alpha;
                if (actor.revision !== op.revision) {
                    actor.paths = op.paths;
                    actor.revision = op.revision;
                }
                actor.z = z++;
                actor.visible = true;
                next[key] = actor;
                bytes += actor.bytes;
            }
            for (const key of Object.keys(previous))
                if (!next[key]) {
                    previous[key].visible = false;
                    previous[key].destroy();
                }
            _actors = next;
            _actorCount = Object.keys(next).length;
            _bytes = bytes;
            _error = '';
        } catch (error) {
            for (const actor of created)
                actor.destroy();
            clear();
            _error = String(error.message || error);
        }
    }
    onOpsChanged: sync()
    onLiveChanged: sync()
    onVisibleChanged: sync()
    Component.onCompleted: sync()
    Component.onDestruction: clear()
    Component {
        id: graphicsComponent
        Item {
            id: primitive
            property var matrix: [1, 0, 0, 0, 1, 0]
            property var paths: []
            property int revision: -1
            readonly property int bytes: vector.geometryBytes
            width: 1
            height: 1
            transform: Matrix4x4 {
                matrix: Qt.matrix4x4(...Graph.qtMatrix(primitive.matrix))
            }
            Native.SonnetVector {
                id: vector
                paths: primitive.paths
                live: root.live
            }
        }
    }
}
