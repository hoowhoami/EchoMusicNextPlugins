pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    required property var descriptor
    required property var resource
    required property var frame
    function matrix(a) {
        return Qt.matrix4x4(a[0], a[4], a[8], a[12], a[1], a[5], a[9], a[13], a[2], a[6], a[10], a[14], a[3], a[7], a[11], a[15]);
    }
    function v3(a) {
        return Qt.vector3d(a[0], a[1], a[2]);
    }
    readonly property string errorString: draw.item && draw.item.status === ShaderEffect.Error ? draw.item.log : ''
    Loader {
        id: draw
        anchors.fill: parent
        active: root.resource && (root.resource.ready || root.resource.bakeActive)
        sourceComponent: NativeShaderEffect {
            composition: root.descriptor.additive ? 'additive' : 'source-over'
            property var source: root.resource.output
            property matrix4x4 mvp: root.matrix(root.descriptor.mvp)
            property matrix4x4 modelView: root.matrix(root.descriptor.modelView)
            property vector2d viewport: Qt.vector2d(root.width, root.height)
            property vector2d extent: Qt.vector2d(root.descriptor.width, root.descriptor.height)
            property vector3d tint: root.v3(root.descriptor.color)
            property vector3d fogColor: root.v3(root.frame.fog.color)
            property real alpha: root.descriptor.alpha
            property real fogNear: root.frame.fog.near
            property real fogFar: root.frame.fog.far
            vertexShader: Qt.resolvedUrl('plane.vert.qsb')
            fragmentShader: Qt.resolvedUrl(root.resource.linearOutput ? 'plane-linear.frag.qsb' : 'plane.frag.qsb')
        }
    }
}
