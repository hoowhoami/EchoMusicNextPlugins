// Native adapter for Folia's low-resource Still inside the shared style layers.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../../shared"

Item {
    id: root
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property font subtitleFont: baseFont
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#cccccc"
    property color accentColor: primaryColor
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property EchoPluginReadModel lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property string trackRevision: ""
    property int effectiveIndex: Math.max(0, currentIndex)
    property var lineWindow: [null, null, null]
    readonly property bool renderReady: _completed
    readonly property string errorString: ""
    property bool _completed: false
    objectName: "foliaStill"
    function refresh(): void {
        if (!_completed || !live)
            return;
        if (currentIndex >= 0)
            effectiveIndex = currentIndex;
        else if (effectiveIndex >= lyricCount)
            effectiveIndex = 0;
        lineWindow = [-1, 0, 1].map(offset => {
            const index = effectiveIndex + offset;
            return index >= 0 && index < lyricCount ? (previewRows !== null ? previewRows[index] : lyricSource ? lyricSource.row(index) : null) : null;
        });
    }
    onCurrentIndexChanged: refresh()
    onLyricSourceChanged: refresh()
    onPreviewRowsChanged: refresh()
    onLyricCountChanged: refresh()
    onTrackRevisionChanged: {
        effectiveIndex = Math.max(0, currentIndex);
        refresh();
    }
    onLiveChanged: if (live)
        refresh()
    else
        lineWindow = [null, null, null]
    Component.onCompleted: {
        _completed = true;
        refresh();
    }
    Component.onDestruction: _completed = false
    Connections {
        target: root.lyricSource
        function onModelReset(): void {
            root.refresh();
        }
        function onDataChanged(): void {
            root.refresh();
        }
    }
    FoliaFont {
        id: currentFace
        base: root.baseFont
        pixelSize: 40
        weight: Number.isFinite(root.settings.fontWeight) ? root.settings.fontWeight : 700
        letterSpacing: .8
    }
    FoliaFont {
        id: adjacentFace
        base: root.baseFont
        pixelSize: 30
        weight: Number.isFinite(root.settings.fontWeight) ? root.settings.fontWeight : 600
        letterSpacing: .6
    }
    readonly property var translationWeight: root.settings.subtitleFontInheritsLyrics ? root.settings.fontWeight : root.settings.subtitleFontWeight
    FoliaFont {
        id: currentSubtitleFace
        base: root.subtitleFont
        pixelSize: 24
        weight: Number.isFinite(root.translationWeight) ? root.translationWeight : 500
        letterSpacing: .6
    }
    FoliaFont {
        id: adjacentSubtitleFace
        base: root.subtitleFont
        pixelSize: 20
        weight: Number.isFinite(root.translationWeight) ? root.translationWeight : 400
        letterSpacing: .5
    }
    Still {
        anchors.fill: parent
        lineWindow: root.lineWindow
        showText: root.settings.showText !== false
        hideTranslationSubtitle: root.settings.hideTranslationSubtitle === true
        lyricsFontScale: root.settings.lyricsFontScale || 1
        subtitleFontScale: root.settings.subtitleFontScale || 1
        dark: root.dark
        primaryColor: root.primaryColor
        secondaryColor: root.secondaryColor
        currentFont: currentFace.value
        adjacentFont: adjacentFace.value
        currentSubtitleFont: currentSubtitleFace.value
        adjacentSubtitleFont: adjacentSubtitleFace.value
    }
}
