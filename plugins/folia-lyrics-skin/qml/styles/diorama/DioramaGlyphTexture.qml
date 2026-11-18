pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window

Item {
    id: root
    required property var descriptor
    property font baseFont
    property bool live: true
    property string phase: 'pending'
    property string _error: ''
    property int _frames: 0
    property int _seen: 0
    property real _retiringBytes: 0
    property var measuredMetrics: []
    signal planned
    signal baked
    signal invalidated
    readonly property var output: linearOutput ? retained : legacy.item ? legacy.item.output : null
    property bool linearOutput: Qt.platform.os === 'osx' && GraphicsInfo.api === GraphicsInfo.Metal
    readonly property bool ready: linearOutput ? phase === 'ready' : legacy.item !== null && legacy.item.ready
    readonly property bool bakeActive: phase === 'capture' || phase === 'freeze'
    readonly property bool workInFlight: bakeActive || phase === 'retire'
    readonly property real nativeBytes: linearOutput ? (inputs.item ? inputs.item.nativeBytes : 0) : (legacy.item ? legacy.item.nativeBytes : 0)
    readonly property var renderers: linearOutput ? (inputs.item ? inputs.item.renderers : []) : (legacy.item ? legacy.item.renderers : [])
    readonly property bool layoutReady: inputs.item !== null && inputs.item.ready
    readonly property string errorString: _error || (linearOutput ? (inputs.item ? inputs.item.errorString : '') : (legacy.item ? legacy.item.errorString : ''))
    readonly property real linearMipBytes: mipBytes(width, height)
    readonly property real rawCaptureBytes: width * height * (descriptor.commands[0].style.shadowOffsetX === 10000 ? 32 : 4)
    readonly property real temporaryReservation: phase === 'layout' ? 64 * 1024 * 1024 : bakeActive ? nativeBytes * 2 + rawCaptureBytes + 8 * 1024 * 1024 : phase === 'retire' ? _retiringBytes : 0
    readonly property real cacheBytes: linearOutput ? linearMipBytes + temporaryReservation : nativeBytes * 2 + rawCaptureBytes
    width: descriptor.width
    height: descriptor.height
    function statuses(item) {
        if (!item)
            return [];
        let result = [];
        if (item.fragmentShader !== undefined)
            result.push({
                fragment: String(item.fragmentShader),
                status: item.status
            });
        for (const child of item.children)
            result = result.concat(statuses(child));
        return result;
    }
    function mipBytes(w, h) {
        let total = 0;
        while (true) {
            total += w * h * 8;
            if (w === 1 && h === 1)
                return total;
            w = Math.max(1, Math.floor(w / 2));
            h = Math.max(1, Math.floor(h / 2));
        }
    }
    function beginLayout() {
        if (linearOutput && phase === 'pending' && live) {
            phase = 'layout';
            deadline.start();
        }
    }
    function beginCapture() {
        if (phase === 'layout' && layoutReady) {
            measuredMetrics = inputs.item.renderers[0].metrics.slice();
            phase = 'capture';
            _frames = 0;
        }
    }
    function reset() {
        deadline.stop();
        phase = 'pending';
        _frames = 0;
        _retiringBytes = 0;
        invalidated();
    }
    onLayoutReadyChanged: if (layoutReady && phase === 'layout')
        planned()
    Loader {
        id: inputs
        active: root.linearOutput && root.live && (root.phase === 'layout' || root.bakeActive)
        sourceComponent: Item {
            width: root.width
            height: root.height
            readonly property bool ready: bake.ready
            readonly property real nativeBytes: bake.nativeBytes
            readonly property var renderers: bake.renderers
            readonly property string errorString: bake.errorString
            readonly property var diagnostic: bake.diagnostic
            readonly property bool pipelineReady: bake.pipelineReady && convert.status !== ShaderEffect.Error
            DioramaGlyphBake {
                id: bake
                descriptor: root.descriptor
                baseFont: root.baseFont
                gpuActive: root.bakeActive
                live: root.live
            }
            ShaderEffect {
                id: convert
                visible: root.bakeActive
                anchors.fill: parent
                blending: false
                property var source: root.bakeActive ? bake.output : null
                fragmentShader: Qt.resolvedUrl('linear.frag.qsb')
            }
        }
    }
    Loader {
        id: legacy
        active: !root.linearOutput && root.live
        sourceComponent: DioramaGlyphBake {
            descriptor: root.descriptor
            baseFont: root.baseFont
            gpuActive: true
            streaming: false
            live: root.live
        }
    }
    ShaderEffectSource {
        id: retained
        sourceItem: root.bakeActive ? inputs.item : null
        sourceRect: Qt.rect(0, 0, root.width, root.height)
        textureSize: Qt.size(root.width, root.height)
        format: ShaderEffectSource.RGBA16F
        mipmap: true
        smooth: true
        hideSource: true
        visible: false
        live: root.phase === 'capture'
        onScheduledUpdateCompleted: if (root.phase === 'freeze') {
            root._retiringBytes = root.temporaryReservation;
            root._frames = 0;
            root.phase = 'retire';
        }
    }
    Connections {
        target: root.Window.window
        function onFrameSwapped() {
            if (!root.linearOutput)
                return;
            root._seen++;
            if (root.phase === 'retire' && ++root._frames >= 3) {
                root.phase = 'ready';
                deadline.stop();
                root.baked();
                return;
            }
            if (root.phase === 'capture' && inputs.item && inputs.item.pipelineReady && ++root._frames >= 3) {
                root.phase = 'freeze';
                retained.scheduleUpdate();
            }
        }
        function onVisibilityChanged() {
            if (!root.linearOutput || !root.Window.window)
                return;
            if (root.Window.window.visible) {
                if (root.phase === 'pending')
                    root.invalidated();
                return;
            }
            deadline.stop();
            if (root.phase !== 'ready' && root.phase !== 'pending' && root.phase !== 'error')
                root.reset();
        }
        function onSceneGraphInvalidated() {
            if (root.linearOutput)
                root.reset();
        }
        function onSceneGraphInitialized() {
            if (!root.linearOutput)
                return;
            if (root.ready)
                root.reset();
            else
                root.invalidated();
        }
    }
    FrameAnimation {
        running: root.live && root.workInFlight && root.Window.window !== null && root.Window.window.visible
        onTriggered: if (root.Window.window)
            root.Window.window.update()
    }
    Timer {
        id: deadline
        interval: 5000
        onTriggered: {
            root._error = 'Diorama immutable glyph capture timed out ' + JSON.stringify({
                phase: root.phase,
                layoutReady: root.layoutReady,
                nativeBytes: root.nativeBytes,
                frames: root._frames,
                seen: root._seen,
                pipeline: inputs.item && inputs.item.pipelineReady,
                detail: inputs.item && inputs.item.diagnostic,
                shaders: statuses(inputs.item)
            });
            root.phase = 'error';
            root.baked();
        }
    }
    onLiveChanged: if (!live) {
        deadline.stop();
        phase = 'pending';
    }
    Component.onDestruction: deadline.stop()
}
