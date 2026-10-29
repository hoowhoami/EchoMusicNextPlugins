import QtQuick
import QtTest
import QtQml.WorkerScript
import "../../plugins/folia-lyrics-skin/qml/styles/lumiere" as Lumiere
import "../../plugins/folia-lyrics-skin/qml/styles/lumiere/api.mjs" as Kernel
import "../../plugins/folia-lyrics-skin/qml/styles/lumiere/stage.mjs" as Stage

TestCase {
    id: testCase
    name: "FoliaLumiere"
    when: windowShown
    visible: true
    width: 640
    height: 480
    property var reply: null
    WorkerScript {
        id: worker
        source: "../../plugins/folia-lyrics-skin/qml/styles/lumiere/worker.mjs"
        onMessage: message => testCase.reply = JSON.parse(JSON.stringify(message))
    }
    Component {
        id: retirementLoader
        Loader {}
    }
    function test_deferredNativeWorkIsCoalescedAndCancelledOnRapidActorDestruction() {
        failOnWarning(/invalid context|TypeError|first argument not a function/);
        const specifications = [
            {
                name: 'LumiereProgram',
                timers: ['lumierePiecesCompletion'],
                properties: {
                    live: false
                }
            },
            {
                name: 'LumiereSceneLayout',
                timers: ['lumiereFrameRequest', 'lumiereMeasurementCompletion', 'lumierePiecesCompletion', 'lumierePiecesRequest'],
                properties: {
                    live: false
                }
            },
            {
                name: 'LumiereGlyphTexture',
                timers: ['lumiereGlyphCompletion'],
                properties: {
                    live: false,
                    texture: {
                        width: 32,
                        height: 32,
                        pixelWidth: 32,
                        pixelHeight: 32,
                        resolution: 1,
                        commands: []
                    }
                }
            }
        ];
        let fired = 0;
        for (const spec of specifications) {
            const url = '../../plugins/folia-lyrics-skin/qml/styles/lumiere/' + spec.name + '.qml';
            const alive = createTemporaryObject(retirementLoader, testCase);
            alive.setSource(url, spec.properties);
            compare(alive.status, Loader.Ready);
            for (const name of spec.timers) {
                const timer = findChild(alive.item, name);
                verify(timer !== null, spec.name + ' owns ' + name);
                timer.triggered.connect(() => ++fired);
                timer.restart();
                timer.restart();
            }
            wait(50);
            compare(fired, spec.timers.length, 'repeated requests for each callback coalesce');
            alive.active = false;
            compare(alive.item, null);
            fired = 0;
            for (let attempt = 0; attempt < 24; attempt++) {
                const loader = createTemporaryObject(retirementLoader, testCase);
                loader.setSource(url, spec.properties);
                compare(loader.status, Loader.Ready);
                for (const name of spec.timers) {
                    const timer = findChild(loader.item, name);
                    verify(timer !== null);
                    timer.triggered.connect(() => ++fired);
                    timer.restart();
                    timer.restart();
                }
                // Stage retires its actor with Loader.active=false; destroy() itself is deferred.
                loader.active = false;
                compare(loader.item, null);
            }
            wait(50);
            compare(fired, 0, 'retired actors cannot run a deferred native callback');
        }
    }
    function test_allOneHundredOriginalRigsLoadInQv4() {
        compare(Kernel.LUMIERE_PROFILES.length, 100);
        let maximumPoints = 0;
        for (const profile of Kernel.LUMIERE_PROFILES) {
            const spec = profile.lineArt({
                aspect: 4 / 3,
                random: Kernel.createRng("qml rig " + profile.kind)
            });
            const rig = profile.light({
                aspect: 4 / 3,
                random: Kernel.createRng("qml rig " + profile.kind)
            });
            const beams = Kernel.resolveBeams(rig, 2, 4 / 3, {
                intensity: 1,
                bass: .5,
                color: [1, .8, .4],
                local: 2
            });
            verify(beams.length <= 6);
            const points = spec.paths.reduce((sum, path) => sum + path.points.length, 0);
            maximumPoints = Math.max(maximumPoints, points);
            for (const beam of beams)
                verify(Number.isFinite(beam.intensity));
        }
        verify(maximumPoints > 500);
        console.info("LUMIERE_SOURCE_MAX_LINEART_POINTS", maximumPoints);
    }
    function test_realWorkerCompilesSemanticLinesAndKeepsSparseMapping() {
        const lines = [];
        for (let i = 0; i < 31; i++)
            lines.push({
                sourceIndex: i * 7,
                fullText: "山河 依旧👩🏽‍🚀",
                startTime: 8 + i * 4,
                endTime: 11 + i * 4,
                words: [
                    {
                        text: "山河 依旧👩🏽‍🚀",
                        startTime: 8 + i * 4,
                        endTime: 11 + i * 4
                    }
                ],
                autoWordSegments: ["山河", " ", "依旧", "👩🏽‍🚀"]
            });
        reply = null;
        tryVerify(() => worker.ready, 5000);
        worker.sendMessage({
            phase: "compile",
            request: 4,
            trackRevision: "track-A",
            lines,
            seed: "seed😀",
            seamless: true
        });
        tryVerify(() => reply !== null, 10000);
        compare(reply.error, undefined);
        compare(reply.trackRevision, "track-A");
        const result = JSON.parse(reply.payload);
        compare(result.sourceIndices[30], 210);
        compare(result.program.paragraphs.length, 1);
        compare(result.program.paragraphs[0].lines.length, 31);
        verify(result.program.paragraphs[0].shots.length > 3);
        const expected = Kernel.compileLumiereProgram(lines, "seed😀", {}, {
            seamless: true
        });
        compare(JSON.stringify(result.program), JSON.stringify(expected));
    }
    function test_realReadModelSnapshotPreparesDictionaryInWorkerAndReleases() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/LumiereProgram.qml");
        compare(component.status, Component.Ready, component.errorString());
        const controller = createTemporaryObject(component, testCase, {
            lyricSource: foliaTestLyricSource,
            lyricCount: foliaTestLyricCount,
            textService: foliaTestTextService,
            trackRevision: "source-80",
            seed: "actual model"
        });
        verify(controller !== null);
        tryVerify(() => !controller.busy && (controller.revision > 0 || controller.errorString.length > 0), 15000);
        compare(controller.errorString, "");
        verify(controller.readBatches >= 2);
        compare(controller.sourceIndices.length, foliaTestLyricCount);
        verify(controller.program.paragraphs[0].shots.length > 0);
        verify(controller.program.paragraphs[0].lines[0].autoWordSegments.length > 0);
        controller.live = false;
        compare(controller.program, null);
        compare(controller.workerAlive, false);
    }
    Component {
        id: fieldComponent
        Item {
            width: 640
            height: 480
            property alias uniforms: field.uniforms
            Rectangle {
                anchors.fill: parent
                color: "black"
            }
            Lumiere.LightField {
                id: field
                anchors.fill: parent
            }
        }
    }
    function frame(profile, seconds) {
        const driver = Kernel.createNativeLightField(640, 480), rig = profile.light({
            aspect: 4 / 3,
            random: Kernel.createRng("native field")
        }), beams = Kernel.resolveBeams(rig, seconds, 4 / 3, {
            intensity: 1,
            bass: .4,
            color: [1, .8, .4],
            local: seconds
        });
        const result = driver.update({
            beams,
            rig,
            time: seconds,
            fogScale: 1,
            color: [1, .8, .4],
            glareScale: 1,
            dark: [0, 0, 0, 0],
            octaves: 5,
            textRegion: profile.region
        });
        driver.destroy();
        return result;
    }
    function test_originalFieldShaderProducesRealChangingRgb() {
        const f = createTemporaryObject(fieldComponent, testCase, {
            uniforms: frame(Kernel.profileOf(""), 2)
        });
        verify(f !== null);
        wait(100);
        const before = grabImage(f), values = [];
        let light = 0;
        for (let y = 0; y < before.height; y += 2)
            for (let x = 0; x < before.width; x += 2) {
                const value = before.red(x, y);
                values.push([value, before.green(x, y), before.blue(x, y)]);
                if (value > 30)
                    light++;
            }
        verify(light > 500, "source field must draw real RGB=" + light);
        f.uniforms = frame(Kernel.LUMIERE_PROFILES[30], 6);
        wait(60);
        const after = grabImage(f);
        let changed = 0, index = 0;
        for (let y = 0; y < after.height; y += 2)
            for (let x = 0; x < after.width; x += 2) {
                const previous = values[index++];
                if (Math.max(Math.abs(after.red(x, y) - previous[0]), Math.abs(after.green(x, y) - previous[1]), Math.abs(after.blue(x, y) - previous[2])) > 8)
                    changed++;
            }
        before.save("build/folia-lumiere-field-before.png");
        after.save("build/folia-lumiere-field.png");
        verify(changed > 500, "source rig/time changes actual pixels=" + changed);
    }
    Component {
        id: bloomSourceComponent
        Item {
            width: 320
            height: 240
            Rectangle {
                x: 150
                y: 90
                width: 20
                height: 60
                color: "#ffdd77"
            }
        }
    }
    Component {
        id: bloomBackdropComponent
        Rectangle {
            width: 320
            height: 240
            color: "black"
        }
    }
    function test_originalBloomNativePassesExpandRealRgbAndRelease() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/LumiereBloom.qml");
        compare(component.status, Component.Ready, component.errorString());
        const source = createTemporaryObject(bloomSourceComponent, testCase), backdrop = createTemporaryObject(bloomBackdropComponent, testCase), view = createTemporaryObject(component, backdrop, {
            source,
            width: 320,
            height: 240,
            resolution: 1,
            options: {
                strength: 0,
                threshold: .42,
                knee: .18,
                levels: 6,
                spread: .68,
                padding: 0,
                tint: [1, .7, .25]
            }
        });
        verify(view !== null);
        tryVerify(() => view.ready || view.errorString.length > 0, 5000);
        compare(view.errorString, "");
        wait(100);
        const before = grabImage(backdrop), revision = view.allocationRevision;
        view.options = {
            strength: 1.2,
            threshold: .42,
            knee: .18,
            levels: 6,
            spread: .68,
            padding: 0,
            tint: [1, .7, .25]
        };
        tryCompare(view, "passCount", 12, 5000);
        wait(100);
        const after = grabImage(backdrop);
        before.save("build/folia-lumiere-bloom-before.png");
        after.save("build/folia-lumiere-bloom.png");
        let gain = 0;
        for (let y = 0; y < after.height; y++)
            for (let x = 0; x < after.width; x++)
                if ((x < 145 || x > 175) && after.red(x, y) - before.red(x, y) > 3)
                    gain++;
        verify(gain > 300, "source bloom must draw halo RGB=" + gain);
        verify(view.cacheBytes > 0 && view.cacheBytes < 128 * 1024 * 1024);
        const allocated = view.allocationRevision;
        view.options = {
            strength: 1.8,
            threshold: .42,
            knee: .18,
            levels: 6,
            spread: .68,
            padding: 0,
            tint: [1, .7, .25]
        };
        wait(50);
        compare(view.allocationRevision, allocated);
        after.save("build/folia-lumiere-bloom.png");
        view.live = false;
        compare(view.cacheBytes, 0);
        compare(view.ready, false);
    }
    function test_sourceSmallTexturesPaintOnceAcross120FramesAndRelease() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/LumiereCanvasTexture.qml");
        compare(component.status, Component.Ready, component.errorString());
        const textures = Kernel.createLumiereLightTextures();
        compare(textures.length, 4);
        compare(textures.reduce((sum, v) => sum + v.pixelWidth * v.pixelHeight * 4, 0), 458752);
        const actors = [];
        for (const texture of textures) {
            const actor = createTemporaryObject(component, testCase, {
                texture
            });
            verify(actor !== null);
            actors.push(actor);
        }
        for (const actor of actors)
            tryVerify(() => actor.paintCount > 0, 5000);
        wait(80);
        const counts = actors.map(actor => actor.paintCount);
        for (let frame = 0; frame < 120; frame++) {
            for (const actor of actors)
                actor.x = frame % 2;
            wait(1);
        }
        for (let i = 0; i < actors.length; i++) {
            compare(actors[i].paintCount, counts[i]);
            verify(actors[i].cacheBytes > 0);
            actors[i].live = false;
            compare(actors[i].cacheBytes, 0);
        }
    }
    Component {
        id: sliceComponent
        Lumiere.LumiereTextureSlice {}
    }
    function test_sourceSmallTexturesActualRgbFixtures() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/LumiereCanvasTexture.qml");
        compare(component.status, Component.Ready, component.errorString());
        for (const texture of Kernel.createLumiereLightTextures()) {
            const provider = createTemporaryObject(component, testCase, {
                texture
            }), backdrop = createTemporaryObject(bloomBackdropComponent, testCase, {
                width: texture.width,
                height: texture.height
            }), slice = createTemporaryObject(sliceComponent, backdrop, {
                source: provider.output,
                texture
            });
            verify(slice !== null);
            tryVerify(() => provider.paintCount > 0, 5000);
            wait(30);
            const image = grabImage(backdrop);
            image.save("build/folia-lumiere-texture-" + texture.name + ".png");
            let mass = 0, minimum = 255, maximum = 0;
            for (let y = 0; y < image.height; y++)
                for (let x = 0; x < image.width; x++) {
                    const value = image.red(x, y);
                    mass += value;
                    minimum = Math.min(minimum, value);
                    maximum = Math.max(maximum, value);
                }
            verify(mass > 10000 && maximum - minimum > 100, "actual source small texture RGB=" + texture.name + ":" + mass);
        }
    }
    function test_sourceSceneWorkerUsesNativeAdvancesEmAndReleases() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/LumiereSceneLayout.qml");
        compare(component.status, Component.Ready, component.errorString());
        const lines = [
            {
                sourceIndex: 19,
                fullText: "山河 office 👩🏽‍🚀",
                startTime: 0,
                endTime: 4,
                words: [
                    {
                        text: "山河 office 👩🏽‍🚀",
                        startTime: 0,
                        endTime: 4
                    }
                ],
                autoWordSegments: ["山河", " ", "office", " ", "👩🏽‍🚀"]
            }
        ], program = Kernel.compileLumiereProgram(lines, 'native-scene', {}, {
            seamless: false
        }), tuning = Kernel.toLumiereSceneTuning(Kernel.normalizeLumiereTuning({}), {
            showText: true
        }), options = {
            width: 640,
            height: 480,
            resolution: 1,
            program,
            index: program.paragraphs.findIndex(paragraph => paragraph.lines.length > 0),
            theme: {
                primaryColor: '#ffffff',
                secondaryColor: '#aaaaaa',
                accentColor: '#ffaa77',
                lyricsIcons: [],
                wordColors: [],
                animationIntensity: 1
            },
            tuning,
            quality: {
                bloom: 1,
                textBloom: 1,
                graphicsResolution: null,
                bloomLevelDrop: 0,
                passthrough: null
            },
            showText: true
        };
        const layout = createTemporaryObject(component, testCase, {
            options,
            baseFont: Qt.font({
                family: 'Arial',
                pixelSize: 24
            }),
            timeSeconds: 1,
            textService: foliaTestTextService,
            trackRevision: 'scene-source-19'
        });
        verify(layout !== null);
        tryVerify(() => layout.frameRevision > 0 || layout.errorString.length > 0, 15000);
        compare(layout.errorString, "");
        verify(layout.frame !== null);
        verify(layout.frame.nodes.some(node => node.kind === 'sprite'));
        verify(layout.measurementCount > 10);
        compare(layout.measurementCacheBytes, 0);
        const first = layout.frameRevision;
        layout.timeSeconds = 3;
        tryVerify(() => layout.frameRevision > first, 5000);
        layout.live = false;
        compare(layout.frame, null);
        compare(layout.workerAlive, false);
    }
    function instrumentalScene() {
        const program = Kernel.compileLumiereProgram([], 'instrumental-native', {}, {
            seamless: true
        }), tuning = Kernel.toLumiereSceneTuning(Kernel.normalizeLumiereTuning({}), {
            showText: true
        });
        return Kernel.createNativeLumiereScene({
            width: 640,
            height: 480,
            resolution: 1,
            program,
            index: 0,
            theme: {
                primaryColor: '#ffffff',
                secondaryColor: '#aaaaaa',
                accentColor: '#ffaa77',
                lyricsIcons: [],
                wordColors: [],
                animationIntensity: 1
            },
            tuning,
            quality: {
                bloom: 1,
                textBloom: 1,
                graphicsResolution: null,
                bloomLevelDrop: 0,
                passthrough: null
            },
            showText: true
        });
    }
    function test_completeNativeInstrumentalSceneRgbAndTextureRetention() {
        failOnWarning(/ShaderEffect: Texture|invalid context|TypeError|first argument not a function/);
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/LumiereSceneView.qml");
        compare(component.status, Component.Ready, component.errorString());
        const scene = instrumentalScene(), backdrop = createTemporaryObject(bloomBackdropComponent, testCase, {
            width: 640,
            height: 480
        }), view = createTemporaryObject(component, backdrop, {
            width: 640,
            height: 480,
            frame: scene.frame(3)
        });
        verify(view !== null);
        tryVerify(() => view.ready || view.errorString.length > 0, 10000);
        compare(view.errorString, "");
        verify(view.nodeCount > 10 && view.nodeCount < 8192);
        verify(view.textureCount > 0);
        wait(100);
        const image = grabImage(backdrop);
        image.save('build/folia-lumiere-native-scene.png');
        let light = 0;
        for (let y = 0; y < image.height; y += 2)
            for (let x = 0; x < image.width; x += 2)
                if (Math.max(image.red(x, y), image.green(x, y), image.blue(x, y)) > 40)
                    light++;
        verify(light > 500, 'complete original scene real RGB=' + light);
        const painted = view.texturePaintCount;
        for (let i = 0; i < 120; i++) {
            view.frame = scene.frame(3 + i * .002);
            wait(1);
        }
        tryVerify(() => view.ready || view.errorString.length > 0, 5000);
        compare(view.errorString, "");
        compare(view.texturePaintCount, painted);
        verify(view.cacheBytes > 0 && view.cacheBytes <= 128 * 1024 * 1024);
        view.live = false;
        compare(view.cacheBytes, 0);
        scene.destroy();
    }
    function test_completeNativeLyricSceneKeepsWholeCanvasGlyphSlices() {
        failOnWarning(/ShaderEffect: Texture|invalid context|TypeError|first argument not a function/);
        const layoutComponent = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/LumiereSceneLayout.qml"), viewComponent = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/LumiereSceneView.qml");
        compare(layoutComponent.status, Component.Ready, layoutComponent.errorString());
        compare(viewComponent.status, Component.Ready, viewComponent.errorString());
        const lines = [
            {
                sourceIndex: 19,
                fullText: "山河 office 👩🏽‍🚀",
                startTime: 0,
                endTime: 4,
                words: [
                    {
                        text: "山河 office 👩🏽‍🚀",
                        startTime: 0,
                        endTime: 4
                    }
                ],
                autoWordSegments: ["山河", " ", "office", " ", "👩🏽‍🚀"]
            }
        ], program = Kernel.compileLumiereProgram(lines, 'native-scene', {}, {
            seamless: false
        }), tuning = Kernel.toLumiereSceneTuning(Kernel.normalizeLumiereTuning({}), {
            showText: true
        }), options = {
            width: 640,
            height: 480,
            resolution: 1,
            program,
            index: program.paragraphs.findIndex(paragraph => paragraph.lines.length > 0),
            theme: {
                primaryColor: '#ffffff',
                secondaryColor: '#aaaaaa',
                accentColor: '#ffaa77',
                lyricsIcons: [],
                wordColors: [],
                animationIntensity: 1
            },
            tuning,
            quality: {
                bloom: 1,
                textBloom: 1,
                graphicsResolution: null,
                bloomLevelDrop: 0,
                passthrough: null
            },
            showText: true
        }, font = Qt.font({
            family: 'Arial',
            pixelSize: 24
        }), layout = createTemporaryObject(layoutComponent, testCase, {
            options,
            baseFont: font,
            timeSeconds: 1,
            textService: foliaTestTextService,
            trackRevision: 'source-texture'
        });
        tryVerify(() => layout.frameRevision > 0 || layout.errorString.length > 0, 15000);
        compare(layout.errorString, '');
        const backdrop = createTemporaryObject(bloomBackdropComponent, testCase, {
            width: 640,
            height: 480
        }), view = createTemporaryObject(viewComponent, backdrop, {
            width: 640,
            height: 480,
            frame: layout.frame,
            baseFont: font
        });
        verify(view !== null);
        tryVerify(() => view.ready || view.errorString.length > 0, 10000);
        compare(view.errorString, '');
        verify(view.textureCount > 4);
        wait(120);
        const image = grabImage(backdrop);
        image.save('build/folia-lumiere-native-lyric-scene.png');
        let bright = 0;
        for (let y = 100; y < 380; y++)
            for (let x = 80; x < 560; x++)
                if (Math.min(image.red(x, y), image.green(x, y), image.blue(x, y)) > 100)
                    bright++;
        verify(bright > 50, 'actual main/echo glyph RGB=' + bright);
        verify(view.cacheBytes > 0 && view.cacheBytes <= 128 * 1024 * 1024);
        layout.live = false;
        view.live = false;
        compare(view.cacheBytes, 0);
    }
    function test_stageUsesFullReadModelRuntimePausedSeekAndReleases() {
        failOnWarning(/ShaderEffect: Texture|invalid context|TypeError|first argument not a function/);
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/Lumiere.qml");
        compare(component.status, Component.Ready, component.errorString());
        const backdrop = createTemporaryObject(bloomBackdropComponent, testCase, {
            width: 640,
            height: 480
        });
        const actor = createTemporaryObject(component, backdrop, {
            width: 640,
            height: 480,
            preparedLines: [],
            lyricSource: foliaTestLyricSource,
            lyricCount: foliaTestLyricCount,
            textService: foliaTestTextService,
            trackRevision: 'stage-real',
            seed: 'native-stage',
            songTitle: '山河 office 👩🏽‍🚀',
            songArtist: 'artist ffi and the stars',
            songAlbum: 'album 流光',
            baseFont: Qt.font({
                family: 'Arial',
                pixelSize: 24
            }),
            paused: true,
            timeSeconds: 1
        });
        verify(actor !== null);
        tryVerify(() => actor.renderReady || actor.errorString.length > 0, 20000);
        compare(actor.errorString, '');
        verify(actor.renderReady);
        console.info('LUMIERE_RUNTIME_PHASE', 'initial-ready', actor.totalCacheBytes, actor.nodeCount, actor.measurementCount);
        verify(actor.nodeCount > 10);
        verify(actor.totalCacheBytes > 0 && actor.totalCacheBytes <= 128 * 1024 * 1024);
        compare(actor.subtitleSuppressedRecentIndex, foliaTestLyricCount - 1);
        const before = actor.frameRevision;
        actor.timeSeconds = 8;
        tryVerify(() => actor.frameRevision > before, 15000);
        tryVerify(() => actor.renderReady || actor.errorString.length > 0, 15000);
        compare(actor.errorString, '');
        console.info('LUMIERE_RUNTIME_PHASE', 'seek-ready', actor.totalCacheBytes, actor.nodeCount, actor.measurementCount);
        const image = grabImage(backdrop);
        image.save('build/folia-lumiere-native-stage.png');
        let bright = 0;
        for (let y = 0; y < image.height; y += 2)
            for (let x = 0; x < image.width; x += 2)
                if (Math.max(image.red(x, y), image.green(x, y), image.blue(x, y)) > 60)
                    bright++;
        verify(bright > 200, 'full runtime RGB=' + bright);
        actor.settings = {
            lumiereTextOnly: true,
            lumiereTextBloom: 0,
            lumiereBloom: 0
        };
        const changed = actor.frameRevision;
        tryVerify(() => actor.frameRevision > changed, 10000);
        tryVerify(() => actor.renderReady || actor.errorString.length > 0, 10000);
        compare(actor.errorString, '');
        console.info('LUMIERE_RUNTIME_PHASE', 'settings-ready');
        actor.live = false;
        console.info('LUMIERE_RUNTIME_PHASE', 'released');
        compare(actor.totalCacheBytes, 0);
        compare(actor.workerAlive, false);
    }

    function test_snapshotRetirementAvoidsQv4IteratorSkippingDeletedEntries() {
        const entries = new Map();
        for (let i = 0; i < 200; i++)
            entries.set(i, {
                value: i
            });
        for (const [id, value] of Array.from(entries.entries()))
            entries.delete(id);
        compare(entries.size, 0);
    }

    function test_runtimeCreditsUseNativeWholeCanvasAlphabeticText() {
        failOnWarning(/ShaderEffect: Texture|invalid context|TypeError|first argument not a function/);
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/Lumiere.qml");
        compare(component.status, Component.Ready, component.errorString());
        const backdrop = createTemporaryObject(bloomBackdropComponent, testCase, {
            width: 640,
            height: 480
        });
        const actor = createTemporaryObject(component, backdrop, {
            width: 640,
            height: 480,
            preparedLines: [],
            lyricSource: foliaTestLyricSource,
            lyricCount: foliaTestLyricCount,
            textService: foliaTestTextService,
            trackRevision: 'credits-real',
            seed: 'native-credits',
            songTitle: '山河 office 👩🏽‍🚀',
            songArtist: 'the artist office ffi and the stars above the sea',
            songAlbum: 'a long album title under the moonlight 繁星',
            baseFont: Qt.font({
                family: 'Arial',
                pixelSize: 24
            }),
            paused: true,
            timeSeconds: foliaTestLyricCount * 4 + 8
        });
        verify(actor !== null);
        tryVerify(() => actor.renderReady || actor.errorString.length > 0, 20000);
        compare(actor.errorString, '');
        verify(actor.renderReady);
        verify(actor.measurementCount > 10);
        console.info('LUMIERE_CREDITS_CACHE', actor.totalCacheBytes, actor.nodeCount);
        wait(100);
        const image = grabImage(backdrop);
        image.save('build/folia-lumiere-native-credits.png');
        let lit = 0;
        for (let y = 100; y < 400; y++)
            for (let x = 60; x < 580; x++)
                if (Math.max(image.red(x, y), image.green(x, y), image.blue(x, y)) > 90)
                    lit++;
        verify(lit > 500, 'source credit labels RGB=' + lit);
        verify(actor.totalCacheBytes > 0 && actor.totalCacheBytes <= 128 * 1024 * 1024);
        actor.visible = false;
        compare(actor.totalCacheBytes, 0);
        compare(actor.workerAlive, false);
    }
    function test_runtimeSongReadinessHoldsOldWordsAndCommitsInstrumentalAfterSourceGrace() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/Lumiere.qml");
        compare(component.status, Component.Ready, component.errorString());
        const actor = createTemporaryObject(component, testCase, {
            width: 640,
            height: 480,
            preparedLines: [],
            lyricSource: foliaTestLyricSource,
            lyricCount: foliaTestLyricCount,
            textService: foliaTestTextService,
            trackRevision: 'gate-real',
            seed: 'old-song',
            baseFont: Qt.font({
                family: 'Arial',
                pixelSize: 24
            }),
            paused: true,
            timeSeconds: 1,
            settings: {
                lumiereTextOnly: true,
                lumiereBloom: 0,
                lumiereTextBloom: 0
            }
        });
        tryVerify(() => actor.renderReady || actor.errorString.length > 0, 20000, 'initial gate render');
        compare(actor.errorString, '');
        compare(actor.committedSeed, 'old-song');
        const old = actor.sourceProgram;
        actor.seed = 'incoming-identical-words';
        tryVerify(() => actor.watchingSong, 1000, 'incoming must watch');
        wait(100);
        compare(actor.committedSeed, 'old-song');
        compare(actor.sourceProgram, old);
        tryVerify(() => actor.committedSeed === 'incoming-identical-words', 4000, 'grace commit must settle');
        compare(actor.sourceProgram.lyricEndTime, null);
        compare(actor.watchingSong, false);
        actor.live = false;
        compare(actor.workerAlive, false);
    }

    function test_sourceReadyGracePureFunctionInQv4() {
        compare(Stage.isInstrumentalConfirmed({
            sawPlaybackReset: false,
            playbackTime: 1,
            elapsedMs: 3001
        }, {
            instrumentalCommitSeconds: 2,
            readyGraceMs: 3000
        }), true);
    }

    function test_compactViewportKeepsSourceMinimumRasterBeforeScaling() {
        failOnWarning(/ShaderEffect: Texture|invalid context|TypeError|first argument not a function/);
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/lumiere/Lumiere.qml");
        compare(component.status, Component.Ready, component.errorString());
        const actor = createTemporaryObject(component, testCase, {
            width: 160,
            height: 120,
            preparedLines: [],
            lyricSource: foliaTestLyricSource,
            lyricCount: foliaTestLyricCount,
            textService: foliaTestTextService,
            trackRevision: 'compact-real',
            seed: 'native-compact',
            baseFont: Qt.font({
                family: 'Arial',
                pixelSize: 24
            }),
            paused: true,
            timeSeconds: 1
        });
        tryVerify(() => actor.renderReady || actor.errorString.length > 0, 20000);
        compare(actor.errorString, '');
        compare(actor.viewport.width, 320);
        compare(actor.viewport.height, 240);
        compare(actor.viewport.raster, true);
        verify(actor.totalCacheBytes >= actor.viewport.rasterBytes);
        actor.live = false;
        compare(actor.totalCacheBytes, 0);
        compare(actor.workerAlive, false);
    }
}
