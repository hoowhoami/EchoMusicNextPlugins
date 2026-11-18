// Folia TrackTitleNavigator and useTrackTitlePreview, a8da4437 (AGPL-3.0).
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import EchoMusic.Controls
import EchoMusic.Theme

Item {
    id: root
    property string title: ""
    property string trackKey: ""
    property string previousTitle: ""
    property string nextTitle: ""
    property bool canPrevious: false
    property bool canNext: false
    property bool disabled: false
    property bool alwaysShowArrows: false
    property bool motionEnabled: true
    property color primaryColor: Theme.floating.text
    property font baseFont: Theme.font(14, Theme.boldWeight)
    property string hoverSide: ""
    property string lastSide: "next"
    property string shownPreview: ""
    readonly property string displayTitle: title
    readonly property string previewTitle: disabled || confirming ? "" : hoverSide === "prev" ? previousTitle : hoverSide === "next" ? nextTitle : ""
    readonly property bool confirming: confirmation.running
    property bool initialized: false
    signal navigationRequested(string side)
    implicitHeight: 24

    function enterZone(side: string): void {
        hoverSide = side;
    }
    function leaveZone(): void {
        hoverSide = "";
    }
    function beginSwitch(side: string): void {
        lastSide = side;
        confirmation.restart();
    }
    onPreviewTitleChanged: if (previewTitle.length > 0)
        shownPreview = previewTitle
    onTrackKeyChanged: if (initialized) {
        confirmation.restart();
        titleArrival.restart();
    }
    Component.onCompleted: initialized = true
    Timer {
        id: confirmation
        interval: 1100
    }
    HoverHandler {
        id: titleHover
    }
    Label {
        id: currentTitle
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.leftMargin: 56
        anchors.rightMargin: 56
        height: 24
        verticalAlignment: Text.AlignVCenter
        horizontalAlignment: Text.AlignHCenter
        text: root.displayTitle
        textFormat: Text.PlainText
        elide: Text.ElideRight
        font: root.baseFont
        color: root.primaryColor
        opacity: root.previewTitle.length > 0 ? 0 : 1
        Behavior on opacity {
            NumberAnimation {
                duration: root.motionEnabled ? 200 : 0
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0.4, 0, 0.2, 1, 1, 1]
            }
        }
        transform: Translate {
            id: slide
        }
    }
    NumberAnimation {
        id: titleArrival
        objectName: "foliaCapsuleTitleArrival"
        target: slide
        property: "x"
        from: root.lastSide === "next" ? 14 : -14
        to: 0
        duration: root.motionEnabled ? 220 : 0
        easing.type: Easing.BezierSpline
        easing.bezierCurve: [0, 0, 0.58, 1, 1, 1]
    }
    Label {
        anchors.fill: currentTitle
        text: root.shownPreview
        textFormat: Text.PlainText
        elide: Text.ElideRight
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        font: root.baseFont
        color: root.primaryColor
        opacity: root.previewTitle.length > 0 ? 0.55 : 0
        Behavior on opacity {
            NumberAnimation {
                duration: root.motionEnabled ? 200 : 0
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0.4, 0, 0.2, 1, 1, 1]
            }
        }
        Accessible.ignored: true
    }
    Item {
        anchors.left: parent.left
        width: Math.min(56, parent.width / 2)
        height: parent.height
        HoverHandler {
            onHoveredChanged: if (hovered)
                root.enterZone("prev")
            else if (root.hoverSide === "prev")
                root.leaveZone()
        }
        EchoIconButton {
            objectName: "foliaPreviousTrack"
            anchors.left: parent.left
            anchors.leftMargin: 4
            anchors.verticalCenter: parent.verticalCenter
            width: 24
            height: 24
            padding: 4
            glyph: "chevron-left"
            text: qsTr("上一首")
            tooltipText: root.previousTitle || text
            foreground: root.primaryColor
            enabled: !root.disabled && root.canPrevious
            visible: enabled
            opacity: root.alwaysShowArrows || titleHover.hovered ? 0.7 : 0
            Behavior on opacity {
                NumberAnimation {
                    duration: root.motionEnabled ? 200 : 0
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: [0.4, 0, 0.2, 1, 1, 1]
                }
            }
            onClicked: {
                root.beginSwitch("prev");
                root.navigationRequested("prev");
            }
        }
    }
    Item {
        anchors.right: parent.right
        width: Math.min(56, parent.width / 2)
        height: parent.height
        HoverHandler {
            onHoveredChanged: if (hovered)
                root.enterZone("next")
            else if (root.hoverSide === "next")
                root.leaveZone()
        }
        EchoIconButton {
            objectName: "foliaNextTrack"
            anchors.right: parent.right
            anchors.rightMargin: 4
            anchors.verticalCenter: parent.verticalCenter
            width: 24
            height: 24
            padding: 4
            glyph: "chevron-right"
            text: qsTr("下一首")
            tooltipText: root.nextTitle || text
            foreground: root.primaryColor
            enabled: !root.disabled && root.canNext
            visible: enabled
            opacity: root.alwaysShowArrows || titleHover.hovered ? 0.7 : 0
            Behavior on opacity {
                NumberAnimation {
                    duration: root.motionEnabled ? 200 : 0
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: [0.4, 0, 0.2, 1, 1, 1]
                }
            }
            onClicked: {
                root.beginSwitch("next");
                root.navigationRequested("next");
            }
        }
    }
}
