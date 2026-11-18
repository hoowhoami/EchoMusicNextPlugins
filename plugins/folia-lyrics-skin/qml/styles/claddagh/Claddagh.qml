// Folia a8da4437 Claddagh. Shaping is cached; frames only publish native GPU poses.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import EchoMusic.PluginSdk
import "kernel.mjs" as Ring

Item {
    id: root
    objectName: "foliaCladdagh"
    required property var preparedLines
    property int currentIndex: 0
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: primaryColor
    property var wordColors: []
    property real bassPower: 0
    property real vocalPower: 0
    property string animationIntensity: "normal"
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property bool exiting: false
    property var nextStartBySourceIndex
    signal exitFinished
    property bool _ready: false
    property bool _exitEmitted: false
    property real _presentationElapsed: 0
    property var _presentationOrigin: ({
            opacity: 0,
            scale: .96,
            blur: 4
        })
    property var _presentation: ({
            opacity: 0,
            scale: .96,
            blur: 4,
            finished: false
        })
    readonly property var tuning: Ring.resolveSettings(settings)
    readonly property real fontPx: 72 * tuning.lyricsFontScale
    readonly property real radius: Math.min(width * .44, 560) * tuning.radiusScale
    readonly property int centerIndex: preparedLines ? Ring.focusIndex(preparedLines, currentIndex, timeSeconds) : -1
    readonly property var renderWindow: Ring.windowIndices(centerIndex, preparedLines ? preparedLines.length : 0, preparedLines)
    readonly property int mountedLineCount: lines.count
    property var spring: Ring.createSpring(centerIndex)
    property var bassSpring: ({
            value: 0,
            velocity: 0
        })
    property var vocalSpring: ({
            value: 0,
            velocity: 0
        })
    property bool dirty: true
    property real previousTime: timeSeconds
    property bool holdReset: false
    property real axisGlow: 0
    readonly property bool chorus: currentIndex >= 0 && sourceLineAt(currentIndex) !== null && sourceLineAt(currentIndex).isChorus === true
    readonly property bool moving: Math.abs(spring.value - spring.target) > .0001 || Math.abs(spring.velocity) > .0001
    readonly property bool audioMoving: Math.abs(bassSpring.value - normalizedPower(bassPower)) > .0001 || Math.abs(bassSpring.velocity) > .0001 || Math.abs(vocalSpring.value - normalizedPower(vocalPower)) > .0001 || Math.abs(vocalSpring.velocity) > .0001
    property string renderError: ""
    clip: true
    opacity: live && visible ? _presentation.opacity : 0
    scale: _presentation.scale
    transformOrigin: Item.Center
    layer.enabled: live && visible && motionEnabled && _presentation.blur > .001 && GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
    layer.effect: MultiEffect {
        blurEnabled: true
        blurMax: 32
        blur: root._presentation.blur / 32
    }

    function normalizedPower(value: real): real {
        return Ring.normalizedPower(value);
    }
    function checkExit(): void {
        if (exiting && _presentation.finished && !_exitEmitted) {
            _exitEmitted = true;
            exitFinished();
        }
    }
    function startPresentation(): void {
        if (!_ready)
            return;
        if (!live || !visible) {
            retirePresentation();
            return;
        }
        _exitEmitted = false;
        _presentationOrigin = _presentation;
        _presentationElapsed = 0;
        _presentation = Ring.presentationPose(motionEnabled ? 0 : .8, exiting, _presentationOrigin);
        checkExit();
    }
    function retirePresentation(): void {
        _presentationElapsed = 0;
        _presentation = ({
                opacity: 0,
                scale: .96,
                blur: 4,
                finished: true
            });
    }
    function advancePresentation(seconds: real): void {
        if (!live || !visible || !Number.isFinite(seconds) || seconds <= 0)
            return;
        _presentationElapsed = Math.min(.8, _presentationElapsed + seconds);
        _presentation = Ring.presentationPose(_presentationElapsed, exiting, _presentationOrigin);
        checkExit();
    }
    function nativeColor(value: var): color {
        return Qt.rgba(value.r, value.g, value.b, value.a);
    }
    function sourceLineAt(index: int): var {
        const prepared = preparedLines && preparedLines[index];
        return prepared && prepared.line ? prepared.line : null;
    }
    function requestFrame(): void {
        dirty = true;
        if (live && visible && !motionEnabled)
            scheduleFrame();
    }
    function layerFor(index: int): var {
        for (let i = 0; i < lines.count; i++) {
            const layer = lines.itemAt(i);
            if (layer && layer.lineIndex === index)
                return layer;
        }
        return null;
    }
    function refreshLayouts(): void {
        if (!live || !visible || !preparedLines || !lines)
            return;
        for (let i = 0; i < lines.count; i++) {
            const layer = layerFor(renderWindow[i]);
            if (layer)
                layer.prepareSpacing();
        }
        requestFrame();
    }
    function refreshFrame(): void {
        if (!live || !visible || !preparedLines || !lines)
            return;
        if (holdReset && centerIndex > 0)
            return;
        const active = layerFor(centerIndex);
        const activeSpacing = active ? active.spacing : [];
        const activeLine = sourceLineAt(centerIndex);
        const next = Ring.nextPreparedLine(preparedLines, centerIndex);
        const activeEnd = activeLine ? Ring.resolvedRenderEnd(activeLine, centerIndex, nextStartBySourceIndex, next) : undefined;
        renderError = "";
        for (let i = 0; i < lines.count; i++) {
            const layer = layerFor(renderWindow[i]);
            if (!layer)
                continue;
            layer.publish(activeSpacing, activeEnd);
            if (layer.preparationError || layer.errorString)
                renderError = layer.preparationError || layer.errorString;
        }
        dirty = false;
    }
    function advance(seconds: real): void {
        if (!live || !visible)
            return;
        if (motionEnabled) {
            spring = Ring.stepSpring(spring, seconds);
            bassSpring = Ring.stepAudio(bassSpring, normalizedPower(bassPower), 150, 25, seconds);
            vocalSpring = Ring.stepAudio(vocalSpring, normalizedPower(vocalPower), 120, 24, seconds);
            const target = chorus ? 1 : 0;
            axisGlow = Math.abs(target - axisGlow) > .01 ? Ring.clamp(axisGlow + Math.sign(target - axisGlow) * .05, 0, 1) : target;
        }
        refreshFrame();
    }
    onCenterIndexChanged: {
        spring = Ring.retargetSpring(spring, centerIndex, motionEnabled && live);
        if (centerIndex <= 0)
            holdReset = false;
        dirty = true;
    }
    onTimeSecondsChanged: {
        if (Ring.shouldHoldReset(previousTime, timeSeconds, centerIndex))
            holdReset = true;
        previousTime = timeSeconds;
        if (centerIndex <= 0)
            holdReset = false;
        dirty = true;
        if (!motionEnabled)
            refreshFrame();
    }
    onWidthChanged: refreshLayouts()
    onHeightChanged: requestFrame()
    onTuningChanged: refreshLayouts()
    onWordColorsChanged: refreshLayouts()
    onPrimaryColorChanged: requestFrame()
    onAccentColorChanged: requestFrame()
    onBassPowerChanged: requestFrame()
    onVocalPowerChanged: requestFrame()
    onAnimationIntensityChanged: requestFrame()
    onNextStartBySourceIndexChanged: requestFrame()
    onExitingChanged: startPresentation()
    onMotionEnabledChanged: {
        if (!motionEnabled) {
            spring = Ring.createSpring(centerIndex);
            bassSpring = ({
                    value: 0,
                    velocity: 0
                });
            vocalSpring = ({
                    value: 0,
                    velocity: 0
                });
            axisGlow = 0;
        }
        dirty = true;
        refreshFrame();
        startPresentation();
    }
    onLiveChanged: {
        if (live) {
            spring = Ring.createSpring(centerIndex);
            requestFrame();
            startPresentation();
        } else
            retirePresentation();
    }
    onVisibleChanged: {
        if (visible && live)
            startPresentation();
        else
            retirePresentation();
    }
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled && !root._presentation.finished
        onTriggered: root.advancePresentation(frameTime)
    }
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled && (root.dirty || root.moving || root.audioMoving || Math.abs(root.axisGlow - (root.chorus ? 1 : 0)) > .001)
        onTriggered: root.advance(frameTime)
    }
    Rectangle {
        id: axis
        objectName: "foliaCladdaghAxis"
        readonly property real bass: root.paused ? 0 : root.bassSpring.value
        readonly property real vocal: root.paused ? 0 : root.vocalSpring.value
        readonly property real colorRatio: Math.min(1, Math.max(0, Math.max(bass, vocal) - .02) / .58)
        readonly property color targetColor: root.accentColor !== root.primaryColor ? root.accentColor : root.secondaryColor !== root.primaryColor ? root.secondaryColor : "white"
        readonly property color mixed: root.nativeColor(Ring.mixColor(root.primaryColor, targetColor, colorRatio, .2 + .75 * colorRatio))
        visible: root.live && root.tuning.showAxisLine
        anchors.centerIn: parent
        width: 300
        height: 4
        rotation: 90 - root.tuning.ellipseTiltDeg
        transform: Scale {
            origin.x: axis.width / 2
            origin.y: axis.height / 2
            xScale: 1 + axis.bass * axis.bass * 1.5
            yScale: 1 + axis.bass * axis.bass * .5
        }
        gradient: Gradient {
            orientation: Gradient.Horizontal
            GradientStop {
                position: 0
                color: "transparent"
            }
            GradientStop {
                position: .2
                color: axis.mixed
            }
            GradientStop {
                position: .8
                color: axis.mixed
            }
            GradientStop {
                position: 1
                color: "transparent"
            }
        }
        layer.enabled: root.axisGlow > .001
        layer.effect: MultiEffect {
            shadowEnabled: true
            shadowColor: axis.mixed
            shadowOpacity: root.axisGlow
            shadowBlur: (4 + axis.bass * 12) * root.axisGlow / 32
            blurMax: 32
            shadowHorizontalOffset: 0
            shadowVerticalOffset: 0
        }
    }
    Repeater {
        id: lines
        model: root.renderWindow
        onItemAdded: (index, item) => root.scheduleLayouts()
        delegate: GlyphRun {
            id: lineLayer
            required property int modelData
            readonly property int lineIndex: modelData
            readonly property var prepared: root.preparedLines[lineIndex] || null
            readonly property var sourceLine: prepared ? prepared.line : null
            property var spacing: []
            property var clusters: []
            property string preparationError: ""
            property bool _publishing: false
            anchors.fill: parent
            objectName: "foliaCladdaghLine" + lineIndex
            visible: root.live && root.settings.showText !== false
            font: root.baseFont
            runs: sourceLine ? [
                {
                    key: "line",
                    text: sourceLine.fullText,
                    size: root.fontPx,
                    spacing: 0,
                    maxBlur: 8,
                    maxHaloRadius: sourceLine.isChorus ? 160 : 40
                }
            ] : []
            function prepareSpacing(): void {
                if (sourceLine && (!runs.length || runs[0].text !== sourceLine.fullText)) {
                    preparationError = errorString || "Native glyph run preparation was rejected";
                    spacing = [];
                    clusters = [];
                    root.requestFrame();
                    return;
                }
                if (!prepared || !sourceLine || !metrics.length) {
                    spacing = [];
                    clusters = [];
                    return;
                }
                spacing = Ring.applyWordColors(Ring.buildSpacing(Ring.adjustTimeline(prepared.timeline, sourceLine), metrics[0], root.fontPx, root.radius, root.tuning.focusScaleRatio, root.tuning.letterSpacingOffset), Ring.wordColorRanges(sourceLine.fullText, root.wordColors));
                clusters = Ring.clusterSpacing(spacing);
                root.requestFrame();
            }
            function publish(activeSpacing: var, activeEnd: var): void {
                if (preparationError)
                    return;
                if (!sourceLine) {
                    poses = [];
                    return;
                }
                const next = Ring.nextPreparedLine(root.preparedLines, lineIndex);
                const ownEnd = Ring.resolvedRenderEnd(sourceLine, lineIndex, root.nextStartBySourceIndex, next);
                const offset = Ring.lineWordOffset(spacing, activeSpacing, lineIndex, root.centerIndex, root.spring.value, root.timeSeconds, ownEnd, activeEnd);
                const current = root.sourceLineAt(root.centerIndex);
                const nextPoses = clusters.map(item => {
                    const frame = Ring.glyphFrame(item, {
                        lineIndex,
                        centerIndex: root.centerIndex,
                        lineOffset: root.spring.value,
                        wordOffset: offset,
                        radius: root.radius,
                        width: root.width,
                        height: root.height,
                        fontPx: root.fontPx,
                        power: root.motionEnabled ? root.bassSpring.value : 0,
                        intensity: root.animationIntensity,
                        chorus: sourceLine.isChorus,
                        currentLength: current ? Ring.visualLength(current.fullText) : 0,
                        targetLength: Ring.visualLength(sourceLine.fullText),
                        time: root.timeSeconds,
                        lineStart: sourceLine.startTime,
                        settings: root.tuning,
                        primary: root.primaryColor,
                        accent: root.accentColor
                    });
                    const native = Ring.nativePose(frame, item);
                    return {
                        key: "line",
                        start: item.clusterStart,
                        x: native.x,
                        y: native.y,
                        scale: frame.scale,
                        rotation: frame.rotation,
                        opacity: frame.opacity,
                        blur: frame.blur,
                        color: root.nativeColor(frame.color),
                        halos: frame.halos.map(halo => ({
                                    radius: halo.radius,
                                    opacity: halo.opacity,
                                    color: root.nativeColor(halo.color)
                                }))
                    };
                });
                _publishing = true;
                poses = nextPoses;
                _publishing = false;
            }
            onErrorChanged: {
                if (!_publishing) {
                    preparationError = errorString;
                    root.requestFrame();
                }
            }
            onLayoutChanged: {
                preparationError = "";
                prepareSpacing();
            }
            Component.onCompleted: prepareSpacing()
        }
    }
    Component.onCompleted: {
        _ready = true;
        startPresentation();
        refreshLayouts();
        if (!motionEnabled)
            refreshFrame();
    }

    // Deferred work belongs to this component and cannot outlive its QML context.
    function scheduleFrame(): void {
        if (_ready)
            frameTask.restart();
    }
    Timer {
        id: frameTask
        interval: 0
        onTriggered: if (root._ready)
            root.refreshFrame()
    }
    function scheduleLayouts(): void {
        if (_ready)
            layoutTask.restart();
    }
    Timer {
        id: layoutTask
        interval: 0
        onTriggered: if (root._ready)
            root.refreshLayouts()
    }
    Component.onDestruction: {
        _ready = false;
        frameTask.stop();
        layoutTask.stop();
    }
}
