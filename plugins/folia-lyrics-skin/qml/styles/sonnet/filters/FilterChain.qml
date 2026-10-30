// Source-ordered native scene filters; targets survive uniform-only updates.
pragma ComponentBehavior: Bound
import QtQuick
import "kernel.mjs" as Kernel

Item {
    id: root
    property var source: null
    property bool sourceIsTextureProvider: true
    property vector2d inputUvScale: Qt.vector2d(1, 1)
    property var passes: []
    property real resolution: 1
    property real targetResolution: resolution
    property size canvasSize: Qt.size(width, height)
    property var registeredScreens: []
    property bool finalTargetIsRoot: true
    property bool live: true
    property bool present: true
    readonly property var output: contents.item ? contents.item.output : null
    readonly property vector2d outputUvScale: contents.item && contents.item.plan ? Qt.vector2d(...contents.item.plan.outputUvScale) : Qt.vector2d(1, 1)
    readonly property size outputFrameSize: contents.item && contents.item.plan ? Qt.size(...contents.item.plan.outputFrameSize) : Qt.size(0, 0)
    readonly property int passCount: contents.item ? contents.item.actors.length : 0
    readonly property real cacheBytes: contents.item && contents.item.plan ? contents.item.plan.cacheBytes : 0
    readonly property int allocationRevision: _allocationRevision
    readonly property bool ready: contents.item && contents.item.plan !== null && contents.item.actors.length === contents.item.descriptors.length
    readonly property string errorString: contents.item ? contents.item.errorString : ""
    property int _allocationRevision: 0
    Loader {
        id: contents
        anchors.fill: parent
        active: root.live && root.visible && root.source !== null && root.width > 0 && root.height > 0
        sourceComponent: Item {
            id: body
            property var plan: null
            property var descriptors: []
            property var actors: []
            property string _key: ""
            property string _error: ""
            readonly property var output: plan ? (actors.length ? actors[actors.length - 1].output : input) : null
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
                    const next = Kernel.expandPasses(JSON.parse(JSON.stringify(root.passes)));
                    const screens = JSON.parse(JSON.stringify(root.registeredScreens));
                    if (!screens.length)
                        screens.push({
                            width: Math.max(1, Math.round(root.canvasSize.width * root.targetResolution)),
                            height: Math.max(1, Math.round(root.canvasSize.height * root.targetResolution))
                        });
                    const geometry = Kernel.texturePlan(root.width, root.height, root.resolution, next.length, root.finalTargetIsRoot ? root.targetResolution : undefined, screens);
                    const key = JSON.stringify([geometry.physicalSize, geometry.outputPhysicalSize, geometry.rootTarget, next.map(pass => pass.kind)]);
                    if (key !== _key) {
                        clear();
                        _key = key;
                        ++root._allocationRevision;
                    }
                    descriptors = next;
                    plan = geometry;
                    _error = "";
                    if (actors.length !== next.length) {
                        const values = [];
                        for (let i = 0; i < next.length; i++) {
                            const actor = passComponent.createObject(body, {
                                source: i ? values[i - 1].output : input,
                                profile: next[i],
                                plan: geometry,
                                resolution: root.resolution,
                                targetResolution: root.targetResolution,
                                finalTarget: root.finalTargetIsRoot && i === next.length - 1,
                                live: root.live
                            });
                            if (!actor)
                                throw new Error("Native source filter creation failed");
                            values.push(actor);
                        }
                        actors = values;
                    } else
                        for (let i = 0; i < actors.length; i++) {
                            actors[i].profile = next[i];
                            actors[i].plan = geometry;
                            actors[i].resolution = root.resolution;
                            actors[i].targetResolution = root.targetResolution;
                            actors[i].finalTarget = root.finalTargetIsRoot && i === actors.length - 1;
                        }
                } catch (error) {
                    clear();
                    plan = null;
                    _key = "";
                    _error = String(error.message || error);
                }
            }
            Loader {
                id: providerCopy
                active: root.sourceIsTextureProvider && body.plan !== null
                sourceComponent: SourceEffect {
                    source: root.source
                    profile: ({
                            kind: "copy"
                        })
                    plan: body.plan
                    uvScale: root.inputUvScale
                    width: body.plan.frameSize[0]
                    height: body.plan.frameSize[1]
                    visible: false
                }
            }
            ShaderEffectSource {
                id: input
                sourceItem: root.sourceIsTextureProvider ? providerCopy.item : root.source
                sourceRect: body.plan ? Qt.rect(0, 0, body.plan.inputSize[0], body.plan.inputSize[1]) : Qt.rect(0, 0, 0, 0)
                textureSize: body.plan ? Qt.size(body.plan.physicalSize.width, body.plan.physicalSize.height) : Qt.size(1, 1)
                hideSource: true
                visible: false
                live: root.live
                smooth: true
            }
            SourceEffect {
                width: root.outputFrameSize.width
                height: root.outputFrameSize.height
                visible: root.present && body.plan !== null
                source: body.output
                uvScale: root.outputUvScale
                profile: ({
                        kind: "copy"
                    })
                plan: body.plan || ({
                        inputSize: [1, 1, 1, 1],
                        inputClamp: [0, 0, 1, 1],
                        frameSize: [1, 1],
                        uvScale: [1, 1],
                        physicalSize: {
                            width: 1,
                            height: 1
                        }
                    })
            }
            Component.onCompleted: sync()
            Connections {
                target: root
                function onPassesChanged() {
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
                function onTargetResolutionChanged() {
                    body.sync();
                }
                function onFinalTargetIsRootChanged() {
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
        FilterPass {}
    }
}
