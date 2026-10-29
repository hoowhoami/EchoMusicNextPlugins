// Rasterize each original Canvas text program once, then share its complete image slices.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../sonnet" as Sonnet

Item {
    id: root
    required property var texture
    property font baseFont
    property bool live: true
    readonly property var output: ready ? capture.item : null
    readonly property bool ready: _accepted && _baked && _error.length === 0 && capture.item !== null
    readonly property string errorString: _error
    readonly property real nativeCacheBytes: _actors.reduce((sum, actor) => sum + (actor ? actor.cacheBytes : 0), 0)
    readonly property real cacheBytes: nativeCacheBytes + targetBytes
    readonly property int nativeBatchCount: _actors.length
    readonly property var renderers: _actors.slice()
    readonly property real targetBytes: capture.item ? texture.pixelWidth * texture.pixelHeight * 4 : 0
    readonly property var measuredMetrics: _metrics
    readonly property int preparedBatchCount: _preparedBatchCount
    readonly property int nativeTextureUploads: _preparedUploads
    readonly property int revision: _revision
    property bool _complete: false
    property bool _accepted: false
    property bool _baked: false
    property bool _captureRequested: false
    property bool _primeRequested: false
    property string _error: ""
    property string _fontFamily: ""
    property var _runs: []
    property var _commands: []
    property var _actors: []
    property var _metrics: []
    property int _preparedBatchCount: 0
    property int _preparedUploads: 0
    property int _groupRunLimit: 128
    property bool _resetting: false
    readonly property real _devicePixelRatio: Screen.devicePixelRatio
    property int _generation: 0
    property int _revision: 0
    width: texture.width || 0
    height: texture.height || 0
    function prepare() {
        if (!_complete)
            return;
        _primeRequested = false;
        _captureRequested = false;
        _baked = false;
        _metrics = [];
        _preparedBatchCount = 0;
        _preparedUploads = 0;
        clearPool();
        _groupRunLimit = 128;
        ++_generation;
        _accepted = false;
        _error = "";
        _runs = [];
        _commands = [];
        try {
            if (texture.pixelWidth > 8192 || texture.pixelHeight > 8192 || texture.pixelWidth <= 0 || texture.pixelHeight <= 0)
                throw new Error('Lumiere glyph texture extent exceeded');
            if (texture.pixelWidth * texture.pixelHeight * 4 > 128 * 1024 * 1024)
                throw new Error('Lumiere glyph texture target exceeds 128MiB');
            const commands = texture.commands, runs = [];
            let fontSpec = "", units = 0;
            for (let i = 0; i < commands.length; i++) {
                const command = commands[i], style = command.style;
                if (command.kind !== 'text' || style.globalCompositeOperation !== 'source-over' || !['middle', 'alphabetic'].includes(style.textBaseline))
                    throw new Error('Unsupported Lumiere source text program');
                if (fontSpec && fontSpec !== style.font)
                    throw new Error('Lumiere texture font family must stay uniform');
                fontSpec = style.font;
                const match = /^(?:normal normal )?(\d+) ([\d.]+)px (.+)$/.exec(fontSpec);
                if (!match)
                    throw new Error('Invalid Lumiere source font');
                _fontFamily = match[3];
                const matrix = style.matrix, resolution = texture.resolution;
                if (matrix[0] !== resolution || matrix[4] !== resolution || matrix[1] !== 0 || matrix[2] !== 0 || matrix[3] !== 0 || matrix[5] !== 0)
                    throw new Error('Unsupported Lumiere source text transform');
                units += command.text.length;
                runs.push({
                    key: 'g' + _generation + ':' + i,
                    text: command.text,
                    size: Number(match[2]),
                    weight: Number(match[1]),
                    spacing: 0,
                    strokeWidth: command.stroke ? style.lineWidth : 0,
                    strokeBitmap: command.stroke ? 'fill' : 'reject',
                    maxBlur: 0,
                    maxHaloRadius: 0
                });
            }
            if (!runs.length || runs.length > 128 || units > 8192)
                throw new Error('Lumiere glyph texture exceeds native run budget');
            _commands = commands;
            _runs = runs;
            completion.restart();
        } catch (error) {
            _error = String(error.message || error);
        }
    }
    function clearPool() {
        completion.stop();
        _resetting = true;
        const retired = _actors;
        _actors = [];
        for (const actor of retired) {
            if (!actor)
                continue;
            // Release CPU pages now; queued QObject destruction must not retain
            // the previous source's native atlas until a later event turn.
            actor.visible = false;
            actor.poses = [];
            actor.runs = [];
            actor.destroy();
        }
        _resetting = false;
        completion.stop();
    }
    function fail(message) {
        _accepted = false;
        _primeRequested = false;
        _captureRequested = false;
        _baked = false;
        _metrics = [];
        clearPool();
        _error = message;
    }
    function isGroupBudgetError(message) {
        return message === 'Glyph masks exceed the eight-page texture budget' || message === 'Glyph masks exceed the 32 MiB ink texture budget' || message === 'Too many shaped fragments (maximum 2048)';
    }
    function accept() {
        if (!_complete || !live || !visible || !contents.item || _error.length || !_runs.length || _baked)
            return;
        const targetBytes = texture.pixelWidth * texture.pixelHeight * 4;
        for (const renderer of _actors) {
            if (renderer.errorString) {
                const count = renderer.lastCommand - renderer.firstCommand;
                if (isGroupBudgetError(renderer.errorString) && count > 1) {
                    // Split only between original Canvas draw commands. Every
                    // run retains its complete original shaping context.
                    _accepted = false;
                    _groupRunLimit = Math.max(1, Math.floor(count / 2));
                    clearPool();
                    completion.restart();
                    return;
                }
                fail(renderer.errorString);
                return;
            }
            if (renderer.metrics.length !== renderer.lastCommand - renderer.firstCommand)
                return;
            if (renderer.published)
                continue;
            const poses = [];
            for (let index = renderer.firstCommand; index < renderer.lastCommand; index++) {
                const metric = renderer.metrics[index - renderer.firstCommand], command = _commands[index];
                if (metric.key !== _runs[index].key)
                    return;
                if (!Number.isFinite(metric.emAscent) || !Number.isFinite(metric.emDescent)) {
                    fail('Lumiere requires primary-font em metrics');
                    return;
                }
                poses.push({
                    key: metric.key,
                    x: command.x,
                    y: command.y + (command.style.textBaseline === 'middle' ? (metric.emAscent - metric.emDescent) / 2 : 0) - metric.baseline,
                    opacity: command.style.globalAlpha,
                    color: command.stroke ? command.style.strokeStyle : command.style.fillStyle
                });
            }
            renderer.poses = poses;
            if (renderer.errorString) {
                fail(renderer.errorString);
                return;
            }
            renderer.published = true;
        }
        if (nativeCacheBytes + targetBytes > 128 * 1024 * 1024) {
            fail('Lumiere glyph pool and target exceed 128MiB');
            return;
        }
        const first = _actors.length ? _actors[_actors.length - 1].lastCommand : 0;
        if (first < _runs.length) {
            const last = Math.min(_runs.length, first + _groupRunLimit), renderer = batchComponent.createObject(contents.item, {
                firstCommand: first,
                lastCommand: last
            });
            if (!renderer) {
                fail('Lumiere native glyph batch creation failed');
                return;
            }
            // The component's font/window initialization must finish first;
            // assigning runs as an initial property can reject at DPR2 and
            // then have the initial empty-layout font update clear that error.
            renderer.runs = _runs.slice(first, last);
            // At most one native allocation per event turn. Rejected candidates
            // are split before any subsequent allocation or texture publication.
            _actors = _actors.concat([renderer]);
            completion.restart();
            return;
        }
        if (!_accepted) {
            _accepted = true;
            _captureRequested = true;
            _primeRequested = true;
            for (const renderer of _actors)
                renderer.opacity = 1;
        }
    }
    function finishBake(source, generation) {
        if (!_complete || !live || !visible || source !== capture.item || generation !== _generation || !_accepted || _baked)
            return;
        _metrics = _actors.reduce((all, actor) => all.concat(JSON.parse(JSON.stringify(actor.metrics))), []);
        _preparedBatchCount = _actors.length;
        _preparedUploads = _actors.reduce((sum, actor) => sum + actor.textureUploads, 0);
        // A source Canvas becomes one immutable texture. The completed GPU
        // image survives live=false; its shaping atlas is preparation scratch.
        _primeRequested = false;
        _baked = true;
        clearPool();
        ++_revision;
    }
    onTextureChanged: prepare()
    onBaseFontChanged: prepare()
    onLiveChanged: {
        if (!live) {
            _accepted = false;
            _primeRequested = false;
            _captureRequested = false;
            _baked = false;
            _metrics = [];
            clearPool();
        } else
            prepare();
    }
    onVisibleChanged: {
        if (!visible) {
            _accepted = false;
            _primeRequested = false;
            _captureRequested = false;
            _baked = false;
            _metrics = [];
            clearPool();
        } else
            prepare();
    }
    on_DevicePixelRatioChanged: prepare()
    Component.onCompleted: {
        _complete = true;
        prepare();
    }
    Component.onDestruction: {
        _complete = false;
        _primeRequested = false;
        _captureRequested = false;
        clearPool();
    }
    Timer {
        id: completion
        objectName: "lumiereGlyphCompletion"
        interval: 0
        onTriggered: if (root._complete)
            root.accept()
    }
    Sonnet.SonnetFont {
        id: sourceFont
        base: root.baseFont
        familyStack: root._fontFamily
    }
    Loader {
        id: contents
        active: root.live && root.visible && root._error.length === 0
        onLoaded: if (root._complete)
            completion.restart()
        sourceComponent: Item {
            width: root.width
            height: root.height
        }
    }
    Component {
        id: batchComponent
        GlyphRun {
            property int firstCommand: 0
            property int lastCommand: 0
            property bool published: false
            // Preparation masks remain invisible until hideSource's capture
            // exists. Opacity does not suppress native CPU atlas validation.
            opacity: 0
            width: root.width
            height: root.height
            font: sourceFont.value
            // Sibling insertion order is the original source-over paint order.
            onLayoutChanged: if (root._complete && !root._resetting)
                completion.restart()
            onErrorStringChanged: if (root._complete && !root._resetting && errorString.length)
                completion.restart()
        }
    }

    Loader {
        id: capture
        active: root.live && root.visible && root._captureRequested
        onLoaded: item.scheduleUpdate()
        sourceComponent: ShaderEffectSource {
            readonly property int generation: root._generation
            sourceItem: contents.item
            sourceRect: Qt.rect(0, 0, root.width, root.height)
            textureSize: Qt.size(root.texture.pixelWidth, root.texture.pixelHeight)
            hideSource: true
            smooth: true
            visible: false
            live: false
            onScheduledUpdateCompleted: root.finishBake(this, generation)
        }
    }
    Loader {
        // SceneView publishes consumers only after ready. This transparent
        // single pixel keeps the provider in the QSG graph while baking.
        active: root._primeRequested && capture.item !== null
        sourceComponent: ShaderEffect {
            width: 1
            height: 1
            property var source: capture.item
            property real outputAlpha: 0
            fragmentShader: Qt.resolvedUrl('glyph-prime.frag.qsb')
        }
    }
}
