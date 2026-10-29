// Original animations are decoded only by the native isolated asset worker.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    property EchoPluginAssets assetsService: null
    property url source
    property size sourceSize: Qt.size(128, 128)
    property int fillMode: Image.PreserveAspectFit
    property bool live: true
    property bool playing: true
    property bool paused: false
    property bool cache: false
    property bool asynchronous: true
    property bool autoTransform: true
    // Imported files use their decoded extension. Unknown cover endpoints also
    // pass through the worker, so an extension-less animated cover is preserved.
    property bool prepareFrames: !!String(source) && !/\.(png|jpe?g|svg)(?:[?#]|$)/i.test(String(source))
    readonly property int status: errorString ? Image.Error : _lease && !_lease.ready ? Image.Loading : frame.status
    readonly property var displayedLease: _lease && _lease.ready ? _lease : _heldLease
    readonly property int currentFrame: displayedLease ? displayedLease.frameIndex : 0
    readonly property int frameCount: displayedLease ? displayedLease.frameCount : String(source) ? 1 : 0
    readonly property string errorString: _error || (_lease ? _lease.errorString : "") || (frame.status === Image.Error ? qsTr("图片帧读取失败") : "")
    readonly property var animationLease: _lease
    property EchoPluginAssetAnimation _lease: null
    property EchoPluginAssetAnimation _heldLease: null
    property string _error: ""
    property bool _completed: false

    function release(): void {
        const previous = _lease;
        _lease = null;
        if (previous)
            previous.dispose();
        releaseHeld();
    }
    function releaseHeld(): void {
        const held = _heldLease;
        _heldLease = null;
        if (held)
            held.dispose();
    }
    function prepare(): void {
        if (!_completed)
            return;
        releaseHeld();
        _heldLease = _lease;
        _lease = null;
        _error = "";
        if (!live || !String(source)) {
            release();
            return;
        }
        if (!prepareFrames)
            return;
        if (!assetsService) {
            _error = qsTr("宿主未提供后台动画图片服务");
            return;
        }
        _lease = assetsService.animation(source, Math.min(4096, Math.max(1, Math.ceil(sourceSize.width))), Math.min(4096, Math.max(1, Math.ceil(sourceSize.height))), fillMode === Image.PreserveAspectCrop ? "cover" : "contain");
        if (!_lease)
            _error = qsTr("动画图片租约已关闭或超过数量限制");
        updatePlaying();
    }
    function schedule(): void {
        if (_completed)
            preparation.restart();
    }
    function updatePlaying(): void {
        if (_lease)
            _lease.setPlaying(live && playing && !paused);
        if (_heldLease)
            _heldLease.setPlaying(live && playing && !paused);
    }
    onSourceChanged: schedule()
    onSourceSizeChanged: schedule()
    onAssetsServiceChanged: schedule()
    onPrepareFramesChanged: schedule()
    onFillModeChanged: schedule()
    onLiveChanged: {
        if (live)
            schedule();
        else
            release();
    }
    onPlayingChanged: updatePlaying()
    onPausedChanged: updatePlaying()
    Component.onCompleted: {
        _completed = true;
        prepare();
    }
    Component.onDestruction: {
        _completed = false;
        preparation.stop();
        release();
    }
    Timer {
        id: preparation
        interval: 0
        onTriggered: root.prepare()
    }
    Connections {
        target: root._lease
        function onChanged() {
            if (root._lease && !root._lease.active)
                root._error = qsTr("动画图片引用已结束");
            if (root._lease && !root._lease.active && root.live && root.source)
                root.schedule();
        }
    }
    Image {
        id: frame
        anchors.fill: parent
        source: !root.live ? "" : root.prepareFrames ? (root.displayedLease ? root.displayedLease.frameSource : "") : root.source
        sourceSize: root.prepareFrames && root.displayedLease ? Qt.size(root.displayedLease.width, root.displayedLease.height) : root.sourceSize
        fillMode: root.fillMode
        cache: root.cache
        asynchronous: root.asynchronous
        autoTransform: root.autoTransform
        retainWhileLoading: true
        onStatusChanged: {
            if (status === Image.Ready && (!root.prepareFrames || root._lease && root._lease.ready))
                root.releaseHeld();
        }
    }
}
