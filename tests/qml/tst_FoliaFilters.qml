import QtQuick
import QtTest

TestCase {
    id: testCase
    name: "FoliaFilters"
    when: windowShown
    visible: true
    width: 256
    height: 128
    Rectangle {
        anchors.fill: parent
        color: "black"
        z: -10
    }
    Item {
        id: patches
        width: 256
        height: 128
        visible: false
        Rectangle {
            width: 128
            height: 128
            color: Qt.rgba(.25, .25, .25, .5)
        }
        Rectangle {
            x: 128
            width: 128
            height: 128
            color: "#ff0000"
        }
        Rectangle {
            x: 60
            width: 2
            height: 128
            color: "white"
        }
        Rectangle {
            y: 60
            height: 2
            width: 256
            color: "white"
        }
    }
    Item {
        id: redPatch
        width: 256
        height: 128
        visible: false
        Rectangle {
            anchors.fill: parent
            color: Qt.rgba(1, 0, 0, .5)
        }
    }
    Item {
        id: bluePatch
        width: 256
        height: 128
        visible: false
        Rectangle {
            anchors.fill: parent
            color: Qt.rgba(0, 0, 1, .5)
        }
    }
    ShaderEffectSource {
        id: redTexture
        sourceItem: redPatch
        hideSource: true
        visible: false
        textureSize: Qt.size(512, 256)
    }
    ShaderEffectSource {
        id: blueTexture
        sourceItem: bluePatch
        hideSource: true
        visible: false
        textureSize: Qt.size(512, 256)
    }
    function test_screenBlendPreservesPremultipliedSourceFactors() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/sonnet/filters/ScreenBlend.qml");
        compare(component.status, Component.Ready, component.errorString());
        const view = createTemporaryObject(component, testCase, {
            width: 256,
            height: 128,
            sourceA: redTexture,
            sourceB: blueTexture
        });
        waitForRendering(view);
        const pixels = grabImage(view);
        verify(Math.abs(pixels.red(pixels.width * .5, pixels.height * .5) - 128) < 3);
        verify(Math.abs(pixels.blue(pixels.width * .5, pixels.height * .5) - 128) < 3);
    }
    function createChain(passes) {
        const c = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/sonnet/filters/FilterChain.qml");
        compare(c.status, Component.Ready, c.errorString());
        return createTemporaryObject(c, testCase, {
            width: 256,
            height: 128,
            source: patches,
            sourceIsTextureProvider: false,
            resolution: 1.5,
            passes: passes
        });
    }
    function test_canvasRegistryUsesRealPhysicalScreenInsteadOfUnconditionalPowerOfTwo() {
        const chain = createChain([]);
        tryVerify(() => chain.ready, 5000);
        compare(chain.output.textureSize, Qt.size(384, 192));
        compare(chain.outputUvScale, Qt.vector2d(1, 1));
        chain.canvasSize = Qt.size(1000, 1000);
        compare(chain.output.textureSize, Qt.size(512, 256));
        verify(chain.outputUvScale.x < 1);
    }
    function test_sourceContrastUsesStraightColorThenPremultiplies() {
        const chain = createChain([
            {
                kind: "contrast",
                uContrast: .5
            }
        ]);
        tryVerify(() => chain.ready || chain.errorString.length > 0, 5000);
        compare(chain.errorString, "");
        compare(chain.errorString, "");
        waitForRendering(chain);
        const pixels = grabImage(chain);
        console.log("Filter native image", pixels.width, pixels.height, "DPR", Screen.devicePixelRatio);
        const x = Math.floor(pixels.width * .125), y = Math.floor(pixels.height * .25);
        verify(Math.abs(pixels.red(x, y) - 16) < 4, "Source ColorMatrix contrast must unpremultiply first: " + pixels.red(x, y));
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
    }
    function test_lastPassRasterizesAtCanvasResolutionInsteadOfUpscalingLowResolutionPixels() {
        const chain = createChain([
            {
                kind: "halftone",
                uAmount: 1
            }
        ]);
        chain.resolution = 1;
        chain.targetResolution = 2;
        tryVerify(() => chain.ready || chain.errorString.length, 5000);
        compare(chain.errorString, "");
        compare(chain.output.textureSize, Qt.size(512, 256));
        compare(chain.outputUvScale, Qt.vector2d(1, 1));
        compare(chain.outputFrameSize, Qt.size(256, 128));
        waitForRendering(chain);
        const pixels = grabImage(chain);
        // The original halftone blue screen uses 5 physical pixels, not five logical pixels.
        // Its blue-only white horizontal source patch has multiple different adjacent samples.
        let transitions = 0;
        for (let x = 4; x < pixels.width - 4; ++x)
            if (Math.abs(pixels.blue(x, 121) - pixels.blue(x - 1, 121)) > 8)
                ++transitions;
        verify(transitions > 100, "Source root pass needs physical-resolution dot cells: " + transitions);
        const revision = chain.allocationRevision;
        chain.targetResolution = 1.5;
        compare(chain.output.textureSize, Qt.size(384, 192));
        verify(chain.allocationRevision > revision);
    }
    function test_pooledTextureProviderCanFeedAnotherChainWithoutStretch() {
        const first = createChain([]);
        first.present = false;
        tryVerify(() => first.ready, 5000);
        const second = createChain([
            {
                kind: "contrast",
                uContrast: .5
            }
        ]);
        second.sourceIsTextureProvider = true;
        second.source = first.output;
        second.inputUvScale = first.outputUvScale;
        tryVerify(() => second.ready, 5000);
        waitForRendering(second);
        const pixels = grabImage(second);
        verify(Math.abs(pixels.red(pixels.width * .125, pixels.height * .25) - 16) < 4, "Pooled sampler pixel: " + pixels.red(pixels.width * .125, pixels.height * .25));
    }
    function test_everyOriginalShaderPaintsAndRandomPassesRemainDeterministic() {
        const baseline = createChain([]);
        tryVerify(() => baseline.ready, 5000);
        waitForRendering(baseline);
        const plain = grabImage(baseline);
        baseline.live = false;
        baseline.destroy();
        const effects = [
            {
                kind: "lens",
                uDistortion: 1,
                uDispersion: .5
            },
            {
                kind: "noise",
                uNoise: .25,
                uSeed: .731
            },
            {
                kind: "contrast",
                uContrast: .5
            },
            {
                kind: "rgb",
                uAmount: .7
            },
            {
                kind: "halftone",
                uAmount: .8
            },
            {
                kind: "vignette",
                uAmount: 1.2
            },
            {
                kind: "glitch",
                uAmount: 1,
                uSeed: 37
            },
            {
                kind: "blur",
                strength: 4.6,
                quality: 2,
                kernelSize: 5
            }
        ];
        for (const descriptor of effects) {
            const view = createChain([descriptor]);
            tryVerify(() => view.ready || view.errorString.length, 5000);
            compare(view.errorString, "");
            waitForRendering(view);
            const first = grabImage(view);
            verify(!plain.equals(first), descriptor.kind + " must produce real pixels");
            view.output.scheduleUpdate();
            waitForRendering(view);
            const second = grabImage(view);
            verify(first.equals(second), descriptor.kind + " must be seek deterministic with unchanged source/seed");
            view.live = false;
            view.destroy();
        }
    }
    function test_excessiveTargetsFailExplicitlyBeforeAllocating() {
        const view = createChain([
            {
                kind: "noise",
                uNoise: .1,
                uSeed: .3
            }
        ]);
        view.width = 8000;
        view.height = 8000;
        view.resolution = 4;
        tryVerify(() => view.errorString.length > 0, 5000);
        verify(/budget|texture/i.test(view.errorString));
        compare(view.ready, false);
        compare(view.output, null);
        compare(view.cacheBytes, 0);
    }
    function test_screenBlendCropsPaddedSourceUsingExplicitUvOffset() {
        const first = createChain([]);
        first.present = false;
        tryVerify(() => first.ready, 5000);
        const c = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/sonnet/filters/ScreenBlend.qml");
        compare(c.status, Component.Ready, c.errorString());
        const view = createTemporaryObject(c, testCase, {
            width: 256,
            height: 128,
            sourceA: redTexture,
            sourceB: first.output,
            amountA: 0,
            uvScaleB: Qt.vector2d(first.outputUvScale.x * .5, first.outputUvScale.y),
            uvOffsetB: Qt.vector2d(first.outputUvScale.x * .5, 0)
        });
        waitForRendering(view);
        const image = grabImage(view);
        compare(image.red(image.width * .125, image.height * .125), 255);
        compare(image.green(image.width * .125, image.height * .125), 0);
    }
    function test_uniformUpdatesKeepTargetsAndHiddenReleases() {
        const chain = createChain([
            {
                kind: "lens",
                uDistortion: .3,
                uDispersion: .2
            }
        ]);
        tryVerify(() => chain.ready || chain.errorString.length > 0, 5000);
        compare(chain.errorString, "");
        verify(chain.cacheBytes > 0);
        const revision = chain.allocationRevision;
        for (let i = 0; i < 8; i++)
            chain.passes = [
                {
                    kind: "lens",
                    uDistortion: .3 + i * .03,
                    uDispersion: .2
                }
            ];
        wait(30);
        compare(chain.allocationRevision, revision);
        chain.live = false;
        compare(chain.output, null);
        compare(chain.passCount, 0);
        compare(chain.cacheBytes, 0);
    }
}
