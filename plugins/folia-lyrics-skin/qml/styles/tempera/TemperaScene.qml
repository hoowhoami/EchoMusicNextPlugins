// Retained DAG of actual painted prefixes. Hidden scopes destroy every native target.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    property var frame: null
    property font baseFont
    property EchoPluginAssets assetsService: null
    property bool live: true
    property var _resources: ({})
    property var _stages: ({})
    property string _error: ''
    property int _epoch: -1
    readonly property string errorString: {
        if (_error)
            return _error;
        for (const key of Object.keys(_stages))
            if (_stages[key].errorString)
                return _stages[key].errorString;
        return '';
    }
    readonly property var renderers: {
        const result = [];
        for (const key of Object.keys(_stages))
            for (const renderer of _stages[key].renderers)
                result.push(renderer);
        return result;
    }
    readonly property int stageCount: Object.keys(_stages).length
    readonly property real cacheBytes: {
        let bytes = 0;
        for (const key of Object.keys(_stages))
            bytes += _stages[key].cacheBytes;
        return bytes;
    }
    readonly property int resourceCount: Object.keys(_resources).length
    function clear() {
        present.visible = false;
        present.source = emptyTexture;
        const old = _stages;
        _stages = ({});
        for (const key of Object.keys(old).reverse())
            old[key].destroy();
        _resources = ({});
    }
    function sync() {
        if (!live || !visible || !frame) {
            clear();
            return;
        }
        const created = [];
        try {
            if (frame.cacheBytes > 256 * 1024 * 1024 || frame.stages.length > 64)
                throw Error('Tempera target budget exceeded');
            if (frame.epoch !== _epoch) {
                clear();
                _epoch = frame.epoch;
            }
            const data = Object.assign({}, _resources);
            for (const resource of frame.resources)
                data[resource.id] = resource;
            for (const key of frame.retired)
                delete data[key];
            _resources = data;
            present.visible = false;
            present.source = emptyTexture;
            const next = ({});
            for (const descriptor of frame.stages) {
                let actor = _stages[descriptor.id];
                if (!actor) {
                    actor = stageComponent.createObject(root);
                    if (!actor)
                        throw Error('Tempera offscreen stage creation failed');
                    created.push(actor);
                }
                next[descriptor.id] = actor;
                actor.resources = _resources;
                actor.stages = next;
                actor.width = frame.width;
                actor.height = frame.height;
                actor.descriptor = descriptor;
            }
            for (const key of Object.keys(_stages).reverse())
                if (!next[key])
                    _stages[key].destroy();
            _stages = next;
            const out = next[frame.output];
            present.source = out ? out.output : emptyTexture;
            present.visible = !!out;
            present.uvScale = out ? out.outputUvScale : Qt.vector2d(1, 1);
            _error = '';
        } catch (e) {
            for (const actor of created)
                actor.destroy();
            clear();
            _error = String(e.message || e);
        }
    }
    onFrameChanged: sync()
    onLiveChanged: sync()
    onVisibleChanged: sync()
    Component.onDestruction: clear()
    Component {
        id: stageComponent
        TemperaStage {
            baseFont: root.baseFont
            assetsService: root.assetsService
            live: root.live
        }
    }
    Item {
        id: emptyItem
        width: 1
        height: 1
    }
    ShaderEffectSource {
        id: emptyTexture
        sourceItem: emptyItem
        textureSize: Qt.size(1, 1)
        hideSource: true
        visible: false
    }
    TemperaTexture {
        id: present
        anchors.fill: parent
        source: emptyTexture
        visible: false
    }
}
