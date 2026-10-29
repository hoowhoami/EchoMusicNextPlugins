pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Shapes
import "frame.mjs" as Frame

Shape {
    id: root
    required property var command
    readonly property var colorGradient: command && typeof command.style === "object" ? command.style : null
    readonly property color solid: {
        const c = Frame.rgba(command && !colorGradient ? command.style : "transparent");
        return Qt.rgba(c.r, c.g, c.b, c.a);
    }
    function stopColor(index: int): color {
        const c = Frame.rgba(colorGradient ? colorGradient.stops[index].color : "transparent");
        return Qt.rgba(c.r, c.g, c.b, c.a);
    }
    preferredRendererType: Shape.CurveRenderer
    ShapePath {
        strokeWidth: 0
        strokeColor: "transparent"
        fillColor: root.solid
        fillGradient: root.colorGradient ? nativeGradient : null
        PathSvg {
            path: root.command ? root.command.outline : ""
        }
    }
    LinearGradient {
        id: nativeGradient
        x1: root.colorGradient ? root.colorGradient.x1 : 0
        y1: root.colorGradient ? root.colorGradient.y1 : 0
        x2: root.colorGradient ? root.colorGradient.x2 : 1
        y2: root.colorGradient ? root.colorGradient.y2 : 0
        GradientStop {
            position: 0
            color: root.stopColor(0)
        }
        GradientStop {
            position: .28
            color: root.stopColor(1)
        }
        GradientStop {
            position: .54
            color: root.stopColor(2)
        }
        GradientStop {
            position: 1
            color: root.stopColor(3)
        }
    }
}
