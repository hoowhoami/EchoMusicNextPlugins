// One complete shaped row remains immutable while a shader moves the smooth timed fill edge.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "kernel.mjs" as Kernel

Item {
    id: root
    required property var row
    property var timings: []
    property var tokenColors: []
    property real timeSeconds: 0
    property real endTime: 0
    property real fontPx: 28
    property int fontWeight: 400
    property font baseFont
    property color primaryColor: "white"
    property color fillColor: "white"
    property color accentColor: fillColor
    property bool focal: false
    property bool chorus: false
    property real glowMultiplier: 0
    property real lineHeight: fontPx * 1.2
    property bool live: true
    property real spacing: 0
    readonly property var renderer: swept.item ? swept.item.glyphRenderer : body
    readonly property string errorString: body.errorString || (swept.item ? swept.item.errorString : "")
    readonly property real fillWidth: Kernel.fillWidth(timings, row.offsets || [0, row.width], timeSeconds, endTime)
    readonly property real softness: Math.min(Math.max(fontPx * .42, 8), 16)
    readonly property int glowPadding: chorus ? Math.ceil(fontPx * .7 * glowMultiplier + 10) : 0
    readonly property var runs: [
        {
            key: "row",
            text: row.text,
            size: fontPx,
            weight: fontWeight,
            spacing,
            maxBlur: 0,
            maxHaloRadius: 0
        }
    ]
    height: lineHeight
    width: Math.max(row.width + 2, 1)
    function foregroundPoses(metrics: var): var {
        if (!metrics.length)
            return [];
        const metric = metrics[0], seen = new Set(), poses = [];
        for (let i = 0; i < metric.graphemes.length; i++) {
            const g = metric.graphemes[i];
            if (seen.has(g.clusterStart))
                continue;
            seen.add(g.clusterStart);
            poses.push({
                key: "row",
                start: g.clusterStart,
                x: 0,
                y: (lineHeight - metric.height) / 2,
                color: tokenColors[i] || fillColor
            });
        }
        return poses;
    }
    GlyphRun {
        id: body
        objectName: "pendoloBody"
        anchors.fill: parent
        font: root.baseFont
        runs: root.runs
        poses: metrics.length ? [
            {
                key: "row",
                x: 0,
                y: (root.lineHeight - metrics[0].height) / 2,
                color: root.primaryColor,
                opacity: root.focal ? .52 : 1
            }
        ] : []
    }
    Loader {
        id: swept
        anchors.fill: parent
        active: root.focal && root.live
        sourceComponent: Item {
            readonly property var glyphRenderer: foreground
            readonly property string errorString: foreground.errorString
            GlyphRun {
                id: foreground
                objectName: "pendoloSweepGlyph"
                anchors.fill: parent
                font: root.baseFont
                runs: root.focal ? root.runs : []
                poses: root.foregroundPoses(metrics)
            }
            ShaderEffectSource {
                id: foregroundTexture
                sourceItem: foreground
                sourceRect: Qt.rect(-root.glowPadding, -root.glowPadding, root.width + 2 * root.glowPadding, root.height + 2 * root.glowPadding)
                textureSize: Qt.size(Math.ceil((root.width + 2 * root.glowPadding) * Screen.devicePixelRatio), Math.ceil((root.height + 2 * root.glowPadding) * Screen.devicePixelRatio))
                live: root.live
                hideSource: true
                visible: false
            }
            ShaderEffect {
                id: mask
                objectName: "pendoloSweepMask"
                x: -root.glowPadding
                y: -root.glowPadding
                width: root.width + 2 * root.glowPadding
                height: root.height + 2 * root.glowPadding
                property var source: foregroundTexture
                property real widthPx: width
                property real fillPx: root.glowPadding + root.fillWidth
                property real softPx: root.softness
                property real fillEnabled: root.timeSeconds >= (root.timings.length ? root.timings[0].startTime : root.endTime) ? 1 : 0
                fragmentShader: Qt.resolvedUrl("sweep.frag.qsb")
            }
            PendoloShadow {
                x: mask.x
                y: mask.y
                width: mask.width
                height: mask.height
                source: mask
                live: root.live
                effectEnabled: root.chorus
                sigma1: Math.round(root.fontPx * .3 * root.glowMultiplier)
                sigma2: Math.round(root.fontPx * .62 * root.glowMultiplier)
                color1: root.fillColor
                color2: root.accentColor
                opacity1: .72
                opacity2: .28
            }
        }
    }
}
