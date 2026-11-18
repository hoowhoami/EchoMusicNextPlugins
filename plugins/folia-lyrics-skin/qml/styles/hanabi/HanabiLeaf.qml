pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../lumiere" as Native
import "../../shared/binary.mjs" as Binary

Item {
    id: root
    property var node: null
    property var provider: null
    property var providers: []
    property var texture: null
    property bool live: true
    property real resolution: 1
    property real renderTargetPhysicalHeight: 1
    property EchoPluginGraphics graphicsService: null
    property Item resourceParent: root
    property var fallbackSource: null
    readonly property bool ready: node && (node.kind !== 'batch' || data.ready && providers.every(p => p && p.output !== null))
    readonly property string errorString: data.errorString || (actor.item && actor.item.errorString ? actor.item.errorString : '')
    readonly property real cacheBytes: data.sourceBytes + data.cacheBytes
    function apply(value: var): void {
        node = value;
        if (value.kind === 'batch')
            upload.restart();
        else if (actor.item)
            actor.item.apply(value);
    }
    z: node ? node.order : 0
    function source(index: int): var {
        return providers.length ? providers[Math.min(index, providers.length - 1)].output || fallbackSource : fallbackSource;
    }
    FloatTexture {
        id: data
        parent: root.resourceParent
        x: root.resourceParent.width / 2
        y: root.resourceParent.height / 2
        graphics: root.graphicsService
        width: 1
        height: 1
        active: root.live && root.node !== null && root.node.kind === 'batch'
    }
    Timer {
        id: upload
        interval: 0
        onTriggered: if (root.live && root.node && root.node.kind === 'batch' && root.graphicsService && root.graphicsService.active) {
            const bytes = Binary.unpackBytes(root.node.payload);
            if (root.node.count === root.node.capacity) {
                data.upload(6, root.node.capacity, bytes);
            } else {
                const padded = new Uint8Array(root.node.capacity * 6 * 16);
                padded.set(new Uint8Array(bytes));
                data.upload(6, root.node.capacity, padded.buffer);
            }
        }
    }
    onGraphicsServiceChanged: upload.restart()
    Component.onCompleted: upload.restart()
    Loader {
        parent: root.resourceParent
        x: root.resourceParent.width / 2
        y: root.resourceParent.height / 2
        active: data.active && data.sourceBytes > 0 && !data.ready
        sourceComponent: ShaderEffect {
            width: 1
            height: 1
            property var source: data
            property real outputAlpha: 0
            fragmentShader: Qt.resolvedUrl('../lumiere/glyph-prime.frag.qsb')
        }
    }
    Loader {
        id: actor
        anchors.fill: parent
        active: root.live && root.node !== null
        sourceComponent: root.node && root.node.kind === 'batch' ? batchComponent : ordinaryComponent
        onLoaded: if (root.node.kind !== 'batch')
            item.apply(root.node)
    }
    Component {
        id: ordinaryComponent
        Native.LumiereLeaf {
            provider: root.provider
            texture: root.texture
            live: root.live
            resolution: root.resolution
            renderTargetPhysicalHeight: root.renderTargetPhysicalHeight
        }
    }
    Component {
        id: batchComponent
        NativeShaderEffect {
            readonly property string errorString: status === ShaderEffect.Error ? log : ''
            visible: root.ready
            property var instanceData: data
            property var source0: root.source(0)
            property var source1: root.source(1)
            property var source2: root.source(2)
            property var source3: root.source(3)
            property var source4: root.source(4)
            property var source5: root.source(5)
            property var source6: root.source(6)
            property var source7: root.source(7)
            property real uCount: root.node && root.node.kind === 'batch' ? root.node.count : 1
            composition: root.node && root.node.blendMode === 'add' ? 'additive' : root.node && root.node.blendMode === 'screen' ? 'screen' : 'source-over'
            mesh: GridMesh {
                resolution: Qt.size(1, Math.max(1, uCount * 4 - 1))
            }
            vertexShader: Qt.resolvedUrl('sprites.vert.qsb')
            fragmentShader: Qt.resolvedUrl('sprites.frag.qsb')
        }
    }
}
