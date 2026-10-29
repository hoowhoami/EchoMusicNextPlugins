// The sample's own data and clock feed the production renderers directly.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../shared"
import "../backgrounds"
import "../backgrounds/latent"
import "preview-scale.mjs" as Scale
import "harmony.mjs" as Harmony
import "../shared/timelineIndex.mjs" as Timeline

Item {
    id: root
    required property EchoPluginContext plugin
    required property var sample
    required property var settings
    required property var styles
    required property var appearance
    required property font baseFont
    required property font subtitleFont
    property size viewportSize: Qt.size(1100, 820)
    property bool paused: false
    property bool motionEnabled: true
    property var customAvatarImages: []
    property var customEmojiImages: []
    property var customPortraitImages: []
    property var customLayerImages: []
    property var customBackgroundImages: []
    readonly property var framed: Scale.frameStage({
        width: viewportSize.width,
        height: viewportSize.height
    }, {
        width,
        height
    }, 1, true, 1.15)
    readonly property var selected: styles.find(style => style.id === settings.mode)
    readonly property var lines: preparation.preparedLines.map(entry => entry.line)
    readonly property var clock: sampleClock
    readonly property var stage: visualizer
    readonly property var harmony: harmonyOverlay
    readonly property var foreground: visualizer
    readonly property var timing: Timeline.buildTimelineIndex(lines)
    readonly property var timelineState: Timeline.timelineState(timing, sampleClock.timeSeconds)
    readonly property string errorString: preparation.errorString || palette.errorString || background.errorString || visualizer.errorString || harmonyOverlay.errorString
    readonly property bool renderReady: preparation.preparedLines.length === 4 && !preparation.busy && visualizer.renderer !== null && !(visualizer.renderer.busy === true) && (!('renderReady' in visualizer.renderer) || visualizer.renderer.renderReady) && visualizer.actors.some(actor => actor.renderer === visualizer.renderer && actor.hasFrame)
    readonly property real displayScale: framed ? framed.place.scale : 1
    readonly property real aboveBox: framed ? Scale.stageAboveBox(framed) : 0
    readonly property real belowBox: framed ? Scale.stageBelowBox(framed, {
        width,
        height
    }) : 0
    function styleFrame(mode: string): var {
        if (mode !== 'monet' || !framed)
            return null;
        const own = Scale.frameStage({
            width: viewportSize.width,
            height: viewportSize.height
        }, {
            width,
            height
        }, 1, true, 1.3);
        const place = Scale.placeOnStage(framed.place, own.place);
        return {
            x: place.left,
            y: place.top,
            scale: place.scale,
            width: own.stage.width,
            height: own.stage.height
        };
    }
    function lineAt(index: int): var {
        return index >= 0 && index < lines.length ? lines[index] : null;
    }
    readonly property var recent: timelineState.recentIndex === visualizer.subtitleSuppressedRecentIndex ? null : lineAt(timelineState.recentIndex)
    readonly property var upcoming: timelineState.nextIndices.map(index => lineAt(index))
    SamplePreparation {
        id: preparation
        rows: root.sample.rows
        sampleKey: root.sample.id
        textService: root.plugin.text
        live: root.visible
    }
    SampleClock {
        id: sampleClock
        mode: root.settings.mode || 'classic'
        playbackKey: root.sample.id
        loopDuration: root.sample.loopDuration
        lines: root.lines
        paused: root.paused
        live: root.visible
    }
    CoverPalette {
        id: palette
        plugin: root.plugin
        source: Qt.resolvedUrl(root.sample.cover)
        trackRevision: 'preview:' + root.sample.id
        live: root.visible && (root.settings.backgroundMode === 'latent' || root.settings.mode === 'tempera')
    }
    Item {
        id: frame
        x: root.framed ? root.framed.frame.left : 0
        y: root.framed ? root.framed.frame.top : 0
        width: root.framed ? root.framed.frame.width : root.width
        height: root.framed ? root.framed.frame.height : root.height
        clip: true
        Item {
            id: drawn
            x: root.framed ? root.framed.place.left : 0
            y: root.framed ? root.framed.place.top : 0
            width: root.framed ? root.framed.stage.width : root.viewportSize.width
            height: root.framed ? root.framed.stage.height : root.viewportSize.height
            scale: root.displayScale
            transformOrigin: Item.TopLeft
            Rectangle {
                anchors.fill: parent
                color: root.appearance.main
            }
            VisualizerSurface {
                id: surface
                anchors.fill: parent
                opacity: Number.isFinite(root.settings.visualizerOpacity) ? root.settings.visualizerOpacity : 1
                BackgroundPresentation {
                    id: background
                    anchors.fill: parent
                    z: 0
                    settings: root.settings
                    assetsService: root.plugin.assets
                    coverUrl: Qt.resolvedUrl(root.sample.cover)
                    seed: 'vis-playground-' + root.sample.id
                    bands: sampleClock.levels
                    coverColors: palette.colors
                    customBackgroundImages: root.customBackgroundImages
                    backgroundColor: root.appearance.main
                    primaryColor: root.appearance.text
                    secondaryColor: root.appearance.secondaryText
                    accentColor: root.appearance.accent
                    dark: root.appearance.dark
                    paused: root.paused
                    motionEnabled: root.motionEnabled
                    styleWaits: visualizer.transitionWaits
                }
                VisualizerStage {
                    id: visualizer
                    objectName: "foliaPreviewStage"
                    anchors.fill: parent
                    z: 1
                    mode: root.settings.mode || 'classic'
                    componentPath: root.selected ? root.selected.component : ''
                    settings: root.settings
                    previewRows: preparation.preparedLines.length === 4 ? root.sample.rows : null
                    previewFraming: mode => root.styleFrame(mode)
                    preparedLines: preparation.preparedLines
                    nextStartBySourceIndex: root.timing.nextStartBySourceIndex
                    lineMetadata: root.timing.lineMetadata
                    metadataBySourceIndex: root.timing.metadataBySourceIndex
                    currentIndex: sampleClock.currentIndex
                    timeSeconds: sampleClock.timeSeconds
                    lyricCount: root.sample.rows.length
                    trackRevision: 'preview:' + root.sample.id
                    textService: root.plugin.text
                    assetsService: root.plugin.assets
                    baseFont: root.baseFont
                    subtitleFont: root.subtitleFont
                    primaryColor: root.appearance.text
                    secondaryColor: root.appearance.secondaryText
                    accentColor: root.appearance.accent
                    backgroundColor: root.appearance.main
                    dark: root.appearance.dark
                    songTitle: root.sample.title
                    songArtist: qsTr('自撰预览示例')
                    songAlbum: qsTr('独立示例时间线')
                    coverUrl: Qt.resolvedUrl(root.sample.cover)
                    avatarSeed: 'vis-playground-' + root.sample.id
                    backdropSources: [background]
                    customAvatarImages: root.customAvatarImages
                    customEmojiImages: root.customEmojiImages
                    customPortraitImages: root.customPortraitImages
                    customLayerImages: root.customLayerImages
                    coverColors: palette.colors
                    spectrumBins: sampleClock.levels.spectrum.map(value => value / 255)
                    audioBands: sampleClock.levels
                    audioPower: sampleClock.levels.audioPower
                    bassPower: sampleClock.levels.bass
                    vocalPower: sampleClock.levels.vocal
                    paused: root.paused
                    motionEnabled: root.motionEnabled
                    live: root.visible && preparation.preparedLines.length === 4
                }
                SubtitleOverlay {
                    anchors.fill: parent
                    z: 2
                    visible: !root.selected || !root.selected.inlineSubtitles
                    activeLine: root.lineAt(sampleClock.currentIndex)
                    recentLine: root.recent
                    nextLines: root.upcoming
                    settings: root.settings
                    baseFont: root.subtitleFont
                    secondaryColor: root.appearance.secondaryText
                    backgroundColor: root.appearance.main
                    bottomOffset: (112 * root.displayScale / 1.15 + root.belowBox) / root.displayScale - 80
                    chromeHidden: false
                    live: root.visible
                    motionEnabled: root.motionEnabled
                }
            }
            HarmonyOverlay {
                id: harmonyOverlay
                objectName: "foliaPreviewHarmony"
                width: parent.width
                height: parent.height
                y: (76 * root.displayScale / 1.15 + root.aboveBox) / root.displayScale - 76
                vocalIndex: Harmony.indexForRows(root.sample.rows)
                timeSeconds: sampleClock.timeSeconds
                settings: root.settings
                baseFont: root.subtitleFont
                translationFont: root.subtitleFont
                textService: root.plugin.text
                accentColor: root.appearance.accent
                secondaryColor: root.appearance.secondaryText
                backgroundColor: root.appearance.main
                live: root.visible
                motionEnabled: root.motionEnabled
            }
        }
    }
}
