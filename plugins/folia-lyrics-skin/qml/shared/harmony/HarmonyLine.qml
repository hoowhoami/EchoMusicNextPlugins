pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../"
import "kernel.mjs" as Kernel

Item {
    id: root
    required property var prepared
    property var settings: ({})
    property font baseFont
    property font translationFont
    property real viewportWidth: 1100
    property real availableWidth: 896
    property real timeSeconds: 0
    property color accentColor: "white"
    property color secondaryColor: "#cccccc"
    property bool live: true
    property bool motionEnabled: true
    readonly property var geometry: Kernel.harmonyGeometry(viewportWidth, settings.subtitleFontScale || 1, settings.harmonySubtitleBackground !== false)
    readonly property string alternate: settings.hideTranslationSubtitle ? "" : Kernel.resolveHarmonyAlternateText(prepared.vocal, settings.subtitleContentMode, settings.showSubtitleTranslation !== false) || ""
    readonly property var glyph: body.glyph
    readonly property var renderers: body.renderers
    readonly property real cacheBytes: body.cacheBytes + alternateGlyph.cacheBytes
    readonly property string errorString: body.errorString || alternateNatural.errorString || alternateGlyph.errorString
    readonly property var alternateMetric: alternateGlyph.metrics.length ? alternateGlyph.metrics[0] : null
    readonly property var alternateNaturalMetric: alternateNatural.metrics.length ? alternateNatural.metrics[0] : null
    readonly property real alternateWidth: Math.max(1, Math.min(availableWidth, alternateNaturalMetric ? alternateNaturalMetric.advance : availableWidth))
    readonly property int alternateWeight: Number.isFinite(settings.subtitleFontWeight) ? settings.subtitleFontWeight : 400
    property real entrance: 0
    width: Math.max(body.width, alternate ? alternateWidth : 0)
    height: body.height + (alternate ? (2 + (alternateMetric ? alternateMetric.height : geometry.alternateFontPx * 1.3)) : 0)
    opacity: entrance
    scale: arrival.value
    function alternateRun(maximum: real): var {
        return {
            key: "alternate",
            text: alternate,
            size: geometry.alternateFontPx,
            weight: alternateWeight,
            spacing: 0,
            maxWidth: maximum,
            lineHeight: geometry.alternateFontPx * 1.3,
            maxBlur: 0,
            maxHaloRadius: 0
        };
    }
    function paintAlternate(): void {
        if (!alternateMetric)
            return;
        // The same paragraph centering as the main row, without invented token timing.
        const metric = alternateMetric, rows = ({});
        for (const g of metric.graphemes) {
            const key = String(g.y);
            if (!rows[key])
                rows[key] = {
                    first: Infinity,
                    last: -Infinity
                };
            rows[key].first = Math.min(rows[key].first, g.x, g.x + g.advance);
            rows[key].last = Math.max(rows[key].last, g.x, g.x + g.advance);
        }
        const seen = new Set(), poses = [];
        for (const g of metric.graphemes) {
            if (seen.has(g.clusterStart))
                continue;
            seen.add(g.clusterStart);
            const row = rows[String(g.y)];
            poses.push({
                key: "alternate",
                start: g.clusterStart,
                x: (alternateWidth - row.last + row.first) / 2 - row.first,
                y: 0,
                color: secondaryColor
            });
        }
        alternateGlyph.poses = poses;
    }
    Component.onCompleted: {
        enter.restart();
        arrival.startFrom(.97);
        alternateArrival.startFrom(-4);
    }
    NumberAnimation {
        id: enter
        target: root
        property: "entrance"
        from: 0
        to: 1
        duration: root.motionEnabled ? 300 : 0
        easing.type: Easing.BezierSpline
        easing.bezierCurve: [.25, .1, .35, 1, 1, 1]
    }
    PresentationSpring {
        id: arrival
        targetValue: 1
        stiffness: 550
        damping: 30
        enabled: root.live && root.motionEnabled
    }
    PresentationSpring {
        id: alternateArrival
        targetValue: 0
        stiffness: 500
        damping: 25
        enabled: root.live && root.motionEnabled
    }
    HarmonyGlowText {
        id: body
        anchors.horizontalCenter: parent.horizontalCenter
        prepared: root.prepared
        settings: root.settings
        baseFont: root.baseFont
        viewportWidth: root.viewportWidth
        availableWidth: root.availableWidth
        timeSeconds: root.timeSeconds
        accentColor: root.accentColor
        secondaryColor: root.secondaryColor
        live: root.live
    }
    GlyphRun {
        id: alternateNatural
        visible: false
        measurementOnly: true
        font: root.translationFont
        runs: root.live && root.alternate ? [root.alternateRun(4096)] : []
    }
    GlyphRun {
        id: alternateGlyph
        objectName: "foliaHarmonyAlternateGlyph"
        x: (root.width - root.alternateWidth) / 2
        y: body.height + 2 + alternateArrival.value
        width: root.alternateWidth
        height: root.alternateMetric ? root.alternateMetric.height : 0
        opacity: .82
        font: root.translationFont
        runs: root.live && root.alternate ? [root.alternateRun(root.alternateWidth)] : []
        onLayoutChanged: paintLater.restart()
    }
    Timer {
        id: paintLater
        interval: 0
        onTriggered: root.paintAlternate()
    }
    onSecondaryColorChanged: paintLater.restart()
}
