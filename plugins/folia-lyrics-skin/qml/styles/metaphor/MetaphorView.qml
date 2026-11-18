pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    required property var model
    required property var frame
    required property EchoPluginGraphics graphicsService
    required property font baseFont
    property int weight: 300
    property bool live: true
    property bool showText: true
    readonly property var diagnostic: ({
            uploadCalls,
            live,
            visible,
            hasGraphics: !!graphicsService,
            glyphVisible: glyphTexture.visible,
            glyphBytes: glyphTexture.sourceBytes,
            glyphGpu: glyphTexture.cacheBytes,
            glyphUploads: glyphTexture.textureUploads,
            shapeBytes: shapeTexture.sourceBytes,
            shapeGpu: shapeTexture.cacheBytes,
            shapeUploads: shapeTexture.textureUploads,
            glyphCount: model.entries.length,
            shapeCount: frame.shapeCount,
            camera: frame.camera,
            fieldSize: [field.width, field.height],
            atlasSize: [glyphAtlas.width, glyphAtlas.height],
            atlasReady: glyphAtlas.ready,
            atlasPhase: glyphAtlas.phase,
            atlasInput: glyphAtlas.preparationDiagnostic,
            field: field.diagnostic
        })
    readonly property bool ready: (!showText || glyphAtlas.ready && (model.entries.length === 0 || glyphTexture.ready)) && (frame.shapeCount === 0 || shapeTexture.ready) && !errorString
    readonly property string errorString: glyphAtlas.errorString || glyphTexture.errorString || shapeTexture.errorString || field.errorString || tint.errorString || (develop.status === ShaderEffect.Error ? develop.log : "")
    readonly property real cacheBytes: glyphAtlas.cacheBytes + width * height * Screen.devicePixelRatio * Screen.devicePixelRatio * 16 + glyphTexture.cacheBytes + glyphTexture.sourceBytes + shapeTexture.cacheBytes + shapeTexture.sourceBytes
    property int uploadCalls: 0
    function upload(): void {
        ++uploadCalls;
        if (!live || !visible || width <= 0 || height <= 0 || !Window.window || !Window.window.visible || !model || !frame || !graphicsService)
            return;
        glyphTexture.uploadPacked(3, Math.max(1, model.entries.length), model.glyphData);
        shapeTexture.uploadPacked(3, frame.shapeCapacity, frame.shapeData);
    }
    onFrameChanged: uploadLater.restart()
    Timer {
        id: uploadLater
        interval: 0
        onTriggered: root.upload()
    }
    onWidthChanged: uploadLater.restart()
    onHeightChanged: uploadLater.restart()
    onGraphicsServiceChanged: uploadLater.restart()
    onVisibleChanged: if (visible)
        uploadLater.restart()
    Component.onCompleted: uploadLater.restart()
    MetaphorAtlas {
        id: glyphAtlas
        objectName: "metaphorAtlas"
        keys: root.model.keys
        baseFont: root.baseFont
        weight: root.weight
        graphicsService: root.graphicsService
        live: root.live && root.showText
    }
    FloatTexture {
        id: glyphTexture
        x: root.width / 2
        y: root.height / 2
        graphics: root.graphicsService
        width: 1
        height: 1
        active: root.live
    }
    FloatTexture {
        id: shapeTexture
        x: root.width / 2
        y: root.height / 2
        graphics: root.graphicsService
        width: 1
        height: 1
        active: root.live
    }
    MetaphorField {
        id: field
        objectName: "metaphorField"
        anchors.fill: parent
        model: root.model
        frame: root.frame
        atlas: glyphAtlas.output
        glyphData: glyphTexture
        shapeData: shapeTexture
        showText: root.showText
        glyphReady: glyphAtlas.ready
    }
    MetaphorField {
        id: tint
        anchors.fill: parent
        model: root.model
        frame: root.frame
        atlas: glyphAtlas.output
        glyphData: glyphTexture
        shapeData: shapeTexture
        showText: root.showText
        tint: true
        glyphReady: glyphAtlas.ready
    }
    ShaderEffectSource {
        id: fieldSource
        sourceItem: field
        sourceRect: Qt.rect(0, 0, root.width, root.height)
        textureSize: Qt.size(root.width * Screen.devicePixelRatio, root.height * Screen.devicePixelRatio)
        format: ShaderEffectSource.RGBA16F
        hideSource: true
        visible: false
        live: root.live
    }
    ShaderEffectSource {
        id: tintSource
        sourceItem: tint
        sourceRect: Qt.rect(0, 0, root.width, root.height)
        textureSize: Qt.size(root.width * Screen.devicePixelRatio, root.height * Screen.devicePixelRatio)
        format: ShaderEffectSource.RGBA16F
        hideSource: true
        visible: false
        live: root.live
    }
    ShaderEffect {
        id: develop
        anchors.fill: parent
        visible: root.live
        property var uField: fieldSource
        property var uTint: tintSource
        property vector2d uRes: Qt.vector2d(root.width * Screen.devicePixelRatio, root.height * Screen.devicePixelRatio)
        property real uPixelRatio: Screen.devicePixelRatio
        property real uTime: root.frame.fluidTime
        property real uFlow: root.frame.flow
        property real uGrain: root.frame.grain
        property real uDot: root.frame.dot
        property real uAngle: root.frame.angle
        property real uFlood: 0
        property real uInvert: root.frame.invert
        property real uSeed: root.frame.seed
        property real uSeeThrough: 0
        property vector3d uPaper: Qt.vector3d(...root.model.palette.paper)
        property vector3d uInk: Qt.vector3d(...root.model.palette.ink)
        property vector3d uAccent: Qt.vector3d(...root.model.palette.accent)
        property vector3d uTone: Qt.vector3d(...root.model.palette.tone)
        fragmentShader: Qt.resolvedUrl("develop.frag.qsb")
    }
}
