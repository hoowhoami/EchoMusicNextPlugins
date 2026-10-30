// Complete token shaping, source continuous gradient mask, independent two-layer CSS glow.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "paint.mjs" as Paint
import "../cadenza/color.mjs" as Color
import "../../shared/renderHints.mjs" as Hints

Item {
    id: root
    required property var fragment
    required property var entry
    property real fontPx: 36
    property int fontWeight: 600
    property font baseFont
    property real timeSeconds: 0
    property color primaryColor: "white"
    property color accentColor: primaryColor
    property color backgroundColor: "#111111"
    property bool staticPassed: false
    property bool live: true
    readonly property string baseCss: entry.tone.baseColor
    readonly property string wordCss: fragment.color || ((entry.line.isChorus) ? Color.mixColors(Color.colorWithAlpha(String(primaryColor), .98), String(accentColor), .48) : Color.colorWithAlpha(String(primaryColor), .98))
    readonly property var frame: Paint.wordFrame(fragment, entry.status, baseCss, wordCss, timeSeconds, Hints.getLineRenderEndTime(entry.line), fontPx, entry.line.isChorus === true, staticPassed)
    readonly property var metric: baseGlyph.metrics.length ? baseGlyph.metrics[0] : null
    readonly property real contentWidth: Math.max(1, fragment.boxWidth)
    readonly property real overflow: Math.round(fontPx * .5)
    readonly property real glyphY: fragment.nativeHeight ? (entry.layout.lineHeightPx - fragment.nativeHeight) / 2 : 0
    readonly property var renderers: [baseGlyph, sweepGlyph]
    readonly property string errorString: _rejected || baseGlyph.errorString || sweepGlyph.errorString
    readonly property int cacheBytes: baseGlyph.cacheBytes + sweepGlyph.cacheBytes
    property string _rejected: ""
    property bool _completed: false
    width: Math.max(1, contentWidth)
    height: fragment.boxHeight
    x: fragment.x
    y: fragment.y
    function qcolor(value: string): color {
        const rgba = Paint.rgba(value);
        return rgba ? Qt.rgba(rgba[0], rgba[1], rgba[2], rgba[3]) : value;
    }
    function makeRun(key: string, maxHalo: real): var {
        const run = {
            key,
            text: fragment.text,
            size: fontPx,
            weight: fontWeight,
            spacing: 0,
            maxBlur: 0,
            maxHaloRadius: maxHalo
        };
        if (fragment.paragraph) {
            run.maxWidth = Math.max(1, fragment.boxWidth);
            run.lineHeight = entry.layout.lineHeightPx;
        }
        return run;
    }
    function publish(): void {
        if (!_completed || !live || !metric || _rejected)
            return;
        const poses = [];
        if (!fragment.token.timed && entry.status === "active")
            poses.push({
                key: "shadow",
                x: 0,
                y: glyphY + 14,
                color: "transparent",
                halos: [
                    {
                        radius: 17,
                        color: Qt.rgba(backgroundColor.r, backgroundColor.g, backgroundColor.b, .22),
                        opacity: 1
                    }
                ]
            });
        poses.push({
            key: "word",
            x: 0,
            y: glyphY,
            color: qcolor(frame.base),
            halos: frame.halos.map(halo => ({
                        radius: halo.radius,
                        color: qcolor(halo.color),
                        opacity: halo.opacity
                    }))
        });
        baseGlyph.poses = poses;
        sweepGlyph.poses = entry.status === "active" && fragment.token.timed ? [
            {
                key: "word",
                x: 0,
                y: overflow + glyphY,
                color: "white"
            }
        ] : [];
    }
    onFrameChanged: publish()
    onGlyphYChanged: publish()
    onLiveChanged: publish()
    onBackgroundColorChanged: publish()
    Component.onCompleted: { _completed = true; publishDeferred.restart(); }
    Component.onDestruction: { _completed = false; publishDeferred.stop(); }
    Timer { id: publishDeferred; interval: 0; onTriggered: root.publish() }
    MonetFont {
        id: face
        base: root.baseFont
    }
    GlyphRun {
        id: baseGlyph
        objectName: "monetWordGlyph"
        font: face.value
        runs: root.live ? [root.makeRun("word", root.fragment.token.timed ? (Math.round(root.fontPx * (root.entry.line.isChorus ? .90 : .65)) / 2 > 40 ? 80 : 40) : 0)].concat(!root.fragment.token.timed && root.entry.status === "active" ? [root.makeRun("shadow", 40)] : []) : []
        onErrorChanged: if (errorString)
            root._rejected = errorString
        onLayoutChanged: {
            root._rejected = "";
            publishDeferred.restart();
        }
    }
    GlyphRun {
        id: sweepGlyph
        objectName: "monetSweepGlyph"
        y: -root.overflow
        width: root.width
        height: root.height + 2 * root.overflow
        font: face.value
        visible: root.entry.status === "active" && root.fragment.token.timed
        runs: root.live && visible ? [root.makeRun("word", 0)] : []
        onErrorChanged: if (errorString)
            root._rejected = errorString
        onLayoutChanged: publishDeferred.restart()
        layer.enabled: true
        layer.smooth: true
        layer.effect: ShaderEffect {
            property var source
            property vector2d extent: Qt.vector2d(sweepGlyph.width, sweepGlyph.height)
            property color fillColor: root.qcolor(root.frame.fill)
            property real sweepEnd: root.frame.end
            property real edgeSoftness: root.frame.softness
            fragmentShader: Qt.resolvedUrl("sweep.frag.qsb")
        }
    }
}
