// Fixed licensed Lucide vectors, selected only by an exact public theme export name.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Shapes
import "../styles/sonnet/icons.mjs" as Icons

Item {
    id: root
    property string iconName: ""
    property string fallbackName: ""
    property color color: "white"
    property real strokeWidth: 1
    property bool live: true
    readonly property string resolvedName: Icons.exactIconName(iconName) || Icons.exactIconName(fallbackName) || ""
    readonly property string vectorPath: resolvedName ? Icons.iconPath(resolvedName) : ""
    Shape {
        width: 24
        height: 24
        visible: root.live && root.vectorPath.length > 0
        preferredRendererType: Shape.CurveRenderer
        transform: Scale {
            xScale: root.width / 24
            yScale: root.height / 24
        }
        ShapePath {
            strokeColor: root.color
            strokeWidth: root.strokeWidth * 24 / Math.max(1, root.width)
            fillColor: "transparent"
            capStyle: ShapePath.RoundCap
            joinStyle: ShapePath.RoundJoin
            PathSvg {
                path: root.vectorPath
            }
        }
    }
}
