// Native source Text/Graphics/bitmap primitives; complete QFont stays on each native run.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../sonnet" as Native
import "../../shared" as Shared
import "../sonnet/scene-graph.mjs" as Graph

Item {
    id: root
    property var primitive: null
    property var affine: [1, 0, 0, 0, 1, 0]
    property font baseFont
    property EchoPluginAssets assetsService: null
    property bool live: true
    readonly property int geometryBytes: vector.item ? vector.item.geometryBytes : 0
    readonly property var renderer: glyph.item
    readonly property real cacheBytes: glyph.item ? glyph.item.cacheBytes : 0
    readonly property string errorString: glyph.item ? glyph.item.errorString : image.item ? image.item.errorString : ''
    width: 1
    height: 1
    transform: Matrix4x4 {
        matrix: Qt.matrix4x4(...Graph.qtMatrix(root.affine))
    }
    function color(value) {
        if (typeof value === 'number')
            return Qt.color(Graph.color(value));
        const css = typeof value === 'string' && /^rgba?\(([^)]+)\)$/.exec(value), v = css ? css[1].split(',').map(Number) : null;
        return v ? Qt.rgba(v[0] / 255, v[1] / 255, v[2] / 255, v.length > 3 ? v[3] : 1) : Qt.color(value || '#ffffff');
    }
    Loader {
        id: vector
        active: root.live && root.primitive && root.primitive.kind === 'graphics'
        sourceComponent: Native.SonnetVector {
            paths: root.primitive.paths
            tint: root.primitive.tint || '#ffffff'
        }
    }
    Loader {
        id: glyph
        active: root.live && root.primitive && root.primitive.kind === 'text'
        sourceComponent: GlyphRun {
            id: text
            property var d: root.primitive
            font: root.baseFont
            readonly property var rows: d.metrics.lines
            runs: rows.map((line, index) => ({
                        key: 'line' + index,
                        text: line,
                        size: d.style.fontSize,
                        weight: Number(d.style.fontWeight) || 400,
                        spacing: d.style.letterSpacing || 0,
                        strokeWidth: d.metrics.strokeWidth,
                        maxBlur: 0,
                        maxHaloRadius: 0
                    }))
            poses: metrics.length !== rows.length ? [] : rows.map((line, index) => ({
                        key: 'line' + index,
                        x: -d.anchor[0] * d.metrics.width + d.metrics.strokeWidth / 2 + (d.style.align === 'center' ? (d.metrics.maxLineWidth - d.metrics.lineWidths[index]) / 2 : d.style.align === 'right' ? d.metrics.maxLineWidth - d.metrics.lineWidths[index] : 0),
                        y: -d.anchor[1] * d.metrics.height + d.metrics.baseline + index * d.metrics.lineHeight - metrics[index].baseline,
                        color: root.color(d.style.fill)
                    }))
        }
    }
    Loader {
        id: image
        active: root.live && root.primitive && root.primitive.kind === 'sprite'
        sourceComponent: Shared.AssetImage {
            objectName: "temperaSourceBitmap"
            assetsService: root.assetsService
            source: root.primitive.texture.url || root.primitive.texture.source || ''
            x: -root.primitive.anchor[0] * root.primitive.texture.width
            y: -root.primitive.anchor[1] * root.primitive.texture.height
            width: root.primitive.texture.width
            height: root.primitive.texture.height
            sourceSize: Qt.size(width, height)
            fillMode: Image.Stretch
            prepareFrames: false
            playing: false
            live: root.live
        }
    }
}
