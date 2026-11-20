// A flat cover keeps switching feedback cheap; it owns no captured renderer or texture.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Controls
import EchoMusic.Theme

Item {
    id: root
    property color backgroundColor: "#111111"
    property color textColor: "white"
    property bool motionEnabled: true
    property bool preparing: false
    signal covered
    signal revealed
    visible: false
    opacity: 0

    function cover(): void {
        fadeOut.stop();
        fadeIn.stop();
        visible = true;
        preparing = true;
        if (!motionEnabled || opacity >= 1) {
            opacity = 1;
            covered();
        } else {
            fadeIn.from = opacity;
            fadeIn.duration = Math.round(Theme.exitDuration * (1 - opacity));
            fadeIn.start();
        }
    }
    function reveal(): void {
        fadeIn.stop();
        preparing = false;
        if (!motionEnabled || opacity <= 0) {
            reset();
            revealed();
        } else {
            fadeOut.from = opacity;
            fadeOut.start();
        }
    }
    function reset(): void {
        fadeIn.stop();
        fadeOut.stop();
        preparing = false;
        opacity = 0;
        visible = false;
    }
    onMotionEnabledChanged: if (!motionEnabled) {
        if (fadeIn.running) {
            fadeIn.stop();
            opacity = 1;
            covered();
        } else if (fadeOut.running) {
            reset();
            revealed();
        }
    }
    Rectangle {
        anchors.fill: parent
        color: root.backgroundColor
    }
    MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.AllButtons
        onWheel: wheel => wheel.accepted = true
    }
    Rectangle {
        objectName: "foliaStyleSwitchFeedback"
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, content.implicitWidth + 32)
        height: content.implicitHeight + 24
        radius: Theme.cardRadius
        color: Qt.rgba(root.textColor.r, root.textColor.g, root.textColor.b, 0.07)
        visible: root.preparing && width > 0
        RowLayout {
            id: content
            anchors.centerIn: parent
            spacing: 10
            EchoSpinner {
                Layout.preferredWidth: 20
                Layout.preferredHeight: 20
                color: root.textColor
                visible: root.motionEnabled
            }
            Label {
                text: qsTr("正在准备歌词样式…")
                color: root.textColor
                font: Theme.font(13, 400)
            }
        }
    }
    NumberAnimation {
        id: fadeIn
        target: root
        property: "opacity"
        to: 1
        easing.type: Easing.BezierSpline
        easing.bezierCurve: Theme.easeExit
        onFinished: root.covered()
    }
    NumberAnimation {
        id: fadeOut
        target: root
        property: "opacity"
        to: 0
        duration: Theme.normalDuration
        easing.type: Easing.BezierSpline
        easing.bezierCurve: Theme.easeEnter
        onFinished: {
            root.reset();
            root.revealed();
        }
    }
}
