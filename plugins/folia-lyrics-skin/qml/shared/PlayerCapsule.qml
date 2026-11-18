// Folia FloatingPlayerControls, a8da4437 (AGPL-3.0).
// One shared capsule per playback page; all real commands use its typed scope.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQml.Models
import QtQuick.Shapes
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme
import "queueNeighbors.mjs" as QueueNeighbors

Item {
    id: root
    required property EchoPluginViewContext page
    property var settings: ({})
    property var appearance: ({})
    property font baseFont: Theme.font(14, 500)
    property bool chromeHidden: false
    property bool hideControlBar: false
    property string currentView: "player"
    property bool canShowTimeline: false
    // Extra actions require a connected, real implementation from the page.
    property var externalActions: []
    readonly property var playbackSnapshot: page ? page.snapshot : ({})
    readonly property string revision: page ? page.player.revision : ""
    readonly property string titleKey: _titleKey
    property string _titleKey: ""
    readonly property bool daylight: appearance.dark !== undefined ? !appearance.dark : !Theme.dark
    readonly property bool motionEnabled: appearance.motionEnabled !== false
    readonly property color primaryColor: appearance.text !== undefined ? appearance.text : Theme.floating.text
    readonly property color secondaryColor: appearance.secondaryText !== undefined ? appearance.secondaryText : Theme.floating.secondaryText
    readonly property color mainColor: appearance.main !== undefined ? appearance.main : Theme.main
    readonly property int playMode: playbackSnapshot.playMode !== undefined ? playbackSnapshot.playMode : 0
    readonly property real liveBottomOffset: capsuleState.liveOffset
    readonly property bool positioning: capsuleState.positioning
    readonly property bool expanded: capsuleState.expanded
    readonly property bool controlsEnabled: capsuleState.controlsEnabled
    property string modalAction: ""
    readonly property bool modalOpen: modalAction.length > 0
    property bool initialized: false
    property bool positionerRetained: false
    property var adjacentTracks: ({
            previousTitle: "",
            nextTitle: "",
            canPrevious: false,
            canNext: false
        })
    signal patchRequested(var patch)
    signal timelineRequested
    signal actionRequested(string action)
    signal commandRejected(string action, string reason)
    signal operationIssued(var operation)
    onPositioningChanged: {
        if (positioning) {
            positionerExit.stop();
            positionerRetained = true;
        } else if (positionerRetained && motionEnabled) {
            positionerExit.restart();
        } else {
            positionerRetained = false;
        }
    }
    Timer {
        id: positionerExit
        interval: 220
        onTriggered: root.positionerRetained = false
    }

    function actionSupported(action: string): bool {
        return ["loop", "prev", "next", "like", "queue", "volume"].indexOf(action) >= 0 || (action === "lyrics-timeline" && canShowTimeline) || externalActions.indexOf(action) >= 0;
    }
    function actionEnabled(action: string): bool {
        if (!controlsEnabled || !actionSupported(action))
            return false;
        if (action === "prev")
            return adjacentTracks.canPrevious;
        if (action === "next")
            return adjacentTracks.canNext;
        if (action === "like")
            return !playbackSnapshot.favoriteBusy;
        if (action === "lyrics-timeline")
            return page && page.player.lyricsInfo.count > 0;
        return true;
    }
    function issue(action: string, args: var): void {
        if (!controlsEnabled || !page)
            return;
        const operation = page.command(action, args || {});
        operationIssued(operation);
    }
    function invokeSlot(action: string): void {
        if (!actionEnabled(action)) {
            commandRejected(action, qsTr("此操作当前不可用"));
            return;
        }
        if (action === "loop")
            issue("mode", {
                value: playMode === 0 ? 1 : playMode === 1 ? 3 : 0
            });
        else if (action === "prev")
            issue("previous", {});
        else if (action === "next")
            issue("next", {});
        else if (action === "like")
            issue("favorite", {
                revision: revision
            });
        else if (action === "queue")
            issue("queue", {});
        else if (action === "volume")
            modalAction = action;
        else if (action === "lyrics-timeline")
            timelineRequested();
        else
            actionRequested(action);
    }
    function slotGlyph(action: string): string {
        const glyphs = {
            loop: playMode === 1 ? "repeat-once" : playMode === 3 ? "repeat-off" : "repeat",
            prev: "player-skip-back",
            next: "player-skip-forward",
            like: playbackSnapshot.favorite ? "heart-filled" : "heart",
            "lyrics-timeline": "wave-sine",
            volume: "volume",
            queue: "list"
        };
        return glyphs[action] || "wave-sine";
    }
    function slotLabel(action: string): string {
        const labels = {
            loop: playMode === 0 ? qsTr("列表循环") : playMode === 1 ? qsTr("单曲循环") : qsTr("顺序播放"),
            prev: qsTr("上一首"),
            next: qsTr("下一首"),
            like: qsTr("收藏"),
            "lyrics-timeline": qsTr("歌词时间轴"),
            volume: qsTr("音量"),
            queue: qsTr("播放队列")
        };
        const label = labels[action] || action;
        return actionSupported(action) ? label : label + qsTr("（当前不可用）");
    }
    function startPositioning(): bool {
        modalAction = "";
        const started = capsuleState.startPositioning();
        if (started && positionerHost.item)
            positionerHost.item.forceActiveFocus();
        return started;
    }
    function commitPositioning(): void {
        if (!positioning)
            return;
        const committed = capsuleState.commitPositioning();
        patchRequested({
            playerBottomBarOffset: committed
        });
    }
    function cancelPositioning(): void {
        capsuleState.cancelPositioning();
    }
    function refreshNavigation(): void {
        if (!initialized)
            return;
        if (!page || !page.active) {
            adjacentTracks = {
                previousTitle: "",
                nextTitle: "",
                canPrevious: false,
                canNext: false
            };
            return;
        }
        const count = queueProjection.count;
        let current = -1;
        for (let i = 0; i < count; ++i) {
            const row = page.player.queue.row(i);
            if (row.isCurrent) {
                current = i;
                break;
            }
        }
        const identity = current >= 0 ? String(page.player.queue.row(current).resourceId || "") : "";
        if (identity)
            _titleKey = identity;
        // A transient absent snapshot must not manufacture an empty new song.
        const fm = playbackSnapshot.personalFm === true;
        const mode = fm ? "off" : playMode === 0 ? "all" : playMode === 1 ? "one" : "off";
        const previous = QueueNeighbors.prevQueueIndex(count, current, mode);
        const next = QueueNeighbors.nextQueueIndex(count, current, mode);
        const shuffle = playMode === 2 && !fm;
        const fmWillFetch = fm && current >= 0 && current >= count - 1;
        adjacentTracks = {
            previousTitle: !shuffle && previous >= 0 ? String(page.player.queue.row(previous).title || "") : "",
            nextTitle: !shuffle && !fmWillFetch && next >= 0 ? String(page.player.queue.row(next).title || "") : "",
            canPrevious: current >= 0 && page.player.hasTrack && (previous >= 0 || shuffle && count > 1),
            canNext: current >= 0 && page.player.hasTrack && (next >= 0 || fmWillFetch || shuffle)
        };
    }
    onRevisionChanged: refreshNavigation()
    onPlayModeChanged: refreshNavigation()
    onPageChanged: refreshNavigation()
    Component.onCompleted: {
        initialized = true;
        refreshNavigation();
    }
    Component.onDestruction: capsuleState.cancelPositioning()
    DelegateModel {
        id: queueProjection
        model: root.page ? root.page.player.queue : null
        // Qt 6.12 reports zero items without a delegate. No view requests
        // these delegates; navigation only consumes the native row count.
        delegate: Item {}
        onCountChanged: root.refreshNavigation()
    }
    Connections {
        target: root.page ? root.page.player.queue : null
        function onDataChanged(): void {
            root.refreshNavigation();
        }
        function onModelReset(): void {
            root.refreshNavigation();
        }
        function onRowsMoved(): void {
            root.refreshNavigation();
        }
    }
    Connections {
        target: root.page
        function onChanged(): void {
            if (!root.page.active)
                root.stateUnavailable();
        }
    }
    function stateUnavailable(): void {
        modalAction = "";
        capsuleState.cancelPositioning();
    }
    onVisibleChanged: if (!visible)
        stateUnavailable()
    Loader {
        objectName: "foliaCapsulePanelHost"
        anchors.fill: parent
        z: 100
        active: root.modalOpen && capsuleState.available
        sourceComponent: PlayerCapsulePanel {
            page: root.page
            appearance: root.appearance
            baseFont: root.baseFont
            onCloseRequested: root.modalAction = ""
            onOperationIssued: operation => root.operationIssued(operation)
        }
    }
    Connections {
        target: capsuleState
        function onAvailableChanged(): void {
            if (!capsuleState.available)
                root.stateUnavailable();
        }
    }
    PlayerCapsuleState {
        id: capsuleState
        active: root.page !== null && root.page.active && root.visible && root.Window.window !== null && root.Window.window.visible && root.Window.window.visibility !== Window.Minimized
        hasTrack: root.page !== null && root.page.player.hasTrack
        playing: root.page !== null && root.page.player.playing
        durationMs: (root.page ? root.page.player.durationMs : 0)
        currentView: root.currentView
        hideControlBar: root.hideControlBar
        chromeHidden: root.chromeHidden
        viewportWidth: root.width
        viewportHeight: root.height
        savedOffset: root.settings.playerBottomBarOffset !== undefined ? root.settings.playerBottomBarOffset : 32
    }
    FoliaFont {
        id: titleFont
        base: root.baseFont
        pixelSize: 14
        weight: 700
    }
    FoliaFont {
        id: timeFont
        base: root.baseFont
        pixelSize: 10
        weight: 500
    }
    Loader {
        id: transportHost
        objectName: "foliaCapsuleHost"
        anchors.fill: parent
        active: capsuleState.available && (!root.chromeHidden || opacity > 0)
        enabled: !root.chromeHidden
        opacity: root.chromeHidden ? 0 : 1
        Behavior on opacity {
            NumberAnimation {
                duration: root.motionEnabled ? 260 : 0
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0, 0, 0.58, 1, 1, 1]
            }
        }
        sourceComponent: Item {
            id: transport
            PlayerCapsuleSpring {
                id: capsuleWidth
                targetValue: root.expanded ? capsuleState.expandedWidth : capsuleState.collapsedWidth
                enabled: root.motionEnabled && capsuleState.active
            }
            PlayerCapsuleSpring {
                id: capsuleHeight
                targetValue: root.expanded ? capsuleState.wideLayout ? 72 : 127 : 48
                enabled: root.motionEnabled && capsuleState.active
            }
            Item {
                id: hoverHitbox
                anchors.horizontalCenter: parent.horizontalCenter
                y: parent.height - capsuleState.liveOffset - capsuleHeight.value
                width: capsuleState.expandedWidth
                height: capsuleHeight.value + capsuleState.hoverBuffer
                scale: root.chromeHidden ? 0.97 : 1
                transform: Translate {
                    y: root.chromeHidden ? 24 : 0
                    Behavior on y {
                        NumberAnimation {
                            duration: root.motionEnabled ? 260 : 0
                            easing.type: Easing.BezierSpline
                            easing.bezierCurve: [0, 0, 0.58, 1, 1, 1]
                        }
                    }
                }
                Behavior on scale {
                    NumberAnimation {
                        duration: root.motionEnabled ? 260 : 0
                        easing.type: Easing.BezierSpline
                        easing.bezierCurve: [0, 0, 0.58, 1, 1, 1]
                    }
                }
                HoverHandler {
                    onHoveredChanged: if (hovered)
                        capsuleState.pointerEntered()
                    else
                        capsuleState.pointerLeft()
                }
                EchoFloatingSurface {
                    id: capsule
                    objectName: "foliaPlayerCapsule"
                    anchors.horizontalCenter: parent.horizontalCenter
                    width: Math.max(0, capsuleWidth.value)
                    height: Math.max(0, capsuleHeight.value)
                    radius: height / 2
                    color: root.daylight ? Qt.rgba(1, 1, 1, root.expanded ? 0.6 : 0.4) : Qt.rgba(0, 0, 0, root.expanded ? 0.4 : 0.2)
                    border.color: root.daylight ? Qt.rgba(1, 1, 1, 0.2) : Qt.rgba(1, 1, 1, 0.05)
                    border.width: 1
                    Behavior on color {
                        ColorAnimation {
                            duration: root.motionEnabled ? 300 : 0
                        }
                    }
                    TapHandler {
                        enabled: capsuleState.controlsEnabled
                        gesturePolicy: TapHandler.ReleaseWithinBounds
                        onTapped: if (root.currentView !== "player")
                            root.issue("playback", {})
                    }
                    MouseArea {
                        anchors.fill: parent
                        enabled: root.positioning
                        z: 20
                        cursorShape: pressed ? Qt.ClosedHandCursor : Qt.OpenHandCursor
                        onPressed: mouse => capsuleState.dragStarted(mapToItem(root, mouse.x, mouse.y).y)
                        onPositionChanged: mouse => capsuleState.dragMoved(mapToItem(root, mouse.x, mouse.y).y)
                        onReleased: capsuleState.dragEnded()
                        onCanceled: capsuleState.dragEnded()
                    }
                    Item {
                        anchors.fill: parent
                        clip: true
                        Item {
                            id: expandedContent
                            anchors.fill: parent
                            anchors.margins: 12
                            visible: root.expanded
                            enabled: capsuleState.controlsEnabled
                            PlayerCapsuleTitle {
                                id: title
                                objectName: "foliaCapsuleTitle"
                                x: capsuleState.wideLayout ? 72 : 8
                                y: 0
                                width: Math.max(0, parent.width - (capsuleState.wideLayout ? 72 + 96 : 16))
                                height: 24
                                title: (root.page ? root.page.player.title : "")
                                trackKey: root.titleKey
                                previousTitle: root.adjacentTracks.previousTitle
                                nextTitle: root.adjacentTracks.nextTitle
                                canPrevious: root.adjacentTracks.canPrevious
                                canNext: root.adjacentTracks.canNext
                                alwaysShowArrows: root.settings.alwaysShowTrackSwitchButtons === true
                                disabled: !capsuleState.controlsEnabled
                                motionEnabled: root.motionEnabled
                                primaryColor: root.primaryColor
                                baseFont: titleFont.value
                                onNavigationRequested: side => root.issue(side === "prev" ? "previous" : "next", {})
                            }
                            EchoIconButton {
                                objectName: "foliaCapsulePlayToggle"
                                x: capsuleState.wideLayout ? 0 : (parent.width - width) / 2
                                y: capsuleState.wideLayout ? (parent.height - height) / 2 : 32
                                width: 48
                                height: 48
                                padding: 14
                                glyph: root.page && root.page.player.playing ? "pause" : "play"
                                animatePlayPause: true
                                text: root.page && root.page.player.playing ? qsTr("暂停") : qsTr("播放")
                                foreground: root.mainColor
                                enabled: capsuleState.controlsEnabled
                                background: Rectangle {
                                    radius: 24
                                    color: root.primaryColor
                                }
                                onClicked: root.issue("toggle", {})
                            }
                            Repeater {
                                model: root ? [root.settings.playerControlSlotPrimary || "loop", root.settings.playerControlSlotSecondary || "lyrics-timeline"] : []
                                EchoIconButton {
                                    id: slot
                                    required property string modelData
                                    required property int index
                                    objectName: "foliaCapsuleSlot" + index
                                    width: capsuleState.wideLayout ? 34 : 36
                                    height: width
                                    x: capsuleState.wideLayout ? expandedContent.width - 72 + index * 38 : (expandedContent.width - 48) / 2 + (index === 0 ? -width - 16 : 48 + 16)
                                    y: capsuleState.wideLayout ? (expandedContent.height - height) / 2 : 38
                                    glyph: root ? root.slotGlyph(modelData) : ""
                                    padding: 8
                                    contentItem: Item {
                                        opacity: slot.enabled ? 1 : slot.disabledOpacity
                                        EchoIcon {
                                            anchors.centerIn: parent
                                            width: capsuleState.wideLayout ? 18 : 20
                                            height: width
                                            name: slot.glyph
                                            color: root ? root.primaryColor : "transparent"
                                            visible: slot.modelData !== "lyrics-timeline"
                                        }
                                        Shape {
                                            anchors.centerIn: parent
                                            width: capsuleState.wideLayout ? 18 : 20
                                            height: width
                                            visible: slot.modelData === "lyrics-timeline"
                                            preferredRendererType: Shape.CurveRenderer
                                            ShapePath {
                                                strokeColor: root ? root.primaryColor : "transparent"
                                                fillColor: "transparent"
                                                strokeWidth: 1.8
                                                capStyle: ShapePath.RoundCap
                                                joinStyle: ShapePath.RoundJoin
                                                PathSvg {
                                                    path: "M3 2 L3 16 L17 16 M7 12 L7 8 M11 12 L11 4 M15 12 L15 7"
                                                }
                                            }
                                        }
                                    }
                                    text: root ? root.slotLabel(modelData) : ""
                                    foreground: root ? root.primaryColor : "transparent"
                                    enabled: root ? root.actionEnabled(modelData) : false
                                    hoverWhenDisabled: true
                                    opacity: root && enabled ? modelData === "loop" && root.playMode !== 3 || modelData === "like" && root.playbackSnapshot.favorite ? 1 : 0.4 : 0.45
                                    onClicked: if (root)
                                        root.invokeSlot(modelData)
                                }
                            }
                        }
                        // A single progress component survives expand/collapse and never
                        // creates a second playback or seek projection for either layout.
                        PlayerCapsuleProgress {
                            objectName: "foliaCapsuleProgress"
                            page: root.page
                            controlsEnabled: capsuleState.controlsEnabled
                            primaryColor: root.primaryColor
                            secondaryColor: root.secondaryColor
                            trackColor: root.daylight ? Qt.rgba(0, 0, 0, 0.05) : Qt.rgba(1, 1, 1, 0.1)
                            baseFont: timeFont.value
                            x: root.expanded ? capsuleState.wideLayout ? 84 : 20 : 32
                            y: root.expanded ? capsuleState.wideLayout ? 44 : 100 : 16.5
                            width: Math.max(0, parent.width - (root.expanded ? capsuleState.wideLayout ? 192 : 40 : 64))
                            onOperationIssued: operation => root.operationIssued(operation)
                        }
                    }
                }
            }
        }
    }
    Shortcut {
        sequence: "Escape"
        enabled: root.positioning && capsuleState.active
        context: Qt.WindowShortcut
        onActivated: root.cancelPositioning()
    }
    Shortcut {
        sequences: ["Return", "Enter"]
        enabled: root.positioning && capsuleState.active
        context: Qt.WindowShortcut
        onActivated: root.commitPositioning()
    }
    Loader {
        id: positionerHost
        objectName: "foliaCapsulePositionerHost"
        anchors.fill: parent
        readonly property PlayerCapsulePositioner positioner: item as PlayerCapsulePositioner
        active: root.positionerRetained
        z: 10
        sourceComponent: PlayerCapsulePositioner {
            open: root.positioning
            motionEnabled: root.motionEnabled
            maxOffset: capsuleState.maxOffset
            primaryColor: root.primaryColor
            secondaryColor: root.secondaryColor
            daylight: root.daylight
            baseFont: root.baseFont
            onResetRequested: capsuleState.resetPositioning()
            onCommitRequested: root.commitPositioning()
            onCancelRequested: root.cancelPositioning()
        }
    }
}
