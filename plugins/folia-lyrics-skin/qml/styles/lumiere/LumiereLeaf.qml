// Leaf world matrices are resolved before any source group filter.
pragma ComponentBehavior: Bound
import QtQuick
import "../sonnet" as Sonnet
import "../sonnet/scene-graph.mjs" as Graph

Item {
    id: root
    property var node: null
    property var provider: null
    property var texture: null
    property bool live: true
    property real renderTargetPhysicalHeight: 1
    property real resolution: 1
    property var paths: []
    property int _geometryRevision: -1
    readonly property string errorString: node && node.kind === 'sprite' && !provider ? 'Missing Lumiere texture provider ' + node.id + ':' + node.texture.source : (actor.item && actor.item.errorString ? actor.item.errorString : '')
    function apply(value: var) {
        if (value.kind === 'graphics' && value.geometryRevision !== _geometryRevision) {
            paths = value.paths;
            _geometryRevision = value.geometryRevision;
        }
        node = value;
    }
    opacity: node ? node.alpha : 0
    z: node ? node.order : 0
    transform: Matrix4x4 {
        matrix: Qt.matrix4x4(...Graph.qtMatrix(root.node ? root.node.matrix : [1, 0, 0, 0, 1, 0]))
    }
    Loader {
        id: actor
        active: root.live && root.node !== null && (root.node.kind !== 'sprite' || (root.provider && root.provider.output !== null))
        sourceComponent: root.node && root.node.kind === 'graphics' ? vectorComponent : root.node && root.node.kind === 'light-field' ? fieldComponent : root.node && root.node.kind === 'solid' ? solidComponent : spriteComponent
    }
    Component {
        id: vectorComponent
        Sonnet.SonnetVector {
            paths: root.paths
            tint: Graph.color(root.node.tint)
            live: root.live
        }
    }
    Component {
        id: fieldComponent
        LightField {
            x: root.node.bounds.x
            y: root.node.bounds.y
            width: root.node.bounds.width
            height: root.node.bounds.height
            origin: Qt.vector2d(root.node.bounds.x, root.node.bounds.y)
            uniforms: root.node.uniforms
            resolution: root.resolution
            uPhysicalHeight: root.renderTargetPhysicalHeight
            readonly property string errorString: status === ShaderEffect.Error ? log : ''
        }
    }
    Component {
        id: spriteComponent
        LumiereTextureSlice {
            source: root.provider ? root.provider.output : null
            texture: root.texture || ({
                    width: 1,
                    height: 1
                })
            frame: root.node && root.node.texture ? Qt.rect(root.node.texture.frame.x, root.node.texture.frame.y, root.node.texture.frame.width, root.node.texture.frame.height) : Qt.rect(0, 0, 0, 0)
            x: root.node && root.node.anchor ? -root.node.anchor[0] * frame.width : 0
            y: root.node && root.node.anchor ? -root.node.anchor[1] * frame.height : 0
            tint: Graph.color(root.node.tint)
            readonly property string errorString: status === ShaderEffect.Error ? log : ''
        }
    }
    Component {
        id: solidComponent
        Rectangle {
            width: root.node.frame.width
            height: root.node.frame.height
            x: -root.node.anchor[0] * width
            y: -root.node.anchor[1] * height
            color: Graph.color(root.node.tint)
        }
    }
}
