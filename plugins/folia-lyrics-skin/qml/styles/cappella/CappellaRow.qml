// Folia a8da4437 message row. Full-context ink is immutable throughout character fades.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../../shared"
import "kernel.mjs" as Chat

Item {
    id: root
    required property var controller
    required property var message
    property var prepared: message.kind === "lyric" && controller.preparedLines ? controller.preparedLines[message.lineIndex] || null : null
    property bool shown: false
    property bool preheating: false
    property bool leaving: false
    property real enteredAt: controller.uiSeconds
    property real leftAt: 0
    property real targetY: 0
    property var metric: null
    property var clusters: []
    property var prefix: null
    property var revealStates: []
    property int _lastRevealCount: -1
    property string renderError: ""
    readonly property string errorString: renderError || avatar.errorString || (emoji ? emojiImage.errorString : "")
    readonly property var glyphRenderer: glyph
    readonly property var motion: controller.profile.motion
    readonly property var state: Chat.timedState(message, controller.timeSeconds, controller.currentIndex)
    readonly property bool active: state.active || preheating
    readonly property bool emoji: message.kind === "emo"
    readonly property bool isRight: message.side === "right"
    readonly property string text: message.kind === "title" ? message.text : prepared ? prepared.line.fullText : ""
    readonly property bool inputReady: message.kind !== "lyric" || prepared !== null
    readonly property real fontPx: message.kind === "title" ? controller.tuning.fontSize : controller.tuning.fontSize * (active ? motion.activeFontMultiplier : motion.inactiveFontMultiplier)
    readonly property int fontWeight: Number.isFinite(controller.settings.fontWeight) ? controller.settings.fontWeight : 400
    readonly property real lineHeight: Math.round(fontPx * 1.45)
    readonly property real paddingX: active ? motion.activePaddingX : motion.inactivePaddingX
    readonly property real paddingY: active ? motion.activePaddingY : motion.inactivePaddingY
    readonly property real minimumHeight: Math.max(active ? motion.activeMinHeight : motion.inactiveMinHeight, lineHeight + paddingY * 2)
    readonly property real fullWidth: metric ? Math.ceil(Math.min(Math.max(metric.width, fontPx), controller.geometry.maxTextWidth) + paddingX * 2 + 2) : 72
    readonly property real fullHeight: metric ? Math.max(minimumHeight, Math.ceil(metric.height + paddingY * 2 + 2)) : minimumHeight
    readonly property real imageSize: active ? motion.emoActiveSize : motion.emoInactiveSize
    readonly property int targetCount: prefix && prepared ? Chat.countAt(prefix.plan.targetTimes, controller.timeSeconds) : 0
    readonly property int visibleCount: prefix && prepared ? Chat.countAt(prefix.plan.revealTimes, controller.timeSeconds) : 0
    readonly property int targetClusterCount: prefix ? clusters.filter(c => c.first < targetCount).length : 0
    readonly property int visibleClusterCount: prefix ? clusters.filter(c => c.first < visibleCount).length : 0
    readonly property var targetSize: prefix && active && !preheating ? prefix.prefixes[targetClusterCount] : null
    readonly property real targetWidth: emoji ? imageSize : Math.max(active ? 72 : 0, targetSize ? targetSize.width : fullWidth)
    readonly property real targetHeight: emoji ? imageSize : Math.max(minimumHeight, targetSize ? targetSize.height : fullHeight)
    readonly property real scaleOverflow: active ? Math.ceil(Math.max(emoji ? imageSize : fullHeight, 40) * (motion.activeScale - 1)) : 0
    readonly property real estimatedHeight: (emoji ? imageSize : fullHeight) + scaleOverflow + (emoji ? 48 : 0) + 12
    readonly property bool ready: emoji || (inputReady && metric !== null && (!active || message.kind !== "lyric" || prefix !== null))
    readonly property var tint: Chat.bubbleColors(message, controller.primaryColor, controller.secondaryColor, controller.accentColor, controller.backgroundColor)
    readonly property string cacheKey: JSON.stringify([message.id, text, prepared ? prepared.timeline : null, fontPx, fontWeight, controller.fontRevision, controller.geometry.maxTextWidth, lineHeight, paddingX, paddingY])
    readonly property var requestedRuns: !emoji && inputReady ? [
        {
            key: "body",
            text,
            size: fontPx,
            weight: fontWeight,
            maxBlur: 0,
            maxWidth: controller.geometry.maxTextWidth,
            lineHeight
        }
    ] : []
    readonly property var revealPlan: prepared ? Chat.revealPlan(prepared) : null
    readonly property bool timestampVisible: message.kind === "title" ? false : emoji ? controller.timeSeconds >= message.activationEndTime : state.passed || controller.timeSeconds >= (prefix ? prefix.plan.timestampReadyTime : message.line.endTime)
    property var scaleSpring: ({
            value: 1,
            velocity: 0,
            target: 1
        })
    property var opacitySpring: ({
            value: 1,
            velocity: 0,
            target: 1
        })
    property var marginSpring: ({
            value: 0,
            velocity: 0,
            target: 0
        })
    property var positionSpring: ({
            value: targetY,
            velocity: 0,
            target: targetY
        })
    property var rowMotion: ({
            opacity: 1,
            y: 0,
            scale: 1,
            finished: true
        })
    property real frameWidth: targetWidth
    property real frameHeight: targetHeight
    property real widthOrigin: frameWidth
    property real heightOrigin: frameHeight
    property real sizeChangedAt: controller.uiSeconds
    property bool _completed: false
    height: frameHeight + marginSpring.value + (emoji ? 48 : 0)
    width: controller.geometry.width
    x: (controller.width - width) / 2
    y: positionSpring.value + rowMotion.y
    visible: controller.live && (shown || leaving)
    opacity: rowMotion.opacity
    scale: rowMotion.scale

    function nativeColor(value: var): color {
        return Qt.rgba(value.r, value.g, value.b, value.a);
    }
    function accepted(): bool {
        if (glyph.font != controller.baseFont || glyph.runs.length !== requestedRuns.length)
            return false;
        if (!requestedRuns.length)
            return true;
        const actual = glyph.runs[0], expected = requestedRuns[0];
        return actual.key === expected.key && actual.text === expected.text && actual.size === expected.size && actual.weight === expected.weight && actual.maxBlur === 0 && actual.maxWidth === expected.maxWidth && actual.lineHeight === expected.lineHeight;
    }
    function reconcile(): void {
        if (!_completed || emoji)
            return;
        if (!accepted() || !glyph.metrics.length) {
            metric = null;
            prefix = null;
            clusters = [];
            renderError = inputReady ? glyph.errorString || "Native paragraph layout rejected" : "";
            controller.scheduleSelection();
            return;
        }
        renderError = "";
        metric = JSON.parse(JSON.stringify(glyph.metrics[0]));
        clusters = Chat.clustersFromMetrics(metric);
        for (const cluster of clusters) {
            const first = metric.graphemes[cluster.first];
            cluster.y = metric.baseline + first.y;
        }
        updateCache();
        controller.scheduleSelection();
        publish();
    }
    function updateCache(): void {
        if (!active || message.kind !== "lyric" || !metric || !prepared)
            return;
        prefix = controller.cachedPrefix(cacheKey);
        if (!prefix)
            controller.requestPrefix({
                key: cacheKey,
                text,
                fontSize: fontPx,
                weight: fontWeight,
                maxWidth: controller.geometry.maxTextWidth,
                lineHeight,
                paddingX,
                paddingY,
                clusters,
                plan: revealPlan,
                sourceIndex: message.lineIndex
            });
    }
    function changeSize(): void {
        widthOrigin = frameWidth;
        heightOrigin = frameHeight;
        sizeChangedAt = controller.uiSeconds;
        if (!controller.motionEnabled) {
            frameWidth = targetWidth;
            frameHeight = targetHeight;
        }
    }
    function setShown(value: bool, initial: bool): void {
        if (shown === value && !leaving)
            return;
        if (value) {
            leaving = false;
            shown = true;
            enteredAt = initial ? controller.uiSeconds - motion.rowEnterDuration : controller.uiSeconds;
            rowMotion = Chat.rowPose(controller.uiSeconds - enteredAt, false, motion);
            updateCache();
        } else if (shown) {
            shown = false;
            leaving = controller.motionEnabled;
            leftAt = controller.uiSeconds;
        }
        publish();
    }
    function publish(): void {
        if (emoji || !ready || !accepted() || renderError)
            return;
        const usePrefix = active && prefix && !preheating;
        const placement = usePrefix ? prefix.prefixes[visibleClusterCount] : null;
        if (usePrefix && (_lastRevealCount !== visibleClusterCount || revealStates.length !== clusters.length)) {
            revealStates = Chat.updateReveals(revealStates, clusters, prefix.plan, controller.timeSeconds, controller.uiSeconds);
            _lastRevealCount = visibleClusterCount;
        }
        const output = [];
        const leading = (lineHeight - fontMetrics.height) / 2;
        for (let i = 0; i < clusters.length; i++) {
            const cluster = clusters[i];
            const position = placement && placement.positions[i];
            output.push({
                key: "body",
                start: cluster.start,
                x: paddingX + 1 + (position ? position.x - cluster.anchor : 0),
                y: paddingY + 1 + leading + (position ? position.y - cluster.y : 0),
                opacity: usePrefix ? (controller.motionEnabled ? Chat.clusterOpacity(revealStates[i], controller.uiSeconds) : (i < visibleClusterCount ? 1 : 0)) : 1,
                color: nativeColor(tint.text)
            });
        }
        glyph.poses = output;
    }
    function advance(seconds: real): void {
        const enabled = controller.motionEnabled;
        scaleSpring.target = state.active ? motion.activeScale : state.passed ? motion.passedScale : 1;
        opacitySpring.target = state.passed ? motion.passedOpacity : 1;
        marginSpring.target = scaleOverflow;
        positionSpring.target = targetY;
        if (enabled) {
            scaleSpring = Chat.stepSpring(scaleSpring, motion.avatarSpring, seconds);
            opacitySpring = Chat.stepSpring(opacitySpring, motion.avatarSpring, seconds);
            marginSpring = Chat.stepSpring(marginSpring, motion.avatarSpring, seconds);
            positionSpring = Chat.stepSpring(positionSpring, motion.avatarSpring, seconds);
        } else {
            scaleSpring = {
                value: scaleSpring.target,
                velocity: 0,
                target: scaleSpring.target
            };
            opacitySpring = {
                value: opacitySpring.target,
                velocity: 0,
                target: opacitySpring.target
            };
            marginSpring = {
                value: marginSpring.target,
                velocity: 0,
                target: marginSpring.target
            };
            positionSpring = {
                value: targetY,
                velocity: 0,
                target: targetY
            };
        }
        const duration = emoji ? motion.emoSizeTransitionDuration : .2;
        const progress = enabled ? Chat.easeOut((controller.uiSeconds - sizeChangedAt) / duration) : 1;
        frameWidth = widthOrigin + (targetWidth - widthOrigin) * progress;
        frameHeight = heightOrigin + (targetHeight - heightOrigin) * progress;
        rowMotion = Chat.rowPose(enabled ? controller.uiSeconds - (leaving ? leftAt : enteredAt) : 10, leaving, motion);
        if (leaving && rowMotion.finished)
            leaving = false;
        publish();
    }
    onTargetWidthChanged: changeSize()
    onTargetHeightChanged: changeSize()
    onRequestedRunsChanged: {
        metric = null;
        prefix = null;
        revealStates = [];
        _lastRevealCount = -1;
        scheduleReconcile();
    }
    onActiveChanged: {
        prefix = null;
        revealStates = [];
        _lastRevealCount = -1;
        scheduleReconcile();
    }
    onPreparedChanged: scheduleReconcile()
    onTintChanged: publish()
    onTimestampVisibleChanged: timestampEnter.restart()
    Component.onCompleted: {
        _completed = true;
        scheduleReconcile();
    }

    FoliaFont {
        id: fontSpec
        base: root.controller.baseFont
        pixelSize: Math.round(root.fontPx)
        weight: root.fontWeight
        letterSpacing: root.controller.baseFont.letterSpacing
    }
    FontMetrics {
        id: fontMetrics
        font: fontSpec.value
    }
    FoliaFont {
        id: timestampFontSpec
        base: root.controller.baseFont
        pixelSize: 11
        weight: Font.Medium
        letterSpacing: 0
    }
    Item {
        id: group
        width: root.width * root.controller.geometry.ratio
        height: root.frameHeight
        x: root.isRight ? root.width - width : 0
        y: root.marginSpring.value + (root.emoji ? 48 : 0)
        opacity: root.opacitySpring.value
        scale: root.scaleSpring.value
        transformOrigin: root.isRight ? Item.BottomRight : Item.BottomLeft
        CappellaAvatar {
            id: avatar
            assetsService: root.controller.assetsService
            live: root.controller.live && (root.shown || root.leaving)
            motionEnabled: root.controller.motionEnabled
            x: root.isRight ? group.width - width : 0
            y: group.height - height
            imageUrl: root.controller.avatarUrl(root.message)
            avatarIndex: root.controller.avatarGridIndex(root.message)
            useGrid: root.controller.tuning.avatarSource === "cover" && Boolean(root.controller.coverUrl)
            primaryColor: root.controller.primaryColor
            secondaryColor: root.controller.secondaryColor
            accentColor: root.controller.accentColor
        }
        Item {
            id: bubble
            x: root.isRight ? group.width - 52 - width : 52
            width: root.frameWidth
            height: root.frameHeight
            CappellaBubble {
                anchors.fill: parent
                visible: !root.emoji
                color: root.nativeColor(root.tint.background)
                borderTint: root.nativeColor(root.tint.border)
                isRight: root.isRight
                active: root.state.active
                shadowTint: root.nativeColor(Chat.mix(root.controller.backgroundColor, root.controller.accentColor, .2, root.state.active ? root.motion.activeShadowAlpha : .18))
                glowPhase: (root.controller.uiSeconds % root.motion.glowDuration) / root.motion.glowDuration
                glowAlpha: root.isRight ? root.motion.glowRightAlpha : root.motion.glowLeftAlpha
                glowOpacity: root.motion.glowOpacity
            }
            GlyphRun {
                id: glyph
                anchors.fill: parent
                font: root.controller.baseFont
                runs: root.requestedRuns
                visible: !root.emoji && (root.shown || root.leaving) && root.ready && !root.renderError
                onLayoutChanged: root.scheduleReconcile()
            }
            AssetImage {
                id: emojiImage
                anchors.fill: parent
                visible: root.emoji
                assetsService: root.controller.assetsService
                live: root.controller.live && (root.shown || root.leaving)
                cache: false
                autoTransform: true
                playing: root.controller.live && (root.shown || root.leaving) && root.controller.motionEnabled
                source: root.emoji ? root.message.emoImageUrl : ""
                sourceSize.width: 512
                sourceSize.height: 512
                asynchronous: true
                fillMode: Image.PreserveAspectFit
                rotation: root.controller.motionEnabled ? -Math.cos(root.controller.uiSeconds / 1.9 * Math.PI * 2) * 1.6 : 0
                scale: 1 - (1 - root.motion.emoEnterScale) * (1 - Chat.easeOut((root.controller.uiSeconds - root.enteredAt) / root.motion.rowEnterDuration))
            }
            Text {
                id: timestampLabel
                objectName: "cappellaTimestamp"
                text: root.message.kind === "title" ? "" : Chat.timestamp(root.message.line.endTime)
                font: timestampFontSpec.value
                color: root.controller.secondaryColor
                x: root.isRight ? -width - 8 : bubble.width + 8
                y: bubble.height - height + (root.emoji ? 2 : -4) + timestampOffset.y
                opacity: root.timestampVisible ? timestampOffset.opacity : 0
                renderType: Text.CurveRendering
            }
        }
    }
    QtObject {
        id: timestampOffset
        property real y: 0
        property real opacity: .62
    }
    ParallelAnimation {
        id: timestampEnter
        NumberAnimation {
            target: timestampOffset
            property: "y"
            from: 4
            to: 0
            duration: root.controller.motionEnabled ? 180 : 0
            easing.type: Easing.OutCubic
        }
        NumberAnimation {
            target: timestampOffset
            property: "opacity"
            from: 0
            to: .62
            duration: root.controller.motionEnabled ? 180 : 0
            easing.type: Easing.OutCubic
        }
    }

    // Deferred work belongs to this component and cannot outlive its QML context.
    function scheduleReconcile(): void {
        if (_completed)
            reconcileTask.restart();
    }
    Timer {
        id: reconcileTask
        interval: 0
        onTriggered: if (root._completed)
            root.reconcile()
    }
    Component.onDestruction: {
        _completed = false;
        reconcileTask.stop();
    }
}
