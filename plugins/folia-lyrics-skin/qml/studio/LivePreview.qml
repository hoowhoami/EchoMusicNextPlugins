pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../shared"
import "../shared/harmony"
import "../backgrounds"
import "../backgrounds/latent"
import "../shared/typography.mjs" as Typography
import "../shared/theme/project.mjs" as FoliaTheme

Item {
    id: root
    required property EchoPluginContext plugin
    required property var settings
    property bool paused: false
    property bool live: true
    readonly property bool active: live && visible
    readonly property var appearance: FoliaTheme.appearance(plugin.appearance.snapshot, settings)
    readonly property var selected: (plugin.ui.state.styles || []).find(style => style.id === settings.mode)
    readonly property var stage: presentation.stage
    readonly property bool renderReady: stage.loadedMode === settings.mode && stage.renderer !== null && !presentation.preparation.busy && (!('renderReady' in stage.renderer) || stage.renderer.renderReady)
    readonly property string errorString: assets.errorString || presentation.errorString || background.errorString || harmonyIndex.errorString || harmony.errorString
    readonly property real fitScale: Math.min(width / 1100, height / 820)
    readonly property font lyricFont: plugin.fonts.build(Typography.availableFamilies(Typography.resolveFamilies(settings, false), plugin.fonts.families))
    readonly property font subtitleFont: plugin.fonts.build(Typography.availableFamilies(Typography.resolveFamilies(settings, true), plugin.fonts.families))
    clip: true
    PresentationAssets {
        id: assets
        plugin: root.plugin
        settings: root.settings
        live: root.active
    }
    LyricProjection {
        id: filteredLyrics
        source: root.plugin.player.lyrics
        count: root.plugin.player.lyricsInfo.count || 0
        enabled: root.settings.lyricFilterEnabled !== false
        pattern: root.settings.lyricFilterRegex || ""
        title: root.plugin.player.title
        artist: root.plugin.player.artist
    }
    Item {
        anchors.centerIn: parent
        width: 1100
        height: 820
        scale: root.fitScale
        Rectangle {
            anchors.fill: parent
            color: root.appearance.main
        }
        BackgroundPresentation {
            id: background
            anchors.fill: parent
            live: root.active && !(root.selected && root.selected.ownBackground && !(root.selected.id === "nebbia" && root.settings.nebbiaBehind === "backdrop"))
            settings: FoliaTheme.renderSettings(root.settings)
            assetsService: root.plugin.assets
            coverUrl: root.plugin.player.coverUrl
            seed: presentation.geometrySeed
            bands: audio.bands
            coverColors: palette.colors
            backgroundColor: root.appearance.main
            primaryColor: root.appearance.text
            secondaryColor: root.appearance.secondaryText
            accentColor: root.appearance.accent
            dark: root.appearance.dark
            customBackgroundImages: assets.backgroundImages
            paused: root.paused || !root.plugin.player.playing
        }
        DynamicPresentation {
            id: presentation
            previewMode: true
            objectName: "foliaStudioLivePresentation"
            anchors.fill: parent
            plugin: root.plugin
            player: root.plugin.player
            lyricSource: filteredLyrics
            previewPaused: root.paused
            settings: FoliaTheme.renderSettings(root.settings)
            appearance: root.appearance
            baseFont: root.lyricFont
            subtitleFont: root.subtitleFont
            componentPath: root.selected ? root.selected.component : ""
            live: root.active
            bands: audio.bands
            spectrumBins: audio.spectrumBins
            coverColors: palette.colors
            customAvatarImages: assets.avatarImages
            customEmojiImages: assets.emojiImages
            customPortraitImages: assets.portraitImages
            customLayerImages: assets.layerImages
            harmonyActive: harmony.activeCount > 0
            inlineSubtitles: root.selected ? root.selected.inlineSubtitles === true : false
            backdropSources: background.live ? [background] : []
        }
        HarmonyOverlay {
            id: harmony
            anchors.fill: parent
            vocalIndex: harmonyIndex.index
            timeSeconds: presentation.heldOutgoingTimeSeconds
            settings: root.settings
            baseFont: root.settings.subtitleFontInheritsLyrics !== false ? root.lyricFont : root.subtitleFont
            translationFont: root.subtitleFont
            textService: root.plugin.text
            accentColor: root.appearance.accent
            secondaryColor: root.appearance.secondaryText
            backgroundColor: root.appearance.main
            live: root.active
            motionEnabled: root.appearance.motionEnabled !== false
        }
    }
    HarmonyIndex {
        id: harmonyIndex
        player: root.plugin.player
        lyricSource: filteredLyrics
        live: root.active && root.settings.showText !== false && root.settings.showHarmonySubtitle !== false
        timeSeconds: presentation.heldOutgoingTimeSeconds
    }
    AudioBands {
        id: audio
        needBins: !!(presentation.stage.needsBins)
        plugin: root.plugin
        live: root.active && (presentation.stage.needsSpectrum || background.needsSpectrum)
        paused: root.paused || !root.plugin.player.playing
    }
    CoverPalette {
        id: palette
        plugin: root.plugin
        source: root.plugin.player.coverUrl
        trackRevision: root.plugin.player.revision
        live: root.active && (root.settings.backgroundMode === "latent" || root.settings.mode === "tempera")
    }
}
