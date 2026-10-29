// Two bounded source surfaces and a GPU CSS composition pass; original Paper shader bodies, no CPU canvas or playback instance.
pragma ComponentBehavior: Bound
import QtQuick
import "state.mjs" as State
import "../../shared"

Item {
    id: root
    objectName: "foliaLatentBackground"
    property var settings: ({})
    property var bands: ({
            bass: 0,
            lowMid: 0,
            mid: 0,
            vocal: 0,
            treble: 0,
            audioPower: 0
        })
    property var coverColors: []
    property color backgroundColor: "#111111"
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: "#6699ff"
    property bool paused: false
    property bool motionEnabled: true
    property bool live: true
    property int colorBlendMs: 0
    readonly property var tuning: State.tuning(settings)
    readonly property var shaderColors: State.resolveColors(coverColors, {
        backgroundColor: backgroundColor.toString(),
        primaryColor: primaryColor.toString(),
        secondaryColor: secondaryColor.toString(),
        accentColor: accentColor.toString()
    }, tuning.colorSource)
    readonly property var budget: State.pixelBudget(width, height, Screen.devicePixelRatio)
    readonly property string errorString: effect.status === ShaderEffect.Error ? effect.log : ""
    readonly property real meshTime: _state.meshTime
    readonly property real ditherTime: _state.ditherTime
    property var _state: State.createState(paused)
    clip: true
    component Blend: ColorBlend {
        durationMs: root.colorBlendMs
        motionEnabled: root.motionEnabled
        live: root.live && root.visible
    }
    Blend {
        id: bgColor
        targetColor: root.backgroundColor
    }
    Blend {
        id: ditherBackColor
        targetColor: root.shaderColors.ditheringBack
    }
    Blend {
        id: ditherFrontColor
        targetColor: root.shaderColors.ditheringFront
    }
    Blend {
        id: meshColor0
        targetColor: root.shaderColors.mesh[0]
    }
    Blend {
        id: meshColor1
        targetColor: root.shaderColors.mesh[1]
    }
    Blend {
        id: meshColor2
        targetColor: root.shaderColors.mesh[2]
    }
    Blend {
        id: meshColor3
        targetColor: root.shaderColors.mesh[3]
    }
    Blend {
        id: meshColor4
        targetColor: root.shaderColors.mesh[4]
    }
    Blend {
        id: meshColor5
        targetColor: root.shaderColors.mesh[5]
    }
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled
        onTriggered: root._state = State.stepFrame(root._state, root.bands, root.tuning, root.paused, frameTime * 1000, true)
    }
    component PaperShader: ShaderEffect {
        anchors.fill: parent
        property vector2d resolution: Qt.vector2d(root.budget.width, root.budget.height)
        property real pixelRatio: root.budget.pixelRatio
        property real ditherTime: root._state.ditherTime
        property real meshTime: root._state.meshTime
        property real pixelSize: Math.max(.5, root.tuning.ditheringSize - root._state.bass * root.tuning.ditheringSize * .34)
        property real distortion: root.tuning.meshDistortion + root._state.power * .62
        property real swirl: root.tuning.meshSwirl + root._state.mid * .38
        property real ditherOpacity: Math.min(1, root.tuning.ditheringOpacity + root._state.bass * .25)
        property real ditherScale: root._state.ditherScale
        property real meshScale: root._state.meshScale
        property real saturation: root._state.saturation
        property real brightness: root._state.brightness
        property real displayMode: root.tuning.displayMode === "mesh" ? 1 : root.tuning.displayMode === "dithering" ? 2 : 0
        property real overlayOpacity: root.tuning.overlayEnabled ? root.tuning.overlayOpacity : 0
        property color backgroundColor: bgColor.value
        property color ditherBack: ditherBackColor.value
        property color ditherFront: ditherFrontColor.value
        property color mesh0: meshColor0.value
        property color mesh1: meshColor1.value
        property color mesh2: meshColor2.value
        property color mesh3: meshColor3.value
        property color mesh4: meshColor4.value
        property color mesh5: meshColor5.value
    }
    PaperShader {
        id: meshShader
        visible: root.tuning.displayMode !== "dithering"
        fragmentShader: "mesh.frag.qsb"
    }
    PaperShader {
        id: ditherShader
        visible: root.tuning.displayMode !== "mesh"
        fragmentShader: "dithering.frag.qsb"
    }
    ShaderEffectSource {
        id: meshSample
        sourceItem: meshShader
        hideSource: true
        live: root.live && root.visible && meshShader.visible
        textureSize: Qt.size(root.budget.width, root.budget.height)
        smooth: true
    }
    ShaderEffectSource {
        id: ditherSample
        sourceItem: ditherShader
        hideSource: true
        live: root.live && root.visible && ditherShader.visible
        textureSize: Qt.size(root.budget.width, root.budget.height)
        smooth: true
    }
    PaperShader {
        id: effect
        property var meshSource: meshSample
        property var ditherSource: ditherSample
        fragmentShader: "latent.frag.qsb"
    }
}
