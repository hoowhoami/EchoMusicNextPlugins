// Preparation runs in the outer GUI event loop; each QtTest case starts only
// after its real native renderer has prepared the four authored sample rows.
import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/preview"

Item {
    id: root
    width: 720
    height: 480
    property int modeIndex: 0
    property bool inkReady: false
    property string preparationFailure: ""
    property real startedMs: 0
    property var results: []
    property var view: null
    property var originalRow: null
    readonly property var modes: [
        { id: 'sonnet', component: 'styles/sonnet/Sonnet.qml' },
        { id: 'tempera', component: 'styles/tempera/Tempera.qml' },
        { id: 'lumiere', component: 'styles/lumiere/Lumiere.qml' },
        { id: 'classic', component: 'styles/classic/Classic.qml' },
        { id: 'cadenza', component: 'styles/cadenza/Cadenza.qml' },
        { id: 'partita', component: 'styles/partita/Partita.qml' },
        { id: 'fume', component: 'styles/fume/Fume.qml' },
        { id: 'tilt', component: 'styles/tilt/Tilt.qml' },
        { id: 'claddagh', component: 'styles/claddagh/Claddagh.qml' },
        { id: 'monet', component: 'styles/monet/Monet.qml', inlineSubtitles: true },
        { id: 'pendolo', component: 'styles/pendolo/Pendolo.qml', inlineSubtitles: true },
        { id: 'cappella', component: 'styles/cappella/Cappella.qml' },
        { id: 'diorama', component: 'styles/diorama/Diorama.qml' },
        { id: 'still', component: 'styles/still/StillPresentation.qml', inlineSubtitles: true }
    ]
    function next() {
        inkReady = false;
        if (view) { view.live = false; view.destroy(); view = null; }
        modeIndex++;
        if (modeIndex < modes.length) start.restart();
        else console.info('PREVIEW_MODE_TIMINGS', JSON.stringify(results));
    }
    function begin() {
        console.info('PREVIEW_MODE_BEGIN', modes[modeIndex].id);
        startedMs = foliaTestAssetFixture.monotonicMs();
        preparationFailure = '';
        view = factory.createObject(root, { styles: modes, settings: {
            mode: modes[modeIndex].id, backgroundMode: 'latent', showText: true,
            showSubtitleTranslation: true, showHarmonySubtitle: true,
            visualizerOpacity: 1, dioramaGeometryEnabled: true
        }});
        if (!view) { preparationFailure = 'Preview creation failed'; inkReady = true; return; }
        // The generic fixture is a different installation from Folia. Use the
        // same original SVG copied into its real package, not an external URL.
        view.previewScene.sample = Object.assign({}, view.sample, { cover: foliaTestPreviewCovers[0] });
        view.sampleClock.seek(5.4);
        poll.restart(); deadline.restart();
    }
    function glyphStats(item) {
        let shaped = 0, batches = 0;
        if ('metrics' in item && 'renderBatches' in item) { shaped += item.metrics.length; batches += item.renderBatches; }
        // Diorama freezes the actual baked native glyph image and releases its
        // atlas. Retained native metrics are evidence of that completed bake.
        if ('measuredMetrics' in item && 'renderers' in item && item.renderers.length === 0)
            shaped += item.measuredMetrics.length;
        for (const child of item.children || []) {
            const result = glyphStats(child); shaped += result.shaped; batches += result.batches;
        }
        return { shaped, batches };
    }
    Timer { id: start; interval: 0; onTriggered: root.begin() }
    Timer {
        id: poll; interval: 25; repeat: true
        onTriggered: {
            if (root.view.errorString) {
                root.preparationFailure = root.view.errorString; stop(); deadline.stop(); root.inkReady = true;
            } else if (root.view.renderReady) { stop(); deadline.stop(); settle.restart(); }
        }
    }
    Timer { id: settle; interval: 300; onTriggered: root.inkReady = true }
    Timer { id: deadline; interval: 45000; onTriggered: { poll.stop(); root.preparationFailure = 'Natural preparation exceeded 45s'; root.inkReady = true; } }
    Component.onCompleted: { originalRow = JSON.stringify(foliaTestLyricSource.row(0)); start.start(); }
    Component { id: factory; PreviewPlayground { width: 700; height: 450; plugin: foliaTestPlugin; paused: true; motionEnabled: false } }
    Repeater {
        model: root.modes
        delegate: TestCase {
            required property int index
            required property var modelData
            name: 'FoliaPreviewModes'
            when: windowShown && root.modeIndex === index && root.inkReady
            function cleanupTestCase() { root.next(); }
            function test_preparedForegroundUsesTheSampleOnly() {
                compare(root.preparationFailure, '');
                const view = root.view;
                verify(view && view.renderReady);
                compare(view.sampleClock.timeSeconds, 5.4);
                compare(view.previewScene.stage.trackRevision, 'preview:default');
                compare(view.previewScene.stage.lyricSource, null);
                compare(view.previewScene.stage.lyricCount, 4);
                compare(foliaTestLyricFixture.count, 80);
                compare(JSON.stringify(foliaTestLyricSource.row(0)), root.originalRow);
                compare(view.previewScene.stage.errorString, '');
                const glyphs = root.glyphStats(view.previewScene.stage);
                if (modelData.id !== 'still') verify(glyphs.shaped > 0, modelData.id + ': actual native glyph metrics must exist');
                const picture = grabImage(view);
                picture.save(foliaTestCaptureDir + '/preview-mode-' + modelData.id + '.png');
                view.previewScene.foreground.visible = false;
                waitForRendering(view);
                const background = grabImage(view);
                let changed = 0; const columns = new Set();
                const ratio = picture.width / view.width;
                for (let y = Math.ceil(55 * ratio); y < picture.height - 30 * ratio; y += 2)
                    for (let x = Math.ceil(12 * ratio); x < picture.width - 12 * ratio; x += 2) {
                        const a = picture.pixel(x, y), b = background.pixel(x, y);
                        if (Math.max(Math.abs(a.r-b.r), Math.abs(a.g-b.g), Math.abs(a.b-b.b)) > 12/255) {
                            changed++; columns.add(Math.floor(x / picture.width * 8));
                        }
                    }
                verify(changed > 30, modelData.id + ': foreground must alter actual visible pixels (' + changed + ')');
                verify(columns.size >= 2, 'foreground must span more than one narrow column');
                root.results.push({ mode: modelData.id, glyphs, changedSamples: changed, columns: columns.size, physicalWidth: picture.width, physicalHeight: picture.height, elapsedMs: foliaTestAssetFixture.monotonicMs() - root.startedMs });
            }
        }
    }
}
