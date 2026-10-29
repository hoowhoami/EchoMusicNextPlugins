// Source square/rectangular geometry and raw CSS box-shadow parameters on Qt Canvas.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import EchoMusic.PluginSdk
import "../../../plugins/folia-lyrics-skin/qml/styles/monet"

Item {
    id: root
    property url source
    property EchoPluginAssets assetsService: null
    property bool square: true
    property bool live: true
    property bool motionEnabled: true
    property color primaryColor: "white"
    property color accentColor: "#8b5cf6"
    property color backgroundColor: "#111111"
    readonly property int layerCount: portrait.layerCount
    readonly property string errorString: portrait.errorString
    readonly property real inset: square ? 0 : 6
    readonly property real corner: square ? 32 : 34.4
    function roundPath(ctx, x, y, w, h, r): void {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
    function ink(c, a): string {
        return Qt.rgba(c.r, c.g, c.b, a).toString();
    }
    Canvas {
        id: shadow
        objectName: "monetPortraitShadow"
        x: -128
        y: -100
        width: root.width + 256
        height: root.height + 256
        onPaint: {
            const ctx = getContext("2d");
            ctx.reset();
            const x = 128, y = 100, w = root.width, h = root.height;
            const shades = root.square ? [
                {
                    blur: 42,
                    y: 20,
                    color: root.ink(root.accentColor, .22)
                },
                {
                    blur: 80,
                    y: 36,
                    color: root.ink(root.backgroundColor, .45)
                }
            ] : [
                {
                    blur: 60,
                    y: 24,
                    color: root.ink(root.backgroundColor, .35)
                }
            ];
            for (const shade of shades) {
                ctx.save();
                ctx.shadowBlur = shade.blur;
                ctx.shadowOffsetY = shade.y;
                ctx.shadowColor = shade.color;
                ctx.fillStyle = "white";
                root.roundPath(ctx, x, y, w, h, root.corner);
                ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.globalCompositeOperation = "destination-out";
                ctx.fillStyle = "white";
                root.roundPath(ctx, x, y, w, h, root.corner);
                ctx.fill();
                ctx.restore();
            }
            ctx.fillStyle = root.square ? root.ink(root.primaryColor, .08) : root.ink(root.backgroundColor, .15);
            root.roundPath(ctx, x, y, w, h, root.corner);
            ctx.fill();
            ctx.strokeStyle = root.ink(root.primaryColor, root.square ? .06 : .1);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    Rectangle {
        id: mask
        anchors.fill: parent
        anchors.margins: root.inset
        radius: root.square ? 32 : 29.6
        color: "white"
        layer.enabled: true
        visible: false
    }
    MonetPortrait {
        id: portrait
        anchors.fill: mask
        source: root.source
        assetsService: root.assetsService
        live: root.live
        motionEnabled: root.motionEnabled
        visible: false
    }
    MultiEffect {
        anchors.fill: mask
        source: portrait
        maskEnabled: true
        maskSource: mask
        autoPaddingEnabled: false
    }
    onWidthChanged: shadow.requestPaint()
    onHeightChanged: shadow.requestPaint()
    onPrimaryColorChanged: shadow.requestPaint()
    onAccentColorChanged: shadow.requestPaint()
    onBackgroundColorChanged: shadow.requestPaint()
    onSquareChanged: shadow.requestPaint()
}
