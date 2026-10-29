// Folia shared Monet background: immutable pictures + source Layer effect + compositor poses.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import EchoMusic.PluginSdk
import "layer-state.mjs" as Layer
import "source-layer.mjs" as Source
import "presentation.mjs" as Presentation

Item {
    id: root
    property var settings: ({})
    property EchoPluginAssets assetsService: null
    property url coverUrl
    property var customBackgroundImages: []
    property color backgroundColor: '#111111'
    property color primaryColor: 'white'
    property color secondaryColor: '#999999'
    property color accentColor: '#8fb7ff'
    property bool dark: true
    property bool paused: false
    property bool motionEnabled: true
    property bool live: true
    property bool staticMode: false
    property bool transparentBackground: false
    readonly property var tuning: Presentation.resolveMonetBackgroundSettings(settings)
    readonly property var colors: ({
            backgroundColor: Presentation.sourceCssColor(backgroundColor),
            primaryColor: Presentation.sourceCssColor(primaryColor),
            accentColor: Presentation.sourceCssColor(accentColor)
        })
    readonly property var uploaded: customBackgroundImages.length ? {
        id: customBackgroundImages[0].handle || customBackgroundImages[0].id,
        url: String(customBackgroundImages[0].url)
    } : null
    readonly property string sourceKey: Source.resolveMonetSourceUrl(String(coverUrl) || null, uploaded, tuning) || ''
    readonly property bool halfPane: tuning.backgroundLayout === 'half-pane-gradient'
    readonly property real paneWidth: halfPane ? width * Presentation.paneFraction(width) : width
    readonly property real targetOpacity: halfPane ? Presentation.imageOpacity(!dark, tuning) : 1
    readonly property bool pipelinePending: _snapshot.isPipelinePending === true
    readonly property int pictureCount: _actors.length
    readonly property bool driftRunning: drift.animationRunning
    readonly property real reservedTextureBytes: nativePipeline.plannedPainterBytes + _actors.reduce((sum, actor) => sum + actor.plannedBytes, 0)
    readonly property real cacheBytes: nativePipeline.painterBytes + _actors.reduce((sum, actor) => sum + actor.cacheBytes, 0)
    readonly property var pipelineController: nativePipeline
    readonly property string errorString: _error || nativePipeline.errorString || (_actors.map(actor => actor.errorString).find(Boolean) || '')
    readonly property bool renderReady: live && visible && _state !== null && !_publishing && typeof _snapshot.isPipelinePending === 'boolean' && !_failed && !pipelinePending && (transparentBackground || baseGradient.status !== ShaderEffect.Error && readabilityGradient.status !== ShaderEffect.Error) && (transparentBackground || !_shownKey || _actors.some(actor => actor.pictureKey === _shownKey && (actor.ready || actor.errorString.length > 0)))
    property var _state: null
    property var _snapshot: ({})
    property var _actors: []
    property string _stateSource: ''
    property string _shownKey: ''
    property string _error: ''
    property bool _failed: false
    property bool _completed: false
    property bool _awaitingDraw: false
    property bool _publishing: false
    signal pictureDrawn
    clip: true
    function externalChange(): void {
        _failed = false;
        _error = '';
        queueUpdate();
    }
    function queueUpdate(): void {
        if (_completed)
            updateStep.restart();
    }
    function clearPictures(): void {
        const old = _actors;
        _actors = [];
        _shownKey = '';
        for (const actor of old)
            actor.destroy();
    }
    function shutdown(): void {
        updateStep.stop();
        settle.stop();
        settle.callback = null;
        auditStep.stop();
        if (_state)
            _state.dispose();
        _state = null;
        _snapshot = ({});
        _awaitingDraw = false;
        clearPictures();
    }
    function updateState(): void {
        if (!_completed || !live || !visible || _failed || !nativePipeline.pipeline) {
            shutdown();
            return;
        }
        if (!_state || _stateSource !== sourceKey) {
            if (_state)
                _state.dispose();
            _stateSource = sourceKey;
            _state = Layer.createMonetLayerState({
                pipeline: nativePipeline.pipeline,
                setTimeout(callback, delay) {
                    settle.stop();
                    settle.callback = callback;
                    settle.interval = delay;
                    settle.start();
                    return settle;
                },
                clearTimeout(timer) {
                    timer.stop();
                    timer.callback = null;
                },
                onChange: () => root.publish(),
                pictureDrawn: () => {
                    root._awaitingDraw = true;
                    root.tryDrawn();
                }
            });
        }
        try {
            _state.update({
                coverUrl: String(coverUrl) || null,
                monetBackgroundImage: uploaded,
                theme: colors,
                tuning,
                transparentBackground
            });
        } catch (error) {
            _error = String(error.message || error);
        }
        publish();
    }
    function publish(): void {
        if (!_completed || !_state || !live || !visible)
            return;
        _publishing = true;
        try {
            publishFrame();
        } finally {
            _publishing = false;
            tryDrawn();
        }
    }
    function publishFrame(): void {
        if (!_completed || !_state || !live || !visible)
            return;
        _snapshot = _state.snapshot;
        if (transparentBackground) {
            clearPictures();
            return;
        }
        const source = _snapshot.pipelineUrl || _snapshot.sourceUrl;
        if (!source) {
            clearPictures();
            tryDrawn();
            return;
        }
        const key = _snapshot.pictureKey, processed = !!_snapshot.pipelineUrl;
        const size = processed ? {
            width: 1920,
            height: 1080
        } : nativePipeline.sourceDimensions(String(source));
        if (!size)
            return;
        let current = _actors.find(actor => actor.pictureKey === key);
        if (!current) {
            const allocation = Presentation.displayDecodeSize(size.width, size.height, paneWidth, height, Screen.devicePixelRatio).bytes;
            if (reservedTextureBytes + allocation > 128 * 1024 * 1024) {
                _error = 'Monet presentation exceeds the shared 128MiB texture budget';
                _failed = true;
                shutdown();
                return;
            }
            const immediate = _actors.length === 0 || key === _snapshot.firstPicture;
            current = pictureComponent.createObject(pictures, {
                pictureKey: key,
                source,
                sourceWidth: size.width,
                sourceHeight: size.height,
                processed
            });
            if (!current) {
                _error = 'Monet picture component could not be created';
                return;
            }
            const previous = _actors;
            _actors = _actors.concat([current]);
            _shownKey = key;
            current.transition(targetOpacity, immediate);
            for (const actor of previous)
                actor.retire();
            while (_actors.length > 4)
                removePicture(_actors[0]);
        } else {
            _shownKey = key;
            current.revive(targetOpacity);
            for (const actor of _actors)
                if (actor !== current)
                    actor.retire();
        }
        auditStep.restart();
        tryDrawn();
    }
    function removePicture(actor: var): void {
        if (!_actors.includes(actor))
            return;
        _actors = _actors.filter(value => value !== actor);
        actor.destroy();
    }
    function tryDrawn(): void {
        if (_completed && _awaitingDraw && renderReady) {
            _awaitingDraw = false;
            pictureDrawn();
        }
    }
    function audit(): void {
        if (_completed && (cacheBytes > 128 * 1024 * 1024 || reservedTextureBytes > 128 * 1024 * 1024)) {
            _error = 'Monet background exceeds 128MiB texture budget';
            _failed = true;
            shutdown();
        }
    }
    onSettingsChanged: externalChange()
    onCoverUrlChanged: externalChange()
    onCustomBackgroundImagesChanged: externalChange()
    onColorsChanged: externalChange()
    onTransparentBackgroundChanged: externalChange()
    onLiveChanged: {
        if (live)
            queueUpdate();
        else
            shutdown();
    }
    onVisibleChanged: {
        if (visible)
            queueUpdate();
        else
            shutdown();
    }
    onTargetOpacityChanged: if (_completed)
        for (const actor of _actors)
            if (actor.pictureKey === _shownKey)
                actor.transition(targetOpacity, false)
    onReservedTextureBytesChanged: if (_completed)
        audit()
    onCacheBytesChanged: if (_completed)
        auditStep.restart()
    onRenderReadyChanged: tryDrawn()
    Component.onCompleted: {
        _completed = true;
        queueUpdate();
    }
    Component.onDestruction: {
        _completed = false;
        shutdown();
    }
    Timer {
        id: updateStep
        interval: 0
        onTriggered: root.updateState()
    }
    Timer {
        id: auditStep
        interval: 0
        onTriggered: root.audit()
    }
    Timer {
        id: settle
        property var callback: null
        interval: 180
        onTriggered: {
            const fn = callback;
            callback = null;
            if (root._completed && fn)
                fn();
        }
    }
    MonetPipeline {
        id: nativePipeline
        assetsService: root.assetsService
        availableTextureBytes: Math.max(0, 128 * 1024 * 1024 - root._actors.reduce((sum, actor) => sum + actor.plannedBytes, 0))
        active: root.live && root.visible && !root._failed
        onPipelineChanged: root.queueUpdate()
        onSourceDecoded: (source, w, h) => {
            if (source === root.sourceKey)
                root.publish();
        }
    }
    MonetDrift {
        id: drift
        anchors.fill: parent
        live: root.live && !root._failed && !root.transparentBackground
        motionEnabled: root.motionEnabled
        staticMode: root.staticMode
        driftEnabled: root.tuning.backgroundDriftEnabled
        strength: root.tuning.backgroundDriftStrength
    }
    MonetGradient {
        id: baseGradient
        anchors.fill: parent
        visible: !root.transparentBackground
        backgroundColor: root.backgroundColor
        primaryColor: root.primaryColor
        accentColor: root.accentColor
        halfPane: root.halfPane
    }
    Item {
        id: pictures
        width: root.paneWidth
        height: root.height
        visible: !root.transparentBackground
    }
    Component {
        id: pictureComponent
        MonetPicture {
            width: root.paneWidth
            height: root.height
            halfPane: root.halfPane
            positionX: root.halfPane ? Presentation.imagePosition(root.tuning) : .5
            backgroundColor: root.backgroundColor
            accentColor: root.accentColor
            driftPose: drift.pose
            devicePixelRatio: root.Screen.devicePixelRatio
            onExitFinished: actor => root.removePicture(actor)
            onReadyChanged: root.tryDrawn()
        }
    }
    MonetGradient {
        id: readabilityGradient
        anchors.fill: parent
        visible: !root.transparentBackground
        backgroundColor: root.backgroundColor
        primaryColor: root.primaryColor
        accentColor: root.accentColor
        halfPane: root.halfPane
        overlay: true
    }
}
