// Folia a8da4437 Partita. Playback, prepared text, backgrounds and subtitles stay caller-owned.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../../shared"
import "layout.mjs" as Layout
import "motion.mjs" as ChunkMotion
import "../classic/motion.mjs" as Glow

Item {
    id: root
    objectName: "foliaPartita"
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: primaryColor
    property bool live: true
    property bool motionEnabled: true
    property bool dark: true
    readonly property var tuning: Layout.resolveSettings(settings)
    readonly property bool textVisible: settings.showText !== false
    readonly property var currentPrepared: preparedLines && currentIndex >= 0 ? plainPrepared(preparedLines[currentIndex]) : null
    readonly property var theme: ({
            animationIntensity: tuning.animationIntensity,
            fontWeight: tuning.fontWeight,
            wordColors: tuning.wordColors,
            accentColor: String(accentColor)
        })
    property var _cache: new Map()
    property var _cacheSources: new Map()
    property int _cacheSize: 0
    property string _preheatedToken: ""
    readonly property int layoutCacheSize: _cacheSize
    readonly property var layout: live && visible && currentPrepared ? layoutFor(currentPrepared.line) : Layout.EMPTY_PARTITA_LAYOUT
    readonly property var chunks: _activeActor ? _activeActor.chunks : []
    readonly property int chunkCount: chunks.length
    readonly property var renderer: _activeActor ? _activeActor.glyphRenderer : null
    readonly property int layerCount: _actors.length
    readonly property string errorString: _activeActor ? _activeActor.errorString : ""
    property var _actors: []
    property var _activeActor: null
    property real _ambientSeconds: 0
    property bool _completed: false
    readonly property var _breathing: live && motionEnabled ? ChunkMotion.breathing(_ambientSeconds, settings) : ({
            y: 0,
            scale: 1
        })
    readonly property var _preparedIndices: preparedLines ? Object.keys(preparedLines).map(Number).filter(index => Number.isInteger(index) && preparedLines[index] && preparedLines[index].line) : []
    clip: true

    // QVariant initial properties can carry Qt sequences rather than JS arrays.
    // Normalize only when an input line changes, before the pure semantic seam.
    function plainPrepared(value) {
        if (!value || !value.line)
            return null;
        const line = value.line;
        if (Array.isArray(line.words) && (!line.autoWordSegments || Array.isArray(line.autoWordSegments)) && (!line.wordSegments || Array.isArray(line.wordSegments)))
            return value;
        return JSON.parse(JSON.stringify(value));
    }
    function layoutFor(line) {
        const key = Layout.buildPartitaLayoutCacheKey(line, theme, height, tuning);
        if (_cacheSources.has(key) && _cacheSources.get(key) !== line)
            _cache.delete(key);
        const result = Layout.getOrBuildPartitaLayout(_cache, line, theme, height, tuning);
        _cacheSources.set(key, line);
        for (const sourceKey of Array.from(_cacheSources.keys()))
            if (!_cache.has(sourceKey))
                _cacheSources.delete(sourceKey);
        _cacheSize = _cache.size;
        return result;
    }
    function preheat(): void {
        if (!_completed || !live || !visible)
            return;
        let next = null;
        for (const index of _preparedIndices) {
            const line = preparedLines[index].line;
            if (line.startTime > timeSeconds && (!next || line.startTime < next.startTime))
                next = line;
        }
        if (next && Layout.shouldPreheat(next.startTime, timeSeconds)) {
            const token = [next.startTime, next.endTime, next.fullText, Math.round(height / 24), tuning.animationIntensity, tuning.fontWeight, tuning.staggerMin, tuning.staggerMax, tuning.useSemanticLayout, tuning.showGuideLines].join("|");
            if (token !== _preheatedToken) {
                const plain = Array.isArray(next.words) && (!next.autoWordSegments || Array.isArray(next.autoWordSegments)) && (!next.wordSegments || Array.isArray(next.wordSegments)) ? next : JSON.parse(JSON.stringify(next));
                layoutFor(plain);
                _preheatedToken = token;
            }
        }
    }
    function clear(): void {
        for (const actor of _actors)
            actor.destroy();
        _actors = [];
        _activeActor = null;
        _cache.clear();
        _cacheSources.clear();
        _cacheSize = 0;
        _preheatedToken = "";
    }
    function sync(): void {
        if (!_completed)
            return;
        if (!live || !visible) {
            clear();
            return;
        }
        const held = [];
        let changed = false;
        for (const actor of _actors) {
            if (actor.leavingAt >= 0 && (!motionEnabled || actor.lineMotion.finished)) {
                actor.destroy();
                changed = true;
            } else
                held.push(actor);
        }
        const next = textVisible ? currentPrepared : null;
        const key = next ? String(currentIndex) + ":" + String(next.line.startTime) + ":" + next.line.fullText : "";
        if (_activeActor && next && _activeActor.sourceKey === key) {
            if (_activeActor.prepared !== next)
                _activeActor.prepared = next;
            if (_activeActor.sequentialLayout !== layout)
                _activeActor.sequentialLayout = layout;
        } else {
            if (_activeActor) {
                if (motionEnabled) {
                    _activeActor.leaveOrigin = _activeActor.lineMotion;
                    _activeActor.hiddenExit = !textVisible;
                    _activeActor.leavingAt = _ambientSeconds;
                } else {
                    held.splice(held.indexOf(_activeActor), 1);
                    _activeActor.destroy();
                }
                _activeActor = null;
                changed = true;
            }
            if (next) {
                const actor = actorComponent.createObject(breathing, {
                    prepared: next,
                    sequentialLayout: layout,
                    sourceKey: key,
                    enteredAt: timeSeconds,
                    enteredPresentationAt: _ambientSeconds
                });
                if (actor) {
                    held.push(actor);
                    _activeActor = actor;
                    changed = true;
                }
            }
        }
        while (held.length > 4) {
            held.shift().destroy();
            changed = true;
        }
        if (changed)
            _actors = held;
    }
    onCurrentPreparedChanged: sync()
    onLayoutChanged: sync()
    onTextVisibleChanged: sync()
    onTimeSecondsChanged: {
        sync();
        preheat();
    }
    onPreparedLinesChanged: {
        _preheatedToken = "";
        if (!preparedLines || !Object.keys(preparedLines).length) {
            _cache.clear();
            _cacheSources.clear();
            _cacheSize = 0;
        }
        sync();
        preheat();
    }
    onLiveChanged: sync()
    onVisibleChanged: sync()
    onMotionEnabledChanged: sync()
    on_AmbientSecondsChanged: sync()
    Component.onCompleted: {
        _completed = true;
        sync();
        preheat();
    }
    Component.onDestruction: clear()
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled
        onTriggered: root._ambientSeconds += frameTime
    }
    Item {
        id: breathing
        anchors.fill: parent
        transform: Translate {
            y: root._breathing.y
        }
        scale: root._breathing.scale
        transformOrigin: Item.Center
    }
    Component {
        id: actorComponent
        PartitaLine {
            settings: root.settings
            baseFont: root.baseFont
            primaryColor: root.primaryColor
            accentColor: root.accentColor
            viewportWidth: root.width
            timeSeconds: root.timeSeconds
            presentationSeconds: root._ambientSeconds
            motionEnabled: root.motionEnabled
            x: (root.width - width) / 2
            y: (root.height - height) / 2
        }
    }
    FoliaFont {
        id: waitingFont
        base: root.baseFont
        pixelSize: Math.round(Layout.emptyFontSize(root.width, root.tuning.lyricsFontScale))
        weight: 400
    }
    FoliaFont {
        id: errorFont
        base: root.baseFont
        pixelSize: 14
        weight: 400
    }
    Text {
        anchors.centerIn: parent
        visible: root.live && root.textVisible && root.currentIndex < 0
        text: qsTr("等待音乐")
        font: waitingFont.value
        color: root.secondaryColor
        opacity: .5
        textFormat: Text.PlainText
    }
    Text {
        objectName: "foliaPartitaError"
        anchors.centerIn: parent
        width: Math.max(0, parent.width - 64)
        visible: root.live && root.errorString.length > 0
        text: root.errorString
        font: errorFont.value
        color: root.secondaryColor
        horizontalAlignment: Text.AlignHCenter
        wrapMode: Text.Wrap
        textFormat: Text.PlainText
    }
}
