// Folia Still, ported from folia-major a8da4437 (AGPL-3.0).
// Only the bounded three-row presentation is retained; playback stays host-owned.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects

Item {
    id: root
    property var lineWindow: [null, null, null]
    property bool showText: true
    property bool hideTranslationSubtitle: false
    property bool dark: true
    property real lyricsFontScale: 1
    property real subtitleFontScale: 1
    property color primaryColor: "white"
    property color secondaryColor: "#cccccc"
    property font currentFont: Qt.font({
        pixelSize: 40,
        weight: 700,
        letterSpacing: 0.8
    })
    property font adjacentFont: Qt.font({
        pixelSize: 30,
        weight: 600,
        letterSpacing: 0.6
    })
    property font currentSubtitleFont: Qt.font({
        pixelSize: 24,
        weight: 500,
        letterSpacing: 0.6
    })
    property font adjacentSubtitleFont: Qt.font({
        pixelSize: 20,
        weight: 400,
        letterSpacing: 0.5
    })

    // Tailwind 4.3.3 drop-shadow-md/sm from the pinned upstream dependency:
    // one bounded GPU glyph layer per text, retained only by the selected page.
    component ShadowText: Text {
        id: glyph
        property bool subtitle: false
        layer.enabled: visible && GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
        layer.effect: MultiEffect {
            shadowEnabled: true
            shadowColor: "black"
            shadowOpacity: glyph.subtitle ? 0.15 : 0.12
            shadowVerticalOffset: glyph.subtitle ? 1 : 3
            shadowBlur: (glyph.subtitle ? 2 : 3) / 32
            blurMax: 32
        }
    }

    ShaderEffect {
        anchors.fill: parent
        property real strength: root.dark ? 0.65 : 0.3
        fragmentShader: Qt.resolvedUrl("../../shaders/vignette.frag.qsb")
    }

    Column {
        id: rows
        objectName: "stillRows"
        visible: root.showText
        x: 48
        y: (root.height - 64 - height) / 2
        width: Math.max(0, root.width - 96)
        spacing: 32
        Repeater {
            objectName: "stillRepeater"
            model: 3
            Item {
                id: row
                required property int index
                readonly property var line: root.lineWindow[index] || null
                readonly property bool current: index === 1
                readonly property bool hasTranslation: line !== null && (line.translation || "").length > 0 && !root.hideTranslationSubtitle
                objectName: "stillRow" + index
                width: rows.width
                height: line ? main.implicitHeight * root.lyricsFontScale + (hasTranslation ? translation.implicitHeight * root.lyricsFontScale * root.subtitleFontScale + (current ? 12 : 8) : 0) : 80

                ShadowText {
                    id: main
                    objectName: "stillPrimary" + row.index
                    width: Math.min(896, row.width) / Math.max(0.01, root.lyricsFontScale)
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: row.line ? row.line.lineText || "" : ""
                    textFormat: Text.PlainText
                    wrapMode: Text.Wrap
                    lineHeightMode: Text.FixedHeight
                    lineHeight: row.current ? 50 : 36
                    horizontalAlignment: Text.AlignHCenter
                    color: root.primaryColor
                    opacity: row.current ? 1 : 0.3
                    font: row.current ? root.currentFont : root.adjacentFont
                    scale: root.lyricsFontScale
                    transformOrigin: Item.Top
                    renderType: Text.QtRendering
                }
                ShadowText {
                    id: translation
                    objectName: "stillTranslation" + row.index
                    subtitle: true
                    width: Math.min(896, row.width) / Math.max(0.01, root.lyricsFontScale * root.subtitleFontScale)
                    anchors.horizontalCenter: parent.horizontalCenter
                    y: main.implicitHeight * root.lyricsFontScale + (row.current ? 12 : 8)
                    visible: row.hasTranslation
                    text: row.line ? row.line.translation || "" : ""
                    textFormat: Text.PlainText
                    wrapMode: Text.Wrap
                    lineHeightMode: Text.FixedHeight
                    lineHeight: row.current ? 32 : 28
                    horizontalAlignment: Text.AlignHCenter
                    color: root.secondaryColor
                    opacity: row.current ? 0.8 : 0.3
                    font: row.current ? root.currentSubtitleFont : root.adjacentSubtitleFont
                    scale: root.lyricsFontScale * root.subtitleFontScale
                    transformOrigin: Item.Top
                    renderType: Text.QtRendering
                }
            }
        }
    }
}
