import QtQuick
import QtTest
import QtQml.WorkerScript
import "../../plugins/folia-lyrics-skin/qml/styles/tempera/render-plan.mjs" as Planner
import "../../plugins/folia-lyrics-skin/qml/styles/sonnet/scene-graph.mjs" as SceneGraph
import "../../plugins/folia-lyrics-skin/qml/styles/tempera/kernel.mjs" as Kernel

TestCase {
    id: testCase
    name: "FoliaTempera"
    when: windowShown
    visible: true
    width: 320
    height: 240
    Rectangle {
        anchors.fill: parent
        color: '#101010'
        z: -10
    }
    property var reply: null
    WorkerScript {
        id: geometry
        source: Qt.resolvedUrl('../fixtures/tempera/geometry-worker.mjs')
        onMessage: messageObject => testCase.reply = messageObject
    }
    function request(kind, mode, time, key) {
        reply = null;
        geometry.sendMessage({
            kind,
            colorMode: mode,
            time,
            key,
            width: 320,
            height: 240
        });
        tryVerify(() => reply !== null, 10000);
        compare(reply.error, undefined);
        compare(reply.key, key);
        return reply.ops;
    }
    function createInk() {
        const c = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/tempera/TemperaInkLayer.qml');
        compare(c.status, Component.Ready, c.errorString());
        return createTemporaryObject(c, testCase, {
            width: 320,
            height: 240
        });
    }
    Component {
        id: differenceFixture
        Item {
            width: 320
            height: 240
            Item {
                id: back
                anchors.fill: parent
                Rectangle {
                    width: 160
                    height: 240
                    color: 'white'
                }
                Rectangle {
                    x: 160
                    width: 160
                    height: 240
                    color: 'black'
                }
            }
            Item {
                id: front
                anchors.fill: parent
                Rectangle {
                    x: 40
                    y: 40
                    width: 240
                    height: 160
                    color: 'white'
                }
            }
            ShaderEffectSource {
                id: backTexture
                sourceItem: back
                hideSource: true
                visible: false
                textureSize: Qt.size(640, 480)
            }
            ShaderEffectSource {
                id: frontTexture
                sourceItem: front
                hideSource: true
                visible: false
                textureSize: Qt.size(640, 480)
            }
            Loader {
                anchors.fill: parent
                source: '../../plugins/folia-lyrics-skin/qml/styles/tempera/TemperaDifference.qml'
                onLoaded: {
                    item.source = frontTexture;
                    item.backdrop = backTexture;
                }
            }
        }
    }
    function test_realBackdropInversionShaderAndAlpha() {
        const v = createTemporaryObject(differenceFixture, testCase);
        verify(v);
        waitForRendering(v);
        const i = grabImage(v), sx = i.width / 320, sy = i.height / 240;
        compare(i.red(80 * sx, 120 * sy), 0, 'White artwork must invert actual front to black');
        compare(i.red(240 * sx, 120 * sy), 255, 'Black artwork must invert actual front to white');
        compare(i.red(20 * sx, 20 * sy), 255, 'Outside front retains actual back');
        compare(i.red(300 * sx, 20 * sy), 0);
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
    }
    function test_retainedGpuPrefixGraphInvertsActualShapesAndDestroysTargets() {
        const p = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/tempera/TemperaScene.qml');
        compare(p.status, Component.Ready, p.errorString());
        const scene = createTemporaryObject(p, testCase, {
            width: 320,
            height: 240,
            baseFont: Qt.font({
                family: 'Helvetica Neue',
                pixelSize: 24
            })
        });
        const path = (d, fill) => ({
                    path: d,
                    fill,
                    stroke: 'transparent',
                    width: 0,
                    alpha: 1,
                    cap: 'butt',
                    join: 'miter',
                    miterLimit: 10,
                    bounds: {
                        x: 0,
                        y: 0,
                        width: 320,
                        height: 240
                    }
                }), matrix = [1, 0, 0, 0, 1, 0];
        scene.frame = {
            epoch: 1,
            width: 320,
            height: 240,
            cacheBytes: 320 * 240 * 4 * 3,
            resolution: 2,
            resources: [
                {
                    id: 'back',
                    kind: 'graphics',
                    paths: [path('M0,0H160V240H0Z', 'white'), path('M160,0H320V240H160Z', 'black')]
                },
                {
                    id: 'front',
                    kind: 'graphics',
                    paths: [path('M40,40H280V200H40Z', 'white')]
                }
            ],
            retired: [],
            stages: [
                {
                    id: 'b',
                    kind: 'paint',
                    ops: [
                        {
                            id: 'back',
                            kind: 'graphics',
                            matrix,
                            alpha: 1
                        }
                    ],
                    resolution: 2
                },
                {
                    id: 'f',
                    kind: 'paint',
                    ops: [
                        {
                            id: 'front',
                            kind: 'graphics',
                            matrix,
                            alpha: 1
                        }
                    ],
                    resolution: 2
                },
                {
                    id: 'd',
                    kind: 'difference',
                    front: 'f',
                    previous: 'b',
                    profile: {
                        kind: 'difference'
                    },
                    roi: [40, 40, 280, 200],
                    resolution: 2
                }
            ],
            output: 'd'
        };
        waitForRendering(scene);
        compare(scene.errorString, '');
        compare(scene.stageCount, 3);
        const i = grabImage(scene), sx = i.width / 320, sy = i.height / 240;
        compare(i.red(80 * sx, 120 * sy), 0);
        compare(i.red(240 * sx, 120 * sy), 255);
        compare(i.red(20 * sx, 20 * sy), 255);
        scene.live = false;
        compare(scene.stageCount, 0);
        compare(scene.resourceCount, 0);
        compare(scene.cacheBytes, 0);
    }
    function page(rows, settings, time) {
        verify(foliaTestLyricFixture.replaceRows(rows.map(row => Object.assign({
                words: []
            }, row))));
        const c = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/tempera/Tempera.qml');
        compare(c.status, Component.Ready, c.errorString());
        return createTemporaryObject(c, testCase, {
            width: 320,
            height: 240,
            preparedLines: [],
            lyricSource: foliaTestLyricSource,
            lyricCount: rows.length,
            textService: foliaTestTextService,
            assetsService: foliaTestPlugin.assets,
            baseFont: Qt.font({
                family: 'Helvetica Neue',
                pixelSize: 24
            }),
            settings: Object.assign({
                showText: true,
                fontWeight: null,
                lyricsFontScale: 1
            }, settings),
            timeSeconds: time,
            trackRevision: 'tempera-test'
        });
    }
    function readyPage(item) {
        tryVerify(() => item.errorString.length || (!item.busy && item.frame !== null), 30000);
        compare(item.errorString, '');
        verify(item.frame);
        waitForRendering(item);
    }
    function test_allAdjacentRetiredResourcesLeaveTheMapInOneFrame() {
        const pixi = SceneGraph.createSceneGraph(), root = new pixi.Container(), planner = new Planner.RenderPlanner();
        for (let i = 0; i < 8; i++)
            root.addChild(new pixi.Graphics().rect(i * 8, 0, 6, 6).fill(0xffffff));
        const first = planner.frame(root, 320, 240, 1, 0);
        compare(first.resources.length, 8);
        root.removeChildren();
        const final = planner.frame(root, 320, 240, 1, 1);
        compare(final.retired.length, 8);
        compare(planner.published.size, 0);
    }
    function test_completeNativeWordsSeekPauseFontAndGpuCache() {
        const rows = [
            {
                text: 'FLOW',
                start_ms: 1000,
                duration_ms: 10000,
                words: [
                    {
                        text: 'FLOW',
                        start_ms: 1000,
                        duration_ms: 1
                    }
                ]
            },
            {
                text: 'NEXT',
                start_ms: 20000,
                duration_ms: 2000
            }
        ], settings = {
            temperaPostProcessEnabled: false,
            temperaShowBlocks: false,
            temperaShowDecor: false,
            temperaShowCornerMarks: false,
            temperaTextInversion: false
        }, item = page(rows, settings, 2.5);
        readyPage(item);
        verify(item.renderers.length > 0);
        verify(item.totalCacheBytes > 0);
        const first = grabImage(item);
        first.save("build/folia-tempera-native/tempera-text.png");
        let ink = 0;
        for (let y = 0; y < first.height; y += 2)
            for (let x = 0; x < first.width; x += 2)
                if (first.red(x, y) > 180)
                    ++ink;
        verify(ink > 20, 'Actual native glyph pixels must be present');
        verify(item.resourceCount > 0, 'Published native resources must notify diagnostic bindings');
        const renderers = item.renderers.slice(), uploads = renderers.map(r => r.textureUploads), masks = renderers.map(r => r.maskRevision), batches = item.measurementBatches;
        item.paused = true;
        item.timeSeconds = 2.7;
        tryVerify(() => item.frame.time === 2.7, 10000);
        waitForRendering(item);
        compare(item.measurementBatches, batches);
        compare(item.renderers.length, renderers.length);
        for (let i = 0; i < renderers.length; i++) {
            compare(item.renderers[i], renderers[i]);
            compare(renderers[i].textureUploads, uploads[i]);
            compare(renderers[i].maskRevision, masks[i]);
        }
        item.timeSeconds = .2;
        tryVerify(() => item.frame.time === .2, 10000);
        waitForRendering(item);
        verify(!first.equals(grabImage(item)));
        item.timeSeconds = 2.5;
        tryVerify(() => item.frame.time === 2.5, 10000);
        waitForRendering(item);
        verify(first.equals(grabImage(item)), 'Source seek reproduces full native text pixels');
        const revision = item.layoutRevision;
        item.baseFont = Qt.font({
            family: 'Times New Roman',
            pixelSize: 24
        });
        tryVerify(() => item.errorString.length || (!item.busy && item.layoutRevision > revision), 30000);
        compare(item.errorString, '');
        waitForRendering(item);
        verify(!first.equals(grabImage(item)), 'Font change must shape and paint the actual new font');
        item.live = false;
        compare(item.layerCount, 0);
        compare(item.resourceCount, 0);
        compare(item.totalCacheBytes, 0);
        compare(item.renderers.length, 0);
    }
    function test_full121StyleUsesRealPostProcessingAndMetadataCredits() {
        const item = page([
            {
                text: '真实画面 Real glyphs 👩🏽‍🚀',
                start_ms: 1000,
                duration_ms: 4000
            }
        ], {
            temperaColorMode: 'gradient'
        }, 2.5);
        item.coverColors = ['#cc3366', '#4466ee', '#eeba33', '#33cbaa', '#aa77cc'];
        item.songTitle = 'Real native credits';
        item.songArtist = 'Artist';
        readyPage(item);
        verify(item.frame.stages.some(stage => stage.kind === 'filters'));
        verify(item.frame.stages.some(stage => stage.kind === 'difference'));
        verify(item.renderers.length > 0);
        verify(item.layerCount > 2);
        const before = grabImage(item);
        before.save("build/folia-tempera-native/tempera-scene.png");
        verify(item.totalCacheBytes < 256 * 1024 * 1024);
        item.timeSeconds = 8;
        tryVerify(() => item.errorString.length || item.frame.time === 8, 30000);
        compare(item.errorString, '');
        waitForRendering(item);
        verify(!before.equals(grabImage(item)));
        verify(Object.keys(item.frame.resources).length > 0, 'Real metadata poster must load native text/art');
        item.visible = false;
        compare(item.layerCount, 0);
        compare(item.totalCacheBytes, 0);
    }
    function test_actualWholeSongReadModelLongMixedLineAndLiveTuning() {
        const unit = '夜の中文 👨‍👩‍👧‍👦 café é العربية ', text = unit.repeat(40).slice(0, 1020), rows = [];
        for (let i = 0; i < 80; i++)
            rows.push({
                text: i === 0 ? text : 'source ' + i + ' 中文',
                start_ms: 1000 + i * 6000,
                duration_ms: 4000,
                translation: '真实翻译 ' + i,
                romanization: 'real pronunciation ' + i
            });
        const item = page(rows, {
            temperaWholeLineLyrics: true,
            temperaPostProcessEnabled: false
        }, 2.5);
        readyPage(item);
        verify(item.readBatches >= 2);
        verify(item.refinementRounds <= 32);
        verify(item.renderers.length > 0);
        verify(item.totalCacheBytes < 256 * 1024 * 1024);
        const batches = item.measurementBatches, read = item.readBatches, serial = item.frame.serial;
        item.settings = Object.assign({}, item.settings, {
            temperaCameraIntensity: 1.4,
            temperaGlyphMotion: .6,
            temperaShowCornerMarks: false
        });
        tryVerify(() => item.errorString.length || item.frame.serial > serial, 10000);
        compare(item.errorString, '');
        compare(item.measurementBatches, batches);
        compare(item.readBatches, read);
        item.live = false;
        compare(item.resourceCount, 0);
        wait(100);
        compare(item.resourceCount, 0);
    }
    function test_importedGifTextureKeepsSourceStaticFirstFrame() {
        const c = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/tempera/TemperaPrimitive.qml');
        compare(c.status, Component.Ready, c.errorString());
        const sprite = createTemporaryObject(c, testCase, {
            baseFont: Qt.font({
                family: 'Helvetica Neue',
                pixelSize: 24
            }),
            assetsService: foliaTestPlugin.assets,
            affine: [80, 0, 160, 0, 80, 120],
            primitive: {
                kind: 'sprite',
                anchor: [.5, .5],
                texture: {
                    width: 1,
                    height: 1,
                    url: Qt.resolvedUrl('../fixtures/tempera/red-blue.gif')
                }
            }
        });
        const bitmap = findChild(sprite, 'temperaSourceBitmap');
        verify(bitmap);
        compare(bitmap.prepareFrames, false);
        compare(bitmap.playing, false);
        compare(bitmap.animationLease, null);
        tryCompare(bitmap, 'status', Image.Ready, 5000);
        waitForRendering(sprite);
        const first = grabImage(testCase), sx = first.width / 320, sy = first.height / 240;
        compare(first.red(160 * sx, 120 * sy), 255);
        compare(first.blue(160 * sx, 120 * sy), 0);
        wait(400);
        waitForRendering(sprite);
        const next = grabImage(testCase);
        compare(next.red(160 * sx, 120 * sy), 255);
        compare(next.blue(160 * sx, 120 * sy), 0);
        compare(bitmap.animationLease, null);
    }
    function test_hiddenLyricsKeepOnlyOriginalCornerMarksAndRetireScope() {
        const item = page([
            {
                text: 'hidden source',
                start_ms: 1000,
                duration_ms: 4000
            }
        ], {
            showText: false
        }, 2.5);
        readyPage(item);
        compare(item.paragraphCount, 0);
        compare(item.renderers.length, 0);
        verify(item.frame.resources.some(resource => resource.kind === 'graphics'), 'Original empty-program overlay still has corner marks');
        item.live = false;
        compare(item.layerCount, 0);
    }
    function test_generationCancelsOldSourceAndNoLateHiddenPublication() {
        const item = page([
            {
                text: 'OLD SOURCE',
                start_ms: 1000,
                duration_ms: 4000
            }
        ], {
            temperaPostProcessEnabled: false
        }, 2.5);
        readyPage(item);
        const old = item.frame.epoch;
        verify(foliaTestLyricFixture.replaceRows([
            {
                text: 'ZZZ FINAL SOURCE',
                start_ms: 1000,
                duration_ms: 4000,
                words: []
            }
        ]));
        item.trackRevision = 'new-source';
        tryVerify(() => item.errorString.length || (!item.busy && item.frame.epoch > old), 30000);
        compare(item.errorString, '');
        verify(item.frame.resources.some(value => value.kind === 'text' && value.text === 'Z'));
        item.baseFont = Qt.font({
            family: 'Times New Roman',
            pixelSize: 24
        });
        item.live = false;
        compare(item.frame, null);
        compare(item.resourceCount, 0);
        wait(200);
        compare(item.frame, null);
        compare(item.layerCount, 0);
    }
    function test_fullProgramUsesRealIcuNativeMetricsAndRetiresPendingWork() {
        verify(foliaTestLyricFixture.replaceRows([
            {
                text: '真实 native ICU 中文 👨‍👩‍👧‍👦',
                start_ms: 1000,
                duration_ms: 4500,
                words: []
            },
            {
                text: 'second source line',
                start_ms: 6200,
                duration_ms: 3200,
                words: []
            }
        ]));
        const c = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/tempera/TemperaLayout.qml');
        compare(c.status, Component.Ready, c.errorString());
        const item = createTemporaryObject(c, testCase, {
            lyricSource: foliaTestLyricSource,
            lyricCount: 2,
            textService: foliaTestTextService,
            viewportWidth: 320,
            viewportHeight: 240,
            baseFont: Qt.font({
                family: 'Helvetica Neue',
                pixelSize: 24
            }),
            geometry: {
                theme: {
                    name: 'test',
                    fontStyle: 'sans',
                    fontFamily: 'Helvetica Neue',
                    fontWeight: 600,
                    backgroundColor: '#101010',
                    primaryColor: '#ffffff',
                    secondaryColor: '#9988ee',
                    accentColor: '#ff8899'
                },
                tuning: Kernel.tuning({
                    temperaPostProcessEnabled: false
                }),
                lyricsFontScale: 1,
                staticMode: false,
                coverColors: [],
                images: [],
                metadata: {
                    title: 'Real title',
                    artist: 'Real artist'
                },
                seed: 'native'
            }
        });
        tryVerify(() => item.errorString.length || !item.busy, 30000);
        compare(item.errorString, '');
        verify(item.layoutRevision > 0);
        verify(item.frame !== null);
        verify(item.measurementBatches > 0);
        verify(item.readBatches > 0);
        item.timeSeconds = 2.5;
        tryVerify(() => item.frame && item.frame.time === 2.5, 10000);
        verify(item.frame.stages.length > 0);
        item.live = false;
        compare(item.frame, null);
        compare(item.busy, false);
        wait(80);
        compare(item.frame, null);
    }
    function test_all121OriginalCompositionsActuallyPaintMetalPaths() {
        tryVerify(() => geometry.ready, 5000);
        const ink = createInk();
        for (let i = 0; i < Kernel.TEMPERA_SHOT_KINDS.length; i++) {
            const kind = Kernel.TEMPERA_SHOT_KINDS[i], ops = request(kind, 'duo', 2.5, i);
            verify(ops.some(op => op.paths.length > 0), kind + ' source has real paths');
            ink.ops = ops;
            waitForRendering(ink);
            compare(ink.errorString, '');
            verify(ink.geometryBytes > 0, kind);
            verify(ink.actorCount > 0);
            const image = grabImage(testCase);
            let changed = 0;
            for (let y = 5; y < image.height; y += 17)
                for (let x = 5; x < image.width; x += 17)
                    if (image.red(x, y) !== 16 || image.green(x, y) !== 16 || image.blue(x, y) !== 16)
                        ++changed;
            verify(changed > 0, kind + ' paints actual geometry');
        }
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
        ink.live = false;
        compare(ink.actorCount, 0);
        compare(ink.geometryBytes, 0);
    }
    function test_threeSourcePalettesAndAbsoluteTimeSeekRepaint() {
        tryVerify(() => geometry.ready, 5000);
        const ink = createInk(), images = [];
        for (const mode of ['duo', 'mono', 'gradient']) {
            ink.ops = request('bubble-drift', mode, 2.5, mode);
            waitForRendering(ink);
            images.push(grabImage(testCase));
        }
        verify(!images[0].equals(images[1]));
        verify(!images[1].equals(images[2]));
        ink.ops = request('bubble-drift', 'duo', .3, 1);
        waitForRendering(ink);
        const first = grabImage(testCase);
        ink.ops = request('bubble-drift', 'duo', 3.2, 2);
        waitForRendering(ink);
        verify(!first.equals(grabImage(testCase)));
        ink.ops = request('bubble-drift', 'duo', .3, 3);
        waitForRendering(ink);
        verify(first.equals(grabImage(testCase)), 'Source seek must reproduce identical geometry/poses');
    }
}
