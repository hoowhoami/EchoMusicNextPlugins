// Shared Folia subtitle overlay, a8da4437 (AGPL-3.0-only).
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import "subtitle.mjs" as Subtitle

Item {
    id: root
    property var activeLine: null
    property var recentLine: null
    property var nextLines: []
    property var settings: ({})
    property font baseFont: Qt.font({
        pixelSize: 20,
        weight: 500
    })
    property color secondaryColor: "#cccccc"
    property color backgroundColor: "#111111"
    property real bottomOffset: 32
    property bool chromeHidden: false
    property bool live: true
    property bool motionEnabled: true
    readonly property var content: Subtitle.resolveSubtitleContent(settings, activeLine, recentLine, nextLines)
    property var shownContent: ({
            tracks: [],
            upcoming: []
        })
    readonly property bool shouldRender: content.shouldRender
    readonly property bool hasContent: shownContent.tracks.length > 0 || shownContent.upcoming.length > 0
    readonly property bool backgroundEnabled: settings.subtitleOverlayBackground !== false
    readonly property real lyricScale: settings.lyricsFontScale || 1
    readonly property real subtitleScale: settings.subtitleFontScale || 1
    readonly property real opacityValue: settings.subtitleOverlayOpacity === undefined ? .6 : settings.subtitleOverlayOpacity
    readonly property var geometry: Subtitle.subtitleGeometry(width, lyricScale, subtitleScale, bottomOffset, presence.value)
    readonly property real subtitleBottom: geometry.bottom
    readonly property bool resourcesActive: contentHost.active
    property string contentKey: ""
    property bool _retained: shouldRender

    function syncContent(): void {
        if (content.shouldRender) {
            shownContent = content;
            contentKey = String(activeLine ? activeLine.startTime : recentLine ? recentLine.startTime : "") + ":" + content.tracks.map(track => track.text).join("\n");
        }
    }
    onContentChanged: syncContent()
    Component.onCompleted: syncContent()

    onShouldRenderChanged: {
        if (shouldRender) {
            exitTimer.stop();
            _retained = true;
        } else if (motionEnabled) {
            exitTimer.restart();
        } else {
            _retained = false;
        }
    }
    onLiveChanged: if (!live) {
        exitTimer.stop();
        _retained = false;
    }
    Timer {
        id: exitTimer
        interval: 240
        onTriggered: root._retained = false
    }
    PresentationSpring {
        id: presence
        targetValue: root.chromeHidden ? 0 : 1
        stiffness: 280
        damping: 28
        enabled: root.live && root.motionEnabled
    }
    Loader {
        id: contentHost
        objectName: "foliaSubtitleHost"
        active: root.live && root.hasContent && (root.shouldRender || root._retained)
        anchors.horizontalCenter: parent.horizontalCenter
        width: Math.max(0, root.width - 32)
        height: item ? item.implicitHeight : 0
        y: root.height - root.subtitleBottom - height
        opacity: root.shouldRender ? root.opacityValue : 0
        transform: Translate {
            y: root.shouldRender ? 0 : 20
            Behavior on y {
                NumberAnimation {
                    duration: root.motionEnabled ? 240 : 0
                    easing.type: Easing.BezierSpline
                    easing.bezierCurve: [0, 0, .58, 1, 1, 1]
                }
            }
        }
        Behavior on opacity {
            NumberAnimation {
                duration: root.motionEnabled ? 240 : 0
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0, 0, .58, 1, 1, 1]
            }
        }
        sourceComponent: Item {
            id: contents
            implicitHeight: textRows.height + (root.backgroundEnabled ? 4 : 0)
            property real enteredOpacity: 0
            function enter(): void {
                entryOpacity.restart();
                arrival.startFrom(10);
            }
            Component.onCompleted: enter()
            Connections {
                target: root
                function onContentKeyChanged(): void {
                    contents.enter();
                }
            }
            NumberAnimation {
                id: entryOpacity
                target: contents
                property: "enteredOpacity"
                from: 0
                to: 1
                duration: root.motionEnabled ? 300 : 0
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [.25, .1, .35, 1, 1, 1]
            }
            PresentationSpring {
                id: arrival
                targetValue: 0
                stiffness: 500
                damping: 25
                enabled: root.live && root.motionEnabled
            }
            Loader {
                anchors.horizontalCenter: parent.horizontalCenter
                active: root.backgroundEnabled
                width: Math.min(contents.width, textRows.paintedWidth) + 80
                height: contents.height + 48
                y: -24
                sourceComponent: ShaderEffect {
                    property color background: Qt.rgba(root.backgroundColor.r, root.backgroundColor.g, root.backgroundColor.b, 1)
                    fragmentShader: Qt.resolvedUrl("../shaders/subtitle-glow.frag.qsb")
                    layer.enabled: visible && GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
                    layer.effect: MultiEffect {
                        blurEnabled: true
                        blurMax: 32
                        blur: 24 / 32
                    }
                }
            }
            Column {
                id: textRows
                anchors.horizontalCenter: parent.horizontalCenter
                width: Math.min(root.shownContent.tracks.length ? 896 : 672, contents.width)
                y: root.backgroundEnabled ? 2 : 0
                opacity: contents.enteredOpacity
                transform: Translate {
                    y: arrival.value
                }
                spacing: root.shownContent.tracks.length ? 0 : 8
                property real paintedWidth: {
                    let maximum = 0;
                    for (const item of children)
                        if (item.objectName === "foliaSubtitleRow")
                            maximum = Math.max(maximum, item.paintedWidth);
                    return maximum + (root.backgroundEnabled ? 12 : 0);
                }
                Repeater {
                    model: root.shownContent.tracks.length ? root.shownContent.tracks : root.shownContent.upcoming.map(line => ({
                                text: line.fullText,
                                role: "upcoming"
                            }))
                    Item {
                        id: row
                        required property var modelData
                        required property int index
                        objectName: "foliaSubtitleRow"
                        readonly property bool upcoming: modelData.role === "upcoming"
                        readonly property bool secondary: !upcoming && index > 0
                        readonly property real nominalSize: Subtitle.subtitleSize(root.width, root.lyricScale, root.subtitleScale, upcoming, secondary ? .88 : 1, root.settings.mode)
                        readonly property real gap: secondary ? nominalSize * .25 : 0
                        readonly property real paintedWidth: label.contentWidth
                        width: textRows.width
                        height: label.implicitHeight + gap
                        opacity: secondary ? .82 : 1
                        FoliaFont {
                            id: textFont
                            base: root.baseFont
                            pixelSize: Math.round(row.nominalSize)
                            weight: Number.isFinite(root.settings.subtitleFontWeight) ? root.settings.subtitleFontWeight : row.upcoming || row.secondary ? 400 : 500
                        }
                        Text {
                            id: label
                            objectName: "foliaSubtitleText" + row.index
                            width: row.width
                            y: row.gap
                            text: row.modelData.text
                            textFormat: Text.PlainText
                            font: textFont.value
                            color: root.secondaryColor
                            horizontalAlignment: Text.AlignHCenter
                            wrapMode: row.upcoming ? Text.NoWrap : Text.WordWrap
                            elide: row.upcoming ? Text.ElideRight : Text.ElideNone
                            lineHeightMode: Text.FixedHeight
                            lineHeight: row.nominalSize * 1.5
                            renderType: Text.QtRendering
                            layer.enabled: visible && GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
                            layer.effect: MultiEffect {
                                shadowEnabled: true
                                shadowColor: Qt.rgba(root.backgroundColor.r, root.backgroundColor.g, root.backgroundColor.b, .24)
                                shadowOpacity: 1
                                shadowVerticalOffset: 1
                                shadowBlur: 2 / 32
                                blurMax: 32
                                blurEnabled: row.upcoming && root.settings.subtitleUpcomingLyricsBlur !== false
                                blur: 1 / 32
                            }
                        }
                    }
                }
            }
        }
    }
}
