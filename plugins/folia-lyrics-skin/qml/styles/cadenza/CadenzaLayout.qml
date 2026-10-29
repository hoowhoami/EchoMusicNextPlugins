// Real ICU + WorkerScript pretext preparation, with bounded GUI-native metric batches.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "input.mjs" as Input
import "motion.mjs" as Motion

Item {
    id: root
    property var line: null
    property var prefetchLine: null
    property real viewportWidth: 0
    property real viewportHeight: 0
    property font baseFont
    property var settings: ({})
    property color accentColor: "white"
    property EchoPluginText textService: null
    property bool live: true
    readonly property var tuning: Motion.settings(settings)
    readonly property int fontWeight: typeof settings.fontWeight === "number" ? Math.round(Math.max(100, Math.min(900, settings.fontWeight)) / 10) * 10 : 700
    property var layout: null
    property bool busy: false
    property string errorString: ""
    property int layoutRevision: 0
    property int measurementBatches: 0
    property int _generation: 0
    property bool _ready: false
    property var _worker: null
    property var _pending: null
    property var _operation: null
    property var _pieces: []
    property var _context: null
    property var _jobLine: null
    property string _jobKey: ""
    property bool _working: false
    property var _texts: []
    property var _measurements: []
    property int _cursor: 0
    property var _batch: []
    property var _runs: []
    property real _fontPx: 72
    property bool _measuring: false
    property string _publishedKey: ""
    property string _key: ""
    property var _cache: new Map()
    property int _cacheRevision: 0
    readonly property int cacheSize: {
        const revision = _cacheRevision;
        return _cache.size;
    }
    readonly property bool prefetchReady: {
        const revision = _cacheRevision;
        return prefetchLine !== null && _context !== null && _cache.has(keyFor(prefetchLine));
    }
    signal ready(var result)
    function context(): var {
        return {
            showText: true,
            viewport: {
                width: viewportWidth,
                height: viewportHeight
            },
            theme: {
                fontFamily: baseFont.family,
                fontFamilyStack: [],
                fontWeight: fontWeight,
                animationIntensity: settings.animationIntensity || "normal",
                accentColor: String(accentColor),
                wordColors: settings.wordColors || []
            },
            tuning: {
                fontScale: tuning.fontScale,
                widthRatio: tuning.widthRatio
            }
        };
    }
    function keyFor(value: var): string {
        return JSON.stringify([value, _context]);
    }
    function stopJob(): void {
        ++_generation;
        if (_operation)
            _operation.cancel();
        _operation = null;
        _pending = null;
        prefetchTask.stop();
        piecesTask.stop();
        measurementTask.stop();
        nextMeasurementTask.stop();
        retry.stop();
        step.stop();
        _working = false;
        _measuring = false;
        _runs = [];
        _texts = [];
        _measurements = [];
    }
    function invalidate(clearCache: bool): void {
        if (!_ready)
            return;
        const active = live && viewportWidth > 0 && viewportHeight > 0;
        const nextContext = active ? context() : null;
        const nextKey = active && line ? JSON.stringify([line, nextContext]) : "";
        // Paint-only settings must not restart font work or cancel useful prefetch.
        if (!clearCache && nextKey === _key && (layout || busy))
            return;
        stopJob();
        if (clearCache) {
            _cache.clear();
            ++_cacheRevision;
            _publishedKey = "";
        }
        errorString = "";
        busy = false;
        _context = nextContext;
        _key = nextKey;
        if (!active) {
            layout = null;
            _publishedKey = "";
            if (_worker) {
                _worker.destroy();
                _worker = null;
            }
            return;
        }
        if (!line) {
            layout = null;
            _publishedKey = "";
            schedulePrefetch();
            return;
        }
        if (_key === _publishedKey && layout) {
            schedulePrefetch();
            return;
        }
        layout = null;
        if (_cache.has(_key)) {
            publishCurrent(_cache.get(_key));
            schedulePrefetch();
            return;
        }
        busy = true;
        startJob(line, _key);
    }
    function startJob(value: var, key: string): void {
        _jobLine = JSON.parse(JSON.stringify(value));
        _jobKey = key;
        _working = true;
        if (value.fullText.length > 8192 || value.words.length > 128) {
            fail("Cadenza text exceeds native budget (8192 UTF16 / 128 words)");
            return;
        }
        step.restart();
    }
    function startPrefetch(): void {
        if (!live || _working || !prefetchLine || !_context)
            return;
        const key = keyFor(prefetchLine);
        if (_cache.has(key))
            return;
        ++_generation;
        startJob(prefetchLine, key);
    }
    function fail(message: string): void {
        const wasCurrent = _jobKey === _key;
        _working = false;
        _runs = [];
        _measuring = false;
        if (wasCurrent) {
            busy = false;
            layout = null;
            errorString = message;
        }
    }
    function publishCurrent(result: var): void {
        layout = result;
        busy = false;
        _publishedKey = _key;
        ++layoutRevision;
        ready(result);
    }
    function publish(result: var): void {
        _cache.set(_jobKey, result);
        while (_cache.size > 2) {
            const stale = Array.from(_cache.keys()).find(key => key !== _key && key !== _jobKey);
            _cache.delete(stale === undefined ? _cache.keys().next().value : stale);
        }
        ++_cacheRevision;
        _working = false;
        _runs = [];
        _measuring = false;
        if (_jobKey === _key)
            publishCurrent(result);
        schedulePrefetch();
    }
    function requestPieces(): void {
        if (!_working || !live || _operation)
            return;
        if (!textService || !textService.available) {
            fail("Cadenza requires exact ICU word segmentation");
            return;
        }
        _operation = textService.segmentWords([Input.normalize(_jobLine.fullText)], "");
        if (_operation.state >= EchoPluginOperation.Succeeded)
            schedulePieces();
    }
    function piecesFinished(): void {
        const operation = _operation;
        if (!operation || !_working || !live || operation.state < EchoPluginOperation.Succeeded)
            return;
        _operation = null;
        if (operation.state === EchoPluginOperation.Succeeded) {
            _pieces = JSON.parse(JSON.stringify(operation.result.lines[0]));
            send("discover");
        } else if (operation.errorCode === "Busy")
            retry.restart();
        else
            fail(operation.errorMessage || "Cadenza ICU segmentation canceled");
    }
    function send(phase: string): void {
        _pending = {
            generation: _generation,
            phase: phase,
            line: _jobLine,
            context: JSON.parse(JSON.stringify(_context)),
            pieces: _pieces,
            measurements: _measurements
        };
        if (!_worker)
            _worker = workerComponent.createObject(root);
        flush();
    }
    function flush(): void {
        if (live && _working && _worker && _worker.ready && _pending) {
            const request = _pending;
            _pending = null;
            _worker.sendMessage(request);
        }
    }
    function receive(reply: var): void {
        if (!live || !_working || reply.generation !== _generation)
            return;
        if (reply.error) {
            fail(reply.error);
            return;
        }
        if (reply.phase === "discover") {
            _texts = reply.result.texts;
            _fontPx = reply.result.fontPx;
            _cursor = 0;
            _measurements = [];
            measureNext();
        } else
            publish(reply.result);
    }
    function measureNext(): void {
        if (!_working || !live)
            return;
        if (_cursor >= _texts.length) {
            _runs = [];
            send("complete");
            return;
        }
        _batch = [];
        let units = 0;
        while (_cursor < _texts.length && _batch.length < 64) {
            const text = _texts[_cursor];
            if (_batch.length && units + text.length > 1024)
                break;
            if (text.length > 8192) {
                fail("Cadenza native measurement exceeds UTF16 budget");
                return;
            }
            _batch.push(text);
            units += text.length;
            ++_cursor;
        }
        ++measurementBatches;
        _measuring = true;
        _runs = _batch.map((text, index) => ({
                    key: "m" + _generation + ":" + index,
                    text: text,
                    size: _fontPx,
                    weight: fontWeight,
                    spacing: 0,
                    maxBlur: 0,
                    maxHaloRadius: 0
                }));
        scheduleMeasurements();
    }
    function acceptMeasurements(): void {
        if (!_measuring || !_working || !live)
            return;
        if (measure.errorString) {
            fail(measure.errorString);
            return;
        }
        if (measure.metrics.length !== _batch.length)
            return;
        for (let i = 0; i < _batch.length; i++) {
            if (measure.metrics[i].key !== "m" + _generation + ":" + i)
                return;
            if (!Number.isFinite(measure.metrics[i].advance)) {
                fail("Cadenza requires native text advance metrics");
                return;
            }
            _measurements.push({
                text: _batch[i],
                width: measure.metrics[i].advance
            });
        }
        _measuring = false;
        scheduleMeasureNext();
    }
    onLineChanged: invalidate(false)
    onPrefetchLineChanged: schedulePrefetch()
    onViewportWidthChanged: invalidate(true)
    onViewportHeightChanged: invalidate(true)
    onSettingsChanged: invalidate(false)
    onAccentColorChanged: invalidate(true)
    onBaseFontChanged: invalidate(true)
    onTextServiceChanged: invalidate(true)
    onLiveChanged: invalidate(true)
    Component.onCompleted: {
        _ready = true;
        invalidate(false);
    }
    Component.onDestruction: {
        _ready = false;
        prefetchTask.stop();
        piecesTask.stop();
        measurementTask.stop();
        nextMeasurementTask.stop();
        if (_operation)
            _operation.cancel();
    }
    Timer {
        id: step
        interval: 0
        onTriggered: root.requestPieces()
    }
    Timer {
        id: retry
        interval: 50
        onTriggered: root.requestPieces()
    }
    Connections {
        target: root._operation
        function onCompleted(): void {
            root.piecesFinished();
        }
    }
    Component {
        id: workerComponent
        WorkerScript {
            source: Qt.resolvedUrl("worker.mjs")
            onReadyChanged: root.flush()
            onMessage: messageObject => root.receive(messageObject)
        }
    }
    CadenzaFont {
        id: measureFont
        base: root.baseFont
        pixelSize: Math.round(root._fontPx)
        weight: root.fontWeight
    }
    GlyphRun {
        id: measure
        objectName: "cadenzaMeasure"
        visible: false
        font: measureFont.value
        runs: root._runs
        onLayoutChanged: root.scheduleMeasurements()
    }

    // Deferred work belongs to this component and cannot outlive its QML context.
    function schedulePrefetch(): void {
        if (_ready)
            prefetchTask.restart();
    }
    Timer {
        id: prefetchTask
        interval: 0
        onTriggered: if (root._ready)
            root.startPrefetch()
    }
    function schedulePieces(): void {
        if (_ready)
            piecesTask.restart();
    }
    Timer {
        id: piecesTask
        interval: 0
        onTriggered: if (root._ready)
            root.piecesFinished()
    }
    function scheduleMeasurements(): void {
        if (_ready)
            measurementTask.restart();
    }
    Timer {
        id: measurementTask
        interval: 0
        onTriggered: if (root._ready)
            root.acceptMeasurements()
    }
    function scheduleMeasureNext(): void {
        if (_ready)
            nextMeasurementTask.restart();
    }
    Timer {
        id: nextMeasurementTask
        interval: 0
        onTriggered: if (root._ready)
            root.measureNext()
    }
}
