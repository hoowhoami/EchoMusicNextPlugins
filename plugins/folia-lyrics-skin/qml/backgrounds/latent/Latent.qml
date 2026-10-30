// Bounded generic RHI source surfaces and full-resolution plugin-owned Quick CSS composition.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import EchoMusic.PluginSdk
import "gpu.mjs" as Gpu
import "state.mjs" as State
import "../../shared"

Item {
    id: root
    objectName: "foliaLatentBackground"
    property var graphics: null
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
    readonly property var gpuStatus: tuning.displayMode === "dithering" ? ditherSurface.status : meshSurface.status
    readonly property var meshStatus: meshSurface.status
    readonly property var ditherStatus: ditherSurface.status
    readonly property string errorString: _failure || (live && visible && !graphics ? "Latent requires a graphics service" : "") || (composition.status === ShaderEffect.Error ? composition.log : "") || sourceError(meshStatus, tuning.displayMode !== "dithering") || sourceError(ditherStatus, tuning.displayMode !== "mesh")
    readonly property bool _sourcesReady: _submitted && sourceReady(meshStatus, tuning.displayMode !== "dithering") && sourceReady(ditherStatus, tuning.displayMode !== "mesh")
    readonly property bool renderReady: _sourcesReady && _compositionReady && composition.status !== ShaderEffect.Error
    readonly property var _hostWindow: Window.window
    property bool _compositionReady: false
    property bool _compositionPending: false
    property int _meshGeneration: -1
    property int _ditherGeneration: -1
    readonly property int resourceCount: _resources.length
    property var _resources: []
    property var _ids: null
    property EchoGpuResource _parameters: null
    property var _attachedGraphics: null
    property string _failure: ""
    property bool _completed: false
    property bool _disposing: false
    property bool _retired: false
    property bool _submitted: false
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
    // No asynchronous acquisition or callbacks: a retired presentation cannot recreate resources.
    function own(resource: EchoGpuResource): EchoGpuResource {
        if (resource)
            _resources = _resources.concat([resource]);
        return resource;
    }
    function release(): void {
        if (_disposing)
            return;
        _disposing = true;
        _submitted = false;
        invalidateComposition();
        _attachedGraphics = null; // Detach the persistent graph before disposing its handles.
        _ids = null;
        _parameters = null;
        const previous = _resources;
        _resources = [];
        for (const resource of previous)
            if (resource && resource.active)
                resource.dispose();
        _disposing = false;
    }
    function retire(): void {
        if (_disposing)
            return;
        _retired = true;
        release();
    }
    function synchronize(): void {
        if (!_completed || _disposing)
            return;
        if (!live || !visible || !graphics || _retired) {
            release();
            return;
        }
        if (_attachedGraphics !== graphics) {
            release();
            _failure = "";
            _attachedGraphics = graphics;
            const parameters = own(graphics.createBuffer({
                size: Gpu.uniformBytes,
                usage: ["uniform"]
            }));
            const vertex = "qml/backgrounds/latent/gpu/fullscreen.vert.qsb";
            const meshPipeline = own(graphics.createRenderPipeline({
                vertexShader: vertex,
                fragmentShader: "qml/backgrounds/latent/gpu/mesh.frag.qsb",
                blend: "none"
            }));
            const ditherPipeline = own(graphics.createRenderPipeline({
                vertexShader: vertex,
                fragmentShader: "qml/backgrounds/latent/gpu/dithering.frag.qsb",
                blend: "none"
            }));
            if (!parameters || !meshPipeline || !ditherPipeline) {
                _failure = graphics.errorMessage || "Latent GPU resource creation failed";
                release();
                return;
            }
            _parameters = parameters;
            _ids = {
                parameters: parameters.id,
                meshPipeline: meshPipeline.id,
                ditherPipeline: ditherPipeline.id
            };
        }
        repaint();
    }
    function repaint(): void {
        if (!_completed || !live || !visible || _retired || !_ids || !_parameters || !_parameters.active || !_attachedGraphics)
            return;
        const colors = [bgColor.value, ditherBackColor.value, ditherFrontColor.value, meshColor0.value, meshColor1.value, meshColor2.value, meshColor3.value, meshColor4.value, meshColor5.value];
        const data = Gpu.packUniforms(budget, tuning, _state, colors);
        if (!_attachedGraphics.writeBuffer(_parameters, data.buffer) || !submitSources()) {
            _failure = _attachedGraphics.errorMessage || "Latent GPU frame submission failed";
            _submitted = false;
            return;
        }
        _failure = "";
        _submitted = true;
    }
    function sourceError(status, needed): string {
        return needed && (status.state === "error" || status.state === "unavailable") ? status.reason || "Latent GPU source rendering failed" : "";
    }
    function sourceReady(status, needed): bool {
        return !needed || status.state === "ready" && status.frames > 0;
    }
    function submitSources(): bool {
        const plans = Gpu.createSourcePlans(_ids);
        return meshSurface.submit(plans.mesh) && ditherSurface.submit(plans.dither);
    }
    // Qt 6.12 updateShader() reuses shaderInfoCache metadata without prepareShaderCode().
    // A new ShaderEffect manager then retains Uncompiled even while the cached shader renders:
    // qtdeclarative v6.12.0 qquickshadereffect.cpp:1168 and qsgrhishadereffectnode_p.h:113.
    // Prove readiness with a real completed window frame after both GPU sources are ready.
    function invalidateComposition(): void {
        _compositionReady = false;
        _compositionPending = false;
        requestCompositionFrame();
    }
    function requestCompositionFrame(): void {
        if (!_completed || _disposing || !live || !visible || _retired || !_attachedGraphics || !_sourcesReady || !_hostWindow || composition.status === ShaderEffect.Error || _compositionReady || _compositionPending)
            return;
        _compositionPending = true;
        _hostWindow.update();
    }
    function sourceStatusChanged(): void {
        const meshGeneration = meshStatus.generation || 0, ditherGeneration = ditherStatus.generation || 0;
        if (meshGeneration !== _meshGeneration || ditherGeneration !== _ditherGeneration) {
            _meshGeneration = meshGeneration;
            _ditherGeneration = ditherGeneration;
            invalidateComposition();
        } else
            requestCompositionFrame();
    }
    function completeCompositionFrame(): void {
        if (!_completed || _disposing || !live || !visible || _retired || !_attachedGraphics || !_sourcesReady || !_compositionPending || composition.status === ShaderEffect.Error)
            return;
        _compositionPending = false;
        _compositionReady = true;
    }
    Component.onCompleted: {
        _completed = true;
        synchronize();
    }
    Component.onDestruction: {
        _completed = false;
        retire();
    }
    onGraphicsChanged: {
        release();
        _retired = false;
        synchronize();
    }
    onLiveChanged: {
        invalidateComposition();
        synchronize();
    }
    onVisibleChanged: {
        invalidateComposition();
        synchronize();
    }
    onBudgetChanged: {
        invalidateComposition();
        synchronize();
    }
    onTuningChanged: {
        invalidateComposition();
        repaint();
    }
    onWidthChanged: invalidateComposition()
    onHeightChanged: invalidateComposition()
    onShaderColorsChanged: invalidateComposition()
    onBackgroundColorChanged: invalidateComposition()
    on_HostWindowChanged: invalidateComposition()
    onMeshStatusChanged: sourceStatusChanged()
    onDitherStatusChanged: sourceStatusChanged()
    on_SourcesReadyChanged: {
        if (!_sourcesReady) {
            _compositionReady = false;
            _compositionPending = false;
        } else
            requestCompositionFrame();
    }
    Connections {
        target: root._hostWindow
        function onFrameSwapped(): void {
            root.completeCompositionFrame();
        }
    }
    on_StateChanged: repaint()
    Connections {
        target: root._parameters
        function onChanged(): void {
            if (root._parameters && !root._parameters.active)
                root.retire();
        }
    }
    Connections {
        target: root.graphics
        function onChanged(): void {
            if (root.graphics && root.graphics.capabilities.state === "suspended" && root.graphics.capabilities.reason === "Plugin graphics scope is inactive")
                root.retire();
        }
    }
    Connections {
        target: bgColor
        function onValueChanged(): void {
            root.repaint();
        }
    }
    Connections {
        target: ditherBackColor
        function onValueChanged(): void {
            root.repaint();
        }
    }
    Connections {
        target: ditherFrontColor
        function onValueChanged(): void {
            root.repaint();
        }
    }
    Connections {
        target: meshColor0
        function onValueChanged(): void {
            root.repaint();
        }
    }
    Connections {
        target: meshColor1
        function onValueChanged(): void {
            root.repaint();
        }
    }
    Connections {
        target: meshColor2
        function onValueChanged(): void {
            root.repaint();
        }
    }
    Connections {
        target: meshColor3
        function onValueChanged(): void {
            root.repaint();
        }
    }
    Connections {
        target: meshColor4
        function onValueChanged(): void {
            root.repaint();
        }
    }
    Connections {
        target: meshColor5
        function onValueChanged(): void {
            root.repaint();
        }
    }
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled && !root._retired
        onTriggered: root._state = State.stepFrame(root._state, root.bands, root.tuning, root.paused, frameTime * 1000, true)
    }
    component SourceSurface: EchoGpuSurface {
        anchors.fill: parent
        graphics: root._attachedGraphics
        fixedColorBufferWidth: root.budget.width
        fixedColorBufferHeight: root.budget.height
        colorBufferFormat: EchoGpuSurface.RGBA8
        continuous: false
        dynamicRange: "sdr"
    }
    SourceSurface {
        id: meshSurface
        objectName: "foliaLatentMeshSurface"
        paused: !root.live || !root.visible || root._retired || root.tuning.displayMode === "dithering"
    }
    SourceSurface {
        id: ditherSurface
        objectName: "foliaLatentDitherSurface"
        paused: !root.live || !root.visible || root._retired || root.tuning.displayMode === "mesh"
    }
    // hideSource uses Qt effect references, keeping isVisible true and the RHI producers active.
    // The bounded RGBA8 capture preserves the former Quick ShaderEffectSource sampling semantics.
    ShaderEffectSource {
        id: meshSample
        sourceItem: root._attachedGraphics ? meshSurface : null
        hideSource: true
        live: root.live && root.visible && root.tuning.displayMode !== "dithering"
        textureSize: Qt.size(root.budget.width, root.budget.height)
        format: ShaderEffectSource.RGBA8
        smooth: true
    }
    ShaderEffectSource {
        id: ditherSample
        sourceItem: root._attachedGraphics ? ditherSurface : null
        hideSource: true
        live: root.live && root.visible && root.tuning.displayMode !== "mesh"
        textureSize: Qt.size(root.budget.width, root.budget.height)
        format: ShaderEffectSource.RGBA8
        smooth: true
    }
    ShaderEffect {
        id: composition
        objectName: "foliaLatentComposition"
        anchors.fill: parent
        property var meshSource: meshSample
        property var ditherSource: ditherSample
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
        fragmentShader: "gpu/composition.frag.qsb"
    }
}
