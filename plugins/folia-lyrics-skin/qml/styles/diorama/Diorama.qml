// The pinned 3D corridor, original camera and per-band particle state run in one bounded Worker.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "kernel.mjs" as Kernel

Item {
    id: root
    objectName: 'foliaDiorama'
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color primaryColor: 'white'
    property color secondaryColor: '#999999'
    property color accentColor: primaryColor
    property color backgroundColor: '#111111'
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property string seed: trackRevision
    property string songTitle: ''
    property string songArtist: ''
    property string songAlbum: ''
    property string themeName: dark ? 'dark' : 'light'
    property real audioPower: 0
    property var audioBands: ({})
    property EchoPluginText textService: null
    property EchoPluginReadModel lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ''
    readonly property var tuning: Kernel.tuning(settings)
    readonly property bool textVisible: settings.showText !== false
    readonly property bool busy: layout.busy || grace.running || view.pendingResources > 0
    readonly property bool renderReady: !busy && view.renderReady
    readonly property var frame: layout.frame
    readonly property int layerCount: view.actorCount
    readonly property int resourceCount: view.resourceCount
    readonly property var renderers: view.renderers
    readonly property var memoryBreakdown: view.memoryBreakdown
    readonly property real totalCacheBytes: view.cacheBytes
    readonly property string errorString: layout.errorString || view.errorString
    readonly property int measurementBatches: layout.measurementBatches
    readonly property int readBatches: layout.readBatches
    readonly property int layoutRevision: layout.layoutRevision
    readonly property var theme: ({
            name: themeName,
            fontStyle: settings.fontStyle || 'sans',
            fontFamily: baseFont.family,
            fontFamilyStack: baseFont.families || [],
            fontWeight: settings.fontWeight || null,
            primaryColor: String(primaryColor),
            secondaryColor: String(secondaryColor),
            accentColor: String(accentColor),
            backgroundColor: String(backgroundColor),
            animationIntensity: settings.animationIntensity || 'normal',
            wordColors: settings.wordColors || []
        })
    property bool _instrumental: false
    property bool _sawReset: false
    property real _presentationSeconds: .016
    function gate() {
        _instrumental = false;
        _sawReset = timeSeconds < 1;
        grace.stop();
        if (live && visible && lyricCount === 0)
            grace.start();
    }
    onTrackRevisionChanged: gate()
    onLyricCountChanged: gate()
    onLiveChanged: gate()
    onVisibleChanged: gate()
    onTimeSecondsChanged: {
        if (timeSeconds < 1)
            _sawReset = true;
        if (lyricCount === 0 && _sawReset && timeSeconds >= 2) {
            grace.stop();
            _instrumental = true;
        }
    }
    Component.onCompleted: gate()
    Timer {
        id: grace
        interval: 8000
        onTriggered: root._instrumental = root.lyricCount === 0
    }
    DioramaLayout {
        id: layout
        lyricSource: root.lyricSource
        previewRows: root.previewRows
        lyricCount: root.lyricCount
        lyricOffsetMs: root.lyricOffsetMs
        trackRevision: root.trackRevision
        textService: root.textService
        timeSeconds: root.timeSeconds
        presentationSeconds: root._presentationSeconds
        audio: Object.assign({}, root.audioBands, {
            audioPower: root.audioPower
        })
        baseFont: root.baseFont
        viewportWidth: root.width
        viewportHeight: root.height
        live: root.live && root.visible
        geometry: ({
                theme: root.theme,
                tuning: root.tuning,
                lyricsFontScale: typeof root.settings.lyricsFontScale === 'number' ? root.settings.lyricsFontScale : 1,
                seed: root.seed,
                hideLyrics: !root.textVisible,
                instrumental: root._instrumental,
                waitForLyrics: root.lyricCount === 0 && !root._instrumental,
                resolution: Math.min(2, Screen.devicePixelRatio)
            })
    }
    DioramaView {
        id: view
        anchors.fill: parent
        frame: root.frame
        baseFont: root.baseFont
        live: root.live && root.visible
    }
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled && root.renderReady
        onTriggered: root._presentationSeconds += Math.min(.1, frameTime)
    }
}
