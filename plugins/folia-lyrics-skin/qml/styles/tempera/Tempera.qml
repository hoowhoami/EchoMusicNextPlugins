// Folia a8da4437 Tempera. Source program, display order and absolute-time camera remain in a bounded Worker.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "kernel.mjs" as Kernel

Item {
    id: root
    objectName: "foliaTempera"
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color backgroundColor: dark ? "#111111" : "#ffffff"
    property color primaryColor: "#ffffff"
    property color secondaryColor: "#999999"
    property color accentColor: primaryColor
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property string themeName: dark ? "dark" : "light"
    property string avatarSeed: "tempera"
    property string seed: avatarSeed
    property string songTitle: ""
    property string songArtist: ""
    property string songAlbum: ""
    property var coverColors: []
    property var customLayerImages: []
    property EchoPluginText textService: null
    property EchoPluginAssets assetsService: null
    property EchoPluginReadModel lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    readonly property var tuning: Kernel.tuning(settings)
    readonly property bool textVisible: settings.showText !== false
    readonly property bool busy: preparation.busy || grace.running
    readonly property int paragraphCount: preparation.paragraphCount
    readonly property int cachedParagraphs: preparation.cachedParagraphs
    readonly property int layoutRevision: preparation.layoutRevision
    readonly property int measurementBatches: preparation.measurementBatches
    readonly property int readBatches: preparation.readBatches
    readonly property int refinementRounds: preparation.refinementRounds
    readonly property var frame: preparation.frame
    readonly property int layerCount: scene.stageCount
    readonly property var renderers: scene.renderers
    readonly property int resourceCount: scene.resourceCount
    readonly property real totalCacheBytes: scene.cacheBytes
    readonly property string errorString: preparation.errorString || scene.errorString
    readonly property var theme: ({
            name: themeName,
            fontStyle: "sans",
            fontFamily: baseFont.family,
            fontFamilyStack: baseFont.families || [],
            fontWeight: typeof settings.fontWeight === 'number' ? settings.fontWeight : null,
            backgroundColor: String(backgroundColor),
            primaryColor: String(primaryColor),
            secondaryColor: String(secondaryColor),
            accentColor: String(accentColor),
            animationIntensity: settings.animationIntensity || 'normal',
            wordColors: settings.wordColors || []
        })
    readonly property var images: customLayerImages.filter(image => tuning.layerImages.some(value => value.id === image.handle)).map(image => ({
                id: image.handle,
                url: String(image.url),
                width: image.width,
                height: image.height
            }))
    property bool _instrumental: false
    property bool _sawPlaybackReset: false
    clip: true
    function beginGrace() {
        _instrumental = false;
        _sawPlaybackReset = timeSeconds <= .5;
        grace.stop();
        if (live && visible && textVisible && lyricCount === 0)
            grace.start();
    }
    onTimeSecondsChanged: {
        if (timeSeconds <= .5)
            _sawPlaybackReset = true;
        if (live && textVisible && lyricCount === 0 && _sawPlaybackReset && timeSeconds >= 2) {
            grace.stop();
            _instrumental = true;
        }
    }
    onTrackRevisionChanged: beginGrace()
    onLyricCountChanged: beginGrace()
    onLiveChanged: beginGrace()
    onVisibleChanged: beginGrace()
    onTextVisibleChanged: beginGrace()
    Component.onCompleted: beginGrace()
    Timer {
        id: grace
        interval: 3000
        onTriggered: root._instrumental = root.lyricCount === 0
    }
    TemperaLayout {
        id: preparation
        lyricSource: root.lyricSource
        previewRows: root.previewRows
        lyricCount: root.lyricCount
        lyricOffsetMs: root.lyricOffsetMs
        trackRevision: root.trackRevision
        textService: root.textService
        timeSeconds: root.timeSeconds
        baseFont: root.baseFont
        viewportWidth: root.width
        viewportHeight: root.height
        live: root.live && root.visible
        geometry: ({
                theme: root.theme,
                tuning: root.tuning,
                lyricsFontScale: typeof root.settings.lyricsFontScale === 'number' ? root.settings.lyricsFontScale : 1,
                staticMode: !root.motionEnabled,
                coverColors: root.coverColors,
                images: root.images,
                metadata: {
                    title: root.songTitle,
                    artist: root.songArtist,
                    album: root.songAlbum
                },
                hideLyrics: !root.textVisible,
                seed: root.seed,
                instrumental: root._instrumental,
                waitForLyrics: root.lyricCount === 0 && !root._instrumental
            })
    }
    TemperaScene {
        id: scene
        anchors.fill: parent
        frame: root.frame
        baseFont: root.baseFont
        assetsService: root.assetsService
        live: root.live && root.visible
    }
}
