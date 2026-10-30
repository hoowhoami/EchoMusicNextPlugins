import QtQuick
import QtQuick.Window
import QtTest
import EchoMusic.PluginSdk
import "../../plugins/folia-lyrics-skin/qml/shared" as Shared
import "../../plugins/folia-lyrics-skin/qml/backgrounds/monet" as NativeMonet
import "../../plugins/folia-lyrics-skin/qml/backgrounds/monet/presentation.mjs" as Presentation
import "../../plugins/folia-lyrics-skin/qml/backgrounds/monet/api.mjs" as Monet

TestCase {
    id: testCase
    name: "FoliaMonetBackgroundNative"
    when: windowShown
    visible: true
    width: 640
    height: 480
    property int swapped: 0
    property bool requestFrames: false
    Connections {
        target: testCase.Window.window
        function onFrameSwapped(): void {
            ++testCase.swapped;
        }
    }
    Rectangle {
        id: marker
        width: 1
        height: 1
        color: 'black'
    }
    FrameAnimation {
        running: testCase.requestFrames
        onTriggered: marker.x = (marker.x + 1) % 16
    }

    function test_painterNeedsRealSourceDimensionsBeforeDecode() {
        const component = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/backgrounds/monet/MonetPainter.qml');
        compare(component.status, Component.Ready, component.errorString());
        const painter = createTemporaryObject(component, testCase, {
            width: 1920,
            height: 1080
        });
        verify(painter !== null);
        verify(painter.errorString.length > 0);
        compare(painter.inputBytes, 0);
        compare(painter.fboBytes, 0);
        compare(painter.ready, false);
    }
    Component {
        id: collectionComponent
        Shared.AssetCollection {
            plugin: foliaTestPlugin
            collection: 'test.monet.background'
        }
    }
    function authorizedImage() {
        const collection = createTemporaryObject(collectionComponent, testCase);
        tryVerify(() => !collection.busy, 15000);
        compare(collection.errorString, '');
        collection.importFiles();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept('png'));
        tryVerify(() => !collection.busy, 15000);
        compare(collection.errorString, '');
        verify(collection.assets.length > 0);
        return collection.assets[collection.assets.length - 1];
    }
    ImageCapture {
        id: capture
    }
    Component {
        id: imageComponent
        Image {
            width: 640
            height: 360
            asynchronous: true
            cache: false
        }
    }
    function test_sourceCanvasAgainstStaticGpuPainter() {
        failOnWarning(/ShaderEffect: Texture|invalid context|TypeError/);
        const component = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/backgrounds/monet/MonetPainter.qml');
        compare(component.status, Component.Ready, component.errorString());
        const painter = createTemporaryObject(component, testCase, {
            x: -20000,
            source: Qt.resolvedUrl('../../build/folia-monet-background-oracle/input.png'),
            sourceWidth: 64,
            sourceHeight: 48,
            colors: {
                backgroundColor: '#172331',
                primaryColor: '#f3e7d1',
                accentColor: '#93b9f1'
            }
        });
        const actual = createTemporaryObject(imageComponent, testCase);
        for (const sigma of [0, 6, 60]) {
            painter.tuning = Object.assign({}, Monet.DEFAULT_MONET_BACKGROUND_TUNING, {
                backgroundBlurPx: sigma
            });
            tryVerify(() => painter.ready || painter.errorString.length > 0, 20000);
            compare(painter.errorString, '');
            verify(painter.ready);
            const lease = capture.encode(painter.output, 1920, 1080, 'png', 100);
            tryVerify(() => lease.status !== 'pending', 20000);
            compare(lease.errorString, '');
            verify(lease.ready);
            compare(lease.width, 1920);
            compare(lease.height, 1080);
            actual.source = lease.url;
            tryVerify(() => actual.status === Image.Ready, 5000);
            const a = grabImage(actual);
            actual.source = Qt.resolvedUrl('../../build/folia-monet-background-oracle/chrome-' + sigma + '.png');
            tryVerify(() => actual.status === Image.Ready, 5000);
            const b = grabImage(actual);
            compare(a.width, b.width);
            compare(a.height, b.height);
            let error = 0, maximum = 0, mass = 0;
            for (let y = 0; y < a.height; y += 2)
                for (let x = 0; x < a.width; x += 2) {
                    for (const component of ['red', 'green', 'blue']) {
                        const delta = Math.abs(a[component](x, y) - b[component](x, y));
                        error += delta;
                        maximum = Math.max(maximum, delta);
                        mass += b[component](x, y);
                    }
                }
            const mean = error / (Math.ceil(a.width / 2) * Math.ceil(a.height / 2) * 3);
            console.info('MONET_GPU_CHROME', sigma, 'mean', mean, 'max', maximum, 'relative', error / mass, 'cache', painter.cacheBytes);
            a.save('build/folia-monet-background-oracle/native-' + sigma + '.png');
            verify(mean <= 2, 'Original Canvas RGB mean error=' + mean);
            verify(maximum <= 24, 'Original Canvas RGB max error=' + maximum);
            lease.dispose();
        }
        painter.live = false;
        compare(painter.fboBytes, 0);
        compare(painter.inputBytes, 0);
        compare(painter.ready, false);
    }
    function test_originalPipelineUsesRealMetadataGpuJpegDecodeAndScopeLeases() {
        const component = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/backgrounds/monet/MonetPipeline.qml');
        compare(component.status, Component.Ready, component.errorString());
        const pipeline = createTemporaryObject(component, testCase, {
            assetsService: foliaTestPlugin.assets
        });
        verify(pipeline.pipeline !== null);
        const asset = authorizedImage();
        const options = {
            coverUrl: asset.url.toString(),
            theme: {
                backgroundColor: '#172331',
                primaryColor: '#f3e7d1',
                accentColor: '#93b9f1'
            },
            tuning: Monet.DEFAULT_MONET_BACKGROUND_TUNING
        };
        const one = pipeline.pipeline.wantMonetBackgroundUrl(options), two = pipeline.pipeline.wantMonetBackgroundUrl(options);
        let ready = false, url = null;
        one.url.then(value => {
            url = value;
            ready = true;
        });
        tryVerify(() => ready, 15000, 'native pipeline must settle: ' + pipeline.errorString);
        verify(typeof url === 'string' && url.length > 0, 'actual native JPEG/decode: ' + pipeline.errorString);
        compare(pipeline.paintCount, 1);
        compare(pipeline.readbacks, 1);
        compare(pipeline.encodes, 1);
        compare(pipeline.decodeCount, 2);
        compare(pipeline.painterBytes, 0);
        one.release();
        two.release();
        pipeline.active = false;
        compare(pipeline.pictureLeases, 0);
        compare(pipeline.cacheEntries, 0);
    }
    function test_staticPainterAndCaptureRemainUnchangedAcross120ActualFrames() {
        const component = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/backgrounds/monet/MonetPainter.qml');
        compare(component.status, Component.Ready, component.errorString());
        const painter = createTemporaryObject(component, testCase, {
            x: -20000,
            source: Qt.resolvedUrl('../../build/folia-monet-background-oracle/input.png'),
            sourceWidth: 64,
            sourceHeight: 48
        });
        tryVerify(() => painter.ready || painter.errorString.length > 0, 20000);
        compare(painter.errorString, '');
        verify(painter.ready);
        const lease = capture.encode(painter.output, 1920, 1080, 'jpeg', 92);
        tryVerify(() => lease.status !== 'pending', 15000);
        verify(lease.ready, lease.errorString);
        const before = [painter.bakeCount, painter.textureUpdates, capture.readbacks, capture.encodes];
        const start = swapped;
        requestFrames = true;
        tryVerify(() => swapped >= start + 120, 10000, 'actual frameSwapped count');
        requestFrames = false;
        compare(painter.bakeCount, before[0]);
        compare(painter.textureUpdates, before[1]);
        compare(capture.readbacks, before[2]);
        compare(capture.encodes, before[3]);
        for (const key of ['visible', 'live']) {
            painter[key] = false;
            compare(painter.ready, false);
            compare(painter.fboBytes, 0);
            compare(painter.inputBytes, 0);
            painter[key] = true;
            tryVerify(() => painter.ready, 10000);
        }
        painter.live = false;
        lease.dispose();
    }
    function test_completeLayerPreservesBothLayoutsAndHiddenScope() {
        const component = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/backgrounds/monet/MonetBackground.qml');
        compare(component.status, Component.Ready, component.errorString());
        const asset = authorizedImage();
        const actor = createTemporaryObject(component, testCase, {
            width: 640,
            height: 360,
            assetsService: foliaTestPlugin.assets,
            customBackgroundImages: [asset],
            paused: true
        });
        compare(actor.renderReady, false, 'no ready before source preparation has begun');
        tryVerify(() => actor.renderReady || actor.errorString.length > 0, 20000);
        compare(actor.errorString, '');
        verify(actor.renderReady);
        const before = actor.pipelineController.paintCount;
        actor.settings = {
            monetBackgroundLayout: 'half-pane-gradient'
        };
        wait(100);
        compare(actor.pipelineController.paintCount, before, 'layout is excluded from paint key');
        actor.motionEnabled = false;
        compare(actor.driftRunning, false);
        actor.settings = {
            monetBackgroundLayout: 'half-pane-gradient',
            monetBackgroundWash: .1
        };
        actor.settings = {
            monetBackgroundLayout: 'half-pane-gradient',
            monetBackgroundWash: .3
        };
        actor.settings = {
            monetBackgroundLayout: 'half-pane-gradient',
            monetBackgroundWash: .8
        };
        tryVerify(() => actor.pipelineController.paintCount === before + 1 && !actor.pipelinePending, 15000);
        tryVerify(() => actor.pictureCount === 1, 2000, 'original .8s exit must release old layer');
        compare(actor.errorString, '');
        const image = grabImage(actor);
        image.save('build/folia-monet-background-oracle/complete-half.png');
        let light = 0;
        for (let y = 0; y < image.height; y += 4)
            for (let x = 0; x < image.width; x += 4)
                if (image.red(x, y) + image.green(x, y) + image.blue(x, y) > 60)
                    light++;
        verify(light > 100, 'real full layer gradient/processed-image pixels');
        actor.visible = false;
        compare(actor.cacheBytes, 0);
        compare(actor.pictureCount, 0);
        compare(actor.pipelineController.pipeline, null);
        actor.visible = true;
        tryVerify(() => actor.renderReady || actor.errorString.length > 0, 15000);
        compare(actor.errorString, '');
        verify(actor.renderReady);
        actor.live = false;
        compare(actor.cacheBytes, 0);
        compare(actor.pictureCount, 0);
    }
    Component {
        id: cssSceneComponent
        Item {
            id: scene
            property bool halfPane: false
            property bool daylight: false
            property real offset: 0
            property alias ready: image.ready
            NativeMonet.MonetGradient {
                anchors.fill: parent
                backgroundColor: '#172331'
                primaryColor: '#f3e7d1'
                accentColor: '#93b9f1'
                halfPane: scene.halfPane
            }
            NativeMonet.MonetPicture {
                id: image
                width: scene.halfPane ? scene.width * Presentation.paneFraction(scene.width) : scene.width
                height: scene.height
                pictureKey: 'independent-source-css'
                source: Qt.resolvedUrl('../../build/folia-monet-background-oracle/chrome-6.png')
                sourceWidth: 1920
                sourceHeight: 1080
                processed: true
                halfPane: scene.halfPane
                positionX: scene.halfPane ? Math.max(.1, Math.min(.9, .5 + scene.offset / 100)) : .5
                backgroundColor: '#172331'
                accentColor: '#93b9f1'
                devicePixelRatio: scene.Screen.devicePixelRatio
                opacity: scene.halfPane ? (scene.daylight ? .7 : .3) + .74 * .16 : 1
            }
            NativeMonet.MonetGradient {
                anchors.fill: parent
                backgroundColor: '#172331'
                primaryColor: '#f3e7d1'
                accentColor: '#93b9f1'
                halfPane: scene.halfPane
                overlay: true
            }
        }
    }
    function test_actualOriginalCssSourceScreenshots() {
        failOnWarning(/ShaderEffect: Texture|invalid context|TypeError/);
        const cases = [
            {
                name: 'full',
                width: 640,
                halfPane: false,
                daylight: false,
                offset: 0
            },
            {
                name: 'half639',
                width: 639,
                halfPane: true,
                daylight: false,
                offset: -40
            },
            {
                name: 'half640',
                width: 640,
                halfPane: true,
                daylight: true,
                offset: 40
            },
            {
                name: 'half1024',
                width: 1024,
                halfPane: true,
                daylight: false,
                offset: 0
            }
        ];
        const win = testCase.Window.window, oldWidth = win.width, oldHeight = win.height;
        const reference = createTemporaryObject(imageComponent, testCase);
        for (const spec of cases) {
            win.width = spec.width;
            win.height = 360;
            testCase.width = spec.width;
            reference.source = '';
            const scene = createTemporaryObject(cssSceneComponent, testCase, {
                width: spec.width,
                height: 360,
                halfPane: spec.halfPane,
                daylight: spec.daylight,
                offset: spec.offset
            });
            tryVerify(() => scene.ready, 5000);
            wait(50);
            const actual = grabImage(scene);
            scene.visible = false;
            reference.width = spec.width;
            reference.height = 360;
            reference.source = Qt.resolvedUrl('../../build/folia-monet-background-oracle/css-' + spec.name + '.png');
            tryVerify(() => reference.status === Image.Ready, 5000);
            const expected = grabImage(reference);
            compare(actual.width, expected.width);
            compare(actual.height, expected.height);
            let error = 0, max = 0, count = 0;
            for (let y = 0; y < actual.height; y += 2)
                for (let x = 0; x < actual.width; x += 2)
                    for (const component of ['red', 'green', 'blue']) {
                        const delta = Math.abs(actual[component](x, y) - expected[component](x, y));
                        error += delta;
                        max = Math.max(max, delta);
                        count++;
                    }
            console.info('MONET_SOURCE_CSS', spec.name, 'mean', error / count, 'max', max);
            actual.save('build/folia-monet-background-oracle/native-css-' + spec.name + '.png');
            verify(error / count <= 2, 'original JSX CSS mean=' + error / count);
            verify(max <= 32, 'original JSX CSS max=' + max);
        }
        win.width = oldWidth;
        win.height = oldHeight;
        testCase.width = 640;
    }
    function test_returningToRetiringCachedPictureRevivesIt() {
        const component = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/backgrounds/monet/MonetBackground.qml');
        compare(component.status, Component.Ready, component.errorString());
        const asset = authorizedImage();
        const actor = createTemporaryObject(component, testCase, {
            width: 640,
            height: 360,
            assetsService: foliaTestPlugin.assets,
            customBackgroundImages: [asset],
            motionEnabled: false
        });
        tryVerify(() => actor.renderReady || actor.errorString.length > 0, 15000);
        compare(actor.errorString, '');
        tryVerify(() => actor.pictureCount === 1, 2000);
        actor.settings = {
            monetBackgroundWash: .8
        };
        tryVerify(() => !actor.pipelinePending && actor.pipelineController.paintCount === 2, 15000);
        verify(actor.pictureCount >= 2, 'A is still leaving when B arrives');
        actor.settings = {};
        tryVerify(() => actor.pipelinePending, 1000);
        tryVerify(() => !actor.pipelinePending, 5000);
        wait(1000);
        compare(actor.pipelineController.paintCount, 2, 'return to A reuses cached immutable picture');
        compare(actor.pictureCount, 1);
        verify(actor.renderReady);
        actor.live = false;
    }
    Component {
        id: retirementLoader
        Loader {}
    }
    function test_scopeRetirementCancelsPendingNativeAndPresentationWork() {
        failOnWarning(/invalid context|TypeError|Cannot read property|Cannot call method/);
        const asset = authorizedImage();
        for (const delay of [0, 5, 60, 250])
            for (let repeat = 0; repeat < 3; repeat++) {
                const loader = createTemporaryObject(retirementLoader, testCase);
                loader.setSource('../../plugins/folia-lyrics-skin/qml/backgrounds/monet/MonetBackground.qml', {
                    width: 640,
                    height: 360,
                    assetsService: foliaTestPlugin.assets,
                    customBackgroundImages: [asset]
                });
                compare(loader.status, Loader.Ready);
                if (delay)
                    wait(delay);
                loader.active = false;
                compare(loader.item, null);
            }
        wait(200);
    }
    function test_pipelineRejectsTextureReservationBeforeDecodeAndReadback() {
        const component = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/backgrounds/monet/MonetPipeline.qml');
        compare(component.status, Component.Ready, component.errorString());
        const pipeline = createTemporaryObject(component, testCase, {
            assetsService: foliaTestPlugin.assets,
            availableTextureBytes: 1
        });
        verify(pipeline !== null);
        let refused = false;
        pipeline.paint({
            image: {
                width: 4096,
                height: 4096,
                source: 'file:///unread-budget-test.png'
            },
            colors: {},
            tuning: {}
        }).then(() => {}, error => refused = true);
        tryVerify(() => refused, 1000);
        verify(pipeline.errorString.indexOf('budget') >= 0);
        compare(pipeline.painterBytes, 0);
        compare(pipeline.paintCount, 0);
        compare(pipeline.readbacks, 0);
    }
}
