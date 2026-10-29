// Static source painter only; JPEG and presentation own separate immutable leases.
pragma ComponentBehavior: Bound
import QtQuick
import "gpu-plan.mjs" as Gpu

Item {
    id: root
    property url source
    property int sourceWidth: 0
    property int sourceHeight: 0
    property var colors: ({
            backgroundColor: '#0a0a0c',
            primaryColor: '#f5f5f5',
            accentColor: '#8fb7ff'
        })
    property var tuning: ({})
    property bool live: true
    readonly property var plan: Gpu.planMonetPainter(sourceWidth, sourceHeight, colors, tuning)
    readonly property bool ready: live && visible && _ready && errorString.length === 0
    readonly property string errorString: plan.error || (image.status === Image.Error ? 'Monet source image decode failed' : graph.item ? graph.item.errorString : '')
    readonly property real inputBytes: image.status === Image.Ready ? plan.inputBytes : 0
    readonly property real fboBytes: graph.item ? plan.fboBytes : 0
    readonly property real cacheBytes: inputBytes + fboBytes
    readonly property var output: ready && graph.item ? graph.item.output : null
    property int bakeCount: 0
    property int textureUpdates: 0
    property bool _ready: false
    property bool _completed: false
    width: 1920
    height: 1080
    function vector(values: var): var {
        return Qt.vector4d(values[0], values[1], values[2], 1);
    }
    function queueBake(): void {
        _ready = false;
        if (_completed)
            refresh.restart();
    }
    function bake(): void {
        if (!_completed || !live || !visible || plan.error || image.status !== Image.Ready || !graph.item)
            return;
        graph.item.updateTexture();
        ++bakeCount;
    }
    onPlanChanged: queueBake()
    onSourceChanged: queueBake()
    onLiveChanged: {
        if (live)
            queueBake();
        else {
            refresh.stop();
            _ready = false;
        }
    }
    onVisibleChanged: {
        if (visible)
            queueBake();
        else {
            refresh.stop();
            _ready = false;
        }
    }
    Component.onCompleted: {
        _completed = true;
        queueBake();
    }
    Component.onDestruction: {
        _completed = false;
        refresh.stop();
    }
    Timer {
        id: refresh
        interval: 0
        onTriggered: root.bake()
    }
    Image {
        id: image
        source: root.live && root.visible && !root.plan.error ? root.source : ''
        sourceSize: Qt.size(root.plan.inputWidth || 0, root.plan.inputHeight || 0)
        asynchronous: true
        autoTransform: true
        cache: false
        visible: false
        onStatusChanged: root.queueBake()
    }
    Loader {
        id: graph
        width: 1920
        height: 1080
        active: root.live && root.visible && !root.plan.error && image.status === Image.Ready
        onLoaded: root.queueBake()
        sourceComponent: Item {
            readonly property var output: finalImage
            readonly property string errorString: horizontal.status === ShaderEffect.Error ? horizontal.log : finalImage.status === ShaderEffect.Error ? finalImage.log : ''
            function updateTexture(): void {
                horizontalTexture.scheduleUpdate();
            }
            ShaderEffect {
                id: horizontal
                width: 1920
                height: root.plan.expandedHeight
                property var source: image
                property vector2d frameSize: Qt.vector2d(1920, 1080)
                property vector2d imageSize: Qt.vector2d(root.sourceWidth, root.sourceHeight)
                property real padding: root.plan.padding
                property real sigma: root.plan.tuning.backgroundBlurPx
                fragmentShader: Qt.resolvedUrl('cover-blur.frag.qsb')
            }
            ShaderEffectSource {
                id: horizontalTexture
                sourceItem: horizontal
                sourceRect: Qt.rect(0, 0, horizontal.width, horizontal.height)
                textureSize: Qt.size(1920, root.plan.expandedHeight)
                format: ShaderEffectSource.RGBA16F
                hideSource: true
                smooth: true
                visible: false
                live: false
                onScheduledUpdateCompleted: if (root._completed) {
                    ++root.textureUpdates;
                    root._ready = true;
                }
            }
            ShaderEffect {
                id: finalImage
                width: 1920
                height: 1080
                property var source: horizontalTexture
                property vector2d frameSize: Qt.vector2d(1920, 1080)
                property real padding: root.plan.padding
                property real sigma: root.plan.tuning.backgroundBlurPx
                property vector4d background: root.vector(root.plan.background)
                property vector4d baseFill: Qt.vector4d(root.plan.baseFill[0], root.plan.baseFill[1], root.plan.baseFill[2], root.plan.baseFill[3])
                property vector4d primary: root.vector(root.plan.primary)
                property vector4d accent: root.vector(root.plan.accent)
                property vector4d washAccent: root.vector(root.plan.wash)
                property vector4d treatment: Qt.vector4d(root.plan.tuning.backgroundGrayscale, root.plan.tuning.backgroundSaturation, root.plan.tuning.backgroundWash, root.plan.tuning.backgroundOverlayOpacity)
                property real streaks: root.plan.tuning.backgroundStreaksEnabled ? 1 : 0
                fragmentShader: Qt.resolvedUrl('color-overlay.frag.qsb')
            }
        }
    }
}
