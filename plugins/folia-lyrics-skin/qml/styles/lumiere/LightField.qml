// Original source light field: QML uniform bindings only.
pragma ComponentBehavior: Bound
import QtQuick

ShaderEffect {
    id: root
    property var uniforms: ({})
    property real resolution: 1
    property vector2d origin: Qt.vector2d(0, 0)
    property vector2d uExtent: Qt.vector2d(width, height)
    property vector2d uOrigin: origin
    property real uPhysicalHeight: height * resolution
    function vector(key: string, index: int, count: int): var {
        const values = uniforms[key] || [], o = index * 4;
        return count === 3 ? Qt.vector3d(values[o] || 0, values[o + 1] || 0, values[o + 2] || 0) : Qt.vector4d(values[o] || 0, values[o + 1] || 0, values[o + 2] || 0, values[o + 3] || 0);
    }
    property vector4d uBeamA0: root.vector("uBeamA", 0, 4)
    property vector4d uBeamA1: root.vector("uBeamA", 1, 4)
    property vector4d uBeamA2: root.vector("uBeamA", 2, 4)
    property vector4d uBeamA3: root.vector("uBeamA", 3, 4)
    property vector4d uBeamA4: root.vector("uBeamA", 4, 4)
    property vector4d uBeamA5: root.vector("uBeamA", 5, 4)
    property vector4d uBeamB0: root.vector("uBeamB", 0, 4)
    property vector4d uBeamB1: root.vector("uBeamB", 1, 4)
    property vector4d uBeamB2: root.vector("uBeamB", 2, 4)
    property vector4d uBeamB3: root.vector("uBeamB", 3, 4)
    property vector4d uBeamB4: root.vector("uBeamB", 4, 4)
    property vector4d uBeamB5: root.vector("uBeamB", 5, 4)
    property vector4d uBeamC0: root.vector("uBeamC", 0, 4)
    property vector4d uBeamC1: root.vector("uBeamC", 1, 4)
    property vector4d uBeamC2: root.vector("uBeamC", 2, 4)
    property vector4d uBeamC3: root.vector("uBeamC", 3, 4)
    property vector4d uBeamC4: root.vector("uBeamC", 4, 4)
    property vector4d uBeamC5: root.vector("uBeamC", 5, 4)
    property vector4d uBeamD0: root.vector("uBeamD", 0, 4)
    property vector4d uBeamD1: root.vector("uBeamD", 1, 4)
    property vector4d uBeamD2: root.vector("uBeamD", 2, 4)
    property vector4d uBeamD3: root.vector("uBeamD", 3, 4)
    property vector4d uBeamD4: root.vector("uBeamD", 4, 4)
    property vector4d uBeamD5: root.vector("uBeamD", 5, 4)
    property vector4d uBeamE0: root.vector("uBeamE", 0, 4)
    property vector4d uBeamE1: root.vector("uBeamE", 1, 4)
    property vector4d uBeamE2: root.vector("uBeamE", 2, 4)
    property vector4d uBeamE3: root.vector("uBeamE", 3, 4)
    property vector4d uBeamE4: root.vector("uBeamE", 4, 4)
    property vector4d uBeamE5: root.vector("uBeamE", 5, 4)
    property vector4d uBeamF0: root.vector("uBeamF", 0, 4)
    property vector4d uBeamF1: root.vector("uBeamF", 1, 4)
    property vector4d uBeamF2: root.vector("uBeamF", 2, 4)
    property vector4d uBeamF3: root.vector("uBeamF", 3, 4)
    property vector4d uBeamF4: root.vector("uBeamF", 4, 4)
    property vector4d uBeamF5: root.vector("uBeamF", 5, 4)
    property vector4d uFrame: root.vector("uFrame", 0, 4)
    property vector4d uFogA: root.vector("uFogA", 0, 4)
    property vector4d uFogB: root.vector("uFogB", 0, 4)
    property vector3d uFogColor: root.vector("uFogColor", 0, 3)
    property vector4d uGlare: root.vector("uGlare", 0, 4)
    property vector4d uGlareB: root.vector("uGlareB", 0, 4)
    property vector3d uGlareColor: root.vector("uGlareColor", 0, 3)
    property vector4d uDark: root.vector("uDark", 0, 4)
    property vector4d uCaustic: root.vector("uCaustic", 0, 4)
    property vector4d uCausticFloor: root.vector("uCausticFloor", 0, 4)
    property vector4d uCausticB: root.vector("uCausticB", 0, 4)
    property vector4d uWave: root.vector("uWave", 0, 4)
    property vector4d uWaveB: root.vector("uWaveB", 0, 4)
    property vector4d uShield: root.vector("uShield", 0, 4)
    property vector4d uShieldB: root.vector("uShieldB", 0, 4)
    fragmentShader: Qt.resolvedUrl('light-field.frag.qsb')
}
