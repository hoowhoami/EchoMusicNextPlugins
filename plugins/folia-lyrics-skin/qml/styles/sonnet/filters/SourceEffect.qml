pragma ComponentBehavior: Bound
import QtQuick

ShaderEffect {
    id: root
    required property var source
    required property var profile
    required property var plan
    property real resolution: 1
    property real targetResolution: resolution
    property bool finalTarget: false
    property vector2d uvScale: Qt.vector2d(...root.plan.uvScale)
    function number(key, fallback) {
        return profile[key] === undefined ? fallback : profile[key];
    }
    property vector4d uInputSize: Qt.vector4d(...root.plan.inputSize)
    property vector4d uInputClamp: Qt.vector4d(...root.plan.inputClamp)
    property vector4d uOutputFrame: Qt.vector4d(0, 0, root.plan.frameSize[0], root.plan.frameSize[1])
    property vector2d uUvScale: root.uvScale
    property vector2d uFramePhysicalSize: Qt.vector2d(root.plan.frameSize[0] * (root.finalTarget ? root.targetResolution : root.resolution), root.plan.frameSize[1] * (root.finalTarget ? root.targetResolution : root.resolution))
    property real uFlipFragY: root.finalTarget ? 1 : 0
    property real uTargetPhysicalHeight: root.finalTarget ? root.plan.outputPhysicalSize.height : 0
    property real uDistortion: root.number("uDistortion", 0)
    property real uDispersion: root.number("uDispersion", 0)
    property real uNoise: root.number("uNoise", 0)
    property real uSeed: root.number("uSeed", 0)
    property real uContrast: root.number("uContrast", 0)
    property real uAlpha: root.number("uAlpha", 1)
    property real uAmount: root.number("uAmount", 0)
    property real uStrength: root.number("uStrength", 0)
    property vector2d uDirection: root.profile.axis === "x" ? Qt.vector2d(1, 0) : Qt.vector2d(0, 1)
    fragmentShader: Qt.resolvedUrl(root.profile.kind + ".frag.qsb")
}
