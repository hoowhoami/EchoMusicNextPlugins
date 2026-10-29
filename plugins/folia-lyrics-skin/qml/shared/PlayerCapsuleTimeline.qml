// Folia LyricsTimelineModal, a8da4437 (AGPL-3.0).
// Native virtual view of the host's read-only lyric model; seeks stay scoped.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme

Item {
    id: root
    required property EchoPluginViewContext page
    property var appearance: ({})
    property font baseFont: Theme.font(14, 500)
    readonly property bool daylight: appearance.dark !== undefined ? !appearance.dark : !Theme.dark
    readonly property color primaryColor: appearance.text !== undefined ? appearance.text : Theme.floating.text
    readonly property color secondaryColor: appearance.secondaryText !== undefined ? appearance.secondaryText : Theme.floating.secondaryText
    readonly property color accentColor: appearance.accent !== undefined ? appearance.accent : Theme.floating.accent
    readonly property bool motionEnabled: appearance.motionEnabled !== false
    signal closeRequested
    signal operationIssued(var operation)
    signal commandRejected(string action, string reason)
    function seek(positionMs: real, capturedRevision: string): void {
        if (page.active && page.player.lyricsInfo.scrollable === true)
            operationIssued(page.command("seek", {
                value: Math.max(0, Math.round(positionMs)),
                revision: capturedRevision
            }));
    }
    focus: true
    Component.onCompleted: forceActiveFocus()
    Keys.onEscapePressed: event => {
        root.closeRequested();
        event.accepted = true;
    }
    function followCurrent(): void {
        if (!userScroll.running && lines.currentIndex >= 0)
            lines.positionViewAtIndex(lines.currentIndex, ListView.Center);
    }
    Rectangle {
        anchors.fill: parent
        color: Qt.rgba(0, 0, 0, 0.6)
    }
    MouseArea {
        anchors.fill: parent
        onClicked: root.closeRequested()
    }
    FoliaFont {
        id: headingFont
        base: root.baseFont
        pixelSize: 24
        weight: 700
    }
    FoliaFont {
        id: lyricFont
        base: root.baseFont
        pixelSize: 16
        weight: 500
    }
    FoliaFont {
        id: translationFont
        base: root.baseFont
        pixelSize: 13
        weight: 400
    }
    Timer {
        id: userScroll
        interval: 3000
        onTriggered: root.followCurrent()
    }
    Timer {
        interval: 100
        running: true
        onTriggered: root.followCurrent()
    }
    EchoFloatingSurface {
        id: panel
        objectName: "foliaLyricsTimeline"
        anchors.centerIn: parent
        width: Math.min(896, root.width * 0.9)
        height: root.height * 0.8
        radius: 16
        color: root.daylight ? Qt.rgba(1, 1, 1, 0.7) : Qt.rgba(0, 0, 0, 0.4)
        border.color: root.daylight ? Qt.rgba(0, 0, 0, 0.05) : Qt.rgba(1, 1, 1, 0.1)
        MouseArea {
            anchors.fill: parent
        } // The surface keeps backdrop clicks outside.
        Label {
            anchors.left: parent.left
            anchors.top: parent.top
            anchors.margins: 32
            text: qsTr("歌词时间轴")
            textFormat: Text.PlainText
            color: root.primaryColor
            font: headingFont.value
        }
        EchoIconButton {
            objectName: "foliaTimelineClose"
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 24
            width: 40
            height: 40
            glyph: "x"
            text: qsTr("关闭歌词时间轴")
            foreground: root.primaryColor
            onClicked: root.closeRequested()
        }
        ListView {
            id: lines
            objectName: "foliaTimelineLines"
            anchors.fill: parent
            anchors.topMargin: 104
            anchors.bottomMargin: 32
            anchors.leftMargin: root.width >= 768 ? 64 : 32
            anchors.rightMargin: root.width >= 768 ? 64 : 32
            clip: true
            reuseItems: true
            cacheBuffer: Math.max(0, height)
            model: root.page.active ? root.page.player.lyrics : null
            currentIndex: root.page.player.lyricsInfo.currentIndex !== undefined ? root.page.player.lyricsInfo.currentIndex : -1
            onCurrentIndexChanged: root.followCurrent()
            onMovementStarted: userScroll.restart()
            onContentYChanged: if (dragging || flicking)
                userScroll.restart()
            WheelHandler {
                target: null
                onWheel: event => {
                    userScroll.restart();
                    event.accepted = false;
                }
            }
            ScrollBar.vertical: EchoScrollBar {
                hoverTarget: lines
                wheelView: lines
                resourceActive: root.visible && root.page.active
            }
            delegate: Item {
                id: line
                required property int index
                required property string lineText
                required property real startMs
                required property string translation
                readonly property bool current: index === lines.currentIndex
                readonly property bool narrow: root.width < 768
                readonly property bool leftSide: !narrow && index % 2 === 0
                width: ListView.view.width
                height: card.height + 80
                Rectangle {
                    x: line.narrow ? 5 : (parent.width - width) / 2
                    width: 2
                    height: parent.height
                    color: root.secondaryColor
                    opacity: 0.3
                }
                Rectangle {
                    id: dot
                    x: line.narrow ? 0 : (parent.width - width) / 2
                    y: (card.height - height) / 2
                    width: 12
                    height: 12
                    radius: 6
                    scale: line.current ? 1.5 : 1
                    color: line.current ? root.accentColor : root.secondaryColor
                    Behavior on scale {
                        NumberAnimation {
                            duration: root.motionEnabled ? 300 : 0
                        }
                    }
                    TapHandler {
                        property string pressedSource: ""
                        property real pressedPosition: 0
                        enabled: root.page.active && root.page.player.lyricsInfo.scrollable === true
                        onPressedChanged: if (pressed) {
                            pressedSource = root.page.player.revision;
                            pressedPosition = line.startMs;
                        }
                        onTapped: root.seek(pressedPosition, pressedSource)
                    }
                }
                Rectangle {
                    id: card
                    objectName: "foliaTimelineRow" + line.index
                    x: line.narrow ? 24 : line.leftSide ? 0 : parent.width / 2 + 16
                    width: line.narrow ? parent.width - 24 : parent.width / 2 - 16
                    height: content.implicitHeight + (line.narrow ? 32 : 48)
                    radius: 8
                    color: root.daylight ? Qt.rgba(1, 1, 1, 0.6) : Qt.rgba(0, 0, 0, 0.6)
                    border.color: root.daylight ? Qt.rgba(0, 0, 0, 0.05) : Qt.rgba(1, 1, 1, 0.1)
                    scale: line.current ? 1 : 0.85
                    opacity: line.current ? 1 : 0.7
                    Behavior on scale {
                        NumberAnimation {
                            duration: root.motionEnabled ? 300 : 0
                        }
                    }
                    Behavior on opacity {
                        NumberAnimation {
                            duration: root.motionEnabled ? 300 : 0
                        }
                    }
                    Column {
                        id: content
                        anchors.centerIn: parent
                        width: parent.width - (line.narrow ? 32 : 48)
                        spacing: 4
                        Label {
                            width: parent.width
                            text: line.lineText
                            textFormat: Text.PlainText
                            color: root.primaryColor
                            font: lyricFont.value
                            horizontalAlignment: line.leftSide ? Text.AlignRight : Text.AlignLeft
                            wrapMode: Text.Wrap
                        }
                        Label {
                            width: parent.width
                            text: line.translation
                            textFormat: Text.PlainText
                            visible: text.length > 0
                            color: root.secondaryColor
                            font: translationFont.value
                            horizontalAlignment: line.leftSide ? Text.AlignRight : Text.AlignLeft
                            wrapMode: Text.Wrap
                        }
                    }
                    TapHandler {
                        property string pressedSource: ""
                        property real pressedPosition: 0
                        enabled: root.page.active && root.page.player.lyricsInfo.scrollable === true
                        onPressedChanged: if (pressed) {
                            pressedSource = root.page.player.revision;
                            pressedPosition = line.startMs;
                        }
                        onTapped: root.seek(pressedPosition, pressedSource)
                    }
                }
            }
            Label {
                anchors.centerIn: parent
                visible: lines.count === 0
                text: qsTr("暂无歌词")
                color: root.secondaryColor
                font: root.baseFont
            }
        }
    }
}
