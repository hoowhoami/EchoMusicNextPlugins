// Native equivalent of VisualizerFume's bounded, pulsing layout preparation card.
import QtQuick
import QtQuick.Effects

Rectangle {
    id: root
    property color backgroundColor: "#111111"
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property bool animate: true
    width: 160
    height: 124
    radius: 24
    color: backgroundColor
    border.width: 1
    border.color: Qt.rgba(secondaryColor.r, secondaryColor.g, secondaryColor.b, .24)
    layer.enabled: true
    layer.effect: MultiEffect {
        shadowEnabled: true
        shadowColor: Qt.rgba(root.backgroundColor.r, root.backgroundColor.g, root.backgroundColor.b, .52)
        shadowBlur: 1
        shadowVerticalOffset: 18
        blurMax: 64
    }
    Column {
        id: content
        anchors.centerIn: parent
        spacing: 16
        Canvas {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 24
            height: 24
            onPaint: {
                const c = getContext("2d");
                c.reset();
                c.strokeStyle = Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .78);
                c.lineWidth = 2;
                c.lineCap = "round";
                c.lineJoin = "round";
                c.beginPath();
                c.moveTo(5, 2);
                c.lineTo(19, 2);
                c.moveTo(5, 22);
                c.lineTo(19, 22);
                c.moveTo(6, 2);
                c.lineTo(6, 7);
                c.lineTo(12, 12);
                c.lineTo(6, 17);
                c.lineTo(6, 22);
                c.moveTo(18, 2);
                c.lineTo(18, 7);
                c.lineTo(12, 12);
                c.lineTo(18, 17);
                c.lineTo(18, 22);
                c.stroke();
            }
        }
        Column {
            spacing: 10
            width: 112
            Rectangle {
                width: 112
                height: 8
                radius: 4
                color: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .32)
            }
            Rectangle {
                width: 112 * .78
                height: 8
                radius: 4
                color: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .22)
            }
            Rectangle {
                width: 112 * .56
                height: 8
                radius: 4
                color: Qt.rgba(root.secondaryColor.r, root.secondaryColor.g, root.secondaryColor.b, .2)
            }
        }
    }
    SequentialAnimation {
        running: root.visible && root.animate
        loops: Animation.Infinite
        NumberAnimation {
            target: content
            property: "opacity"
            from: 1
            to: .5
            duration: 1000
            easing.type: Easing.BezierSpline
            easing.bezierCurve: [.4, 0, .6, 1, 1, 1]
        }
        NumberAnimation {
            target: content
            property: "opacity"
            from: .5
            to: 1
            duration: 1000
            easing.type: Easing.BezierSpline
            easing.bezierCurve: [.4, 0, .6, 1, 1, 1]
        }
    }
}
