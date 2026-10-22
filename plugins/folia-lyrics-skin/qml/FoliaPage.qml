// The skin owns presentation only. Every command and persistent setting stays scoped by the host.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Theme
import EchoMusic.Controls
import "styles/still"
import "shared"

Item {
    id: root
    objectName: "foliaPlaybackPage"
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property AppearanceConfiguration configuration
    readonly property var settings: configuration.values
    readonly property var appearance: plugin.appearance.snapshot
    readonly property var lyricInfo: page.player.lyricsInfo
    readonly property string revision: page.player.revision
    readonly property var modes: plugin.ui.state.styles || []
    property int effectiveIndex: 0
    property string observedRevision: ""
    property var lineWindow: [null, null, null]
    readonly property font lyricBaseFont: settings.fontFamilies.indexOf("follow") >= 0 ? appearance.lyricFont : plugin.fonts.build(settings.fontFamilies)
    clip: true

    ChromeVisibility {
        id: chrome
        objectName: "foliaChromeVisibility"
        active: root.page.active && root.visible && root.Window.window !== null && root.Window.window.visible && root.Window.window.visibility !== Window.Minimized
        mode: root.settings.playerChromeVisibilityMode
    }
    HoverHandler {
        objectName: "foliaChromeHover"
        property point lastPosition: Qt.point(-1, -1)
        onPointChanged: {
            if (!hovered)
                return;
            // Qt refreshes hover points after scene changes as well as actual
            // input. Rebuilding chrome must not reveal it again at a still cursor.
            const moved = point.position.x !== lastPosition.x || point.position.y !== lastPosition.y;
            lastPosition = point.position;
            if (moved || (chrome.pointerHeld && point.pressedButtons === Qt.NoButton))
                chrome.pointerMoved(point.pressedButtons);
        }
        onHoveredChanged: if (hovered)
            chrome.activity()
        else
            chrome.pointerLeft()
    }
    PointHandler {
        acceptedButtons: Qt.AllButtons
        onActiveChanged: if (active)
            chrome.pointerPressed()
        else
            chrome.pointerReleased()
    }
    WheelHandler {
        target: null
        onWheel: event => {
            chrome.activity();
            event.accepted = false;
        }
    }
    Connections {
        target: root.Window.window
        function onActiveChanged(): void {
            if (!root.Window.window.active)
                chrome.windowBlurred();
        }
    }

    function refreshRows(): void {
        if (!page.active)
            return;
        if (observedRevision !== revision) {
            observedRevision = revision;
            effectiveIndex = 0;
        }
        if (lyricInfo.currentIndex >= 0)
            effectiveIndex = lyricInfo.currentIndex;
        else if (effectiveIndex >= lyricInfo.count)
            effectiveIndex = 0;
        lineWindow = [-1, 0, 1].map(offset => {
            const row = effectiveIndex + offset;
            return row >= 0 && row < lyricInfo.count ? page.player.lyrics.row(row) : null;
        });
    }
    onLyricInfoChanged: refreshRows()
    onRevisionChanged: refreshRows()
    Component.onCompleted: refreshRows()

    Rectangle {
        anchors.fill: parent
        color: root.appearance.main
    }
    FoliaFont {
        id: currentFontSpec
        base: root.lyricBaseFont
        pixelSize: 40
        weight: 700
        letterSpacing: 0.8
    }
    FoliaFont {
        id: adjacentFontSpec
        base: root.lyricBaseFont
        pixelSize: 30
        weight: 600
        letterSpacing: 0.6
    }
    FoliaFont {
        id: currentSubtitleFontSpec
        base: root.lyricBaseFont
        pixelSize: 24
        weight: 500
        letterSpacing: 0.6
    }
    FoliaFont {
        id: adjacentSubtitleFontSpec
        base: root.lyricBaseFont
        pixelSize: 20
        weight: 400
        letterSpacing: 0.5
    }
    Still {
        id: still
        anchors.fill: parent
        visible: root.settings.mode === "still"
        lineWindow: root.lineWindow
        showText: root.settings.showText
        hideTranslationSubtitle: root.settings.hideTranslationSubtitle
        lyricsFontScale: root.settings.lyricsFontScale
        subtitleFontScale: root.settings.subtitleFontScale
        dark: root.appearance.dark
        primaryColor: root.appearance.text
        secondaryColor: root.appearance.secondaryText
        currentFont: currentFontSpec.value
        adjacentFont: adjacentFontSpec.value
        currentSubtitleFont: currentSubtitleFontSpec.value
        adjacentSubtitleFont: adjacentSubtitleFontSpec.value
    }
    EchoSelect {
        id: stylePicker
        objectName: "foliaStylePicker"
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.rightMargin: 52
        anchors.topMargin: 56
        width: Math.min(180, root.width - 80)
        options: root.modes.map(mode => ({
                    label: mode.title,
                    value: mode.id
                }))
        value: root.settings.mode
        placeholder: qsTr("Folia 样式")
        Accessible.name: qsTr("Folia 歌词样式")
        enabled: root.configuration.active
        onValueEdited: nextValue => root.configuration.patch({
                mode: nextValue
            })
    }
    Loader {
        id: transportHost
        objectName: "foliaTransportHost"
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: 32
        width: Math.max(0, Math.min(512, parent.width - 32))
        active: root.page.player.hasTrack && (!chrome.hidden || opacity > 0)
        enabled: !chrome.hidden
        opacity: chrome.hidden ? 0 : 1
        scale: chrome.hidden ? 0.97 : 1
        transform: Translate {
            id: transportOffset
            y: chrome.hidden ? 24 : 0
            Behavior on y {
                NumberAnimation {
                    duration: root.appearance.motionEnabled ? 260 : 0
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: [0, 0, 0.58, 1, 1, 1]
                }
            }
        }
        Behavior on opacity {
            NumberAnimation {
                duration: root.appearance.motionEnabled ? 260 : 0
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0, 0, 0.58, 1, 1, 1]
            }
        }
        Behavior on scale {
            NumberAnimation {
                duration: root.appearance.motionEnabled ? 260 : 0
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0, 0, 0.58, 1, 1, 1]
            }
        }
        sourceComponent: EchoFloatingSurface {
            objectName: "foliaTransportSurface"
            implicitHeight: transport.implicitHeight + 24
            radius: height / 2
            color: Theme.floatingCard
            border.color: Theme.floatingBorder
            border.width: 1
            ColumnLayout {
                id: transport
                anchors.fill: parent
                anchors.margins: 12
                spacing: 4
                RowLayout {
                    Layout.fillWidth: true
                    Label {
                        Layout.fillWidth: true
                        text: root.page.player.title
                        textFormat: Text.PlainText
                        elide: Text.ElideRight
                        color: Theme.floatingText
                        font: root.plugin.fonts.build([], 13, 700)
                    }
                    EchoPluginPlaybackControls {
                        page: root.page
                        colors: Theme.floating
                    }
                    EchoIconButton {
                        objectName: "foliaQueueButton"
                        glyph: "list"
                        text: qsTr("播放队列")
                        colors: Theme.floating
                        onClicked: root.page.command("queue")
                    }
                }
                EchoPluginProgress {
                    Layout.fillWidth: true
                    page: root.page
                    colors: Theme.floating
                }
            }
        }
    }
}
