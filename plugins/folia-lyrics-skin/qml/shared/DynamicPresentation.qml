// The only dynamic lyric preparation and host-clock projection for the visible page.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "presentationIdentity.mjs" as Identity

Item {
    id: root
    property bool previewMode: false
    required property EchoPluginContext plugin
    property EchoPluginViewContext page: null
    property EchoPluginPlayer player: page ? page.player : null
    property LyricProjection lyricSource: null
    LyricProjection {
        id: filteredSource
        source: root.lyricSource ? null : root.player.lyrics
        count: root.player.lyricsInfo.count || 0
        enabled: root.settings.lyricFilterEnabled !== false
        pattern: root.settings.lyricFilterRegex || ""
        title: root.player.title
        artist: root.player.artist
    }
    property bool previewPaused: false
    required property var settings
    required property var appearance
    required property font baseFont
    required property font subtitleFont
    property string componentPath: ""
    property bool live: true
    readonly property bool drawingActive: live && settings.visualizerOpacity > 0
    property real bottomOffset: 32
    property bool chromeHidden: false
    property bool motionEnabled: true
    property var bands: ({
            bass: 0,
            lowMid: 0,
            mid: 0,
            vocal: 0,
            treble: 0,
            audioPower: 0
        })
    property var customAvatarImages: []
    property var customEmojiImages: []
    property var customPortraitImages: []
    property var customLayerImages: []
    property var coverColors: []
    property var coverPaletteSnapshot: null
    property var spectrumBins: []
    property bool inlineSubtitles: false
    property bool harmonyActive: false
    readonly property real presentationTimeSeconds: clock.renderTime / 1000
    readonly property var songHandoff: null
    readonly property bool holdingOutgoing: false
    readonly property var heldOutgoingTrack: null
    readonly property var shownTransitionTrack: null
    readonly property real heldOutgoingTimeSeconds: presentationTimeSeconds
    readonly property var outgoingAppearance: appearance
    readonly property real shownTimeSeconds: presentationTimeSeconds
    readonly property string geometrySeed: Identity.geometrySeed(player.snapshot.track, settings.mode)
    readonly property string backgroundSeed: geometrySeed
    readonly property url shownCoverUrl: player.coverUrl
    readonly property var shownCoverColors: coverColors
    readonly property var backgroundCoverColors: coverColors
    readonly property var backgroundAppearance: appearance
    readonly property var shownTimeline: lyricTimeline
    readonly property var shownPreparation: lyricPreparation
    readonly property var shownAppearance: appearance
    function refreshClock(): void {
        clock.publish();
    }
    property var backdropSources: []
    signal operationIssued(var operation)
    signal commandRejected(string action, string reason)
    function seekLine(seconds: real): void {
        if (!Number.isFinite(seconds) || !root.live || !root.page || !root.page.active)
            return;
        root.operationIssued(root.page.command("seek", {
            value: Math.max(0, Math.round(seconds * 1000)),
            revision: root.player.revision
        }));
    }
    signal settingsPatchRequested(var patch)
    readonly property bool transitionWaits: visualizer.transitionWaits
    readonly property var stage: visualizer
    readonly property var preparation: lyricPreparation
    readonly property var timeline: lyricTimeline
    readonly property bool hasDynamicActors: visualizer.actors.some(actor => actor.modeKey !== "still")
    readonly property bool needsDynamicTimeline: root.drawingActive && (root.settings.mode !== "still" || hasDynamicActors)
    readonly property string errorString: lyricPreparation.errorMessage || visualizer.errorString
    // Depend on scalar indices rather than a freshly allocated frame-time array.
    readonly property string nextIndicesKey: shownTimeline.nextIndices.join(",")
    readonly property var activeLine: lineAt(shownTimeline.activeIndex)
    readonly property var recentLine: shownTimeline.recentIndex === visualizer.subtitleSuppressedRecentIndex ? null : lineAt(shownTimeline.recentIndex)
    readonly property var nextLines: nextIndicesKey ? nextIndicesKey.split(",").map(index => lineAt(Number(index))).filter(line => line !== null) : []
    readonly property var subtitleSettings: settings.subtitleFontInheritsLyrics ? Object.assign({}, settings, {
        subtitleFontWeight: settings.fontWeight
    }) : settings

    function lineAt(index: int): var {
        const prepared = index >= 0 ? shownPreparation.preparedLines[index] : null;
        return prepared ? prepared.line : null;
    }
    PresentationClock {
        id: clock
        objectName: "foliaPresentationClock"
        page: root.page
        sourcePlayer: root.player
        frozen: root.previewPaused
        enabled: root.live
        continuous: root.needsDynamicTimeline || root.harmonyActive
    }
    LyricTimeline {
        id: lyricTimeline
        page: root.page
        player: root.player
        lyricSource: root.lyricSource || filteredSource
        live: root.drawingActive && root.needsDynamicTimeline
        timeSeconds: clock.renderTime / 1000
    }
    PreparedLyrics {
        id: lyricPreparation
        plugin: root.plugin
        page: root.page
        player: root.player
        lyricSource: root.lyricSource || filteredSource
        live: root.drawingActive && root.needsDynamicTimeline
        focusIndex: lyricTimeline.activeIndex >= 0 ? lyricTimeline.activeIndex : lyricTimeline.cursorIndex
        extraIndicesKey: [lyricTimeline.recentIndex].concat(root.nextIndicesKey ? root.nextIndicesKey.split(",") : [], visualizer.requiredSourceIndicesKey ? visualizer.requiredSourceIndicesKey.split(",") : []).join(",")
    }
    VisualizerStage {
        id: visualizer
        objectName: "foliaVisualizerStage"
        anchors.fill: parent
        mode: root.settings.mode
        previewMode: root.previewMode
        componentPath: root.componentPath
        backdropSources: root.backdropSources
        songHandoff: root.songHandoff
        preparedLines: lyricPreparation.preparedLines
        currentIndex: root.settings.mode === "still" ? root.player.lyricsInfo.currentIndex : lyricTimeline.activeIndex
        timeSeconds: root.shownTimeSeconds
        nextStartBySourceIndex: root.shownTimeline.nextStartBySourceIndex
        lineMetadata: root.shownTimeline.lineMetadata
        metadataBySourceIndex: root.shownTimeline.metadataBySourceIndex
        graphicsService: root.plugin.graphics
        textService: root.plugin.text
        assetsService: root.plugin.assets
        lyricSource: root.lyricSource || filteredSource
        lyricCount: root.shownTimeline.information.count || 0
        lyricOffsetMs: root.shownTimeline.information.offsetMs || 0
        trackRevision: root.shownTimeline.sourceKey
        settings: root.settings
        baseFont: root.baseFont
        subtitleFont: root.subtitleFont
        primaryColor: root.shownAppearance.text || root.appearance.text
        secondaryColor: root.shownAppearance.secondaryText || root.appearance.secondaryText
        accentColor: root.shownAppearance.accent || root.appearance.accent
        backgroundColor: root.shownAppearance.main || root.appearance.main
        songTitle: root.player.title
        songArtist: root.player.artist
        songAlbum: root.player.album
        coverUrl: root.shownCoverUrl
        coverColors: root.shownCoverColors
        customLayerImages: root.customLayerImages
        avatarSeed: root.geometrySeed
        themeName: root.shownAppearance.themeMetadata ? root.shownAppearance.themeMetadata.title : (root.shownAppearance.dark ? "dark" : "light")
        themeDisplayName: root.shownAppearance.themeMetadata ? root.shownAppearance.themeMetadata.title : ""
        themeDescription: root.shownAppearance.themeMetadata ? root.shownAppearance.themeMetadata.description : ""
        lyricsIcons: root.shownAppearance.themeMetadata ? Array.from(root.shownAppearance.themeMetadata.lyricsIcons || []) : []
        customAvatarImages: root.customAvatarImages
        customEmojiImages: root.customEmojiImages
        customPortraitImages: root.customPortraitImages
        spectrumBins: root.spectrumBins
        onSettingsPatchRequested: patch => root.settingsPatchRequested(patch)
        dark: root.shownAppearance.dark === undefined ? root.appearance.dark : root.shownAppearance.dark
        live: root.drawingActive
        motionEnabled: root.motionEnabled
        paused: root.previewPaused || !root.player.playing
        bassPower: root.bands.bass
        vocalPower: root.bands.vocal
        audioPower: root.bands.audioPower
        audioBands: root.bands
        onSeekRequested: seconds => root.seekLine(seconds)
    }
    SubtitleOverlay {
        visible: !root.inlineSubtitles
        anchors.fill: parent
        activeLine: root.activeLine
        recentLine: root.recentLine
        nextLines: root.nextLines
        settings: root.subtitleSettings
        baseFont: root.subtitleFont
        secondaryColor: root.shownAppearance.secondaryText || root.appearance.secondaryText
        backgroundColor: root.shownAppearance.main || root.appearance.main
        bottomOffset: root.bottomOffset
        chromeHidden: root.chromeHidden
        live: root.drawingActive
        motionEnabled: root.motionEnabled
    }
}
