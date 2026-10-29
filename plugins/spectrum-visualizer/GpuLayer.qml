pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import EchoMusic.PluginSdk

Item {
    id: root
    required property EchoPluginContext plugin
    required property var settings
    required property var frame
    required property var colors
    required property string kind
    required property bool live
    property alias status: surface.status
    property string failure: ""
    property var resources: []
    property EchoGpuResource parameters: null
    property EchoGpuResource waveform: null
    property EchoGpuResource profile: null
    property EchoGpuResource sampler: null
    property EchoGpuResource renderPipeline: null
    property EchoGpuResource computePipeline: null
    property var parameterData: new Float32Array(544)
    property var waveData: new Float32Array(8192)
    property bool settled: true
    property bool haveSignal: false
    property string previousSamplingKey: ""
    readonly property var hostWindow: Window.window
    readonly property real pixelRatio: hostWindow ? hostWindow.devicePixelRatio : 1
    function own(resource: EchoGpuResource): EchoGpuResource {
        if (resource)
            resources.push(resource);
        return resource;
    }
    function setup(): void {
        const gpu = plugin.graphics;
        parameters = own(gpu.createBuffer({
            size: 2176,
            usage: ["uniform"],
            format: "float32"
        }));
        waveform = own(gpu.createTexture({
            width: 4096,
            height: 2,
            format: "r32f",
            usage: ["sampled"]
        }));
        profile = own(gpu.createTexture({
            width: 4096,
            height: 1,
            format: "rgba16f",
            usage: ["sampled", "storage", "readback"]
        }));
        sampler = own(gpu.createSampler({
            minFilter: "linear",
            magFilter: "linear"
        }));
        renderPipeline = own(gpu.createRenderPipeline({
            vertexShader: "shaders/gpu/spectrum.vert.qsb",
            fragmentShader: "shaders/gpu/spectrum.frag.qsb",
            blend: "alpha"
        }));
        computePipeline = own(gpu.createComputePipeline({
            computeShader: "shaders/gpu/profile.comp.qsb"
        }));
        if (!parameters || !waveform || !profile || !sampler || !renderPipeline || !computePipeline) {
            failure = gpu.errorMessage;
            return;
        }
        repaint();
    }
    function repaint(): void {
        if (!parameters || !waveform || !profile || !sampler || !renderPipeline || !computePipeline || !live)
            return;
        const samplingKey = JSON.stringify([settings.fps, settings.binCount, settings.fftSize, settings.smoothing, settings.scale, settings.mode]);
        if (samplingKey !== previousSamplingKey) {
            plugin.graphics.writeTexture(profile, new ArrayBuffer(4096 * 8));
            previousSamplingKey = samplingKey;
            haveSignal = false;
        }
        const p = parameterData, bins = frame?.bins || [], wave = frame?.waveform || [];
        p.fill(0);
        p[0] = Math.max(1, width);
        p[1] = Math.max(1, height);
        p[2] = frame && frame.state !== "idle" ? Math.max(1, Math.min(512, bins.length)) : settings.binCount;
        p[3] = Math.min(8192, wave.length);
        p[4] = ["bars", "wave", "hybrid", "mist", "centered"].indexOf(settings.mode);
        p[5] = settings.fill / 100;
        p[6] = kind === "lyric" ? 2 : kind === "mini" ? 1 : 0;
        p[7] = frame && frame.state !== "idle" ? 1 : 0;
        p[8] = settings.mistIntensity / 100;
        p[9] = settings.mistSoftness / 100;
        p[10] = settings.mistMotion / 100;
        p[11] = settings.reducedMotion ? 1 : 0;
        p[12] = settings.showBackdrop ? 1 : 0;
        p[13] = settings.centeredBarWidth;
        p[14] = settings.hdrHighlights && plugin.graphics.capabilities.localHdrSupported === true ? 1 : 0;
        p[15] = settings.hdrIntensity / 100;
        for (let c = 0; c < 3; c++) {
            const color = Qt.color(colors[c]);
            p[16 + c * 4] = color.r;
            p[17 + c * 4] = color.g;
            p[18 + c * 4] = color.b;
            p[19 + c * 4] = 1;
        }
        p[29] = frame?.rms || 0;
        p[31] = Math.max(0.01, Number(settings.opacity || 56) / 100);
        for (let i = 0; i < Math.min(512, bins.length); i++) {
            p[32 + i] = bins[i];
            if (bins[i] > 0)
                haveSignal = true;
        }
        waveData.fill(0);
        for (let i = 0; i < p[3]; i++)
            waveData[i] = wave[i];
        plugin.graphics.writeBuffer(parameters, p.buffer);
        plugin.graphics.writeTexture(waveform, waveData.buffer);
        const uniforms = [
            {
                binding: 0,
                kind: "uniform",
                resource: "frame"
            },
            {
                binding: 1,
                kind: "uniform",
                resource: parameters.id
            }
        ];
        surface.submit({
            passes: [
                {
                    type: "compute",
                    pipeline: computePipeline.id,
                    bindings: uniforms.concat([
                        {
                            binding: 2,
                            kind: "storage-image",
                            resource: profile.id,
                            access: "read-write"
                        },
                        {
                            binding: 3,
                            kind: "texture",
                            resource: waveform.id,
                            sampler: sampler.id
                        }
                    ]),
                    groups: [Math.ceil(Math.max(512, Math.min(4096, width * pixelRatio)) / 64), 1, 1]
                },
                {
                    type: "render",
                    pipeline: renderPipeline.id,
                    bindings: uniforms.concat([
                        {
                            binding: 2,
                            kind: "texture",
                            resource: profile.id,
                            sampler: sampler.id
                        }
                    ]),
                    draws: [
                        {
                            count: 3
                        }
                    ]
                }
            ]
        });
        settled = false;
        if (!frame || frame.state !== "playing") {
            if (haveSignal)
                decay.restart();
            else {
                settled = true;
                decay.stop();
            }
        } else
            decay.stop();
    }
    Component.onCompleted: setup()
    Component.onDestruction: {
        for (const resource of resources)
            if (resource)
                resource.dispose();
        resources = [];
    }
    onFrameChanged: repaint()
    onSettingsChanged: repaint()
    onColorsChanged: repaint()
    onWidthChanged: repaint()
    onHeightChanged: repaint()
    onPixelRatioChanged: repaint()
    onLiveChanged: {
        if (live)
            repaint();
    }
    Timer {
        id: decay
        interval: Math.ceil(Math.log(0.5 / Math.max(1, root.height * root.settings.fill / 100)) / Math.log(0.88)) * 1000 / Math.max(1, root.settings.fps)
        onTriggered: {
            root.settled = true;
            root.haveSignal = false;
        }
    }
    EchoGpuSurface {
        id: surface
        objectName: "spectrumGpuSurface"
        anchors.fill: parent
        graphics: root.plugin.graphics
        paused: !root.live
        fps: root.settings.fps
        continuous: root.live && (root.settings.mode === "mist" && !root.settings.reducedMotion && root.settings.mistMotion > 0 || root.settings.mode === "centered" && !root.settled || !root.frame || root.frame.state === "idle")
        dynamicRange: root.settings.hdrHighlights && root.plugin.graphics.capabilities.localHdrSupported === true ? "auto" : "sdr"
    }
}
