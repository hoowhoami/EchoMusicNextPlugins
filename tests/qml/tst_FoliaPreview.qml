import QtQuick
import QtTest

TestCase {
    id: testCase
    name: "FoliaPreview"
    when: windowShown
    visible: true
    width: 720
    height: 480
    function init() {
        failOnWarning(/TypeError:|Binding loop|invalid context|ShaderEffect.*(Error|null)/);
    }
    function test_sceneReadyMayInvalidateTheAcceptedProgramSynchronously() {
        const component = Qt.createComponent('../../plugins/folia-lyrics-skin/qml/styles/sonnet/SonnetLayout.qml');
        compare(component.status, Component.Ready, component.errorString());
        const layout = createTemporaryObject(component, testCase, { trackRevision: 'preview-epoch' });
        verify(layout);
        layout.program = { paragraphs: [{}] };
        layout._sceneToken = 3;
        const generation = layout._generation;
        let accepted = 0;
        layout.sceneReady.connect(() => { accepted++; layout.invalidate(); });
        layout.receive({ phase: 'scene', generation, trackRevision: 'preview-epoch', sceneToken: 3, index: 0 });
        compare(accepted, 1);
        compare(layout._generation, generation + 1);
        compare(layout.program, null);
        compare(layout.busy, false);
    }

    function test_explicitPreviewEntryUsesItsOwnSampleClock() {
        const player = foliaTestPlugin.player;
        const baseline = JSON.stringify({ revision: player.revision, position: player.positionMs, row: foliaTestLyricSource.row(0), count: foliaTestLyricFixture.count });
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/preview/PreviewPlayground.qml");
        compare(component.status, Component.Ready, component.errorString());
        const view = createTemporaryObject(component, testCase, {
            width: 700,
            height: 450,
            plugin: foliaTestPlugin,
            settings: { mode: "classic", backgroundMode: "latent", showText: true },
            styles: [{ id: "classic", component: "styles/classic/Classic.qml" }]
        });
        verify(view);
        view.previewScene.sample = Qt.binding(() => Object.assign({}, view.sample, { cover: foliaTestPreviewCovers[view.sampleIndex] }));
        tryVerify(() => view.sampleClock !== null, 10000);
        verify(view.previewLabel.length > 0);
        mouseClick(findChild(view, 'foliaPreviewPause'));
        compare(view.paused, true);
        const held = view.sampleClock.timeSeconds;
        wait(60);
        compare(view.sampleClock.timeSeconds, held);
        view.sampleClock.seek(5.4);
        tryVerify(() => view.renderReady && !view.previewScene.harmony.busy && view.previewScene.harmony.actors.length > 0, 15000);
        compare(view.previewScene.harmony.activeCount, 1);
        const harmony = view.previewScene.harmony;
        const withHarmony = grabImage(harmony);
        view.settings = Object.assign({}, view.settings, { showHarmonySubtitle: false, fontWeight: 800 });
        tryVerify(() => {
            const glyph = findChild(view.previewScene.stage, 'classicGlyphRun');
            return glyph && glyph.runs.length > 0 && glyph.runs.every(run => run.weight === 800) && glyph.renderBatches > 0;
        }, 10000);
        tryCompare(harmony, 'activeCount', 0);
        wait(600);
        const withoutHarmony = grabImage(harmony);
        verify(!withHarmony.equals(withoutHarmony), 'The sample background voice must draw actual pixels');
        view.settings = Object.assign({}, view.settings, { showHarmonySubtitle: true });
        tryVerify(() => harmony.activeCount === 1 && !harmony.busy && harmony.cacheBytes > 0, 15000);
        const choice = findChild(view, 'foliaPreviewSampleChoice');
        choice.forceActiveFocus();
        keyClick(Qt.Key_Down);
        compare(view.sampleIndex, 1);
        compare(view.sampleClock.timeSeconds, 0);
        tryVerify(() => view.renderReady && view.previewScene.stage.trackRevision === 'preview:reserved', 15000);
        compare(view.previewScene.stage.settings.fontWeight, 800);
        compare(JSON.stringify({ revision: player.revision, position: player.positionMs, row: foliaTestLyricSource.row(0), count: foliaTestLyricFixture.count }), baseline, 'Sample selection/seek/settings must not alter real playback');
        view.live = false;
        tryCompare(view, "sampleClock", null);
        compare(view.previewScene, null);
        view.live = true;
        view.previewScene.sample = Qt.binding(() => Object.assign({}, view.sample, { cover: foliaTestPreviewCovers[view.sampleIndex] }));
        tryVerify(() => view.renderReady && view.sampleClock !== null, 15000);
        compare(view.sampleClock.timeSeconds, 0);
        view.visible = false;
        tryCompare(view, 'sampleClock', null);
    }
}
