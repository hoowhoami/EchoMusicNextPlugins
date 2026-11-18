// One GPU effect per bubble, never per glyph. The sweeping gradient follows the source stops.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Shapes
import QtQuick.Effects

Rectangle {
    id: root
    property bool isRight: false
    property bool active: false
    property color borderTint: "transparent"
    property color shadowTint: "#50000000"
    property real glowPhase: 0
    property real glowAlpha: .34
    property real glowOpacity: .4
    radius: 24
    bottomLeftRadius: isRight ? 24 : 6
    bottomRightRadius: isRight ? 6 : 24
    border.width: 1
    border.color: borderTint
    layer.enabled: GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
    layer.effect: MultiEffect {
        shadowEnabled: true
        shadowColor: root.shadowTint
        shadowBlur: root.active ? 1 : .4
        shadowVerticalOffset: root.active ? 18 : 10
        blurMax: 48
        autoPaddingEnabled: true
    }
    Shape {
        anchors.fill: parent
        visible: root.active
        opacity: root.glowOpacity
        preferredRendererType: Shape.CurveRenderer
        ShapePath {
            strokeWidth: 0
            strokeColor: "transparent"
            fillGradient: LinearGradient {
                x1: -root.glowPhase * root.width
                y1: -root.width * .13
                x2: root.width * 2 - root.glowPhase * root.width
                y2: root.width * .39
                GradientStop {
                    position: 0
                    color: "transparent"
                }
                GradientStop {
                    position: .23
                    color: Qt.rgba(1, 1, 1, root.glowAlpha)
                }
                GradientStop {
                    position: .34
                    color: "transparent"
                }
                GradientStop {
                    position: .5
                    color: "transparent"
                }
                GradientStop {
                    position: .73
                    color: Qt.rgba(1, 1, 1, root.glowAlpha)
                }
                GradientStop {
                    position: .84
                    color: "transparent"
                }
                GradientStop {
                    position: 1
                    color: "transparent"
                }
            }
            startX: 24
            startY: 0
            PathLine {
                x: root.width - 24
                y: 0
            }
            PathArc {
                x: root.width
                y: 24
                radiusX: 24
                radiusY: 24
            }
            PathLine {
                x: root.width
                y: root.height - (root.isRight ? 6 : 24)
            }
            PathArc {
                x: root.width - (root.isRight ? 6 : 24)
                y: root.height
                radiusX: root.isRight ? 6 : 24
                radiusY: root.isRight ? 6 : 24
            }
            PathLine {
                x: root.isRight ? 24 : 6
                y: root.height
            }
            PathArc {
                x: 0
                y: root.height - (root.isRight ? 24 : 6)
                radiusX: root.isRight ? 24 : 6
                radiusY: root.isRight ? 24 : 6
            }
            PathLine {
                x: 0
                y: 24
            }
            PathArc {
                x: 24
                y: 0
                radiusX: 24
                radiusY: 24
            }
        }
    }
}
