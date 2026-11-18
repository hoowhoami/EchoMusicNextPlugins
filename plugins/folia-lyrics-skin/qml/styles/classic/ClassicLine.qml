// Folia Classic/GlowWord, a8da4437. AGPL-3.0-only.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import EchoMusic.PluginSdk
import "layout.mjs" as Layout
import "motion.mjs" as Motion
import "model.mjs" as Model

Item {
    id: lineRoot
    required property var prepared
    required property var settings
    required property font baseFont
    required property color primaryColor
    required property color accentColor
    required property real viewportWidth
    required property real timeSeconds
    required property real enteredAt
    required property real presentationSeconds
    required property real enteredPresentationAt
    property real leavingAt: -1
    property bool hiddenExit: false
    property var leaveOrigin: null
    property bool motionEnabled: true
    property string sourceKey: ""
    readonly property var glyphRenderer: glyph
    readonly property string errorString: layoutError || glyph.errorString
    property string layoutError: ""
    property bool _completed: false
    property bool layoutAccepted: false
    readonly property var acceptedMetrics: layoutAccepted && runsMatch(glyph.runs, requestedRuns) ? glyph.metrics : []
    readonly property var tuning: Layout.resolveClassicSettings(settings)
    readonly property var words: tuning.useLegacyLayout ? prepared.line.words : prepared.displayWords
    readonly property real pixelSize: Layout.classicRenderFontSize(viewportWidth, tuning.lyricsFontScale)
    readonly property var profile: Motion.renderProfile(prepared.line)
    readonly property var lineMotion: motionEnabled ? Motion.linePose(profile, Math.max(0, presentationSeconds - (leavingAt >= 0 ? leavingAt : enteredPresentationAt)), leavingAt >= 0, hiddenExit, leaveOrigin) : ({
            opacity: 1,
            scale: 1,
            blur: 0,
            finished: false
        })
    readonly property var configs: Layout.buildWordConfigs(prepared.line, words, acceptedMetrics.map(metric => metric.width), viewportWidth, settings)
    readonly property var geometry: Layout.layoutRows(acceptedMetrics, configs.wordConfigs, configs.lineConfig, width, pixelSize)
    readonly property var clusters: acceptedMetrics.map((metric, index) => Model.buildClusters(words[index], metric))
    readonly property var wordColors: Array.from(settings.wordColors || [])
    readonly property var activeColors: words.map(word => Qt.color(Layout.resolveWordColor(word.text, wordColors, String(accentColor))))
    readonly property int resolvedWeight: Number.isFinite(settings.fontWeight) ? Math.round(Math.max(100, Math.min(900, settings.fontWeight)) / 10) * 10 : 700
    readonly property var requestedRuns: words.map((word, index) => ({
                key: "word-" + index,
                text: word.text,
                size: Math.round(pixelSize),
                weight: resolvedWeight,
                maxBlur: 32,
                maxHaloRadius: 80
            }))
    property var wordTransitions: []
    property real _previousTime: timeSeconds
    property real _lastPresentationSeconds: -1
    property real _previousPresentationSeconds: -1
    onPresentationSecondsChanged: {
        if (_lastPresentationSeconds >= 0 && presentationSeconds > _lastPresentationSeconds)
            _previousPresentationSeconds = _lastPresentationSeconds;
        _lastPresentationSeconds = presentationSeconds;
    }
    function runsMatch(actual, requested) {
        if (actual.length !== requested.length)
            return false;
        const fields = ["key", "text", "size", "weight", "maxBlur", "maxHaloRadius"];
        for (let index = 0; index < requested.length; index++)
            for (const field of fields)
                if (actual[index][field] !== requested[index][field])
                    return false;
        return true;
    }
    function reconcileLayout() {
        layoutAccepted = runsMatch(glyph.runs, requestedRuns) && glyph.font == baseFont;
        layoutError = layoutAccepted ? "" : glyph.errorString || "Native text layout was rejected";
        if (layoutAccepted)
            updateWordStates();
    }
    function scheduleLayoutCheck() {
        layoutAccepted = false;
        if (_completed)
            layoutCheck.restart();
    }
    onRequestedRunsChanged: scheduleLayoutCheck()
    onBaseFontChanged: scheduleLayoutCheck()
    function updateWordStates() {
        if (!layoutAccepted || configs.wordConfigs.length !== words.length)
            return;
        const previous = wordTransitions;
        wordTransitions = words.map((word, index) => {
            const state = Motion.wordState(word, timeSeconds, profile);
            const old = previous[index];
            if (old && old.state === state)
                return old;
            const config = configs.wordConfigs[index];
            const origin = old ? Motion.wordUiPose(word, config, _previousTime, profile, enteredAt, settings, motionEnabled, old, presentationSeconds) : Motion.wordPose(word, config, word.startTime - profile.wordLookahead - 1, profile, enteredAt, settings, true);
            const previousAt = Math.max(old ? old.at : presentationSeconds, _previousPresentationSeconds);
            const previousPose = old && _previousPresentationSeconds >= 0 ? Motion.wordUiPose(word, config, _previousTime, profile, enteredAt, settings, motionEnabled, old, previousAt) : origin;
            return Motion.wordTransition(state, presentationSeconds, origin, previousPose, previousAt, old ? old.velocity : null);
        });
        _previousTime = timeSeconds;
    }
    onTimeSecondsChanged: updateWordStates()
    onWordsChanged: {
        wordTransitions = [];
        if (_completed)
            wordStateCheck.restart();
    }
    Component.onCompleted: {
        _completed = true;
        _lastPresentationSeconds = presentationSeconds;
        scheduleLayoutCheck();
        updateWordStates();
    }
    Component.onDestruction: {
        _completed = false;
        layoutCheck.stop();
        wordStateCheck.stop();
    }
    Timer {
        id: layoutCheck
        interval: 0
        onTriggered: if (lineRoot._completed)
            lineRoot.reconcileLayout()
    }
    Timer {
        id: wordStateCheck
        interval: 0
        onTriggered: if (lineRoot._completed)
            lineRoot.updateWordStates()
    }

    width: Math.max(0, Math.min(1152, viewportWidth - 64))
    height: geometry.height
    opacity: lineMotion.opacity
    scale: lineMotion.scale
    transformOrigin: Item.Center

    GlyphRun {
        id: glyph
        objectName: "classicGlyphRun"
        anchors.fill: parent
        opacity: lineRoot.layoutAccepted ? 1 : 0
        font: lineRoot.baseFont
        runs: lineRoot.requestedRuns
        onLayoutChanged: lineRoot.scheduleLayoutCheck()
        onErrorChanged: if (errorString) {
            lineRoot.layoutError = errorString;
            lineRoot.scheduleLayoutCheck();
        }
    }
    Binding {
        target: glyph
        property: "poses"
        when: lineRoot.layoutAccepted
        restoreMode: Binding.RestoreNone
        value: lineRoot.layoutAccepted ? Model.framePoses(lineRoot.words, lineRoot.acceptedMetrics, lineRoot.clusters, lineRoot.geometry.words, lineRoot.configs.wordConfigs, lineRoot.timeSeconds, lineRoot.profile, lineRoot.enteredAt, lineRoot.settings, lineRoot.primaryColor, lineRoot.activeColors, lineRoot.lineMotion.blur, lineRoot.motionEnabled, value => Qt.rgba(value.r, value.g, value.b, value.a), lineRoot.wordTransitions, lineRoot.presentationSeconds) : []
    }

    Repeater {
        objectName: "classicChorusWords"
        model: lineRoot.layoutAccepted && lineRoot.prepared.line.isChorus && lineRoot.motionEnabled ? lineRoot.words.length : 0
        Item {
            id: chorusWord
            required property int index
            readonly property var word: lineRoot.words[index]
            readonly property var config: lineRoot.configs.wordConfigs[index]
            readonly property var placement: lineRoot.geometry.words[index]
            readonly property var metric: glyph.metrics[index]
            readonly property var body: Motion.wordUiPose(word, config, lineRoot.timeSeconds, lineRoot.profile, lineRoot.enteredAt, lineRoot.settings, true, lineRoot.wordTransitions[index], lineRoot.presentationSeconds)
            readonly property real age: Math.max(0, lineRoot.presentationSeconds - (lineRoot.wordTransitions[index] ? lineRoot.wordTransitions[index].at : lineRoot.presentationSeconds))
            readonly property real progress: Motion.easeOut(age / 0.5)
            // GlowWord samples Math.random once per mounted word, independent of the layout seed.
            readonly property real rippleScale: 1.5 + Math.random() * 2
            visible: metric !== undefined && placement !== undefined && body.state === "active" && age < 0.5
            x: placement ? placement.x + body.x : 0
            y: placement ? placement.y + body.y : 0
            width: metric ? metric.width : 0
            height: metric ? metric.height : 0
            rotation: body.rotation
            scale: body.scale
            transformOrigin: Item.Center
            opacity: body.opacity
            Rectangle {
                anchors.centerIn: parent
                width: lineRoot.pixelSize * 1.22 * 1.5
                height: width
                radius: width / 2
                color: "transparent"
                border.width: 1
                border.color: lineRoot.activeColors[chorusWord.index]
                opacity: 0.8 * (1 - chorusWord.progress)
                scale: 0.2 + (chorusWord.rippleScale - 0.2) * chorusWord.progress
                antialiasing: true
                layer.enabled: visible && GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
                layer.effect: MultiEffect {
                    blurEnabled: true
                    blurMax: 32
                    blur: Math.sqrt(1 + lineRoot.lineMotion.blur * lineRoot.lineMotion.blur) / 32
                }
            }
        }
    }
}
