pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window

Item {
    id: root
    property var frame: null
    property font baseFont
    property bool live: true
    property var _resources: ({})
    property var _ops: ({})
    property string _error: ''
    readonly property int pendingResources: Object.values(_resources).filter(r => r.descriptor.kind === 'glyph' && !r.ready).length
    readonly property bool renderReady: frame !== null && !errorString && pendingResources === 0
    readonly property int targetWidth: Math.floor(width * (frame && frame.resolution || 1))
    readonly property int targetHeight: Math.floor(height * (frame && frame.resolution || 1))
    readonly property real msaaTargetBytes: live && frame ? targetWidth * targetHeight * 52 : 0
    readonly property bool targetAllowed: targetWidth > 0 && targetHeight > 0 && targetWidth <= 8192 && targetHeight <= 8192 && msaaTargetBytes <= 1024 * 1024 * 1024
    layer.enabled: live && frame !== null && targetAllowed
    layer.samples: 4
    layer.textureSize: Qt.size(targetWidth, targetHeight)
    layer.textureMirroring: ShaderEffectSource.NoMirroring
    layer.smooth: true
    readonly property string errorString: _error || Object.values(_resources).concat(Object.values(_ops)).map(r => r.errorString).filter(Boolean).join('\n')
    readonly property var renderers: Object.values(_resources).reduce((all, r) => all.concat(r.renderers), [])
    readonly property var memoryBreakdown: {
        const m = {
            glyphCpu: 0,
            glyphGpuEstimate: 0,
            captureGpu: 0,
            floatCpu: 0,
            floatGpu: 0,
            packedGui: 0,
            glyphTextures: 0,
            pointTextures: 0,
            linearMipReserved: 0,
            bakeTemporaryReserved: 0
        };
        for (const r of Object.values(_resources))
            if (r.descriptor.kind === 'glyph') {
                const native = r.renderers.reduce((n, g) => n + g.cacheBytes, 0);
                m.glyphCpu += native;
                m.glyphGpuEstimate += native;
                m.captureGpu += r.cacheBytes - native * 2;
                if (r.linearOutput) {
                    m.linearMipReserved += r.linearMipBytes;
                    m.bakeTemporaryReserved += r.temporaryReservation;
                }
                m.glyphTextures++;
            } else {
                m.floatCpu += r.output.sourceBytes;
                m.floatGpu += r.output.cacheBytes;
                m.packedGui += r.descriptor.pixels.length * 2;
                m.pointTextures++;
            }
        m.poolTotal = m.glyphCpu + m.glyphGpuEstimate + m.captureGpu + m.floatCpu + m.floatGpu + m.packedGui;
        const pixels = live && frame ? targetWidth * targetHeight : 0;
        m.msaaColor = pixels * 16;
        m.msaaResolve = pixels * 4;
        m.msaaDepthUpper = pixels * 32;
        m.msaaTotal = m.msaaColor + m.msaaResolve + m.msaaDepthUpper;
        m.poolReserved = reservedPool();
        m.total = m.poolReserved + m.msaaTotal;
        return m;
    }
    readonly property real cacheBytes: memoryBreakdown.total
    readonly property int actorCount: Object.keys(_ops).length
    readonly property int resourceCount: Object.keys(_resources).length
    property real peakReservedPool: 0
    function recordReservation() {
        const bytes = reservedPool();
        peakReservedPool = Math.max(peakReservedPool, bytes);
        if (bytes > 256 * 1024 * 1024)
            throw Error("Diorama reserved bake peak exceeds 256MiB");
    }
    function reservedPool() {
        let total = 0;
        for (const r of Object.values(_resources))
            total += r.descriptor.kind === 'glyph' ? r.cacheBytes : r.descriptor.width * r.descriptor.height * 48;
        return total;
    }
    function advanceBakes() {
        if (!live || !Window.window || !Window.window.visible || errorString)
            return;
        const glyphs = Object.values(_resources).filter(r => r.descriptor.kind === 'glyph' && r.linearOutput);
        const layout = glyphs.find(r => r.phase === 'layout');
        if (layout) {
            if (!layout.layoutReady)
                return;
            const needed = layout.nativeBytes * 2 + layout.rawCaptureBytes + 8 * 1024 * 1024;
            if (reservedPool() - 64 * 1024 * 1024 + needed > 256 * 1024 * 1024) {
                if (!glyphs.some(r => r.workInFlight))
                    _error = 'Diorama glyph capture cannot fit the 256MiB variable pool';
                return;
            }
            layout.beginCapture();
            recordReservation();
        }
        const pending = glyphs.find(r => r.phase === 'pending');
        if (pending) {
            if (reservedPool() + 64 * 1024 * 1024 > 256 * 1024 * 1024) {
                if (!glyphs.some(r => r.workInFlight || r.phase === 'layout'))
                    _error = 'Diorama glyph layout cannot fit the 256MiB variable pool';
                return;
            }
            pending.beginLayout();
            recordReservation();
        }
    }
    Timer {
        id: bakeNextLater
        interval: 0
        onTriggered: root.advanceBakes()
    }
    function clear() {
        bakeNextLater.stop();
        for (const op of Object.values(_ops))
            op.destroy();
        _ops = {};
        for (const resource of Object.values(_resources))
            resource.destroy();
        _resources = {};
    }
    function sync() {
        if (!live || !frame) {
            clear();
            return;
        }
        try {
            if (!targetAllowed)
                throw Error('Diorama MSAA4 target exceeds 8192 axis or 1GiB attachment budget');
            const resources = Object.assign({}, _resources), ops = Object.assign({}, _ops), wanted = {};
            for (const descriptor of frame.resources) {
                const component = descriptor.kind === 'glyph' ? glyphResource : pointResource;
                if (resources[descriptor.id])
                    throw Error('Duplicate Diorama immutable resource');
                const resource = component.createObject(root, {
                    descriptor,
                    live: Qt.binding(() => root.live)
                });
                if (!resource)
                    throw Error('Cannot create Diorama native texture');
                if (descriptor.kind === 'glyph')
                    resource.baseFont = Qt.binding(() => root.baseFont);
                resources[descriptor.id] = resource;
            }
            for (let i = 0; i < frame.ops.length; i++) {
                const descriptor = frame.ops[i];
                wanted[descriptor.id] = true;
                const resource = resources[descriptor.texture];
                if (!resource)
                    throw Error('Missing Diorama immutable resource');
                let item = ops[descriptor.id];
                if (!item) {
                    const component = descriptor.kind === 'plane' ? plane : descriptor.motes ? motes : points;
                    item = component.createObject(root, {
                        descriptor,
                        resource,
                        frame: root.frame
                    });
                    if (!item)
                        throw Error('Cannot create Diorama 3D draw operation');
                    ops[descriptor.id] = item;
                } else {
                    item.descriptor = descriptor;
                    item.frame = frame;
                }
                item.z = i;
            }
            for (const id of Object.keys(ops))
                if (!wanted[id]) {
                    ops[id].destroy();
                    delete ops[id];
                }
            for (const id of frame.retired) {
                if (resources[id])
                    resources[id].destroy();
                delete resources[id];
            }
            _resources = resources;
            _ops = ops;
            _error = '';
            bakeNextLater.restart();
            recordReservation();
            if (reservedPool() > 256 * 1024 * 1024)
                throw Error('Diorama visible texture and atlas budget exceeded');
        } catch (error) {
            _error = String(error.message || error);
            clear();
        }
    }
    onFrameChanged: sync()
    onLiveChanged: sync()
    Connections {
        target: root.Window.window
        function onVisibilityChanged() {
            if (root.live && root.Window.window.visible)
                bakeNextLater.restart();
        }
    }
    Component.onDestruction: clear()
    Component {
        id: glyphResource
        DioramaGlyphTexture {
            onPlanned: bakeNextLater.restart()
            onBaked: bakeNextLater.restart()
            onInvalidated: bakeNextLater.restart()
        }
    }
    Component {
        id: pointResource
        DioramaPointTexture {}
    }
    Component {
        id: plane
        DioramaPlane {
            width: root.width
            height: root.height
        }
    }
    Component {
        id: points
        DioramaPoints {
            width: root.width
            height: root.height
        }
    }
    Component {
        id: motes
        DioramaMotes {
            width: root.width
            height: root.height
        }
    }
}
