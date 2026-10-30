// The skin owns presentation only. Every command and persistent setting stays scoped by the host.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import EchoMusic.PluginSdk
import EchoMusic.Theme
import EchoMusic.Controls
import "shared"
import "shared/harmony"
import "shared/typography.mjs" as Typography
import "backgrounds/latent"
import "backgrounds"

Item {
    id: root
    objectName: "foliaPlaybackPage"
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property AppearanceConfiguration configuration
    readonly property var settings: configuration.values
    readonly property var appearance: plugin.appearance.snapshot
    readonly property string revision: page.player.revision
    readonly property var modes: plugin.ui.state.styles || []
    function fontFor(translation: bool): font {
        return plugin.fonts.build(Typography.availableFamilies(Typography.resolveFamilies(settings, translation), plugin.fonts.families));
    }
    readonly property font lyricBaseFont: fontFor(false)
    readonly property font subtitleBaseFont: fontFor(true)
    readonly property font harmonyBaseFont: settings.subtitleFontInheritsLyrics !== false ? lyricBaseFont : plugin.fonts.build(Typography.availableFamilies(Typography.resolveFamilies(Object.assign({}, settings, {
        fontStyle: settings.subtitleFontStyle,
        fontFamilies: settings.subtitleFontFamilies
    }), false), plugin.fonts.families))
    readonly property var selectedMode: modes.find(mode => mode.id === settings.mode)
    readonly property bool nativeGraphicsAvailable: GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null && GraphicsInfo.api !== GraphicsInfo.Software
    readonly property bool dynamicMode: settings.mode !== "still"
    readonly property DynamicPresentation dynamicPresentation: dynamicHost.item as DynamicPresentation
    readonly property BackgroundPresentation backgroundPresentation: backgroundHost.item as BackgroundPresentation
    function hasStyle(mode: string): bool {
        return settings.mode === mode || !!dynamicPresentation && dynamicPresentation.stage.actors.some(actor => actor.modeKey === mode);
    }
    readonly property bool hasDynamicActors: !!dynamicPresentation && dynamicPresentation.hasDynamicActors
    readonly property bool presentationActive: page.active && visible && Window.window !== null && Window.window.visible && Window.window.visibility !== Window.Minimized
    readonly property int positioningRequest: Number(plugin.ui.state.foliaBottomBarPositioningRequest || 0)
    property bool timelineOpen: false
    property string commandError: ""
    property bool _completed: false
    readonly property string presentationError: page.player.lyricsInfo.errorMessage || (dynamicPresentation ? dynamicPresentation.errorString : "") || (backgroundPresentation ? backgroundPresentation.errorString : "") || harmonyTimeline.errorString || harmonyOverlay.errorString
    clip: true

    function showError(message: string): void {
        if (!presentationActive)
            return;
        commandError = message;
        errorTimeout.restart();
    }
    function watchOperation(operation: var): void {
        if (operation)
            operationWatcher.createObject(root, {
                operation: operation
            });
    }
    function consumePositioningRequest(): void {
        const state = plugin.ui.state;
        if (!presentationActive || positioningRequest <= Number(state.foliaBottomBarPositioningHandled || 0))
            return;
        plugin.ui.setState(Object.assign({}, state, {
            foliaBottomBarPositioningHandled: positioningRequest
        }));
        timelineOpen = false;
        if (!capsule.startPositioning())
            showError(qsTr("当前没有可定位的播放胶囊"));
    }
    function schedulePositioning(): void {
        if (_completed)
            positioningDeferred.restart();
    }
    onPositioningRequestChanged: schedulePositioning()
    onPresentationActiveChanged: if (!presentationActive)
        timelineOpen = false
    else
        schedulePositioning()
    Component {
        id: operationWatcher
        QtObject {
            id: watcher
            property var operation
            property bool handled: false
            property Timer deferred: Timer {
                interval: 0
                onTriggered: watcher.finish()
            }
            function finish(): void {
                if (handled)
                    return;
                handled = true;
                if (operation.state === EchoPluginOperation.Failed)
                    root.showError(operation.errorMessage || qsTr("操作未完成"));
                watcher.destroy();
            }
            property Connections observer: Connections {
                target: watcher.operation
                function onCompleted(): void {
                    watcher.finish();
                }
            }
            Component.onCompleted: if (operation.state >= EchoPluginOperation.Succeeded)
                deferred.start()
            Component.onDestruction: deferred.stop()
        }
    }
    Timer {
        id: positioningDeferred
        interval: 0
        onTriggered: root.consumePositioningRequest()
    }
    Timer {
        id: errorTimeout
        interval: 8000
        onTriggered: root.commandError = ""
    }

    ChromeVisibility {
        id: chrome
        objectName: "foliaChromeVisibility"
        active: root.presentationActive && !capsule.positioning && !capsule.modalOpen && !root.timelineOpen
        mode: root.settings.playerChromeVisibilityMode
    }
    HoverHandler {
        objectName: "foliaChromeHover"
        property point lastPosition: Qt.point(-1, -1)
        onPointChanged: {
            if (!hovered)
                return;
            // Qt refreshes hover points after scene changes as well as actual
            // input. Rebuilding chrome must not reveal it again at a still cursor.
            const moved = point.position.x !== lastPosition.x || point.position.y !== lastPosition.y;
            lastPosition = point.position;
            if (moved || (chrome.pointerHeld && point.pressedButtons === Qt.NoButton))
                chrome.pointerMoved(point.pressedButtons);
        }
        onHoveredChanged: if (hovered)
            chrome.activity()
        else
            chrome.pointerLeft()
    }
    PointHandler {
        acceptedButtons: Qt.AllButtons
        onActiveChanged: if (active)
            chrome.pointerPressed()
        else
            chrome.pointerReleased()
    }
    WheelHandler {
        target: null
        onWheel: event => {
            chrome.activity();
            event.accepted = false;
        }
    }
    Connections {
        target: root.Window.window
        function onActiveChanged(): void {
            if (!root.Window.window.active)
                chrome.windowBlurred();
        }
    }

    Component.onCompleted: {
        _completed = true;
        schedulePositioning();
    }
    Component.onDestruction: {
        _completed = false;
        positioningDeferred.stop();
    }

    Rectangle {
        anchors.fill: parent
        color: root.appearance.main
    }
    VisualizerSurface {
        id: visualizerSurface
        anchors.fill: parent
        opacity: root.settings.visualizerOpacity
        visible: root.presentationActive
    }
    AssetCollection {
        id: fontAssets
        plugin: root.plugin
        collection: "folia.fonts"
        fonts: true
        live: root.presentationActive
    }
    AssetCollection {
        id: avatarAssets
        plugin: root.plugin
        collection: "cappella.avatars"
        live: root.presentationActive && root.hasStyle("cappella")
    }
    AssetCollection {
        id: emojiAssets
        plugin: root.plugin
        collection: "cappella.emojis"
        live: root.presentationActive && root.hasStyle("cappella")
    }
    AssetCollection {
        id: portraitAssets
        plugin: root.plugin
        collection: "monet.portraits"
        live: root.presentationActive && root.hasStyle("monet")
    }
    AssetCollection {
        id: layerAssets
        plugin: root.plugin
        collection: "tempera.images"
        live: root.presentationActive && root.hasStyle("tempera")
    }
    AssetCollection {
        id: backgroundAssets
        plugin: root.plugin
        collection: "background.global"
        live: root.presentationActive && root.dynamicMode && ["monet", "nomand"].indexOf(root.settings.backgroundMode) >= 0
    }
    CoverPalette {
        id: coverPalette
        plugin: root.plugin
        source: root.dynamicPresentation ? root.dynamicPresentation.shownCoverUrl : root.page.player.coverUrl
        trackRevision: root.revision
        live: root.presentationActive && (root.dynamicMode || root.hasDynamicActors) && root.nativeGraphicsAvailable && (root.settings.backgroundMode === "latent" || root.hasStyle("tempera"))
    }
    AudioBands {
        id: audio
        objectName: "foliaAudioBands"
        plugin: root.plugin
        live: root.presentationActive && (root.dynamicMode || root.hasDynamicActors) && root.nativeGraphicsAvailable
        paused: !root.page.player.playing
    }
    Loader {
        id: backgroundHost
        parent: visualizerSurface
        z: 0
        objectName: "foliaBackgroundHost"
        anchors.fill: parent
        active: root.presentationActive && root.nativeGraphicsAvailable
        sourceComponent: BackgroundPresentation {
            songHandoff: root.dynamicPresentation ? root.dynamicPresentation.songHandoff : null
            styleWaits: root.dynamicPresentation ? root.dynamicPresentation.transitionWaits : false
            settings: root.settings
            assetsService: root.plugin.assets
            graphics: root.plugin.graphics
            customBackgroundImages: backgroundAssets.assets
            coverUrl: root.dynamicPresentation ? root.dynamicPresentation.shownCoverUrl : root.page.player.coverUrl
            seed: root.dynamicPresentation ? root.dynamicPresentation.backgroundSeed : root.page.snapshot.track ? root.page.snapshot.track.id + ":" + root.page.snapshot.track.hash : root.revision
            coverColors: root.dynamicPresentation ? root.dynamicPresentation.backgroundCoverColors : coverPalette.colors
            bands: audio.bands
            backgroundColor: root.dynamicPresentation && root.dynamicPresentation.backgroundAppearance.main || root.appearance.main
            primaryColor: root.dynamicPresentation && root.dynamicPresentation.backgroundAppearance.text || root.appearance.text
            secondaryColor: root.dynamicPresentation && root.dynamicPresentation.backgroundAppearance.secondaryText || root.appearance.secondaryText
            accentColor: root.dynamicPresentation && root.dynamicPresentation.backgroundAppearance.accent || root.appearance.accent
            dark: root.dynamicPresentation && root.dynamicPresentation.backgroundAppearance.dark !== undefined ? root.dynamicPresentation.backgroundAppearance.dark : root.appearance.dark
            paused: !root.page.player.playing
            motionEnabled: root.appearance.motionEnabled !== false && root.nativeGraphicsAvailable
        }
    }
    Loader {
        id: dynamicHost
        parent: visualizerSurface
        z: 1
        objectName: "foliaDynamicPresentationHost"
        anchors.fill: parent
        active: root.presentationActive && (!root.dynamicMode || root.nativeGraphicsAvailable)
        sourceComponent: DynamicPresentation {
            plugin: root.plugin
            page: root.page
            settings: root.settings
            appearance: root.appearance
            baseFont: root.lyricBaseFont
            subtitleFont: root.subtitleBaseFont
            componentPath: root.selectedMode ? root.selectedMode.component : ""
            backdropSources: backgroundHost.item ? [backgroundHost.item] : []
            bottomOffset: capsule.liveBottomOffset
            chromeHidden: chrome.hidden
            motionEnabled: root.appearance.motionEnabled !== false && root.nativeGraphicsAvailable
            bands: audio.bands
            customAvatarImages: avatarAssets.assets
            customEmojiImages: emojiAssets.assets
            customPortraitImages: root.settings.monetPortraitAsset ? portraitAssets.assets.filter(asset => asset.handle === root.settings.monetPortraitAsset) : portraitAssets.assets.slice(0, 1)
            customLayerImages: layerAssets.assets
            coverColors: coverPalette.colors
            coverPaletteSnapshot: coverPalette.snapshot
            spectrumBins: audio.spectrumBins
            inlineSubtitles: root.selectedMode ? root.selectedMode.inlineSubtitles === true : false
            harmonyActive: harmonyOverlay.activeCount > 0
            onSettingsPatchRequested: patch => {
                if (!root.configuration.patch(patch))
                    root.showError(root.configuration.errorMessage);
            }
            onOperationIssued: operation => root.watchOperation(operation)
            onCommandRejected: (action, reason) => root.showError(reason)
        }
    }
    HarmonyIndex {
        id: harmonyTimeline
        page: root.page
        transitionTrack: root.dynamicPresentation ? root.dynamicPresentation.heldOutgoingTrack : null
        live: root.presentationActive && root.nativeGraphicsAvailable && root.settings.showText !== false && root.settings.showHarmonySubtitle !== false
        timeSeconds: root.dynamicPresentation ? root.dynamicPresentation.heldOutgoingTimeSeconds : 0
    }
    HarmonyOverlay {
        id: harmonyOverlay
        objectName: "foliaHarmonyOverlay"
        anchors.fill: parent
        vocalIndex: harmonyTimeline.index
        timeSeconds: harmonyTimeline.timeSeconds
        settings: root.settings
        baseFont: root.harmonyBaseFont
        translationFont: root.subtitleBaseFont
        textService: root.plugin.text
        accentColor: root.dynamicPresentation && root.dynamicPresentation.outgoingAppearance.accent || root.appearance.accent
        secondaryColor: root.dynamicPresentation && root.dynamicPresentation.outgoingAppearance.secondaryText || root.appearance.secondaryText
        backgroundColor: root.dynamicPresentation && root.dynamicPresentation.outgoingAppearance.main || root.appearance.main
        live: root.presentationActive && root.nativeGraphicsAvailable
        motionEnabled: root.appearance.motionEnabled !== false
    }
    // Wake the existing projection at the next source boundary in Still. This
    // timer never supplies playback time and never runs a second frame clock.
    Timer {
        interval: Math.max(1, Math.min(2147483000, Math.ceil((harmonyTimeline.nextStart - harmonyTimeline.timeSeconds) * 1000 / root.page.player.speed)))
        running: root.presentationActive && root.page.player.playing && harmonyOverlay.activeCount === 0 && Number.isFinite(harmonyTimeline.nextStart)
        onTriggered: if (root.dynamicPresentation)
            root.dynamicPresentation.refreshClock()
    }
    Label {
        objectName: "foliaRenderError"
        anchors.centerIn: parent
        width: Math.min(root.width - 64, 640)
        text: root.dynamicMode && !root.nativeGraphicsAvailable ? qsTr("当前图形后端无法绘制 Folia 动态歌词，请在右上角选择“静止”或启用硬件图形后端。") : root.presentationError
        visible: text.length > 0
        textFormat: Text.PlainText
        wrapMode: Text.Wrap
        color: root.appearance.text
        font: root.plugin.fonts.build([], 14, 500)
    }
    EchoSelect {
        id: stylePicker
        objectName: "foliaStylePicker"
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.rightMargin: 52
        anchors.topMargin: 56
        width: Math.min(180, root.width - 80)
        options: [
            {
                label: qsTr("随机"),
                value: "random"
            }
        ].concat(root.modes.map(mode => ({
                    label: mode.title,
                    value: mode.id
                })))
        value: root.settings.randomVisualizerModePerSong ? "random" : root.settings.mode
        placeholder: qsTr("Folia 样式")
        Accessible.name: qsTr("Folia 歌词样式")
        enabled: root.configuration.active
        onValueEdited: nextValue => root.configuration.patch(nextValue === "random" ? {
                randomVisualizerModePerSong: true
            } : {
                mode: nextValue,
                randomVisualizerModePerSong: false
            })
    }
    PlayerCapsule {
        id: capsule
        objectName: "foliaSharedCapsule"
        anchors.fill: parent
        page: root.page
        settings: root.settings
        appearance: root.appearance
        baseFont: root.plugin.fonts.build([], 14, 500)
        chromeHidden: chrome.hidden && !positioning
        canShowTimeline: true
        onPatchRequested: patch => {
            if (!root.configuration.patch(patch))
                root.showError(root.configuration.errorMessage || qsTr("未能保存胶囊位置"));
        }
        onTimelineRequested: root.timelineOpen = true
        onOperationIssued: operation => root.watchOperation(operation)
        onCommandRejected: (action, reason) => root.showError(reason)
    }
    Loader {
        objectName: "foliaTimelineHost"
        anchors.fill: parent
        z: 100
        active: root.timelineOpen && root.presentationActive
        sourceComponent: PlayerCapsuleTimeline {
            page: root.page
            appearance: root.appearance
            baseFont: root.plugin.fonts.build([], 14, 500)
            onCloseRequested: root.timelineOpen = false
            onOperationIssued: operation => root.watchOperation(operation)
            onCommandRejected: (action, reason) => root.showError(reason)
        }
    }
    Label {
        objectName: "foliaCommandError"
        z: 200
        anchors.top: parent.top
        anchors.topMargin: 104
        anchors.horizontalCenter: parent.horizontalCenter
        width: Math.min(480, root.width - 48)
        padding: 12
        text: root.commandError
        textFormat: Text.PlainText
        wrapMode: Text.Wrap
        visible: text.length > 0
        color: Theme.floating.dangerText
        font: root.plugin.fonts.build([], 13, 500)
        background: Rectangle {
            color: Theme.floatingCard
            radius: 8
            border.color: Theme.floating.dangerText
        }
    }
}
