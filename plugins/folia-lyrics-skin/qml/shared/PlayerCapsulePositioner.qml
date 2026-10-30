// Folia PlayerBottomBarPositioner, a8da4437 (AGPL-3.0).
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import QtQuick.Shapes
import EchoMusic.Controls
import EchoMusic.Theme

Item {
    id: root
    property bool open: true
    property bool motionEnabled: true
    property bool initialized: false
    property int maxOffset: 32
    property color primaryColor: Theme.floating.text
    property color secondaryColor: Theme.floating.secondaryText
    property bool daylight: false
    property font baseFont: Theme.font(14, 500)
    signal resetRequested
    signal commitRequested
    signal cancelRequested
    enabled: open
    opacity: initialized && open ? 1 : 0
    focus: open
    Behavior on opacity {
        NumberAnimation {
            duration: root.motionEnabled ? 200 : 0
            easing.type: Easing.BezierSpline
            easing.bezierCurve: [0, 0, 0.58, 1, 1, 1]
        }
    }
    Keys.onEscapePressed: event => {
        root.cancelRequested();
        event.accepted = true;
    }
    Keys.onReturnPressed: event => {
        root.commitRequested();
        event.accepted = true;
    }
    Keys.onEnterPressed: event => {
        root.commitRequested();
        event.accepted = true;
    }
    Component.onCompleted: {
        initialized = true;
        forceActiveFocus();
    }
    Shape {
        id: bounds
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.leftMargin: root.width >= 768 ? 32 : 16
        anchors.rightMargin: root.width >= 768 ? 32 : 16
        anchors.bottom: parent.bottom
        anchors.bottomMargin: 20
        height: Math.max(0, root.maxOffset - 32) + 24
        opacity: 0.32
        preferredRendererType: Shape.CurveRenderer
        ShapePath {
            strokeColor: root.primaryColor
            fillColor: "transparent"
            strokeWidth: 2
            strokeStyle: ShapePath.DashLine
            dashPattern: [4, 4]
            PathRectangle {
                x: 1
                y: 1
                width: bounds.width - 2
                height: bounds.height - 2
                radius: 24
            }
        }
    }
    EchoFloatingSurface {
        anchors.top: parent.top
        anchors.topMargin: 32
        anchors.horizontalCenter: parent.horizontalCenter
        width: Math.min(root.width - 32, hint.implicitWidth + 32)
        height: 48
        radius: 24
        transform: Translate {
            y: root.initialized && root.open ? 0 : -8
            Behavior on y {
                NumberAnimation {
                    duration: root.motionEnabled ? 220 : 0
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: [0, 0, 0.58, 1, 1, 1]
                }
            }
        }
        color: root.daylight ? Qt.rgba(1, 1, 1, 0.8) : Qt.rgba(0, 0, 0, 0.6)
        RowLayout {
            id: hint
            anchors.centerIn: parent
            spacing: 12
            Label {
                Layout.maximumWidth: Math.max(40, root.width - 220)
                text: qsTr("上下拖动播放胶囊")
                textFormat: Text.PlainText
                elide: Text.ElideRight
                font: root.baseFont
                color: root.primaryColor
            }
            Rectangle {
                implicitWidth: 1
                implicitHeight: 16
                color: root.secondaryColor
                opacity: 0.2
            }
            EchoIconButton {
                objectName: "foliaCapsulePositionReset"
                implicitWidth: 28
                implicitHeight: 28
                glyph: "refresh"
                text: qsTr("复位")
                foreground: root.primaryColor
                onClicked: root.resetRequested()
            }
            EchoIconButton {
                objectName: "foliaCapsulePositionCancel"
                implicitWidth: 28
                implicitHeight: 28
                glyph: "x"
                text: qsTr("取消")
                foreground: root.primaryColor
                onClicked: root.cancelRequested()
            }
            EchoIconButton {
                objectName: "foliaCapsulePositionCommit"
                implicitWidth: 28
                implicitHeight: 28
                glyph: "check"
                text: qsTr("保存")
                foreground: root.daylight ? "white" : "black"
                background: Rectangle {
                    color: root.primaryColor
                    radius: width / 2
                }
                onClicked: root.commitRequested()
            }
        }
    }
}
