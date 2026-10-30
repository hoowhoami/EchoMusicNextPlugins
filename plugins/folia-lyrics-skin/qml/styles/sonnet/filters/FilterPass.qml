// One original-source fragment pass and its retained render target.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    required property var source
    required property var profile
    required property var plan
    property bool live: true
    property real resolution: 1
    property real targetResolution: resolution
    property bool finalTarget: false
    readonly property var output: target
    readonly property string errorString: effect.status === ShaderEffect.Error ? effect.log : ""
    width: plan.frameSize[0]
    height: plan.frameSize[1]
    function number(key, fallback) {
        return profile[key] === undefined ? fallback : profile[key];
    }
    SourceEffect {
        id: effect
        anchors.fill: parent
        visible: false
        source: root.source
        profile: root.profile
        plan: root.plan
        resolution: root.resolution
        targetResolution: root.targetResolution
        finalTarget: root.finalTarget
    }
    ShaderEffectSource {
        id: target
        sourceItem: effect
        sourceRect: root.finalTarget ? Qt.rect(0, 0, root.plan.outputFrameSize[0], root.plan.outputFrameSize[1]) : Qt.rect(0, 0, root.plan.inputSize[0], root.plan.inputSize[1])
        textureSize: root.finalTarget ? Qt.size(root.plan.outputPhysicalSize.width, root.plan.outputPhysicalSize.height) : Qt.size(root.plan.physicalSize.width, root.plan.physicalSize.height)
        hideSource: true
        visible: false
        live: root.live
        smooth: true
    }
}
