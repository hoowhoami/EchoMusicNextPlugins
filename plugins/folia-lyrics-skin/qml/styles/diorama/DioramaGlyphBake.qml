// The source Canvas's exact fixed 128px text program, rendered once by native font shaping.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../sonnet" as Sonnet

Item {
    id: root
    required property var descriptor
    property font baseFont
    property bool live: true
    property bool gpuActive: false
    property bool streaming: gpuActive
    readonly property real nativeBytes: glyph.cacheBytes
    readonly property var diagnostic: ({
            glow,
            ready,
            gpuActive,
            accepted: _accepted,
            visible,
            blurActive: blurred.active,
            blurStatus: blurred.status,
            value: blurred.item ? blurred.item.diagnostic : null
        })
    readonly property bool pipelineReady: !root.glow || (blurred.item !== null && blurred.item.pipelineReady)
    readonly property var command: descriptor.commands[0]
    readonly property bool glow: command.style.shadowOffsetX === 10000
    readonly property var fontParts: /^(\d+) ([\d.]+)px (.+)$/.exec(command.style.font)
    readonly property string errorString: glyph.errorString
    readonly property bool ready: glyph.metrics.length === 1 && !glyph.errorString && _accepted
    readonly property var output: glow ? glowTexture : baseTexture
    readonly property var renderers: [glyph]
    readonly property real cacheBytes: glyph.cacheBytes + width * height * (glow ? 32 : 4)
    property bool _accepted: false
    width: descriptor.width
    height: descriptor.height
    function accept() {
        if (glyph.metrics.length !== 1 || glyph.errorString)
            return;
        const metric = glyph.metrics[0];
        if (!Number.isFinite(metric.emAscent) || !Number.isFinite(metric.emDescent))
            return;
        glyph.poses = [
            {
                key: 'glyph',
                x: command.x + (glow ? 10000 : 0),
                y: command.y + (metric.emAscent - metric.emDescent) / 2 - metric.baseline,
                color: Qt.rgba(1, 1, 1, 1)
            }
        ];
        _accepted = true;
        baseTexture.scheduleUpdate();
    }
    Sonnet.SonnetFont {
        id: family
        base: root.baseFont
        familyStack: root.fontParts[3]
    }
    GlyphRun {
        id: glyph
        width: root.width
        height: root.height
        visible: root.gpuActive
        font: family.value
        runs: [
            {
                key: 'glyph',
                text: root.command.text,
                size: Number(root.fontParts[2]),
                weight: Number(root.fontParts[1]),
                spacing: 0,
                maxBlur: 0,
                maxHaloRadius: 0
            }
        ]
        onLayoutChanged: acceptLater.restart()
    }
    ShaderEffectSource {
        id: baseTexture
        sourceItem: root.gpuActive ? glyph : null
        sourceRect: Qt.rect(0, 0, root.width, root.height)
        textureSize: Qt.size(root.width, root.height)
        live: root.streaming
        visible: false
        hideSource: true
        smooth: true
    }
    Loader {
        id: blurred
        active: root.glow && root.ready && root.live && root.gpuActive
        sourceComponent: Item {
            width: root.width
            height: root.height
            DioramaBlur {
                id: tightPass
                anchors.fill: parent
                source: baseTexture
                live: root.streaming
                sigma: 128 * .16 / 2
            }
            DioramaBlur {
                id: middlePass
                anchors.fill: parent
                source: baseTexture
                live: root.streaming
                sigma: 128 * .16
            }
            DioramaBlur {
                id: outerPass
                anchors.fill: parent
                source: baseTexture
                live: root.streaming
                sigma: 128 * .16 * 2.9 / 2
            }
            readonly property var diagnostic: [tightPass.statuses, middlePass.statuses, outerPass.statuses, combine.status]
            readonly property bool pipelineReady: tightPass.ready && middlePass.ready && outerPass.ready && combine.status !== ShaderEffect.Error
            ShaderEffect {
                id: combine
                anchors.fill: parent
                property var tight: tightPass.output
                property var middle: middlePass.output
                property var outer: outerPass.output
                fragmentShader: Qt.resolvedUrl('glow.frag.qsb')
            }
        }
    }
    ShaderEffectSource {
        id: glowTexture
        sourceItem: blurred.item
        sourceRect: Qt.rect(0, 0, root.width, root.height)
        textureSize: Qt.size(root.width, root.height)
        live: root.streaming
        visible: false
        hideSource: true
    }
    Timer {
        id: acceptLater
        interval: 0
        onTriggered: if (root.live && root.visible)
            root.accept()
    }
    onLiveChanged: {
        if (live)
            acceptLater.restart();
        else
            acceptLater.stop();
    }
    Component.onCompleted: acceptLater.restart()
    Component.onDestruction: acceptLater.stop()
}
