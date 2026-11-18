// Folia Monet poster: fixed-track contextual lyrics, source word sweep, portrait and spectrum.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Shapes
import EchoMusic.PluginSdk
import "kernel.mjs" as Kernel
import "audio.mjs" as Audio
import "icons.mjs" as Icons
import "../../shared"

Item {
    id: root

    property string _budgetError: ""
    property var _catalog: null
    property bool _completed: false
    property real _dragOffset: 0
    property bool _editing: false
    property var _entries: []
    property bool _initial: true
    property real _lastTime: 0
    property var _manual: null
    property var _metadata: []
    property var _required: []
    property var _rows: []
    property var _savedOffset: null
    property var _selection: ({
            anchor: -1,
            entries: [],
            required: [],
            count: 0
        })
    property string _selectionKey: ""
    property real _touch: 0
    property real _touchDirection: 0
    property real _wheel: 0
    property real _wheelDirection: 0
    property color accentColor: primaryColor
    property EchoPluginAssets assetsService: null
    property var audioBands: ({
            bass: 0,
            lowMid: 0,
            mid: 0,
            vocal: 0,
            treble: 0
        })
    property real audioPower: 0
    property string avatarSeed: songTitle
    property var backdropSources: []
    readonly property real backdropTextureBytes: descriptionBackdrop.plannedBytes + resetBackdrop.plannedBytes + portraitFrame.backdropTextureBytes
    property color backgroundColor: "#111111"
    property font baseFont
    readonly property real contentHeight: headerHeight + geometry.railHeight + descriptionHeight
    readonly property real contentY: (height - contentHeight) / 2
    property url coverUrl
    property int currentIndex: -1
    property var customPortraitImages: []
    property bool dark: true
    readonly property real descriptionHeight: tuning.showDescription ? 56 : 0
    readonly property string errorString: _budgetError || (themeDecor.status === Loader.Error ? "Monet theme icon component failed to load" : "") || layout.errorString || portraitFrame.errorString || descriptionBackdrop.errorString || resetBackdrop.errorString || _rows.map(row => row.errorString).filter(Boolean).join("; ")
    property bool exiting: false
    property var spectrumBins: []
    readonly property var geometry: Kernel.composition(width, height, settings)
    readonly property real headerHeight: geometry.artistFontPx * 1.2 + 6 + 56 + 12 + titleHeight + 16 + 24
    property int introRevision: 0
    property var lineMetadata: []
    property bool live: true
    property bool motionEnabled: true
    readonly property int mountedLineCount: _rows.length
    property bool paused: false
    readonly property string portraitError: portraitFrame.errorString
    readonly property int portraitLayerCount: portraitFrame.layerCount
    readonly property real portraitOffsetX: _editing ? _dragOffset : _savedOffset === null ? tuning.portraitOffsetX : _savedOffset
    required property var preparedLines
    property color primaryColor: "white"
    readonly property var railRect: ({
            x: leftColumn.x - geometry.glow,
            y: leftColumn.y + headerHeight,
            width: geometry.railWidth,
            height: geometry.railHeight
        })
    readonly property bool renderReady: !layout.busy && layout.revision > 0 && _rows.length > 0 && !errorString
    readonly property var renderers: {
        let result = [];
        for (const row of _rows)
            result = result.concat(row.renderers);
        return result;
    }
    readonly property string requiredSourceIndicesKey: _required.join(",")
    property color secondaryColor: "#999999"
    property var settings: ({})
    property string songAlbum: ""
    property string songArtist: ""
    property string songTitle: ""
    property var songHandoff: null
    property font subtitleFont: baseFont
    property EchoPluginText textService: null
    property string themeDescription: ""
    property string themeDisplayName: ""
    property var lyricsIcons: []
    property real timeSeconds: 0
    readonly property real titleHeight: titleText.implicitHeight
    readonly property int tokenCount: _rows.reduce((sum, row) => sum + row.tokenCount, 0)
    readonly property int totalCacheBytes: _rows.reduce((sum, row) => sum + row.cacheBytes, 0) + backdropTextureBytes
    readonly property var tuning: Kernel.settings(settings)
    property real uiSeconds: 0

    signal exitFinished
    signal seekRequested(real seconds)
    signal settingsPatchRequested(var patch)

    function beginPortraitEdit(): void {
        _dragOffset = tuning.portraitOffsetX;
        _editing = true;
    }
    function checkBudget(): void {
        if (totalCacheBytes > 128 * 1024 * 1024) {
            _budgetError = "Monet visible native cache exceeds 128MiB";
            releaseRows();
        }
    }
    function clear(): void {
        manualReset.stop();
        _required = [];
        _entries = [];
        _selectionKey = "";
        releaseRows();
        _initial = true;
        _editing = false;
    }
    function manualStep(steps: int): void {
        if (!_selection.count)
            return;
        const base = _manual === null ? _selection.anchor : _manual;
        _manual = Kernel.clamp(base + steps, 0, _selection.count - 1);
        manualReset.restart();
        select();
    }
    function movePortrait(offset: real): void {
        if (_editing)
            _dragOffset = Kernel.clamp(offset, -150, 0);
    }
    function rebuildMetadata(): void {
        _metadata = JSON.parse(JSON.stringify(Array.from(lineMetadata || [])));
        _catalog = Kernel.metadataIndex(_metadata);
        _manual = null;
        select();
    }
    function releaseRows(): void {
        const previous = _rows;
        _rows = [];
        for (const row of previous)
            row.destroy();
    }
    function remove(row: var): void {
        _rows = _rows.filter(value => value !== row);
        row.destroy();
    }
    function resetPortrait(): void {
        _dragOffset = 0;
        _savedOffset = 0;
        settingsPatchRequested({
            monetPortraitOffsetX: 0
        });
    }
    function restartIntro(): void {
        ++introRevision;
    }
    function savePortraitEdit(): void {
        if (!_editing)
            return;
        const offset = Math.round(_dragOffset);
        _savedOffset = offset;
        settingsPatchRequested({
            monetPortraitOffsetX: offset
        });
        _editing = false;
    }
    function select(): void {
        if (!_completed)
            return;
        if (!live || !visible || !tuning.showText || exiting) {
            clear();
            return;
        }
        const selected = Kernel.select(_metadata, preparedLines, currentIndex, timeSeconds, _manual, _catalog);
        _selection = selected;
        _required = selected.required;
        const key = JSON.stringify(selected.entries);
        if (key !== _selectionKey) {
            _budgetError = "";
            _selectionKey = key;
            _entries = JSON.parse(key);
        }
    }
    function syncRows(): void {
        if (!live || !visible || !tuning.showText || exiting)
            return;
        const result = layout.result, keep = [];
        for (const entry of result) {
            let row = _rows.find(value => value.entry.key === entry.key && !value.retiring);
            if (!row)
                row = rowComponent.createObject(rail, {
                    entry,
                    initial: _initial
                });
            else
                row.entry = entry;
            if (row)
                keep.push(row);
        }
        for (const row of _rows)
            if (keep.indexOf(row) < 0) {
                if (motionEnabled && !row.retiring) {
                    row.beginExit();
                    keep.push(row);
                } else if (row.retiring)
                    keep.push(row);
                else
                    row.destroy();
            }
        while (keep.length > 18) {
            const index = keep.findIndex(row => row.retiring);
            if (index < 0)
                break;
            keep[index].destroy();
            keep.splice(index, 1);
        }
        _rows = keep;
        _initial = false;
        checkBudget();
    }
    function touchDelta(delta: real): void {
        const direction = delta === 0 ? 0 : delta > 0 ? 1 : -1;
        if (direction && _touchDirection && direction !== _touchDirection)
            _touch = 0;
        _touchDirection = direction || _touchDirection;
        _touch += delta;
        const steps = Kernel.clamp(Math.trunc(_touch / 52), -1, 1);
        if (steps) {
            _touch = 0;
            manualStep(steps);
        } else
            manualReset.restart();
    }
    function wheelDelta(delta: real): void {
        const direction = delta === 0 ? 0 : delta > 0 ? 1 : -1;
        if (direction && _wheelDirection && direction !== _wheelDirection)
            _wheel = 0;
        _wheelDirection = direction || _wheelDirection;
        _wheel += delta;
        const steps = Kernel.clamp(Math.trunc(_wheel / 72), -1, 1);
        if (steps) {
            _wheel = 0;
            manualStep(steps);
        } else
            manualReset.restart();
    }

    clip: true

    Component.onCompleted: {
        _completed = true;
        rebuildMetadata();
        restartIntro();
    }
    Component.onDestruction: clear()
    onAudioBandsChanged: spectrum.requestPaint()
    onAudioPowerChanged: spectrum.requestPaint()
    onAvatarSeedChanged: restartIntro()
    onCurrentIndexChanged: select()
    onExitingChanged: {
        if (exiting) {
            clear();
            exitFinished();
        }
    }
    onSpectrumBinsChanged: spectrum.requestPaint()
    onLineMetadataChanged: rebuildMetadata()
    onLiveChanged: select()
    onPreparedLinesChanged: select()
    onPrimaryColorChanged: spectrum.requestPaint()
    onSettingsChanged: {
        _savedOffset = null;
        _budgetError = "";
        select();
        spectrum.requestPaint();
    }
    onTimeSecondsChanged: {
        if (_lastTime > 2 && timeSeconds < .1)
            restartIntro();
        _lastTime = timeSeconds;
        select();
    }
    onTotalCacheBytesChanged: checkBudget()
    onVisibleChanged: select()

    Timer {
        id: manualReset

        interval: 1800

        onTriggered: {
            root._manual = null;
            root._wheel = 0;
            root._wheelDirection = 0;
            root._touch = 0;
            root._touchDirection = 0;
            root.select();
        }
    }
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled && root.tuning.showText && !root.exiting

        onTriggered: {
            root.uiSeconds += frameTime;
            spectrum.requestPaint();
        }
    }
    MonetLayout {
        id: layout

        baseFont: root.baseFont
        entries: root._entries
        live: root.live && root.visible && root.tuning.showText && !root.exiting
        manual: root._manual !== null
        primaryColor: root.primaryColor
        settings: root.settings
        subtitleFont: root.subtitleFont
        textService: root.textService
        viewportHeight: root.height
        viewportWidth: root.width

        onErrorStringChanged: if (errorString)
            root.releaseRows()
        onRevisionChanged: root.syncRows()
    }
    MonetFont {
        id: headerFace

        base: root.baseFont
    }
    Item {
        id: leftColumn

        height: root.contentHeight
        visible: root.live && root.tuning.showText && !root.exiting
        width: root.geometry.contentWidth
        x: root.geometry.rowX + root.geometry.textPadding
        y: root.contentY

        MonetIntro {
            delay: 150
            duration: 1200
            height: root.geometry.artistFontPx * 1.2
            live: root.live
            motionEnabled: root.motionEnabled
            revision: root.introRevision
            startX: -30
            startY: -10
            width: Math.min(parent.width, root.geometry.headerMaxWidth)

            MonetText {
                anchors.fill: parent
                baseFont: root.baseFont
                color: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .96)
                elide: Text.ElideRight
                pixelSize: Math.round(root.geometry.artistFontPx)
                text: root.songArtist.trim() || "Monet"
                textFormat: Text.PlainText
                textItalic: true
            }
        }
        Rectangle {
            height: 56
            radius: .5
            width: 1
            x: 0
            y: root.geometry.artistFontPx * 1.2 + 6

            gradient: Gradient {
                GradientStop {
                    color: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .72)
                    position: 0
                }
                GradientStop {
                    color: "transparent"
                    position: 1
                }
            }
            transform: Scale {
                xScale: 1
                yScale: lineIntro.progress
            }
        }
        MonetIntro {
            id: lineIntro

            delay: 500
            duration: 1500
            live: root.live
            motionEnabled: root.motionEnabled
            revision: root.introRevision
            visible: false
        }
        MonetIntro {
            delay: 300
            duration: 1300
            height: root.titleHeight + 16 + 24
            live: root.live
            motionEnabled: root.motionEnabled
            revision: root.introRevision
            startX: -40
            width: Math.min(parent.width, root.geometry.headerMaxWidth)
            y: root.geometry.artistFontPx * 1.2 + 6 + 56 + 12

            MonetText {
                id: titleText

                baseFont: root.baseFont
                bottomPadding: root.geometry.titleFontPx * .13
                color: root.primaryColor
                elide: Text.ElideRight
                lineHeight: 1.06
                lineHeightMode: Text.ProportionalHeight
                maximumLineCount: 2
                pixelSize: Math.round(root.geometry.titleFontPx)
                text: root.songTitle || "Monet"
                textFormat: Text.PlainText
                textWeight: 600
                topPadding: root.geometry.titleFontPx * .25
                width: parent.width
                wrapMode: Text.Wrap
            }
            MonetText {
                baseFont: root.baseFont
                color: Qt.rgba(root.secondaryColor.r, root.secondaryColor.g, root.secondaryColor.b, .84)
                elide: Text.ElideRight
                height: 16
                pixelSize: 14
                text: (root.songAlbum.trim() || "Monet").toUpperCase()
                textFormat: Text.PlainText
                width: parent.width
                y: root.titleHeight + 4
            }
        }
        MonetIntro {
            delay: 650
            duration: 1200
            height: root.geometry.railHeight
            live: root.live
            motionEnabled: root.motionEnabled
            revision: root.introRevision
            startY: 20
            width: root.geometry.railWidth
            x: -root.geometry.glow
            y: root.headerHeight

            Item {
                id: rail

                anchors.fill: parent
                clip: true
                layer.enabled: true
                layer.smooth: true

                layer.effect: ShaderEffect {
                    property var source

                    fragmentShader: Qt.resolvedUrl("rail-mask.frag.qsb")
                }
            }
            WheelHandler {
                target: null

                onWheel: event => {
                    root.wheelDelta(event.pixelDelta.y !== 0 ? -event.pixelDelta.y : -event.angleDelta.y);
                    event.accepted = true;
                }
            }
            DragHandler {
                id: railDrag

                property real previous: 0

                target: null
                xAxis.enabled: false

                onActiveChanged: {
                    if (active) {
                        previous = 0;
                        root._manual = root._selection.anchor;
                        manualReset.restart();
                    } else {
                        root._touch = 0;
                        root._touchDirection = 0;
                        manualReset.restart();
                    }
                }
                onTranslationChanged: {
                    if (active) {
                        root.touchDelta(previous - translation.y);
                        previous = translation.y;
                    }
                }
            }
        }
    }
    Loader {
        id: themeDecor
        anchors.fill: parent
        z: -1 // source decorators z5 sit below all poster content z10
        active: root.live && root.visible && root.tuning.showText && !root.exiting && root.lyricsIcons.length > 0
        source: active ? Qt.resolvedUrl("MonetFloatingDecor.qml") : ""
        onLoaded: {
            item.lyricsIcons = Qt.binding(() => root.lyricsIcons);
            item.color = Qt.binding(() => root.secondaryColor);
            item.live = Qt.binding(() => root.live);
            item.motionEnabled = Qt.binding(() => root.motionEnabled);
            item.introRevision = Qt.binding(() => root.introRevision);
        }
    }
    MonetIntro {
        id: descriptionIntro

        delay: 950
        duration: 1000
        height: 32
        live: root.live
        motionEnabled: root.motionEnabled
        revision: root.introRevision
        startScale: .9
        startY: 10
        visible: root.live && root.tuning.showText && root.tuning.showDescription && !root.exiting
        width: Math.min(leftColumn.width, descriptionText.implicitWidth + 62)
        x: leftColumn.x
        y: leftColumn.y + root.headerHeight + root.geometry.railHeight + 16

        Rectangle {
            anchors.fill: parent
            border.color: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .16)
            border.width: 1
            color: Qt.rgba(root.backgroundColor.r, root.backgroundColor.g, root.backgroundColor.b, .18)
            radius: 16

            BackdropBlur {
                id: descriptionBackdrop

                anchors.fill: parent
                baseColor: root.backgroundColor
                corner: 16
                live: root.live && descriptionIntro.visible
                sigma: 12
                sources: root.backdropSources.concat([leftColumn])
                z: -1
            }
        }
        Rectangle {
            anchors.verticalCenter: parent.verticalCenter
            color: root.accentColor
            height: 10
            radius: 5
            width: 10
            x: 16
        }
        MonetText {
            id: descriptionText

            anchors.verticalCenter: parent.verticalCenter
            baseFont: root.baseFont
            color: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .9)
            pixelSize: 12
            text: (root.themeDescription.trim() || root.themeDisplayName.trim() || "Monet").toUpperCase()
            textFormat: Text.PlainText
            x: 38
        }
    }
    MonetIntro {
        id: portraitIntro

        delay: 250
        duration: 1600
        height: root.tuning.portraitStyle === "square" ? width * 1.35135 : width / .74
        live: root.live
        motionEnabled: root.motionEnabled
        startRotation: 1
        startScale: .95
        startX: 50
        visible: root.live && root.tuning.showText && root.geometry.portraitVisible && !root.exiting
        width: root.geometry.portraitInner
        x: root.geometry.rowX + root.geometry.rowWidth - root.geometry.portraitPaddingRight - width
        y: (root.height - height) / 2

        Item {
            id: editBounds

            height: parent.height + 24
            objectName: "monetPortraitBounds"
            visible: root._editing
            width: parent.width - x
            x: root.tuning.portraitStyle === "square" ? -parent.width * .35135 - 150 : -150
            y: -12
            z: 5

            Shape {
                anchors.fill: parent

                ShapePath {
                    dashPattern: [3, 2]
                    fillColor: "transparent"
                    strokeColor: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .24)
                    strokeStyle: ShapePath.DashLine
                    strokeWidth: 2

                    PathSvg {
                        path: "M40 0 H" + (editBounds.width - 40) + " Q" + editBounds.width + " 0 " + editBounds.width + " 40 V" + (editBounds.height - 40) + " Q" + editBounds.width + " " + editBounds.height + " " + (editBounds.width - 40) + " " + editBounds.height + " H40 Q0 " + editBounds.height + " 0 " + (editBounds.height - 40) + " V40 Q0 0 40 0"
                    }
                }
            }
            Rectangle {
                border.color: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .16)
                border.width: 1
                color: Qt.rgba(root.backgroundColor.r, root.backgroundColor.g, root.backgroundColor.b, .86)
                height: 32
                objectName: "monetPortraitReset"
                radius: 16
                width: 32
                x: parent.width - 32
                y: -40

                BackdropBlur {
                    id: resetBackdrop

                    anchors.fill: parent
                    baseColor: root.backgroundColor
                    corner: 16
                    live: root.live && root._editing
                    sigma: 12
                    sources: root.backdropSources.concat([leftColumn, descriptionIntro, portraitFrame])
                    z: -1
                }
                RoundedShadow {
                    anchors.fill: parent
                    z: -2
                    corner: 16
                    sigma: 6
                    offset: Qt.vector2d(0, 4)
                    color: Qt.rgba(0, 0, 0, .12)
                    live: root.live && root._editing
                }
                Item {
                    anchors.centerIn: parent
                    height: 14
                    width: 14

                    Shape {
                        height: 24
                        scale: 14 / 24
                        transformOrigin: Item.TopLeft
                        width: 24

                        ShapePath {
                            capStyle: ShapePath.RoundCap
                            fillColor: "transparent"
                            joinStyle: ShapePath.RoundJoin
                            strokeColor: root.primaryColor
                            strokeWidth: 2

                            PathSvg {
                                path: Icons.rotateCcwPaths.join(" ")
                            }
                        }
                    }
                }
                TapHandler {
                    onTapped: root.resetPortrait()
                }
            }
        }
        Item {
            id: draggedPortrait

            height: parent.height
            width: parent.width * (root.tuning.portraitStyle === "square" ? 1.35135 : 1)
            x: root.portraitOffsetX + (root.tuning.portraitStyle === "square" ? -parent.width * .35135 : 0)

            transform: [
                Translate {
                    x: root.motionEnabled && root.tuning.animationIntensity === "chaotic" ? Kernel.keyframe([0, -9, 0, 9, 0], root.uiSeconds, 9, .2) : 0
                    y: root.motionEnabled && root.tuning.animationIntensity === "chaotic" ? Kernel.keyframe([0, -18, 0, 18, 0], root.uiSeconds, 9, .2) : 0
                },
                Rotation {
                    angle: root.motionEnabled && root.tuning.animationIntensity === "chaotic" ? Kernel.keyframe([0, 1.2, 0, -1.2, 0], root.uiSeconds, 9, .2) : 0
                    origin.x: draggedPortrait.width / 2
                    origin.y: draggedPortrait.height / 2
                }
            ]

            MonetPortraitFrame {
                id: portraitFrame

                accentColor: root.accentColor
                anchors.fill: parent
                assetsService: root.assetsService
                backdropSources: root.backdropSources.concat([leftColumn, descriptionIntro])
                backgroundColor: root.backgroundColor
                live: root.live && root.visible && root.tuning.showText
                motionEnabled: root.motionEnabled
                primaryColor: root.primaryColor
                source: Kernel.sourcePortrait(root.tuning, root.coverUrl, root.customPortraitImages)
                songHandoff: root.songHandoff
                square: root.tuning.portraitStyle === "square"
            }
            Rectangle {
                id: hanger

                border.color: root._editing ? Qt.rgba(root.accentColor.r, root.accentColor.g, root.accentColor.b, Kernel.keyframe([.3, 1, .3], root.uiSeconds, 1.5, 0)) : hover.hovered ? Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, .36) : "transparent"
                border.width: 1.5
                color: Qt.rgba(root.backgroundColor.r, root.backgroundColor.g, root.backgroundColor.b, .86)
                height: 56
                objectName: "monetPortraitHanger"
                radius: 6
                visible: root.tuning.showPortraitDragHanger
                width: 12
                x: parent.width - 32 - 12
                y: -12
                z: 20

                transform: Scale {
                    origin.x: hanger.width / 2
                    origin.y: hanger.height / 2
                    yScale: hangerTap.pressed ? .95 : hover.hovered ? 1.05 : 1

                    Behavior on yScale {
                        NumberAnimation {
                            duration: 200
                        }
                    }
                }

                HoverHandler {
                    id: hover
                }
                RoundedShadow {
                    anchors.fill: parent
                    z: -1
                    corner: 6
                    sigma: 9
                    offset: Qt.vector2d(0, 8)
                    color: Qt.rgba(0, 0, 0, .24)
                    live: root.live
                }
                TapHandler {
                    id: hangerTap

                    onTapped: if (!portraitDrag.active) {
                        if (root._editing)
                            root.savePortraitEdit();
                        else
                            root.beginPortraitEdit();
                    }
                }
                DragHandler {
                    id: portraitDrag

                    property real origin: 0

                    enabled: root._editing
                    target: null
                    yAxis.enabled: false

                    onActiveChanged: if (active)
                        origin = root.portraitOffsetX
                    onTranslationChanged: if (active)
                        root.movePortrait(origin + translation.x)
                }
            }
        }
    }
    MonetIntro {
        delay: 800
        duration: 1200
        height: 40
        live: root.live
        motionEnabled: root.motionEnabled
        revision: root.introRevision
        startY: 15
        visible: root.live && root.tuning.showText && root.tuning.showAudioVisualization && !root.exiting
        width: Math.max(1, Math.min(450, root.width * .55) - 2 * x)
        x: root.width >= 1024 ? 56 : root.width >= 640 ? 32 : 20
        y: root.height - 40

        Canvas {
            id: spectrum

            anchors.fill: parent

            onHeightChanged: requestPaint()
            onPaint: {
                const ctx = getContext("2d"), theme = {
                    primaryColor: String(root.primaryColor)
                };
                if (!root.motionEnabled)
                    Audio.drawStaticBars(ctx, width, height, theme, root.tuning.audioStyle);
                else
                    Audio.drawAudioFrame(ctx, width, height, theme, root.tuning.audioStyle, Math.min(1, Math.max(0, root.audioPower)), [root.audioBands.bass || 0, root.audioBands.lowMid || 0, root.audioBands.mid || 0, root.audioBands.vocal || 0, root.audioBands.treble || 0], Array.from(root.spectrumBins || [], value => value * 255), root.uiSeconds * 1000);
            }
            onWidthChanged: requestPaint()
        }
    }
    Component {
        id: rowComponent

        MonetRow {
            accentColor: root.accentColor
            backgroundColor: root.backgroundColor
            baseFont: root.baseFont
            geometry: root.geometry
            live: root.live && root.visible && root.tuning.showText
            manual: root._manual !== null
            motionEnabled: root.motionEnabled
            primaryColor: root.primaryColor
            subtitleFont: root.subtitleFont
            timeSeconds: root.timeSeconds

            onRetired: root.remove(this)
            onSeekRequested: seconds => {
                root._manual = null;
                root.seekRequested(seconds);
                root.select();
            }
        }
    }
}
