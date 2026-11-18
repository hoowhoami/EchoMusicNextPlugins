pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    required property var model
    required property var frame
    required property var atlas
    required property var glyphData
    required property var shapeData
    property bool tint: false
    property bool showText: true
    property bool glyphReady: false
    readonly property var diagnostic: ({
            glyphCamera: [glyph.camera.x, glyph.camera.y, glyph.camera.z, glyph.camera.w],
            shapeCamera: [shape.camera.x, shape.camera.y, shape.camera.z, shape.camera.w],
            viewport: [shape.viewport.x, shape.viewport.y],
            enabled: [glyph.uEnabled, shape.uEnabled],
            tint: [glyph.uOutputTint, shape.uOutputTint],
            size: [width, height],
            visible,
            opacity
        })
    readonly property string errorString: (glyph.status === ShaderEffect.Error ? glyph.log : "") || (shape.status === ShaderEffect.Error ? shape.log : "")
    NativeShaderEffect {
        id: glyph
        anchors.fill: parent
        visible: root.showText && root.model.entries.length > 0
        composition: "additive"
        property var uAtlas: root.atlas
        property var instanceData: root.glyphData
        property vector2d viewport: Qt.vector2d(root.width, root.height)
        property vector4d camera: Qt.vector4d(...root.frame.camera)
        property real uTime: root.frame.time
        property real uMelt: root.frame.melt
        property real uPop: root.frame.pop
        property real uReveal: root.frame.reveal
        property real uShakeTime: root.frame.shakeTime
        property real uWobble: root.frame.wobble
        property real uOutputTint: root.tint ? 1 : 0
        property real uEnabled: root.glyphReady ? 1 : 0
        mesh: GridMesh {
            resolution: Qt.size(1, Math.max(1, root.model.entries.length) * 4 - 1)
        }
        vertexShader: Qt.resolvedUrl("glyph.vert.qsb")
        fragmentShader: Qt.resolvedUrl("glyph.frag.qsb")
    }
    NativeShaderEffect {
        id: shape
        anchors.fill: parent
        visible: root.frame.shapeCount > 0
        composition: "additive"
        property var instanceData: root.shapeData
        property vector2d viewport: Qt.vector2d(root.width, root.height)
        property vector4d camera: Qt.vector4d(...root.frame.camera)
        property real uTime: root.frame.shakeTime
        property real uWobble: root.frame.wobble
        property vector3d uAccent: Qt.vector3d(...root.model.palette.accent)
        property real uOutputTint: root.tint ? 1 : 0
        property real uEnabled: 1
        property real uCount: root.frame.shapeCount
        mesh: GridMesh {
            resolution: Qt.size(1, Math.max(1, root.frame.shapeCount) * 4 - 1)
        }
        vertexShader: Qt.resolvedUrl("shape.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shape.frag.qsb")
    }
}
