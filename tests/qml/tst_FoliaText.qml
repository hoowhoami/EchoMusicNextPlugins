import QtQuick
import QtTest
import QtQml.WorkerScript
import "../../build/folia-text/qml-fixtures.mjs" as Fixtures
import "../../plugins/folia-lyrics-skin/qml/shared/text/unicode.mjs" as Unicode

TestCase {
    id: testCase
    name: "FoliaText"
    when: windowShown
    property var engineReply: null
    Component {
        id: engineWorker
        WorkerScript {
            source: Qt.resolvedUrl("../native/qml/unicode-engine-probe.mjs")
            onMessage: reply => testCase.engineReply = reply
        }
    }
    function test_nonBmpTextSurvivesSourceChineseEngineInActualWorker() {
        engineReply = null;
        const worker = createTemporaryObject(engineWorker, testCase);
        tryVerify(() => worker.ready);
        worker.sendMessage({
            text: "𠮷 😀"
        });
        tryVerify(() => engineReply !== null, 10000);
        compare(engineReply.words, ["𠮷", " ", "😀"]);
    }

    function createPreparation() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/shared/text/TextPreparation.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase);
    }

    function test_officialGraphemeCasesInQv4() {
        compare(Fixtures.graphemeCases.length, 766);
        for (const item of Fixtures.graphemeCases) {
            const offsets = Unicode.graphemeSegments(item.text).map(part => part.index);
            offsets.push(item.text.length);
            compare(offsets, item.offsets);
        }
    }

    function test_completeFoliaCorpusInWorker() {
        const prep = createPreparation();
        let response = null;
        let failure = "";
        prep.prepared.connect((id, revision, result) => {
            response = result;
        });
        prep.failed.connect((id, revision, error) => {
            failure = error;
        });
        prep.trackRevision = "corpus";
        prep.prepare(Fixtures.wordCases.map((item, index) => ({
                    fullText: item.text,
                    startTime: index,
                    endTime: index + 1,
                    words: []
                })), Fixtures.wordCases.map(item => item.pieces));
        tryVerify(() => response !== null || failure !== "", 15000);
        compare(failure, "");
        compare(response.lines.length, 126);
        for (let index = 0; index < Fixtures.wordCases.length; index++) {
            const actual = response.lines[index].line.autoWordSegments.filter(part => part.trim()).join("/");
            compare(actual, Fixtures.wordCases[index].expected, Fixtures.wordCases[index].text);
        }
    }

    function test_workerPreparesRealDictionaryAndGraphemeTimings() {
        const prep = createPreparation();
        let response = null;
        let failure = "";
        prep.prepared.connect((id, revision, result) => {
            response = result;
        });
        prep.failed.connect((id, revision, error) => {
            failure = error;
        });
        prep.trackRevision = "song-1";
        prep.prepare([
            {
                fullText: "故事的",
                startTime: 0,
                endTime: 3,
                words: [
                    {
                        text: "故",
                        startTime: 0,
                        endTime: 1
                    },
                    {
                        text: "事",
                        startTime: 1,
                        endTime: 2
                    },
                    {
                        text: "的",
                        startTime: 2,
                        endTime: 3
                    }
                ]
            }
        ], [["故事", "的"]]);
        tryVerify(() => response !== null || failure !== "", 15000);
        compare(failure, "");
        compare(response.unicodeVersion, "17.0.0");
        compare(response.lines[0].line.autoWordSegments.join("/"), "故事的");
        compare(response.lines[0].timeline.length, 3);
        compare(response.lines[0].layoutUnits.length, 1);
        compare(response.lines[0].displayWords.length, 3);
    }

    function test_newTrackDiscardsStaleWorkerResponse() {
        const prep = createPreparation();
        const received = [];
        prep.prepared.connect((id, revision, result) => received.push({
                id,
                revision,
                result
            }));
        prep.trackRevision = "old-track";
        prep.prepare([
            {
                fullText: "旧",
                startTime: 0,
                endTime: 1,
                words: []
            }
        ], [["旧"]]);
        prep.trackRevision = "new-track";
        const current = prep.prepare([
            {
                fullText: "👩🏽‍🚀",
                startTime: 0,
                endTime: 1,
                words: []
            }
        ], [["👩🏽‍🚀"]]);
        tryVerify(() => received.length > 0, 15000);
        compare(received.length, 1);
        compare(received[0].id, current);
        compare(received[0].revision, "new-track");
        compare(received[0].result.lines[0].graphemes.length, 1);
    }

    function test_missingIcuIsExplicitFailure() {
        const prep = createPreparation();
        let failure = "";
        prep.failed.connect((id, revision, error) => {
            failure = error;
        });
        prep.trackRevision = "song";
        prep.prepare([
            {
                fullText: "ภาษาไทย",
                startTime: 0,
                endTime: 1,
                words: []
            }
        ], []);
        tryVerify(() => failure !== "", 15000);
        verify(failure.indexOf("ICU word pieces") >= 0, failure);
    }
}
