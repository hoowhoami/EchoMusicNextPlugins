// Retained viewport actors. Static source textures survive pose-only frames.
pragma ComponentBehavior: Bound
import QtQuick
import "frame-plan.mjs" as Frames
import "texture-programs.mjs" as TexturePrograms
import "../../shared/render-quality.mjs" as Quality

Item {
    id: root
    property var frame: null
    property var _texturePrograms: new Map()
    property var _retainedFrame: null
    signal retainedFrameReady
    function retainFrame(): void {
        const value = TexturePrograms.retainTexturePrograms(frame, _texturePrograms);
        _texturePrograms = value.retained;
        _retainedFrame = value.frame;
        retainedFrameReady();
    }
    onFrameChanged: retainFrame()
    property Component textureFactory: null
    property Component glyphTextureFactory: null
    property bool eagerPreparation: false
    property Component batchFactory: null
    property Component leafFactory: null
    property bool flattened: false
    property font baseFont
    property real resolution: 1
    property bool live: true
    property bool forceRaster: false
    property int samples: 1
    readonly property bool raster: forceRaster || resolution !== Screen.devicePixelRatio
    readonly property int rasterWidth: Math.round(width * resolution)
    readonly property int rasterHeight: Math.round(height * resolution)
    readonly property real plannedRasterBytes: raster ? Quality.colorAttachmentBytes(rasterWidth, rasterHeight, samples) : 0
    readonly property string rasterError: raster && (rasterWidth > 8192 || rasterHeight > 8192 || plannedRasterBytes >= maxCacheBytes) ? 'Lumiere viewport raster exceeds budget' : ''
    readonly property real rasterBytes: contents.item ? plannedRasterBytes : 0
    layer.enabled: live && visible && frame !== null && raster && !rasterError
    layer.textureSize: Qt.size(rasterWidth, rasterHeight)
    layer.smooth: true
    layer.samples: samples
    property real maxCacheBytes: 128 * 1024 * 1024
    readonly property bool ready: contents.item ? contents.item.ready : false
    readonly property string errorString: rasterError || (contents.item ? contents.item.errorString : '')
    readonly property real cacheBytes: contents.item ? contents.item.cacheBytes + rasterBytes : 0
    readonly property int nodeCount: contents.item ? contents.item.nodeCount : 0
    readonly property int textureCount: contents.item ? contents.item.textureCount : 0
    readonly property int texturePaintCount: contents.item ? contents.item.texturePaintCount : 0
    function inspect(): var {
        const body = contents.item;
        return body ? {
            ready: body.ready,
            building: body._building,
            queued: body._queue.length,
            textures: Array.from(body._textures.entries()).map(([id, entry]) => ({
                        id,
                        ready: entry.actor.ready,
                        paints: entry.actor.paintCount,
                        bytes: entry.actor.cacheBytes,
                        error: entry.actor.errorString
                    })),
            leaves: Array.from(body._leaves.entries()).map(([id, actor]) => ({
                        id,
                        ready: actor.ready,
                        bytes: actor.cacheBytes,
                        error: actor.errorString
                    }))
        } : {
            empty: true
        };
    }
    clip: true
    Loader {
        id: contents
        anchors.fill: parent
        active: root.live && root.visible && root.frame !== null && !root.rasterError
        sourceComponent: Item {
            id: body
            property bool ready: false
            property string errorString: ''
            property real cacheBytes: 0
            property int nodeCount: 0
            property int textureCount: 0
            property int texturePaintCount: 0
            property var _leaves: new Map()
            property var _groups: new Map()
            property var _textures: new Map()
            property var _queue: []
            property var _next: null
            property bool _building: false
            property bool _auditQueued: false
            function queueAudit() {
                if (_auditQueued)
                    return;
                _auditQueued = true;
                auditTimer.restart();
            }
            function unwatch(actor) {
                for (const name of ['errorStringChanged', 'cacheBytesChanged', 'readyChanged', 'paintCountChanged'])
                    if (actor[name])
                        try {
                            actor[name].disconnect(queueAudit);
                        } catch (error) {}
            }
            function detachWatchers() {
                for (const actor of _leaves.values())
                    unwatch(actor);
                for (const actor of _groups.values())
                    unwatch(actor);
                for (const entry of _textures.values())
                    unwatch(entry.actor);
            }
            function clear() {
                step.stop();
                auditTimer.stop();
                syncTimer.stop();
                detachWatchers();
                _queue = [];
                _next = null;
                _building = false;
                ready = false;
                for (const actor of _leaves.values()) {
                    actor.live = false;
                    actor.visible = false;
                    actor.destroy();
                }
                _leaves.clear();
                for (const actor of _groups.values()) {
                    actor.live = false;
                    actor.visible = false;
                    actor.destroy();
                }
                _groups.clear();
                for (const entry of _textures.values()) {
                    entry.actor.live = false;
                    entry.actor.destroy();
                }
                _textures.clear();
                cacheBytes = 0;
                nodeCount = 0;
                textureCount = 0;
                texturePaintCount = 0;
            }
            function fail(message: string) {
                clear();
                errorString = message;
            }
            function sync() {
                if (!root._retainedFrame)
                    return;
                if (_building) {
                    _next = root._retainedFrame;
                    return;
                }
                try {
                    const next = root.flattened ? root._retainedFrame : Frames.flattenLumiereScene(root._retainedFrame, root.width, root.height, root.resolution), wantedLeaves = new Set(next.leaves.map(node => node.id)), wantedGroups = new Set(next.groups.map(group => group.id)), wantedTextures = new Set(next.textures.map(texture => texture.id));
                    for (const [id, actor] of Array.from(_leaves.entries()))
                        if (!wantedLeaves.has(id)) {
                            unwatch(actor);
                            actor.live = false;
                            actor.visible = false;
                            actor.destroy();
                            _leaves.delete(id);
                        }
                    for (const [id, actor] of Array.from(_groups.entries()))
                        if (!wantedGroups.has(id)) {
                            unwatch(actor);
                            actor.live = false;
                            actor.visible = false;
                            actor.destroy();
                            _groups.delete(id);
                        }
                    for (const [id, entry] of Array.from(_textures.entries()))
                        if (!wantedTextures.has(id)) {
                            unwatch(entry.actor);
                            entry.actor.live = false;
                            entry.actor.destroy();
                            _textures.delete(id);
                        }
                    const queue = [];
                    for (const group of next.groups) {
                        if (_groups.has(group.id))
                            _groups.get(group.id).group = group;
                        else
                            queue.push({
                                kind: 'group',
                                value: group
                            });
                    }
                    for (const texture of next.textures) {
                        const previous = _textures.get(texture.id), key = texture.revision === undefined ? JSON.stringify(texture) : String(texture.revision);
                        if (previous && previous.key === key)
                            continue;
                        if (!texture.commands)
                            throw new Error('Native texture revision has no preparation program');
                        if (previous) {
                            unwatch(previous.actor);
                            previous.actor.live = false;
                            previous.actor.destroy();
                            _textures.delete(texture.id);
                        }
                        queue.push({
                            kind: 'texture',
                            value: texture,
                            key
                        });
                    }
                    for (const node of next.leaves) {
                        if (node.kind === 'text')
                            throw new Error('Lumiere credits native Text has not been prepared');
                        if (_leaves.has(node.id)) {
                            // A batch may switch all texture sources while keeping its
                            // painter-order id. Apply it after queued textures/groups exist.
                            const parentPending = node.parent !== null && !_groups.has(node.parent);
                            const texturePending = (node.kind === 'sprite' && !_textures.has(node.texture.source)) || (node.kind === 'batch' && node.sources.some(id => !_textures.has(id)));
                            if (parentPending || texturePending)
                                queue.push({
                                    kind: 'update',
                                    value: node
                                });
                            else
                                applyLeaf(_leaves.get(node.id), node);
                        } else
                            queue.push({
                                kind: 'leaf',
                                value: node
                            });
                    }
                    _queue = queue;
                    _building = queue.length > 0;
                    errorString = '';
                    if (_building) {
                        if (root.eagerPreparation)
                            buildNext();
                        else {
                            ready = false;
                            step.restart();
                        }
                    } else
                        audit();
                } catch (error) {
                    fail(String(error.message || error));
                }
            }
            function parentFor(group: var): var {
                if (group === null)
                    return canvas;
                const actor = _groups.get(group);
                if (!actor)
                    throw new Error('Lumiere native filter parent is missing');
                return actor.contentItem;
            }
            function applyLeaf(actor: var, node: var) {
                actor.parent = parentFor(node.parent);
                actor.resolution = root.resolution;
                actor.renderTargetPhysicalHeight = node.parent === null ? root.height * root.resolution : _groups.get(node.parent).renderTargetPhysicalHeight;
                if (node.kind === 'sprite') {
                    const entry = _textures.get(node.texture.source);
                    if (!entry)
                        throw new Error('Lumiere native source texture is missing');
                    actor.provider = entry.actor;
                    actor.texture = entry.spec;
                }
                if (node.kind === 'batch') {
                    actor.providers = node.sources.map(id => {
                        const entry = _textures.get(id);
                        if (!entry)
                            throw new Error('Native batch texture is missing');
                        return entry.actor;
                    });
                    actor.width = root.width;
                    actor.height = root.height;
                }
                actor.apply(node);
            }
            function buildNext() {
                try {
                    const started = Date.now();
                    let cheap = 0;
                    while (_queue.length) {
                        const task = _queue.shift(), value = task.value;
                        if (task.kind === 'group') {
                            const actor = groupComponent.createObject(parentFor(value.parent), {
                                group: value,
                                viewportWidth: root.width,
                                viewportHeight: root.height,
                                resolution: root.resolution,
                                samples: Qt.binding(() => root.samples)
                            });
                            if (!actor)
                                throw new Error('Lumiere filter group creation failed');
                            _groups.set(value.id, actor);
                            actor.errorStringChanged.connect(queueAudit);
                            actor.cacheBytesChanged.connect(queueAudit);
                            break;
                        } else if (task.kind === 'texture') {
                            const text = value.commands.some(command => command.kind === 'text'), factory = text ? (root.glyphTextureFactory || glyphComponent) : (root.textureFactory || canvasComponent), actor = factory.createObject(resources, text ? {
                                texture: value,
                                baseFont: root.baseFont
                            } : {
                                texture: value
                            });
                            if (!actor)
                                throw new Error('Lumiere native texture creation failed');
                            _textures.set(value.id, {
                                actor,
                                key: task.key,
                                spec: value
                            });
                            actor.errorStringChanged.connect(queueAudit);
                            if (text)
                                actor.readyChanged.connect(queueAudit);
                            else
                                actor.paintCountChanged.connect(queueAudit);
                            actor.cacheBytesChanged.connect(queueAudit);
                            break;
                        } else if (task.kind === 'update') {
                            applyLeaf(_leaves.get(value.id), value);
                            if (++cheap >= (root.eagerPreparation ? 128 : 24) || (root.eagerPreparation && Date.now() - started >= 3))
                                break;
                        } else {
                            const factory = value.kind === "batch" && root.batchFactory ? root.batchFactory : root.leafFactory || leafComponent;
                            const actor = factory.createObject(parentFor(value.parent));
                            if (!actor)
                                throw new Error('Lumiere native leaf creation failed');
                            _leaves.set(value.id, actor);
                            applyLeaf(actor, value);
                            actor.errorStringChanged.connect(queueAudit);
                            if (actor.readyChanged)
                                actor.readyChanged.connect(queueAudit);
                            if (actor.cacheBytesChanged)
                                actor.cacheBytesChanged.connect(queueAudit);
                            if (++cheap >= (root.eagerPreparation ? 128 : 24) || (root.eagerPreparation && Date.now() - started >= 3))
                                break;
                        }
                    }
                    if (_queue.length) {
                        ready = false;
                        step.restart();
                    } else {
                        _building = false;
                        audit();
                        if (_next) {
                            _next = null;
                            syncTimer.restart();
                        }
                    }
                } catch (error) {
                    fail(String(error.message || error));
                }
            }
            function audit() {
                _auditQueued = false;
                if (errorString)
                    return;
                let total = 0, paint = 0, complete = !_building;
                for (const entry of _textures.values()) {
                    if (entry.actor.errorString) {
                        fail(entry.actor.errorString);
                        return;
                    }
                    total += entry.actor.cacheBytes;
                    if (entry.actor.ready !== undefined)
                        complete = complete && entry.actor.ready;
                    else {
                        complete = complete && entry.actor.paintCount > 0;
                        paint += entry.actor.paintCount;
                    }
                }
                for (const actor of _groups.values()) {
                    if (actor.errorString) {
                        fail(actor.errorString);
                        return;
                    }
                    total += actor.cacheBytes;
                }
                for (const actor of _leaves.values()) {
                    if (!_building && actor.errorString) {
                        fail(actor.errorString);
                        return;
                    }
                    if (actor.cacheBytes !== undefined)
                        total += actor.cacheBytes;
                    if (actor.ready !== undefined)
                        complete = complete && actor.ready;
                }
                if (total > root.maxCacheBytes - root.rasterBytes) {
                    fail('Lumiere viewport native cache exceeds 128MiB');
                    return;
                }
                cacheBytes = total;
                texturePaintCount = paint;
                nodeCount = _leaves.size + _groups.size;
                textureCount = _textures.size;
                ready = complete;
            }
            Item {
                id: canvas
                anchors.fill: parent
                // Keep the retained vector geometry alive while a texture is baking.
                visible: root.eagerPreparation || body.ready
                opacity: body.ready ? 1 : 0
            }
            Item {
                id: resources
                x: 0
                width: 1
                height: 1
            }
            Timer {
                id: step
                interval: root.eagerPreparation ? 0 : 16
                onTriggered: body.buildNext()
            }
            Timer {
                id: auditTimer
                interval: 0
                onTriggered: body.audit()
            }
            Timer {
                id: syncTimer
                interval: 0
                onTriggered: body.sync()
            }
            Component.onCompleted: sync()
            Component.onDestruction: detachWatchers()
            Connections {
                target: root
                function onRetainedFrameReady() {
                    body.sync();
                }
                function onBaseFontChanged() {
                    body.clear();
                    body.sync();
                }
                function onResolutionChanged() {
                    body.clear();
                    body.sync();
                }
                function onMaxCacheBytesChanged() {
                    body.queueAudit();
                }
                function onWidthChanged() {
                    body.sync();
                }
                function onHeightChanged() {
                    body.sync();
                }
            }
        }
    }
    Component {
        id: leafComponent
        LumiereLeaf {}
    }
    Component {
        id: groupComponent
        LumiereGroup {}
    }
    Component {
        id: canvasComponent
        LumiereCanvasTexture {}
    }
    Component {
        id: glyphComponent
        LumiereGlyphTexture {}
    }
}
