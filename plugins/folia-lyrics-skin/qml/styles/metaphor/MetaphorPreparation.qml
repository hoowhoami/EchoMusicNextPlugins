pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "model.mjs" as Model

Item {
    id: root
    property var input: null
    property font baseFont
    property int weight: 300
    property bool live: true
    property var model: null
    property int revision: 0
    property string errorString: ""
    property var _keys: []
    property var _metrics: ({})
    property int _rounds: 0
    readonly property bool busy: live && input !== null && model === null && !errorString
    readonly property var noteFont: Qt.font({
        families: ["Cambria Math", "STIX Two Math", "Cambria", "Georgia", "Times New Roman", "serif"],
        pixelSize: 72,
        weight: 500,
        italic: true
    })
    function restart(): void {
        model = null;
        errorString = "";
        _keys = [];
        _metrics = {};
        _rounds = 0;
        if (live && input)
            work.restart();
    }
    function runs(note: bool): var {
        return _keys.filter(key => key.startsWith('\u0001') === note).map(key => ({
                    key,
                    text: note ? key.slice(1) : key,
                    size: 72,
                    weight: note ? 500 : weight,
                    maxBlur: 0,
                    maxHaloRadius: 0
                }));
    }
    function accept(): void {
        if (!live || !input || model || errorString)
            return;
        const map = Object.assign({}, _metrics);
        for (const metric of Array.from(lyrics.metrics).concat(Array.from(notes.metrics)))
            map[metric.key] = {
                width: metric.advance
            };
        _metrics = map;
        work.restart();
    }
    function prepare(): void {
        if (!live || !input || model || errorString)
            return;
        try {
            const result = Model.buildSet(input, _metrics);
            if (!result.queries.length) {
                model = result;
                ++revision;
                return;
            }
            const added = result.queries.filter(key => !_keys.includes(key));
            if (!added.length)
                return;
            if (++_rounds > 16)
                throw Error("Metaphor native text preparation did not converge");
            const keys = _keys.concat(added);
            if (keys.filter(key => key.startsWith('\u0001')).length > 128 || keys.filter(key => !key.startsWith('\u0001')).length > 128)
                throw Error("Metaphor native measurement budget exceeded");
            _keys = keys;
        } catch (error) {
            errorString = String(error.message || error);
        }
    }
    GlyphRun {
        id: lyrics
        width: 1
        height: 1
        visible: root.live
        font: root.baseFont
        measurementOnly: true
        runs: root.live ? root.runs(false) : []
        onLayoutChanged: root.accept()
    }
    GlyphRun {
        id: notes
        width: 1
        height: 1
        visible: root.live
        font: root.noteFont
        measurementOnly: true
        runs: root.live ? root.runs(true) : []
        onLayoutChanged: root.accept()
    }
    Timer {
        id: work
        interval: 0
        onTriggered: root.prepare()
    }
    onInputChanged: restart()
    onBaseFontChanged: restart()
    onWeightChanged: restart()
    onLiveChanged: restart()
    Component.onCompleted: restart()
    Component.onDestruction: work.stop()
}
