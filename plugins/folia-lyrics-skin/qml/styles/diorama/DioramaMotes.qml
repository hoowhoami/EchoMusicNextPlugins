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
        active: root.resource && root.resource.ready
        sourceComponent: NativeShaderEffect {
            property var pointData: root.resource.output
            property matrix4x4 viewMatrix: root.matrix(root.frame.view)
            property matrix4x4 projectionMatrix: root.matrix(root.frame.projection)
            property vector2d viewport: Qt.vector2d(root.width, root.height)
            property vector3d offset: root.v3(root.descriptor.position)
            property vector3d color: root.v3(root.descriptor.uniforms.uPrimaryColor)
            property vector3d fogColor: root.v3(root.frame.fog.color)
            property real alpha: root.descriptor.uniforms.opacity
            property real size: root.descriptor.uniforms.uSizeBase
            property real resolution: root.frame.resolution
            property real pointCount: root.descriptor.points
            // Measured ANGLE Metal GL_POINTS carrier raster precision; other backends remain unsnapped.
            property real metalPointRaster: Qt.platform.os === 'osx' && GraphicsInfo.api === GraphicsInfo.Metal ? 1 : 0
            mesh: GridMesh {
                resolution: Qt.size(1, root.descriptor.points * 4 - 1)
            }
            vertexShader: Qt.resolvedUrl('motes.vert.qsb')
            fragmentShader: Qt.resolvedUrl('motes.frag.qsb')
        }
    }
}
