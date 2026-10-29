// Original dual-filter bloom. No per-frame target reconstruction for uniform changes.
pragma ComponentBehavior: Bound
import QtQuick
import "bloom-plan.mjs" as Bloom

Item {
    id: root
    property var source: null
    property var options: ({
            strength: 1,
            threshold: .42,
            knee: .18,
            levels: 6,
            spread: .68,
            padding: 0,
            tint: [1, 1, 1]
        })
    property real resolution: 1
    property point origin: Qt.point(0, 0)
    property var registeredScreens: []
    property size canvasSize: Qt.size(width, height)
    property bool live: true
    readonly property bool ready: contents.item !== null && contents.item.plan !== null && contents.item.actors.length > 0
    readonly property int passCount: contents.item ? contents.item.actors.length : 0
    readonly property real cacheBytes: contents.item && contents.item.plan ? contents.item.plan.cacheBytes : 0
    readonly property string errorString: contents.item ? contents.item.errorString : ""
    readonly property int allocationRevision: _allocationRevision
    property int _allocationRevision: 0
    Loader {
        id: contents
        anchors.fill: parent
        active: root.live && root.visible && root.source !== null && root.width > 0 && root.height > 0
        sourceComponent: Item {
            id: body
            property var plan: null
            property var actors: []
            property string _key: ""
            property string _error: ""
            readonly property string errorString: {
                if (_error)
                    return _error;
                for (const actor of actors)
                    if (actor.errorString)
                        return actor.errorString;
                return "";
            }
            function clear() {
                const old = actors;
                actors = [];
                for (const actor of old)
                    actor.destroy();
            }
            function sync() {
                try {
                    const screens = JSON.parse(JSON.stringify(root.registeredScreens));
                    if (!screens.length)
                        screens.push({
                            width: Math.round(root.canvasSize.width * root.resolution),
                            height: Math.round(root.canvasSize.height * root.resolution)
                        });
                    const next = Bloom.createLumiereBloomPlan(root.width, root.height, root.resolution, JSON.parse(JSON.stringify(root.options)), screens), key = JSON.stringify([next.textures.map(texture => [texture.pixelWidth, texture.pixelHeight, texture.resolution]), next.passes.map(pass => [pass.kind, pass.input, pass.output, pass.add])]);
                    if (key !== _key) {
                        clear();
                        _key = key;
                        ++root._allocationRevision;
                    }
                    plan = next;
                    _error = "";
                    if (actors.length !== next.passes.length) {
                        const values = [], textures = [input];
                        for (const descriptor of next.passes) {
                            const outputPlan = descriptor.output < 0 ? {
                                width: root.width,
                                height: root.height,
                                sourceWidth: root.width,
                                sourceHeight: root.height,
                                pixelWidth: Math.round(root.width * root.resolution),
                                pixelHeight: Math.round(root.height * root.resolution)
                            } : next.textures[descriptor.output];
                            const actor = passComponent.createObject(body, {
                                descriptor,
                                inputPlan: next.textures[descriptor.input],
                                outputPlan,
                                inputTexture: textures[descriptor.input],
                                addTexture: descriptor.add === null ? textures[descriptor.input] : textures[descriptor.add],
                                finalPass: descriptor.output < 0,
                                live: root.live
                            });
                            if (!actor)
                                throw new Error('Native Lumiere bloom pass creation failed');
                            values.push(actor);
                            if (descriptor.output >= 0)
                                textures[descriptor.output] = actor.output;
                        }
                        actors = values;
                    } else
                        for (let i = 0; i < actors.length; i++) {
                            const descriptor = next.passes[i];
                            actors[i].descriptor = descriptor;
                            actors[i].inputPlan = next.textures[descriptor.input];
                            actors[i].outputPlan = descriptor.output < 0 ? {
                                width: root.width,
                                height: root.height,
                                sourceWidth: root.width,
                                sourceHeight: root.height,
                                pixelWidth: Math.round(root.width * root.resolution),
                                pixelHeight: Math.round(root.height * root.resolution)
                            } : next.textures[descriptor.output];
                        }
                } catch (error) {
                    clear();
                    plan = null;
                    _key = "";
                    _error = String(error.message || error);
                }
            }
            ShaderEffectSource {
                id: input
                sourceItem: root.source
                sourceRect: body.plan ? Qt.rect(root.origin.x, root.origin.y, body.plan.textures[0].sourceWidth, body.plan.textures[0].sourceHeight) : Qt.rect(0, 0, 1, 1)
                textureSize: body.plan ? Qt.size(body.plan.textures[0].pixelWidth, body.plan.textures[0].pixelHeight) : Qt.size(1, 1)
                hideSource: true
                smooth: true
                visible: false
                live: root.live
            }
            Component.onCompleted: sync()
            Connections {
                target: root
                function onOptionsChanged() {
                    body.sync();
                }
                function onWidthChanged() {
                    body.sync();
                }
                function onHeightChanged() {
                    body.sync();
                }
                function onResolutionChanged() {
                    body.sync();
                }
                function onCanvasSizeChanged() {
                    body.sync();
                }
                function onRegisteredScreensChanged() {
                    body.sync();
                }
            }
        }
    }
    Component {
        id: passComponent
        LumiereBloomPass {}
    }
}
