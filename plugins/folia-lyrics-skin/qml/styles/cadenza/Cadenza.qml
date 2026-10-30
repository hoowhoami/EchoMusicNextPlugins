// Folia a8da4437 Cadenza: pretext wrapping, hero/scattered placement and cached native glyph poses.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import EchoMusic.PluginSdk
import "envelopes.mjs" as Envelope
import "motion.mjs" as Motion

Item {
    id: root
    objectName: "foliaCadenza"
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: primaryColor
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property real audioPower: 0
    property EchoPluginText textService: null
    readonly property var currentPrepared: preparedLines && currentIndex >= 0 ? preparedLines[currentIndex] : null
    property var nextPrepared: null
    property real _previousTime: timeSeconds
    function syncUpcoming(): void {
        if (!preparedLines) {
            nextPrepared = null;
            return;
        }
        const keys = Object.keys(preparedLines).map(Number).filter(i => preparedLines[i] && preparedLines[i].line && (currentIndex >= 0 ? i > currentIndex : preparedLines[i].line.startTime > timeSeconds)).sort((a, b) => a - b);
        nextPrepared = keys.length ? preparedLines[keys[0]] : null;
    }
    onCurrentIndexChanged: scheduleUpcoming()
    onPreparedLinesChanged: scheduleUpcoming()
    readonly property bool textVisible: settings.showText !== false
    readonly property var tuning: Motion.settings(settings)
    readonly property var layout: preparation.layout
    readonly property bool busy: preparation.busy
    readonly property int layoutRevision: preparation.layoutRevision
    readonly property int measurementBatches: preparation.measurementBatches
    readonly property var renderers: {
        const result = [];
        for (let i = 0; i < words.count; i++) {
            const actor = words.itemAt(i);
            if (actor)
                result.push(actor.renderer);
        }
        return result;
    }
    readonly property var renderer: renderers.length ? renderers[0] : null
    readonly property string errorString: {
        if (preparation.errorString)
            return preparation.errorString;
        for (let i = 0; i < words.count; i++) {
            const actor = words.itemAt(i);
            if (actor && actor.errorString)
                return actor.errorString;
        }
        return "";
    }
    readonly property var lineTiming: currentPrepared ? Envelope.resolveLineRenderTiming(currentPrepared.line) : null
    readonly property var lineEnvelope: layout && currentPrepared && lineTiming ? Envelope.getClassicLineEnvelope(timeSeconds, currentPrepared.line, lineTiming) : ({
            opacity: 0,
            scale: 1,
            blur: 0
        })
    property bool _ready: false
    property var _states: []
    clip: true
    function refresh(dt: real): void {
        if (!_ready || !live || !visible || !layout || !currentPrepared || !lineTiming)
            return;
        const placements = layout.placements;
        const order = Motion.drawOrder(placements, timeSeconds, lineTiming);
        const states = _states.slice();
        for (let drawIndex = 0; drawIndex < order.length; drawIndex++) {
            const index = order[drawIndex];
            const actor = words.itemAt(index);
            if (!actor)
                continue;
            states[index] = Motion.stepPlacement(states[index] || null, placements[index], drawIndex, lineTiming, {
                time: timeSeconds,
                width: width,
                height: height,
                motionAmount: tuning.motionAmount,
                animationIntensity: settings.animationIntensity || "normal",
                energy: paused ? 0 : audioPower,
                dt: dt,
                motionEnabled: motionEnabled
            });
            actor.frame = states[index];
            actor.z = drawIndex;
        }
        _states = states;
        ripples.requestPaint();
    }
    function requestFrame(): void {
        scheduleStaticFrame();
    }
    function refreshStatic(): void {
        refresh(1 / 60);
    }
    onTimeSecondsChanged: {
        if (currentIndex < 0 && (timeSeconds < _previousTime || (nextPrepared && nextPrepared.line.startTime <= timeSeconds)))
            scheduleUpcoming();
        _previousTime = timeSeconds;
        if (!motionEnabled)
            requestFrame();
    }
    onAudioPowerChanged: if (!motionEnabled)
        requestFrame()
    onPausedChanged: requestFrame()
    onPrimaryColorChanged: requestFrame()
    onMotionEnabledChanged: requestFrame()
    onSettingsChanged: requestFrame()
    Component.onCompleted: {
        _ready = true;
        syncUpcoming();
        requestFrame();
    }
    CadenzaLayout {
        id: preparation
        objectName: "foliaCadenzaPreparation"
        line: root.currentPrepared ? root.currentPrepared.line : null
        prefetchLine: root.nextPrepared ? root.nextPrepared.line : null
        viewportWidth: root.width
        viewportHeight: root.height
        baseFont: root.baseFont
        settings: root.settings
        accentColor: root.accentColor
        textService: root.textService
        live: root.live && root.visible && root.textVisible
        onReady: {
            root._states = [];
            root.requestFrame();
        }
    }
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled && root.layout !== null
        onTriggered: root.refresh(frameTime)
    }
    Item {
        id: layer
        anchors.fill: parent
        visible: root.live && root.textVisible && root.layout !== null
        opacity: root.lineEnvelope.opacity
        transform: Scale {
            origin.x: root.width * .5
            origin.y: root.height * .42
            xScale: root.motionEnabled ? root.lineEnvelope.scale : 1
            yScale: xScale
        }
        layer.enabled: root.motionEnabled && root.lineEnvelope.blur > .05 && GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
        layer.effect: MultiEffect {
            blurEnabled: true
            blurMax: 32
            blur: root.lineEnvelope.blur / 32
        }
        Repeater {
            id: words
            model: root.layout ? root.layout.placements : []
            CadenzaWord {
                required property var modelData
                placement: modelData
                fontPx: root.layout ? root.layout.fontPx : 24
                baseFont: root.baseFont
                fontWeight: preparation.fontWeight
                lineTiming: root.lineTiming
                timeSeconds: root.timeSeconds
                primaryColor: root.primaryColor
                glowIntensity: root.tuning.glowIntensity
                Component.onCompleted: root.requestFrame()
            }
        }
        Canvas {
            id: ripples
            anchors.fill: parent
            z: 1000
            onPaint: {
                const context = getContext("2d");
                context.clearRect(0, 0, width, height);
                if (!root.layout || !root.currentPrepared)
                    return;
                for (let i = 0; i < root.layout.placements.length; i++) {
                    const ring = Motion.ripple(root.layout.placements[i], root._states[i], root.currentPrepared.line.isChorus === true);
                    if (!ring)
                        continue;
                    context.strokeStyle = ring.color;
                    context.globalAlpha = ring.opacity;
                    context.lineWidth = 1.2;
                    context.beginPath();
                    context.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
                    context.stroke();
                }
                context.globalAlpha = 1;
            }
        }
    }
    Text {
        anchors.horizontalCenter: parent.horizontalCenter
        y: root.height * .35 - height / 2
        visible: root.live && root.textVisible && root.currentIndex < 0
        text: qsTr("等待音乐")
        color: root.secondaryColor
        opacity: .5
        font: waitingFont.value
        textFormat: Text.PlainText
    }
    CadenzaFont {
        id: waitingFont
        base: root.baseFont
        pixelSize: Math.round(24 * (root.settings.lyricsFontScale || 1))
        weight: preparation.fontWeight
    }

    // Deferred work belongs to this component and cannot outlive its QML context.
    function scheduleUpcoming(): void {
        if (_ready)
            upcomingTask.restart();
    }
    Timer {
        id: upcomingTask
        interval: 0
        onTriggered: if (root._ready)
            root.syncUpcoming()
    }
    function scheduleStaticFrame(): void {
        if (_ready)
            staticFrameTask.restart();
    }
    Timer {
        id: staticFrameTask
        interval: 0
        onTriggered: if (root._ready)
            root.refreshStatic()
    }
    Component.onDestruction: {
        _ready = false;
        upcomingTask.stop();
        staticFrameTask.stop();
    }
}
