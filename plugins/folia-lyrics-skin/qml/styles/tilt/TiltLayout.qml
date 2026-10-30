// Native, generation-local preparation of Folia's fragment split and measured layout.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "kernel.mjs" as Kernel
import "fragments.mjs" as Fragments

Item {
    id: root
    property var line: null
    property var settings: ({})
    property font baseFont
    property real viewportWidth: 1200
    property EchoPluginText textService: null
    property bool live: true
    readonly property var tuning: Kernel.resolveSettings(settings)
    readonly property real measureSize: Kernel.measureFontSize(viewportWidth, tuning.lyricsFontScale)
    readonly property int cacheSize: _cacheSize
    property int requestCount: 0
    property int layoutRevision: 0
    property var layout: null
    property string errorString: ""
    property bool busy: false
    property var _cache: new Fragments.FragmentCache()
    property int _cacheSize: 0
    property var _widths: ({})
    property var _normalRuns: []
    property var _italicRuns: []
    property var _measureBatch: []
    property int _measureGeneration: -1
    property bool _measuring: false
    property var _operation: null
    property var _batch: []
    property int _requestGeneration: -1
    property bool _completed: false
    signal ready(var result)

    function invalidate(): void {
        if (!_completed)
            return;
        _cache.invalidate();
        if (_operation)
            _operation.cancel();
        _operation = null;
        measurementTask.stop();
        fragmentTask.stop();
        retry.stop();
        prepare.stop();
        _cacheSize = 0;
        _widths = ({});
        _normalRuns = [];
        _italicRuns = [];
        _measureBatch = [];
        _measuring = false;
        layout = null;
        errorString = "";
        busy = live && line !== null && viewportWidth > 0;
        if (busy)
            prepare.restart();
    }
    function fail(message: string): void {
        busy = false;
        layout = null;
        errorString = message;
        _normalRuns = [];
        _italicRuns = [];
        _measuring = false;
    }
    function plan(): void {
        if (!busy || !live || !line || _operation || _measuring)
            return;
        if (line.fullText.length > 8192) {
            fail(qsTr("倾诉歌词超过原生字形的单行容量"));
            return;
        }
        const measurements = [];
        let result;
        try {
            result = _cache.plan(line.fullText, line.startTime, tuning, viewportWidth, (text, italic, size) => {
                const key = (italic ? "i:" : "n:") + text;
                if (_widths[key] !== undefined)
                    return _widths[key];
                if (!measurements.some(item => item.key === key))
                    measurements.push({
                        key: key,
                        text: text,
                        italic: italic,
                        size: size
                    });
                return 0;
            });
        } catch (error) {
            fail(String(error.message || error));
            return;
        }
        if (result.requests.length) {
            _batch = result.requests;
            requestFragments();
            return;
        }
        if (measurements.length) {
            // Native GlyphRun has an 8192 UTF16 total input budget per item.
            // Replanning fills the remaining widths without retaining extra masks.
            const selected = [];
            let units = 0;
            for (const item of measurements) {
                if (selected.length >= 64 || units + item.text.length > 8192)
                    break;
                selected.push(item);
                units += item.text.length;
            }
            _measureBatch = selected;
            _measureGeneration = _cache.generation;
            _measuring = true;
            _normalRuns = selected.filter(item => !item.italic).map((item, index) => ({
                        key: "n" + index,
                        text: item.text,
                        size: item.size,
                        maxBlur: 0,
                        maxHaloRadius: 0
                    }));
            _italicRuns = selected.filter(item => item.italic).map((item, index) => ({
                        key: "i" + index,
                        text: item.text,
                        size: item.size,
                        maxBlur: 0,
                        maxHaloRadius: 0
                    }));
            scheduleMeasurements();
            return;
        }
        layout = result.layout;
        ++layoutRevision;
        busy = false;
        _normalRuns = [];
        _italicRuns = [];
        ready(layout);
    }
    function requestFragments(): void {
        if (!busy || !live)
            return;
        if (!textService || !textService.available) {
            fail(qsTr("倾诉片段切分需要宿主真实 ICU 分词能力"));
            return;
        }
        _requestGeneration = _cache.generation;
        const operation = textService.segmentWords(_batch, "");
        _operation = operation;
        ++requestCount;
        if (_operation === operation && operation.state >= EchoPluginOperation.Succeeded)
            scheduleFragments();
    }
    function fragmentsFinished(): void {
        const operation = _operation;
        if (!operation || !busy || !live || _requestGeneration !== _cache.generation)
            return;
        _operation = null;
        if (operation.state === EchoPluginOperation.Succeeded) {
            try {
                if (!_cache.accept(_requestGeneration, _batch, JSON.parse(JSON.stringify(operation.result.lines))))
                    return;
                _cacheSize = _cache.size;
                prepare.restart();
            } catch (error) {
                fail(String(error.message || error));
            }
        } else if (operation.errorCode === "Busy") {
            retry.restart();
        } else {
            fail(operation.errorMessage || qsTr("倾诉片段分词已取消"));
        }
    }
    function acceptMeasurements(): void {
        if (!_measuring || !busy || !live || _measureGeneration !== _cache.generation)
            return;
        if (normalMeasure.errorString || italicMeasure.errorString) {
            fail(normalMeasure.errorString || italicMeasure.errorString);
            return;
        }
        let normal = 0;
        let italic = 0;
        for (const item of _measureBatch) {
            const metric = item.italic ? italicMeasure.metrics[italic++] : normalMeasure.metrics[normal++];
            if (!metric)
                return;
            _widths[item.key] = metric.width;
        }
        _measuring = false;
        prepare.restart();
    }
    onLineChanged: invalidate()
    onTuningChanged: invalidate()
    onBaseFontChanged: invalidate()
    onViewportWidthChanged: invalidate()
    onTextServiceChanged: invalidate()
    onLiveChanged: invalidate()
    Component.onCompleted: {
        _completed = true;
        invalidate();
    }
    Component.onDestruction: {
        _completed = false;
        measurementTask.stop();
        fragmentTask.stop();
        if (_operation)
            _operation.cancel();
    }
    Timer {
        id: prepare
        interval: 0
        onTriggered: root.plan()
    }
    Timer {
        id: retry
        interval: 50
        onTriggered: root.requestFragments()
    }
    Connections {
        target: root._operation
        function onCompleted(): void {
            root.fragmentsFinished();
        }
    }
    TiltFont {
        id: normalFont
        base: root.baseFont
        pixelSize: Math.round(root.measureSize)
        weight: root.tuning.fontWeight === null ? 400 : root.tuning.fontWeight
    }
    TiltFont {
        id: italicFont
        base: root.baseFont
        pixelSize: Math.round(root.measureSize)
        weight: root.tuning.fontWeight === null ? 300 : root.tuning.fontWeight
        italic: true
    }
    GlyphRun {
        id: normalMeasure
        objectName: "tiltNormalMeasure"
        opacity: 0
        font: normalFont.value
        runs: root._normalRuns
        onLayoutChanged: root.scheduleMeasurements()
    }
    GlyphRun {
        id: italicMeasure
        objectName: "tiltItalicMeasure"
        opacity: 0
        font: italicFont.value
        runs: root._italicRuns
        onLayoutChanged: root.scheduleMeasurements()
    }

    // Deferred work belongs to this component and cannot outlive its QML context.
    function scheduleMeasurements(): void {
        if (_completed)
            measurementTask.restart();
    }
    Timer {
        id: measurementTask
        interval: 0
        onTriggered: if (root._completed)
            root.acceptMeasurements()
    }
    function scheduleFragments(): void {
        if (_completed)
            fragmentTask.restart();
    }
    Timer {
        id: fragmentTask
        interval: 0
        onTriggered: if (root._completed)
            root.fragmentsFinished()
    }
}
