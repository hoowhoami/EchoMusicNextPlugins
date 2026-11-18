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
    function ripple(kind, i) {
        const a = descriptor.uniforms['uRipple' + kind];
        return Qt.vector4d(a[i * 4], a[i * 4 + 1], a[i * 4 + 2], a[i * 4 + 3]);
    }
    readonly property var drawEffect: draw.item
    readonly property string errorString: draw.item && draw.item.status === ShaderEffect.Error ? draw.item.log : ''
    Loader {
        id: draw
        anchors.fill: parent
        active: root.resource && root.resource.ready
        sourceComponent: NativeShaderEffect {
            composition: root.descriptor.additive ? 'additive' : 'source-over'
            property var pointData: root.resource.output
            property matrix4x4 viewMatrix: root.matrix(root.frame.view)
            property matrix4x4 projectionMatrix: root.matrix(root.frame.projection)
            property vector3d cameraPosition: root.v3(root.frame.camera)
            property vector2d viewport: Qt.vector2d(root.width, root.height)
            property real resolution: root.frame.resolution
            property real pointCount: root.descriptor.points
            // Measured ANGLE Metal GL_POINTS carrier raster precision; other backends remain unsnapped.
            property real metalPointRaster: Qt.platform.os === 'osx' && GraphicsInfo.api === GraphicsInfo.Metal ? 1 : 0
            property real uTime: root.descriptor.uniforms.uTime
            property real uCorridor: root.descriptor.uniforms.uCorridor
            property real uAmplitude: root.descriptor.uniforms.uAmplitude
            property real uMaxSwell: root.descriptor.uniforms.uMaxSwell
            property real uWaveNumberMax: root.descriptor.uniforms.uWaveNumberMax
            property real uDetail: root.descriptor.uniforms.uDetail
            property real uOffsetGain: root.descriptor.uniforms.uOffsetGain
            property real uFlow: root.descriptor.uniforms.uFlow
            property real uFormation: root.descriptor.uniforms.uFormation
            property real uScatter: root.descriptor.uniforms.uScatter
            property real uPulse: root.descriptor.uniforms.uPulse
            property real uSpectralCentroid: root.descriptor.uniforms.uSpectralCentroid
            property real uViewportHeight: root.descriptor.uniforms.uViewportHeight
            property real uSizeBase: root.descriptor.uniforms.uSizeBase
            property real uSizeGain: root.descriptor.uniforms.uSizeGain
            property real uGlow: root.descriptor.uniforms.uGlow
            property real uGlowPass: root.descriptor.uniforms.uGlowPass
            property vector3d uPrimaryColor: root.v3(root.descriptor.uniforms.uPrimaryColor)
            property vector3d uAccentColor: root.v3(root.descriptor.uniforms.uAccentColor)
            property vector3d uSecondaryColor: root.v3(root.descriptor.uniforms.uSecondaryColor)
            property vector4d uRippleSource0: root.ripple('Source', 0)
            property vector4d uRippleShape0: root.ripple('Shape', 0)
            property vector4d uRippleSource1: root.ripple('Source', 1)
            property vector4d uRippleShape1: root.ripple('Shape', 1)
            property vector4d uRippleSource2: root.ripple('Source', 2)
            property vector4d uRippleShape2: root.ripple('Shape', 2)
            property vector4d uRippleSource3: root.ripple('Source', 3)
            property vector4d uRippleShape3: root.ripple('Shape', 3)
            property vector4d uRippleSource4: root.ripple('Source', 4)
            property vector4d uRippleShape4: root.ripple('Shape', 4)
            property vector4d uRippleSource5: root.ripple('Source', 5)
            property vector4d uRippleShape5: root.ripple('Shape', 5)
            property vector4d uRippleSource6: root.ripple('Source', 6)
            property vector4d uRippleShape6: root.ripple('Shape', 6)
            property vector4d uRippleSource7: root.ripple('Source', 7)
            property vector4d uRippleShape7: root.ripple('Shape', 7)
            property vector4d uRippleSource8: root.ripple('Source', 8)
            property vector4d uRippleShape8: root.ripple('Shape', 8)
            mesh: GridMesh {
                resolution: Qt.size(1, root.descriptor.points * 4 - 1)
            }
            vertexShader: Qt.resolvedUrl('particles.vert.qsb')
            fragmentShader: Qt.resolvedUrl('particles.frag.qsb')
        }
    }
}
