import QtQuick
import QtQuick.Window
import QtTest
import EchoMusic.PluginSdk
import QtQml.WorkerScript
import "../../plugins/folia-lyrics-skin/qml/styles/diorama" as Diorama
import "../../plugins/folia-lyrics-skin/qml/styles/sonnet" as Sonnet
import "../../plugins/folia-lyrics-skin/qml/styles/diorama/kernel.mjs" as Kernel
import "../../plugins/folia-lyrics-skin/qml/styles/diorama/scene.mjs" as Scene

TestCase {
    id: testCase
    name: "FoliaDiorama"
    when: windowShown
    visible: true
    width: 320
    height: 240
    Rectangle {
        anchors.fill: parent
        color: '#101018'
        z: -10
    }
    property var reply: null
    property string measureStack: ''
    property var measureRuns: []
    Sonnet.SonnetFont {
        id: measureFont
        base: Qt.font({
            family: 'Helvetica Neue',
            pixelSize: 24
        })
        familyStack: testCase.measureStack
    }
    GlyphRun {
        id: measure
        measurementOnly: true
        visible: false
        font: measureFont.value
        runs: testCase.measureRuns
    }
    WorkerScript {
        id: program
        source: Qt.resolvedUrl('../../plugins/folia-lyrics-skin/qml/styles/diorama/worker.mjs')
        onMessage: messageObject => testCase.reply = messageObject
    }
    function message(input) {
        reply = null;
        input.generation = 7;
        input.trackRevision = 'source-scene';
        program.sendMessage(input);
        tryVerify(() => reply !== null, 10000);
        verify(!reply.error, reply.error || '');
        return reply;
    }
    function measuredFrame(input) {
        let value = message(input), round = 0;
        while (value.phase === 'native') {
            verify(++round < 7);
            const values = [];
            for (let first = 0; first < value.requests.length; first += 32) {
                const batch = value.requests.slice(first, first + 32);
                measureStack = batch[0].fontFamily;
                measureRuns = batch.map((r, i) => ({
                            key: 'query-' + first + '-' + i,
                            text: r.text,
                            size: r.size,
                            weight: r.weight,
                            spacing: 0,
                            maxBlur: 0,
                            maxHaloRadius: 0
                        }));
                tryVerify(() => measure.metrics.length === batch.length && measure.metrics.every((m, i) => m.key === 'query-' + first + '-' + i), 10000);
                compare(measure.errorString, '');
                for (let i = 0; i < batch.length; i++) {
                    const m = measure.metrics[i];
                    values.push(Object.assign({}, m, {
                        key: batch[i].key,
                        width: m.advance
                    }));
                }
            }
            value = message({
                phase: 'measurements',
                measurements: values
            });
        }
        compare(value.phase, 'frame');
        return value.frame;
    }
    function sourceLines() {
        return Array.from({
            length: 24
        }, (_, i) => ({
                    fullText: '镜台 Hello ' + i,
                    startTime: i * 5,
                    endTime: i * 5 + 4,
                    words: [
                        {
                            text: '镜台',
                            startTime: i * 5,
                            endTime: i * 5 + 2
                        },
                        {
                            text: 'Hello ' + i,
                            startTime: i * 5 + 2,
                            endTime: i * 5 + 4
                        }
                    ],
                    blockIndex: Math.floor(i / 4),
                    songPart: i % 12 >= 8 ? 'chorus' : 'verse',
                    isChorus: i % 12 >= 8
                }));
    }
    function sceneContext() {
        return {
            width: 320,
            height: 240,
            resolution: Math.min(2, Screen.devicePixelRatio),
            theme: {
                fontFamily: 'Helvetica Neue',
                fontStyle: 'sans',
                primaryColor: '#ffffff',
                accentColor: '#ef9eea',
                secondaryColor: '#aaaaaa',
                backgroundColor: '#101018',
                animationIntensity: 'normal',
                wordColors: [
                    {
                        word: '镜台',
                        color: '#cf8dea'
                    }
                ]
            },
            tuning: Kernel.tuning({}),
            seed: 'native-corridor',
            lyricsFontScale: 1
        };
    }
    property var packedReply: null
    WorkerScript {
        id: packedRoundtrip
        source: 'data:text/javascript,WorkerScript.onMessage=function(value){WorkerScript.sendMessage(value)}'
        onMessage: value => testCase.packedReply = value
    }
    function test_packedWordsPreserveAllUnitsThroughActualQtWorker() {
        const bytes = new ArrayBuffer(65536 * 4), view = new DataView(bytes);
        for (let i = 0; i < 65536; i++) {
            view.setUint16(i * 4, i, true);
            view.setUint16(i * 4 + 2, 0x3f80, true);
        }
        const packed = Scene.packFloatWords(bytes);
        compare(packed.length, 65536 * 2);
        packedReply = null;
        packedRoundtrip.sendMessage({
            words: packed
        });
        tryVerify(() => packedReply !== null, 10000);
        compare(packedReply.words.length, packed.length);
        for (let i = 0; i < 65536; i++) {
            compare(packedReply.words.charCodeAt(i * 2), i);
            compare(packedReply.words.charCodeAt(i * 2 + 1), 0x3f80);
        }
    }
    function test_completePinnedSceneNativeMetricsPointAttributesAndPerspectiveGlyphPlanes() {
        const component = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/diorama/DioramaView.qml');
        compare(component.status, Component.Ready, component.errorString());
        const view = createTemporaryObject(component, testCase, {
            width: 320,
            height: 240,
            baseFont: Qt.font({
                family: 'Helvetica Neue',
                pixelSize: 24
            })
        });
        verify(view);
        compare(message({
            phase: 'reset'
        }).phase, 'read');
        compare(message({
            phase: 'append',
            lines: sourceLines(),
            pieces: []
        }).phase, 'read');
        let frame = measuredFrame({
            phase: 'prepare',
            time: 1,
            presentationSeconds: 1 / 60,
            context: sceneContext(),
            audio: {
                bass: 200,
                lowMid: 160,
                mid: 120,
                treble: 100,
                audioPower: 160
            }
        });
        view.frame = frame;
        for (let i = 2; i <= 60; i++) {
            frame = measuredFrame({
                phase: 'frame',
                time: 1,
                presentationSeconds: i / 60,
                audio: {
                    bass: 200,
                    lowMid: 160,
                    mid: 120,
                    treble: 100,
                    audioPower: 160
                }
            });
            view.frame = frame;
            if (i % 15 === 0 && typeof dioramaArtifacts !== 'undefined') {
                waitForRendering(view);
                wait(100);
                grabImage(view).save(dioramaArtifacts.artifactPath('frame' + i + '.png'));
                dioramaArtifacts.writeArtifact('frame' + i + '.json', JSON.stringify({
                    camera: frame.camera,
                    quaternion: frame.quaternion
                }));
            }
        }
        tryVerify(() => view.actorCount > 0 && view.resourceCount > 0, 10000);
        compare(view.errorString, '');
        waitForRendering(view);
        wait(200);
        compare(view.errorString, '');
        verify(view.cacheBytes > 0);
        compare(view.layer.samples, 4);
        compare(view.memoryBreakdown.msaaTotal, 320 * 240 * frame.resolution * frame.resolution * 52);
        compare(view.cacheBytes, view.memoryBreakdown.poolReserved + view.memoryBreakdown.msaaTotal);
        tryVerify(() => view.renderReady || view.errorString.length, 20000);
        compare(view.errorString, '');
        const glyphs = Object.values(view._resources).filter(r => r.descriptor.kind === 'glyph');
        verify(glyphs.length > 0);
        for (const glyph of glyphs) {
            const metrics = glyph.linearOutput ? glyph.measuredMetrics : glyph.renderers[0].metrics;
            compare(metrics.length, 1);
            for (const key of ['advance', 'emAscent', 'emDescent', 'baseline', 'inkTop', 'inkBottom'])
                verify(Number.isFinite(metrics[0][key]), 'Real native metric ' + key);
            if (glyph.linearOutput)
                compare(glyph.renderers.length, 0, 'Frozen text releases its CPU ink atlas and GPU bake chain');
        }
        verify(view.peakReservedPool <= 256 * 1024 * 1024);
        const picture = grabImage(view);
        let lit = 0;
        for (let y = 0; y < picture.height; y += 4)
            for (let x = 0; x < picture.width; x += 4)
                if (picture.red(x, y) + picture.green(x, y) + picture.blue(x, y) > 80)
                    lit++;
        verify(lit > 20, 'Real point cloud and native glyph planes must draw visible pixels');
        let cloudPixels = 0;
        const sx = picture.width / 320, sy = picture.height / 240;
        for (let y = Math.floor(55 * sy); y < 109 * sy; y++)
            for (let x = 0; x < 100 * sx; x++)
                if (Math.max(picture.red(x, y), picture.green(x, y), picture.blue(x, y)) > 40)
                    cloudPixels++;
        verify(cloudPixels > 500 * sx, 'Independent cloud region must contain the real point lattice');
        const pointResources = Object.values(view._resources).filter(r => r.descriptor.kind === 'points');
        verify(pointResources.length > 0);
        for (const r of pointResources) {
            compare(r.output.sourceBytes, r.descriptor.width * r.descriptor.height * 16);
            tryVerify(() => r.output.cacheBytes > 0, 10000);
            compare(r.output.textureUploads, 1);
        }
        if (typeof dioramaArtifacts !== 'undefined') {
            picture.save(dioramaArtifacts.artifactPath('native.png'));
            dioramaArtifacts.writeArtifact('native.json', JSON.stringify({
                camera: frame.camera,
                quaternion: frame.quaternion,
                ops: frame.ops.length,
                resolution: frame.resolution,
                points: frame.ops.filter(op => op.kind === 'points').map(op => ({
                            id: op.id,
                            points: op.points,
                            motes: op.motes,
                            uniforms: op.uniforms,
                            texture: op.texture
                        })),
                resources: Object.values(view._resources).map(r => ({
                            kind: r.descriptor.kind,
                            words: r.descriptor.pixels ? Array.from({
                                length: 40
                            }, (_, i) => r.descriptor.pixels.charCodeAt(i)) : [],
                            points: r.descriptor.points,
                            source: r.output && r.output.sourceBytes,
                            cache: r.output && r.output.cacheBytes,
                            uploads: r.output && r.output.textureUploads,
                            error: r.errorString
                        })),
                actors: Object.values(view._ops).map(o => ({
                            width: o.width,
                            height: o.height,
                            error: o.errorString,
                            effect: o.drawEffect ? {
                                width: o.drawEffect.width,
                                height: o.drawEffect.height,
                                visible: o.drawEffect.visible,
                                opacity: o.drawEffect.opacity,
                                status: o.drawEffect.status,
                                log: o.drawEffect.log,
                                count: o.drawEffect.pointCount
                            } : null
                        }))
            }));
        }
        let flow = frame.ops.filter(op => op.kind === 'points' && !op.motes)[0].uniforms.uTime;
        frame = measuredFrame({
            phase: 'frame',
            time: 1,
            presentationSeconds: 1.1,
            audio: {
                bass: 200,
                lowMid: 160,
                mid: 120,
                treble: 100,
                audioPower: 160
            }
        });
        view.frame = frame;
        compare(frame.ops.filter(op => op.kind === 'points' && !op.motes)[0].uniforms.uTime, flow, 'Pause freezes the original particle flow clock');
        frame = measuredFrame({
            phase: 'frame',
            time: 46,
            presentationSeconds: 1.2,
            audio: {
                bass: 0,
                lowMid: 0,
                mid: 0,
                treble: 0,
                audioPower: 0
            }
        });
        view.frame = frame;
        compare(frame.globalIndex, 9);
        compare(view.errorString, '');
        const options = sceneContext();
        options.tuning.geometryVisibility.mode = 'corridor';
        frame = measuredFrame({
            phase: 'tuning',
            time: 46,
            presentationSeconds: 1.3,
            tuning: options.tuning,
            audio: {}
        });
        view.frame = frame;
        verify(frame.ops.some(op => op.kind === 'points' && !op.motes && op.uniforms.uCorridor === 1));
        const changed = sceneContext();
        changed.seed = 'next-song';
        compare(message({
            phase: 'reset'
        }).phase, 'read');
        compare(message({
            phase: 'append',
            lines: sourceLines().slice(0, 8),
            pieces: []
        }).phase, 'read');
        frame = measuredFrame({
            phase: 'prepare',
            time: 0,
            presentationSeconds: 1.4,
            context: changed,
            audio: {}
        });
        view.frame = frame;
        compare(frame.transitionEpoch, 1);
        verify(frame.transitionOutgoingIndex !== null);
        compare(frame.segments, 2);
        compare(view.errorString, '');
        view.live = false;
        compare(view.actorCount, 0);
        compare(view.resourceCount, 0);
        compare(view.cacheBytes, 0);
    }
    function test_actualReadModelIcuWholeSongSettingsSeekAndHiddenRelease() {
        if (typeof foliaTestLyricFixture === 'undefined') {
            skip('Standalone native capability fixture has no host service');
            return;
        }
        const rows = [];
        for (let i = 0; i < 80; i++)
            rows.push({
                text: i === 0 ? '中文 夜の歌 👨‍👩‍👧‍👦 café é العربية '.repeat(12) : '真实歌词 ' + i + ' Hello',
                start_ms: 1000 + i * 5000,
                duration_ms: 4000,
                translation: '译文 ' + i,
                romanization: 'pronunciation ' + i,
                words: []
            });
        verify(foliaTestLyricFixture.replaceRows(rows));
        compare(foliaTestLyricFixture.count, 80);
        const c = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/diorama/Diorama.qml');
        compare(c.status, Component.Ready, c.errorString());
        const item = createTemporaryObject(c, testCase, {
            width: 320,
            height: 240,
            preparedLines: [],
            lyricSource: foliaTestLyricSource,
            textService: foliaTestTextService,
            lyricCount: foliaTestLyricFixture.count,
            trackRevision: 'native-real-icu-1',
            baseFont: Qt.font({
                family: 'Helvetica Neue',
                pixelSize: 24
            }),
            motionEnabled: false,
            timeSeconds: 1.5,
            backgroundColor: '#101018',
            accentColor: '#ef9eea'
        });
        verify(item);
        tryVerify(() => item.errorString.length || (!item.busy && item.frame !== null), 30000);
        compare(item.errorString, '');
        verify(item.readBatches >= 2);
        verify(item.measurementBatches > 0);
        verify(item.resourceCount > 0);
        verify(item.renderReady);
        compare(item.frame.globalIndex, 0);
        waitForRendering(item);
        console.debug('Diorama memory initial', JSON.stringify(item.memoryBreakdown));
        const read = item.readBatches, measured = item.measurementBatches;
        item.settings = {
            dioramaGeometryEnabled: true,
            dioramaGeometryMode: 'corridor',
            dioramaGeometryStrands: true,
            dioramaGeometryBlobs: true,
            dioramaGeometryRibbons: true,
            dioramaGeometryRings: true,
            dioramaGradientEnabled: true,
            dioramaSoulActiveEnabled: true
        };
        tryVerify(() => item.errorString.length || item.frame.ops.some(o => o.kind === 'points' && !o.motes && o.uniforms.uCorridor === 1), 10000);
        compare(item.errorString, '');
        compare(item.readBatches, read);
        compare(item.measurementBatches, measured);
        item.paused = true;
        item.timeSeconds = 301.5;
        tryVerify(() => item.errorString.length || item.frame.globalIndex === 60, 20000);
        compare(item.errorString, '');
        compare(item.frame.time, 301.5);
        console.debug('Diorama memory seek', JSON.stringify(item.memoryBreakdown));
        item.trackRevision = 'native-real-icu-2';
        item.timeSeconds = 1.5;
        tryVerify(() => item.errorString.length || (!item.busy && item.frame && item.frame.transitionEpoch === 1), 20000);
        compare(item.errorString, '');
        compare(item.frame.segments, 2);
        console.debug('Diorama memory flight', JSON.stringify(item.memoryBreakdown));
        item._presentationSeconds = 4.5;
        item.timeSeconds = 5.2;
        tryVerify(() => item.errorString.length || (!item.busy && item.frame && item.frame.presentationSeconds === 4.5), 10000);
        compare(item.errorString, '');
        item._presentationSeconds = 4.6;
        tryVerify(() => item.frame && item.frame.presentationSeconds === 4.6, 10000);
        compare(item.frame.transitionOutgoingIndex, null);
        tryVerify(() => item.renderReady || item.errorString.length, 15000);
        compare(item.errorString, '');
        console.debug('Diorama memory settled', JSON.stringify(item.memoryBreakdown));
        const bakes = item.children.filter(c => c.peakReservedPool !== undefined);
        verify(bakes.length > 0);
        console.debug('Diorama bake reserve peak', bakes.map(c => c.peakReservedPool));
        verify(bakes.every(c => c.peakReservedPool <= 256 * 1024 * 1024));
        item.visible = false;
        compare(item.layerCount, 0);
        compare(item.resourceCount, 0);
        compare(item.totalCacheBytes, 0);
        wait(100);
        compare(item.totalCacheBytes, 0);
        console.debug('Diorama memory hidden', JSON.stringify(item.memoryBreakdown));
        item.visible = true;
        tryVerify(() => item.errorString.length || (!item.busy && item.frame !== null && item.layerCount > 0), 20000);
        compare(item.errorString, '');
        item.live = false;
        compare(item.layerCount, 0);
        compare(item.resourceCount, 0);
        compare(item.totalCacheBytes, 0);
        for (let i = 0; i < 3; i++) {
            const victim = c.createObject(testCase, {
                width: 320,
                height: 240,
                preparedLines: [],
                lyricSource: foliaTestLyricSource,
                textService: foliaTestTextService,
                lyricCount: 80,
                trackRevision: 'retire-' + i,
                baseFont: Qt.font({
                    family: 'Helvetica Neue',
                    pixelSize: 24
                }),
                motionEnabled: false,
                timeSeconds: 1.5
            });
            verify(victim);
            wait(5);
            victim.destroy();
            wait(30);
        }
    }
    Component {
        id: standardMaterialFixture
        Item {
            id: standard
            width: 320
            height: 240
            property alias texture: pointInput
            property alias surface: content
            property vector4d expected: Qt.vector4d(0, 0, 0, 0)
            FloatTexture {
                id: pointInput
                width: 1
                height: 1
            }
            Item {
                id: content
                width: 64
                height: 64
            }
            ShaderEffectSource {
                id: materialTexture
                sourceItem: content
                sourceRect: Qt.rect(0, 0, 64, 64)
                textureSize: Qt.size(64 * Screen.devicePixelRatio, 64 * Screen.devicePixelRatio)
                samples: 4
                textureMirroring: ShaderEffectSource.NoMirroring
                hideSource: true
                visible: false
            }
            ShaderEffect {
                anchors.fill: parent
                property var source: materialTexture
                property vector4d expected: standard.expected
                fragmentShader: Qt.resolvedUrl('../../plugins/folia-lyrics-skin/qml/styles/diorama/blend-oracle.frag.qsb')
            }
        }
    }
    function test_originalStandardMaterialAcesColorSpaceAndFogOrder() {
        const item = createTemporaryObject(standardMaterialFixture, testCase);
        verify(item);
        const c = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/diorama/DioramaMotes.qml');
        compare(c.status, Component.Ready, c.errorString());
        const frame = {
            resolution: Math.min(2, Screen.devicePixelRatio),
            view: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            projection: [1.9209821269711662, 0, 0, 0, 0, 1.9209821269711662, 0, 0, 0, 0, -1.0002000200020003, -1, 0, 0, -.20002000200020004, 0],
            camera: [0, 0, 0],
            fog: {
                color: [.005181516700061659, .005181516700061659, .009134058699157796],
                near: 12,
                far: 30
            }
        };
        let actor = null;
        for (const entry of [[5, 89, 110, 130], [21, 50, 60, 72], [30, 10, 10, 14]]) {
            if (actor) {
                actor.destroy();
                actor = null;
                wait(20);
            }
            const depth = entry[0], bytes = new Float32Array(20);
            bytes[2] = -depth;
            verify(item.texture.upload(5, 1, bytes.buffer));
            const descriptor = {
                points: 1,
                position: [0, 0, 0],
                uniforms: {
                    uPrimaryColor: [.2, .4, .8],
                    uSizeBase: 8 * depth / (32 * frame.resolution),
                    opacity: .6
                }
            };
            actor = c.createObject(item.surface, {
                width: 64,
                height: 64,
                descriptor,
                frame,
                resource: {
                    ready: true,
                    output: item.texture
                }
            });
            verify(actor);
            item.expected = Qt.vector4d(entry[1] / 255, entry[2] / 255, entry[3] / 255, 153 / 255);
            waitForRendering(item);
            wait(80);
            const image = grabImage(item);
            compare(image.red(image.width / 2, image.height / 2), 0);
            compare(image.green(image.width / 2, image.height / 2), 255);
            compare(actor.errorString, '');
        }
        if (actor)
            actor.destroy();
        wait(30);
    }
    Component {
        id: windowFixture
        Window {
            id: ownedWindow
            width: 128
            height: 128
            visible: true
            property alias texture: data
            property var external: null
            property bool shaderLive: true
            FloatTexture {
                id: data
                width: 1
                height: 1
            }
            Loader {
                anchors.fill: parent
                active: ownedWindow.shaderLive
                sourceComponent: NativeShaderEffect {
                    property var source: ownedWindow.external || ownedWindow.texture
                    fragmentShader: Qt.resolvedUrl('../../plugins/folia-lyrics-skin/qml/styles/diorama/float-oracle.frag.qsb')
                }
            }
        }
    }
    function test_windowReparentInvalidationAndHiddenResources() {
        const first = createTemporaryObject(windowFixture, testCase), second = createTemporaryObject(windowFixture, testCase);
        verify(first);
        verify(second);
        const bytes = new Float32Array([-2.5, 1.25, 100.125, 0]).buffer;
        verify(first.texture.upload(1, 1, bytes));
        waitForRendering(first.contentItem);
        tryCompare(first.texture, 'cacheBytes', 16);
        first.shaderLive = false;
        second.shaderLive = false;
        wait(100);
        first.texture.parent = null;
        wait(20);
        first.texture.parent = second.contentItem;
        wait(20);
        verify(first.texture.upload(1, 1, bytes));
        second.external = first.texture;
        second.shaderLive = true;
        first.visible = false;
        waitForRendering(second.contentItem);
        compare(first.texture.sourceBytes, 16, 'Old window visibility must not retire a texture already moved to the new window');
        const image = grabImage(second.contentItem);
        compare(image.green(image.width / 2, image.height / 2), 255);
        second.shaderLive = false;
        second.visible = false;
        wait(20);
        compare(first.texture.sourceBytes, 0);
        compare(first.texture.cacheBytes, 0);
        verify(!first.texture.upload(1, 1, bytes));
        second.visible = true;
        verify(first.texture.upload(1, 1, bytes));
        second.shaderLive = true;
        waitForRendering(second.contentItem);
        tryCompare(first.texture, 'cacheBytes', 16);
        const again = grabImage(second.contentItem);
        compare(again.green(again.width / 2, again.height / 2), 255);
        second.shaderLive = false;
        second.external = null;
        wait(20);
        first.texture.parent = first.contentItem;
        wait(50);
    }
    Component {
        id: blendFixture
        Item {
            id: blend
            width: 320
            height: 240
            property int sprites: 4
            property string composition: 'source-over'
            property real groupOpacity: 1
            property vector4d expected: Qt.vector4d(0, 0, 0, 0)
            Item {
                id: sourceGroup
                anchors.fill: parent
                Item {
                    anchors.fill: parent
                    opacity: blend.groupOpacity
                    Repeater {
                        model: blend.sprites
                        NativeShaderEffect {
                            width: 320
                            height: 240
                            composition: blend.composition
                            fragmentShader: Qt.resolvedUrl('../../plugins/folia-lyrics-skin/qml/styles/diorama/blend-sprite.frag.qsb')
                        }
                    }
                }
            }
            ShaderEffectSource {
                id: captured
                sourceItem: sourceGroup
                hideSource: true
                visible: false
                textureSize: Qt.size(320, 240)
                live: true
            }
            ShaderEffect {
                anchors.fill: parent
                property var source: captured
                property vector4d expected: blend.expected
                fragmentShader: Qt.resolvedUrl('../../plugins/folia-lyrics-skin/qml/styles/diorama/blend-oracle.frag.qsb')
            }
        }
    }
    function checkBlend(item, expected) {
        item.expected = expected;
        waitForRendering(item);
        wait(30);
        const picture = grabImage(item), x = picture.width / 2, y = picture.height / 2;
        compare(picture.red(x, y), 0, 'Shader oracle must match RGB and alpha in the real offscreen attachment');
        compare(picture.green(x, y), 255);
    }
    function test_additiveNativeShaderEffectFourSixteenThousandOverlappingSpritesAndOpacity() {
        const item = createTemporaryObject(blendFixture, testCase);
        verify(item);
        const sourceOver = (count, opacity) => {
            let r = 0, g = 0, b = 0, a = 0;
            for (let i = 0; i < count; i++) {
                r = Math.round((8 / 255 * opacity + r * (1 - .125 * opacity)) * 255) / 255;
                g = Math.round((16 / 255 * opacity + g * (1 - .125 * opacity)) * 255) / 255;
                b = Math.round((24 / 255 * opacity + b * (1 - .125 * opacity)) * 255) / 255;
                a = Math.round((.125 * opacity + a * (1 - .125 * opacity)) * 255) / 255;
            }
            return Qt.vector4d(r, g, b, a);
        };
        checkBlend(item, sourceOver(4, 1));
        item.composition = 'additive';
        checkBlend(item, Qt.vector4d(32 / 255, 64 / 255, 96 / 255, .5));
        item.sprites = 16;
        checkBlend(item, Qt.vector4d(128 / 255, 1, 1, 1));
        item.sprites = 1000;
        checkBlend(item, Qt.vector4d(1, 1, 1, 1));
        item.sprites = 4;
        item.groupOpacity = .5;
        checkBlend(item, Qt.vector4d(16 / 255, 32 / 255, 48 / 255, .25));
        item.composition = 'source-over';
        checkBlend(item, sourceOver(4, .5));
        item.visible = false;
        wait(20);
        item.visible = true;
        checkBlend(item, sourceOver(4, .5));
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
    }
    Component {
        id: precisionFixture
        Item {
            id: fixture
            width: 320
            height: 240
            property alias texture: source
            property alias shaderActive: visual.active
            FloatTexture {
                id: source
                width: 1
                height: 1
            }
            Loader {
                id: visual
                anchors.fill: parent
                active: true
                sourceComponent: ShaderEffect {
                    property var source: fixture.texture
                    fragmentShader: Qt.resolvedUrl('../../plugins/folia-lyrics-skin/qml/styles/diorama/float-oracle.frag.qsb')
                }
            }
        }
    }
    function test_rgba32fMetalPreservesNegativeFractionAboveOneAndAlphaZero() {
        const item = createTemporaryObject(precisionFixture, testCase);
        verify(item);
        const bytes = new Float32Array([-2.5, 1.25, 100.125, 0]).buffer;
        verify(item.texture.upload(1, 1, bytes));
        waitForRendering(item);
        tryCompare(item.texture, 'textureUploads', 1);
        compare(item.texture.errorString, '');
        compare(item.texture.sourceBytes, 16);
        compare(item.texture.cacheBytes, 16);
        const picture = grabImage(item);
        compare(picture.green(picture.width / 2, picture.height / 2), 255);
        compare(picture.red(picture.width / 2, picture.height / 2), 0);
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
        verify(item.texture.upload(1, 1, bytes));
        waitForRendering(item);
        compare(item.texture.textureUploads, 1, 'Identical immutable data must not upload per frame');
        verify(!item.texture.upload(2, 1, bytes));
        compare(item.texture.textureWidth, 1, 'Invalid upload must reject atomically');
        compare(item.texture.sourceBytes, 16);
        verify(!item.texture.upload(1, 1, new Float32Array([Infinity, 0, 0, 1]).buffer));
        compare(item.texture.textureWidth, 1);
        verify(!item.texture.upload(8193, 1, bytes));
        verify(!item.texture.upload(1, 1, [1, 2, 3, 4]));
        item.shaderActive = false;
        wait(20);
        item.texture.clear();
        compare(item.texture.sourceBytes, 0);
        compare(item.texture.cacheBytes, 0);
        compare(item.texture.textureWidth, -1);
        verify(item.texture.uploadPacked(1, 1, Scene.packFloatWords(bytes)));
        item.shaderActive = true;
        waitForRendering(item);
        tryCompare(item.texture, 'textureUploads', 2);
        const again = grabImage(item);
        compare(again.green(again.width / 2, again.height / 2), 255);
        item.shaderActive = false;
        wait(20);
        item.visible = false;
        compare(item.texture.sourceBytes, 0);
        compare(item.texture.cacheBytes, 0);
        verify(!item.texture.upload(1, 1, bytes));
    }
    Component {
        id: glyphWindow
        Window {
            id: window
            x: 100
            y: 100
            width: 512
            height: 192
            color: 'black'
            property var resource: null
            property int bakes: 0
            property int initialized: 0
            property alias surface: surface
            Item {
                id: surface
                anchors.fill: parent
            }
            Loader {
                anchors.fill: parent
                active: window.resource !== null
                sourceComponent: Diorama.DioramaPlane {
                    resource: window.resource
                    frame: ({
                            fog: {
                                color: [0, 0, 0],
                                near: 100,
                                far: 200
                            }
                        })
                    descriptor: ({
                            kind: 'plane',
                            width: 512,
                            height: 192,
                            mvp: [2 / 512, 0, 0, 0, 0, 2 / 192, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
                            modelView: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
                            color: [1, 1, 1],
                            alpha: 1,
                            additive: false
                        })
                }
            }
            Timer {
                id: resumeBake
                interval: 0
                onTriggered: if (window.resource && window.visible) {
                    if (window.resource.phase === 'pending')
                        window.resource.beginLayout();
                    else if (window.resource.layoutReady)
                        window.resource.beginCapture();
                }
            }
            Connections {
                target: window.resource
                function onPlanned() {
                    resumeBake.restart();
                }
                function onInvalidated() {
                    resumeBake.restart();
                }
                function onBaked() {
                    if (window.resource.ready)
                        window.bakes++;
                }
            }
            onSceneGraphInitialized: {
                initialized++;
                resumeBake.restart();
            }
            onResourceChanged: resumeBake.restart()
            Component.onDestruction: resumeBake.stop()
        }
    }
    function test_immutableLinearGlyphRebakesInNewWindowAfterAtlasRetirement() {
        if (Qt.platform.os !== 'osx') {
            skip('Fixed Metal sampler and RGBA16F path are tested on Cocoa Metal');
            return;
        }
        const factory = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/diorama/DioramaGlyphTexture.qml');
        compare(factory.status, Component.Ready, factory.errorString());
        for (const glow of [false, true]) {
            const first = createTemporaryObject(glyphWindow, testCase, {
                visible: true
            });
            const descriptor = {
                kind: 'glyph',
                id: 'snapshot',
                width: 512,
                height: 192,
                commands: [
                    {
                        text: '镜台 Hello 👨‍👩‍👧‍👦',
                        x: glow ? -9976 : 24,
                        y: 96,
                        style: {
                            font: '700 48px Helvetica Neue',
                            shadowOffsetX: glow ? 10000 : 0
                        }
                    }
                ]
            };
            const resource = factory.createObject(first.surface, {
                descriptor,
                baseFont: Qt.font({
                    family: 'Helvetica Neue'
                })
            });
            verify(resource);
            first.resource = resource;
            if (!glow) {
                resource.beginLayout();
                tryVerify(() => resource.phase !== 'pending');
                first.visible = false;
                wait(5200);
                compare(resource.errorString, '', 'A hidden window must cancel the bounded bake deadline');
                compare(resource.phase, 'pending');
                first.visible = true;
            }
            tryVerify(() => resource.ready || resource.errorString.length, 10000);
            compare(resource.errorString, '');
            compare(resource.renderers.length, 0);
            compare(resource.measuredMetrics.length, 1);
            wait(80);
            const before = grabImage(first.contentItem);
            let ink = 0;
            for (let y = 0; y < before.height; y += 2)
                for (let x = 0; x < before.width; x += 2)
                    if (before.red(x, y) > 40)
                        ink++;
            verify(ink > 100, 'Real retained glyph and glow pixels must be present');
            const second = createTemporaryObject(glyphWindow, testCase, {
                visible: false
            });
            first.resource = null;
            resource.parent = second.surface;
            second.resource = resource;
            first.visible = false;
            second.visible = true;
            tryVerify(() => second.initialized > 0 && second.bakes > 0 && resource.ready, 10000);
            compare(resource.errorString, '');
            compare(resource.renderers.length, 0);
            wait(80);
            const after = grabImage(second.contentItem);
            compare(after.width, before.width);
            compare(after.height, before.height);
            let max = 0;
            for (let y = 0; y < before.height; y++)
                for (let x = 0; x < before.width; x++)
                    max = Math.max(max, Math.abs(after.red(x, y) - before.red(x, y)), Math.abs(after.green(x, y) - before.green(x, y)), Math.abs(after.blue(x, y) - before.blue(x, y)), Math.abs(after.alpha(x, y) - before.alpha(x, y)));
            compare(max, 0, 'Window migration must rebuild the exact immutable float texture');
            second.visible = false;
            second.resource = null;
            resource.parent = first.surface;
            second.destroy();
            first.destroy();
            wait(50);
        }
    }
}
