// Actual A/B presentations. The sole PresentationClock supplies both coordinates.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../styles/monet/song-handoff.mjs" as MonetHandoff
import "handoff-clock.mjs" as HandoffClock
import "presentationIdentity.mjs" as Identity

Item {
    id: root
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property var appearance
    property bool live: false
    property string mode: "monet"
    property bool motionEnabled: true
    property var coverColors: []
    property var paired: null
    property string extraIndicesKey: ""
    readonly property EchoPluginPlaybackTransition projection: page ? page.player.transition : null
    readonly property var selection: HandoffClock.resolveSongPresentation(projection, mode, motionEnabled, paired ? paired.progress : null)
    readonly property bool holding: live && selection.holding
    readonly property bool active: holding && selection.followsCue
    readonly property string epoch: holding ? projection.epoch : ""
    readonly property real progress: active && paired && paired.progress !== null ? paired.progress : 0
    readonly property bool crossed: active && selection.crossed
    readonly property var heldAppearance: _heldAppearance
    readonly property var heldCoverColors: _heldCoverColors
    readonly property string outgoingSeed: Identity.geometrySeed(projection ? projection.outgoing : null, mode)
    readonly property string incomingSeed: Identity.geometrySeed(projection ? projection.incoming : null, mode)
    readonly property string heldBackgroundSeed: mode === "monet" ? outgoingSeed : projection ? projection.outgoing.id + ":" + projection.outgoing.hash : ""
    readonly property real outgoingTime: paired ? paired.outgoingMs / 1000 : 0
    readonly property real incomingTime: paired && paired.incomingMs !== null ? paired.incomingMs / 1000 : 0
    readonly property var text: MonetHandoff.resolveMonetSongText({
        seed: outgoingSeed,
        songTitle: projection ? projection.outgoing.title : "",
        songArtist: projection ? projection.outgoing.artist : "",
        songAlbum: projection ? projection.outgoing.album : "",
        lines: outgoingPreparation.preparedLines,
        currentTime: outgoingTime,
        currentLineIndex: outgoingTimeline.activeIndex,
        theme: _heldAppearance,
        subtitleTheme: _heldAppearance
    }, {
        seed: incomingSeed,
        songTitle: projection ? projection.incoming.title : "",
        songArtist: projection ? projection.incoming.artist : "",
        songAlbum: projection ? projection.incoming.album : "",
        lines: incomingPreparation.preparedLines,
        currentTime: incomingTime,
        currentLineIndex: incomingTimeline.activeIndex,
        theme: appearance,
        subtitleTheme: appearance
    }, crossed)
    readonly property var timeline: crossed ? incomingTimeline : outgoingTimeline
    readonly property EchoPluginTransitionTrack track: projection ? (crossed ? projection.incoming : projection.outgoing) : null
    readonly property var preparation: crossed ? incomingPreparation : outgoingPreparation
    readonly property url portraitCover: projection ? projection.incoming.coverUrl : ""
    readonly property string errorString: holding ? outgoingPreparation.errorMessage || (active ? incomingPreparation.errorMessage : "") : ""
    property var _heldAppearance: ({})
    property var _heldCoverColors: []
    function rememberCoverColors(source: string, colors: var): void {
        if (holding && String(projection.outgoing.coverUrl) === source)
            _heldCoverColors = JSON.parse(JSON.stringify(colors));
    }

    function holdAppearance(): void {
        _heldCoverColors = holding ? JSON.parse(JSON.stringify(coverColors)) : [];
        // Holding notifies before epoch. Keep the current appearance ready before
        // that notification can switch consumers to the outgoing snapshot.
        _heldAppearance = {
            text: String(appearance.text),
            secondaryText: String(appearance.secondaryText),
            accent: String(appearance.accent),
            main: String(appearance.main),
            dark: appearance.dark,
            themeMetadata: appearance.themeMetadata ? JSON.parse(JSON.stringify(appearance.themeMetadata)) : null
        };
    }
    onAppearanceChanged: if (!holding)
        holdAppearance()
    onEpochChanged: holdAppearance()
    Component.onCompleted: holdAppearance()

    LyricTimeline {
        id: outgoingTimeline
        page: root.page
        transitionTrack: root.projection ? root.projection.outgoing : null
        live: root.holding
        timeSeconds: root.outgoingTime
    }
    LyricTimeline {
        id: incomingTimeline
        page: root.page
        transitionTrack: root.projection ? root.projection.incoming : null
        live: root.active
        timeSeconds: root.incomingTime
    }
    PreparedLyrics {
        id: outgoingPreparation
        plugin: root.plugin
        page: root.page
        transitionTrack: root.projection ? root.projection.outgoing : null
        live: root.holding
        focusIndex: outgoingTimeline.activeIndex >= 0 ? outgoingTimeline.activeIndex : outgoingTimeline.cursorIndex
        extraIndicesKey: root.crossed ? "" : root.extraIndicesKey
    }
    PreparedLyrics {
        id: incomingPreparation
        plugin: root.plugin
        page: root.page
        transitionTrack: root.projection ? root.projection.incoming : null
        live: root.active
        focusIndex: incomingTimeline.activeIndex >= 0 ? incomingTimeline.activeIndex : incomingTimeline.cursorIndex
        extraIndicesKey: root.crossed ? root.extraIndicesKey : ""
    }
}
