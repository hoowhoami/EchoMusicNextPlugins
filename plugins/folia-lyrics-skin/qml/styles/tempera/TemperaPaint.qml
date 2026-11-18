// A stable source paint batch; only affine poses change with the clock.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    property var ops: []
    property var resources: ({})
    property var stages: ({})
    property font baseFont
    property EchoPluginAssets assetsService: null
    property bool live: true
    property var _actors: ({})
    property string _error: ''
    readonly property string errorString: {
        if (_error)
            return _error;
        for (const key of Object.keys(_actors))
            if (_actors[key].errorString)
                return _actors[key].errorString;
        return '';
    }
    readonly property var renderers: Object.keys(_actors).map(key => _actors[key].renderer || null).filter(value => value !== null)
    readonly property int actorCount: Object.keys(_actors).length
    readonly property real cacheBytes: {
        let sum = 0;
        for (const key of Object.keys(_actors))
            sum += _actors[key].cacheBytes;
        return sum;
    }
    function clear() {
        const old = _actors;
        _actors = ({});
        for (const k of Object.keys(old)) {
            old[k].visible = false;
            old[k].destroy();
        }
    }
    function sync() {
        if (!live || !visible) {
            clear();
            return;
        }
        const next = ({}), created = [];
        try {
            if (ops.length > 32768)
                throw Error('Tempera paint primitive budget exceeded');
            let z = 0;
            for (const op of ops) {
                const key = op.kind === 'texture' ? 'texture:' + op.source : 'primitive:' + op.id;
                let item = _actors[key];
                if (!item) {
                    item = (op.kind === 'texture' ? textureComponent : primitiveComponent).createObject(root);
                    if (!item)
                        throw Error('Tempera primitive creation failed');
                    created.push(item);
                }
                item.z = z++;
                item.opacity = op.alpha;
                item.visible = true;
                if (op.kind === 'texture') {
                    const stage = stages[op.source];
                    item.source = stage ? stage.output : null;
                    item.uvScale = stage ? stage.outputUvScale : Qt.vector2d(1, 1);
                } else {
                    const data = resources[op.id];
                    if (!data)
                        throw Error('Missing native source resource ' + op.id);
                    if (item.primitive !== data)
                        item.primitive = data;
                    item.affine = op.matrix;
                }
                next[key] = item;
            }
            for (const k of Object.keys(_actors))
                if (!next[k]) {
                    _actors[k].visible = false;
                    _actors[k].destroy();
                }
            _actors = next;
            _error = '';
        } catch (e) {
            for (const item of created)
                item.destroy();
            clear();
            _error = String(e.message || e);
        }
    }
    onOpsChanged: sync()
    onLiveChanged: sync()
    onVisibleChanged: sync()
    Component.onCompleted: sync()
    Component.onDestruction: clear()
    Component {
        id: primitiveComponent
        TemperaPrimitive {
            baseFont: root.baseFont
            assetsService: root.assetsService
            live: root.live
        }
    }
    Component {
        id: textureComponent
        TemperaTexture {
            width: root.width
            height: root.height
        }
    }
}
