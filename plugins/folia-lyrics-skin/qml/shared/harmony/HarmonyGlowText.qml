// Whole-context native paragraph ink plus the original prefix-driven soft mask.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "kernel.mjs" as Kernel
import "paint.mjs" as Paint

Item {
    id: root
    required property var prepared
    property var settings: ({})
    property font baseFont
    property real viewportWidth: 1100
    property real availableWidth: 896
    property real timeSeconds: 0
    property color accentColor: "white"
    property color secondaryColor: "#cccccc"
    property bool live: true
    readonly property var vocal: prepared.vocal
    readonly property var geometry: Kernel.harmonyGeometry(viewportWidth, settings.subtitleFontScale || 1, settings.harmonySubtitleBackground !== false)
    readonly property int fontWeight: Number.isFinite(settings.subtitleFontWeight) ? settings.subtitleFontWeight : 500
    readonly property var metric: baseGlyph.metrics.length ? baseGlyph.metrics[0] : null
    readonly property var naturalMetric: natural.metrics.length ? natural.metrics[0] : null
    readonly property real boxWidth: Math.max(1, Math.min(availableWidth, naturalMetric ? naturalMetric.advance : availableWidth))
    readonly property var mask: Kernel.maskStops(Kernel.fillWidth(vocal, prepared.timings, prepared.offsets, timeSeconds), geometry.measureFontPx)
    readonly property var glyph: baseGlyph
    readonly property var renderers: [baseGlyph, activeGlyph]
    readonly property real layerBytes: live ? Math.ceil((width + 2 * geometry.glowPadding) * Screen.devicePixelRatio) * Math.ceil((height + 2 * geometry.glowPadding) * Screen.devicePixelRatio) * 4 : 0
    readonly property bool layerAccepted: (width + 2 * geometry.glowPadding) * Screen.devicePixelRatio <= 4096 && (height + 2 * geometry.glowPadding) * Screen.devicePixelRatio <= 8192 && layerBytes <= 64 * 1024 * 1024
    readonly property real cacheBytes: baseGlyph.cacheBytes + activeGlyph.cacheBytes + (activeGlyph.layer.enabled ? layerBytes : 0)
    readonly property string errorString: !layerAccepted ? "Harmony text mask exceeds its bounded GPU ROI" : natural.errorString || baseGlyph.errorString || activeGlyph.errorString
    property bool _completed: false
    width: boxWidth
    height: metric ? metric.height : geometry.fontPx * 1.3
    function run(size: real, maximum: real): var {
        return {
            key: "voice",
            text: vocal.text,
            size,
            weight: fontWeight,
            spacing: 0,
            maxBlur: 0,
            maxHaloRadius: 0,
            maxWidth: maximum,
            lineHeight: size * 1.3
        };
    }
    function paint(): void {
        if (!_completed || !live || !metric)
            return;
        const poses = Paint.clusterPaints(vocal, metric, width, settings.wordColors || [], String(accentColor), String(secondaryColor));
        baseGlyph.poses = poses.map(p => {
            const color = Qt.color(p.color);
            return Object.assign({}, p, {
                color: Qt.rgba(color.r, color.g, color.b, .56)
            });
        });
        activeGlyph.poses = poses.map(p => Object.assign({}, p, {
                x: p.x + geometry.glowPadding,
                y: geometry.glowPadding
            }));
    }
    onMetricChanged: paintLater.restart()
    onSettingsChanged: paintLater.restart()
    onAccentColorChanged: paintLater.restart()
    onSecondaryColorChanged: paintLater.restart()
    Component.onCompleted: {
        _completed = true;
        paintLater.restart();
    }
    Component.onDestruction: {
        _completed = false;
        paintLater.stop();
    }
    Timer {
        id: paintLater
        interval: 0
        onTriggered: root.paint()
    }
    GlyphRun {
        id: natural
        visible: false
        measurementOnly: true
        font: root.baseFont
        runs: root.live ? [root.run(root.geometry.fontPx, 4096)] : []
    }
    GlyphRun {
        id: baseGlyph
        objectName: "foliaHarmonyBaseGlyph"
        font: root.baseFont
        runs: root.live ? [root.run(root.geometry.fontPx, root.boxWidth)] : []
    }
    GlyphRun {
        id: activeGlyph
        objectName: "foliaHarmonyActiveGlyph"
        x: -root.geometry.glowPadding
        y: -root.geometry.glowPadding
        width: root.width + 2 * root.geometry.glowPadding
        height: root.height + 2 * root.geometry.glowPadding
        font: root.baseFont
        runs: root.live ? [root.run(root.geometry.fontPx, root.boxWidth)] : []
        layer.enabled: root.live && root.layerAccepted
        layer.smooth: true
        layer.effect: ShaderEffect {
            property var source
            property vector2d extent: Qt.vector2d(activeGlyph.width, activeGlyph.height)
            property real edge: root.mask.edge
            property real solid: root.mask.solid
            property real halfStop: root.mask.half
            fragmentShader: "sweep.frag.qsb"
        }
    }
}
