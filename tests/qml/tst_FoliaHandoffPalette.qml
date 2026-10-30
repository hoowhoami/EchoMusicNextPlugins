import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/backgrounds/latent"

TestCase {
    id: testCase
    name: "FoliaHandoffPalette"
    when: windowShown
    visible: true
    width: 320
    height: 200
    property var observed: []
    Component {
        id: factory
        CoverPalette {
            plugin: foliaTestPlugin
        }
    }
    Component {
        id: observer
        Connections {
            function onSnapshotChanged(): void {
                testCase.observed.push(JSON.parse(JSON.stringify(target.snapshot)));
            }
        }
    }
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|Binding loop|invalid context/);
    }
    function test_realDecodedPalettePublishesItsSourceAtomicallyAndRejectsLateGenerations() {
        const a = String(foliaTestPreviewCovers[0]), b = String(foliaTestPreviewCovers[1]);
        const palette = createTemporaryObject(factory, testCase, {
            source: a,
            trackRevision: "A"
        });
        verify("snapshot" in palette, "Source and decoded colors must have one atomic publication");
        tryVerify(() => palette.snapshot.source === a && palette.snapshot.colors.length > 0, 10000);
        const colorsA = JSON.stringify(palette.snapshot.colors);
        palette.source = b;
        palette.trackRevision = "B";
        tryVerify(() => palette.snapshot.source === b && palette.snapshot.colors.length > 0, 10000);
        const colorsB = JSON.stringify(palette.snapshot.colors);
        verify(colorsA !== colorsB);
        observed = [];
        const connection = createTemporaryObject(observer, testCase, {
            target: palette
        });
        verify(connection !== null);
        for (let i = 0; i < 12; ++i) {
            palette.source = i % 2 ? b : a;
            palette.trackRevision = "rapid-" + i;
            wait(2);
        }
        palette.source = a;
        palette.trackRevision = "settled-A";
        tryVerify(() => palette.snapshot.source === a && JSON.stringify(palette.snapshot.colors) === colorsA, 10000);
        for (const sample of observed) {
            verify(sample.source === a || sample.source === b);
            compare(JSON.stringify(sample.colors), sample.source === a ? colorsA : colorsB);
        }
        palette.source = b;
        palette.trackRevision = "cancel-B";
        palette.live = false;
        compare(palette.snapshot.source, "");
        compare(palette.colors.length, 0);
        wait(100);
        compare(palette.snapshot.source, "");
        compare(palette._worker, null);
        compare(palette._operation, null);
        palette.source = a;
        palette.trackRevision = "new-A";
        palette.live = true;
        tryVerify(() => palette.snapshot.source === a && JSON.stringify(palette.snapshot.colors) === colorsA, 10000);
        compare(palette.colorsSource, a);
        compare(palette.errorString, "");
    }
}
