// Folia a8da4437 PartitaChunk + shared GlowWord. Stable native masks, frame-only poses.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import EchoMusic.PluginSdk
import "layout.mjs" as Layout
import "motion.mjs" as ChunkMotion
import "../classic/motion.mjs" as Glow
import "../classic/model.mjs" as Model
import "../classic/layout.mjs" as WordColor

Item {
    id: root
    required property var chunk
    required property var prepared
    required property var settings
    required property font baseFont
    required property color primaryColor
    required property color accentColor
    required property real pixelSize
    required property var profile
    required property real timeSeconds
    required property real enteredAt
    required property real presentationSeconds
    required property real enteredPresentationAt
    property real lineBlur: 0
    property bool motionEnabled: true
    readonly property var tuning: Layout.resolveSettings(settings)
    readonly property var glowSettings: ChunkMotion.motionSettings(settings)
    readonly property var words: chunk.displayWords
    readonly property var wordConfigs: Layout.wordConfigs(words, chunk.config, tuning.animationIntensity)
    readonly property var geometry: Layout.chunkGeometry(glyph.metrics, pixelSize)
    readonly property var clusters: glyph.metrics.map((metric, index) => Model.buildClusters(words[index], metric))
    readonly property var activeColors: words.map(word => Qt.color(WordColor.resolveWordColor(word.text, tuning.wordColors, String(accentColor))))
    readonly property color guideActiveColor: Qt.color(WordColor.resolveWordColor(words.map(word => word.text).join(" "), tuning.wordColors, String(accentColor)))
    readonly property bool guideRight: chunk.rowIndex % 2 !== 0
    readonly property var guideGeometry: Layout.guideGeometry(width, height, guideRight)
    readonly property var verticalGuide: vertical
    readonly property var horizontalGuide: horizontal
    readonly property var glyphRenderer: glyph
    property string chunkStatus: "waiting"
    property var chunkTransition: null
    readonly property var chunkPose: ChunkMotion.chunkPose(chunkStatus, chunk.config, presentationSeconds, motionEnabled ? chunkTransition : null, guideRight)
    property real guideFrom: 0
    property real guideAt: enteredPresentationAt
    property bool guideTarget: false
    readonly property real guideValue: motionEnabled ? guideFrom + ((guideTarget ? 1 : 0) - guideFrom) * Glow.easeOut(Math.max(0, presentationSeconds - guideAt) / .4) : guideTarget ? 1 : 0
    readonly property color guideColor: chunkStatus === "active" ? guideActiveColor : Qt.rgba(1, 1, 1, chunkStatus === "passed" ? .22 : .14)
    property var wordTransitions: []
    property real _previousTime: timeSeconds
    property real placementY: 0
    width: geometry.width
    height: geometry.height
    x: ((parent ? parent.width : width) - width) / 2 + chunkPose.x
    y: placementY + chunkPose.y
    opacity: chunkPose.opacity
    scale: chunkPose.scale
    rotation: chunkPose.rotation
    transformOrigin: Item.Center

    function updateStates(): void {
        const state = ChunkMotion.chunkState(chunk.chunkWords, timeSeconds, profile);
        if (state !== chunkStatus) {
            const origin = chunkPose;
            chunkTransition = {
                state: state,
                at: presentationSeconds,
                origin: origin
            };
            chunkStatus = state;
            const next = state !== "waiting";
            if (next !== guideTarget) {
                guideFrom = guideValue;
                guideAt = presentationSeconds;
                guideTarget = next;
            }
        }
        const previous = wordTransitions;
        wordTransitions = words.map((word, index) => {
            const wordState = Glow.wordState(word, timeSeconds, profile);
            const old = previous[index];
            if (old && old.state === wordState)
                return old;
            const config = wordConfigs[index];
            const origin = old ? Glow.wordUiPose(word, config, _previousTime, profile, enteredAt, glowSettings, motionEnabled, old, presentationSeconds) : Glow.wordPose(word, config, word.startTime - profile.wordLookahead - 1, profile, enteredAt, glowSettings, true);
            return {
                state: wordState,
                at: presentationSeconds,
                origin
            };
        });
        _previousTime = timeSeconds;
    }
    onTimeSecondsChanged: updateStates()
    onWordsChanged: {
        wordTransitions = [];
        updateStates();
    }
    Component.onCompleted: updateStates()
    GlyphRun {
        id: glyph
        objectName: "partitaGlyphRun"
        anchors.fill: parent
        font: root.baseFont
        runs: root.words.map((word, index) => ({
                    key: "word-" + index,
                    text: word.text,
                    size: Math.round(root.pixelSize),
                    weight: root.tuning.fontWeight === null ? 700 : root.tuning.fontWeight,
                    maxBlur: 32,
                    maxHaloRadius: 80
                }))
        poses: Model.framePoses(root.words, metrics, root.clusters, root.geometry.words, root.wordConfigs, root.timeSeconds, root.profile, root.enteredAt, root.glowSettings, root.primaryColor, root.activeColors, root.lineBlur, root.motionEnabled, value => Qt.rgba(value.r, value.g, value.b, value.a), root.wordTransitions, root.presentationSeconds)
    }
    Rectangle {
        id: vertical
        objectName: "partitaVerticalGuide"
        visible: root.tuning.showGuideLines
        x: root.guideGeometry.vertical.x
        y: root.guideGeometry.vertical.y
        width: 1
        height: 32
        color: root.guideColor
        opacity: root.guideValue
        transform: Scale {
            origin.x: 0.5
            origin.y: 32
            yScale: root.guideValue
        }
        layer.enabled: (root.chunkStatus === "active" || root.lineBlur > 0) && GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
        layer.effect: MultiEffect {
            blurEnabled: root.lineBlur > 0
            blurMax: 32
            blur: root.lineBlur / 32
            shadowEnabled: root.chunkStatus === "active"
            shadowColor: root.guideActiveColor
            shadowOpacity: 69 / 255
            shadowBlur: Math.sqrt(100 + root.lineBlur * root.lineBlur) / 32
            shadowHorizontalOffset: 0
            shadowVerticalOffset: 0
        }
    }
    Rectangle {
        id: horizontal
        objectName: "partitaHorizontalGuide"
        visible: root.tuning.showGuideLines
        x: root.guideGeometry.horizontal.x
        y: root.guideGeometry.horizontal.y
        width: root.guideGeometry.horizontal.width
        height: 1
        color: root.guideColor
        opacity: root.guideValue
        transform: Scale {
            origin.x: root.guideRight ? horizontal.width : 0
            origin.y: 0.5
            xScale: root.guideValue
        }
        layer.enabled: (root.chunkStatus === "active" || root.lineBlur > 0) && GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
        layer.effect: MultiEffect {
            blurEnabled: root.lineBlur > 0
            blurMax: 32
            blur: root.lineBlur / 32
            shadowEnabled: root.chunkStatus === "active"
            shadowColor: root.guideActiveColor
            shadowOpacity: 53 / 255
            shadowBlur: Math.sqrt(100 + root.lineBlur * root.lineBlur) / 32
            shadowHorizontalOffset: 0
            shadowVerticalOffset: 0
        }
    }
    Repeater {
        objectName: "partitaChorusWords"
        model: root.prepared.line.isChorus && root.motionEnabled ? root.words.length : 0
        Item {
            id: chorusWord
            required property int index
            readonly property var word: root.words[index]
            readonly property var config: root.wordConfigs[index]
            readonly property var placement: root.geometry.words[index]
            readonly property var metric: glyph.metrics[index]
            readonly property var body: Glow.wordUiPose(word, config, root.timeSeconds, root.profile, root.enteredAt, root.glowSettings, true, root.wordTransitions[index], root.presentationSeconds)
            readonly property real age: Math.max(0, root.presentationSeconds - (root.wordTransitions[index] ? root.wordTransitions[index].at : root.presentationSeconds))
            readonly property real progress: Glow.easeOut(age / .5)
            readonly property real rippleScale: 1.5 + Math.random() * 2
            visible: metric !== undefined && placement !== undefined && body.state === "active" && age < .5
            x: placement ? placement.x + body.x : 0
            y: placement ? placement.y + body.y : 0
            width: metric ? metric.width : 0
            height: metric ? metric.height : 0
            rotation: body.rotation
            scale: body.scale
            opacity: body.opacity
            transformOrigin: Item.Center
            Rectangle {
                objectName: "partitaChorusRipple"
                anchors.centerIn: parent
                width: root.pixelSize * 1.22 * 1.5
                height: width
                radius: width / 2
                color: "transparent"
                border.width: 1
                border.color: root.activeColors[chorusWord.index]
                opacity: .8 * (1 - chorusWord.progress)
                scale: .2 + (chorusWord.rippleScale - .2) * chorusWord.progress
                antialiasing: true
                layer.enabled: visible && GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null
                layer.effect: MultiEffect {
                    blurEnabled: true
                    blurMax: 32
                    blur: Math.sqrt(1 + root.lineBlur * root.lineBlur) / 32
                }
            }
        }
    }
}
