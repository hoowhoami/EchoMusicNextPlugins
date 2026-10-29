import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/fume" as Fume

TestCase {
    id: testCase
    name: "FumeSourceIdentity"
    when: windowShown
    Component {
        id: layoutComponent
        Fume.FumeLayout {
            visible: false
            lyricSource: foliaTestLyricSource
            lyricCount: 4
            textService: foliaTestTextService
            viewportWidth: 1100
            viewportHeight: 820
            baseFont: Qt.font({
                family: "Arial",
                pixelSize: 24
            })
            trackRevision: "current:1"
            geometry: ({
                    theme: {
                        name: "identity",
                        fontStyle: "sans",
                        fontFamily: "Arial",
                        fontFamilyStack: [],
                        fontWeight: null
                    },
                    lyricsFontScale: 1,
                    tuning: {
                        heroScale: 1
                    }
                })
        }
    }
    function rows(suffix = "") {
        const result = [];
        for (let i = 0; i < 4; ++i)
            result.push({
                text: "Complete identity " + i + suffix,
                start_ms: i * 4000,
                duration_ms: 4000,
                words: [
                    {
                        text: "Complete identity " + i + suffix,
                        start_ms: i * 4000,
                        duration_ms: 4000,
                        syllables: [
                            {
                                text: "Complete identity " + i + suffix,
                                start_ms: i * 4000,
                                duration_ms: 4000
                            }
                        ]
                    }
                ]
            });
        return result;
    }
    function prepared(usePreview = false) {
        verify(foliaTestLyricFixture.replaceRows(rows()));
        const item = createTemporaryObject(layoutComponent, testCase);
        if (usePreview)
            item.previewRows = [0, 1, 2, 3].map(i => ({
                        lineText: "Exact words " + i,
                        startMs: i * 4000,
                        durationMs: 4000,
                        words: [
                            {
                                text: "Exact words " + i,
                                start_ms: i * 4000,
                                duration_ms: 4000,
                                syllables: [
                                    {
                                        text: "Exact words " + i,
                                        start_ms: i * 4000,
                                        duration_ms: 4000
                                    }
                                ]
                            }
                        ]
                    }));
        verify(item !== null);
        tryVerify(() => item.article !== null || item.errorString.length > 0, 20000);
        compare(item.errorString, "");
        compare(item.article.blocks.length, 4);
        compare(item.busy, false);
        return item;
    }
    function test_exactRowsRetainArticleAcrossRevisionNamespaces() {
        const item = prepared(), article = item.article, revision = item.layoutRevision;
        item.trackRevision = "epoch:sequence:lyric:0:4";
        compare(item.article, article);
        compare(item.sourceCurrent, false);
        tryVerify(() => item.sourceCurrent, 5000);
        compare(item.article, article);
        compare(item.layoutRevision, revision);
        compare(item.errorString, "");
    }
    function test_probeChecksFinalRowWordTimingAndMetadata_data() {
        return [
            {
                tag: "syllable timing",
                kind: "timing"
            },
            {
                tag: "line metadata",
                kind: "metadata"
            }
        ];
    }
    function test_probeChecksFinalRowWordTimingAndMetadata(data) {
        const item = prepared(true), revision = item.layoutRevision;
        if (data.kind === "timing") {
            item.previewRows[3].words[0].duration_ms = 3000;
            item.previewRows[3].words[0].syllables[0].duration_ms = 3000;
        } else
            item.previewRows[3].translation = "Late metadata edit";
        item.trackRevision = "changed-but-same-rows-and-text";
        compare(item.sourceCurrent, false);
        tryVerify(() => item.layoutRevision > revision || item.errorString.length > 0, 20000);
        compare(item.errorString, "");
        if (data.kind === "timing")
            compare(item.article.chronologicalBlocks[3].line.words[0].syllables[0].endTime, 15);
        else
            compare(item.article.chronologicalBlocks[3].line.translation, "Late metadata edit");
    }
    function test_realModelResetWithSameTextAndDifferentWordTimingRebuilds() {
        const item = prepared(), revision = item.layoutRevision, changed = rows();
        changed[3].words[0].duration_ms = 3000;
        changed[3].words[0].syllables[0].duration_ms = 3000;
        verify(foliaTestLyricFixture.replaceRows(changed));
        compare(item.article, null);
        tryVerify(() => item.layoutRevision > revision || item.errorString.length > 0, 20000);
        compare(item.errorString, "");
        compare(item.article.chronologicalBlocks[3].line.words[0].endTime, 15);
    }
    function test_oldProbeRepliesCannotOverwriteEditedGeneration() {
        const item = prepared();
        item.trackRevision = "probe:2";
        const oldGeneration = item._generation;
        compare(item.sourceCurrent, false);
        verify(foliaTestLyricFixture.replaceRows(rows(" edited")));
        const generation = item._generation;
        verify(generation > oldGeneration);
        compare(item.article, null);
        item.receive({
            generation: oldGeneration,
            trackRevision: item.trackRevision,
            phase: "identity-match"
        });
        item.receive({
            generation: oldGeneration,
            trackRevision: item.trackRevision,
            phase: "identity-different"
        });
        compare(item._generation, generation);
        compare(item.article, null);
        tryVerify(() => item.article !== null || item.errorString.length > 0, 20000);
        compare(item.errorString, "");
        verify(item.article.blocks.every(b => b.line.fullText.endsWith(" edited")));
    }
    function test_fontAndViewportKeepOriginalPreparationSemantics() {
        const item = prepared(), revision = item.layoutRevision;
        item.baseFont = Qt.font({
            family: "Courier New",
            pixelSize: 24
        });
        item.viewportWidth = 950;
        compare(item._checkingSource === true, false);
        compare(item.busy, true);
        tryVerify(() => item.layoutRevision > revision || item.errorString.length > 0, 20000);
        compare(item.errorString, "");
        compare(item.viewportWidth, 950);
    }
    function test_hiddenCancelsProbeAndDoesNotAcceptLateReplies() {
        const item = prepared();
        item.trackRevision = "probe:hide";
        const generation = item._generation;
        compare(item.sourceCurrent, false);
        item.live = false;
        compare(item.article, null);
        compare(item.busy, false);
        compare(item.sourceCurrent, true);
        item.receive({
            generation,
            trackRevision: item.trackRevision,
            phase: "identity-match"
        });
        wait(50);
        compare(item.article, null);
        compare(item._worker, null);
        compare(foliaTestNativeProbe.memory().nativeGlyphBytes, 0);
    }
}
