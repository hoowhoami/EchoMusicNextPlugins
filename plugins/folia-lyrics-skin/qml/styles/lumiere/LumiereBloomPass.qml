// A single original source bloom pass and its exact screen-aware pooled target.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    required property var descriptor
    required property var inputPlan
    required property var outputPlan
    required property var inputTexture
    property var addTexture: inputTexture
    property bool finalPass: false
    property bool live: true
    readonly property var output: finalPass ? effect : target
    readonly property string errorString: effect.status === ShaderEffect.Error ? effect.log : ""
    width: outputPlan.width
    height: outputPlan.height
    ShaderEffect {
        id: effect
        width: root.outputPlan.width
        height: root.outputPlan.height
        visible: root.finalPass
        property var uTexture: root.inputTexture
        property var uAdd: root.addTexture
        property vector2d uUvScale: Qt.vector2d(root.inputPlan.width / root.inputPlan.sourceWidth, root.inputPlan.height / root.inputPlan.sourceHeight)
        property vector4d uInputPixel: Qt.vector4d(root.inputPlan.pixelWidth, root.inputPlan.pixelHeight, 1 / root.inputPlan.pixelWidth, 1 / root.inputPlan.pixelHeight)
        property vector4d uInputClamp: Qt.vector4d(.5 / root.inputPlan.pixelWidth, .5 / root.inputPlan.pixelHeight, root.inputPlan.width / root.inputPlan.sourceWidth - .5 / root.inputPlan.pixelWidth, root.inputPlan.height / root.inputPlan.sourceHeight - .5 / root.inputPlan.pixelHeight)
        function vector(name: string, fallback: var): vector4d {
            const value = root.descriptor.uniforms[name] || fallback;
            return Qt.vector4d(value[0], value[1], value[2], value[3]);
        }
        property vector4d uParams: vector('uParams', [0, 0, 0, 0])
        property vector4d uAddMap: vector('uAddMap', [1, 1, 0, 0])
        property vector4d uAddClamp: vector('uAddClamp', [0, 0, 1, 1])
        property vector4d uTint: vector('uTint', [1, 1, 1, 1])
        fragmentShader: Qt.resolvedUrl('bloom-' + root.descriptor.kind + '.frag.qsb')
    }
    ShaderEffectSource {
        id: target
        sourceItem: root.finalPass ? null : effect
        sourceRect: Qt.rect(0, 0, root.outputPlan.sourceWidth, root.outputPlan.sourceHeight)
        textureSize: Qt.size(root.outputPlan.pixelWidth, root.outputPlan.pixelHeight)
        hideSource: true
        smooth: true
        visible: false
        live: root.live
    }
}
