pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "frame.mjs" as Frame

Item {
    id: root
    property bool _completed: false
    required property var commands
    required property font baseFont
    property real deviceScale: 1
    property real maximumRasterScale: 32
    property bool glowEnabled: true
    property string errorString: ""
    property string _signature: ""
    property string _publishedSignature: ""
    readonly property bool posesCurrent: !nativeGlyph.preparing && _publishedSignature === _signature
    property bool _publishing: false
    property bool _prepareRejected: false
    readonly property var glyph: nativeGlyph
    readonly property real cacheBytes: nativeGlyph.cacheBytes + nativeGlyph.gpuCacheBytes
    readonly property string sharedCacheKey: nativeGlyph.sharedCacheKey
    readonly property real sharedCacheBytes: nativeGlyph.sharedCacheBytes
    signal budgetRejected

    function prepare(): void {
        if (!commands)
            return;
        const runs = commands.map(command => ({
                    key: command.key,
                    text: Frame.canvasText(command.text),
                    size: command.size,
                    weight: command.weight,
                    spacing: 0,
                    maxBlur: 0,
                    maxHaloRadius: Frame.haloBudget(command, glowEnabled)
                }));
        const signature = JSON.stringify(runs);
        if (signature !== _signature) {
            _publishedSignature = "";
            _signature = signature;
            nativeGlyph.runs = runs;
        }
        publish();
    }
    function publish(): void {
        if (!commands || _publishing || _prepareRejected || nativeGlyph.preparing || nativeGlyph.metrics.length !== commands.length)
            return;
        const signature = _signature;
        const poses = [];
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i], metric = nativeGlyph.metrics[i];
            if (metric.key !== command.key)
                return;
            // Canvas middle is the primary face's em-box centre. The fallback
            // shaping line box may grow for CJK/emoji and cannot define it.
            const middleOffset = metric.baseline - (metric.emAscent - metric.emDescent) * .5;
            if (!Number.isFinite(middleOffset)) {
                errorString = "Fume requires primary-font em metrics for Canvas middle";
                return;
            }
            // The original paints the complete shaping context for each range,
            // then clips the composed body/halo. A ligature may receive two paints.
            const paints = command.ranges || [command.style];
            for (let index = 0; index < paints.length; ++index) {
                const style = paints[index], fill = Frame.rgba(style.fill, style.alpha), shadow = Frame.rgba(style.shadow), radius = Frame.localShadowSigma(style.blur, deviceScale);
                if (radius > Frame.haloBudget(command, glowEnabled) + 1e-6) {
                    errorString = "Fume source halo exceeds supported local radius: " + radius;
                    return;
                }
                const pose = {
                    key: command.key,
                    instance: "paint" + index,
                    x: command.x,
                    y: command.y - middleOffset,
                    opacity: 1,
                    color: Qt.rgba(fill.r, fill.g, fill.b, fill.a),
                    halos: glowEnabled && radius > 0 && shadow.a > 0 && fill.a > 0 ? [
                        {
                            radius: radius,
                            opacity: fill.a,
                            color: Qt.rgba(shadow.r, shadow.g, shadow.b, shadow.a)
                        }
                    ] : []
                };
                if (style.clipRect) {
                    const rectangle = style.clipRect;
                    pose.clip = {
                        x: rectangle.x,
                        y: rectangle.y + middleOffset,
                        width: rectangle.width,
                        height: rectangle.height
                    };
                }
                poses.push(pose);
            }
        }
        _publishing = true;
        nativeGlyph.poses = poses;
        _publishing = false;
        if (signature !== _signature)
            return;
        if (nativeGlyph.errorString)
            errorString = nativeGlyph.errorString;
        else {
            errorString = "";
            _publishedSignature = signature;
        }
    }
    onCommandsChanged: prepare()
    onDeviceScaleChanged: publish()
    onGlowEnabledChanged: prepare()
    onBaseFontChanged: schedulePrepare()
    Component.onCompleted: {
        _completed = true;
        prepare();
    }
    FumeFont {
        id: renderFont
        base: root.baseFont
    }
    GlyphRun {
        id: nativeGlyph
        objectName: "fumeGlyph"
        font: renderFont.value
        haloSampling: "canvas"
        maximumRasterScale: root.maximumRasterScale
        opacity: root.posesCurrent ? 1 : 0
        onPreparationChanged: {
            if (preparing)
                root._publishedSignature = "";
        }
        onLayoutChanged: {
            // An automatic DPR/visibility refresh of the last accepted empty
            // layout must not erase an explicitly rejected preparation.
            if (root.commands && metrics.length === root.commands.length) {
                root._prepareRejected = false;
                root.schedulePublish();
            }
        }
        onRenderingChanged: root.schedulePublish()
        onErrorStringChanged: {
            if (errorString) {
                root.errorString = errorString;
                if (!root._publishing)
                    root._prepareRejected = true;
                if (!root._publishing && (errorString.indexOf("texture budget") >= 0 || errorString.indexOf("ink cache") >= 0))
                    root.budgetRejected();
            } else if (!root._publishing) {
                if (root.commands && metrics.length === root.commands.length) {
                    root._prepareRejected = false;
                    root.errorString = "";
                    root.schedulePublish();
                }
            }
        }
    }

    // Deferred work belongs to this component and cannot outlive its QML context.
    function schedulePrepare(): void {
        if (_completed)
            prepareTask.restart();
    }
    Timer {
        id: prepareTask
        interval: 0
        onTriggered: if (root._completed)
            root.prepare()
    }
    function schedulePublish(): void {
        if (_completed)
            publishTask.restart();
    }
    Timer {
        id: publishTask
        interval: 0
        onTriggered: if (root._completed)
            root.publish()
    }
    Component.onDestruction: {
        _completed = false;
        prepareTask.stop();
        publishTask.stop();
    }
}
