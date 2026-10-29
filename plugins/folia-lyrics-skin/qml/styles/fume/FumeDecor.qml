pragma ComponentBehavior: Bound
import QtQuick
import "vector.mjs" as Vector

Item {
    id: root
    property var commands: []
    property var stamps: []
    property real cameraX: 0
    property real cameraY: 0
    property real cameraScale: 1
    property real devicePixelRatio: 1
    readonly property real cacheBudgetBytes: 32 * 1024 * 1024
    readonly property var plannedTextures: commands.filter(command => command.blur > 0).map(command => Vector.sparkGeometry(command, devicePixelRatio))
    readonly property real plannedTextureBytes: plannedTextures.reduce((sum, texture) => sum + texture.bytes, 0)
    readonly property string errorString: commands.length > 32 ? "Fume vector count exceeds 32" : plannedTextures.some(texture => texture.physicalSize > 4096) || plannedTextureBytes > cacheBudgetBytes ? "Fume local shadow surfaces exceed the native cache budget" : ""
    readonly property int vectorCount: vectors.count
    readonly property int stampCount: marks.count
    readonly property real textureBytes: {
        let total = 0;
        for (let i = 0; i < vectors.count; ++i) {
            total += bytesFor(vectors.itemAt(i));
        }
        return total;
    }
    function bytesFor(actor: var): real {
        return actor && actor.item && actor.shadowed ? actor.item.textureBytes : 0;
    }
    Repeater {
        id: vectors
        model: root.errorString ? 0 : root.commands.length
        Loader {
            id: actor
            required property int index
            objectName: "fumeDecorVector" + index
            readonly property var command: root.commands[index]
            readonly property bool shadowed: command.blur > 0
            sourceComponent: shadowed ? spark : geometry
            Component {
                id: geometry
                FumeVectorPath {
                    command: actor.command
                    x: command.matrix[4]
                    y: command.matrix[5]
                    scale: Math.hypot(command.matrix[0], command.matrix[1])
                    rotation: Math.atan2(command.matrix[1], command.matrix[0]) * 180 / Math.PI
                    transformOrigin: Item.TopLeft
                }
            }
            Component {
                id: spark
                FumeSpark {
                    command: actor.command
                    devicePixelRatio: root.devicePixelRatio
                }
            }
        }
    }
    Repeater {
        id: marks
        model: root.stamps.length
        FumeStamp {
            required property int index
            command: root.stamps[index]
            cameraX: root.cameraX
            cameraY: root.cameraY
            cameraScale: root.cameraScale
            viewportWidth: root.width
            viewportHeight: root.height
            devicePixelRatio: root.devicePixelRatio
        }
    }
}
