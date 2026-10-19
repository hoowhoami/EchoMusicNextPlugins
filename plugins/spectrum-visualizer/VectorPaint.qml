pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Shapes
import QtQuick.Effects

Item {
    id: painting
    property var commands: []
    function brushColor(value): color {
        // Canvas accepts CSS rgba(), QColor bindings require a Qt color value.
        if (typeof value === "string" && value.startsWith("rgba(")) {
            const channels = value.slice(5, -1).split(",").map(Number);
            return Qt.rgba(channels[0] / 255, channels[1] / 255, channels[2] / 255, channels[3]);
        }
        return value;
    }
    Repeater {
        model: painting.commands.length
        delegate: Shape {
            id: vector
            required property int index
            readonly property var command: painting.commands[index]
            readonly property var gradient: command.gradient
            width: painting.width
            height: painting.height
            preferredRendererType: Shape.CurveRenderer
            opacity: command.alpha
            layer.enabled: command.shadowBlur > 0
            layer.effect: MultiEffect {
                shadowEnabled: true
                shadowColor: painting.brushColor(vector.command.shadowColor)
                shadowOpacity: 1
                shadowHorizontalOffset: 0
                shadowVerticalOffset: 0
                blurMax: 32
                shadowBlur: vector.command.shadowBlur / 32
                autoPaddingEnabled: true
            }
            ShapePath {
                fillColor: vector.command.stroke ? "transparent" : painting.brushColor(vector.command.color)
                fillGradient: !vector.command.stroke && vector.gradient ? brush : null
                strokeColor: vector.command.stroke ? painting.brushColor(vector.command.color) : "transparent"
                strokeWidth: vector.command.stroke ? vector.command.lineWidth : 0
                strokeGradient: vector.command.stroke && vector.gradient ? brush : null
                capStyle: ShapePath.RoundCap
                joinStyle: ShapePath.RoundJoin
                property LinearGradient brush: LinearGradient {
                    x1: vector.gradient ? vector.gradient.x1 : 0
                    y1: vector.gradient ? vector.gradient.y1 : 0
                    x2: vector.gradient ? vector.gradient.x2 : painting.width
                    y2: vector.gradient ? vector.gradient.y2 : painting.height
                    GradientStop {
                        position: 0
                        color: vector.gradient ? painting.brushColor(vector.gradient.stops[0].color) : "transparent"
                    }
                    GradientStop {
                        position: vector.gradient ? vector.gradient.stops[1].at : 0.5
                        color: vector.gradient ? painting.brushColor(vector.gradient.stops[1].color) : "transparent"
                    }
                    GradientStop {
                        position: 1
                        color: vector.gradient ? painting.brushColor(vector.gradient.stops[2].color) : "transparent"
                    }
                }
                PathSvg {
                    path: vector.command.path
                }
            }
        }
    }
}
