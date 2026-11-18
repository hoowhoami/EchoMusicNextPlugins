// Wrapped main and subtitle rows share the exact source pretext height and baseline.
pragma ComponentBehavior: Bound
import QtQuick
import "kernel.mjs" as Kernel
import "motion-profile.mjs" as Profile
import "../cadenza/color.mjs" as Color
import "../cadenza/word-coloring.mjs" as WordColor
import "../../shared/text/graphemeTiming.mjs" as Graphemes
import "../../shared"

Item {
    id: root
    required property var item
    required property var controller
    readonly property var prepared: item.prepared
    readonly property bool focal: item.isActive
    readonly property var chorus: Profile.resolvePendoloChorusPresentation(prepared.line.isChorus, focal && item.sourceIndex === controller.currentIndex, controller.profile)
    readonly property color fillColor: nativeColor(Color.mixColors(String(controller.primaryColor), String(controller.accentColor), chorus.accentMix))
    readonly property var visibleMain: Kernel.paintRows(item.main.lines, item.main.lineHeight, item.blockHeight, controller.height)
    readonly property var tokens: tokenColors()
    readonly property int glyphRowCount: mainRows.count
    property string errorString: ""
    width: item.maxWidth
    height: item.blockHeight
    scale: item.scale
    transformOrigin: Item.TopLeft
    rotation: item.angleDeg * .35 - controller.wheelRotation * .65
    function nativeColor(value: var): color {
        const c = Color.parseColorChannels(value);
        return c ? Qt.rgba(c.r / 255, c.g / 255, c.b / 255, 1) : Qt.color(value);
    }
    function tokenColors(): var {
        const matchers = WordColor.prepareWordColorMatchers(controller.settings.wordColors || [], true), ranges = WordColor.buildWordColorRangesFromMatchers(prepared.line.fullText, matchers);
        let cursor = 0;
        const chars = Graphemes.splitLyricGraphemes(prepared.line.fullText), tokens = chars.map((text, index) => {
            const startOffset = cursor;
            cursor += text.length;
            return {
                key: String(index),
                timed: true,
                startOffset,
                endOffset: cursor
            };
        });
        const colors = WordColor.resolveTokenColorMap(tokens, ranges);
        return chars.map((_, i) => colors.get(String(i)) ? nativeColor(colors.get(String(i))) : fillColor);
    }
    Item {
        id: block
        y: -root.height / 2
        width: root.width
        height: root.height
        scale: root.chorus.haloScale
        transformOrigin: Item.Left
        Behavior on scale {
            NumberAnimation {
                duration: root.controller.motionEnabled ? root.chorus.transitionDuration * 1000 : 0
                easing.type: Easing.OutCubic
            }
        }
        TapHandler {
            onTapped: root.controller.seekLine(root.item.sourceIndex, root.prepared.line.startTime)
        }
        Loader {
            id: halo
            objectName: "pendoloChorusHalo"
            active: root.chorus.isActive
            x: -root.item.fontPx * 1.1
            readonly property real fullHeight: root.height + root.item.fontPx * 1.4
            readonly property real windowOffset: (fullHeight - height) / 2
            y: -root.item.fontPx * .7 + windowOffset
            width: root.width + root.item.fontPx * 2.2
            height: Math.min(fullHeight, root.controller.height * 3.4)
            z: -1
            sourceComponent: Item {
                property real presence: 0
                opacity: presence * root.chorus.haloOpacity
                scale: .96 + .04 * presence
                NumberAnimation on presence {
                    from: 0
                    to: 1
                    duration: root.controller.motionEnabled ? root.chorus.transitionDuration * 1000 : 0
                    easing.type: Easing.OutCubic
                }
                ShaderEffect {
                    id: background
                    anchors.fill: parent
                    property vector2d size: Qt.vector2d(width, height)
                    property vector2d fullSize: Qt.vector2d(width, halo.fullHeight)
                    property vector2d offset: Qt.vector2d(0, halo.windowOffset)
                    property color tint: root.controller.accentColor
                    property real haloOpacity: root.chorus.haloOpacity
                    fragmentShader: Qt.resolvedUrl("chorus.frag.qsb")
                }
                PendoloBlur {
                    anchors.fill: parent
                    source: background
                    sigma: Math.round(10 * root.controller.profile.chorusGlowMultiplier)
                    live: root.controller.live
                }
            }
        }
        Item {
            id: chorusMarker
            objectName: "pendoloChorusMarker"
            visible: root.controller._manual !== null && root.prepared.line.isChorus === true
            x: -root.item.fontPx * .95
            y: root.item.fontPx * .52
            width: root.item.fontPx * .42
            height: width
            Rectangle {
                id: markerInk
                anchors.fill: parent
                radius: width / 2
                color: root.controller.accentColor
            }
            PendoloShadow {
                anchors.fill: parent
                source: markerInk
                effectEnabled: chorusMarker.visible
                live: root.controller.live
                cascade: false
                sigma1: 3.5
                opacity1: .58
                color1: root.controller.accentColor
            }
        }
        Repeater {
            id: mainRows
            model: root.visibleMain
            delegate: PendoloTextRow {
                id: mainRow
                required property var modelData
                row: modelData
                y: modelData.rowIndex * root.item.main.lineHeight
                timings: root.prepared.timeline.slice(modelData.graphemeStart, modelData.graphemeEnd)
                tokenColors: root.tokens.slice(modelData.graphemeStart, modelData.graphemeEnd)
                // A retired line's child binding can see a cleared root id.
                // A live root with a bad controller still fails visibly.
                timeSeconds: root ? root.controller.timeSeconds : 0
                endTime: root.prepared.line.endTime
                fontPx: root.item.fontPx
                fontWeight: root.item.fontWeight
                baseFont: root.controller.baseFont
                primaryColor: root.focal ? root.controller.primaryColor : Qt.rgba(root.controller.primaryColor.r, root.controller.primaryColor.g, root.controller.primaryColor.b, .75)
                fillColor: root.fillColor
                accentColor: root.controller.accentColor
                focal: root.focal
                chorus: root.chorus.isActive
                glowMultiplier: root.chorus.glowMultiplier
                lineHeight: root.item.main.lineHeight
                live: root.controller.live
                spacing: root.focal ? 0 : root.item.fontPx * .01
                onErrorStringChanged: if (errorString)
                    root.errorString = errorString
            }
        }
        Column {
            y: root.item.main.height
            width: parent.width
            Repeater {
                model: root.item.tracks
                delegate: Item {
                    id: track
                    required property var modelData
                    width: root.width
                    height: modelData.layout.height + modelData.gapEm * modelData.fontPx
                    opacity: modelData.opacityFactor
                    Repeater {
                        model: Kernel.paintRows(track.modelData.layout.lines, track.modelData.lineHeightPx, root.item.blockHeight, root.controller.height)
                        delegate: PendoloTextRow {
                            required property var modelData
                            row: modelData
                            y: track.modelData.gapEm * track.modelData.fontPx + modelData.rowIndex * track.modelData.lineHeightPx
                            fontPx: track.modelData.fontPx
                            fontWeight: track.modelData.fontWeight
                            baseFont: root.controller.subtitleFont
                            primaryColor: root.focal ? root.controller.secondaryColor : Qt.rgba(root.controller.secondaryColor.r, root.controller.secondaryColor.g, root.controller.secondaryColor.b, .6)
                            lineHeight: track.modelData.lineHeightPx
                            spacing: fontPx * .01
                            onErrorStringChanged: if (errorString)
                                root.errorString = errorString
                        }
                    }
                }
            }
        }
    }
}
