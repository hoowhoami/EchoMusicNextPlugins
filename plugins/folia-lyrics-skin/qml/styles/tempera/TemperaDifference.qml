pragma ComponentBehavior: Bound
import QtQuick

ShaderEffect {
    id: root
    property var source: null
    property var backdrop: null
    property var profile: ({})
    property var roi: [0, 0, width, height]
    property vector4d uInputSize: Qt.vector4d(width, height, 1 / Math.max(1, width), 1 / Math.max(1, height))
    property vector4d uOutputFrame: Qt.vector4d(roi[0], roi[1], Math.max(1, roi[2] - roi[0]), Math.max(1, roi[3] - roi[1]))
    property vector3d uInkColor: Qt.vector3d(...(profile.uInkColor || [1, 1, 1]))
    property vector3d uPaperColor: Qt.vector3d(...(profile.uPaperColor || [0, 0, 0]))
    property real uInkLuminance: profile.uInkLuminance === undefined ? 1 : profile.uInkLuminance
    property real uPaperLuminance: profile.uPaperLuminance || 0
    property real uBias: profile.uBias || 0
    property vector3d uTintA: Qt.vector3d(...(profile.uTintA || [1, 1, 1]))
    property vector3d uTintB: Qt.vector3d(...(profile.uTintB || [1, 1, 1]))
    property vector3d uTintC: Qt.vector3d(...(profile.uTintC || [1, 1, 1]))
    property vector3d uTintD: Qt.vector3d(...(profile.uTintD || [1, 1, 1]))
    property real uTintAmount: profile.uTintAmount || 0
    fragmentShader: Qt.resolvedUrl(profile.kind === 'tint' ? 'tint.frag.qsb' : 'difference.frag.qsb')
}
