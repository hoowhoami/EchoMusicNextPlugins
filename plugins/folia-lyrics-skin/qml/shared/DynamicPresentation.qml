// The only dynamic lyric preparation and host-clock projection for the visible page.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "presentationIdentity.mjs" as Identity

Item {
    id: root
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property var settings
    required property var appearance
    required property font baseFont
    required property font subtitleFont
    property string componentPath: ""
    property bool live: true
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
    readonly property var songHandoff: handoff.active ? handoff : null
    readonly property bool holdingOutgoing: handoff.holding
    readonly property EchoPluginTransitionTrack heldOutgoingTrack: handoff.holding ? handoff.projection.outgoing : null
    readonly property EchoPluginTransitionTrack shownTransitionTrack: handoff.holding ? handoff.track : null
    readonly property real shownTimeSeconds: handoff.holding ? handoff.text.currentTime : presentationTimeSeconds
    readonly property real heldOutgoingTimeSeconds: handoff.holding ? handoff.outgoingTime : presentationTimeSeconds
    readonly property var outgoingAppearance: handoff.holding ? handoff.heldAppearance : appearance
    readonly property string currentBackgroundSeed: page.snapshot.track ? page.snapshot.track.id + ":" + page.snapshot.track.hash : page.player.revision
    readonly property string backgroundSeed: songHandoff ? songHandoff.incomingSeed : handoff.holding ? handoff.heldBackgroundSeed : settings.mode === "monet" ? geometrySeed : currentBackgroundSeed
    readonly property url shownCoverUrl: songHandoff ? handoff.portraitCover : handoff.holding ? handoff.projection.outgoing.coverUrl : page.player.coverUrl
    readonly property var backgroundAppearance: songHandoff ? appearance : outgoingAppearance
    readonly property var shownCoverColors: handoff.holding && !handoff.crossed ? coverPaletteSnapshot && String(coverPaletteSnapshot.source) === String(handoff.projection.outgoing.coverUrl) ? coverPaletteSnapshot.colors : handoff.heldCoverColors : coverColors
    readonly property var backgroundCoverColors: handoff.holding && !songHandoff ? shownCoverColors : coverColors
    readonly property var shownTimeline: handoff.holding ? handoff.timeline : lyricTimeline
    readonly property var shownPreparation: handoff.holding ? handoff.preparation : lyricPreparation
    readonly property var shownAppearance: handoff.holding ? handoff.text.theme : appearance
    readonly property string geometrySeed: Identity.geometrySeed(page.player.snapshot.track, settings.mode)
    onCoverPaletteSnapshotChanged: if (handoff && handoff.holding && coverPaletteSnapshot)
        handoff.rememberCoverColors(coverPaletteSnapshot.source, coverPaletteSnapshot.colors)
    function refreshClock(): void {
        clock.publish();
    }
    property var backdropSources: []
    signal operationIssued(var operation)
    signal commandRejected(string action, string reason)
    function seekLine(seconds: real): void {
        if (!Number.isFinite(seconds) || !root.live || !root.page || !root.page.active)
            return;
        // A/B presentations stay read-only. Never apply an outgoing A lyric
        // position to an already adopted native B through a current-source seek.
        if (root.holdingOutgoing && !handoff.crossed) {
            root.commandRejected("seek", qsTr("歌曲正在交接，请稍后重试"));
            return;
        }
        root.operationIssued(root.page.command("seek", {
            value: Math.max(0, Math.round(seconds * 1000)),
            revision: root.page.player.revision
        }));
    }
    signal settingsPatchRequested(var patch)
    readonly property bool transitionWaits: visualizer.transitionWaits
    readonly property var stage: visualizer
    readonly property var preparation: lyricPreparation
    readonly property var timeline: lyricTimeline
    readonly property bool hasDynamicActors: visualizer.actors.some(actor => actor.modeKey !== "still")
    readonly property bool needsDynamicTimeline: root.settings.mode !== "still" || hasDynamicActors
    readonly property string errorString: lyricPreparation.errorMessage || handoff.errorString || visualizer.errorString
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
        enabled: root.live
        continuous: root.needsDynamicTimeline || root.harmonyActive
    }
    LyricTimeline {
        id: lyricTimeline
        page: root.page
        live: root.live && root.needsDynamicTimeline
        timeSeconds: clock.renderTime / 1000
    }
    SongHandoff {
        id: handoff
        objectName: "foliaSongHandoff"
        plugin: root.plugin
        page: root.page
        appearance: root.appearance
        live: root.live
        mode: root.settings.mode
        motionEnabled: root.motionEnabled
        coverColors: root.coverPaletteSnapshot ? String(root.coverPaletteSnapshot.source) === String(projection ? projection.outgoing.coverUrl : "") ? root.coverPaletteSnapshot.colors : [] : root.coverColors
        paired: clock.paired
        extraIndicesKey: visualizer.requiredSourceIndicesKey
    }
    PreparedLyrics {
        id: lyricPreparation
        plugin: root.plugin
        page: root.page
        live: root.live && root.needsDynamicTimeline
        focusIndex: lyricTimeline.activeIndex >= 0 ? lyricTimeline.activeIndex : lyricTimeline.cursorIndex
        extraIndicesKey: [lyricTimeline.recentIndex].concat(root.nextIndicesKey ? root.nextIndicesKey.split(",") : [], visualizer.requiredSourceIndicesKey ? visualizer.requiredSourceIndicesKey.split(",") : []).join(",")
    }
    VisualizerStage {
        id: visualizer
        objectName: "foliaVisualizerStage"
        anchors.fill: parent
        mode: root.settings.mode
        componentPath: root.componentPath
        backdropSources: root.backdropSources
        songHandoff: root.songHandoff
        preparedLines: handoff.holding ? handoff.text.lines : lyricPreparation.preparedLines
        currentIndex: handoff.holding ? handoff.text.currentLineIndex : root.settings.mode === "still" ? root.page.player.lyricsInfo.currentIndex : lyricTimeline.activeIndex
        timeSeconds: root.shownTimeSeconds
        nextStartBySourceIndex: root.shownTimeline.nextStartBySourceIndex
        lineMetadata: root.shownTimeline.lineMetadata
        metadataBySourceIndex: root.shownTimeline.metadataBySourceIndex
        textService: root.plugin.text
        assetsService: root.plugin.assets
        lyricSource: handoff.holding ? handoff.track.lyrics : root.page.player.lyrics
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
        songTitle: handoff.holding ? handoff.text.songTitle : root.page.player.title
        songArtist: handoff.holding ? handoff.text.songArtist : root.page.player.artist
        songAlbum: handoff.holding ? handoff.text.songAlbum : root.page.player.album
        coverUrl: root.shownCoverUrl
        coverColors: root.shownCoverColors
        customLayerImages: root.customLayerImages
        avatarSeed: handoff.holding ? handoff.text.seed : root.geometrySeed
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
        live: root.live
        motionEnabled: root.motionEnabled
        paused: !root.page.player.playing
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
        live: root.live
        motionEnabled: root.motionEnabled
    }
}
