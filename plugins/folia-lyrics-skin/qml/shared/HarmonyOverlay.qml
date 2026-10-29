// One shared source Harmony overlay. The caller supplies the existing presentation clock.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "harmony"
import "harmony/index.mjs" as Index
import "harmony/kernel.mjs" as Kernel
import "harmony/paint.mjs" as Paint

Item {
    id: root
    property var vocalIndex: null
    property real timeSeconds: 0
    property var settings: ({})
    property font baseFont
    property font translationFont: baseFont
    property EchoPluginText textService: null
    property color accentColor: "white"
    property color secondaryColor: "#cccccc"
    property color backgroundColor: "#111111"
    property bool live: true
    property bool motionEnabled: true
    readonly property bool enabledBySettings: settings.showText !== false && settings.showHarmonySubtitle !== false
    readonly property var snapshot: live && enabledBySettings ? Index.indexedHarmonySnapshot(vocalIndex, timeSeconds) : ({
            signature: "",
            lines: []
        })
    readonly property int activeCount: snapshot.lines.length
    readonly property string activeKey: snapshot.lines.map(entry => entry.key).join("\n")
    readonly property var geometry: Kernel.harmonyGeometry(width, settings.subtitleFontScale || 1, settings.harmonySubtitleBackground !== false)
    readonly property var effectiveSettings: settings.subtitleFontInheritsLyrics === false ? settings : Object.assign({}, settings, {
        subtitleFontWeight: settings.fontWeight
    })
    readonly property real enteredOpacity: contents.opacity
    readonly property var actors: _actors
    readonly property bool preparationActive: preparation.live && preparation._worker !== null
    readonly property bool busy: preparation.busy
    readonly property int shapingRevision: preparation.revision
    readonly property real cacheBytes: {
        let bytes = background.cacheBytes;
        for (const actor of _actors)
            bytes += actor.cacheBytes;
        return bytes;
    }
    readonly property string errorString: {
        if (_error)
            return _error;
        if (preparation.errorString)
            return preparation.errorString;
        if (background.errorString)
            return background.errorString;
        for (const actor of _actors)
            if (actor.errorString)
                return actor.errorString;
        return "";
    }
    property var _entries: []
    property var _actors: []
    property var _cache: new Map()
    property var _requests: []
    property font _layoutFont
    property var _layoutSettings: ({})
    property real _layoutViewportWidth: 1100
    property string _error: ""
    property bool _completed: false
    property bool _present: false
    function retire() {
        exit.stop();
        paintLater.stop();
        budgetCheck.stop();
        _entries = [];
        _requests = [];
        _cache.clear();
        for (const actor of _actors)
            actor.destroy();
        _actors = [];
        _present = false;
    }
    function sync() {
        if (!_completed)
            return;
        if (!live) {
            retire();
            return;
        }
        const next = snapshot.lines;
        _error = "";
        let units = 0;
        for (const entry of next)
            units += entry.vocal.text.length + (settings.hideTranslationSubtitle ? 0 : (Kernel.resolveHarmonyAlternateText(entry.vocal, settings.subtitleContentMode, settings.showSubtitleTranslation !== false) || "").length);
        if (next.length > 32 || units > 16384) {
            _error = "Active Harmony voices exceed the 32 voice / 16384 UTF16 render budget";
            retire();
            return;
        }
        if (!next.length) {
            _requests = [];
            _present = false;
            if (motionEnabled && _actors.length)
                exit.restart();
            else
                retire();
            return;
        }
        exit.stop();
        _entries = next;
        _present = true;
        _requests = next.map(entry => entry.vocal);
        for (const key of Array.from(_cache.keys()))
            if (!next.some(entry => Paint.voiceKey(entry.vocal) === key))
                _cache.delete(key);
        paintLater.restart();
    }
    function publish() {
        if (!_completed || !live)
            return;
        if (preparation.busy) {
            const retained = _actors.filter(actor => _entries.some(entry => entry.key === actor.objectName));
            for (const actor of _actors)
                if (retained.indexOf(actor) < 0)
                    actor.destroy();
            _actors = retained;
            relayout();
            return;
        }
        if (!preparation.busy && preparation.result.length === _requests.length) {
            _layoutFont = baseFont;
            _layoutSettings = effectiveSettings;
            _layoutViewportWidth = width;
            for (const item of preparation.result)
                _cache.set(Paint.voiceKey(item.vocal), item);
        }
        const next = [];
        for (const entry of _entries) {
            const prepared = _cache.get(Paint.voiceKey(entry.vocal));
            if (!prepared)
                continue;
            let actor = _actors.find(item => item.objectName === entry.key);
            if (!actor)
                actor = lineComponent.createObject(column, {
                    objectName: entry.key,
                    prepared
                });
            else
                actor.prepared = prepared;
            if (actor)
                next.push(actor);
            else
                _error = "Cannot create native Harmony voice";
        }
        for (const actor of _actors)
            if (next.indexOf(actor) < 0)
                actor.destroy();
        _actors = next;
        relayout();
    }
    function relayout() {
        let widest = 0, height = 0;
        for (const actor of _actors)
            widest = Math.max(widest, actor.width);
        for (const actor of _actors) {
            actor.x = (widest - actor.width) / 2;
            actor.y = height;
            height += actor.height + 6;
        }
        column.width = widest;
        column.height = Math.max(0, height - 6);
    }
    onCacheBytesChanged: if (cacheBytes > 128 * 1024 * 1024)
        budgetCheck.restart()
    Timer {
        id: budgetCheck
        interval: 0
        onTriggered: {
            if (root.cacheBytes > 128 * 1024 * 1024) {
                root._error = "Harmony render resources exceed 128MiB";
                root.retire();
            }
        }
    }
    onActiveKeyChanged: sync()
    onVocalIndexChanged: sync()
    onSettingsChanged: sync()
    onLiveChanged: sync()
    onEnabledBySettingsChanged: sync()
    onBaseFontChanged: {
        _cache.clear();
        paintLater.restart();
    }
    onTranslationFontChanged: paintLater.restart()
    Component.onCompleted: {
        _completed = true;
        sync();
    }
    Component.onDestruction: {
        _completed = false;
        retire();
    }
    Timer {
        id: paintLater
        interval: 0
        onTriggered: root.publish()
    }
    Timer {
        id: exit
        interval: 200
        onTriggered: root.retire()
    }
    HarmonyPreparation {
        id: preparation
        items: root._requests
        baseFont: root.baseFont
        fontPx: root.geometry.measureFontPx
        fontWeight: Number.isFinite(root.effectiveSettings.subtitleFontWeight) ? root.effectiveSettings.subtitleFontWeight : 500
        textService: root.textService
        live: root.live && root.enabledBySettings
        onResultChanged: paintLater.restart()
        onBusyChanged: if (!busy)
            paintLater.restart()
    }
    Item {
        id: contents
        y: root.geometry.top + (root._present ? 0 : -12)
        width: parent.width
        opacity: root._present ? 1 : 0
        Behavior on opacity {
            NumberAnimation {
                duration: root.motionEnabled ? 200 : 0
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0, 0, .58, 1, 1, 1]
            }
        }
        Behavior on y {
            NumberAnimation {
                duration: root.motionEnabled ? 200 : 0
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0, 0, .58, 1, 1, 1]
            }
        }
        Item {
            id: box
            anchors.horizontalCenter: parent.horizontalCenter
            width: column.width + 2 * root.geometry.paddingX
            height: column.height + 2 * root.geometry.paddingY
            HarmonyBackground {
                id: background
                x: -40
                y: -24
                width: box.width + 80
                height: box.height + 48
                backgroundColor: root.backgroundColor
                live: root.live && root._actors.length > 0 && root.settings.harmonySubtitleBackground !== false
            }
            Item {
                id: column
                x: root.geometry.paddingX
                y: root.geometry.paddingY
            }
        }
    }
    Component {
        id: lineComponent
        HarmonyLine {
            settings: Object.assign({}, root.effectiveSettings, {
                subtitleFontScale: root._layoutSettings.subtitleFontScale,
                subtitleFontWeight: root._layoutSettings.subtitleFontWeight
            })
            baseFont: root._layoutFont
            translationFont: root.translationFont
            viewportWidth: root._layoutViewportWidth
            availableWidth: Math.max(1, Math.min(896, root.width - 40 - 2 * root.geometry.paddingX))
            timeSeconds: root.timeSeconds
            accentColor: root.accentColor
            secondaryColor: root.secondaryColor
            live: root.live
            motionEnabled: root.motionEnabled
            onHeightChanged: root.relayout()
            onWidthChanged: root.relayout()
        }
    }
}
