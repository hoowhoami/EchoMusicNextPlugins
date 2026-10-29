// Generated native bridge for exact Paper uniforms.
pragma ComponentBehavior: Bound
import QtQuick

ShaderEffect {
    property var profile: ({
            uniforms: {},
            fragmentShader: 'dithering'
        })
    function rgba(value) {
        const c = value || [0, 0, 0, 0];
        return Qt.rgba(c[0], c[1], c[2], c[3]);
    }
    property vector2d u_resolution: Qt.vector2d(width, height)
    property real u_pixelRatio: 1
    property real u_imageAspectRatio: 1
    property var u_image: null
    property var u_noiseTexture: null
    property real u_originX: profile.uniforms.u_originX === undefined ? 0 : profile.uniforms.u_originX
    property real u_originY: profile.uniforms.u_originY === undefined ? 0 : profile.uniforms.u_originY
    property real u_worldWidth: profile.uniforms.u_worldWidth === undefined ? 0 : profile.uniforms.u_worldWidth
    property real u_worldHeight: profile.uniforms.u_worldHeight === undefined ? 0 : profile.uniforms.u_worldHeight
    property real u_fit: profile.uniforms.u_fit === undefined ? 0 : profile.uniforms.u_fit
    property real u_scale: profile.uniforms.u_scale === undefined ? 0 : profile.uniforms.u_scale
    property real u_rotation: profile.uniforms.u_rotation === undefined ? 0 : profile.uniforms.u_rotation
    property real u_offsetX: profile.uniforms.u_offsetX === undefined ? 0 : profile.uniforms.u_offsetX
    property real u_offsetY: profile.uniforms.u_offsetY === undefined ? 0 : profile.uniforms.u_offsetY
    property color c_colorBack: rgba(profile.uniforms.u_colorBack)
    property color c_colorShadow: rgba(profile.uniforms.u_colorShadow)
    property color c_colorHighlight: rgba(profile.uniforms.u_colorHighlight)
    property real u_size: profile.uniforms.u_size === undefined ? 0 : profile.uniforms.u_size
    property real u_shadows: profile.uniforms.u_shadows === undefined ? 0 : profile.uniforms.u_shadows
    property real u_angle: profile.uniforms.u_angle === undefined ? 0 : profile.uniforms.u_angle
    property real u_stretch: profile.uniforms.u_stretch === undefined ? 0 : profile.uniforms.u_stretch
    property real u_shape: profile.uniforms.u_shape === undefined ? 0 : profile.uniforms.u_shape
    property real u_distortion: profile.uniforms.u_distortion === undefined ? 0 : profile.uniforms.u_distortion
    property real u_highlights: profile.uniforms.u_highlights === undefined ? 0 : profile.uniforms.u_highlights
    property real u_distortionShape: profile.uniforms.u_distortionShape === undefined ? 0 : profile.uniforms.u_distortionShape
    property real u_shift: profile.uniforms.u_shift === undefined ? 0 : profile.uniforms.u_shift
    property real u_blur: profile.uniforms.u_blur === undefined ? 0 : profile.uniforms.u_blur
    property real u_edges: profile.uniforms.u_edges === undefined ? 0 : profile.uniforms.u_edges
    property real u_marginLeft: profile.uniforms.u_marginLeft === undefined ? 0 : profile.uniforms.u_marginLeft
    property real u_marginRight: profile.uniforms.u_marginRight === undefined ? 0 : profile.uniforms.u_marginRight
    property real u_marginTop: profile.uniforms.u_marginTop === undefined ? 0 : profile.uniforms.u_marginTop
    property real u_marginBottom: profile.uniforms.u_marginBottom === undefined ? 0 : profile.uniforms.u_marginBottom
    property real u_grainMixer: profile.uniforms.u_grainMixer === undefined ? 0 : profile.uniforms.u_grainMixer
    property real u_grainOverlay: profile.uniforms.u_grainOverlay === undefined ? 0 : profile.uniforms.u_grainOverlay
    property color c_colorFront: rgba(profile.uniforms.u_colorFront)
    property real u_contrast: profile.uniforms.u_contrast === undefined ? 0 : profile.uniforms.u_contrast
    property real u_roughness: profile.uniforms.u_roughness === undefined ? 0 : profile.uniforms.u_roughness
    property real u_fiber: profile.uniforms.u_fiber === undefined ? 0 : profile.uniforms.u_fiber
    property real u_fiberSize: profile.uniforms.u_fiberSize === undefined ? 0 : profile.uniforms.u_fiberSize
    property real u_crumples: profile.uniforms.u_crumples === undefined ? 0 : profile.uniforms.u_crumples
    property real u_crumpleSize: profile.uniforms.u_crumpleSize === undefined ? 0 : profile.uniforms.u_crumpleSize
    property real u_folds: profile.uniforms.u_folds === undefined ? 0 : profile.uniforms.u_folds
    property real u_foldCount: profile.uniforms.u_foldCount === undefined ? 0 : profile.uniforms.u_foldCount
    property real u_drops: profile.uniforms.u_drops === undefined ? 0 : profile.uniforms.u_drops
    property real u_seed: profile.uniforms.u_seed === undefined ? 0 : profile.uniforms.u_seed
    property real u_fade: profile.uniforms.u_fade === undefined ? 0 : profile.uniforms.u_fade
    property real u_time: profile.uniforms.u_time === undefined ? 0 : profile.uniforms.u_time
    property real u_radius: profile.uniforms.u_radius === undefined ? 0 : profile.uniforms.u_radius
    property real u_grainSize: profile.uniforms.u_grainSize === undefined ? 0 : profile.uniforms.u_grainSize
    property real u_grid: profile.uniforms.u_grid === undefined ? 0 : profile.uniforms.u_grid
    property bool u_originalColors: profile.uniforms.u_originalColors === undefined ? false : profile.uniforms.u_originalColors
    property bool u_inverted: profile.uniforms.u_inverted === undefined ? false : profile.uniforms.u_inverted
    property real u_type: profile.uniforms.u_type === undefined ? 0 : profile.uniforms.u_type
    property real u_spread: profile.uniforms.u_spread === undefined ? 0 : profile.uniforms.u_spread
    property real u_bias: profile.uniforms.u_bias === undefined ? 0 : profile.uniforms.u_bias
    property real u_perspective: profile.uniforms.u_perspective === undefined ? 0 : profile.uniforms.u_perspective
    property real u_count: profile.uniforms.u_count === undefined ? 0 : profile.uniforms.u_count
    property real u_dispersion: profile.uniforms.u_dispersion === undefined ? 0 : profile.uniforms.u_dispersion
    property real u_dispersionShift: profile.uniforms.u_dispersionShift === undefined ? 0 : profile.uniforms.u_dispersionShift
    property real u_dispersionColor: profile.uniforms.u_dispersionColor === undefined ? 0 : profile.uniforms.u_dispersionColor
    property real u_focusCenter: profile.uniforms.u_focusCenter === undefined ? 0 : profile.uniforms.u_focusCenter
    property real u_focusEdges: profile.uniforms.u_focusEdges === undefined ? 0 : profile.uniforms.u_focusEdges
    property real u_swirl: profile.uniforms.u_swirl === undefined ? 0 : profile.uniforms.u_swirl
    property real u_noise: profile.uniforms.u_noise === undefined ? 0 : profile.uniforms.u_noise
    property real u_noiseFrequency: profile.uniforms.u_noiseFrequency === undefined ? 0 : profile.uniforms.u_noiseFrequency
    property real u_noiseOffset: profile.uniforms.u_noiseOffset === undefined ? 0 : profile.uniforms.u_noiseOffset
    property real u_lensBulge: profile.uniforms.u_lensBulge === undefined ? 0 : profile.uniforms.u_lensBulge
    property real u_lensCircle: profile.uniforms.u_lensCircle === undefined ? 0 : profile.uniforms.u_lensCircle
    property real u_imageX: profile.uniforms.u_imageX === undefined ? 0 : profile.uniforms.u_imageX
    property real u_imageY: profile.uniforms.u_imageY === undefined ? 0 : profile.uniforms.u_imageY
    property real u_pxSize: profile.uniforms.u_pxSize === undefined ? 0 : profile.uniforms.u_pxSize
    property real u_colorSteps: profile.uniforms.u_colorSteps === undefined ? 0 : profile.uniforms.u_colorSteps
    vertexShader: Qt.resolvedUrl('image.vert.qsb')
    fragmentShader: Qt.resolvedUrl(profile.fragmentShader + '.frag.qsb')
}
