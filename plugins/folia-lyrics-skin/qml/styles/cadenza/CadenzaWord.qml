// One complete shaped source fragment; individual poses only address safe glyph clusters.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "motion.mjs" as Motion
import "color.mjs" as Color
import "../../shared/text/unicode.mjs" as Unicode

Item {
    id: root
    property bool _completed: false
    required property var placement
    required property real fontPx
    required property font baseFont
    required property int fontWeight
    required property var lineTiming
    required property real timeSeconds
    required property real glowIntensity
    required property color primaryColor
    property var frame: null
    property string preparationError: ""
    property bool _publishing: false
    readonly property string errorString: preparationError || glyphs.errorString
    readonly property var renderer: glyphs
    readonly property var sourceGraphemes: Unicode.graphemeSegments(placement.text)
    x: frame ? frame.x + placement.width / 2 : 0
    y: frame ? frame.y - placement.height * .42 : 0
    scale: frame ? frame.scale : 1
    rotation: frame ? frame.rotation : 0
    transformOrigin: Item.TopLeft
    visible: frame !== null && (frame.bodyAlpha >= .015 || frame.glowAlpha >= .015)
    function publish(): void {
        if (!frame || !lineTiming || glyphs.metrics.length !== 1)
            return;
        const metric = glyphs.metrics[0];
        if (!glyphs.runs.length || glyphs.runs[0].text !== placement.text)
            return;
        if (!Number.isFinite(metric.inkTop) || !Number.isFinite(metric.inkBottom)) {
            preparationError = "Cadenza requires native GlyphRun inkTop/inkBottom metrics";
            return;
        }
        if (preparationError)
            return;
        const measuredAscent = -metric.inkTop || fontPx * .78;
        // CSS line-height:1 puts the font baseline after half the extra line leading.
        const topOffset = placement.height * .42 - measuredAscent + (fontPx - metric.height) / 2;
        const mixedText = Color.mixColors(String(primaryColor), placement.color, frame.activeMix);
        const channels = Color.parseColorChannels(mixedText);
        const mixed = channels ? Qt.rgba(channels.r / 255, channels.g / 255, channels.b / 255, 1) : Qt.color(mixedText);
        const color = Qt.rgba(mixed.r, mixed.g, mixed.b, frame.bodyAlpha);
        const seen = new Set();
        const poses = [];
        for (const grapheme of metric.graphemes) {
            if (seen.has(grapheme.clusterStart))
                continue;
            seen.add(grapheme.clusterStart);
            let ordinal = 0;
            for (let i = 0; i < sourceGraphemes.length; i++)
                if (sourceGraphemes[i].index <= grapheme.clusterStart)
                    ordinal = i;
            poses.push({
                key: "word",
                start: grapheme.clusterStart,
                x: -placement.width / 2,
                y: topOffset,
                scale: 1,
                rotation: 0,
                opacity: 1,
                blur: frame.blur,
                color: color,
                halos: Motion.clusterHalos(placement, ordinal, lineTiming, timeSeconds, frame.glowAlpha, glowIntensity)
            });
        }
        _publishing = true;
        glyphs.poses = poses;
        _publishing = false;
    }
    function layoutReady(): void {
        if (glyphs.errorString) {
            preparationError = glyphs.errorString;
            return;
        }
        preparationError = "";
        publish();
    }
    onFrameChanged: publish()
    onTimeSecondsChanged: publish()
    onGlowIntensityChanged: publish()
    onPrimaryColorChanged: publish()
    CadenzaFont {
        id: fontValue
        base: root.baseFont
        pixelSize: Math.round(root.fontPx)
        weight: root.fontWeight
    }
    GlyphRun {
        id: glyphs
        objectName: "cadenzaGlyphRun"
        width: 1200
        height: 900
        font: fontValue.value
        runs: [
            {
                key: "word",
                text: root.placement.text,
                size: root.fontPx,
                weight: root.fontWeight,
                maxBlur: 16,
                maxHaloRadius: 40
            }
        ]
        onLayoutChanged: root.scheduleLayoutReady()
        onErrorStringChanged: {
            if (!root._publishing) {
                if (errorString)
                    root.preparationError = errorString;
                else
                    root.scheduleLayoutReady();
            }
        }
    }
    Component.onCompleted: {
        _completed = true;
        scheduleLayoutReady();
    }

    // Deferred work belongs to this component and cannot outlive its QML context.
    function scheduleLayoutReady(): void {
        if (_completed)
            layoutTask.restart();
    }
    Timer {
        id: layoutTask
        interval: 0
        onTriggered: if (root._completed)
            root.layoutReady()
    }
    Component.onDestruction: {
        _completed = false;
        layoutTask.stop();
    }
}
