// Original serialized pipeline/cache with typed native image metadata, GPU painter and JPEG lease.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "pipeline.mjs" as Source
import "native-environment.mjs" as Native
import "gpu-plan.mjs" as Gpu

Item {
    id: root
    property EchoPluginAssets assetsService: null
    property bool active: true
    property real availableTextureBytes: 128 * 1024 * 1024
    readonly property real plannedPainterBytes: _paint ? Gpu.planMonetPainter(_paint.request.image.width, _paint.request.image.height, _paint.request.colors, _paint.request.tuning).totalBytes : 0
    property string errorString: ""
    readonly property var pipeline: _factory
    readonly property int cacheEntries: {
        _revision;
        return _factory ? _factory.cacheEntries : 0;
    }
    readonly property int pictureLeases: {
        _revision;
        return _environment ? _environment.pictureCount : 0;
    }
    readonly property real painterBytes: painter.item ? painter.item.cacheBytes : 0
    readonly property int readbacks: encoder.readbacks
    readonly property int encodes: encoder.encodes
    property int paintCount: 0
    property int decodeCount: 0
    property bool _completed: false
    property var _factory: null
    property var _environment: null
    property var _decodes: []
    property var _decodeCurrent: null
    property var _decodeOperation: null
    property bool _decodeLocal: false
    property var _paint: null
    property var _captureLease: null
    property var _leases: new Map()
    property var _sourceDimensions: new Map()
    signal sourceDecoded(string source, int originalWidth, int originalHeight)
    function sourceDimensions(source: string): var {
        return _sourceDimensions.get(source) || null;
    }
    property int _revision: 0
    function initialize(): void {
        if (!_completed)
            return;
        shutdown();
        if (!active || !assetsService)
            return;
        errorString = '';
        _environment = Native.createNativeMonetEnvironment({
            decode: source => root.decode(source),
            paint: request => root.paint(request),
            cancelPaint: () => root.cancelPaint(),
            releasePicture: picture => root.releasePicture(picture)
        });
        _factory = Source.createMonetPipeline(_environment, {
            maxEntries: 16
        });
        ++_revision;
    }
    function shutdown(): void {
        decodeStep.stop();
        decodeFinish.stop();
        decodeRetry.stop();
        captureStep.stop();
        captureFinish.stop();
        if (_factory)
            _factory.dispose();
        _factory = null;
        if (_environment)
            _environment.dispose();
        _environment = null;
        cancelPaint();
        if (_decodeOperation)
            _decodeOperation.cancel();
        _decodeOperation = null;
        const cancelled = new Error('Monet image preparation canceled');
        if (_decodeCurrent)
            _decodeCurrent.reject(cancelled);
        _decodeCurrent = null;
        _decodeLocal = false;
        localDecode.active = false;
        for (const job of _decodes)
            job.reject(cancelled);
        _decodes = [];
        for (const lease of Array.from(_leases.values()))
            if (lease)
                lease.dispose();
        _leases.clear();
        _sourceDimensions.clear();
        ++_revision;
    }
    function decode(source: string): var {
        return new Promise((resolve, reject) => {
            if (!_completed || !active || !assetsService) {
                reject(new Error('Monet image service is inactive'));
                return;
            }
            if (_decodes.length >= 32) {
                reject(new Error('Monet image metadata queue exceeds 32'));
                return;
            }
            _decodes.push({
                source,
                resolve,
                reject
            });
            decodeStep.restart();
        });
    }
    function decodeNext(): void {
        if (!_completed || !active || !assetsService || _decodeOperation)
            return;
        if (!_decodeCurrent)
            _decodeCurrent = _decodes.shift() || null;
        if (!_decodeCurrent)
            return;
        if (_leases.has(_decodeCurrent.source)) {
            _decodeLocal = true;
            localDecode.active = true;
            return;
        }
        _decodeOperation = assetsService.sampleImage(_decodeCurrent.source, 1, 1);
        if (_decodeOperation.state >= EchoPluginOperation.Succeeded)
            decodeFinish.restart();
    }
    function decoded(): void {
        if (_completed && _decodeLocal && _decodeCurrent && localDecode.item) {
            if (localDecode.item.status === Image.Ready || localDecode.item.status === Image.Error) {
                const job = _decodeCurrent, success = localDecode.item.status === Image.Ready;
                _decodeCurrent = null;
                _decodeLocal = false;
                localDecode.active = false;
                if (success) {
                    ++decodeCount;
                    job.resolve({
                        width: 1920,
                        height: 1080
                    });
                } else {
                    errorString = 'Monet encoded JPEG decode failed';
                    job.reject(new Error(errorString));
                }
                decodeStep.restart();
            }
            return;
        }
        if (!_completed || !_decodeCurrent || !_decodeOperation || _decodeOperation.state < EchoPluginOperation.Succeeded)
            return;
        const op = _decodeOperation;
        _decodeOperation = null;
        if (op.state === EchoPluginOperation.Succeeded) {
            const result = JSON.parse(JSON.stringify(op.result)), job = _decodeCurrent;
            _decodeCurrent = null;
            if (!Number.isInteger(result.sourceWidth) || !Number.isInteger(result.sourceHeight) || result.sourceWidth <= 0 || result.sourceHeight <= 0) {
                errorString = 'Monet requires real sourceWidth/sourceHeight from assets.sampleImage';
                job.reject(new Error(errorString));
            } else {
                ++decodeCount;
                if (_sourceDimensions.size >= 32)
                    _sourceDimensions.delete(_sourceDimensions.keys().next().value);
                _sourceDimensions.set(job.source, {
                    width: result.sourceWidth,
                    height: result.sourceHeight
                });
                sourceDecoded(job.source, result.sourceWidth, result.sourceHeight);
                job.resolve({
                    width: result.sourceWidth,
                    height: result.sourceHeight
                });
            }
            decodeStep.restart();
        } else if (op.errorCode === 'Busy')
            decodeRetry.restart();
        else {
            const job = _decodeCurrent;
            _decodeCurrent = null;
            errorString = op.errorMessage || 'Monet source metadata decode failed';
            job.reject(new Error(errorString));
            decodeStep.restart();
        }
    }
    function paint(request: var): var {
        return new Promise((resolve, reject) => {
            if (!_completed || !active || _paint) {
                reject(new Error('Monet native painter is unavailable'));
                return;
            }
            const budget = Gpu.planMonetPainter(request.image.width, request.image.height, request.colors, request.tuning);
            if (budget.error || budget.totalBytes > availableTextureBytes) {
                errorString = budget.error || 'Monet native painter exceeds the shared texture budget';
                reject(new Error(errorString));
                return;
            }
            _paint = {
                request,
                resolve,
                reject
            };
            if (_paint && active && _completed)
                painter.active = true;
        });
    }
    function cancelPaint(): void {
        captureStep.stop();
        captureFinish.stop();
        if (_captureLease)
            _captureLease.dispose();
        _captureLease = null;
        const current = _paint;
        _paint = null;
        painter.active = false;
        if (current)
            current.resolve(null);
    }
    function capturePainter(): void {
        if (!_completed || !active || !_paint || !painter.item || _captureLease)
            return;
        if (painter.item.errorString) {
            errorString = painter.item.errorString;
            const failed = _paint;
            _paint = null;
            painter.active = false;
            failed.reject(new Error(errorString));
            return;
        }
        if (!painter.item.ready)
            return;
        _captureLease = encoder.encode(painter.item.output, 1920, 1080, 'jpeg', 92);
        ++paintCount;
        if (_captureLease.status !== 'pending')
            captureFinish.restart();
    }
    function captured(): void {
        if (!_completed || !_captureLease || !_paint || _captureLease.status === 'pending')
            return;
        const lease = _captureLease, current = _paint, paintError = painter.item ? painter.item.errorString : '';
        _captureLease = null;
        _paint = null;
        painter.active = false;
        if (lease.ready && !paintError) {
            const url = String(lease.url);
            _leases.set(url, lease);
            current.resolve({
                url,
                lease
            });
        } else {
            errorString = paintError || lease.errorString || 'Monet JPEG capture failed';
            lease.dispose();
            current.reject(new Error(errorString));
        }
        ++_revision;
    }
    function releasePicture(picture: var): void {
        const url = String(picture.url), lease = _leases.get(url);
        if (lease) {
            _leases.delete(url);
            lease.dispose();
        }
        ++_revision;
    }
    onActiveChanged: initialize()
    onAssetsServiceChanged: initialize()
    Component.onCompleted: {
        _completed = true;
        initialize();
    }
    Component.onDestruction: {
        _completed = false;
        shutdown();
    }
    Timer {
        id: decodeStep
        interval: 0
        onTriggered: root.decodeNext()
    }
    Timer {
        id: decodeFinish
        interval: 0
        onTriggered: root.decoded()
    }
    Timer {
        id: decodeRetry
        interval: 50
        onTriggered: root.decodeNext()
    }
    Timer {
        id: captureStep
        interval: 0
        onTriggered: root.capturePainter()
    }
    Timer {
        id: captureFinish
        interval: 0
        onTriggered: root.captured()
    }
    Connections {
        target: root._decodeOperation
        function onCompleted(): void {
            if (root._completed)
                decodeFinish.restart();
        }
    }
    Connections {
        target: root._captureLease
        function onChanged(): void {
            if (root._completed)
                captureFinish.restart();
        }
    }
    Loader {
        id: localDecode
        active: false
        sourceComponent: Image {
            source: root._decodeCurrent ? root._decodeCurrent.source : ''
            sourceSize: Qt.size(1920, 1080)
            asynchronous: true
            cache: false
            visible: false
            onStatusChanged: if (root._completed)
                decodeFinish.restart()
        }
    }
    ImageCapture {
        id: encoder
        active: root.active && root._completed
    }
    Loader {
        id: painter
        x: -20000
        active: false
        sourceComponent: MonetPainter {
            source: root._paint ? root._paint.request.image.source : ''
            sourceWidth: root._paint ? root._paint.request.image.width : 0
            sourceHeight: root._paint ? root._paint.request.image.height : 0
            colors: root._paint ? root._paint.request.colors : ({})
            tuning: root._paint ? root._paint.request.tuning : ({})
            onReadyChanged: if (ready && root._completed)
                captureStep.restart()
            onErrorStringChanged: if (errorString.length && root._completed)
                captureStep.restart()
        }
        onLoaded: if (root._completed)
            captureStep.restart()
    }
}
